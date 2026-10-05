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
})
