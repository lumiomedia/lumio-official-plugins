import { afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { LiveTvTvShell } from '../tv/tv-shell'
import { SPORT_FOLLOWS_KEY, type SportFollow } from './sport-store'
import { __resetSportDayCache } from './sport-epg'
import type { MatchSource, SportDay, SportKind, SportMatch } from './sport-model'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from '../tv/tv-shell'
import { tvText } from '../tv/tv-strings'
import { buildSportCtx, type SportCtx } from './sport-ctx'

/*
  Testhjälp för sportvyerna. Importeras BARA av *.test.ts(x) — aldrig av
  runtime-kod (den drar in vitest). Matcherna läggs relativt Date.now() så
  att live/senare/avslutad stämmer oavsett när sviten körs.
*/
export const MIN = 60_000
export const HOUR = 3_600_000

export function fxSource(name: string, over: Partial<MatchSource> = {}): MatchSource {
  return { channelKey: `${name}::http://x/${name}`, name, url: `http://x/${name}`, logo: null, group: 'Sport', tvgId: null, sourceId: 'src-a', quality: null, programmeStart: 0, programmeStop: 0, liveFlag: true, ...over }
}

export function fxMatch(over: Partial<SportMatch> = {}): SportMatch {
  const home = over.home === undefined ? 'AIK' : over.home
  const away = over.away === undefined ? 'Hammarby' : over.away
  const start = over.start ?? Date.now()
  const stop = over.stop ?? start + 2 * HOUR
  return {
    id: `m-${home ?? over.event}-${away ?? ''}-${start}`,
    kind: 'football',
    league: 'Allsvenskan',
    leagueKey: 'allsvenskan',
    home,
    away,
    homeKey: home ? home.toLowerCase() : null,
    awayKey: away ? away.toLowerCase() : null,
    event: null,
    start,
    stop,
    status: 'upcoming',
    rerun: false,
    round: null,
    venue: null,
    sources: [fxSource('TV4 Fotboll FHD SE', { quality: 'FHD', programmeStart: start, programmeStop: stop })],
    ...over,
  }
}

export function fxDay(day: string, matches: SportMatch[]): SportDay {
  const counts: Partial<Record<SportKind, number>> = {}
  for (const m of matches) if (!m.rerun) counts[m.kind] = (counts[m.kind] ?? 0) + 1
  return { day, from: 0, to: 0, at: Date.now(), fetchedAt: Date.now(), matches, counts }
}

/** `/api/live-tv/sport/day` ur `days` (nycklat på dag), allt annat till fetch-stubben som redan sitter. */
export function stubSportDays(days: Record<string, SportMatch[]> | 'missing') {
  __resetSportDayCache()
  const base = globalThis.fetch
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input)
    const url = new URL(raw, 'http://localhost')
    if (url.pathname !== '/api/live-tv/sport/day') return base(input, init)
    if (days === 'missing') return { ok: false, status: 404, json: async () => ({}) } as unknown as Response
    const day = url.searchParams.get('day') ?? ''
    return { ok: true, status: 200, json: async () => fxDay(day, days[day] ?? []) } as unknown as Response
  })
  globalThis.fetch = spy as unknown as typeof fetch
  return spy
}

/** En kontext utan skal: engelska texter, en spellista "Xtream" (källa `src-a`), åtgärder som vi.fn(). */
export function fakeCtx(over: Partial<SportCtx> = {}): SportCtx {
  const nav = { play: vi.fn(), pushLayer: vi.fn(() => () => {}), toast: vi.fn(), go: vi.fn() } as unknown as TvNav
  const model = { nowMs: over.now ?? Date.now(), lists: [{ id: 'l1', name: 'Xtream', source: 'src-a' }], byKey: new Map(), allChannels: [] } as unknown as LiveTvModel
  const base = buildSportCtx({
    model,
    nav,
    tt: (key, vars) => tvText('en', key, vars),
    locale: 'en-GB',
    follows: over.follows ?? [],
    overrides: over.overrides ?? {},
    settings: over.settings ?? { view: 'matchday', alert: '15', apiKey: null, goalAlerts: true, provider: 'api-sports', keyPlan: null, goalAlertMatches: {}, backdrops: { all: 'standard', sports: {} }, cards: { opacity: 85, tone: 'black' } },
    reminders: over.reminders ?? [],
    openMatch: vi.fn(),
    openFollowPicker: vi.fn(),
  })
  return { ...base, watch: vi.fn(), toggleRemind: vi.fn(), ...over }
}

const fxChannel = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
/** Spellistan i skalets tester. "TV4 Fotboll FHD SE" har samma nyckel som `fxMatch`s standardkälla. */
export const fxList: LiveTvList = { id: 'l1', name: 'Xtream', channels: [fxChannel('A'), fxChannel('B'), fxChannel('TV4 Fotboll FHD SE')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

const boxes: HTMLElement[] = []
afterEach(() => {
  cleanup()
  for (const box of boxes.splice(0)) box.remove()
})

/** Monterar skalet på Sport-vyn. TV-läge som standard; `phone: true` märker lådan som värdens telefonscen. */
export function mountSport(params: Record<string, string> = {}, opts: { days?: Record<string, SportMatch[]> | 'missing'; phone?: boolean; follows?: SportFollow[] } = {}) {
  __resetForTests()
  __setTvModeForTests(!opts.phone)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [fxList])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  if (opts.follows) writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, opts.follows)
  seedLiveTvIndex()
  const fetchSpy = stubSportDays(opts.days ?? {})
  const onNavigate = vi.fn()
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  if (opts.phone) {
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  }
  document.body.appendChild(box)
  boxes.push(box)
  const view = render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'sport', ...params }} onNavigate={onNavigate} onOpenDetails={() => {}} />, { container: box })
  return { ...view, onNavigate, fetchSpy, box }
}
