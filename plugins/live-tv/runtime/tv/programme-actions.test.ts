import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests } from '@/lib/plugin-sdk'
import type { M3uChannel } from '../live-tv-data'
import { isReminded } from '../reminders'
import { tvText } from './tv-strings'
import { holdMenu, okAction, programmeState } from './programme-actions'
import type { TvNav } from './tv-shell'

const NOW = Math.floor(Date.now() / 60_000) * 60_000 + 7 * 86_400_000
const MIN = 60_000
const plain: M3uChannel = { name: 'TV4', group: 'Underhållning', url: 'http://x/tv4', tvgId: null }
const archived: M3uChannel = { ...plain, name: 'TV4 Arkiv', url: 'http://x/arkiv', archive: { days: 3, streamId: 9, base: 'http://p', username: 'u', password: 'p' } } as M3uChannel
const past = { title: 'Förr', start: NOW - 90 * MIN, stop: NOW - 30 * MIN }
const live = { title: 'Nu', start: NOW - 30 * MIN, stop: NOW + 30 * MIN }
const future = { title: 'Sen', start: NOW + 30 * MIN, stop: NOW + 90 * MIN }
const tt = (key: Parameters<typeof tvText>[1], vars?: Record<string, string | number>) => tvText('sv', key, vars)

function mockNav() {
  return { play: vi.fn(), channelMenu: vi.fn() } as unknown as TvNav & { play: ReturnType<typeof vi.fn>; channelMenu: ReturnType<typeof vi.fn> }
}
const extraLabels = (nav: ReturnType<typeof mockNav>) => (nav.channelMenu.mock.calls[0]![2] as { label: string }[]).map((a) => a.label)

beforeEach(() => __resetForTests())

describe('programme-actions', () => {
  it('status vid gränserna: start = nu är live, slut = nu är passerat', () => {
    expect(programmeState({ start: NOW, stop: NOW + MIN }, NOW)).toBe('live')
    expect(programmeState({ start: NOW - MIN, stop: NOW }, NOW)).toBe('past')
    expect(programmeState(future, NOW)).toBe('future')
  })
  it('OK: live och inget program spelar kanalen', () => {
    const nav = mockNav()
    okAction({ channel: plain, programme: live, nav, nowMs: NOW })()
    okAction({ channel: plain, programme: null, nav, nowMs: NOW })()
    expect(nav.play).toHaveBeenCalledTimes(2)
    expect(nav.play).toHaveBeenCalledWith({ channel: plain })
  })
  it('OK: framtida växlar påminnelsen', () => {
    const nav = mockNav()
    okAction({ channel: plain, programme: future, nav, nowMs: NOW })()
    expect(isReminded(plain, future)).toBe(true)
    okAction({ channel: plain, programme: future, nav, nowMs: NOW })()
    expect(isReminded(plain, future)).toBe(false)
    expect(nav.play).not.toHaveBeenCalled()
  })
  it('OK: passerat spelar reprisen när kanalen har arkiv, annars kanalen', () => {
    const nav = mockNav()
    okAction({ channel: archived, programme: past, nav, nowMs: NOW })()
    expect(nav.play.mock.calls[0]![0]).toMatchObject({ channel: archived, label: 'Förr' })
    expect(nav.play.mock.calls[0]![0].url).toContain('/timeshift/')
    okAction({ channel: plain, programme: past, nav, nowMs: NOW })()
    expect(nav.play.mock.calls[1]![0]).toEqual({ channel: plain })
  })
  it('Håll OK: framtida får Påminn mig {tid} och sedan Ta bort påminnelse', () => {
    const el = document.createElement('div')
    let nav = mockNav()
    holdMenu({ channel: plain, programme: future, nav, nowMs: NOW, element: el, tt, locale: 'sv-SE' })
    expect(extraLabels(nav)[0]).toMatch(/^Påminn mig \d\d[:.]\d\d$/)
    nav.channelMenu.mock.calls[0]![2][0].run()
    nav = mockNav()
    holdMenu({ channel: plain, programme: future, nav, nowMs: NOW, element: el, tt, locale: 'sv-SE' })
    expect(extraLabels(nav)).toEqual(['Ta bort påminnelse', 'Bevaka ”Sen”'])
  })
  it('Håll OK: live får Starta om från början och passerat Spela repris — bara med arkiv', () => {
    const el = document.createElement('div')
    let nav = mockNav()
    holdMenu({ channel: archived, programme: live, nav, nowMs: NOW, element: el, tt, locale: 'sv-SE' })
    expect(extraLabels(nav)).toEqual(['Starta om från början', 'Bevaka ”Nu”'])
    nav = mockNav()
    holdMenu({ channel: archived, programme: past, nav, nowMs: NOW, element: el, tt, locale: 'sv-SE' })
    expect(extraLabels(nav)).toEqual(['Spela repris', 'Bevaka ”Förr”'])
    nav = mockNav()
    holdMenu({ channel: plain, programme: live, nav, nowMs: NOW, element: el, tt, locale: 'sv-SE' })
    expect(extraLabels(nav)).toEqual(['Bevaka ”Nu”'])
    nav = mockNav()
    holdMenu({ channel: plain, programme: past, nav, nowMs: NOW, element: el, tt, locale: 'sv-SE' })
    expect(extraLabels(nav)).toEqual(['Bevaka ”Förr”'])
  })
  it('Håll OK: Bevaka lägger till titeln och växlar till Sluta bevaka', () => {
    const el = document.createElement('div')
    let nav = mockNav()
    holdMenu({ channel: plain, programme: future, nav, nowMs: NOW, element: el, tt, locale: 'sv-SE' })
    const watch = (nav.channelMenu.mock.calls[0]![2] as { key: string; run: () => void }[]).find((a) => a.key === 'watch')!
    watch.run()
    nav = mockNav()
    holdMenu({ channel: plain, programme: future, nav, nowMs: NOW, element: el, tt, locale: 'sv-SE' })
    expect(extraLabels(nav)).toContain('Sluta bevaka ”Sen”')
  })
})
