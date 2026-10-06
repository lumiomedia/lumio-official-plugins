import { describe, expect, it, vi } from 'vitest'
import type { ApiResult, SimklApi } from './api'
import { createListSource } from './list-source'

function setup(opts: { auth?: boolean; call?: (path: string) => ApiResult<unknown>; cdn?: (path: string) => ApiResult<unknown> } = {}) {
  let clock = 0
  const store: Record<string, unknown> = {}
  const call = vi.fn(async (_m: string, path: string) => (opts.call ?? (() => ({ ok: true, data: {} })))(path))
  const cdn = vi.fn(async (path: string) => (opts.cdn ?? (() => ({ ok: true, data: [] })))(path))
  const api: SimklApi = {
    call: call as unknown as SimklApi['call'], cdn: cdn as unknown as SimklApi['cdn'],
    pausedUntil: () => 0, hasAuth: () => opts.auth !== false, remaining: () => null,
  }
  const source = createListSource({
    api, readJson: <T>(k: string) => (store[k] as T) ?? null, writeJson: (k, v) => { store[k] = v },
    now: () => clock, log: () => {}, lang: () => 'sv',
  })
  return { source, call, cdn, tick: (ms: number) => { clock += ms } }
}

describe('SIMKL-listkällan', () => {
  it('kategorier: mina statuslistor och trendande; filmer har bara tre statusar', async () => {
    const { source, call } = setup()
    const lists = await source.listLists()
    expect(call).not.toHaveBeenCalled()
    const mine = lists.filter((l) => l.group?.id === 'mine').map((l) => l.id)
    expect(mine).toContain('status:shows:watching')
    expect(mine).toContain('status:anime:hold')
    expect(mine.filter((id) => id.startsWith('status:movies:'))).toEqual(['status:movies:plantowatch', 'status:movies:completed', 'status:movies:dropped'])
    const trending = lists.filter((l) => l.group?.id === 'trending')
    expect(trending).toHaveLength(9)
    expect(trending.every((l) => l.name.includes('Simkl'))).toBe(true)
  })

  it('utan inloggning bara trendande', async () => {
    const { source } = setup({ auth: false })
    expect((await source.listLists()).every((l) => l.group?.id === 'trending')).toBe(true)
  })

  it('statuslista hämtas med auth från all-items, trendande från CDN utan auth', async () => {
    const { source, call, cdn } = setup({
      call: () => ({ ok: true, data: { shows: [{ status: 'watching', show: { title: 'GoT', ids: { simkl: 1, tmdb: '1399' } } }] } }),
      cdn: () => ({ ok: true, data: [{ title: 'M', ids: { tmdb: '603' } }] }),
    })
    expect((await source.loadList('status:shows:watching')).map((i) => [i.tmdbId, i.mediaType])).toEqual([['1399', 'tv']])
    expect((call.mock.calls[0] as unknown as [string, string])[1]).toBe('/sync/all-items/shows/watching')
    expect((await source.loadList('trending:movies:week')).map((i) => [i.tmdbId, i.mediaType])).toEqual([['603', 'movie']])
    expect(cdn).toHaveBeenCalledWith('/discover/trending/movies/week_100.json')
  })

  it('cache: en timme för statuslistor, sedan omhämtning i bakgrunden', async () => {
    let n = 0
    const { source, tick } = setup({ call: () => { n += 1; return { ok: true, data: {} } } })
    await source.loadList('status:movies:plantowatch')
    await source.loadList('status:movies:plantowatch')
    expect(n).toBe(1)
    tick(60 * 60_000 + 1)
    await source.loadList('status:movies:plantowatch')
    expect(n).toBe(2)
  })

  it('två samtidiga hämtningar av samma lista blir en', async () => {
    let n = 0
    const { source } = setup({ cdn: () => { n += 1; return { ok: true, data: [] } } })
    await Promise.all([source.loadList('trending:shows:today'), source.loadList('trending:shows:today')])
    expect(n).toBe(1)
  })

  it('namn och beskrivning ur id:t, och okänt id blir tomt', async () => {
    const { source } = setup()
    expect(source.describeList('trending:anime:month')?.name).toBe('Trendande på Simkl · Anime · Månaden')
    expect(source.describeList('status:shows:plantowatch')?.name).toBe('Planerar att se · Serier')
    expect(await source.loadList('nonsens')).toEqual([])
  })
})
