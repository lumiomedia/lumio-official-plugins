import { describe, expect, it, vi } from 'vitest'
import { createPrefs } from './prefs'
import { createScrobbler } from './tracker'
import type { ScrobbleEvent } from './types'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return { get: (k: string) => data[k] ?? null, set: (k: string, v: string) => { data[k] = v } }
}

const ev = (over: Partial<ScrobbleEvent> = {}): ScrobbleEvent => ({
  action: 'start', mediaType: 'movie', tmdbId: '603', imdbId: null, season: null, episode: null, progress: 10, ...over,
})

function setup(on = true) {
  let clock = 0
  const call = vi.fn(async () => ({ ok: true as const, data: null }))
  const prefs = createPrefs(memoryStorage(on ? { mdblist_scrobble_enabled: '1' } : {}), () => {})
  const scrobble = createScrobbler({
    api: { call, getAllPages: vi.fn(), pausedUntil: () => 0, hasAuth: () => true },
    prefs, now: () => clock, log: () => {},
  })
  return { call, scrobble, tick: (ms: number) => { clock += ms } }
}

describe('scrobble-trackern', () => {
  it('reglagen är av som standard', () => {
    const prefs = createPrefs(memoryStorage(), () => {})
    expect(prefs.isOn('scrobble')).toBe(false)
    expect(prefs.isOn('watched')).toBe(false)
    expect(prefs.isOn('watchlist')).toBe(false)
  })

  it('skickar till rätt endpoint med rätt payload', async () => {
    const { call, scrobble } = setup()
    await scrobble(ev({ action: 'pause', progress: 42.5 }))
    expect(call).toHaveBeenCalledWith('POST', '/scrobble/pause', { body: { movie: { ids: { tmdb: 603 } }, progress: 42.5 } })
  })

  it('gör ingenting när reglaget är av', async () => {
    const { call, scrobble } = setup(false)
    await scrobble(ev())
    expect(call).not.toHaveBeenCalled()
  })

  it('släpper dubbletter inom 5 s men inte nya tick', async () => {
    const { call, scrobble, tick } = setup()
    await scrobble(ev({ action: 'pause', progress: 50 }))
    await scrobble(ev({ action: 'pause', progress: 50.2 }))
    expect(call).toHaveBeenCalledTimes(1)
    tick(30_000)
    await scrobble(ev({ action: 'pause', progress: 50.2 }))
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('avsnitt utan säsong skickas inte', async () => {
    const { call, scrobble } = setup()
    await scrobble(ev({ mediaType: 'episode', season: null, episode: 3 }))
    expect(call).not.toHaveBeenCalled()
  })
})
