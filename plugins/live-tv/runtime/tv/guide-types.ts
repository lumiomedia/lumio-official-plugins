import type { M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import type { DesktopGuideMode } from './guide-surface'

/**
 * Den städade guidens delade typer (spec §1). Egen fil så att vyerna
 * (Grid, Now / Next, Timeline) kan importera dem utan att röra
 * `guide-shell.tsx` — skalet importerar vyerna, och en vy som importerade
 * tillbaka skalet hade gett en importcykel.
 */

/** Markerad kanal + program (program saknas för kanaler utan tablå). */
export type GuideSelection = { channel: M3uChannel; programme: EpgProgramme | null }

/** Allt en vy får från skalet. Läget i sig avgör vilken vy som ritas. */
export interface GuideViewProps {
  model: LiveTvModel
  nav: TvNav
  category: string | null
  dayOffset: 0 | 1
  /** Fönstrets start (halvtimmesjusterad, vy-state — inte lagring). */
  windowStart: number
  /** Räknas upp på varje Nu-tryck, så Grid scrollar till nu-linjen även när `windowStart` redan är dagens halvtimme. */
  nowTick?: number
  selection: GuideSelection | null
  onSelect(sel: GuideSelection | null): void
  /** TV-läget: fokus styr markeringen, `OK = …`-texter får visas. */
  isTv: boolean
  /** Guide v2: läget vyn ritas i (`now` | `tl` | `list`). */
  mode?: DesktopGuideMode
  /**
   * Guide v2: fokuserat program (heron följer, med fördröjning i skalet).
   * Skalet ger samma funktion som `onSelect`; namnet säger att det är
   * PROGRAMMET och inte bara kanalen som följs.
   */
  onFocusProgramme?(sel: GuideSelection): void
  /**
   * Guide v2: ◂ från vyns första kolumn. `true` = skalet tog fokus (till
   * kategorikolumnen) och vyn ska stoppa tangenten; `false` = låt appens
   * fokusmotor flytta som vanligt (chipslayouten har ingen kolumn).
   */
  onLeftEdge?(): boolean
  /** Guide v2: kanalen (`channelKey`) som ska få startfokus — hubbens favoriter. */
  focusChannelKey?: string | null
  /** Guide v2: Tablån flyttar sitt fönster (◂▸ förbi kanten). */
  onWindowStart?(ms: number): void
  /** Guide v2: kolumnhuvudets kategorinamn ("Alla kategorier", "Sport" …). */
  categoryLabel?: string
}
