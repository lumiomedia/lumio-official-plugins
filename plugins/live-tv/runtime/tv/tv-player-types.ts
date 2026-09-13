import type { M3uChannel } from '../live-tv-data'
import type { NowNextLater } from '../epg/types'

/** Det TV-skalet ger spelaren utöver kanalen: numrering, grannar, menyval. */
export interface LiveTvPlayerTvProps {
  channelNumber: number | null
  quality: string | null
  favourite: boolean
  /** 0 = dölj aldrig. */
  bannerHideMs: number
  neighbours: M3uChannel[]
  nowFor: (channel: M3uChannel) => NowNextLater
  nowMs: number
  locale: string
  /** PIN-grinden (kanalbyte till en låst kanal) är öppen ovanpå spelaren. */
  gateOpen: boolean
  onToggleFavourite(): void
  onOpenChannelDetails(): void
  onOpenMultiview(): void
  onOpenGuide(): void
  onAddToMultiview(channel: M3uChannel): void
  onSwitchChannel(channel: M3uChannel): void
}
