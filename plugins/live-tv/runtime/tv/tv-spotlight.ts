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
  for (const c of input.favourites) if (input.nowFor(c).now) add(c, 'favouriteLive')
  for (const c of input.favourites) add(c, 'favourite')
  for (const c of input.recent) add(c, 'recent')
  for (const c of input.channels) if (input.nowFor(c).now) add(c, 'onNow')
  return out
}
