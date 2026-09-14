import type { M3uChannel } from './live-tv-data'

/**
 * Live TV:s sid-id och de två småsaker som fortfarande delas mellan ytorna.
 *
 * Filen var förut hela skrivbordsskalet (spelarkrom, PIN-grind,
 * påminnelsebanner, navigeringskrok). Sedan TV-trädet blev Live TV:s enda yta
 * ligger allt det i `tv/tv-shell.tsx`, och det som blev kvar här är bara
 * sidadressen och parameterkodningen som startsidan, rutnätet och
 * påminnelsemonteringen delar.
 */
export const LIVE_TV_BROWSE_PAGE_ID = 'live-tv-browse'

export function encodeChannelParams(channel: M3uChannel): Record<string, string> {
  return {
    url: channel.url,
    name: channel.name,
    logo: channel.logo ?? '',
    group: channel.group,
    tvgId: channel.tvgId ?? '',
  }
}

export interface PlayRequest {
  channel: M3uChannel
  /** Catch-up: spela en annan URL än kanalens liveström. */
  url?: string
  label?: string
}
