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

import { epgNow } from '../index-client'
import type { NowNextLater } from './types'

/** Så länge ett hämtat snapshot återanvänds utan nytt anrop. Tickern i modellen ligger på samma minut. */
const TTL_MS = 60_000

export interface NowSnapshot {
  at: number
  fetchedAt: number | null
  items: Record<string, NowNextLater>
  /** När klienten tog emot snapshotet (inte när appen hämtade EPG:t). */
  loadedAt: number
}

const snapshots = new Map<string, NowSnapshot>()
const inflight = new Map<string, Promise<NowSnapshot>>()

function snapshotKey(listId: string, source: string | null): string {
  return `${listId}|${source ?? ''}`
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

  const request = epgNow({ listId, source: source ?? undefined })
    .then((data) => {
      const snapshot: NowSnapshot = {
        at: data.at,
        fetchedAt: data.fetchedAt,
        items: data.items,
        loadedAt: Date.now(),
      }
      snapshots.set(key, snapshot)
      return snapshot
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, request)
  return request
}

export function __resetNowSnapshotForTests(): void {
  snapshots.clear()
  inflight.clear()
}
