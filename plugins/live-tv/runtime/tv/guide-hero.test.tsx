import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import type { M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { EpgProgramme } from '../epg/types'
import type { TvNav } from './tv-shell'
import { GuideHero, useDebouncedSelection } from './guide-hero'
import { guideKeyAction } from './guide-keys'
import type { GuideSelection } from './guide-types'
import { mixHex, v2Bg } from './v2-tokens'

/**
 * Kanalguide v2:s hero (handoff "Screen 2 / Layout"): titelrad, tid +
 * "N min kvar" / "börjar om …" / "sändes idag · repris", segmentet med tre
 * stationer, förhandsvisningen och tonen. Plus snabbtangenterna N/T och
 * heroens 300 ms-fördröjning.
 */
const now = Date.now()
const channel: M3uChannel = { name: 'TV4 HD', logo: null, group: 'Underhållning', url: 'http://x/tv4', tvgId: 'tv4' }
const live: EpgProgramme = { title: 'Silo', description: 'Tusentals människor lever.', start: now - 10 * 60_000, stop: now + 50 * 60_000 }
const future: EpgProgramme = { title: 'Nyhetsmorgon', start: now + 30 * 60_000, stop: now + 90 * 60_000 }
const past: EpgProgramme = { title: 'Morgonstudio', start: now - 120 * 60_000, stop: now - 60 * 60_000 }

const model = {
  nowMs: now,
  channelNumber: () => 109,
  nowFor: () => ({ now: live, next: future, later: null }),
} as unknown as LiveTvModel
const nav = { play: vi.fn() } as unknown as TvNav & { play: ReturnType<typeof vi.fn> }

const hero = (sel: GuideSelection | null, extra: Partial<Parameters<typeof GuideHero>[0]> = {}) => {
  const onMode = vi.fn()
  render(<GuideHero sel={sel} model={model} nav={nav} mode="now" onMode={onMode} tint={false} background="slate" sourceLabel="Xtream" onOpenSource={() => {}} isTv {...extra} />)
  return onMode
}

beforeEach(() => {
  __resetForTests()
  ;(nav.play as ReturnType<typeof vi.fn>).mockClear()
  // Heron slår upp programbilder (`/api/media`): inget nät i testerna.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('GuideHero', () => {
  it('live: titel, nummer, LIVE, kvalitet, "N min kvar" och beskrivning', () => {
    hero({ channel, programme: live })
    expect(screen.getByTestId('guide-hero-title')).toHaveTextContent('Silo')
    const h = screen.getByTestId('guide-hero')
    expect(h).toHaveTextContent('109')
    expect(h).toHaveTextContent('TV4 HD')
    expect(h).toHaveTextContent('HD')
    expect(screen.getAllByTestId('live-pill').length).toBeGreaterThan(0)
    expect(screen.getByTestId('guide-hero-time')).toHaveTextContent('50 min left')
    expect(screen.getByTestId('guide-hero-desc')).toHaveTextContent('Tusentals människor lever.')
  })

  it('framtida på TV: "starts in N min · OK = remind" och Later-tagg; på skrivbordet utan OK-text', () => {
    hero({ channel, programme: future })
    expect(screen.getByTestId('guide-hero-time')).toHaveTextContent('starts in 30 min · OK = remind')
    expect(screen.getByTestId('guide-hero-tag')).toHaveTextContent('Later')
    cleanup()
    hero({ channel, programme: future }, { isTv: false })
    expect(screen.getByTestId('guide-hero-time')).toHaveTextContent('starts in 30 min')
    expect(screen.getByTestId('guide-hero').textContent).not.toMatch(/OK =/)
  })

  it('passerat: "aired today · replay" och Replay-tagg', () => {
    hero({ channel, programme: past })
    expect(screen.getByTestId('guide-hero-time')).toHaveTextContent('aired today · replay')
    expect(screen.getByTestId('guide-hero-tag')).toHaveTextContent('Replay')
  })

  it('segmentet: tre stationer, det aktiva markerat, OK byter läge', () => {
    const onMode = hero({ channel, programme: live }, { mode: 'tl' })
    const seg = screen.getByTestId('guide-mode')
    const stations = seg.querySelectorAll('[data-f]')
    expect(stations).toHaveLength(3)
    expect(seg.querySelector('[data-active]')).toBe(screen.getByTestId('guide-mode-tl'))
    fireEvent.click(screen.getByTestId('guide-mode-list'))
    expect(onMode).toHaveBeenCalledWith('list')
  })

  it('förhandsvisningen spelar kanalen på OK', () => {
    hero({ channel, programme: live })
    fireEvent.click(screen.getByTestId('guide-hero-preview'))
    expect(nav.play).toHaveBeenCalledWith({ channel })
  })

  it('ton av → bakgrunden är temats; på utan bild → neutral ton blandad 30 %', () => {
    hero({ channel, programme: live }, { background: 'night' })
    expect(screen.getByTestId('guide-hero-base').getAttribute('data-base')).toBe(v2Bg('night'))
    cleanup()
    hero({ channel, programme: live }, { tint: true })
    expect(screen.getByTestId('guide-hero-base').getAttribute('data-base')).toBe(mixHex('#2b3142', v2Bg('slate'), 30))
  })

  it('utan markering: rubrik och segment, ingen titel och ingen förhandsvisning', () => {
    hero(null)
    expect(screen.getByTestId('guide-mode')).toBeInTheDocument()
    expect(screen.queryByTestId('guide-hero-title')).not.toBeInTheDocument()
    expect(screen.queryByTestId('guide-hero-preview')).not.toBeInTheDocument()
  })
})

describe('useDebouncedSelection', () => {
  it('första markeringen direkt, nästa först efter 300 ms', () => {
    vi.useFakeTimers()
    const a: GuideSelection = { channel, programme: live }
    const b: GuideSelection = { channel, programme: future }
    const { result, rerender } = renderHook(({ sel }) => useDebouncedSelection(sel), { initialProps: { sel: null as GuideSelection | null } })
    expect(result.current).toBeNull()
    rerender({ sel: a })
    expect(result.current?.programme?.title).toBe('Silo')
    rerender({ sel: b })
    act(() => { vi.advanceTimersByTime(299) })
    expect(result.current?.programme?.title).toBe('Silo')
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current?.programme?.title).toBe('Nyhetsmorgon')
  })
})

describe('guideKeyAction', () => {
  it('n/N = till nu, t/T = växla, annat = inget', () => {
    expect(guideKeyAction('n')).toBe('now')
    expect(guideKeyAction('N')).toBe('now')
    expect(guideKeyAction('t')).toBe('toggle-tl')
    expect(guideKeyAction('T')).toBe('toggle-tl')
    expect(guideKeyAction('x')).toBeNull()
    expect(guideKeyAction('Enter')).toBeNull()
  })
  it('ingen klocka i guidens hero (Jerry 2026-10-30)', () => {
    hero({ channel, programme: live })
    expect(screen.queryByTestId('guide-clock')).toBeNull()
  })
  it('utan färgton målar heron ingen egen bandfärg — sidans gemensamma bakgrund syns igenom', () => {
    hero({ channel, programme: live })
    expect(screen.getByTestId('guide-hero-base').style.background).toBe('transparent')
  })
  it('förhandsrutan är 384×216 (Jerry 2026-10-30: "aningen större")', () => {
    hero({ channel, programme: live })
    const tile = screen.getByTestId('guide-hero-preview')
    expect(tile.style.width).toBe('384px')
    expect(tile.style.height).toBe('216px')
  })
})
