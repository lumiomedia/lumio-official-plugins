'use client'

import { useEffect, useState } from 'react'
import { LIVE_TV_GLOBAL_EPG_ID } from '../live-tv-data'
import { getEpgShiftMinutes } from '../epg-shift'
import type { SportDay, SportMatch } from './sport-model'

/*
  Klienten mot värdens `/api/live-tv/sport/day` — ETT lokalt anrop per dag,
  inget mot någon leverantör. Status (live/senare/slut) räknas om i klienten
  på klockan, så dagen behöver bara hämtas om var femte minut.
*/

const pad = (n: number) => String(n).padStart(2, '0')

export function localDayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parts(day: string): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number)
  return [y ?? 1970, m ?? 1, d ?? 1]
}

export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = parts(day)
  return localDayKey(new Date(y, m - 1, d + delta, 12).getTime())
}

/** Minuter öster om UTC den dagen (kl. 12, så sommartidsbytet natten till inte stör). */
export function tzOffsetFor(day: string): number {
  const [y, m, d] = parts(day)
  return -new Date(y, m - 1, d, 12).getTimezoneOffset()
}

export function dayStartMs(day: string): number {
  const [y, m, d] = parts(day)
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

/** Värden svarar 404: appen är äldre än sportläget. */
export class SportEndpointMissing extends Error {
  constructor() {
    super('sport endpoint missing')
  }
}

const TTL_MS = 5 * 60_000
const cache = new Map<string, { at: number; promise: Promise<SportDay> }>()

export function __resetSportDayCache(): void {
  cache.clear()
}

function sanitizeDay(raw: unknown, day: string): SportDay {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<SportDay>
  const matches = Array.isArray(r.matches)
    ? (r.matches as SportMatch[]).map((m) => ({ ...m, sources: Array.isArray(m.sources) ? m.sources : [] }))
    : []
  return {
    day,
    from: Number(r.from ?? 0),
    to: Number(r.to ?? 0),
    at: Number(r.at ?? 0),
    fetchedAt: typeof r.fetchedAt === 'number' ? r.fetchedAt : null,
    matches,
    counts: r.counts && typeof r.counts === 'object' ? r.counts : {},
  }
}

/**
 * Förskjuten tablå (epg-shift.ts): värden räknar dygnet ur `tzOffset`, så
 * dygnet i VÄRDENS tid nås med zonen plus förskjutningen; matchernas och
 * kanalernas tider flyttas sedan tillbaka.
 */
export function hostTzOffset(day: string, shiftMin: number = getEpgShiftMinutes()): number {
  return tzOffsetFor(day) + shiftMin
}

function shiftDayTimes(d: SportDay, ms: number): SportDay {
  if (ms === 0) return d
  return {
    ...d,
    from: d.from + ms,
    to: d.to + ms,
    matches: d.matches.map((m) => ({
      ...m,
      start: m.start + ms,
      stop: m.stop + ms,
      sources: m.sources.map((s) => ({ ...s, programmeStart: s.programmeStart + ms, programmeStop: s.programmeStop + ms })),
    })),
  }
}

export function fetchSportDay(day: string, now: number = Date.now()): Promise<SportDay> {
  const shiftMin = getEpgShiftMinutes()
  const key = `${day}|${shiftMin}`
  const hit = cache.get(key)
  if (hit && now - hit.at < TTL_MS) return hit.promise
  const qs = new URLSearchParams({ listId: LIVE_TV_GLOBAL_EPG_ID, day, tzOffset: String(hostTzOffset(day, shiftMin)) })
  const promise = fetch(`/api/live-tv/sport/day?${qs.toString()}`).then(async (res) => {
    if (res.status === 404) throw new SportEndpointMissing()
    if (!res.ok) throw new Error(`/api/live-tv/sport/day returned ${res.status}`)
    return shiftDayTimes(sanitizeDay(await res.json(), day), shiftMin * 60_000)
  })
  cache.set(key, { at: now, promise })
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key)
  })
  return promise
}

export type SportDayState = 'loading' | 'ready' | 'missing' | 'error'

export function useSportDay(day: string | null, nowMs: number): { data: SportDay | null; state: SportDayState } {
  const [result, setResult] = useState<{ day: string | null; data: SportDay | null; state: SportDayState }>({ day: null, data: null, state: 'loading' })
  const bucket = Math.floor(nowMs / TTL_MS)
  useEffect(() => {
    if (!day) return
    let cancelled = false
    fetchSportDay(day)
      .then((data) => { if (!cancelled) setResult({ day, data, state: 'ready' }) })
      .catch((error: unknown) => { if (!cancelled) setResult({ day, data: null, state: error instanceof SportEndpointMissing ? 'missing' : 'error' }) })
    return () => { cancelled = true }
  }, [day, bucket])
  if (!day) return { data: null, state: 'ready' }
  return result.day === day ? { data: result.data, state: result.state } : { data: null, state: 'loading' }
}
