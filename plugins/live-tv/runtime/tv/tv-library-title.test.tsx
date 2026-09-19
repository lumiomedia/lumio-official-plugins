import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  __resetForTests,
  __resetWatchlistForTests,
  __setTvModeForTests,
  getWatchlist,
  writePluginJson,
} from '@/lib/plugin-sdk'
import { seedLiveTvIndex, type VodItemFixture } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="channel-player" /> }))
import { LiveTvTvShell } from './tv-shell'

const SOURCE = 'xtream://panel/login-1'
const LOGIN = { id: 'login-1', base: 'http://panel', username: 'u', password: 'p', format: 'ts', categoryIds: [] }

const list: LiveTvList = {
  id: 'l1',
  name: 'panel',
  kind: 'xtream',
  source: SOURCE,
  xtreamLoginId: 'login-1',
  channels: [],
  createdAt: '',
  urlTvg: null,
  epgUrls: [],
  autoEpgDisabled: false,
  fetchedAt: null,
}

const MOVIE: VodItemFixture = {
  key: 'vod:1',
  kind: 'movie',
  title: 'Toy Story 5',
  categoryId: '5',
  categoryName: 'MOVIE: Swedish',
  tmdbId: 1084244,
  year: 2026,
  streamId: 1,
  url: 'http://panel/movie/u/p/1.mkv',
}

const SERIES: VodItemFixture = {
  key: 'series:7',
  kind: 'series',
  title: 'Dark',
  categoryId: '9',
  categoryName: 'SERIES: Netflix',
  tmdbId: 70523,
  seriesId: 7,
}

const WIKI = {
  tmdbId: 1084244,
  imdbId: 'tt29355505',
  title: 'Toy Story 5',
  originalTitle: 'Toy Story 5',
  tagline: "It's on.",
  overview: 'When Bonnie receives a Lilypad tablet…',
  backdropUrl: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
  posterUrl: 'https://image.tmdb.org/t/p/w342/poster.jpg',
  year: 2026,
  runtime: 102,
  numberOfSeasons: null,
  genres: ['Animation', 'Family'],
  directors: ['Andrew Stanton'],
  voteAverage: 8.358,
  cast: [
    { id: 3234, name: 'Joan Cusack', character: 'Jessie (voice)', profileUrl: 'http://img/1.jpg' },
    { id: 31, name: 'Tom Hanks', character: 'Woody (voice)', profileUrl: null },
  ],
}

const EPISODES = [
  { season: 1, episode: 1, title: 'Secrets', url: 'http://panel/series/u/p/101.mkv', runtimeMin: 51 },
  { season: 1, episode: 2, title: 'Lies', url: 'http://panel/series/u/p/102.mkv' },
  { season: 2, episode: 1, title: 'Beginnings', url: 'http://panel/series/u/p/201.mkv' },
]

/** Lägger `/api/wiki` och `/api/live-tv/vod/series` ovanpå indexstubbens fetch. */
function stubTitleApis(opts: { wiki?: unknown; episodes?: unknown[] } = {}) {
  const inner = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input)
    const path = new URL(raw, 'http://localhost').pathname
    const json = (body: unknown) =>
      Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)
    if (path === '/api/wiki') return json(opts.wiki ?? WIKI)
    if (path === '/api/live-tv/vod/series') return json({ episodes: opts.episodes ?? EPISODES, cached: false })
    return inner(input as RequestInfo, init)
  }) as typeof fetch
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __resetWatchlistForTests?.()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [LOGIN])
})

function mount(item: VodItemFixture, opts: Parameters<typeof stubTitleApis>[0] = {}) {
  seedLiveTvIndex({ vod: { [SOURCE]: [item] } })
  stubTitleApis(opts)
  const onNavigate = vi.fn()
  render(
    <LiveTvTvShell
      pageId="live-tv-browse"
      params={{ view: 'title', key: item.key }}
      onNavigate={onNavigate}
      onOpenDetails={() => {}}
    />,
  )
  return onNavigate
}

describe('TvLibraryTitle', () => {
  it('ritar detaljerna inne i Live TV, med ikonraden kvar', async () => {
    mount(MOVIE)
    await waitFor(() => expect(screen.getByText('Toy Story 5')).toBeTruthy())
    // Det var hela poängen: vyn ersätter inte skalet.
    expect(screen.getByTestId('rail-library')).toBeTruthy()
    expect(screen.getByTestId('tv-library-title')).toBeTruthy()
  })

  it('visar TMDB-uppgifterna: handling, tagline och metarad', async () => {
    mount(MOVIE)
    await waitFor(() => expect(screen.getByText(/When Bonnie receives/)).toBeTruthy())
    expect(screen.getByText("It's on.")).toBeTruthy()
    const panel = screen.getByTestId('tv-library-title')
    expect(panel.textContent).toContain('2026')
    expect(panel.textContent).toContain('1 h 42')
    expect(panel.textContent).toContain('Animation')
    expect(panel.textContent).toContain('8.4')
  })

  it('har appens ikonrad efter Play, men inga rekommendationer', async () => {
    mount(MOVIE)
    await waitFor(() => expect(screen.getByTestId('title-play')).toBeTruthy())
    expect(screen.getByTestId('title-action-cast')).toBeTruthy()
    expect(screen.getByTestId('title-action-list')).toBeTruthy()
    expect(screen.getByTestId('title-action-watched')).toBeTruthy()
    // Jerrys krav: den magra vyn har inget av det appens sida bär.
    expect(screen.queryByTestId('title-recommendations')).toBeNull()
    expect(screen.queryByTestId('title-comments')).toBeNull()
  })

  it('bakgrunden fyller hela ytan bredvid ikonraden', async () => {
    mount(MOVIE)
    await waitFor(() => expect(screen.getByTestId('title-backdrop')).toBeTruthy())
    const backdrop = screen.getByTestId('title-backdrop')
    expect(backdrop.style.position).toBe('absolute')
    // `inset: 0` — inte en fast höjd i överkanten som första utkastet hade.
    expect(backdrop.style.inset).toBe('0')
    expect(backdrop.style.backgroundImage).toContain('backdrop.jpg')
  })

  it('rollista-ikonen öppnar appens rollista inne i Live TV', async () => {
    const onNavigate = mount(MOVIE)
    await waitFor(() => expect(screen.getByTestId('title-action-cast')).toBeTruthy())
    fireEvent.click(screen.getByTestId('title-action-cast'))
    expect(onNavigate).toHaveBeenCalledWith({
      pageId: 'live-tv-browse',
      params: { view: 'cast', key: 'vod:1', tmdbId: '1084244', type: 'movie' },
    })
  })

  it('spelar panelens ström i APPENS spelare, inte kanalspelaren', async () => {
    mount(MOVIE)
    await waitFor(() => expect(screen.getByTestId('title-play')).toBeTruthy())
    fireEvent.click(screen.getByTestId('title-play'))
    // Appens spelare har tidslinje och återupptagning; kanalspelaren har det inte.
    await waitFor(() => expect(screen.getByTestId('app-player')).toBeTruthy())
    expect(screen.queryByTestId('channel-player')).toBeNull()
    // Exakt Xtream-URL:en — ingen debrid-upplösning på vägen.
    expect(screen.getByTestId('app-player').getAttribute('data-url')).toBe('http://panel/movie/u/p/1.mkv')
  })

  it('Min lista går att slå på och av och hamnar i appens lista', async () => {
    mount(MOVIE)
    await waitFor(() => expect(screen.getByTestId('title-action-list')).toBeTruthy())
    expect(screen.getByTestId('title-action-list').hasAttribute('data-active')).toBe(false)

    fireEvent.click(screen.getByTestId('title-action-list'))
    await waitFor(() => expect(screen.getByTestId('title-action-list').hasAttribute('data-active')).toBe(true))
    expect(getWatchlist().map((entry) => entry.tmdbId)).toEqual(['1084244'])

    fireEvent.click(screen.getByTestId('title-action-list'))
    await waitFor(() => expect(screen.getByTestId('title-action-list').hasAttribute('data-active')).toBe(false))
    expect(getWatchlist()).toHaveLength(0)
  })

  it('en serie får säsongsväljare och spelbara avsnitt', async () => {
    mount(SERIES)
    await waitFor(() => expect(screen.getByTestId('title-seasons')).toBeTruthy())
    expect(screen.getByTestId('season-1')).toBeTruthy()
    expect(screen.getByTestId('season-2')).toBeTruthy()
    // Första säsongen är vald, så bara dess avsnitt listas.
    expect(screen.getAllByTestId('title-episode')).toHaveLength(2)

    fireEvent.click(screen.getByTestId('season-2'))
    await waitFor(() => expect(screen.getAllByTestId('title-episode')).toHaveLength(1))

    fireEvent.click(screen.getAllByTestId('title-episode')[0])
    await waitFor(() => expect(screen.getByTestId('app-player')).toBeTruthy())
    expect(screen.getByTestId('app-player').getAttribute('data-url')).toBe('http://panel/series/u/p/201.mkv')
  })

  it('en titel utan tmdb-id visar panelens uppgifter och går ändå att spela', async () => {
    mount({ ...MOVIE, tmdbId: undefined, title: 'UFC 244 PPV' })
    await waitFor(() => expect(screen.getByText('UFC 244 PPV')).toBeTruthy())
    // Ingen TMDB-identitet = ingen Min lista-knapp, men strömmen finns.
    expect(screen.queryByTestId('title-action-list')).toBeNull()
    fireEvent.click(screen.getByTestId('title-play'))
    await waitFor(() => expect(screen.getByTestId('app-player')).toBeTruthy())
  })

  it('säger ifrån när panelen inte skickade några avsnitt', async () => {
    mount(SERIES, { episodes: [] })
    await waitFor(() =>
      expect(screen.getByTestId('tv-library-title').textContent).toMatch(/no episodes|inga avsnitt/i),
    )
    // Utan avsnitt finns inget att spela, så knappen ska inte lova något.
    expect(screen.queryByTestId('title-play')).toBeNull()
  })
})
