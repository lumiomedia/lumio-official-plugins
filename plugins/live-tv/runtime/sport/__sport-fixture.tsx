import { vi } from 'vitest'
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
    settings: over.settings ?? { view: 'matchday', alert: '15' },
    reminders: over.reminders ?? [],
    openMatch: vi.fn(),
    openFollowPicker: vi.fn(),
  })
  return { ...base, watch: vi.fn(), toggleRemind: vi.fn(), ...over }
}
