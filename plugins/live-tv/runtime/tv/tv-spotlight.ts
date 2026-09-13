import { channelKey, type M3uChannel } from '../live-tv-data'
import type { NowNextLater } from '../epg/types'

export type SpotlightReason = 'favouriteLive' | 'favourite' | 'recent' | 'onNow'
export interface SpotlightPick { channel: M3uChannel; reason: SpotlightReason }

/** Samma urvalsregel som dagens hubb: favorit live → favoriter → senast sedda → sänder nu. */
export function pickSpotlight(input: { favourites: M3uChannel[]; recent: M3uChannel[]; channels: M3uChannel[]; nowFor: (c: M3uChannel) => NowNextLater; count: number }): SpotlightPick[] {
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
  for (const c of input.favourites) { if (full()) return out; if (input.nowFor(c).now) add(c, 'favouriteLive') }
  for (const c of input.favourites) { if (full()) return out; add(c, 'favourite') }
  for (const c of input.recent) { if (full()) return out; add(c, 'recent') }
  for (const c of input.channels) { if (full()) return out; if (input.nowFor(c).now) add(c, 'onNow') }
  return out
}
