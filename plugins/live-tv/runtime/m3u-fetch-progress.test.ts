import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getM3uFetchProgress,
  resetM3uFetchProgressForTests,
  runM3uFetch,
  subscribeM3uFetch,
} from './m3u-fetch-progress'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  resetM3uFetchProgressForTests()
})

describe('m3u fetch progress', () => {
  it('räknar upp per lista och behåller kanalantalet', async () => {
    const gate = [deferred<number>(), deferred<number>()]
    let call = 0
    const run = runM3uFetch(['http://a/1.m3u', 'http://b/2.m3u'], () => gate[call++].promise)

    expect(getM3uFetchProgress().status).toBe('fetching')
    expect(getM3uFetchProgress()).toMatchObject({ current: 1, total: 2, url: 'http://a/1.m3u' })

    gate[0].resolve(120)
    await vi.waitFor(() => expect(getM3uFetchProgress().current).toBe(2))
    expect(getM3uFetchProgress().results).toEqual([{ url: 'http://a/1.m3u', channels: 120 }])

    gate[1].resolve(7)
    await run

    expect(getM3uFetchProgress()).toMatchObject({
      status: 'done',
      results: [
        { url: 'http://a/1.m3u', channels: 120 },
        { url: 'http://b/2.m3u', channels: 7 },
      ],
    })
  })

  it('behåller klartillståndet — det försvinner inte av sig själv', async () => {
    vi.useFakeTimers()
    try {
      await runM3uFetch(['http://a/1.m3u'], async () => 4)
      expect(getM3uFetchProgress().status).toBe('done')
      vi.advanceTimersByTime(60_000)
      expect(getM3uFetchProgress().status).toBe('done')
    } finally {
      vi.useRealTimers()
    }
  })

  it('vägrar en andra hämtning medan en pågår', async () => {
    const gate = deferred<number>()
    const first = runM3uFetch(['http://a/1.m3u'], () => gate.promise)
    const fetchOne = vi.fn(async () => 1)

    await expect(runM3uFetch(['http://b/2.m3u'], fetchOne)).resolves.toBe(false)
    expect(fetchOne).not.toHaveBeenCalled()

    gate.resolve(1)
    await expect(first).resolves.toBe(true)
  })

  it('ett fel lämnar felstatus och behåller det som redan hämtats', async () => {
    const ok = await runM3uFetch(['http://a/1.m3u', 'http://b/2.m3u'], async (url) => {
      if (url === 'http://b/2.m3u') throw new Error('502 Bad Gateway')
      return 9
    })

    expect(ok).toBe(false)
    expect(getM3uFetchProgress()).toMatchObject({
      status: 'error',
      error: '502 Bad Gateway',
      results: [{ url: 'http://a/1.m3u', channels: 9 }],
    })
  })

  it('en tom lista av adresser startar ingen hämtning', async () => {
    const fetchOne = vi.fn(async () => 1)
    await expect(runM3uFetch([], fetchOne)).resolves.toBe(false)
    expect(fetchOne).not.toHaveBeenCalled()
    expect(getM3uFetchProgress().status).toBe('idle')
  })

  it('meddelar prenumeranter vid varje steg', async () => {
    const seen: string[] = []
    const unsubscribe = subscribeM3uFetch(() => seen.push(getM3uFetchProgress().status))
    await runM3uFetch(['http://a/1.m3u'], async () => 3)
    unsubscribe()

    expect(seen[0]).toBe('fetching')
    expect(seen.at(-1)).toBe('done')
  })
})
