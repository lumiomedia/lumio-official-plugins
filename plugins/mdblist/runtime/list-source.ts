import type { MdblistApi } from './api'
import { parseListRef } from './list-ref'
import { parseLists, parseMediaItems, type ListInfo as ParsedList } from './parse'
import { S } from './strings'

const FRESH_MS = 6 * 60 * 60_000
const WATCHLIST_ID = 'watchlist'

/** Var en listas titlar bor: watchlisten, en officiell lista (slug) eller en vanlig lista (id). */
function itemsPath(id: string): string {
  if (id === WATCHLIST_ID) return '/watchlist/items'
  if (id.startsWith('official:')) return `/lists/official/${id.slice('official:'.length)}/items`
  return `/lists/${id}/items`
}
const LISTS_KEY = 'mdblist_lists_cache'
const itemsKey = (id: string) => `mdblist_list_items_${id}`

type ListInfo = ParsedList
type Item = { mediaType: 'movie' | 'tv'; tmdbId: string; imdbId: string | null; title: string; posterUrl: string | null }

export function createListSource(deps: {
  api: MdblistApi
  readJson<T>(key: string): T | null
  writeJson(key: string, value: unknown): void
  now(): number
  log(message: string): void
  /** Appens språk — för namn pluginet själv sätter (Min watchlist). */
  lang?(): 'en' | 'sv'
}) {
  const remember = (lists: ListInfo[]) => {
    const known = new Map((deps.readJson<ListInfo[]>(LISTS_KEY) ?? []).map((l) => [l.id, l]))
    for (const list of lists) known.set(list.id, list)
    deps.writeJson(LISTS_KEY, [...known.values()])
  }

  async function fetchItems(id: string): Promise<Item[] | null> {
    const result = await deps.api.getAllPages(itemsPath(id), { limit: 200 })
    if (!result.ok) {
      deps.log(`lista ${id}: ${result.error}`)
      return null
    }
    const items = parseMediaItems(result.data).map((item) => ({ ...item, posterUrl: null }))
    deps.writeJson(itemsKey(id), { fetchedAt: deps.now(), items })
    return items
  }

  return {
    /**
     * Listorna i väljarens kategorier, i MDBList-menyns ordning. En kategori
     * som inte svarar faller bort; de andra visas ändå. Fem läsningar — bara
     * när väljaren öppnas.
     */
    async listLists(): Promise<ListInfo[]> {
      const categories: Array<{ id: string; label: { en: string; sv: string }; path: string; query?: Record<string, number> }> = [
        { id: 'mine', label: S.groupMine, path: '/lists/user' },
        { id: 'liked', label: S.groupLiked, path: '/lists/liked', query: { limit: 50 } },
        { id: 'top', label: S.groupTop, path: '/lists/top', query: { limit: 30 } },
        { id: 'curated', label: S.groupCurated, path: '/lists/curated', query: { limit: 30 } },
        { id: 'official', label: S.groupOfficial, path: '/lists/official' },
      ]
      const results = await Promise.all(categories.map(async (category) => {
        const result = await deps.api.call('GET', category.path, category.query ? { query: category.query } : undefined)
        if (!result.ok) {
          deps.log(`listor (${category.id}): ${result.error}`)
          return [] as ListInfo[]
        }
        const group = { id: category.id, label: category.label }
        if (category.id === 'official') {
          // Officiella listor hämtas med sin slug, inte med id.
          const slugs = new Map<string, string>()
          for (const entry of Array.isArray(result.data) ? result.data : []) {
            const { id, slug } = (entry ?? {}) as { id?: unknown; slug?: unknown }
            if ((typeof id === 'number' || typeof id === 'string') && typeof slug === 'string') slugs.set(String(id), slug)
          }
          return parseLists(result.data).flatMap((list) => {
            const slug = slugs.get(list.id)
            return slug ? [{ ...list, id: `official:${slug}`, group }] : []
          })
        }
        return parseLists(result.data).map((list) => ({ ...list, group }))
      }))
      const watchlist: ListInfo = {
        id: WATCHLIST_ID, name: S.myWatchlist[deps.lang?.() ?? 'en'], description: null, itemCount: null, owner: null, dynamic: true,
        group: { id: 'mine', label: S.groupMine },
      }
      const lists = [watchlist, ...results.flat()]
      remember(lists)
      return lists
    },

    /** Ur cache direkt; äldre än 6 h hämtas om i bakgrunden. En saknad lista är tom. */
    async loadList(id: string): Promise<Item[]> {
      const cached = deps.readJson<{ fetchedAt: number; items: Item[] }>(itemsKey(id))
      if (cached) {
        if (deps.now() - cached.fetchedAt > FRESH_MS) void fetchItems(id)
        return cached.items
      }
      return (await fetchItems(id)) ?? []
    },

    async resolveListRef(input: string): Promise<ListInfo | null> {
      const ref = parseListRef(input)
      if (!ref) return null
      const path = ref.kind === 'id' ? `/lists/${ref.id}` : `/lists/${ref.user}/${ref.slug}`
      const result = await deps.api.call('GET', path)
      if (!result.ok) return null
      const found = parseLists(result.data)[0] ?? null
      if (found) remember([found])
      return found
    },

    describeList(id: string): ListInfo | null {
      return (deps.readJson<ListInfo[]>(LISTS_KEY) ?? []).find((l) => l.id === id) ?? null
    },
  }
}
