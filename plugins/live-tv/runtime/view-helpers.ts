'use client'

/**
 * Kanaler för en LISTA, till vyer som inte ritar modellens aktiva uppsättning.
 *
 * Modellen (`useLiveTvModel`) laddar EN uppsättning: hela indexet, eller den
 * aktiva spellistans källa. Några vyer behöver något annat — spellisteguiden
 * (`tv/tv-guide-playlists.tsx`) ritar vilken lista som helst, skrivbordsguiden
 * och rutnätet ritar flera listor sida vid sida, och startsideöverstyrningen
 * bläddrar tvärs över dem. Före lagring v2 läste de listornas INBÄDDADE
 * `channels`; efter migreringen är det fältet tomt, så de hade blivit tomma i
 * skarp drift (testerna seedade inbäddade kanaler och dolde det).
 *
 * HÄMTNINGEN ÄGS AV MODELLEN. Den här modulen har ingen egen in-flight-karta,
 * ingen egen cache och ingen egen lyssnare på indexhändelsen — allt går genom
 * `loadChannelsShared`/`getCachedChannels`/`subscribeChannelGeneration` i
 * `live-tv-model.ts`. En egen laddare betydde fyra fel på en gång: två
 * parallella hämtningar av 17 000 kanaler (modell + vy), en vy som hann fråga
 * FÖRE migreringen och cachade `[]` som modellen sedan läste som sanning, en
 * hämtning som `invalidateChannels()` inte kunde avbryta, och en `force` som
 * hoppade över cachen men återanvände den gamla promisen — och därför skrev
 * tillbaka för-import-kanalerna i cachen efter en import.
 *
 * Manuellt skapade listor (`kind: 'custom'`) har ingen källa i indexet: deras
 * kanaler läggs dit en och en av `addChannelToLiveTvList`, och bor kvar
 * inbäddade även efter v2.
 *
 * `listFor(channel)` i modellen kan inte mappa kanal → lista exakt efter v2.
 * Vyerna här behöver inte gissa: de VET vilken källa de laddade kanalen från,
 * så kopplingen kommer ur uppslaget i stället för ur en heuristik.
 */

import { useEffect, useMemo, useState } from 'react'
import { channelKey, type LiveTvList, type M3uChannel } from './live-tv-data'
import { channelSupportsCatchUp } from './catch-up'
import { queryChannels, type IndexChannel } from './index-client'
import {
  channelsCacheKey,
  ensureLiveTvBootstrap,
  getCachedChannels,
  loadChannelsShared,
  subscribeChannelGeneration,
} from './live-tv-model'

export { channelsCacheKey, getCachedChannels }

/**
 * Räknare som stegas när indexet bytt innehåll.
 *
 * Effekterna nedan har den i sin beroendelista i stället för ett eget
 * `force`-flagga-läge. Skillnaden är inte kosmetisk: ett `force` som en gång
 * blivit sant blev KLIBBIGT — varje listbyte därefter gick förbi den varma
 * cachen och hämtade om allt. Generationen är i stället ett tillstånd som
 * gäller lika för alla: efter `invalidateChannels()` är cachen redan tom, så
 * en vanlig cacheläsning ger rätt svar utan någon förbikoppling alls.
 */
function useChannelGeneration(): number {
  const [generation, setGeneration] = useState(0)
  useEffect(() => subscribeChannelGeneration(() => setGeneration((value) => value + 1)), [])
  return generation
}

export interface SourceChannelsResult {
  bySource: Record<string, IndexChannel[]>
  /** Sant tills ALLA efterfrågade källor svarat — inte bara den första. */
  loading: boolean
  /** Senaste hämtningsfelet, för vyer som vill visa något annat än tomt. */
  error: string | null
}

const EMPTY_BY_SOURCE: Record<string, IndexChannel[]> = {}

/**
 * Hela kanaluppsättningen för en uppsättning källor.
 *
 * Cachade källor syns SYNKRONT i första rendret (ingen blink när modellen
 * redan laddat dem); resten ritas en källa i taget medan de landar, men
 * `loading` står kvar tills den sista är inne.
 *
 * Använd bara där vyn verkligen behöver ALLA kanaler (rutnätets union, en
 * enskild vald lista). Behöver vyn en handfull rader — skrivbordsguiden,
 * hjältekortet — är `useChannelsPage` rätt: den hämtar en sida i taget.
 */
export function useChannelsBySource(sources: readonly (string | null | undefined)[]): SourceChannelsResult {
  const wantedId = sources.filter(Boolean).join('|')
  const wanted = useMemo(
    () => [...new Set(sources.filter((source): source is string => Boolean(source)))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wantedId],
  )
  const generation = useChannelGeneration()
  const [state, setState] = useState<SourceChannelsResult>(() => ({ bySource: EMPTY_BY_SOURCE, loading: false, error: null }))

  useEffect(() => {
    if (wanted.length === 0) {
      setState({ bySource: EMPTY_BY_SOURCE, loading: false, error: null })
      return
    }
    let live = true
    const seeded: Record<string, IndexChannel[]> = {}
    for (const source of wanted) {
      const cached = getCachedChannels(source)
      if (cached) seeded[source] = cached
    }
    const missing = wanted.filter((source) => !seeded[source])
    setState({ bySource: seeded, loading: missing.length > 0, error: null })
    if (missing.length === 0) return

    void (async () => {
      const next = { ...seeded }
      let failure: string | null = null
      let done = 0
      for (const source of missing) {
        try {
          next[source] = await loadChannelsShared(source)
        } catch (err) {
          // Avbruten laddning (indexändring, spellistbyte) är inget fel att
          // visa: generationen har redan schemalagt en ny runda.
          if (!live) return
          if (isAbort(err)) return
          next[source] = []
          failure = err instanceof Error ? err.message : String(err)
        }
        if (!live) return
        done += 1
        // Varje källa ritas så fort den landat i stället för att hela
        // uppsättningen väntar in den långsammaste — men `loading` släpps
        // först när alla är inne.
        setState({ bySource: { ...next }, loading: done < missing.length, error: failure })
      }
    })().catch(() => {})

    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedId, generation])

  return state
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

export interface ListChannelsResult {
  /** Kanaler per listid, i listornas ordning. */
  byListId: Record<string, M3uChannel[]>
  loading: boolean
}

/**
 * Kanaler per LISTA: `custom` ur listans inbäddade kanaler, m3u/xtream ur
 * indexet. Kopplingen kanal → lista är exakt, eftersom varje kanal kommer ur
 * det uppslag som gjordes med listans egen `source`.
 */
export function useListChannels(lists: readonly LiveTvList[]): ListChannelsResult {
  const sources = useMemo(
    () => lists.filter((list) => list.kind !== 'custom').map((list) => list.source),
    [lists],
  )
  const { bySource, loading } = useChannelsBySource(sources)
  const byListId = useMemo(() => {
    const out: Record<string, M3uChannel[]> = {}
    for (const list of lists) {
      out[list.id] = list.kind === 'custom'
        ? list.channels ?? []
        : (list.source ? bySource[list.source] ?? [] : [])
    }
    return out
  }, [lists, bySource])
  return { byListId, loading }
}

export interface ChannelPageResult {
  /** De `limit` första kanalerna per listid. */
  byListId: Record<string, IndexChannel[]>
  /** Hela antalet i indexet per listid — `limit` säger inget om hur mycket som finns. */
  totalByListId: Record<string, number>
  loading: boolean
}

/**
 * En SIDA kanaler per lista, inte hela utbudet.
 *
 * Skrivbordsguiden visar ett par dussin rader och hjältekortet ett enda kort.
 * Att ladda varje listas fulla innehåll för det — en 17 000-kanalspanel per
 * lista, i minnet, vid varje montering — är den dyraste sak en vy kan göra i
 * pluginet. `queryChannels` hämtar i stället precis så många som ritas, och
 * `total` ur samma svar säger hur mycket som finns kvar bakom.
 *
 * `custom`-listor har inget i indexet och svarar med sina inbäddade kanaler.
 */
export function useChannelsPage(
  lists: readonly LiveTvList[],
  limit: number,
  offset = 0,
): ChannelPageResult {
  const generation = useChannelGeneration()
  const listsId = lists.map((list) => `${list.id}:${list.kind ?? ''}:${list.source ?? ''}`).join('|')
  const [state, setState] = useState<ChannelPageResult>(() => ({ byListId: {}, totalByListId: {}, loading: false }))

  useEffect(() => {
    const indexed = lists.filter((list) => list.kind !== 'custom' && list.source)
    const embedded: Record<string, IndexChannel[]> = {}
    const totals: Record<string, number> = {}
    for (const list of lists) {
      if (list.kind !== 'custom') continue
      const channels = (list.channels ?? []) as IndexChannel[]
      embedded[list.id] = channels.slice(offset, offset + limit)
      totals[list.id] = channels.length
    }
    if (indexed.length === 0) {
      setState({ byListId: embedded, totalByListId: totals, loading: false })
      return
    }

    let live = true
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    setState((prev) => ({ ...prev, loading: true }))

    void (async () => {
      const byListId: Record<string, IndexChannel[]> = { ...embedded }
      const totalByListId: Record<string, number> = { ...totals }
      for (const list of indexed) {
        try {
          // Hela källan ligger ofta redan varm (modellen laddade den): då är
          // sidan en skivning, inte ett anrop.
          const cached = getCachedChannels(list.source as string)
          if (cached) {
            byListId[list.id] = cached.slice(offset, offset + limit)
            totalByListId[list.id] = cached.length
          } else {
            await ensureLiveTvBootstrap()
            if (!live) return
            const page = await queryChannels({
              source: list.source as string,
              offset,
              limit,
              signal: controller?.signal,
            })
            byListId[list.id] = page.items
            totalByListId[list.id] = page.total
          }
        } catch (err) {
          if (!live || isAbort(err)) return
          byListId[list.id] = []
          totalByListId[list.id] = 0
        }
        if (!live) return
        setState({ byListId: { ...byListId }, totalByListId: { ...totalByListId }, loading: false })
      }
    })().catch(() => {})

    return () => {
      live = false
      controller?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listsId, limit, offset, generation])

  return state
}

/**
 * Hur många kanaler repris-raderna frågar efter tablå för.
 *
 * Hubbarna bad tidigare om 200 arkivkanaler × 3 dygn vid VARJE montering —
 * ett svep som bara skulle fylla ett åttakorts band, och som på en panel med
 * arkiv på allt blev det dyraste anropet i hela vyn. Urvalet är i stället det
 * planen anger: favoriter och nyss sedda kanaler (spec-planens
 * `useSchedules(favourites + recent, now−3d, now)`). Har man inget arkiv bland
 * dem visas ingen reprisrad — det är ärligare än att söka igenom hela utbudet
 * efter något att visa.
 */
export const MAX_REPLAY_CHANNELS = 40

export function pickReplayChannels(
  favourites: readonly M3uChannel[],
  recent: readonly M3uChannel[],
  limit = MAX_REPLAY_CHANNELS,
): M3uChannel[] {
  const out: M3uChannel[] = []
  const seen = new Set<string>()
  for (const channel of [...favourites, ...recent]) {
    if (!channelSupportsCatchUp(channel)) continue
    const key = channelKey(channel)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(channel)
    if (out.length >= limit) break
  }
  return out
}
