'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  clearPluginMemoryCacheByPrefix,
  getPluginMemoryCache,
  setPluginMemoryCache,
  useTvMode,
} from '@/lib/plugin-sdk'
import type { NowNextLater } from './epg/types'
import { fetchNowSnapshot, getCachedNowSnapshot, type NowSnapshot } from './epg/now-snapshot'
import {
  loadAllChannels,
  onIndexChanged,
  refreshEpg,
  waitForJob,
  type IndexChannel,
} from './index-client'
import { clearResolvedChannels, getResolvedChannels, resolveChannelKeys } from './channel-resolver'
import { migrateStorageV2 } from './storage-v2-migration'
import { getChannelHistory, onChannelHistoryChanged, type ChannelHistoryEntry } from './channel-history'
import { useReminders, type Reminder } from './reminders'
import { useLockedChannelKeys } from './channel-locks'
import {
  LIVE_TV_CHANNELS_PREFIX,
  LIVE_TV_GLOBAL_EPG_ID,
  LIVE_TV_PLUGIN_ID,
  channelKey,
  getAllLiveTvEpgUrls,
  getLiveTvLists,
  getPinnedLiveTvKeys,
  importMissingSources,
  onLiveTvListsChanged,
  onPinnedLiveTvKeysChanged,
  togglePinnedLiveTvChannel,
  type LiveTvList,
  type M3uChannel,
} from './live-tv-data'
import { getActivePlaylistId, onActivePlaylistChanged, setActivePlaylistId } from './tv/tv-settings-store'

/**
 * Delad datamodell för Live TV-sidorna (lagring v2, spec 4.2).
 *
 * KANALERNA bor i appens index på disk och laddas hit i 5 000-sidor till en
 * minnescache — aldrig till pluginlagringen. TABLÅN bor också i appen:
 * `nowFor` läser ett minnessnapshot från `/epg/now` (uppdaterat varje minut),
 * och hela fönster hämtas av `useSchedules`/`useProgrammeSearch` i stället för
 * den gamla `scheduleFor` som räknade på en EPG-cache i webviewn.
 *
 * Kvar i pluginlagringen: listmetadata, favoriter, historik, påminnelser, lås.
 */

const EMPTY: NowNextLater = { now: null, next: null, later: null }
const PLACEHOLDER_NAME_RE = /^[\s=\-_*•·]+|=+/
export const MAX_GROUP_CHIPS = 8
/** Samma fönster som appen håller sin EPG-fil färsk i (spec 3.3). */
const EPG_TTL_MS = 6 * 60 * 60 * 1000

export function isPlayableChannel(channel: M3uChannel): boolean {
  if (!channel.url) return false
  const trimmedName = channel.name.trim()
  if (!trimmedName) return false
  if (PLACEHOLDER_NAME_RE.test(trimmedName) && !channel.tvgId) return false
  return true
}

/**
 * Kanaler ur listornas INBÄDDADE `channels` — bara den gamla lagringen och de
 * manuellt skapade listorna (`kind: 'custom'`) har sådana kvar efter v2.
 * Modellen använder den INTE längre; den finns för vyer som fortfarande läser
 * en enskild lista (spellisteguiden) tills de går via indexet.
 */
export function flattenChannels(lists: LiveTvList[]): M3uChannel[] {
  const seen = new Set<string>()
  const out: M3uChannel[] = []
  for (const list of lists) {
    for (const channel of list.channels ?? []) {
      if (!isPlayableChannel(channel)) continue
      const key = channelKey(channel)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(channel)
    }
  }
  return out
}

export function topGroups(channels: readonly M3uChannel[], limit = MAX_GROUP_CHIPS): string[] {
  const counts = new Map<string, number>()
  for (const channel of channels) {
    const group = channel.group?.trim()
    if (!group) continue
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([group]) => group)
}

export interface LiveTvModel {
  lists: LiveTvList[]
  /** Alla laddade kanaler (aktiv källa när en spellista är vald, annars hela indexet). */
  allChannels: M3uChannel[]
  channels: M3uChannel[]
  byKey: Map<string, M3uChannel>
  byUrl: Map<string, M3uChannel>
  groups: string[]
  pinnedKeys: string[]
  pinnedSet: Set<string>
  togglePin: (channel: M3uChannel) => void
  playlists: { id: string; name: string; count: number }[]
  activePlaylistId: string | null
  activePlaylistName: string | null
  setActivePlaylist: (id: string | null) => void
  /** Kanalens nummer ur indexet (aktiv källa), annars dess plats i den laddade listan. */
  channelNumber: (channel: M3uChannel) => number | null
  /** Favoriter i sparad ordning; nycklar utanför den laddade listan slås upp mot indexet. */
  favouriteChannels: M3uChannel[]
  history: ChannelHistoryEntry[]
  nowMs: number
  epgListId: string | null
  epgUrls: string[]
  hasEpg: boolean
  /** Sant tills den första sidhämtningen ur indexet är klar. */
  channelsLoading: boolean
  /** Sant medan nu-snapshotet (eller appens EPG-hämtning) är på väg. */
  epgLoading: boolean
  /** När appen senast HÄMTADE EPG:t från källorna; null = aldrig. */
  epgFetchedAt: number | null
  /** Slår upp kanaler på nyckel mot indexet (favoriter, historik, sökträffar). */
  resolveKeys: (keys: string[]) => Promise<M3uChannel[]>
  /** Tvinga en ny sidhämtning ur indexet (efter import, eller manuell uppdatering). */
  refreshChannels: () => void
  nowFor: (channel: M3uChannel) => NowNextLater
  reminders: Reminder[]
  locked: Set<string>
  listFor: (channel: M3uChannel) => LiveTvList | null
}

/**
 * Migrering + mottagarsidan av enhetsöverföringen körs EN gång per sidladdning,
 * inte en gång per modell: hubben, TV-skalet och startsideöverstyrningen kan
 * alla ha en modell monterad samtidigt, och migreringen skriver om lagringen.
 */
let bootstrapPromise: Promise<void> | null = null

/**
 * Migreringen + mottagarsidan, för ANDRA laddare än modellens egen.
 *
 * Vyer som frågar indexet sidvis (`queryChannels`) måste gå genom samma grind:
 * en fråga före migreringen svarar tomt, och den tomheten cachas som sanning.
 */
export function ensureLiveTvBootstrap(): Promise<void> {
  return ensureBootstrap()
}

function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await migrateStorageV2().catch(() => {})
      await importMissingSources().catch(() => {})
    })()
  }
  return bootstrapPromise
}

/**
 * EPG-omhämtningen (`/epg/refresh`) begärs en gång per lista och sidladdning.
 * Rust avgör själv om den faktiskt hämtar (TTL 6 h), men jobbet ska inte
 * startas om av varje monterad modell.
 */
const epgRefreshRequested = new Set<string>()

/** Minnescachens nyckel för en källa. Delas med vy-lokala laddare (`view-helpers.ts`). */
export function channelsCacheKey(source: string | null): string {
  return `${LIVE_TV_CHANNELS_PREFIX}${source ?? 'all'}`
}

/** Kanalerna för en källa om de redan ligger varma i minnescachen. */
export function getCachedChannels(source: string | null): IndexChannel[] | null {
  return getPluginMemoryCache<IndexChannel[]>(LIVE_TV_PLUGIN_ID, channelsCacheKey(source)) ?? null
}

/*
 * ---------------------------------------------------------------------------
 * EN hämtning per källa, delad av alla monterade modeller.
 *
 * Hubben, TV-skalet och startsideöverstyrningen kan ha var sin modell igång.
 * Tidigare lyssnade de var för sig på `INDEX_CHANGED_EVENT` och körde var sin
 * `clearPluginMemoryCacheByPrefix` + omladdning: tre parallella hämtningar av
 * 17 000 kanaler, där var och en TÖMDE cachen de andra just fyllt, så en
 * hämtning kunde skriva sitt resultat och genast få det bortrensat av nästa
 * modells rensning.
 *
 * Nu finns EN modul-global laddare: en promise per källa som alla väntar på,
 * och EN lyssnare på indexhändelsen som rensar, räknar upp generationen och
 * väcker modellerna.
 */
const channelLoads = new Map<string, Promise<IndexChannel[]>>()
const channelAborts = new Map<string, AbortController>()
const generationListeners = new Set<() => void>()
let indexSubscription: (() => void) | null = null

function ensureIndexSubscription(): void {
  if (indexSubscription || typeof window === 'undefined') return
  indexSubscription = onIndexChanged(() => {
    invalidateChannels()
    for (const listener of [...generationListeners]) listener()
  })
}

/** Kastar allt som härletts ur indexet: sidcachen, pågående hämtningar, nyckeluppslagen. */
export function invalidateChannels(): void {
  for (const controller of channelAborts.values()) controller.abort()
  channelAborts.clear()
  channelLoads.clear()
  clearPluginMemoryCacheByPrefix(LIVE_TV_PLUGIN_ID, LIVE_TV_CHANNELS_PREFIX)
  clearResolvedChannels()
}

/**
 * Kanalerna för en källa. Returnerar minnescachen direkt när den är varm,
 * annars den pågående hämtningen (eller startar den).
 */
export function loadChannelsShared(source: string | null): Promise<IndexChannel[]> {
  const cacheKey = channelsCacheKey(source)
  const cached = getPluginMemoryCache<IndexChannel[]>(LIVE_TV_PLUGIN_ID, cacheKey)
  if (cached) return Promise.resolve(cached)

  const existing = channelLoads.get(cacheKey)
  if (existing) return existing

  const controller = typeof AbortController === 'function' ? new AbortController() : null
  if (controller) channelAborts.set(cacheKey, controller)
  const request = (async () => {
    await ensureBootstrap()
    const items = await loadAllChannels(source, undefined, controller?.signal)
    setPluginMemoryCache(LIVE_TV_PLUGIN_ID, cacheKey, items)
    return items
  })()
    .finally(() => {
      if (channelLoads.get(cacheKey) === request) channelLoads.delete(cacheKey)
      if (channelAborts.get(cacheKey) === controller) channelAborts.delete(cacheKey)
    })
  channelLoads.set(cacheKey, request)
  return request
}

/**
 * Väcks när indexet bytt innehåll och `invalidateChannels()` redan kört.
 *
 * Vyer med egna laddare (spellisteguiden, skrivbordsguiden, rutnätet) ska INTE
 * lyssna på `INDEX_CHANGED_EVENT` själva: då kunde de läsa om innan
 * invalideringen hunnit rensa, och få tillbaka kanalerna importen just ersatt.
 * Den här prenumerationen ligger efter rensningen, i samma ordning som
 * modellernas egen.
 */
export function subscribeChannelGeneration(listener: () => void): () => void {
  ensureIndexSubscription()
  generationListeners.add(listener)
  return () => {
    generationListeners.delete(listener)
  }
}

export function __resetLiveTvModelForTests(): void {
  bootstrapPromise = null
  epgRefreshRequested.clear()
  for (const controller of channelAborts.values()) controller.abort()
  channelAborts.clear()
  channelLoads.clear()
  indexSubscription?.()
  indexSubscription = null
  generationListeners.clear()
}

export function useLiveTvModel(tickMs = 60_000): LiveTvModel {
  const [lists, setLists] = useState<LiveTvList[]>(() => getLiveTvLists())
  const [activePlaylistId, setActivePlaylistIdState] = useState<string | null>(() => getActivePlaylistId())
  useEffect(() => onActivePlaylistChanged(() => setActivePlaylistIdState(getActivePlaylistId())), [])
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(() => getPinnedLiveTvKeys())
  const [history, setHistory] = useState<ChannelHistoryEntry[]>(() => getChannelHistory())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const reminders = useReminders()
  const locked = useLockedChannelKeys()

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])
  useEffect(() => onPinnedLiveTvKeysChanged(() => setPinnedKeys(getPinnedLiveTvKeys())), [])
  useEffect(() => onChannelHistoryChanged(() => setHistory(getChannelHistory())), [])

  /**
   * Den aktiva spellistan är ett TV-BEGREPP.
   *
   * Filtret sätts bara från TV-hubbens spellistmeny, men modellen är delad med
   * skrivbordet och mobilen — de har ingen ratt som visar eller ändrar det. Ett
   * val som blev kvar i lagringen (någon provade TV-läget, eller läget byttes
   * på samma enhet) klippte därför skrivbordets kanallista till en enda
   * spellista UTAN att något i gränssnittet förklarade varför, och utan någon
   * väg tillbaka. Utanför TV-läget gäller alltid alla listor.
   *
   * Hooken kallas ovillkorligt (hooks-reglerna) — det är bara dess RESULTAT
   * som grindar filtret.
   */
  const tvMode = useTvMode()
  // Vald spellista som inte längre finns → tillbaka till alla.
  const activeList = useMemo(
    () => (tvMode ? lists.find((list) => list.id === activePlaylistId) ?? null : null),
    [tvMode, lists, activePlaylistId],
  )
  const activeSource = activeList?.source ?? null

  // ---- Kanaler ur indexet -------------------------------------------------

  const [loaded, setLoaded] = useState<IndexChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  /** Kanaler utanför den laddade uppsättningen (favoriter/historik i andra källor). */
  const [extras, setExtras] = useState<Record<string, IndexChannel>>({})

  useEffect(() => {
    let live = true
    const cached = getPluginMemoryCache<IndexChannel[]>(LIVE_TV_PLUGIN_ID, channelsCacheKey(activeSource))
    if (cached) {
      setLoaded(cached)
      setChannelsLoading(false)
    } else {
      setChannelsLoading(true)
    }
    loadChannelsShared(activeSource)
      .then((items) => {
        if (!live) return
        setLoaded(items)
        setChannelsLoading(false)
      })
      .catch(() => {
        // Avbruten (spellistbyte, indexändring) eller nätfel: lämna det som
        // redan visas och släpp laddningsläget.
        if (live) setChannelsLoading(false)
      })
    return () => {
      live = false
    }
  }, [activeSource, reloadToken])

  /** Indexet ändrat eller manuell uppdatering: rensa delat och ladda om. */
  const refreshChannels = useCallback(() => {
    invalidateChannels()
    setReloadToken((token) => token + 1)
  }, [])

  // Import klar, migrering körd, lista borttagen: indexet har bytt innehåll.
  // EN modul-global lyssnare rensar; modellerna väcks via generationen.
  useEffect(() => {
    ensureIndexSubscription()
    const listener = () => setReloadToken((token) => token + 1)
    generationListeners.add(listener)
    return () => {
      generationListeners.delete(listener)
    }
  }, [])

  /**
   * Platshållarrader ("=== SPORT ===") är kvar i indexet — det speglar källan —
   * men de är inga kanaler att spela, så de filtreras här precis som
   * `flattenChannels` gjorde före v2. Numret kommer ur indexet och påverkas
   * inte av filtret; positionen (utan aktiv källa) räknas på det som visas.
   */
  const channels = useMemo(() => loaded.filter(isPlayableChannel), [loaded])
  const numberByKey = useMemo(() => new Map(loaded.map((channel) => [channel.key, channel.number])), [loaded])
  const positionByKey = useMemo(
    () => new Map(channels.map((channel, index) => [channelKey(channel), index + 1])),
    [channels],
  )
  const byKey = useMemo(() => {
    const map = new Map<string, M3uChannel>()
    for (const channel of Object.values(extras)) map.set(channel.key, channel)
    for (const channel of channels) map.set(channelKey(channel), channel)
    return map
  }, [channels, extras])
  const byUrl = useMemo(() => {
    const map = new Map<string, M3uChannel>()
    for (const channel of byKey.values()) if (!map.has(channel.url)) map.set(channel.url, channel)
    return map
  }, [byKey])
  const groups = useMemo(() => topGroups(channels), [channels])
  const playlists = useMemo(
    () => lists.map((list) => ({ id: list.id, name: list.name, count: list.channelCount ?? list.channels?.length ?? 0 })),
    [lists],
  )
  /**
   * Listan en kanal kom från. Efter v2 bär listorna inga kanaler, så kopplingen
   * går via den aktiva källan (TV) eller — när det bara finns en lista — den.
   * Kvarvarande inbäddade kanaler (manuella listor) matchas fortfarande direkt.
   */
  const listByUrl = useMemo(() => {
    const map = new Map<string, LiveTvList>()
    for (const list of lists) for (const channel of list.channels ?? []) if (!map.has(channel.url)) map.set(channel.url, list)
    return map
  }, [lists])

  /** Favoriter och historik kan peka på kanaler utanför den laddade uppsättningen. */
  const loadedKeys = useMemo(() => new Set(channels.map((channel) => channelKey(channel))), [channels])
  const pinnedId = pinnedKeys.join(',')
  const historyId = history.map((entry) => entry.key).join(',')
  useEffect(() => {
    // Vänta in sidhämtningen: annars slås favoriter upp en gång i onödan
    // (de ligger oftast i den laddade uppsättningen) innan den hunnit svara.
    if (channelsLoading) return
    const wanted = [...pinnedKeys, ...history.map((entry) => entry.key)].filter((key) => !loadedKeys.has(key))
    if (wanted.length === 0) return
    let live = true
    const known = getResolvedChannels(wanted)
    if (Object.keys(known).length > 0) setExtras((prev) => ({ ...prev, ...known }))
    resolveChannelKeys(wanted)
      .then((items) => {
        if (!live || items.length === 0) return
        setExtras((prev) => {
          const next = { ...prev }
          for (const item of items) next[item.key] = item
          return next
        })
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedId, historyId, loadedKeys, channelsLoading])

  // ---- EPG ur appen -------------------------------------------------------

  const epgUrls = useMemo(() => getAllLiveTvEpgUrls(lists), [lists])
  const epgUrlsId = epgUrls.join('|')
  const epgListId = epgUrls.length > 0 ? LIVE_TV_GLOBAL_EPG_ID : null
  const sources = useMemo(
    () => lists.map((list) => list.source).filter((source): source is string => Boolean(source)),
    [lists],
  )
  const sourcesId = sources.join('|')
  const [snapshot, setSnapshot] = useState<NowSnapshot | null>(() =>
    getCachedNowSnapshot(LIVE_TV_GLOBAL_EPG_ID, null),
  )
  const [epgLoading, setEpgLoading] = useState(false)

  /**
   * Tickern äger både klockan och omhämtningen av snapshotet: en minut är
   * precis den upplösning "Nu/Härnäst" har, så en egen EPG-timer vore en andra
   * klocka som visar samma sak.
   *
   * KLOCKAN går alltid (förloppsribbor och "slutar om 12 min" räknas på
   * `nowMs`). EPG-tickern gör det inte: den står still medan fliken/appen är
   * dold — en Live TV-sida som ligger i bakgrunden i timmar ska inte be appen
   * om upp till 3 MB varje minut — och den går i gång igen direkt när sidan
   * blir synlig, så det första man ser är färskt.
   */
  const [epgTick, setEpgTick] = useState(0)
  useEffect(() => {
    const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
      if (visible()) setEpgTick((tick) => tick + 1)
    }, tickMs)
    const onVisibility = () => {
      if (!visible()) return
      setNowMs(Date.now())
      setEpgTick((tick) => tick + 1)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tickMs])

  /**
   * Snapshotet läses under den KONSTANTA lista-nyckeln, inte under epgListId
   * (Jerry 2026-09-03).
   *
   * `epgListId` är null tills kanallistorna hunnit laddas — och förblir null
   * när ingen EPG-URL är konfigurerad, fast appen mycket väl kan ha en tablå
   * (den härleder xmltv.php ur en Xtream-inloggning på egen hand). Med null
   * som villkor låg en FÄRDIG tablå oanvänd: live-status dök upp långt efter
   * att sidan ritats, eller aldrig.
   *
   * Hämtningen är fortfarande grindad: omhämtningsjobbet begärs bara när det
   * FINNS URL:er. `epgListId` lämnas orörd — live-tv-shell.tsx använder dess
   * null-läge för att veta att EPG saknas.
   */
  useEffect(() => {
    let live = true
    const listId = LIVE_TV_GLOBAL_EPG_ID
    const cached = getCachedNowSnapshot(listId, activeSource)
    if (cached) setSnapshot(cached)
    /*
     * Minuttickern hämtar bara om när det FINNS EPG-källor. Utan källor kan
     * innehållet ändå finnas (appen härleder xmltv.php ur en Xtream-inloggning),
     * så den FÖRSTA hämtningen görs alltid — men den kan inte bli färskare av
     * att frågas om varje minut, och en spellista utan EPG ska inte generera
     * ett anrop i minuten i all evighet.
     */
    if (cached && epgTick > 0 && epgUrls.length === 0) {
      setEpgLoading(false)
      return
    }
    setEpgLoading(!cached)
    void (async () => {
      try {
        const first = await fetchNowSnapshot(listId, activeSource)
        if (!live) return
        setSnapshot(first)
        const stale = first.fetchedAt === null || Date.now() - first.fetchedAt > EPG_TTL_MS
        if (!stale || epgUrls.length === 0 || epgRefreshRequested.has(listId)) return
        /*
         * Appen avgör själv om den verkligen hämtar (TTL 6 h); jobbet begärs
         * en gång per sidladdning.
         *
         * Jobbets `result` har samma FORM som importens (`ImportResult`), men
         * betyder något annat: `total` är antalet PROGRAM och kanalantalet
         * ligger i `groups[0]`. Vi väntar därför bara ut jobbet — ingen
         * progress kopplas vidare till importens UI, som skulle läsa
         * programantalet som "hämtar 480 000 av 17 000 kanaler".
         */
        epgRefreshRequested.add(listId)
        const job = await refreshEpg(listId, epgUrls, sources)
        await waitForJob(job)
        if (!live) return
        const next = await fetchNowSnapshot(listId, activeSource, { force: true })
        if (!live) return
        setSnapshot(next)
      } finally {
        if (live) setEpgLoading(false)
      }
    })().catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource, epgUrlsId, sourcesId, reloadToken, epgTick])

  const nowFor = useMemo(() => {
    const items = snapshot?.items ?? null
    return (channel: M3uChannel): NowNextLater => {
      if (!items) return EMPTY
      return items[channelKey(channel)] ?? EMPTY
    }
  }, [snapshot])

  const favouriteChannels = useMemo(
    () => pinnedKeys.map((key) => byKey.get(key)).filter((channel): channel is M3uChannel => Boolean(channel)),
    [pinnedKeys, byKey],
  )

  const resolveKeys = useCallback(
    (keys: string[]): Promise<M3uChannel[]> => resolveChannelKeys(keys).then((items) => items as M3uChannel[]),
    [],
  )

  return {
    lists,
    allChannels: channels,
    channels,
    byKey,
    byUrl,
    groups,
    pinnedKeys,
    pinnedSet: useMemo(() => new Set(pinnedKeys), [pinnedKeys]),
    togglePin: (channel) => setPinnedKeys(togglePinnedLiveTvChannel(channel)),
    playlists,
    activePlaylistId: activeList ? activeList.id : null,
    activePlaylistName: activeList ? activeList.name : null,
    setActivePlaylist: (id) => {
      setActivePlaylistId(id)
      setActivePlaylistIdState(id)
    },
    channelNumber: (channel) => {
      const key = channelKey(channel)
      if (activeSource) return numberByKey.get(key) ?? null
      return positionByKey.get(key) ?? null
    },
    favouriteChannels,
    history,
    nowMs,
    epgListId,
    epgUrls,
    // `count` räknas en gång när svaret kommer — inte per render över 17 000 nycklar.
    hasEpg: (snapshot?.count ?? 0) > 0,
    channelsLoading,
    epgLoading,
    epgFetchedAt: snapshot?.fetchedAt ?? null,
    resolveKeys,
    refreshChannels,
    nowFor,
    reminders,
    locked,
    listFor: (channel) =>
      listByUrl.get(channel.url) ?? activeList ?? (lists.length === 1 ? lists[0] : null),
  }
}

/** Startsekund för lokal midnatt `dayOffset` dagar från `nowMs`. */
export function startOfLocalDay(nowMs: number, dayOffset = 0): number {
  const d = new Date(nowMs)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + dayOffset)
  return d.getTime()
}

/** Heuristik ur kanalnamnet — M3U/Xtream bär ingen kvalitetsmetadata. */
export function qualityFromName(name: string): '4K' | 'FHD' | 'HD' | 'SD' | null {
  const n = name.toUpperCase()
  if (/\b(4K|UHD|2160)/.test(n)) return '4K'
  if (/\b(FHD|1080)/.test(n)) return 'FHD'
  if (/\b(HD|720)\b/.test(n)) return 'HD'
  if (/\b(SD|576|480)\b/.test(n)) return 'SD'
  return null
}
