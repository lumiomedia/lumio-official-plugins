/**
 * Tablån räknas fram, den lagras aldrig. Rundownen (ordnad titellista) loopas
 * från en fast epok, så "vad sänds nu" är en ren funktion av rundown, fönster
 * och väggklocka — samma svar på alla enheter, ingen server.
 *
 * Fönsterkanaler har en egen SÄNDNINGSKLOCKA som bara går när kanalen sänder:
 * tablån pausar i vilan och fortsätter där den slutade nästa kväll, i stället
 * för att rulla förbi halva filmer i det tysta.
 */
import type { AirWindow, OrderRule } from './channel'
import { lockedSlotAt, lockHorizon, type ScheduleLock } from './lock'

export const EPOCH = new Date(2026, 0, 1, 0, 0, 0).getTime()
const MIN = 60_000
const DAY_MIN = 24 * 60

export interface ScheduleItem {
  ref: string
  title: string
  runtimeMin: number
  year: number | null
  kind: 'movie' | 'episode'
  seriesKey?: string
  season?: number
  episode?: number
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// Språkoberoende jämförelse (localeCompare beror på ICU/enhet).
const cmpText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const byRef = <T extends ScheduleItem>(a: T, b: T) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0)
const byEpisode = <T extends ScheduleItem>(a: T, b: T) => (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0)

export function buildRundown<T extends ScheduleItem>(items: T[], order: OrderRule, seed: number): T[] {
  const stable = [...items].sort(byRef)
  if (order === 'chrono') {
    return stable.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || cmpText(a.title.toLowerCase(), b.title.toLowerCase()) || byRef(a, b) || byEpisode(a, b))
  }
  const random = mulberry32(seed)
  if (order === 'shuffle') return shuffle(stable, random)
  // episodes: varje serie i S/E-ordning, serierna turas om i seedad ordning;
  // filmer blir egna "serier" med en enda post.
  const queues = new Map<string, T[]>()
  for (const entry of stable) {
    const key = entry.kind === 'episode' && entry.seriesKey ? `s:${entry.seriesKey}` : `m:${entry.ref}`
    const queue = queues.get(key) ?? []
    queue.push(entry)
    queues.set(key, queue)
  }
  for (const queue of queues.values()) queue.sort(byEpisode)
  const keys = shuffle([...queues.keys()], random)
  const out: T[] = []
  let progressed = true
  while (progressed) {
    progressed = false
    for (const key of keys) {
      const next = queues.get(key)!.shift()
      if (next) {
        out.push(next)
        progressed = true
      }
    }
  }
  return out
}

// ── Sändningsfönster ────────────────────────────────────────────────────────
// Ett fönster är ett sammanhängande spann per dygn, [start, slut) i minuter
// efter lokal midnatt; slut > 1440 betyder att det fortsätter över midnatt.
type TimedWindow = Exclude<AirWindow, 'always'>
const SPANS: Record<TimedWindow, [number, number]> = {
  evenings: [18 * 60, 26 * 60],
  late: [0, 6 * 60],
}
// Sändningsminuter per dygn (utan hänsyn till sommartidsdygn).
const AIR_PER_DAY: Record<TimedWindow, number> = { evenings: 8 * 60, late: 6 * 60 }

interface Span { start: number; end: number; day: number }

/**
 * Dygnets spann i väggklocka, för dygnen runt t. `day` är dygnsindex från
 * EPOK. Spannet kapas till sin nominella längd, så ett höstdygn med extra
 * timme inte ger mer sändningstid än AIR_PER_DAY; ett vårdygn blir kortare
 * på riktigt. Därmed är sändningsklockan alltid konsekvent med spannen.
 */
function spansAround(window: TimedWindow, t: number): Span[] {
  const d = new Date(t)
  const [s, e] = SPANS[window]
  const out: Span[] = []
  for (let k = -2; k <= 2; k += 1) {
    const y = d.getFullYear(), m = d.getMonth(), dd = d.getDate() + k
    const start = new Date(y, m, dd, 0, s).getTime()
    const end = Math.min(new Date(y, m, dd, 0, e).getTime(), start + (e - s) * MIN)
    out.push({ start, end, day: Math.round((new Date(y, m, dd).getTime() - EPOCH) / (DAY_MIN * MIN)) })
  }
  return out
}

export function airMinutesUntil(window: AirWindow, t: number): number {
  if (window === 'always') return (t - EPOCH) / MIN
  // Senaste spannet som har börjat; sändningsminuter = hela dygn före + tid in i spannet.
  const span = spansAround(window, t).filter((x) => x.start <= t).pop()!
  const [s, e] = SPANS[window]
  return span.day * AIR_PER_DAY[window] + Math.min(e - s, (t - span.start) / MIN)
}

export function isOnAir(window: AirWindow, t: number): boolean {
  if (window === 'always') return true
  return spansAround(window, t).some((x) => t >= x.start && t < x.end)
}

export function nextAirStart(window: AirWindow, t: number): number {
  if (window === 'always' || isOnAir(window, t)) return t
  return spansAround(window, t).map((x) => x.start).filter((s) => s > t).sort((a, b) => a - b)[0]!
}

// ── Program vid en tidpunkt ──────────────────────────────────────────────────
export type ProgrammeSlot<T> = { kind: 'programme'; item: T; index: number; start: number; stop: number; minsIn: number; minsLeft: number; pct: number }
export type RestSlot = { kind: 'rest'; start: number; stop: number; nextAir: number }
export type Slot<T> = ProgrammeSlot<T> | RestSlot

function cumulative(rundown: ScheduleItem[]): { starts: number[]; cycle: number } {
  const starts: number[] = []
  let sum = 0
  for (const entry of rundown) {
    starts.push(sum)
    sum += Math.max(1, entry.runtimeMin)
  }
  return { starts, cycle: sum }
}

function findIndex(starts: number[], position: number): number {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid]! <= position) lo = mid
    else hi = mid - 1
  }
  return lo
}

// ── Tablålås (model/lock.ts) ────────────────────────────────────────────────
// Låset följer med rundownen som en dold egenskap, så alla läsare (tablå,
// hero, hemrad, spelare) får samma låsta tablå utan att varje anrop ändras.
const LOCK = Symbol.for('lumio.channels.lock')
interface AttachedLock { lock: ScheduleLock; index: Map<string, number> }

/** Rundownen med låset fäst (en kopia; originalet lämnas olåst). */
export function withLock<T extends ScheduleItem>(rundown: T[], lock: ScheduleLock | null): T[] {
  if (!lock || rundown.length === 0) return rundown
  const out = [...rundown]
  const index = new Map<string, number>()
  rundown.forEach((item, i) => { if (!index.has(item.ref)) index.set(item.ref, i) })
  Object.defineProperty(out, LOCK, { value: { lock, index } satisfies AttachedLock, enumerable: false })
  return out
}

/** Låset som är fäst vid en rundown (null = olåst). */
export function attachedLock(rundown: ScheduleItem[]): ScheduleLock | null {
  return (rundown as unknown as Record<symbol, AttachedLock | undefined>)[LOCK]?.lock ?? null
}

export function programmeAt<T extends ScheduleItem>(rundown: T[], window: AirWindow, t: number): Slot<T> | { kind: 'empty' } {
  if (rundown.length === 0) return { kind: 'empty' }
  const attached = (rundown as unknown as Record<symbol, AttachedLock | undefined>)[LOCK]
  if (attached) {
    /*
      Tiden är uppdelad i tre fält som aldrig överlappar: FÖRE låset (den
      räknade tablån, klippt så den slutar där låset börjar), I låset (de
      låsta programmen; en försvunnen titel ersätts av den räknade tablån
      klippt till sin låsta ruta) och EFTER horisonten (den räknade, klippt
      så den börjar vid horisonten). Förr klipptes bara det sista: tablån
      visar från föregående halvtimme, och med en ändrad pool sträckte sig
      det räknade programmet före låset in över det första låsta — två block
      ovanpå varandra i raden (0.1.10/0.1.11).
    */
    const slots = attached.lock.slots
    const lockStart = slots.length > 0 ? slots[0]!.s : null
    const horizon = lockHorizon(attached.lock)
    const hit = lockedSlotAt(attached.lock, t)
    if (hit) {
      if (hit.r === '') return { kind: 'rest', start: hit.s, stop: hit.e, nextAir: hit.e }
      const index = attached.index.get(hit.r)
      if (index != null) {
        const item = rundown[index]!
        const runtime = Math.max(1, item.runtimeMin)
        const minsIn = hit.o + (t - hit.s) / MIN
        return { kind: 'programme', item, index, start: hit.s, stop: hit.e, minsIn, minsLeft: runtime - minsIn, pct: minsIn / runtime }
      }
      // Titeln finns inte längre i poolen: den räknade tablån, inom den låsta rutan.
      return clip(computedAt(rundown, window, t), hit.s, hit.e)
    }
    const free = computedAt(rundown, window, t)
    if (lockStart != null && t < lockStart) return clip(free, -Infinity, lockStart)
    if (horizon != null && t >= horizon) return clip(free, horizon, Infinity)
    return free
  }
  return computedAt(rundown, window, t)
}

/** En ruta klippt till [from, to); rutans slut på en vila följer med (nästa sändning). */
function clip<T extends ScheduleItem>(slot: Slot<T> | { kind: 'empty' }, from: number, to: number): Slot<T> | { kind: 'empty' } {
  if (slot.kind === 'empty') return slot
  const start = Math.max(slot.start, from)
  const stop = Math.min(slot.stop, to)
  if (start === slot.start && stop === slot.stop) return slot
  return slot.kind === 'rest' ? { ...slot, start, stop, nextAir: Math.min(slot.nextAir, stop) } : { ...slot, start, stop }
}

/** Den räknade (olåsta) tablån vid t. */
function computedAt<T extends ScheduleItem>(rundown: T[], window: AirWindow, t: number): Slot<T> | { kind: 'empty' } {
  if (rundown.length === 0) return { kind: 'empty' }
  let span: Span | null = null
  if (window !== 'always') {
    const spans = spansAround(window, t)
    span = spans.find((x) => t >= x.start && t < x.end) ?? null
    if (!span) {
      // Vila: från föregående spans slut till nästa spans start.
      const start = Math.max(...spans.map((x) => x.end).filter((e) => e <= t))
      const nextAir = Math.min(...spans.map((x) => x.start).filter((s) => s > t))
      return { kind: 'rest', start, stop: nextAir, nextAir }
    }
  }
  const { starts, cycle } = cumulative(rundown)
  const position = ((airMinutesUntil(window, t) % cycle) + cycle) % cycle
  const index = findIndex(starts, position)
  const item = rundown[index]!
  const runtime = Math.max(1, item.runtimeMin)
  const minsIn = position - starts[index]!
  const minsLeft = runtime - minsIn
  // Ett program som korsar fönstrets slut klipps där och fortsätter nästa sändning.
  const start = span ? Math.max(t - minsIn * MIN, span.start) : t - minsIn * MIN
  const stop = span ? Math.min(t + minsLeft * MIN, span.end) : t + minsLeft * MIN
  return { kind: 'programme', item, index, start, stop, minsIn, minsLeft, pct: minsIn / runtime }
}

export function listing<T extends ScheduleItem>(rundown: T[], window: AirWindow, from: number, to: number): Slot<T>[] {
  const out: Slot<T>[] = []
  let t = from
  let guard = 0
  while (t < to && guard < 500) {
    guard += 1
    const slot = programmeAt(rundown, window, t)
    if (slot.kind === 'empty') break
    out.push(slot)
    t = slot.stop > t ? slot.stop : t + MIN
  }
  return out
}
