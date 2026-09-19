import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson, TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR } from '@/lib/plugin-sdk'
import { seedLiveTvIndex, type VodItemFixture } from '../../src/__test-stubs__/live-tv-index'
import { getLiveTvUrlsKey, LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { ACTIVE_PLAYLIST_KEY } from './tv-settings-store'
import { getVodMode, setVodMode } from '../vod-data'
import { getLiveTvLists, getXtreamLogins } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

const URL_A = 'http://panel/get.php'
const SOURCE = getLiveTvUrlsKey([URL_A])

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = {
  id: 'l1',
  name: 'Xtream 1',
  kind: 'm3u',
  source: SOURCE,
  url: URL_A,
  channels: [ch('A')],
  createdAt: '',
  urlTvg: null,
  epgUrls: [],
  autoEpgDisabled: false,
  fetchedAt: null,
}

function movie(n: number, title: string, cat: [string, string], extra: Partial<VodItemFixture> = {}): VodItemFixture {
  return {
    key: `vod:${n}`,
    kind: 'movie',
    title,
    categoryId: cat[0],
    categoryName: cat[1],
    addedAt: n,
    url: `http://panel/movie/u/p/${n}.mkv`,
    ...extra,
  }
}

function series(n: number, title: string, cat: [string, string], extra: Partial<VodItemFixture> = {}): VodItemFixture {
  return { key: `series:${n}`, kind: 'series', title, categoryId: cat[0], categoryName: cat[1], addedAt: n, ...extra }
}

const SWEDISH: [string, string] = ['5', 'MOVIE: Swedish']
const HBO: [string, string] = ['7', 'MOVIE: HBO']
const NETFLIX: [string, string] = ['9', 'SERIES: Netflix']

const LIBRARY: VodItemFixture[] = [
  movie(1, 'Dune', SWEDISH, { tmdbId: 438631, year: 2021, rating: 8.2 }),
  movie(2, 'Barbie', SWEDISH, { tmdbId: 346698, year: 2023 }),
  movie(3, 'Oppenheimer', HBO, { tmdbId: 872585 }),
  series(4, 'Dark', NETFLIX, { tmdbId: 70523 }),
]

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, 'l1')
})

function mount(opts: { vod?: VodItemFixture[]; importing?: boolean } = {}) {
  seedLiveTvIndex({
    ...(opts.vod ? { vod: { [SOURCE]: opts.vod } } : {}),
    ...(opts.importing ? { vodImporting: true } : {}),
  })
  const onNavigate = vi.fn()
  render(
    <LiveTvTvShell pageId="live-tv-browse" params={{ view: 'library' }} onNavigate={onNavigate} onOpenDetails={() => {}} />,
  )
  return onNavigate
}

const categoryNames = () => screen.getAllByTestId('library-category').map((el) => el.textContent)
const cardTitles = () => screen.getAllByTestId('library-card').map((el) => el.textContent)

describe('TvLibrary', () => {
  it('visar panelens kategorinamn ordagrant, film före serier', async () => {
    mount({ vod: LIBRARY })
    await waitFor(() => expect(screen.getAllByTestId('library-category').length).toBe(3))
    // Prefixet MOVIE:/SERIES: står kvar — användaren känner igen dem från sitt konto.
    expect(categoryNames()).toEqual(['MOVIE: HBO1', 'MOVIE: Swedish2', 'SERIES: Netflix1'])
    // Stubben kör engelska, som resten av vy-sviten.
    expect(screen.getByText('FILM')).toBeTruthy()
    expect(screen.getByText('SERIES')).toBeTruthy()
  })

  it('öppnar första kategorin och visar dess titlar', async () => {
    mount({ vod: LIBRARY })
    await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBe(1))
    // Första kategorin i ordningen är MOVIE: HBO, som har en titel.
    expect(cardTitles()[0]).toContain('Oppenheimer')
  })

  it('byter kategori och hämtar om rutnätet', async () => {
    mount({ vod: LIBRARY })
    await waitFor(() => expect(screen.getAllByTestId('library-category').length).toBe(3))
    fireEvent.click(screen.getAllByTestId('library-category')[1])
    await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBe(2))
    expect(cardTitles().join('|')).toContain('Dune')
    expect(cardTitles().join('|')).toContain('Barbie')
  })

  it('sorterar om i värden när ett chip väljs', async () => {
    mount({ vod: LIBRARY })
    await waitFor(() => expect(screen.getAllByTestId('library-category').length).toBe(3))
    fireEvent.click(screen.getAllByTestId('library-category')[1])
    await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBe(2))
    // "Senast tillagda" är standard: Barbie (2) före Dune (1).
    expect(cardTitles()[0]).toContain('Barbie')
    fireEvent.click(screen.getByTestId('library-sort-az'))
    await waitFor(() => expect(cardTitles()[0]).toContain('Barbie'))
    fireEvent.click(screen.getByTestId('library-sort-rating'))
    await waitFor(() => expect(cardTitles()[0]).toContain('Dune'))
  })

  it('märker serier som serier och film som film', async () => {
    mount({ vod: LIBRARY })
    await waitFor(() => expect(screen.getAllByTestId('library-category').length).toBe(3))
    fireEvent.click(screen.getAllByTestId('library-category')[2])
    await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBe(1))
    expect(screen.getByTestId('library-card').querySelector('[data-vod-kind="series"]')).toBeTruthy()
  })

  it('OK öppnar appens detaljvy med tmdb-id:t', async () => {
    mount({ vod: LIBRARY })
    await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBe(1))
    const opened: unknown[] = []
    const handler = (event: Event) => opened.push((event as CustomEvent).detail)
    window.addEventListener('lumio-open-media-item', handler)
    try {
      fireEvent.click(screen.getByTestId('library-card'))
    } finally {
      window.removeEventListener('lumio-open-media-item', handler)
    }
    expect(opened).toHaveLength(1)
    expect(opened[0]).toMatchObject({ item: { id: 'movie-872585', title: 'Oppenheimer' } })
  })

  it('säger ifrån i stället för att göra ingenting när panelen saknar tmdb-id', async () => {
    mount({ vod: [movie(1, 'UFC 244 PPV', SWEDISH)] })
    await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBe(1))
    const opened: unknown[] = []
    const handler = () => opened.push(1)
    window.addEventListener('lumio-open-media-item', handler)
    try {
      fireEvent.click(screen.getByTestId('library-card'))
    } finally {
      window.removeEventListener('lumio-open-media-item', handler)
    }
    expect(opened).toHaveLength(0)
    // Tysta misslyckanden är värre än ett felmeddelande: användaren ska få veta.
    expect(await screen.findByText(/ingen matchning|no match/i)).toBeTruthy()
  })

  it('skiljer "hämtar" från "panelen har ingen film"', async () => {
    mount({ importing: true })
    await waitFor(() => expect(screen.getByTestId('library-status')).toBeTruthy())
    expect(screen.getByTestId('library-status').textContent).toMatch(/Hämtar|Fetching/)
  })

  it('säger att spellistan saknar VOD först när den vet det', async () => {
    mount({ vod: [] })
    await waitFor(() => expect(screen.getByTestId('library-status').textContent).toMatch(/ingen film|no film/i))
  })

  it('sätter exakt en startpunkt för fjärren', async () => {
    mount({ vod: LIBRARY })
    await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBe(1))
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('Sök-knappen öppnar söket med film och serier förvalt', async () => {
    const onNavigate = mount({ vod: LIBRARY })
    await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBe(1))
    fireEvent.click(screen.getByTestId('library-search'))
    expect(onNavigate).toHaveBeenCalledWith({
      pageId: 'live-tv-browse',
      params: { view: 'search', scope: 'vod' },
    })
  })
})

describe('Inställningar → Innehåll', () => {
  function mountSettings(vod: VodItemFixture[]) {
    seedLiveTvIndex({ vod: { [SOURCE]: vod } })
    const onNavigate = vi.fn()
    render(
      <LiveTvTvShell
        pageId="live-tv-browse"
        params={{ view: 'settings', tab: 'content' }}
        onNavigate={onNavigate}
        onOpenDetails={() => {}}
      />,
    )
    return onNavigate
  }

  it('räknar spellistans titlar på riktigt', async () => {
    mountSettings(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('settings-content').textContent).toContain('4 titles'))
  })

  it('säger ifrån när spellistan inte har någon VOD', async () => {
    mountSettings([])
    await waitFor(() => expect(screen.getByTestId('settings-content').textContent).toMatch(/no film|ingen film/i))
  })

  it('börjar på Endast Live TV och byter läge per spellista', async () => {
    mountSettings(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('vod-mode-link')).toBeTruthy())
    expect(screen.getByTestId('vod-mode-link').hasAttribute('data-active')).toBe(true)

    fireEvent.click(screen.getByTestId('vod-mode-rows'))
    await waitFor(() => expect(screen.getByTestId('vod-mode-rows').hasAttribute('data-active')).toBe(true))
    expect(screen.getByTestId('vod-mode-link').hasAttribute('data-active')).toBe(false)
    expect(getVodMode('l1')).toBe('rows')
  })

  it('har alla tre lägena', async () => {
    mountSettings(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('vod-mode-link')).toBeTruthy())
    expect(screen.getByTestId('vod-mode-rows')).toBeTruthy()
    expect(screen.getByTestId('vod-mode-off')).toBeTruthy()
  })

  it('ligger mellan Utseende och Spellistor', async () => {
    mountSettings(LIBRARY)
    const tabs = screen.getAllByTestId(/^tab-/).map((el) => el.getAttribute('data-testid'))
    expect(tabs).toEqual(['tab-appearance', 'tab-content', 'tab-playlists', 'tab-epg', 'tab-parental'])
  })
})

describe('Hubbens VOD-avsnitt', () => {
  function mountHub(vod: VodItemFixture[]) {
    seedLiveTvIndex({ vod: { [SOURCE]: vod } })
    const onNavigate = vi.fn()
    render(
      <LiveTvTvShell pageId="live-tv-browse" params={{ view: 'hub' }} onNavigate={onNavigate} onOpenDetails={() => {}} />,
    )
    return onNavigate
  }

  it('visar hänvisningsraden som standard, inte titlarna', async () => {
    mountHub(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('hub-vod-link')).toBeTruthy())
    expect(screen.queryByTestId('hub-vod-row')).toBeNull()
    expect(screen.getByTestId('hub-vod-link').textContent).toContain('4')
  })

  it('hänvisningsraden går till Inställningar → Innehåll', async () => {
    const onNavigate = mountHub(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('hub-vod-link')).toBeTruthy())
    fireEvent.click(screen.getByTestId('hub-vod-link').firstElementChild as HTMLElement)
    expect(onNavigate).toHaveBeenCalledWith({
      pageId: 'live-tv-browse',
      params: { view: 'settings', tab: 'content' },
    })
  })

  it('läget rows ger en rad med film före serier', async () => {
    setVodMode('l1', 'rows')
    mountHub(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('hub-vod-row')).toBeTruthy())
    const cards = screen.getAllByTestId('hub-vod-card')
    expect(cards).toHaveLength(4)
    // Film först, serier sist — raden ska kännas ordnad.
    expect(cards[3].querySelector('[data-vod-kind="series"]')).toBeTruthy()
    expect(cards[0].querySelector('[data-vod-kind="movie"]')).toBeTruthy()
    expect(screen.queryByTestId('hub-vod-link')).toBeNull()
  })

  it('läget off döljer allt om VOD i Live TV', async () => {
    setVodMode('l1', 'off')
    mountHub(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('rail-hub')).toBeTruthy())
    expect(screen.queryByTestId('hub-vod-link')).toBeNull()
    expect(screen.queryByTestId('hub-vod-row')).toBeNull()
  })

  it('visar ingenting alls när spellistan saknar VOD', async () => {
    mountHub([])
    await waitFor(() => expect(screen.getByTestId('rail-hub')).toBeTruthy())
    // En hänvisningsrad som säger "0 titlar" är värre än ingen rad.
    expect(screen.queryByTestId('hub-vod-link')).toBeNull()
  })
})

describe('Sök med film & serier', () => {
  function mountSearch(vod: VodItemFixture[], params: Record<string, string> = {}) {
    seedLiveTvIndex({ vod: { [SOURCE]: vod } })
    const onNavigate = vi.fn()
    render(
      <LiveTvTvShell
        pageId="live-tv-browse"
        params={{ view: 'search', ...params }}
        onNavigate={onNavigate}
        onOpenDetails={() => {}}
      />,
    )
    return onNavigate
  }

  it('visar de tre omfången', async () => {
    mountSearch(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('search-scope-all')).toBeTruthy())
    expect(screen.getByTestId('search-scope-ch')).toBeTruthy()
    expect(screen.getByTestId('search-scope-vod')).toBeTruthy()
    expect(screen.getByTestId('search-scope-all').hasAttribute('data-active')).toBe(true)
  })

  it('öppnas med film & serier förvalt från Biblioteket', async () => {
    mountSearch(LIBRARY, { scope: 'vod' })
    await waitFor(() => expect(screen.getByTestId('search-scope-vod').hasAttribute('data-active')).toBe(true))
    // Omfånget "Film & serier" döljer kanalerna helt.
    expect(screen.queryByTestId('search-channels')).toBeNull()
  })

  it('Kanaler döljer VOD-avsnittet', async () => {
    mountSearch(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('search-vod')).toBeTruthy())
    fireEvent.click(screen.getByTestId('search-scope-ch'))
    await waitFor(() => expect(screen.queryByTestId('search-vod')).toBeNull())
    expect(screen.getByTestId('search-channels')).toBeTruthy()
  })

  it('söker i biblioteket och öppnar träffen i detaljvyn', async () => {
    mountSearch(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('search-vod')).toBeTruthy())
    // TV-läget har inget <input> — frågan skrivs på skärmtangentbordet.
    for (const letter of ['d', 'u', 'n', 'e']) fireEvent.click(screen.getByText(letter))
    await waitFor(() => expect(screen.getAllByTestId('search-vod-hit')).toHaveLength(1))

    const opened: unknown[] = []
    const handler = (event: Event) => opened.push((event as CustomEvent).detail)
    window.addEventListener('lumio-open-media-item', handler)
    try {
      fireEvent.click(screen.getByTestId('search-vod-hit'))
    } finally {
      window.removeEventListener('lumio-open-media-item', handler)
    }
    expect(opened[0]).toMatchObject({ item: { id: 'movie-438631' } })
  })

  it('läget off tar bort både chips och VOD-avsnitt', async () => {
    setVodMode('l1', 'off')
    mountSearch(LIBRARY)
    await waitFor(() => expect(screen.getByTestId('search-channels')).toBeTruthy())
    expect(screen.queryByTestId('search-scope-all')).toBeNull()
    expect(screen.queryByTestId('search-vod')).toBeNull()
  })
})

describe('Biblioteket på smal yta', () => {
  it('byter kategorikolumnen mot en chipsrad och rutnätet till två kolumner', async () => {
    // Smal yta signaleras av värdens scenlåda, inte av window.innerWidth.
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    document.body.appendChild(box)
    try {
      seedLiveTvIndex({ vod: { [SOURCE]: LIBRARY } })
      render(
        <LiveTvTvShell
          pageId="live-tv-browse"
          params={{ view: 'library' }}
          onNavigate={vi.fn()}
          onOpenDetails={() => {}}
        />,
      )
      await waitFor(() => expect(screen.getAllByTestId('library-card').length).toBeGreaterThan(0))
      const grid = screen.getAllByTestId('library-card')[0].parentElement as HTMLElement
      expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
      // Sektionsrubrikerna faller bort på telefonen — höjden är dyrast där.
      expect(screen.queryByText('FILM')).toBeNull()
    } finally {
      box.remove()
    }
  })
})

describe('Radera Xtream-konto', () => {
  const ORPHAN_LOGIN = { id: 'login-orphan', base: 'http://gammal.example', username: 'u', password: 'p', format: 'ts', categoryIds: [] }
  const USED_LOGIN = { id: 'login-used', base: 'http://panel', username: 'u', password: 'p', format: 'ts', categoryIds: [] }

  function mountPlaylists() {
    seedLiveTvIndex({ vod: { [SOURCE]: LIBRARY } })
    render(
      <LiveTvTvShell
        pageId="live-tv-browse"
        params={{ view: 'settings', tab: 'playlists' }}
        onNavigate={vi.fn()}
        onOpenDetails={() => {}}
      />,
    )
  }

  beforeEach(() => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, kind: 'xtream', xtreamLoginId: 'login-used' }])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [USED_LOGIN, ORPHAN_LOGIN])
  })

  it('visar även konton som inte har någon spellista', async () => {
    mountPlaylists()
    await waitFor(() => expect(screen.getByTestId('xtream-account-login-orphan')).toBeTruthy())
    // Det var precis de här som inte gick att bli av med.
    expect(screen.getByTestId('xtream-account-login-orphan').textContent).toMatch(/without a playlist|utan spellista/i)
    expect(screen.getByTestId('xtream-account-login-used').textContent).not.toMatch(/without a playlist|utan spellista/i)
  })

  it('varje konto har en raderingsknapp', async () => {
    mountPlaylists()
    await waitFor(() => expect(screen.getByTestId('xtream-remove-login-orphan')).toBeTruthy())
    expect(screen.getByTestId('xtream-remove-login-used')).toBeTruthy()
  })

  it('raderingen tar bort kontot ur lagringen', async () => {
    mountPlaylists()
    await waitFor(() => expect(screen.getByTestId('xtream-remove-login-orphan')).toBeTruthy())
    fireEvent.click(screen.getByTestId('xtream-remove-login-orphan'))
    await waitFor(() => expect(screen.queryByTestId('xtream-account-login-orphan')).toBeNull())
    expect(getXtreamLogins().map((l) => l.id)).toEqual(['login-used'])
  })

  it('raderar man kontot med spellista följer spellistan med', async () => {
    mountPlaylists()
    await waitFor(() => expect(screen.getByTestId('xtream-remove-login-used')).toBeTruthy())
    fireEvent.click(screen.getByTestId('xtream-remove-login-used'))
    await waitFor(() => expect(getXtreamLogins().map((l) => l.id)).toEqual(['login-orphan']))
    // Ett konto utan sin lista lämnar en lista som inte går att hämta.
    expect(getLiveTvLists().filter((entry) => entry.xtreamLoginId === 'login-used')).toHaveLength(0)
  })
})
