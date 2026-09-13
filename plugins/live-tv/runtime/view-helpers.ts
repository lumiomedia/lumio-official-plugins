'use client'

/**
 * Kanaler för en LISTA, till vyer som inte ritar modellens aktiva uppsättning.
 *
 * Modellen (`useLiveTvModel`) laddar EN uppsättning: hela indexet, eller den
 * aktiva spellistans källa. Två vyer behöver något annat — spellisteguiden
 * (`tv/tv-guide-playlists.tsx`) ritar vilken lista som helst i vänsterkolumnen,
 * och startsideöverstyrningen (`live-tv-home-override.tsx`) bläddrar tvärs över
 * alla listor. Före lagring v2 läste båda listornas INBÄDDADE `channels`; efter
 * migreringen är det fältet tomt, så båda vyerna hade blivit tomma i skarp
 * drift (testerna seedade inbäddade kanaler och dolde det).
 *
 * Här är källan i stället indexet, per `list.source`, med samma
 * minnescachenycklar (`channels:<source>`) som modellen använder — en lista som
 * redan är laddad av modellen kostar ingen extra hämtning, och modellens
 * `refreshChannels()` (som rensar hela prefixet) invaliderar båda på en gång.
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
import { getPluginMemoryCache, setPluginMemoryCache } from '@/lib/plugin-sdk'
import {
  LIVE_TV_CHANNELS_PREFIX,
  LIVE_TV_PLUGIN_ID,
  channelKey,
  type LiveTvList,
  type M3uChannel,
} from './live-tv-data'
import { channelSupportsCatchUp } from './catch-up'
import { loadAllChannels, onIndexChanged, type IndexChannel } from './index-client'

export function channelsCacheKey(source: string | null): string {
  return `${LIVE_TV_CHANNELS_PREFIX}${source ?? 'all'}`
}

/** Delad in-flight-begäran: tre vyer som frågar om samma källa ger ETT anrop. */
const inFlight = new Map<string, Promise<IndexChannel[]>>()

export function getCachedChannelsForSource(source: string | null): IndexChannel[] | null {
  return getPluginMemoryCache<IndexChannel[]>(LIVE_TV_PLUGIN_ID, channelsCacheKey(source)) ?? null
}

/**
 * Kanaler för en källa ur minnescachen, annars ur indexet.
 *
 * `force` hoppar över cachen (men skriver till den): används när indexet
 * ändrats under vyns livstid, där en cache-läsning skulle ge kanalerna som
 * importen just ersatte.
 */
export function loadChannelsForSource(source: string | null, force = false): Promise<IndexChannel[]> {
  const cacheKey = channelsCacheKey(source)
  if (!force) {
    const cached = getPluginMemoryCache<IndexChannel[]>(LIVE_TV_PLUGIN_ID, cacheKey)
    if (cached) return Promise.resolve(cached)
  }
  const pending = inFlight.get(cacheKey)
  if (pending) return pending
  const started = loadAllChannels(source)
    .then((items) => {
      setPluginMemoryCache(LIVE_TV_PLUGIN_ID, cacheKey, items)
      return items
    })
    .finally(() => {
      inFlight.delete(cacheKey)
    })
  inFlight.set(cacheKey, started)
  return started
}

/** Bara för tester: nollar den delade in-flight-kartan mellan fall. */
export function __resetViewHelpersForTests(): void {
  inFlight.clear()
}

export interface SourceChannelsResult {
  bySource: Record<string, IndexChannel[]>
  loading: boolean
}

const EMPTY_BY_SOURCE: Record<string, IndexChannel[]> = {}

/**
 * Kanaler för en uppsättning källor. Cachade källor syns SYNKRONT vid första
 * rendret (ingen blink när en annan vy redan laddat dem); resten fylls på
 * efterhand, en källa i taget, så en stor panel inte blockerar de andra.
 */
export function useChannelsBySource(sources: readonly (string | null | undefined)[]): SourceChannelsResult {
  const wanted = useMemo(
    () => [...new Set(sources.filter((source): source is string => Boolean(source)))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sources.filter(Boolean).join('|')],
  )
  const wantedId = wanted.join('|')
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<SourceChannelsResult>(() => ({ bySource: EMPTY_BY_SOURCE, loading: false }))

  useEffect(() => onIndexChanged(() => setReloadToken((token) => token + 1)), [])

  useEffect(() => {
    if (wanted.length === 0) {
      setState({ bySource: EMPTY_BY_SOURCE, loading: false })
      return
    }
    let live = true
    const force = reloadToken > 0
    const seeded: Record<string, IndexChannel[]> = {}
    if (!force) {
      for (const source of wanted) {
        const cached = getCachedChannelsForSource(source)
        if (cached) seeded[source] = cached
      }
    }
    const missing = wanted.filter((source) => !seeded[source])
    setState({ bySource: seeded, loading: missing.length > 0 })
    if (missing.length === 0) return

    void (async () => {
      const next = { ...seeded }
      for (const source of missing) {
        const items = await loadChannelsForSource(source, force).catch(() => [] as IndexChannel[])
        if (!live) return
        next[source] = items
        // Varje källa ritas så fort den landat i stället för att hela
        // uppsättningen väntar in den långsammaste.
        setState({ bySource: { ...next }, loading: false })
      }
    })().catch(() => {})

    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedId, reloadToken])

  return state
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
