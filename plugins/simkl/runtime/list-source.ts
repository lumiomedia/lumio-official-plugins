import type { SimklApi } from './api'
import { parseTrending, type ListItem } from './parse'
import { S, type Text } from './strings'
import { buildRemoteMap, type RemoteMap } from './sync-engine'

const HOUR = 60 * 60_000
const itemsKey = (id: string) => `simkl_list_items_${id}`
/** Statuskartan när synken är av — en hämtning för alla statusrader. */
const LIBRARY_KEY = itemsKey('library')
const LIBRARY_MAX_AGE = 6 * HOUR
const QUOTA_FLOOR = 50
const KIND: Record<'movies' | 'shows' | 'anime', 'm' | 's' | 'a'> = { movies: 'm', shows: 's', anime: 'a' }

type Lang = 'en' | 'sv'
type ListType = 'movies' | 'shows' | 'anime'
type Status = 'watching' | 'plantowatch' | 'completed' | 'hold' | 'dropped'
type Period = 'today' | 'week' | 'month'

export type ListInfo = {
  id: string
  name: string
  description: string | null
  itemCount: number | null
  owner: string | null
  dynamic: boolean
  group?: { id: string; label: Text }
}

const TYPE_TEXT: Record<ListType, Text> = { movies: S.typeMovies, shows: S.typeShows, anime: S.typeAnime }
const STATUS_TEXT: Record<Status, Text> = {
  watching: S.statusWatching, plantowatch: S.statusPlantowatch, completed: S.statusCompleted, hold: S.statusHold, dropped: S.statusDropped,
}
const PERIOD_TEXT: Record<Period, Text> = { today: S.periodToday, week: S.periodWeek, month: S.periodMonth }
/** SIMKL: filmer har bara Planerar, Klara och Avbrutna. */
const STATUSES: Record<ListType, Status[]> = {
  shows: ['watching', 'plantowatch', 'completed', 'hold', 'dropped'],
  anime: ['watching', 'plantowatch', 'completed', 'hold', 'dropped'],
  movies: ['plantowatch', 'completed', 'dropped'],
}
/** CDN-katalogen för trendande heter `tv`, inte `shows`. */
const TRENDING_DIR: Record<ListType, string> = { movies: 'movies', shows: 'tv', anime: 'anime' }

type Parsed = { kind: 'status'; type: ListType; status: Status } | { kind: 'trending'; type: ListType; period: Period }

function parseId(id: string): Parsed | null {
  const [kind, type, third] = id.split(':')
  if (!type || !(type in STATUSES)) return null
  if (kind === 'status' && STATUSES[type as ListType].includes(third as Status)) return { kind, type: type as ListType, status: third as Status }
  if (kind === 'trending' && third in PERIOD_TEXT) return { kind, type: type as ListType, period: third as Period }
  return null
}

/**
 * SIMKL:s listor som hemrader (`plugin_list:simkl`). Listorna är fasta
 * definitioner — väljaren kostar inga anrop. Statuslistor läses ur synkens
 * statuskarta (inga egna anrop); är synken av hämtas statusarna en gång för
 * alla rader, högst var sjätte timme. Trendande kommer från SIMKL:s CDN utan
 * inloggning och utan kvot. SIMKL kräver "Simkl" i trendande-rubriken (regel 6).
 */
export function createListSource(deps: {
  api: SimklApi
  readJson<T>(key: string): T | null
  writeJson(key: string, value: unknown): void
  now(): number
  log(message: string): void
  lang(): Lang
  /** Synkens statuskarta, eller null om synken inte körts. */
  readRemote(): RemoteMap | null
}) {
  const inflight = new Map<string, Promise<ListItem[] | null>>()

  function describe(id: string): ListInfo | null {
    const parsed = parseId(id)
    if (!parsed) return null
    const l = deps.lang()
    if (parsed.kind === 'status') {
      return {
        id,
        name: `${STATUS_TEXT[parsed.status][l]} · ${TYPE_TEXT[parsed.type][l]}`,
        description: S.pluginName[l],
        itemCount: null, owner: null, dynamic: true,
        group: { id: 'mine', label: S.groupMine },
      }
    }
    return {
      id,
      name: `${S.groupTrending[l]} · ${TYPE_TEXT[parsed.type][l]} · ${PERIOD_TEXT[parsed.period][l]}`,
      description: null,
      itemCount: 100, owner: null, dynamic: true,
      group: { id: 'trending', label: S.groupTrending },
    }
  }

  /** Statuskartan när synken inte har någon: en gemensam hämtning, statusar utan avsnitt. */
  let libraryJob: Promise<RemoteMap | null> | null = null
  async function libraryMap(): Promise<RemoteMap | null> {
    const cached = deps.readJson<{ fetchedAt: number; remote: RemoteMap }>(LIBRARY_KEY)
    if (cached && deps.now() - cached.fetchedAt < LIBRARY_MAX_AGE) return cached.remote
    const left = deps.api.remaining()
    if (left != null && left < QUOTA_FLOOR) return cached?.remote ?? null
    libraryJob ??= (async () => {
      const result = await deps.api.call<unknown>('GET', '/sync/all-items/all/all')
      if (!result.ok) { deps.log(`statuslistor: ${result.error}`); return cached?.remote ?? null }
      const remote = buildRemoteMap(result.data)
      deps.writeJson(LIBRARY_KEY, { fetchedAt: deps.now(), remote })
      return remote
    })().finally(() => { libraryJob = null })
    return libraryJob
  }

  async function statusItems(type: ListType, status: Status): Promise<ListItem[]> {
    const remote = deps.readRemote() ?? (await libraryMap())
    if (!remote) return []
    return Object.entries(remote).flatMap(([key, row]) => (row.k === KIND[type] && row.st === status
      ? [{ mediaType: key.startsWith('m:') ? 'movie' as const : 'tv' as const, tmdbId: key.slice(2), imdbId: row.i ?? null, title: row.t, posterUrl: null }]
      : []))
  }

  async function fetchTrending(id: string, type: ListType, period: Period): Promise<ListItem[] | null> {
    const running = inflight.get(id)
    if (running) return running
    const job = (async () => {
      const result = await deps.api.cdn<unknown>(`/discover/trending/${TRENDING_DIR[type]}/${period}_100.json`)
      if (!result.ok) { deps.log(`lista ${id}: ${result.error}`); return null }
      const items = parseTrending(result.data, type === 'movies' ? 'movie' : 'tv')
      deps.writeJson(itemsKey(id), { fetchedAt: deps.now(), items })
      return items
    })().finally(() => { inflight.delete(id) })
    inflight.set(id, job)
    return job
  }

  return {
    async listLists(): Promise<ListInfo[]> {
      const ids: string[] = []
      if (deps.api.hasAuth()) {
        for (const type of ['shows', 'anime', 'movies'] as const) for (const status of STATUSES[type]) ids.push(`status:${type}:${status}`)
      }
      for (const type of ['movies', 'shows', 'anime'] as const) for (const period of ['today', 'week', 'month'] as const) ids.push(`trending:${type}:${period}`)
      return ids.map((id) => describe(id)!).filter(Boolean)
    },

    /** Statuslistor ur kartan; trendande ur cache, för gammal hämtas om i bakgrunden. Okänt id är tomt. */
    async loadList(id: string): Promise<ListItem[]> {
      const parsed = parseId(id)
      if (!parsed) return []
      if (parsed.kind === 'status') return deps.api.hasAuth() ? statusItems(parsed.type, parsed.status) : []
      const maxAge = parsed.period === 'today' ? HOUR : 6 * HOUR
      const cached = deps.readJson<{ fetchedAt: number; items: ListItem[] }>(itemsKey(id))
      if (cached) {
        if (deps.now() - cached.fetchedAt > maxAge) void fetchTrending(id, parsed.type, parsed.period)
        return cached.items
      }
      return (await fetchTrending(id, parsed.type, parsed.period)) ?? []
    },

    describeList(id: string): ListInfo | null {
      return describe(id)
    },
  }
}
