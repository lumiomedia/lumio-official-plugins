import type { M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'

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
}
