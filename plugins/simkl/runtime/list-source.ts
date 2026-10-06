import type { SimklApi } from './api'
import { parseAllItems, parseTrending, type ListItem } from './parse'
import { S, type Text } from './strings'

const HOUR = 60 * 60_000
const itemsKey = (id: string) => `simkl_list_items_${id}`

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
 * definitioner — väljaren kostar inga anrop. Statuslistor kräver inloggning
 * (en timmes cache); trendande kommer från SIMKL:s CDN utan inloggning och
 * utan kvot. SIMKL kräver "Simkl" i trendande-rubriken (regel 6).
 */
export function createListSource(deps: {
  api: SimklApi
  readJson<T>(key: string): T | null
  writeJson(key: string, value: unknown): void
  now(): number
  log(message: string): void
  lang(): Lang
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

  async function fetchItems(id: string, parsed: Parsed): Promise<ListItem[] | null> {
    const running = inflight.get(id)
    if (running) return running
    const job = (async () => {
      let items: ListItem[]
      if (parsed.kind === 'status') {
        const result = await deps.api.call<unknown>('GET', `/sync/all-items/${parsed.type}/${parsed.status}`)
        if (!result.ok) { deps.log(`lista ${id}: ${result.error}`); return null }
        items = parseAllItems(result.data).flatMap((item) => item.tmdbId
          ? [{ mediaType: item.kind === 'movie' ? 'movie' as const : 'tv' as const, tmdbId: item.tmdbId, imdbId: item.imdbId, title: item.title, posterUrl: null }]
          : [])
      } else {
        const result = await deps.api.cdn<unknown>(`/discover/trending/${TRENDING_DIR[parsed.type]}/${parsed.period}_100.json`)
        if (!result.ok) { deps.log(`lista ${id}: ${result.error}`); return null }
        items = parseTrending(result.data, parsed.type === 'movies' ? 'movie' : 'tv')
      }
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

    /** Ur cache direkt; för gammal hämtas om i bakgrunden. En okänd eller saknad lista är tom. */
    async loadList(id: string): Promise<ListItem[]> {
      const parsed = parseId(id)
      if (!parsed) return []
      const maxAge = parsed.kind === 'status' || parsed.period === 'today' ? HOUR : 6 * HOUR
      const cached = deps.readJson<{ fetchedAt: number; items: ListItem[] }>(itemsKey(id))
      if (cached) {
        if (deps.now() - cached.fetchedAt > maxAge) void fetchItems(id, parsed)
        return cached.items
      }
      return (await fetchItems(id, parsed)) ?? []
    },

    describeList(id: string): ListInfo | null {
      return describe(id)
    },
  }
}
