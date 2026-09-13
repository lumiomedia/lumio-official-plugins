'use client'

/**
 * Modulcache för tablåfönster (lagring v2, spec 4.2).
 *
 * Tablån bor i appen sedan v2 och hämtas per KANALNYCKEL och FÖNSTER via
 * `/api/live-tv/epg/schedule`. Vyerna frågar om samma fönster om och om igen —
 * guiden ritar om vid varje minuttick, kanalsidan vid varje dagbyte tillbaka —
 * så utan en cache hade en minutklocka blivit en nätverksklocka.
 *
 * Cachen ligger i MODULEN och inte i en hook: guiden, kanalsidan, spelarens
 * schemaöverlägg och repriserna frågar efter överlappande fönster från olika
 * träd, och de ska dela svar. Nyckeln är `(key, from, to)` — samma kanal i ett
 * annat fönster är en annan post — och posterna lever 5 minuter.
 *
 * Samtidiga frågor på samma nyckel delar EN begäran (`inflight`), annars hade
 * fyrtio rader som monterar samtidigt gett fyrtio anrop för samma fönster.
 */

import { epgSchedule } from '../index-client'
import { epgStoreId } from './store-id'
import type { EpgProgramme } from './types'

const TTL_MS = 5 * 60 * 1000
/**
 * Tak för antal cachade (kanal, fönster)-poster.
 *
 * Cachen levde tidigare hela sidladdningen ut utan att någonsin krympa: en
 * guide som bläddras genom 17 000 kanaler × flera dagsfönster hade lagt
 * tiotusentals programlistor i minnet på en TV-box med några hundra MB. Posten
 * som rörts senast får stanna (Map:en bevarar insättningsordning, och en träff
 * sätts in på nytt sist), så de fönster användaren faktiskt tittar på överlever.
 */
const MAX_ENTRIES = 600

interface Entry {
  programmes: EpgProgramme[]
  storedAt: number
}

const cache = new Map<string, Entry>()

/**
 * Nycklar som väntar på att skickas, per FÖNSTER.
 *
 * Kanalkorten frågar en nyckel i taget (`useEpgNowNextLater`): fyrtio kort som
 * monteras i samma rendering gav fyrtio POST:ar mot `/epg/schedule` för exakt
 * samma fönster. Frågorna samlas därför upp och skickas i EN begäran.
 *
 * Fönstret är en mikrotask och inte en timer: alla effekter i en React-commit
 * körs i samma task, så mikrotasken efter den fångar hela skärmen — utan att
 * lägga till någon väntan för den som frågar ensam (en 50 ms fördröjning hade
 * synts i guiden, som frågar om hundratals nycklar på en gång).
 */
interface PendingBatch {
  keys: Set<string>
  promise: Promise<Record<string, EpgProgramme[]>>
  scheduled: boolean
  send: () => void
}

const batches = new Map<string, PendingBatch>()

/**
 * Redan AVSKICKADE frågor, per (kanal, fönster).
 *
 * En fråga som kommer medan svaret är på väg får inte skicka en till: guiden
 * och kanalsidan monterar om hela tiden, och den gamla koden delade in-flight
 * per exakt samma nyckeluppsättning. Här sker det per nyckel i stället, så en
 * ENSKILD kanal ur en tidigare skickad hög också räknas som redan frågad.
 */
const inflight = new Map<string, Promise<Record<string, EpgProgramme[]>>>()

function queueBatch(
  listId: string,
  keys: string[],
  from: number,
  to: number,
): Promise<Record<string, EpgProgramme[]>> {
  const id = `${epgStoreId(listId)}|${from}|${to}`
  let batch = batches.get(id)
  if (!batch) {
    let settle!: (items: Promise<Record<string, EpgProgramme[]>>) => void
    const promise = new Promise<Record<string, EpgProgramme[]>>((resolve, reject) => {
      settle = (items) => items.then(resolve, reject)
    })
    const entry: PendingBatch = {
      keys: new Set(),
      promise,
      scheduled: false,
      send: () => {
        batches.delete(id)
        const wanted = [...entry.keys]
        const request = epgSchedule(epgStoreId(listId), wanted, from, to).then((items) => {
          const storedAt = Date.now()
          for (const key of wanted) {
            cache.set(entryKey(listId, key, from, to), { programmes: items[key] ?? [], storedAt })
          }
          evict(storedAt)
          return items
        })
        for (const key of wanted) inflight.set(entryKey(listId, key, from, to), request)
        request
          .catch(() => {})
          .finally(() => {
            for (const key of wanted) {
              if (inflight.get(entryKey(listId, key, from, to)) === request) {
                inflight.delete(entryKey(listId, key, from, to))
              }
            }
          })
        settle(request)
      },
    }
    batch = entry
    batches.set(id, entry)
  }
  for (const key of keys) batch.keys.add(key)
  if (!batch.scheduled) {
    batch.scheduled = true
    queueMicrotask(batch.send)
  }
  return batch.promise
}

function entryKey(listId: string, key: string, from: number, to: number): string {
  // Alla list-id pekar på samma EPG-store, se epg/store-id.ts.
  return `${epgStoreId(listId)}|${key}|${from}|${to}`
}

/** Kastar utgångna poster, och de äldsta om taket är nått. */
function evict(now: number): void {
  for (const [key, entry] of cache) {
    if (now - entry.storedAt >= TTL_MS) cache.delete(key)
  }
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
}

/** Färska poster ur cachen; nycklar utan (eller med utgången) post lämnas kvar som `missing`. */
function split(listId: string, keys: string[], from: number, to: number, now: number) {
  const hits: Record<string, EpgProgramme[]> = {}
  const missing: string[] = []
  for (const key of keys) {
    const id = entryKey(listId, key, from, to)
    const entry = cache.get(id)
    if (entry && now - entry.storedAt < TTL_MS) {
      hits[key] = entry.programmes
      // Sätt in sist igen: posten är "nyligen använd" och ska överleva taket.
      cache.delete(id)
      cache.set(id, entry)
    } else {
      missing.push(key)
    }
  }
  return { hits, missing }
}

/** Vad cachen kan svara på UTAN nätverk — för ett första render utan blink. */
export function getCachedSchedules(
  listId: string,
  keys: string[],
  from: number,
  to: number,
): { schedules: Record<string, EpgProgramme[]>; missing: string[] } {
  const { hits, missing } = split(listId, keys, from, to, Date.now())
  return { schedules: hits, missing }
}

/**
 * Tablåer för `keys` i fönstret. Cachade nycklar kostar ingenting; resten
 * hämtas i en begäran (`epgSchedule` chunkar 200 nycklar per anrop).
 *
 * En nyckel som kommer tillbaka UTAN program cachas som tom lista — annars
 * hade varje omrender frågat om kanalerna som inte har någon tablå alls.
 */
export async function fetchSchedules(
  listId: string,
  keys: string[],
  from: number,
  to: number,
): Promise<Record<string, EpgProgramme[]>> {
  const unique = [...new Set(keys.filter((key) => key.length > 0))]
  const { hits, missing } = split(listId, unique, from, to, Date.now())
  if (missing.length === 0) return hits

  // Nycklar vars svar redan är på väg väntar in den begäran; resten läggs i
  // nästa hög.
  const waiting = new Set<Promise<Record<string, EpgProgramme[]>>>()
  const queue: string[] = []
  for (const key of missing) {
    const pending = inflight.get(entryKey(listId, key, from, to))
    if (pending) waiting.add(pending)
    else queue.push(key)
  }
  if (queue.length > 0) waiting.add(queueBatch(listId, queue, from, to))
  const answers = await Promise.all([...waiting])

  // Svaren först, cachen som reserv: en ENDA fråga kan ha delats på flera
  // högar, och en riktigt stor hög kan ha trängt ut sina egna första nycklar
  // ur cachen (taket) innan vi hinner läsa dem.
  const merged: Record<string, EpgProgramme[]> = { ...hits }
  for (const key of missing) {
    let value: EpgProgramme[] | undefined
    for (const answer of answers) {
      if (answer[key]) {
        value = answer[key]
        break
      }
    }
    merged[key] = value ?? cache.get(entryKey(listId, key, from, to))?.programmes ?? []
  }
  return merged
}

export function __resetScheduleCacheForTests(): void {
  cache.clear()
  batches.clear()
  inflight.clear()
}

const HOUR_MS = 3_600_000

/**
 * Fönster som ligger STILL mellan minuttickarna.
 *
 * Ett fönster räknat på `Date.now()` är en ny cachenyckel varje sekund, och
 * hookarna som räknar om varje minut hade då hämtat om varje minut. Kanterna
 * rundas till hela timmar: samma fråga inom timmen är samma nyckel.
 */
export function hourWindow(nowMs: number, hoursBack: number, hoursAhead: number): { from: number; to: number } {
  const anchor = Math.floor(nowMs / HOUR_MS) * HOUR_MS
  return { from: anchor - Math.max(0, hoursBack) * HOUR_MS, to: anchor + Math.max(1, hoursAhead) * HOUR_MS }
}
