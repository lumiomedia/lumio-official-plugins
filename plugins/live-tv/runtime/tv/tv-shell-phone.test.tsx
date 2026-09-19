import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

// Spelaren behöver inte finnas för att skalet ska ritas.
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

// Lådan som `render(page, { container })` skriver in i — måste bort i
// `afterEach`. En kvarglömd, tömd låda från ett tidigare test stör inte
// `screen`-frågor (som bara ser aktuellt innehåll), men `document.querySelector`
// gjorde det i ett tidigare uppdrag — se rapporten/fällan i M-P1.
let currentBox: HTMLElement | null = null
const realMatchMedia = window.matchMedia

afterEach(() => {
  cleanup()
  currentBox?.remove()
  currentBox = null
  window.matchMedia = realMatchMedia
})

beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

/** `phone: true` märker lådan precis som värdens `applyTvSceneBox` gör på en telefon. */
function mount(options?: { phone?: boolean; params?: Record<string, string> }) {
  const onNavigate = vi.fn()
  const page = <LiveTvTvShell pageId="live-tv-browse" params={options?.params ?? {}} onNavigate={onNavigate} onOpenDetails={() => {}} />
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  if (options?.phone) {
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  }
  document.body.appendChild(box)
  currentBox = box
  return { onNavigate, box, ...render(page, { container: box }) }
}

/** Fin pekare (mus) eller ren pekskärm — samma stubb som i tv-shell-pointer.test.tsx. */
function stubPointer({ fine }: { fine: boolean }) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('any-pointer: fine') ? fine : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('Live TV-skalet på telefon (fas 3)', () => {
  it('visar flik-raden, ingen ikonrad, ingen låda och ingen öppningsknapp', () => {
    mount({ phone: true })
    expect(screen.getByTestId('mobile-tab-bar')).toBeInTheDocument()
    expect(screen.queryByTestId('tv-rail')).toBeNull()
    expect(screen.queryByTestId('tv-rail-open')).toBeNull()
  })
  it('märker roten med data-lt-phone', () => {
    const { box } = mount({ phone: true })
    expect(box.querySelector('[data-live-tv-tv-root]')).toHaveAttribute('data-lt-phone', '1')
  })
  it('utan telefonattribut: ikonraden som förut, ingen flik-rad, ingen märkning', () => {
    const { box } = mount({ phone: false })
    expect(screen.getByTestId('tv-rail')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-tab-bar')).toBeNull()
    expect(box.querySelector('[data-live-tv-tv-root]')).not.toHaveAttribute('data-lt-phone')
  })
  it('flikarna navigerar', () => {
    const { onNavigate } = mount({ phone: true })
    fireEvent.click(screen.getByTestId('tab-search'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'search' } })
  })
  it('More öppnar ett ark med Multiview och Settings; Settings navigerar och stänger arket', async () => {
    const { onNavigate } = mount({ phone: true })
    fireEvent.click(screen.getByTestId('tab-more'))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('Multiview')).toBeInTheDocument()
    fireEvent.click(within(sheet).getByText('Settings'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'settings' } })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('Bakåt (Escape) stänger More-arket innan något annat händer', async () => {
    const { onNavigate } = mount({ phone: true })
    fireEvent.click(screen.getByTestId('tab-more'))
    await screen.findByRole('dialog')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onNavigate).not.toHaveBeenCalled()
  })
  it('kanalmenyn (håll på ett kort) landar i ett bottenark, inte i värdens glasmeny', async () => {
    vi.useFakeTimers()
    mount({ phone: true })
    const card = await screen.findByText('A', { ignore: '[data-initials]' })
    fireEvent.pointerDown(card.closest('[data-f]') as HTMLElement, { pointerType: 'touch', button: 0 })
    vi.advanceTimersByTime(700)
    vi.useRealTimers()
    expect(await screen.findByRole('dialog')).toHaveTextContent('Watch now')
    expect(screen.queryByTestId('tv-glass-menu')).toBeNull()
  })
  // Kanalarket har ingen egen Escape-lyssnare (till skillnad från värdens
  // glasmeny) — skalets Bakåt måste därför stänga det, inte stå tillbaka.
  it('Bakåt (Escape) stänger kanalarket i stället för att lämna vyn', async () => {
    vi.useFakeTimers()
    const { onNavigate } = mount({ phone: true })
    const card = await screen.findByText('A', { ignore: '[data-initials]' })
    fireEvent.pointerDown(card.closest('[data-f]') as HTMLElement, { pointerType: 'touch', button: 0 })
    vi.advanceTimersByTime(700)
    vi.useRealTimers()
    await screen.findByTestId('channel-sheet')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('channel-sheet')).toBeNull())
    expect(onNavigate).not.toHaveBeenCalled()
  })
  // Knappen ritas bara på hovring över en station med håll (`data-hold`), så
  // testet hovrar med en FIN pekare — annars hade det varit sant av sig självt.
  it('hold-affordansen ("…"-knappen) finns inte på telefon', async () => {
    stubPointer({ fine: true })
    const { box } = mount({ phone: true })
    fireEvent.pointerOver((await screen.findByText('A', { ignore: '[data-initials]' })).closest('[data-hold]') as HTMLElement)
    expect(box.querySelector('[data-live-tv-hold-button]')).toBeNull()
  })
  it('flik-raden döljs när spelaren är öppen', async () => {
    mount({ phone: true })
    // Simulera uppspelning: klicka första kanalkortet i hubben (fixturen har A och B).
    fireEvent.click(await screen.findByText('A', { ignore: '[data-initials]' }))
    await waitFor(() => expect(screen.queryByTestId('mobile-tab-bar')).toBeNull())
  })
  // Telefonen i skrivbordsappen behåller den gamla guiden (spec "Beslut",
  // Var) och får inte skrivbordets fokuskant — se `guide-surface.ts`.
  it('data-live-tv-desktop sätts inte på telefon, även med Tauri-flaggan satt', () => {
    __setDesktopTauriEnvForTests(true)
    const { box } = mount({ phone: true })
    expect(box.querySelector('[data-live-tv-tv-root]')).not.toHaveAttribute('data-live-tv-desktop')
  })
})
