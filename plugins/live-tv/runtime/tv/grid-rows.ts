'use client'

import { useMemo } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import { selectEpgRows, type EpgRow } from '../epg-rows'
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
  /** Fler kanaler MED tablå finns bortom `visibleRows` — visa "Visa fler". */
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
  const { rows, hasMore: moreAmongCandidates } = useMemo(
    () => selectEpgRows(candidates, (channel) => schedules[channelKey(channel)] ?? [], null, visibleRows),
    [candidates, schedules, visibleRows],
  )
  /**
   * "Visa fler" måste finnas kvar även när KANDIDATERNA tog slut men
   * spellistan inte gjorde det: `selectEpgRows` vet bara om det urval den
   * fick, och skulle annars påstå "alla kanaler med tablå visas" fast
   * överskottsfönstret kapade listan långt före spellistans slut.
   */
  const hasMore = moreAmongCandidates || candidates.length < eligible.length
  return { rows, hasMore, schedulesLoading }
}
