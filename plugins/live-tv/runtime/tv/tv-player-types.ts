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
  /** Favoriternas nycklar (`channelKey`): telefonens zap-lista lägger dem först. */
  pinnedKeys: string[]
  nowFor: (channel: M3uChannel) => NowNextLater
  nowMs: number
  locale: string
  /** PIN-grinden (kanalbyte till en låst kanal) är öppen ovanpå spelaren. */
  gateOpen: boolean
  /** Telefonyta (fas 3): skalets mätning, skickad vidare så kromet slipper mäta själv. */
  phone: boolean
  /** Ur `TvSettings`: rotation till liggande ger fullskärm (telefon). */
  fullscreenOnRotate: boolean
  /** Ur `TvSettings`: håll skärmen vaken under uppspelning (telefon). */
  keepAwake: boolean
  onToggleFavourite(): void
  onOpenChannelDetails(): void
  onOpenMultiview(): void
  onOpenGuide(): void
  onAddToMultiview(channel: M3uChannel): void
  onSwitchChannel(channel: M3uChannel): void
}

/**
 * Pekarkontrollerna: ljud av, volym, fullskärm, bildförhållande.
 *
 * Egen prop och INTE en del av `LiveTvPlayerTvProps`: den byggs av skalet
 * (`tv/tv-player-props.ts`) och beskriver kanalen och dess grannar, medan
 * det här är spelarens eget tillstånd — bara `live-tv-player.tsx` kan äga
 * det (motorn, `<video>`-elementet, fönstret).
 *
 * Kontrollraden ritas på både skrivbord och TV (den gamla layouten är
 * tillbaka); bara volymreglaget utelämnas på TV, där ljud av/på räcker.
 */
export interface LiveTvPlayerControls {
  muted: boolean
  /** 0–1. */
  volume: number
  fullscreen: boolean
  /** Namnet på det valda läget, t.ex. "Auto" eller "16:9". */
  aspectLabel: string
  /** Spelad tid i sekunder (motorns time-pos) för kontrollradens klocka. */
  timePos?: number | null
  onToggleMute(): void
  onVolume(next: number): void
  onToggleFullscreen(): void
  onCycleAspect(): void
}
