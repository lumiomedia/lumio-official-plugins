import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __setTvModeForTests } from '@/lib/plugin-sdk'
import { TvPlayerChrome } from './tv-player-chrome'
import type { LiveTvPlayerTvProps } from './tv-player-types'

const now = Date.now()
const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const channels = [ch('A'), ch('B'), ch('C')]
const nowFor = (c: { name: string }) => (c.name === 'B' ? { now: { title: 'GameDay', start: now - 60_000, stop: now + 60_000 }, next: { title: 'Football', start: now + 60_000, stop: now + 120_000 }, later: null } : { now: null, next: null, later: null })

function tv(overrides: Partial<LiveTvPlayerTvProps> = {}): LiveTvPlayerTvProps {
  return { channelNumber: 2, quality: '4K', favourite: false, bannerHideMs: 4000, neighbours: channels, nowFor, nowMs: now, locale: 'en-GB', gateOpen: false, onToggleFavourite: vi.fn(), onOpenChannelDetails: vi.fn(), onOpenMultiview: vi.fn(), onOpenGuide: vi.fn(), onAddToMultiview: vi.fn(), onSwitchChannel: vi.fn(), ...overrides }
}

afterEach(cleanup)
// Default utanför TV-läget om inget test säger annat (stubbens egen default).
afterEach(() => { __setTvModeForTests(false) })

describe('TvPlayerChrome', () => {
  it('visar banner med titel, tid och Sen, och ⋯ är data-init', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    expect(screen.getByText('GameDay')).toBeInTheDocument()
    expect(screen.getByText(/Football/)).toBeInTheDocument()
    expect(screen.getByLabelText('More')).toHaveAttribute('data-init')
    expect(screen.getByText('2 · B')).toBeInTheDocument()
  })
  it('⋯ tar fokus när spelaren öppnas och behåller det över ett kanalbyte', async () => {
    const view = render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    // Självhävdande slinga över några bildrutor: skalet fokuserar inte vyer
    // medan spelaren är öppen, så utan den här står fokus kvar i vyn BAKOM.
    await act(async () => { await new Promise((r) => setTimeout(r, 120)) })
    const dots = screen.getByLabelText('More')
    expect(document.activeElement).toBe(dots)
    // Kanalbyte (onSwitchChannel → ny channel-prop) får inte tappa fokus.
    document.body.focus()
    view.rerender(<TvPlayerChrome channel={channels[2]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 120)) })
    expect(document.activeElement).toBe(screen.getByLabelText('More'))
  })
  it('mini-guiden fokuserar ett kort även när kanalen inte finns i listan', async () => {
    // Spelas något utanför `neighbours` (index −1) fanns ingen data-init alls
    // och mini-guiden öppnades utan fokus i sig.
    const outsider = ch('Z')
    render(<TvPlayerChrome channel={outsider} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 60)) })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    await act(async () => { await new Promise((r) => setTimeout(r, 60)) })
    const cards = screen.getAllByTestId('mini-card')
    expect(cards.filter((c) => c.hasAttribute('data-init'))).toHaveLength(1)
    expect(cards[0]).toHaveAttribute('data-init')
    expect(cards).toContain(document.activeElement)
  })
  it('mini-guiden fönstrar en stor kanallista i stället för att rita hela', () => {
    // `tv.neighbours` ÄR modellens kompletta kanallista — i en IPTV-spellista
    // tiotusentals poster, och varje kort slår dessutom upp `tv.nowFor(c)`.
    // Ett enda ▾ byggde alltså hela listan på en gång och frös TV-boxen i
    // sekunder. Fjärrkontrollen går ändå bara ett steg i taget.
    const many = Array.from({ length: 300 }, (_, i) => ch(`K${i}`))
    render(<TvPlayerChrome channel={many[150]} tv={tv({ neighbours: many })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const cards = screen.getAllByTestId('mini-card')
    expect(cards.length).toBeLessThanOrEqual(51)
    // Fönstret är centrerat kring den spelande kanalen …
    expect(cards[0]).toHaveTextContent('K125')
    expect(cards[cards.length - 1]).toHaveTextContent('K175')
    // … och exakt ett kort bär startfokus.
    expect(cards.filter((c) => c.hasAttribute('data-init'))).toHaveLength(1)
  })
  it('mini-guiden tar de första korten när kanalen inte finns i en stor lista', () => {
    const many = Array.from({ length: 300 }, (_, i) => ch(`K${i}`))
    render(<TvPlayerChrome channel={ch('Utanför')} tv={tv({ neighbours: many })} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const cards = screen.getAllByTestId('mini-card')
    expect(cards).toHaveLength(50)
    expect(cards[0]).toHaveTextContent('K0')
    expect(cards.filter((c) => c.hasAttribute('data-init'))).toHaveLength(1)
  })
  it('bannern döljs efter tiden och ▲ visar den igen', () => {
    vi.useFakeTimers()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    act(() => { vi.advanceTimersByTime(4100) })
    expect(screen.getByTestId('banner').style.opacity).toBe('0')
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(screen.getByTestId('banner').style.opacity).toBe('1')
    vi.useRealTimers()
  })
  it('▾ öppnar mini-guiden och OK på ett kort byter kanal', () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const cards = screen.getAllByTestId('mini-card')
    expect(cards).toHaveLength(3)
    fireEvent.click(cards[2])
    expect(props.onSwitchChannel).toHaveBeenCalledWith(channels[2])
  })
  it('ChannelUp/Down byter till grannkanal', () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ChannelUp' })
    expect(props.onSwitchChannel).toHaveBeenLastCalledWith(channels[2])
    fireEvent.keyDown(window, { key: 'PageDown' })
    expect(props.onSwitchChannel).toHaveBeenLastCalledWith(channels[0])
  })
  it('⋯ öppnar glasmenyn med rätt poster', () => {
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('More'))
    const menu = screen.getByTestId('tv-glass-menu')
    expect(menu).toHaveTextContent('Guide (now / next)')
    expect(menu).toHaveTextContent('Multiview')
    expect(menu).toHaveTextContent('Add to favourites')
    expect(menu).toHaveTextContent('Channel details')
    expect(menu).toHaveTextContent('Pause')
    expect(menu).not.toHaveTextContent(/Record|Spela in/)
  })
  // Fix round 1 (Task 16-review): Back ska ägas explicit av kromet, inte av
  // lyssnarregistreringsordning mellan skal/spelare/krom på samma `window`.
  it('Backspace med öppen mini-guide stänger INTE spelaren, bara mini-guiden', () => {
    const onClose = vi.fn()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(screen.getAllByTestId('mini-card')).toHaveLength(3)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryAllByTestId('mini-card')).toHaveLength(0)
  })
  it('Backspace utan öppen mini-guide stänger spelaren', () => {
    const onClose = vi.fn()
    render(<TvPlayerChrome channel={channels[1]} tv={tv()} paused={false} onTogglePause={() => {}} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it('OK på ett mini-guidekort lämnar fokus på ⋯ och inte på body', async () => {
    const props = tv()
    render(<TvPlayerChrome channel={channels[1]} tv={props} paused={false} onTogglePause={() => {}} onClose={() => {}} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const cards = screen.getAllByTestId('mini-card')
    cards[2].focus()
    fireEvent.click(cards[2])
    expect(props.onSwitchChannel).toHaveBeenCalledWith(channels[2])
    // setTimeout 0 i closeMini: fokus sätts efter att korten tagits bort.
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    expect(document.activeElement).toBe(screen.getByLabelText('More'))
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
    // Inne i kromet ska de fortfarande gå fram: ⋯-stationen behöver OK.
    fireEvent.keyDown(screen.getByLabelText('More'), { key: 'Enter' })
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
