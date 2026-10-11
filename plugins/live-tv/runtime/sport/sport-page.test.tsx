import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup as cleanupAll, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { BROWSE_BACK_EVENT } from '@/lib/plugin-sdk'
import { localDayKey } from './sport-epg'
import { setSportSettings } from './sport-store'
import { MIN, HOUR, fxMatch, mountSport } from './__sport-fixture'
import { LiveTvPlugin } from '../index'
import { SPORT_PAGE_ID } from './sport-page'
import { sportViewPaddingTop } from './tv/sport-shell'

// Spelaren som en knapp: ett klick är "stäng spelaren".
vi.mock('../live-tv-player', () => ({
  LiveTvPlayer: ({ channel, onClose }: { channel: { name: string }; onClose: () => void }) => <button type="button" data-testid="player" onClick={onClose}>{channel.name}</button>,
}))

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })

const backSpy = () => {
  const spy = vi.fn()
  window.addEventListener(BROWSE_BACK_EVENT, spy)
  afterEach(() => window.removeEventListener(BROWSE_BACK_EVENT, spy))
  return spy
}
const pressBack = () => fireEvent.keyDown(window, { key: 'Escape' })

describe('Sport som egen sida: registreringen', () => {
  it('egen bläddringssida + menyval med samma id, av som standard, med Live TV:s scenlåda och utan hero', () => {
    const pages: Array<Record<string, unknown>> = []
    const items: Array<Record<string, unknown>> = []
    LiveTvPlugin.register({
      registerBootstrap: () => {},
      registerSettingsSection: () => {},
      registerHomeOverride: () => {},
      registerBrowsePage: (page: Record<string, unknown>) => { pages.push(page) },
      registerMainMenuItem: (item: Record<string, unknown>) => { items.push(item) },
    } as never)
    const page = pages.find((p) => p.id === SPORT_PAGE_ID)
    expect(SPORT_PAGE_ID).toBe('live-tv-sport')
    expect(page).toMatchObject({ label: { en: 'Sport', sv: 'Sport' }, hideHero: true, tvSceneBox: true })
    expect(items).toEqual([expect.objectContaining({ id: SPORT_PAGE_ID, label: { en: 'Sport', sv: 'Sport' }, target: { pageId: SPORT_PAGE_ID }, defaultEnabled: false })])
  })
  it('en äldre värd utan menyval registrerar ändå sidan', () => {
    const pages: Array<Record<string, unknown>> = []
    expect(() => LiveTvPlugin.register({
      registerBootstrap: () => {},
      registerSettingsSection: () => {},
      registerHomeOverride: () => {},
      registerBrowsePage: (page: Record<string, unknown>) => { pages.push(page) },
    } as never)).not.toThrow()
    expect(pages.map((p) => p.id)).toContain(SPORT_PAGE_ID)
  })
})

describe('Sport som egen sida: skrivbord/TV', () => {
  it('öppnar Sport direkt utan params — ingen ikonrad, ingen omdirigering till VOD-hemmet', async () => {
    const { onNavigate } = mountSport({}, { page: true, days: { [today]: [live] } })
    expect(await screen.findByTestId('sport-hero')).toBeInTheDocument()
    expect(document.querySelector('[data-live-tv-tv-root]')).not.toBeNull()
    expect(screen.queryByTestId('tv-rail')).toBeNull()
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('Titta spelar här; när spelaren stängs står man kvar på Sport, inte i Live TV', async () => {
    const { onNavigate } = mountSport({}, { page: true, days: { [today]: [live] } })
    fireEvent.click(await screen.findByTestId('sport-hero-watch'))
    const player = await screen.findByTestId('player')
    expect(player).toHaveTextContent('TV4 Fotboll FHD SE')
    fireEvent.click(player)
    expect(screen.queryByTestId('player')).toBeNull()
    expect(screen.getByTestId('sport-stage')).toBeInTheDocument()
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('Bakåt i Sports rot lämnar sidan som andra sidor (värdens bakåt), aldrig till Live TV:s hubb', async () => {
    const back = backSpy()
    const { onNavigate } = mountSport({}, { page: true, days: { [today]: [live] } })
    await screen.findByTestId('sport-hero')
    pressBack()
    expect(back).toHaveBeenCalledTimes(1)
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('Bakåt stänger matchcentret först, sedan lämnar den sidan', async () => {
    const back = backSpy()
    mountSport({}, { page: true, days: { [today]: [live, later] } })
    await screen.findByTestId('sport-hero')
    fireEvent.click(within(screen.getByTestId('sport-strip')).getAllByTestId('sport-card').find((c) => c.getAttribute('data-match-id') === 'later')!)
    expect(await screen.findByTestId('match-center')).toBeInTheDocument()
    pressBack()
    await waitFor(() => expect(screen.queryByTestId('match-center')).toBeNull())
    expect(back).not.toHaveBeenCalled()
    pressBack()
    expect(back).toHaveBeenCalledTimes(1)
  })
  it('multivyn ritas på Sport-sidan, och Bakåt därifrån går tillbaka till Sport', async () => {
    const back = backSpy()
    const { onNavigate } = mountSport({ view: 'multi' }, { page: true, days: { [today]: [live] } })
    expect((await screen.findAllByTestId('mv-tile')).length).toBeGreaterThan(0)
    expect(screen.queryByTestId('tv-rail')).toBeNull()
    pressBack()
    expect(onNavigate).toHaveBeenCalledWith({ pageId: SPORT_PAGE_ID, params: { view: 'sport' } })
    expect(back).not.toHaveBeenCalled()
  })
  it('okänd vy i params blir Sport — sidan visar aldrig Live TV:s övriga vyer', async () => {
    mountSport({ view: 'guide' }, { page: true, days: { [today]: [live] } })
    expect(await screen.findByTestId('sport-hero')).toBeInTheDocument()
  })
})

describe('Sport som egen sida: telefon', () => {
  it('egen sida: rubriken är bara "Sport" — ingen Live TV-överrad, ingen pil, inget sektionsark', async () => {
    const { onNavigate } = mountSport({}, { page: true, phone: true, days: { [today]: [later] } })
    const title = await screen.findByTestId('sport-phone-title')
    expect(title.textContent).toBe('Sport')
    expect(title.getAttribute('aria-haspopup')).toBeNull()
    expect(title.querySelector('svg')).toBeNull()
    fireEvent.click(title)
    expect(screen.queryByTestId('sport-phone-sections')).toBeNull()
    expect(screen.queryByTestId('mobile-tab-bar')).toBeNull()
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('inne i Live TV är rubriken oförändrad: "Live TV" + "Sport ▾" med sektionsarket', async () => {
    mountSport({}, { phone: true, days: { [today]: [later] } })
    const title = await screen.findByTestId('sport-phone-title')
    expect(title).toHaveTextContent(/Live TV\s*Sport/i)
    fireEvent.click(title)
    expect(await screen.findByTestId('sport-phone-sections')).toBeInTheDocument()
  })
  it('Titta på telefonen spelar här och stängning landar på Sport', async () => {
    const live2 = fxMatch({ id: 'l2', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
    const { onNavigate } = mountSport({}, { page: true, phone: true, days: { [today]: [live2] } })
    fireEvent.click(await screen.findByTestId('sport-phone-hero-watch'))
    fireEvent.click(await screen.findByTestId('player'))
    expect(screen.getByTestId('sport-phone')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-tab-bar')).toBeNull()
    expect(onNavigate).not.toHaveBeenCalled()
  })
})

describe('Sport som egen sida: samma utseende som i Live TV', () => {
  const stageVar = (name: string) => screen.getByTestId('sport-stage').style.getPropertyValue(name)
  it('Standard-bakgrunden och kortens ton som i Live TV; ändrade inställningar slår igenom direkt', async () => {
    mountSport({}, { page: true, days: { [today]: [fxMatch({ id: 'a', start: now + HOUR })] } })
    const layer = await screen.findByTestId('sport-backdrop')
    expect(layer.getAttribute('data-backdrop')).toBe('standard')
    expect(stageVar('--sport-card-bg')).toMatch(/^rgba\(\d+, \d+, \d+, 0\.5\)$/)
    act(() => { setSportSettings({ cards: { opacity: 60, tone: 'gray' } }) })
    expect(stageVar('--sport-card-bg')).toBe('rgba(28, 29, 34, 0.6)')
    act(() => { setSportSettings({ backdrops: { all: 'off', sports: {} } }) })
    expect(screen.queryByTestId('sport-backdrop')).toBeNull()
    expect(stageVar('--sport-card-bg')).toBe('')
  })
  it('telefonen: samma bakgrund och kortval som Sport i Live TV', async () => {
    mountSport({}, { page: true, phone: true, days: { [today]: [fxMatch({ id: 'b', start: now + HOUR })] } })
    expect((await screen.findByTestId('sport-backdrop')).getAttribute('data-backdrop')).toBe('standard')
    act(() => { setSportSettings({ cards: { opacity: 60, tone: 'gray' } }) })
    expect(stageVar('--sport-card-bg')).toBe('rgba(28, 29, 34, 0.6)')
    expect(stageVar('--sport-card-blur')).toBe('blur(14px)')
  })
  it('Sports vyval (Matchdag/Flöde) är detsamma som i Live TV', async () => {
    mountSport({}, { page: true, phone: true, days: { [today]: [later] } })
    await screen.findByTestId('sport-phone-view-feed')
    act(() => { setSportSettings({ phoneView: 'feed' }) })
    expect(screen.getByTestId('sport-phone-view-feed').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('Sport som egen sida: under appens toppkrom (skrivbordet)', () => {
  it('ingen egen klocka i rubriken — värdens klocka står uppe till höger som på Hem', async () => {
    mountSport({}, { page: true, tv: false, days: { [today]: [live] } })
    await screen.findByTestId('sport-hero')
    expect(screen.queryByTestId('sport-clock')).toBeNull()
  })
  it('inne i Live TV och på TV har rubriken kvar sin klocka', async () => {
    mountSport({}, { tv: false, days: { [today]: [live] } })
    await screen.findByTestId('sport-hero')
    expect(screen.getByTestId('sport-clock')).toBeInTheDocument()
    cleanupAll()
    mountSport({}, { page: true, days: { [today]: [live] } })
    await screen.findByTestId('sport-hero')
    expect(screen.getByTestId('sport-clock')).toBeInTheDocument()
  })
  it('bakgrunden ligger i scenen utanför det indragna innehållet — bara innehållet flyttas', async () => {
    mountSport({}, { page: true, tv: false, days: { [today]: [fxMatch({ id: 'a', start: now + HOUR })] } })
    const layer = await screen.findByTestId('sport-backdrop')
    expect(layer.closest('[data-testid="sport-view"]')).toBeNull()
    expect(layer.parentElement).toBe(screen.getByTestId('sport-stage'))
    // Innehållets topp = rubrikens luft + värdens krom (0 när värden inte satt det).
    expect(sportViewPaddingTop()).toMatch(/^calc\(\d+(\.\d+)?px \+ var\(--tv-scene-chrome-inset, 0px\)\)$/)
  })
})
