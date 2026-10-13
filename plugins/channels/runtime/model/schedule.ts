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

export function programmeAt<T extends ScheduleItem>(rundown: T[], window: AirWindow, t: number): Slot<T> | { kind: 'empty' } {
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
