'use client'

import { useMemo } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { EpgRow } from '../epg-rows'
import { useSchedules } from '../hooks/useSchedules'
import { FAVS_GROUP } from './tv-guide-shared'

/**
 * Egen modul av samma skäl som `hub-data.ts` (Task 4): hade hooken bott i
 * `tv-guide-grid.tsx` hade telefongrenen importerat rutnätet som importerar
 * telefongrenen — en importcykel, och pluginbunten har redan kraschat en gång
 * på en sådan (TDZ vid appstart). Här finns inga toppnivåberoenden åt något
 * håll: rutnätet och telefonen importerar hit, aldrig varandra.
 */

/**
 * Hur många kanaler som frågas efter per synlig rad. Tablån bor i appen sedan
 * lagring v2, så raderna kostar ett fönsteranrop och inte en cachesökning:
 * hela spellistan (17 000 nycklar) hade blivit 85 anrop för 80 rader.
 * Överskottet finns för att kanaler UTAN tablå faller bort i `selectEpgRows`.
 */
const CANDIDATE_FACTOR = 3

export interface GridRows {
  rows: EpgRow[]
  /**
   * Kandidater UTAN tablå i fönstret (handoffen "Tomma rader kollapsar") —
   * sorteras EFTER `rows`, i samma ordning de hade bland kandidaterna.
   */
  withoutEpg: M3uChannel[]
  /** Fler kanaler (MED eller UTAN tablå) finns bortom `visibleRows` — visa "Visa fler". */
  hasMore: boolean
  /** Fönstrets tablåer hämtas fortfarande (delvis eller helt). */
  schedulesLoading: boolean
}

/**
 * Tablåns radpipeline, delad av skrivbordets rutnät (`tv-guide-grid.tsx`)
 * och telefonens tablå (`mobile/guide-grid-phone.tsx`): favoriter först, kategorifilter, kandidatfönster, tablåhämtning för
 * `[windowStart, windowEnd)` och `selectEpgRows`. Ren funktion av sina
 * argument — fönstret räknas av anroparen, så skrivbordets Idag/Imorgon och
 * telefonens 30-min-före-nu-fönster går genom exakt samma väg.
 */
export function useGridRows(model: LiveTvModel, group: string | null, visibleRows: number, windowStart: number, windowEnd: number): GridRows {
  // Favoriter först, sedan övriga kanaler — kanaler utan tablå faller bort i
  // `selectEpgRows`, en tom rad säger inget.
  const ordered = useMemo(
    () => [
      ...model.pinnedKeys.map((key) => model.byKey.get(key)).filter((channel): channel is M3uChannel => Boolean(channel)),
      ...model.channels.filter((channel) => !model.pinnedSet.has(channelKey(channel))),
    ],
    [model.pinnedKeys, model.byKey, model.channels, model.pinnedSet],
  )
  /**
   * Kategorin filtreras HÄR och inte i `selectEpgRows`.
   *
   * TV-chipsen har två poster som inte är gruppnamn ("Alla" och "Favoriter"),
   * och `selectEpgRows` jämför rakt mot `channel.group` — `__favs` hade
   * filtrerat bort varenda kanal. Urvalet görs alltså före, och funktionen får
   * `null` som grupp.
   */
  const eligible = useMemo(() => {
    if (group === FAVS_GROUP) return model.favouriteChannels
    if (group) return ordered.filter((channel) => channel.group === group)
    return ordered
  }, [ordered, group, model.favouriteChannels])
  const candidates = useMemo(() => eligible.slice(0, visibleRows * CANDIDATE_FACTOR), [eligible, visibleRows])
  const { schedules, loading: schedulesLoading } = useSchedules(candidates, windowStart, windowEnd)
  /**
   * Kandidaterna delas i två köer, i sin ursprungliga ordning: `withEpg`
   * (blir `rows`) och `missing` (blir `withoutEpg`, "Tomma rader kollapsar").
   * `rows` fylls först; det som blir kvar av `visibleRows` går till
   * `withoutEpg` — kanaler utan tablå sorteras alltså alltid sist, aldrig
   * inblandade bland raderna med riktigt innehåll.
   *
   * "Visa fler" (`hasMore`) måste räkna BÅDA köerna: dels om `withEpg`
   * eller `missing` inte fick plats inom `visibleRows`, dels om
   * KANDIDATERNA tog slut innan spellistan gjorde det — annars påstår vyn
   * "allt visas" fast överskottsfönstret kapade listan i förtid.
   */
  const { rows, withoutEpg, hasMore } = useMemo(() => {
    const scheduleFor = (channel: M3uChannel) => schedules[channelKey(channel)] ?? []
    const withEpg: EpgRow[] = []
    const missing: M3uChannel[] = []
    for (const channel of candidates) {
      const programmes = scheduleFor(channel)
      if (programmes.length === 0) missing.push(channel)
      else withEpg.push({ channel, programmes })
    }
    const rows = withEpg.slice(0, visibleRows)
    const withoutEpg = missing.slice(0, Math.max(0, visibleRows - rows.length))
    const moreAmongCandidates = withEpg.length > rows.length || missing.length > withoutEpg.length
    const hasMore = moreAmongCandidates || candidates.length < eligible.length
    return { rows, withoutEpg, hasMore }
  }, [candidates, schedules, visibleRows, eligible.length])
  return { rows, withoutEpg, hasMore, schedulesLoading }
}
