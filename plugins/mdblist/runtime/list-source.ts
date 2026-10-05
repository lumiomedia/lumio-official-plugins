import type { MdblistApi } from './api'
import { parseListRef } from './list-ref'
import { parseLists, parseMediaItems } from './parse'

const FRESH_MS = 6 * 60 * 60_000
const LISTS_KEY = 'mdblist_lists_cache'
const itemsKey = (id: string) => `mdblist_list_items_${id}`

type ListInfo = { id: string; name: string; itemCount: number | null; owner: string | null; dynamic: boolean }
type Item = { mediaType: 'movie' | 'tv'; tmdbId: string; imdbId: string | null; title: string; posterUrl: string | null }

export function createListSource(deps: {
  api: MdblistApi
  readJson<T>(key: string): T | null
  writeJson(key: string, value: unknown): void
  now(): number
  log(message: string): void
}) {
  const remember = (lists: ListInfo[]) => {
    const known = new Map((deps.readJson<ListInfo[]>(LISTS_KEY) ?? []).map((l) => [l.id, l]))
    for (const list of lists) known.set(list.id, list)
    deps.writeJson(LISTS_KEY, [...known.values()])
  }

  async function fetchItems(id: string): Promise<Item[] | null> {
    const result = await deps.api.getAllPages(`/lists/${id}/items`, { limit: 200 })
    if (!result.ok) {
      deps.log(`lista ${id}: ${result.error}`)
      return null
    }
    const items = parseMediaItems(result.data).map((item) => ({ ...item, posterUrl: null }))
    deps.writeJson(itemsKey(id), { fetchedAt: deps.now(), items })
    return items
  }

  return {
    async listLists(): Promise<ListInfo[]> {
      const result = await deps.api.call('GET', '/lists/user')
      if (!result.ok) throw new Error(result.error)
      const lists = parseLists(result.data)
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
