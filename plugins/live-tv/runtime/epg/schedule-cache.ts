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
import type { EpgProgramme } from './types'

const TTL_MS = 5 * 60 * 1000

interface Entry {
  programmes: EpgProgramme[]
  storedAt: number
}

const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<Record<string, EpgProgramme[]>>>()

function entryKey(listId: string, key: string, from: number, to: number): string {
  return `${listId}|${key}|${from}|${to}`
}

/** Färska poster ur cachen; nycklar utan (eller med utgången) post lämnas kvar som `missing`. */
function split(listId: string, keys: string[], from: number, to: number, now: number) {
  const hits: Record<string, EpgProgramme[]> = {}
  const missing: string[] = []
  for (const key of keys) {
    const entry = cache.get(entryKey(listId, key, from, to))
    if (entry && now - entry.storedAt < TTL_MS) hits[key] = entry.programmes
    else missing.push(key)
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

  const requestKey = entryKey(listId, missing.join(','), from, to)
  let request = inflight.get(requestKey)
  if (!request) {
    request = epgSchedule(listId, missing, from, to)
      .then((items) => {
        const storedAt = Date.now()
        for (const key of missing) {
          cache.set(entryKey(listId, key, from, to), { programmes: items[key] ?? [], storedAt })
        }
        return items
      })
      .finally(() => {
        inflight.delete(requestKey)
      })
    inflight.set(requestKey, request)
  }

  const items = await request
  const merged: Record<string, EpgProgramme[]> = { ...hits }
  for (const key of missing) merged[key] = items[key] ?? []
  return merged
}

export function __resetScheduleCacheForTests(): void {
  cache.clear()
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
