import { describe, expect, it, vi } from 'vitest'
import { createPrefs } from '../../_shared/tracker-kit/prefs'
import type { SimklApi } from './api'
import { createScrobbler } from './tracker'
import type { ScrobbleEvent } from './types'

const ev = (over: Partial<ScrobbleEvent> & { pulse?: boolean } = {}) => ({
  action: 'start' as const, mediaType: 'movie' as const, tmdbId: '27205', imdbId: null, season: null, episode: null, progress: 10, ...over,
})

type Reply = { ok: boolean; status?: number; error?: string }

function setup(on = true, reply: Reply | ((path: string) => Reply) = { ok: true }) {
  const data: Record<string, string> = on ? { simkl_scrobble_enabled: '1' } : {}
  let clock = 1_000_000
  const sentAt: number[] = []
  const call = vi.fn(async (_m: string, path: string) => {
    sentAt.push(clock)
    const r = typeof reply === 'function' ? reply(path) : reply
    return r.ok ? { ok: true as const, data: null } : { ok: false as const, status: r.status ?? 400, retryAfter: null, error: r.error ?? 'x' }
  })
  const log = vi.fn()
  const scrobble = createScrobbler({
    api: { call: call as unknown as SimklApi['call'], cdn: vi.fn(), pausedUntil: () => 0, hasAuth: () => true, remaining: () => null },
    prefs: createPrefs({ get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v } }, () => {}, 'simkl'),
    log,
    now: () => clock,
    sleep: async (ms) => { clock += ms },
  })
  const paths = () => call.mock.calls.map((c) => (c as unknown as [string, string])[1])
  return { scrobble, call, paths, log, sentAt, tick: (ms: number) => { clock += ms } }
}

describe('SIMKL-scrobble', () => {
  it('pulser skickas aldrig', async () => {
    const { scrobble, call } = setup()
    await scrobble(ev())
    await scrobble(ev({ action: 'pause', pulse: true, progress: 30 }))
    await scrobble(ev({ action: 'pause', pulse: true, progress: 50 }))
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('start, paus, start, stopp blir fyra anrop', async () => {
    const { scrobble, paths } = setup()
    await scrobble(ev())
    await scrobble(ev({ action: 'pause', progress: 40 }))
    await scrobble(ev({ action: 'start', progress: 40 }))
    await scrobble(ev({ action: 'stop', progress: 92 }))
    expect(paths()).toEqual(['/scrobble/start', '/scrobble/pause', '/scrobble/start', '/scrobble/stop'])
  })

  it('paus eller stopp utan föregående start skickas inte', async () => {
    const { scrobble, call } = setup()
    await scrobble(ev({ action: 'pause' }))
    await scrobble(ev({ action: 'stop', progress: 95 }))
    expect(call).not.toHaveBeenCalled()
  })

  it('två pauser i rad blir en', async () => {
    const { scrobble, paths } = setup()
    await scrobble(ev())
    await scrobble(ev({ action: 'pause', progress: 40 }))
    await scrobble(ev({ action: 'pause', progress: 41 }))
    expect(paths()).toEqual(['/scrobble/start', '/scrobble/pause'])
  })

  it('409 och RATE_LIMIT loggas och släpps', async () => {
    const { scrobble, log } = setup(true, { ok: false, status: 409, error: 'conflict' })
    await scrobble(ev())
    expect(log).toHaveBeenCalledWith(expect.stringContaining('409'))
  })

  it('reglaget av: ingenting', async () => {
    const { scrobble, call } = setup(false)
    await scrobble(ev())
    expect(call).not.toHaveBeenCalled()
  })

  it('avsnitt utan säsong skickas inte', async () => {
    const { scrobble, call } = setup()
    await scrobble(ev({ mediaType: 'episode', season: null, episode: 3 }))
    expect(call).not.toHaveBeenCalled()
  })

  it('C4: pausen vid slutet (≥ 80 %) skickas inte — stoppet får markera titeln sedd', async () => {
    const { scrobble, paths } = setup()
    await scrobble(ev())
    await scrobble(ev({ action: 'pause', progress: 99 }))
    await scrobble(ev({ action: 'stop', progress: 99 }))
    expect(paths()).toEqual(['/scrobble/start', '/scrobble/stop'])
  })

  it('C4: ett anrop inom 20 s väntar ut SIMKL:s lås i stället för att släppas', async () => {
    const { scrobble, sentAt } = setup()
    await scrobble(ev())
    await scrobble(ev({ action: 'pause', progress: 40 }))
    expect(sentAt[1] - sentAt[0]).toBeGreaterThanOrEqual(20_000)
  })

  it('C4: nästa avsnitts start direkt efter stoppet går fram', async () => {
    const { scrobble, paths, sentAt } = setup()
    await scrobble(ev({ mediaType: 'episode', season: 1, episode: 1 }))
    await scrobble(ev({ mediaType: 'episode', season: 1, episode: 1, action: 'stop', progress: 97 }))
    await scrobble(ev({ mediaType: 'episode', season: 1, episode: 2, progress: 0 }))
    expect(paths()).toEqual(['/scrobble/start', '/scrobble/stop', '/scrobble/start'])
    expect(sentAt[2] - sentAt[1]).toBeGreaterThanOrEqual(20_000)
  })

  it('C4: RATE_LIMIT på ett stopp försöks en gång till', async () => {
    let n = 0
    const { scrobble, paths } = setup(true, (p) => (p === '/scrobble/stop' && n++ === 0 ? { ok: false, status: 400, error: 'RATE_LIMIT' } : { ok: true }))
    await scrobble(ev())
    await scrobble(ev({ action: 'stop', progress: 95 }))
    expect(paths()).toEqual(['/scrobble/start', '/scrobble/stop', '/scrobble/stop'])
  })

  it('läget ändras bara när SIMKL tog emot: en misslyckad start blockerar inte nästa', async () => {
    let fail = true
    const { scrobble, paths } = setup(true, () => (fail ? { ok: false, status: 500 } : { ok: true }))
    await scrobble(ev())
    fail = false
    await scrobble(ev())
    expect(paths()).toEqual(['/scrobble/start', '/scrobble/start'])
  })
})
