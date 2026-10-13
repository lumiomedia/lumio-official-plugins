import { normalizeChannelName } from './epg/name-match'
import { channelKey, type M3uChannel } from './live-tv-data'
import { qualityFromName } from './live-tv-model'

/**
 * Byte av ström när en kanal hackar (Jerry 2026-10-13, CL-kvällen: en annan
 * källa för samma match flöt medan den första buffrade om och om igen).
 * Starten räknas inte; därefter utlöser ett långt stopp eller flera korta
 * inom en minut. Utlöser en gång per start.
 */
export const GRACE_MS = 10_000
export const LONG_STALL_MS = 6_000
export const STALL_WINDOW_MS = 60_000
const STALLS_TO_TRIGGER = 3

export type StallState = { startedAt: number; stallSince: number | null; stalls: number[]; fired: boolean }
export type StallEvent = { type: 'start'; at: number } | { type: 'cache'; paused: boolean; at: number } | { type: 'tick'; at: number }
export const initialStall: StallState = { startedAt: 0, stallSince: null, stalls: [], fired: false }

export function stallStep(s: StallState, e: StallEvent): { state: StallState; trigger: boolean } {
  if (e.type === 'start') return { state: { startedAt: e.at, stallSince: null, stalls: [], fired: false }, trigger: false }
  const inGrace = (at: number) => at - s.startedAt < GRACE_MS
  if (e.type === 'cache') {
    if (e.paused) {
      if (s.stallSince != null) return { state: s, trigger: false }
      return { state: { ...s, stallSince: e.at }, trigger: false }
    }
    if (s.stallSince == null) return { state: s, trigger: false }
    const since = s.stallSince
    if (inGrace(since)) return { state: { ...s, stallSince: null }, trigger: false }
    const stalls = [...s.stalls.filter((t) => e.at - t < STALL_WINDOW_MS), since]
    const trigger = !s.fired && stalls.length >= STALLS_TO_TRIGGER
    return { state: { ...s, stallSince: null, stalls, fired: s.fired || trigger }, trigger }
  }
  // tick: ett pågående stopp som blivit långt. Ett stopp som börjar under starten
  // räknas från startfönstrets slut, så att en ström som aldrig kommer igång också byts.
  if (s.fired || s.stallSince == null) return { state: s, trigger: false }
  if (e.at - Math.max(s.stallSince, s.startedAt + GRACE_MS) < LONG_STALL_MS) return { state: s, trigger: false }
  return { state: { ...s, fired: true }, trigger: true }
}

const RANK: Record<string, number> = { '4K': 4, FHD: 3, HD: 2, SD: 1 }
const rankOf = (c: M3uChannel) => RANK[qualityFromName(c.name) ?? ''] ?? 2

/**
 * Kandidater i ordning: matchens andra källor (redan rankade av sportläget),
 * sedan samma kanal i andra varianter — samma kvalitet först (ofta en annan
 * server), sedan lägre (mindre data), sist högre.
 */
export function fallbackCandidates(current: M3uChannel, ctx: { sportSources: M3uChannel[]; channels: M3uChannel[]; tried: Set<string> }): M3uChannel[] {
  const seen = new Set<string>([channelKey(current), ...ctx.tried])
  const out: M3uChannel[] = []
  const add = (c: M3uChannel) => { const k = channelKey(c); if (seen.has(k)) return; seen.add(k); out.push(c) }
  ctx.sportSources.forEach(add)
  const stem = normalizeChannelName(current.name)
  if (stem.length >= 4) {
    const cur = rankOf(current)
    const variants = ctx.channels
      .filter((c) => normalizeChannelName(c.name) === stem)
      .map((c, i) => ({ c, i, r: rankOf(c) }))
      .sort((a, b) => {
        const band = (r: number) => (r === cur ? 0 : r < cur ? 1 : 2)
        return band(a.r) - band(b.r) || (band(a.r) === 1 ? b.r - a.r : a.r - b.r) || a.i - b.i
      })
    variants.forEach((v) => add(v.c))
  }
  return out
}
