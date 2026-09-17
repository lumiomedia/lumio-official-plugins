import { channelKey, type M3uChannel } from '../live-tv-data'
import type { NowNextLater } from '../epg/types'

export type SpotlightReason = 'favouriteLive' | 'favourite' | 'recent' | 'onNow'
export interface SpotlightPick { channel: M3uChannel; reason: SpotlightReason }

/** Samma urvalsregel som dagens hubb: favorit live → favoriter → senast sedda → sänder nu. */
/**
 * Deterministisk blandning (mulberry32): samma `seed` ger samma ordning, så
 * korten står stilla under ett besök men byts vid nästa (Jerry 2026-09-17:
 * spotlighten var alltid de tre första favoriterna — en kopia av
 * favoritraden). Utan seed blandas inget — dagens ordning och tester gäller.
 */
export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  let a = (seed >>> 0) || 1
  const rnd = () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function pickSpotlight(input: { favourites: M3uChannel[]; recent: M3uChannel[]; channels: M3uChannel[]; nowFor: (c: M3uChannel) => NowNextLater; count: number; seed?: number }): SpotlightPick[] {
  const favourites = input.seed === undefined ? input.favourites : shuffleWithSeed(input.favourites, input.seed)
  const seen = new Set<string>()
  const out: SpotlightPick[] = []
  const add = (channel: M3uChannel, reason: SpotlightReason) => {
    const key = channelKey(channel)
    if (seen.has(key) || out.length >= input.count) return
    seen.add(key)
    out.push({ channel, reason })
  }
  // `full()` bryter varje slinga så snart urvalet är fyllt. `add` avvisade
  // redan överskottet, men slingorna gick ändå till slutet — och de två
  // `nowFor`-slingorna slår upp EPG per kanal. Hubben ber om en handfull kort
  // ur en spellista som kan ha tiotusentals kanaler, så utan brytningen
  // kostade varje minuttick en full genomsökning för fyra kort.
  const full = () => out.length >= input.count
  for (const c of favourites) { if (full()) return out; if (input.nowFor(c).now) add(c, 'favouriteLive') }
  for (const c of favourites) { if (full()) return out; add(c, 'favourite') }
  for (const c of input.recent) { if (full()) return out; add(c, 'recent') }
  for (const c of input.channels) { if (full()) return out; if (input.nowFor(c).now) add(c, 'onNow') }
  return out
}
