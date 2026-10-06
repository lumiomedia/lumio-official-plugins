import { describe, expect, it, vi } from 'vitest'
import { createPrefs } from '../../_shared/tracker-kit/prefs'
import type { SimklApi } from './api'
import { createScrobbler } from './tracker'
import type { ScrobbleEvent } from './types'

const ev = (over: Partial<ScrobbleEvent> & { pulse?: boolean } = {}) => ({
  action: 'start' as const, mediaType: 'movie' as const, tmdbId: '27205', imdbId: null, season: null, episode: null, progress: 10, ...over,
})

function setup(on = true, reply: { ok: boolean; status?: number; error?: string } = { ok: true }) {
  const data: Record<string, string> = on ? { simkl_scrobble_enabled: '1' } : {}
  const call = vi.fn(async () => (reply.ok ? { ok: true as const, data: null } : { ok: false as const, status: reply.status ?? 400, retryAfter: null, error: reply.error ?? 'x' }))
  const log = vi.fn()
  const scrobble = createScrobbler({
    api: { call: call as unknown as SimklApi['call'], cdn: vi.fn(), pausedUntil: () => 0, hasAuth: () => true, remaining: () => null },
    prefs: createPrefs({ get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v } }, () => {}, 'simkl'),
    log,
  })
  const paths = () => call.mock.calls.map((c) => (c as unknown as [string, string])[1])
  return { scrobble, call, paths, log }
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
})
