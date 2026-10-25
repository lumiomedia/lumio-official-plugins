'use client'

/**
 * Nu/Härnäst/Senare för ALLA kanaler i en källa, i ett svar (spec 3.3/4.2).
 *
 * `/api/live-tv/epg/now` lämnar tre program per kanal — det är hela underlaget
 * för hubbens kort, guidens "nu"-kolumn och spotlighten. Snapshotet ligger i
 * modulen så modellen (en per vy-träd) och `useEpgLoadStatus` delar samma svar
 * i stället för att hämta var sitt; `inflight` gör att två samtidiga monteringar
 * blir EN begäran.
 *
 * `fetchedAt` är appens klocka för när EPG:t senast HÄMTADES från källorna
 * (null = aldrig). Modellen använder den för att avgöra om den ska be Rust
 * hämta om (> 6 h), inte för att avgöra om snapshotet är läsbart.
 */

import { epgNow, epgNowForKeys } from '../index-client'
import { getEpgShiftMinutes } from '../epg-shift'
import { epgStoreId } from './store-id'
import type { NowNextLater } from './types'

/** Så länge ett hämtat snapshot återanvänds utan nytt anrop. Tickern i modellen ligger på samma minut. */
const TTL_MS = 60_000

export interface NowSnapshot {
  at: number
  fetchedAt: number | null
  items: Record<string, NowNextLater>
  /**
   * Antal kanaler med tablå, räknat EN gång när svaret kom.
   * `Object.keys(items).length` är O(n) över upp till 17 000 nycklar och låg
   * tidigare i en render-väg (`hasEpg`, `useEpgLoadStatus`) som körs vid varje
   * minuttick och varje fokusbyte.
   */
  count: number
  /** När klienten tog emot snapshotet (inte när appen hämtade EPG:t). */
  loadedAt: number
}

const snapshots = new Map<string, NowSnapshot>()
const inflight = new Map<string, Promise<NowSnapshot>>()

function snapshotKey(listId: string, source: string | null): string {
  return `${epgStoreId(listId)}|${source ?? ''}|${getEpgShiftMinutes()}`
}

/**
 * Så gammalt ett snapshot får bli innan minuttickern hämtar om det även utan
 * en passerad programgräns (klockan hos appen kan ha rullat vidare på annat
 * sätt: ny EPG-hämtning, ändrade källor).
 */
export const NOW_SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000

/**
 * Ska minuttickern hämta ett nytt `/epg/now`?
 *
 * Tidigare hämtades hela snapshotet (upp till 3 MB för 17 000 kanaler) varje
 * minut, oavsett om något ändrats — TTL:en ovan var satt till exakt tickens
 * längd, så varje tick blev ett nytt anrop. Svaret ändras bara när ett program
 * PASSERAT en gräns: `now` har slutat, eller `next` har börjat. Det räcker att
 * hitta EN sådan för att veta att snapshotet är inaktuellt.
 *
 * Genomgången är avsiktligt en `for...in` utan `Object.values`/`entries`: den
 * körs en gång per minut över tiotusentals nycklar, och en mellanliggande
 * array vore en allokering i samma storleksordning som hela kanallistan.
 */
export function nowSnapshotNeedsRefetch(snapshot: NowSnapshot, nowMs: number): boolean {
  if (nowMs - snapshot.loadedAt >= NOW_SNAPSHOT_MAX_AGE_MS) return true
  const items = snapshot.items
  for (const key in items) {
    const entry = items[key]
    if (!entry) continue
    if (entry.now && entry.now.stop <= nowMs) return true
    if (entry.next && entry.next.start <= nowMs) return true
  }
  return false
}

/**
 * Nycklarna vars post passerat en gräns: `now` har slutat eller `next` har
 * börjat. Det är exakt de poster ett nytt `/epg/now` skulle svara annorlunda
 * för (övriga kanaler har samma nu/nästa/senare tills nästa gräns).
 */
export function staleNowKeys(snapshot: NowSnapshot, nowMs: number): string[] {
  const out: string[] = []
  const items = snapshot.items
  for (const key in items) {
    const entry = items[key]
    if (!entry) continue
    if ((entry.now && entry.now.stop <= nowMs) || (entry.next && entry.next.start <= nowMs)) out.push(key)
  }
  return out
}

/**
 * Över så här många inaktuella kanaler hämtas hela snapshotet i stället (och
 * appen tar högst 5 000 nycklar per anrop). Normalt är det några hundra till
 * tusen per minut även på de största listorna.
 */
const MAX_INCREMENTAL_KEYS = 4_000

/** Appen saknar `POST /epg/now` (äldre version) — fråga inte igen i den här sessionen. */
let incrementalUnsupported = false

/**
 * Lägger in färska poster för just `keys` i ett befintligt snapshot. Ett nytt
 * objekt (vyerna jämför referenser), men bara de ändrade posterna har tolkats:
 * på en lista med 50 000 kanaler var hela snapshotet flera MB JSON att tolka i
 * webbvyns huvudtråd varje minut, och en Shield frös (2026-10-20).
 */
async function refreshStaleKeys(
  listId: string,
  cached: NowSnapshot,
  keys: string[],
): Promise<NowSnapshot> {
  const data = await epgNowForKeys({ listId: epgStoreId(listId), keys })
  const items: Record<string, NowNextLater> = { ...cached.items }
  let count = cached.count
  for (const key of keys) {
    const fresh = data.items[key]
    if (fresh) {
      items[key] = fresh
    } else if (key in items) {
      delete items[key]
      count -= 1
    }
  }
  return { at: data.at, fetchedAt: data.fetchedAt, items, count, loadedAt: cached.loadedAt }
}

export function getCachedNowSnapshot(listId: string, source: string | null): NowSnapshot | null {
  return snapshots.get(snapshotKey(listId, source)) ?? null
}

export async function fetchNowSnapshot(
  listId: string,
  source: string | null,
  opts?: { force?: boolean },
): Promise<NowSnapshot> {
  const key = snapshotKey(listId, source)
  const cached = snapshots.get(key)
  if (!opts?.force && cached && Date.now() - cached.loadedAt < TTL_MS) return cached

  const existing = inflight.get(key)
  if (existing) return existing

  const full = () => epgNow({ listId: epgStoreId(listId), source: source ?? undefined })
    .then((data): NowSnapshot => ({
      at: data.at,
      fetchedAt: data.fetchedAt,
      items: data.items,
      count: Object.keys(data.items).length,
      loadedAt: Date.now(),
    }))

  /*
   * Stegvis när det går: ett snapshot yngre än 10 minuter är sant för alla
   * kanaler vars program inte passerat en gräns, så bara de inaktuella hämtas.
   * `loadedAt` behålls — 10-minutersgränsen (ny EPG-hämtning, ändrade källor)
   * räknas från senaste HELA hämtningen. Inga inaktuella alls: snapshotet
   * gäller som det är.
   */
  const nowMs = Date.now()
  const incremental = !opts?.force && !incrementalUnsupported && cached
    && nowMs - cached.loadedAt < NOW_SNAPSHOT_MAX_AGE_MS
  const stale = incremental ? staleNowKeys(cached, nowMs) : null
  const load: Promise<NowSnapshot> = cached && stale && stale.length <= MAX_INCREMENTAL_KEYS
    ? (stale.length === 0
        ? Promise.resolve(cached)
        : refreshStaleKeys(listId, cached, stale).catch(() => {
            // Äldre app utan vägen (405/404) eller ett tillfälligt fel: hela
            // snapshotet som förut. Gäller resten av sessionen.
            incrementalUnsupported = true
            return full()
          }))
    : full()

  const request = load
    .then((snapshot) => {
      snapshots.set(key, snapshot)
      publish({ snapshot, failed: false })
      return snapshot
    })
    .catch((err) => {
      publish({ snapshot: snapshots.get(key) ?? null, failed: true })
      throw err
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, request)
  return request
}

/*
 * ---------------------------------------------------------------------------
 * Det SENAST hämtade snapshotet, som en liten observerbar.
 *
 * `useEpgLoadStatus` hämtade tidigare ett EGET snapshot (utan källa) parallellt
 * med modellens (med aktiv källa): två anrop om upp till 3 MB vid varje
 * TV-start, med olika svar. Hooken läser nu i stället det modellen redan
 * hämtat. Ingen hook driver hämtningen — modellen gör det — så statusen kan
 * aldrig dra igång ett eget nätverksanrop igen.
 */

export interface NowSnapshotState {
  snapshot: NowSnapshot | null
  failed: boolean
}

let active: NowSnapshotState = { snapshot: null, failed: false }
const listeners = new Set<() => void>()

function publish(next: NowSnapshotState): void {
  active = next
  for (const listener of [...listeners]) listener()
}

export function getActiveNowSnapshot(): NowSnapshotState {
  return active
}

export function subscribeNowSnapshot(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function __resetNowSnapshotForTests(): void {
  incrementalUnsupported = false
  snapshots.clear()
  inflight.clear()
  active = { snapshot: null, failed: false }
  listeners.clear()
}
