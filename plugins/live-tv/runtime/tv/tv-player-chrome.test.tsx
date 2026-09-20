import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import { isReminded } from '../reminders'
import type { EpgCacheEntry } from '../epg/types'
import { TvPlayerChrome } from './tv-player-chrome'
import type { LiveTvPlayerTvProps } from './tv-player-types'

/*
  MITT PÅ DAGEN, INTE "NU".

  Fixturerna ligger på `now ± 3 h`, och EPG-överlägget visar DAGENS tablå.
  Med `Date.now()` föll "Morning" (now − 3 h) på gårdagen så fort sviten kördes
  mellan midnatt och 03:00 — då försvann raden ur tablån och testet fällde på
  2 rader i stället för 3. Uppmätt 2026-09-21 kl. 00:34; samma svit var grön
  kl. 21:00 samma kväll.

  Ankaret är därför kl. 12 samma dag: alla tre programmen hamnar inom ett och
  samma dygn oavsett när sviten körs. Systemklockan rörs INTE — två test i
  filen sätter sina egna fejkade timers, och `vi.setSystemTime` här hade
  krockat med dem. Överlägget läser `tv.nowMs`, som testet redan styr.
*/
const now = (() => {
  const noon = new Date()
  noon.setHours(12, 0, 0, 0)
  return noon.getTime()
})()
const H = 3_600_000
const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const channels = [ch('A'), ch('B'), ch('C')]
/** Kanal med tablå i appens index (EPG-överlägget hämtar via `useSchedules`). */
const epgChannel = { ...ch('ESPN'), tvgId: 'espn.tv' }
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [...channels, epgChannel], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = { index: { 'espn.tv': [
  { title: 'Morning', start: now - 3 * H, stop: now - 2 * H },
  { title: 'GameDay', start: now - 30 * 60_000, stop: now + 30 * 60_000, description: 'Live now' },
  { title: 'Football', start: now + 30 * 60_000, stop: now + 90 * 60_000 },
] }, fetchedAt: now, sources: [] }
const nowFor = (c: { name: string }) => (c.name === 'B' ? { now: { title: 'GameDay', start: now - 60_000, stop: now + 60_000 }, next: { title: 'Football', start: now + 60_000, stop: now + 120_000 }, later: null } : { now: null, next: null, later: null })

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: '4K', favourite: false, bannerHideMs: 4000, neighbours: channels, pinnedKeys: [], nowFor, nowMs: now, locale: 'en-GB', gateOpen: false, phone: false, fullscreenOnRotate: true, keepAwake: true, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...overrides }
}

afterEach(cleanup)
// Default utanför TV-läget om inget test säger annat (stubbens egen default).
afterEach(() => { __setTvModeForTests(false) })
beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache })
})

describe('TvPlayerChrome', () => {
  it('toppfältet visar kanal, nu-rad och Sen-kortet; spela/paus är kromets enda data-init', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.getByTestId('top-bar')).toHaveTextContent('2 · B')
    expect(screen.getByTestId('top-bar')).toHaveTextContent('GameDay')
    expect(screen.getByTestId('next-up')).toHaveTextContent('Football')
    expect(screen.getByTestId('next-up-remind')).toHaveTextContent('Remind me')
    expect(screen.getByTestId('programme-progress')).toHaveTextContent('GameDay')
    expect(screen.getByLabelText('Pause')).toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('Påminn mig på Sen-kortet togglar påminnelsen', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('next-up-remind'))
    expect(screen.getByTestId('next-up-remind')).toHaveTextContent('Reminder set')
    expect(isReminded(channels[1], { start: now + 60_000 })).toBe(true)
    fireEvent.click(screen.getByTestId('next-up-remind'))
    expect(screen.getByTestId('next-up-remind')).toHaveTextContent('Remind me')
  })
  it('spela/paus tar fokus när spelaren öppnas och behåller det över ett kanalbyte', async () => {
    const view = render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    // Självhävdande slinga över några bildrutor: skalet fokuserar inte vyer
    // medan spelaren är öppen, så utan den här står fokus kvar i vyn BAKOM.
    await act(async () => { await new Promise((r) => setTimeout(r, 120)) })
    const playPause = screen.getByLabelText('Pause')
    expect(document.activeElement).toBe(playPause)
    // Kanalbyte (onSwitchChannel → ny channel-prop) får inte tappa fokus.
    document.body.focus()
    view.rerender(<TvPlayerChrome channel={channels[2]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 120)) })
    expect(document.activeElement).toBe(screen.getByLabelText('Pause'))
  })
  it('favoritraden ritar chips med logotyp, namn och nu-titel; klick byter kanal', () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    const chips = screen.getAllByTestId('favourite-chip')
    expect(chips).toHaveLength(3)
    expect(chips[1]).toHaveAttribute('aria-current', 'true')
    expect(chips[1]).toHaveTextContent('GameDay')
    expect(chips[0]).toHaveTextContent('A')
    expect(chips[0]).toHaveTextContent('No programme information')
    expect(chips[0].querySelector('[data-initials]')).not.toBeNull()
    fireEvent.click(chips[2])
    expect(props.onSwitchChannel).toHaveBeenCalledWith(channels[2])
  })
  it('favoritraden lägger favoriterna först och fönstrar resten runt den spelande kanalen', () => {
    // `tv.neighbours` ÄR modellens kompletta kanallista — i en IPTV-spellista
    // tiotusentals poster, och varje chip slår upp `tv.nowFor(c)`. Raden får
    // aldrig rita allt.
    const many = Array.from({ length: 300 }, (_, i) => ch(`K${i}`))
    render(<TvPlayerChrome channel={many[150]} tv={tv({ neighbours: many, pinnedKeys: [channelKey(many[3]), channelKey(many[280])] })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    const chips = screen.getAllByTestId('favourite-chip')
    expect(chips.length).toBeLessThanOrEqual(53)
    expect(chips[0]).toHaveTextContent('K3')
    expect(chips[1]).toHaveTextContent('K280')
    expect(chips[2]).toHaveTextContent('K125')
    expect(chips[chips.length - 1]).toHaveTextContent('K175')
  })
  it('favoritraden tar de första korten när kanalen inte finns i listan, med den spelande först', () => {
    const many = Array.from({ length: 300 }, (_, i) => ch(`K${i}`))
    render(<TvPlayerChrome channel={ch('Utanför')} tv={tv({ neighbours: many })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    const chips = screen.getAllByTestId('favourite-chip')
    expect(chips).toHaveLength(51)
    expect(chips[0]).toHaveTextContent('Utanför')
    expect(chips[1]).toHaveTextContent('K0')
  })
  it('fälten döljs efter tiden och en tangent visar dem igen; musen över ett fält håller dem kvar', () => {
    vi.useFakeTimers()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    act(() => { vi.advanceTimersByTime(4100) })
    expect(screen.getByTestId('banner').style.opacity).toBe('0')
    expect(screen.getByTestId('top-bar').style.opacity).toBe('0')
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByTestId('banner').style.opacity).toBe('1')
    // Musen vilar på fältet: göm-timern står stilla (gamla keepControlsVisible).
    fireEvent.mouseEnter(screen.getByTestId('banner'))
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(screen.getByTestId('banner').style.opacity).toBe('1')
    fireEvent.mouseLeave(screen.getByTestId('banner'))
    act(() => { vi.advanceTimersByTime(4100) })
    expect(screen.getByTestId('banner').style.opacity).toBe('0')
    vi.useRealTimers()
  })
  it('Guide öppnar EPG-överlägget med dagens tablå och favoritraden; Guide igen stänger', async () => {
    const props = tv()
    render(<TvPlayerChrome channel={epgChannel} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('Guide'))
    await flushLiveTvIndex()
    const rows = screen.getAllByTestId('schedule-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Morning')
    expect(rows[0]).not.toHaveAttribute('data-f') // passerat: dämpat, ingen station
    expect(rows[1]).toHaveAttribute('data-now')
    expect(rows[1]).toHaveTextContent('GameDay')
    expect(rows[2]).toHaveTextContent('Football')
    expect(rows[2]).toHaveTextContent('Remind me')
    // Fokus står i överlägget (nu-raden) så fjärren kan gå vidare.
    expect(document.activeElement).toBe(rows[1])
    // Påminn mig på en kommande rad.
    fireEvent.click(rows[2])
    expect(rows[2]).toHaveTextContent('Reminder set')
    // Guide-knappen igen stänger, och öppnar på nytt.
    fireEvent.click(screen.getByLabelText('Guide'))
    expect(screen.queryByTestId('schedule-overlay')).toBeNull()
    fireEvent.click(screen.getByLabelText('Guide'))
    // Favoritraden finns i överlägget också: klick byter kanal och stänger.
    const chips = screen.getByTestId('schedule-overlay').querySelectorAll('[data-testid="favourite-chip"]')
    expect(chips.length).toBeGreaterThan(1)
    fireEvent.click(chips[chips.length - 1])
    expect(props.onSwitchChannel).toHaveBeenCalledWith(channels[2])
    expect(screen.queryByTestId('schedule-overlay')).toBeNull()
  })
  it('överlägget visar tomtext när kanalen saknar tablå', async () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('Guide'))
    await flushLiveTvIndex()
    expect(screen.getByTestId('schedule-overlay')).toHaveTextContent('No programme information')
    expect(screen.queryAllByTestId('schedule-row')).toHaveLength(0)
  })
  it('ChannelUp/Down byter till grannkanal', () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ChannelUp' })
    expect(props.onSwitchChannel).toHaveBeenLastCalledWith(channels[2])
    fireEvent.keyDown(window, { key: 'PageDown' })
    expect(props.onSwitchChannel).toHaveBeenLastCalledWith(channels[0])
  })
  it('håll OK på spela/paus öppnar glasmenyn med rätt poster, och Guide där öppnar överlägget', async () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    vi.useFakeTimers()
    const playPause = screen.getByLabelText('Pause')
    fireEvent.keyDown(playPause, { key: 'Enter' })
    vi.advanceTimersByTime(700)
    fireEvent.keyUp(playPause, { key: 'Enter' })
    vi.useRealTimers()
    const menu = await screen.findByTestId('tv-glass-menu')
    expect(menu).toHaveTextContent('Guide (now / next)')
    expect(menu).toHaveTextContent('Multiview')
    expect(menu).toHaveTextContent('Add to favourites')
    expect(menu).toHaveTextContent('Channel details')
    expect(menu).toHaveTextContent('Pause')
    expect(menu).not.toHaveTextContent(/Record|Spela in/)
    fireEvent.click(screen.getByText('Guide (now / next)'))
    expect(screen.getByTestId('schedule-overlay')).toBeInTheDocument()
  })
  it('spela/paus i kontrollraden speglar paused och kallar onTogglePause', () => {
    const onTogglePause = vi.fn()
    const view = render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={onTogglePause} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('Pause'))
    expect(onTogglePause).toHaveBeenCalledTimes(1)
    view.rerender(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={true} onTogglePause={onTogglePause} onClose={() => {}} />)
    expect(screen.getByLabelText('Resume')).toBeInTheDocument()
  })
  it('Stäng-knappen i toppfältet stänger spelaren', () => {
    const onClose = vi.fn()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  // Fix round 1 (Task 16-review): Back ska ägas explicit av kromet, inte av
  // lyssnarregistreringsordning mellan skal/spelare/krom på samma `window`.
  it('Backspace med öppet överlägg stänger INTE spelaren, bara överlägget', () => {
    const onClose = vi.fn()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Guide'))
    expect(screen.getByTestId('schedule-overlay')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByTestId('schedule-overlay')).toBeNull()
  })
  it('Backspace utan öppet överlägg stänger spelaren', () => {
    const onClose = vi.fn()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it('OK på ett chip i överlägget lämnar fokus på spela/paus och inte på body', async () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('Guide'))
    const chips = screen.getByTestId('schedule-overlay').querySelectorAll<HTMLElement>('[data-testid="favourite-chip"]')
    chips[2].focus()
    fireEvent.click(chips[2])
    expect(props.onSwitchChannel).toHaveBeenCalledWith(channels[2])
    // setTimeout 0 i closeGuide: fokus sätts efter att raderna tagits bort.
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    expect(screen.queryByTestId('schedule-overlay')).toBeNull()
    expect(document.activeElement).toBe(screen.getByLabelText('Pause'))
  })
  it('◂ ▸ och OK når inte vyn bakom spelaren, men släpps igenom inne i kromet', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    // Vyn bakom spelaren: en lyssnare registrerad efter kromet ser inget av
    // sidopilarna eller OK så länge fokus står utanför kromet. Utan det här
    // bytte ▸ kategori i guiden bakom spelaren (uppmätt i tv-sim).
    const behind = vi.fn()
    window.addEventListener('keydown', behind, true)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(behind).not.toHaveBeenCalled()
    // Inne i kromet ska de fortfarande gå fram: spela/paus-stationen behöver OK.
    fireEvent.keyDown(screen.getByLabelText('Pause'), { key: 'Enter' })
    expect(behind).toHaveBeenCalledTimes(1)
    window.removeEventListener('keydown', behind, true)
  })
  // Kanalbyte till en LÅST kanal öppnar PIN-grinden UTAN att stänga spelaren
  // (tv-shell.tsx: `play` lämnar `active` orörd). Kromet måste då stå
  // tillbaka helt — annars svalde Enter/Backspace grinden: Enter kunde inte
  // skicka in PIN:en (den bubblar aldrig fram till fältet) och Backspace
  // stängde SPELAREN i stället för att avbryta grinden.
  it('gateOpen: kromet står tillbaka och släpper fram Enter/Backspace till en senare lyssnare', () => {
    const onClose = vi.fn()
    render(<TvPlayerChrome channel={channels[1]} tv={tv({ gateOpen: true })} paused={false} onTogglePause={() => {}} onClose={onClose} />)
    const later = vi.fn()
    window.addEventListener('keydown', later, true)
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onClose).not.toHaveBeenCalled()
    expect(later).toHaveBeenCalledTimes(2)
    window.removeEventListener('keydown', later, true)
  })
  it('stopImmediatePropagation hindrar en senare registrerad lyssnare från att också se Back', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    // Registreras EFTER kromets montering — simulerar spelarens lyssnare, som
    // kan läggas om senare än kromets (t.ex. när dess beroenden ändras).
    // Om kromet bara kallade stopPropagation (som stannar vid MÅL-byten, inte
    // syskon på samma mål) skulle den här ändå triggas.
    const later = vi.fn()
    window.addEventListener('keydown', later, true)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(later).not.toHaveBeenCalled()
    window.removeEventListener('keydown', later, true)
  })
})

// TV-läget: samma layout i 1,4× — alla knappar och chips är stationer med
// `data-guide-row` (grå fokuskant, ingen accentglöd) och exakt EN data-init.
describe('TvPlayerChrome i TV-läge', () => {
  it('chips och knappar är stationer med data-guide-row, roten bär tv-root och exakt en data-init', () => {
    __setTvModeForTests(true)
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} controls={{ muted: false, volume: 0.5, fullscreen: false, aspectLabel: 'Auto', onToggleMute: vi.fn(), onVolume: vi.fn(), onToggleFullscreen: vi.fn(), onCycleAspect: vi.fn() }} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    const root = document.querySelector('[data-live-tv-tv-root]')
    expect(root).not.toBeNull()
    expect(root).not.toHaveAttribute('data-live-tv-desktop')
    for (const chip of screen.getAllByTestId('favourite-chip')) {
      expect(chip).toHaveAttribute('data-f')
      expect(chip).toHaveAttribute('data-guide-row')
    }
    for (const label of ['Pause', 'Fullscreen', 'Guide', 'Mute', 'Aspect ratio', 'Close']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('data-f')
      expect(screen.getByLabelText(label)).toHaveAttribute('data-guide-row')
    }
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getByLabelText('Pause')).toHaveAttribute('data-init')
    // Volymreglaget ritas inte på TV: en station som sväljer sidopilarna låser fjärren.
    expect(screen.queryByLabelText('Volume')).toBeNull()
  })
  it('utanför TV-läget bär roten data-live-tv-desktop (ingen accentkant på stationerna)', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(document.querySelector('[data-live-tv-tv-root]')).toHaveAttribute('data-live-tv-desktop', '1')
  })
})

// Jerrys uppföljning: fjärrhjälpen ("▾ guide · hold OK = menu") ska bort
// HELT — även i TV-läge, ingen ersättningstext någonstans.
describe('TvPlayerChrome fjärrhjälp (borttagen, Jerrys uppföljning)', () => {
  it('renderas aldrig, varken i TV-läge eller utanför', () => {
    __setTvModeForTests(true)
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.queryByText('▾ guide · hold OK = menu')).not.toBeInTheDocument()
    cleanup()
    __setTvModeForTests(false)
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.queryByText('▾ guide · hold OK = menu')).not.toBeInTheDocument()
  })
})
