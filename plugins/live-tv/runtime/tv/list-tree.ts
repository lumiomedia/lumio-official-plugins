'use client'

import { useMemo } from 'react'
import { computeGroups, type LiveTvList, type M3uChannel } from '../live-tv-data'
import { isPlayableChannel, type LiveTvModel } from '../live-tv-model'
import { useListChannels } from '../view-helpers'
import { curatedGroupCounts } from '../list-curation'
import { FAVS_GROUP } from './tv-guide-shared'

/**
 * Egen modul av samma skäl som `hub-data.ts` och `grid-rows.ts`: hade
 * trädet bott i `tv-guide-playlists.tsx` hade telefongrenen importerat
 * spellistvyn som importerar telefongrenen — en importcykel, och
 * pluginbunten har redan kraschat en gång på en sådan (TDZ vid appstart).
 * Skrivbordet och telefonen importerar hit, aldrig varandra.
 */

export interface ListTreeGroup { name: string; count: number }

export interface ListTreeEntry {
  id: string
  name: string
  /** Antal kanaler i listan (ur kvittot, eller räknat för manuella listor). */
  count: number
  groups: ListTreeGroup[]
  /**
   * Kanalerna finns hos listan själv (manuellt skapad, eller inbäddade från
   * före lagring v2). Bara då är gruppantalen räknade ur faktiska kanaler —
   * annars är de kvittots och listans kanaler laddas först vid val.
   */
  channelsLoaded: boolean
}

/** Vald lista + grupp; `listId === FAVS_GROUP` betyder favoriterna. */
export interface ListSelection { listId: string | null; group: string | null }

/**
 * Listträdet ritas ur listornas METADATA, inte ur deras kanaler.
 *
 * Efter lagring v2 bär listorna inga inbäddade kanaler — `flattenChannels`
 * gav tomma listor i skarp drift. Antal och grupper står numera i listans
 * kvitto (`channelCount`/`groups`, skrivna av importjobbet), så hela trädet
 * kan ritas utan att en enda kanal laddas. Manuellt skapade listor
 * (`custom`) har fortfarande sina kanaler hos sig och räknas direkt.
 *
 * `maxGroups` kapar grupperna per lista (skrivbordets vänsterkolumn visar
 * 12); utan tak får anroparen alla — telefonen visar 6 och expanderar.
 */
export function useListTree(model: LiveTvModel, maxGroups?: number): ListTreeEntry[] {
  return useMemo(() => model.lists.map((list) => {
    const embedded = list.channels ?? []
    const custom = list.kind === 'custom'
    // Kvittot är okuraterat — dolda grupper bort, ihopslagna som en post, så
    // Spellistor-läget följer samma regler som rutnätet (spec beslut 2).
    const groups = custom ? computeGroups(embedded) : curatedGroupCounts(list.groups ?? [], list.curation)
    return {
      id: list.id,
      name: list.name,
      count: custom ? embedded.length : list.channelCount ?? embedded.length,
      groups: maxGroups === undefined ? groups : groups.slice(0, maxGroups),
      channelsLoaded: custom || embedded.length > 0,
    }
  }), [model.lists, maxGroups])
}

export interface ListRows {
  rows: M3uChannel[]
  /** Den valda listans kanaler hämtas fortfarande ur indexet. */
  channelsLoading: boolean
}

/**
 * Kanalraderna för ett val, delade av skrivbordets mittenkolumn och
 * telefonens nivå 2. Kanalerna laddas bara för den VALDA listan (ur indexet,
 * eller ur minnescachen när modellen redan har källan laddad). Att ladda
 * alla listor på en gång hade betytt en hämtning per lista vid varje
 * montering, för rader som ändå bara syns en lista i taget.
 */
export function useListRows(model: LiveTvModel, sel: ListSelection): ListRows {
  const selectedLists = useMemo<LiveTvList[]>(() => {
    const list = model.lists.find((entry) => entry.id === sel.listId)
    return list ? [list] : []
  }, [model.lists, sel.listId])
  const { byListId, loading: channelsLoading } = useListChannels(selectedLists)
  const rows = useMemo(() => {
    if (sel.listId === FAVS_GROUP) return model.favouriteChannels
    if (!sel.listId) return []
    const channels = (byListId[sel.listId] ?? []).filter(isPlayableChannel)
    return sel.group ? channels.filter((c) => c.group === sel.group) : channels
  }, [sel, byListId, model.favouriteChannels])
  return { rows, channelsLoading }
}
