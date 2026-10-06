import { describe, expect, it, vi } from 'vitest'
import type { ApiResult, SimklApi } from './api'
import { createListSource } from './list-source'
import type { RemoteMap } from './sync-engine'

function setup(opts: { auth?: boolean; remote?: RemoteMap | null; call?: (path: string) => ApiResult<unknown>; cdn?: (path: string) => ApiResult<unknown> } = {}) {
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
    now: () => clock, log: () => {}, lang: () => 'sv', readRemote: () => opts.remote ?? null,
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

  it('I5: statuslistor läses ur synkens statuskarta — inget anrop', async () => {
    const { source, call } = setup({
      remote: {
        's:1399': { st: 'watching', k: 's', t: 'GoT' },
        's:37854': { st: 'watching', k: 'a', t: 'One Piece' },
        'm:603': { st: 'plantowatch', k: 'm', t: 'Matrix', i: 'tt0133093' },
      },
    })
    expect((await source.loadList('status:shows:watching')).map((i) => [i.tmdbId, i.mediaType])).toEqual([['1399', 'tv']])
    expect((await source.loadList('status:anime:watching')).map((i) => i.tmdbId)).toEqual(['37854'])
    expect(await source.loadList('status:movies:plantowatch')).toEqual([{ mediaType: 'movie', tmdbId: '603', imdbId: 'tt0133093', title: 'Matrix', posterUrl: null }])
    expect(call).not.toHaveBeenCalled()
  })

  it('I5: utan karta (synken av) — en gemensam statushämtning för alla rader, högst var sjätte timme', async () => {
    const { source, call, tick } = setup({
      call: () => ({ ok: true, data: { shows: [{ status: 'watching', show: { title: 'GoT', ids: { simkl: 1, tmdb: '1399' } } }] } }),
    })
    expect((await source.loadList('status:shows:watching')).map((i) => i.tmdbId)).toEqual(['1399'])
    await source.loadList('status:movies:plantowatch')
    await source.loadList('status:shows:hold')
    expect(call).toHaveBeenCalledTimes(1)
    expect((call.mock.calls[0] as unknown as [string, string])[1]).toBe('/sync/all-items/all/all')
    tick(60 * 60_000 + 1)
    await source.loadList('status:shows:watching')
    expect(call).toHaveBeenCalledTimes(1)
    tick(6 * 60 * 60_000)
    await source.loadList('status:shows:watching')
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('trendande från CDN utan auth', async () => {
    const { source, cdn } = setup({ cdn: () => ({ ok: true, data: [{ title: 'M', ids: { tmdb: '603' } }] }) })
    expect((await source.loadList('trending:movies:week')).map((i) => [i.tmdbId, i.mediaType])).toEqual([['603', 'movie']])
    expect(cdn).toHaveBeenCalledWith('/discover/trending/movies/week_100.json')
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

  it('M9: en anime-film i en statusrad öppnas som film', async () => {
    const { source } = setup({ remote: { 'm:149': { st: 'plantowatch', k: 'a', t: 'Akira' } } })
    expect((await source.loadList('status:anime:plantowatch')).map((i) => [i.tmdbId, i.mediaType])).toEqual([['149', 'movie']])
  })
})
