'use client'

import type { M3uChannel } from './live-tv-data'
import type { EpgProgramme } from './epg/types'

export interface EpgRow {
  channel: M3uChannel
  programmes: EpgProgramme[]
}

/**
 * Väljer raderna till tablån.
 *
 * Två saker begränsar listan, och de förväxlades: kanaler UTAN tablå hoppas
 * över (en tom rad säger inget), och antalet rader har ett tak för att
 * uppslagningen kostar per kanal. En betatestare med 1 100 kanaler såg ~50
 * rader och läste det som ett tak — men de flesta kanalerna hade ingen
 * matchad tablå alls. Därför skiljer den här funktionen på "det finns fler att
 * visa" (`hasMore`) och "det är allt som har tablå", så gränssnittet kan säga
 * vilket av dem som gäller.
 *
 * Genomsökningen är avsiktligt lat: den slutar vid gränsen plus en kanal, den
 * enda extra som behövs för att veta om det finns mer. Att gå igenom hela
 * listan hade betytt en uppslagning per kanal vid varje minuttick.
 */
export function selectEpgRows(
  ordered: readonly M3uChannel[],
  scheduleFor: (channel: M3uChannel) => EpgProgramme[],
  group: string | null,
  limit: number,
): { rows: EpgRow[]; hasMore: boolean } {
  const rows: EpgRow[] = []
  for (const channel of ordered) {
    if (group && channel.group !== group) continue
    const programmes = scheduleFor(channel)
    if (programmes.length === 0) continue
    if (rows.length >= limit) return { rows, hasMore: true }
    rows.push({ channel, programmes })
  }
  return { rows, hasMore: false }
}
