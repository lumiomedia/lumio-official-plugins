import { describe, expect, it, vi } from 'vitest'
import type { ApiResult, MdblistApi } from './api'
import { parseListRef } from './list-ref'
import { createListSource } from './list-source'

describe('parseListRef', () => {
  it('länk, id och skräp', () => {
    expect(parseListRef('https://mdblist.com/lists/linaspurinis/top-watched-movies-of-the-week'))
      .toEqual({ kind: 'slug', user: 'linaspurinis', slug: 'top-watched-movies-of-the-week' })
    expect(parseListRef('mdblist.com/lists/jerry/mina-filmer/')).toEqual({ kind: 'slug', user: 'jerry', slug: 'mina-filmer' })
    expect(parseListRef(' 12345 ')).toEqual({ kind: 'id', id: '12345' })
    expect(parseListRef('https://trakt.tv/users/x/lists/y')).toBeNull()
    expect(parseListRef('')).toBeNull()
  })
})

function setup(route: (path: string) => ApiResult<unknown>) {
  let clock = 0
  const store: Record<string, unknown> = {}
  const call = vi.fn(async (_m: 'GET' | 'POST', path: string) => route(path))
  const api: MdblistApi = {
    call: call as MdblistApi['call'],
    getAllPages: async (path) => {
      const r = route(path)
      if (!r.ok) return r
      return { ok: true, data: Array.isArray(r.data) ? { items: r.data } : (r.data as Record<string, unknown[]>) }
    },
    pausedUntil: () => 0,
    hasAuth: () => true,
  }
  const source = createListSource({
    api, readJson: <T>(k: string) => (store[k] as T) ?? null, writeJson: (k, v) => { store[k] = v },
    now: () => clock, log: () => {},
  })
  return { source, call, store, tick: (ms: number) => { clock += ms } }
}

const items = [{ id: 603, title: 'Matrix', mediatype: 'movie', rank: 1 }]

describe('listkällan', () => {
  it('hämtar, cachar och svarar ur cache inom 6 h', async () => {
    let n = 0
    const { source } = setup(() => { n += 1; return { ok: true, data: items } })
    expect((await source.loadList('42')).map((x) => x.tmdbId)).toEqual(['603'])
    expect((await source.loadList('42')).map((x) => x.tmdbId)).toEqual(['603'])
    expect(n).toBe(1)
  })

  it('efter 6 h svarar den ur cache och hämtar om i bakgrunden', async () => {
    let n = 0
    const { source, tick } = setup(() => { n += 1; return { ok: true, data: items } })
    await source.loadList('42')
    tick(6 * 60 * 60_000 + 1)
    await source.loadList('42')
    await Promise.resolve()
    expect(n).toBe(2)
  })

  it('en lista som inte finns blir tom, inte ett kast', async () => {
    const { source } = setup(() => ({ ok: false, status: 404, retryAfter: null, error: 'mdblist 404' }))
    expect(await source.loadList('999')).toEqual([])
  })

  it('resolveListRef slår upp en slug-länk och minns listan för underrubriken', async () => {
    const { source } = setup((path) => path === '/lists/jerry/mina'
      ? { ok: true, data: [{ id: 77, name: 'Mina', items: 3, user_name: 'jerry' }] }
      : { ok: true, data: [] })
    const found = await source.resolveListRef('https://mdblist.com/lists/jerry/mina')
    expect(found).toEqual(expect.objectContaining({ id: '77', name: 'Mina' }))
    expect(source.describeList('77')?.name).toBe('Mina')
  })

  it('kategorier: mina listor (med watchlisten), gillade, populära, kurerade och officiella', async () => {
    const { source } = setup((path) => {
      if (path === '/lists/user') return { ok: true, data: [{ id: 7, name: 'Star Wars TMDB', description: 'Testar en lista', items: 8 }] }
      if (path === '/lists/liked') return { ok: true, data: { lists: [{ id: 9, name: 'Gillad', items: 3 }] } }
      if (path === '/lists/top') return { ok: true, data: [{ id: 14, name: 'Topp', items: 42 }] }
      if (path === '/lists/curated') return { ok: true, data: [{ id: 15, name: 'Kurerad', items: 5 }] }
      if (path === '/lists/official') return { ok: true, data: [{ id: 63, name: 'Popular Movies & Shows', slug: 'popular', items: 200 }] }
      return { ok: true, data: [] }
    })
    const lists = await source.listLists()
    expect(lists.map((l) => [l.group?.id, l.id])).toEqual([
      ['mine', 'watchlist'], ['mine', '7'], ['liked', '9'], ['top', '14'], ['curated', '15'], ['official', 'official:popular'],
    ])
    expect(source.describeList('7')).toEqual(expect.objectContaining({ name: 'Star Wars TMDB', description: 'Testar en lista' }))
  })

  it('en kategori som fallerar tar inte med sig de andra', async () => {
    const { source } = setup((path) => path === '/lists/curated'
      ? { ok: false, status: 500, retryAfter: null, error: 'x' }
      : { ok: true, data: [] })
    const lists = await source.listLists()
    expect(lists.map((l) => l.id)).toEqual(['watchlist'])
  })

  it('watchlisten och officiella listor hämtas från rätt ställe', async () => {
    const paths: string[] = []
    const { source } = setup((path) => { paths.push(path); return { ok: true, data: { movies: [{ id: 603, title: 'M', mediatype: 'movie' }] } } })
    expect((await source.loadList('watchlist')).map((x) => x.tmdbId)).toEqual(['603'])
    await source.loadList('official:most-watched-week')
    expect(paths).toEqual(['/watchlist/items', '/lists/official/most-watched-week/items'])
  })
})
