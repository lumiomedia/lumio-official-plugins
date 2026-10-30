import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'
import { SEARCH_POSTERS_VISIBLE, VodHit } from './tv-search'
import { dp } from './tv-ui'

const now = Date.now()
const ch = (name: string, tvgId: string | null = null) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId })
const list: LiveTvList = { id: 'l1', name: 'X', channels: [ch('Sky Sports', 'sky.tv'), ch('ESPN')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = { index: { 'sky.tv': [{ title: 'Golf Tonight', start: now + 60_000, stop: now + 120_000 }, { title: 'Golf Live', start: now - 30 * 60_000, stop: now + 30 * 60_000 }] }, fetchedAt: now, sources: [] }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache: cache })
})

/** Programsökningen är fördröjd 150 ms; kanalsökningen är det inte. */
const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 200)) }) }

describe('TvSearch', () => {
  it('tangenttryck filtrerar kanaler och program; OK på en träff öppnar nya guiden fokuserad på kanalen', async () => {
    const onNavigate = vi.fn()
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'search' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
    fireEvent.click(screen.getByText('g'))
    await settle()
    expect(within(screen.getByTestId('search-programmes')).getByText('Golf Tonight')).toBeInTheDocument()
    expect(screen.getAllByTestId('search-suggestion').some((el) => el.textContent === 'Golf Tonight')).toBe(true)
    fireEvent.click(screen.getByText('o'))
    fireEvent.click(screen.getByText('l'))
    fireEvent.click(screen.getByText('f'))
    await settle()
    expect(screen.getByTestId('search-channels')).toHaveTextContent('No results')
    fireEvent.click(within(screen.getByTestId('search-programmes')).getByText('Golf Tonight').closest('[data-f]')!)
    // Kanalsidan är den gamla vyn; sökträffar går till guide v2 (Jerry 2026-10-30).
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ view: 'guide', channel: expect.stringContaining('Sky Sports') }) }))
  })
  it('kanalträffarna kommer direkt, programträffarna först efter fördröjningen', async () => {
    // Varje bokstav körde tidigare om HELA programgenomsökningen (dagens tablå
    // per kanal) synkront — på TV skrivs frågan med fjärrkontrollen och
    // tangentbordet hakade upp sig mellan trycken. Kanallistan är billig och
    // ska fortsätta svara direkt.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'search' }} onNavigate={() => {}} onOpenDetails={() => {}} />)
      // 'o' matchar både kanalen "Sky Sports" och programmet "Golf Tonight".
      fireEvent.click(screen.getByText('o'))
      // Kanalen syns omedelbart …
      expect(screen.getByTestId('search-channels')).toHaveTextContent('Sky Sports')
      // … men programsektionen har ännu inte frågat appen för den nya frågan.
      expect(screen.getByTestId('search-programmes')).not.toHaveTextContent('Golf Tonight')
      await act(async () => { vi.advanceTimersByTime(150) })
      await flushLiveTvIndex()
      expect(within(screen.getByTestId('search-programmes')).getByText('Golf Tonight')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})

/**
 * Söket är en lodrät stapel: sökraden (fält + förslag, på TV även
 * skärmtangentbordet) överst i full bredd, resultaten under den — inte längre
 * en inboxad vänsterspalt med resultaten till höger.
 */
describe('TvSearch: sökraden överst, resultaten under', () => {
  const searchProps = { pageId: 'live-tv-browse', params: { view: 'search' }, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
  const expectStacked = () => {
    const root = screen.getByTestId('search-view-root')
    const top = screen.getByTestId('search-top')
    const results = screen.getByTestId('search-results')
    // Ingen sidopanel kvar.
    expect(screen.queryByTestId('search-query-col')).toBeNull()
    // Sökraden kommer före resultaten i dokumentordning …
    expect(top.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // … de är syskon i samma stapel, och stapeln är lodrät.
    expect(top.parentElement).toBe(results.parentElement)
    expect(top.parentElement).toBe(root)
    expect(root.style.flexDirection).toBe('column')
    // Resultaten innehåller filterchipsen och sektionerna, sökraden gör det inte.
    expect(within(results).getByTestId('search-scope-all')).toBeInTheDocument()
    expect(within(results).getByTestId('search-channels')).toBeInTheDocument()
    expect(within(results).getByTestId('search-programmes')).toBeInTheDocument()
    expect(within(top).queryByTestId('search-channels')).toBeNull()
    return { top, results }
  }

  it('TV: fält, förslag och skärmtangentbord i sökraden; exakt en data-init', async () => {
    render(<LiveTvTvShell {...searchProps} />)
    await flushLiveTvIndex()
    const { top, results } = expectStacked()
    expect(top.querySelector('[data-live-tv-keyboard]')).not.toBeNull()
    expect(results.querySelector('[data-live-tv-keyboard]')).toBeNull()
    fireEvent.click(screen.getByText('g'))
    await settle()
    expect(within(top).getAllByTestId('search-suggestion').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('skrivbord: det riktiga fältet ligger i sökraden, resultaten under', async () => {
    __setTvModeForTests(false)
    render(<LiveTvTvShell {...searchProps} />)
    await flushLiveTvIndex()
    const { top } = expectStacked()
    const input = top.querySelector('input')!
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: 'sky' } })
    expect(within(screen.getByTestId('search-results')).getByTestId('search-channels')).toHaveTextContent('Sky Sports')
  })
})

/**
 * Fas 3, Task 10: sök på telefon är nu en egen vy (`TvSearchPhone`,
 * `mobile/search-phone.tsx`, testad i `mobile/search-phone.test.tsx`), inte
 * längre skrivbordsvyn med `phone ? … : …`-stilar. De två gamla testerna som
 * stod här körde det tidigare porträttlayoutet (`search-view-root`/
 * `search-query-col` staplat, fixrunda 2 FYND 2) och MOTSÄGER den nya specen
 * (handoffen §7: systemtangentbord, två resultatgrupper, centrerat tomt
 * läge) — ersatta av detta enda testet: på telefon renderas telefonvyn,
 * aldrig skrivbordets DOM.
 */
describe('TvSearch på telefon: grenar till TvSearchPhone', () => {
  // En telefon är aldrig en TV: skalet gatar `phone` med `!isTv` (fas 3 ger
  // vyerna `phone` som prop härifrån (`TvViewProps`)), så
  // telefonblocket kör utanför TV-läget som filens beforeEach annars slår på.
  beforeEach(() => __setTvModeForTests(false))
  let box: HTMLElement | null = null
  afterEach(() => { box?.remove(); box = null })

  it('telefon: TvSearchPhones input, inte skrivbordets search-view-root', async () => {
    box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
    document.body.appendChild(box)
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'search' }} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
    await flushLiveTvIndex()
    expect(within(box).getByTestId('search-input')).toBeInTheDocument()
    expect(within(box).queryByTestId('search-view-root')).toBeNull()
  })
})

/**
 * Jerry 2026-10-30: affischerna i "Film & serier" lite mindre (≈ 80 %), och
 * "Program i dag" ska se ut som guidens rader — kanalcell med logoplatta,
 * programcell med tidsintervall och, för det som sänds nu, förlopp.
 */
describe('TvSearch: mindre affischer, programträffar som guiderader', () => {
  const shellProps = { pageId: 'live-tv-browse', params: { view: 'search' }, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
  it('VOD-affischen tar en andel av raden — 7,5 synliga oavsett bredd (TV-scen och fönster) — och behåller 2:3', () => {
    render(<VodHit item={{ key: 'k', title: 'Alien', year: 1979, posterUrl: null } as never} onOpen={() => {}} />)
    const hit = screen.getByTestId('search-vod-hit')
    // happy-dom tappar calc() i inline-stilar; andelen läses ur attributet.
    expect(hit.getAttribute('data-visible')).toBe(String(SEARCH_POSTERS_VISIBLE))
    expect(SEARCH_POSTERS_VISIBLE).toBe(7.5)
    expect(screen.getByTestId('search-vod-poster').style.aspectRatio).toBe('2 / 3')
    expect(hit).toHaveTextContent('Alien')
    expect(hit).toHaveTextContent('1979')
  })

  it('en programträff har guidens kanalcell (logoplatta) och ett tidsintervall', async () => {
    render(<LiveTvTvShell {...shellProps} />)
    fireEvent.click(screen.getByText('g'))
    await settle()
    const hit = within(screen.getByTestId('search-programmes')).getByText('Golf Tonight').closest('[data-testid="search-programme-hit"]') as HTMLElement
    expect(hit).not.toBeNull()
    expect(within(hit).getByTestId('logo-plate')).toBeInTheDocument()
    expect(hit).toHaveTextContent('Sky Sports')
    const cell = within(hit).getByTestId('search-programme-cell')
    expect(cell.getAttribute('data-v2f')).toBe('inset')
    expect(within(hit).getByTestId('search-programme-time').textContent).toMatch(/\d{2}.\d{2}–\d{2}.\d{2}/)
    // Framtida program: inget förlopp.
    expect(within(hit).queryByTestId('search-programme-progress')).toBeNull()
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('ett program som sänds nu visar förlopp och "min kvar"', async () => {
    render(<LiveTvTvShell {...shellProps} />)
    fireEvent.click(screen.getByText('g'))
    await settle()
    const hit = within(screen.getByTestId('search-programmes')).getByText('Golf Live').closest('[data-testid="search-programme-hit"]') as HTMLElement
    const bar = within(hit).getByTestId('search-programme-progress')
    expect(parseInt(bar.style.width, 10)).toBeGreaterThanOrEqual(45)
    expect(parseInt(bar.style.width, 10)).toBeLessThanOrEqual(55)
    expect(hit).toHaveTextContent(/30 min/)
  })
})

/**
 * Jerry 2026-10-30: kanalträffarna ("Kanaler") ska också se ut som guiden —
 * kanalcell till vänster, programcell för det som sänds NU till höger.
 */
describe('TvSearch: kanalträffar som guiderader', () => {
  // Filens delade fixtur är osorterad och överlappande — nu/nästa-uppslaget
  // söker binärt och kräver en sorterad tablå.
  beforeEach(() => {
    seedLiveTvIndex({ cache: { index: { 'sky.tv': [{ title: 'Golf Live', start: now - 30 * 60_000, stop: now + 30 * 60_000 }, { title: 'Golf Tonight', start: now + 30 * 60_000, stop: now + 90 * 60_000 }] }, fetchedAt: now, sources: [] } })
  })
  const shellProps = (onNavigate: () => void = () => {}) => ({ pageId: 'live-tv-browse', params: { view: 'search' }, onNavigate, onOpenDetails: () => {} }) as unknown as ComponentProps<typeof LiveTvTvShell>
  const channelHit = (name: string) => within(screen.getByTestId('search-channels')).getByText(name).closest('[data-testid="search-channel-hit"]') as HTMLElement

  it('kanalcell + nu-cell med tidsintervall, förlopp och "min kvar" när något sänds', async () => {
    render(<LiveTvTvShell {...shellProps()} />)
    fireEvent.click(screen.getByText('s'))
    fireEvent.click(screen.getByText('k'))
    fireEvent.click(screen.getByText('y'))
    await flushLiveTvIndex()
    await settle()
    const hit = channelHit('Sky Sports')
    expect(hit).not.toBeNull()
    expect(within(hit).getByTestId('guide-channel-v2')).toBeInTheDocument()
    expect(within(hit).getByTestId('logo-plate')).toBeInTheDocument()
    const cell = within(hit).getByTestId('search-channel-now-cell')
    expect(cell.getAttribute('data-v2f')).toBe('inset')
    expect(cell).toHaveTextContent('Golf Live')
    expect(within(hit).getByTestId('search-programme-time').textContent).toMatch(/\d{2}.\d{2}–\d{2}.\d{2}/)
    const bar = within(hit).getByTestId('search-programme-progress')
    expect(parseInt(bar.style.width, 10)).toBeGreaterThanOrEqual(45)
    expect(parseInt(bar.style.width, 10)).toBeLessThanOrEqual(55)
    expect(hit).toHaveTextContent(/30 min/)
    expect(within(hit).getByTestId('search-channel-next')).toHaveTextContent('Golf Tonight')
    expect(hit.style.height).toBe(`${dp(76)}px`)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('kanal utan tablå: neutral cell med "ingen programinformation"', async () => {
    render(<LiveTvTvShell {...shellProps()} />)
    fireEvent.click(screen.getByText('e'))
    fireEvent.click(screen.getByText('s'))
    fireEvent.click(screen.getByText('p'))
    await flushLiveTvIndex()
    await settle()
    const hit = channelHit('ESPN')
    const cell = within(hit).getByTestId('search-channel-now-cell')
    expect(cell).toHaveTextContent('No programme information')
    expect(within(hit).queryByTestId('search-programme-time')).toBeNull()
    expect(within(hit).queryByTestId('search-programme-progress')).toBeNull()
  })

  it('OK på nu-cellen öppnar guiden fokuserad på kanalen', async () => {
    const onNavigate = vi.fn()
    render(<LiveTvTvShell {...shellProps(onNavigate)} />)
    fireEvent.click(screen.getByText('e'))
    fireEvent.click(screen.getByText('s'))
    fireEvent.click(screen.getByText('p'))
    await flushLiveTvIndex()
    await settle()
    fireEvent.click(within(channelHit('ESPN')).getByTestId('search-channel-now-cell'))
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ view: 'guide', channel: expect.stringContaining('ESPN') }) }))
  })
})
