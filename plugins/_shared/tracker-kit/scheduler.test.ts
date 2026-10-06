import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startScheduler } from './scheduler'

describe('schemaläggaren', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  function setup(intervalMs?: number, neverSynced?: () => boolean) {
    const run = vi.fn(async (_opts: { pushWatched: boolean; reason: string }) => {})
    const fire: Record<string, () => void> = {}
    const stop = startScheduler({
      run,
      intervalMs,
      neverSynced,
      onKeyChanged: (l) => { fire.key = l; return () => {} },
      onPrefsChanged: (l) => { fire.prefs = l; return () => {} },
      onProfileChanged: (l) => { fire.profile = l; return () => {} },
    })
    return { run, fire, stop }
  }

  it('första körningen efter 50 s hämtar bara; intervallet var 15:e minut skickar', async () => {
    const { run } = setup()
    await vi.advanceTimersByTimeAsync(49_999)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(run).toHaveBeenLastCalledWith({ pushWatched: false, reason: 'start' })
    await vi.advanceTimersByTimeAsync(15 * 60_000)
    expect(run).toHaveBeenLastCalledWith({ pushWatched: true, reason: 'intervall' })
  })

  it('ny nyckel, nya reglage och profilbyte ger en hämtningskörning', () => {
    const { run, fire } = setup()
    fire.key(); fire.prefs(); fire.profile()
    expect(run.mock.calls.map(([o]) => o)).toEqual([
      { pushWatched: false, reason: 'ny nyckel' },
      { pushWatched: false, reason: 'ändrade reglage' },
      { pushWatched: false, reason: 'profilbyte' },
    ])
  })

  it('första synken (ansluten i onboardingen) körs efter 5 s åt båda hållen', async () => {
    const { run } = setup(undefined, () => true)
    await vi.advanceTimersByTimeAsync(4_999)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenLastCalledWith({ pushWatched: true, reason: 'första synk' })
    // Ingen extra startkörning efter 50 s — första synken ersätter den.
    await vi.advanceTimersByTimeAsync(50_000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('redan synkad: start efter 50 s som förut', async () => {
    const { run } = setup(undefined, () => false)
    await vi.advanceTimersByTimeAsync(50_000)
    expect(run).toHaveBeenLastCalledWith({ pushWatched: false, reason: 'start' })
  })

  it('stopp rensar timrarna', async () => {
    const { run, stop } = setup()
    stop()
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(run).not.toHaveBeenCalled()
  })

  it('M3: pluginet kan välja längre intervall (SIMKL: 30 min)', async () => {
    const { run } = setup(30 * 60_000)
    await vi.advanceTimersByTimeAsync(50_000 + 15 * 60_000)
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15 * 60_000)
    expect(run).toHaveBeenLastCalledWith({ pushWatched: true, reason: 'intervall' })
  })
})
