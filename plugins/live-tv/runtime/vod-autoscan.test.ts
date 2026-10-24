import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/plugin-sdk', async (orig) => ({ ...(await orig<object>()), fetchLibraryStatus: vi.fn(), isLibraryScanRunning: vi.fn(() => false), runLibraryScan: vi.fn(async () => {}) }))
vi.mock('./vod-client', async (orig) => ({ ...(await orig<object>()), vodStatus: vi.fn() }))
import { fetchLibraryStatus, isLibraryScanRunning, runLibraryScan } from '@/lib/plugin-sdk'
import { vodStatus, type VodSourceStatus } from './vod-client'
import { maybeAutoScanVod, resetVodAutoScanForTests, retryDelayMs, vodHomeState } from './vod-autoscan'
import { setVodMode } from './vod-data'
import { ensureVodChoiceMigrated, resetVodCategoryChoiceForTests, setVodCategoryChoice } from './vod-category-filter'

const source = (id: string): VodSourceStatus => ({ id, total: 100, movies: 80, series: 20, updatedAt: 1, importing: false })
const status = (sources: Array<{ id: string; lastFullSync?: number | null }>) =>
  ({ sources: sources.map((s) => ({ provider: 'xtream-vod', titles: 1, ...s })), movies: 0, series: 0, unmatched: 0, total: 0 }) as never

beforeEach(() => { vi.clearAllMocks(); vi.mocked(isLibraryScanRunning).mockReturnValue(false); resetVodAutoScanForTests(); resetVodCategoryChoiceForTests() })

describe('maybeAutoScanVod', () => {
  it('indexerar aldrig när VOD-läget är off, och förbrukar inte flaggan', async () => {
    vi.mocked(vodStatus).mockResolvedValue([source('a')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    setVodMode(null, 'off')
    try {
      expect(await maybeAutoScanVod()).toBe('skipped')
      expect(vodStatus).not.toHaveBeenCalled()
      expect(runLibraryScan).not.toHaveBeenCalled()
    } finally {
      setVodMode(null, 'link')
    }
    expect(await maybeAutoScanVod()).toBe('started')
  })
  it('ett försök per källa; nytt försök först efter väntan, eller direkt med force', async () => {
    vi.mocked(vodStatus).mockResolvedValue([source('a')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    const t0 = 1_000_000
    expect(await maybeAutoScanVod({ now: t0 })).toBe('started')
    expect(runLibraryScan).toHaveBeenCalledTimes(1)
    // Genomgången blev inte färdig (ingen lastFullSync): inget nytt försök direkt …
    expect(await maybeAutoScanVod({ now: t0 + 60_000 })).toBe('skipped')
    // … men efter väntan, och direkt när användaren ber om det.
    expect(await maybeAutoScanVod({ now: t0 + retryDelayMs(1) })).toBe('started')
    expect(await maybeAutoScanVod({ now: t0 + retryDelayMs(1) + 1, force: true })).toBe('started')
    expect(runLibraryScan).toHaveBeenCalledTimes(3)
    expect(retryDelayMs(5)).toBe(6 * 60 * 60_000)
  })
  it('en avbruten genomgång (biblioteket utan lastFullSync) görs om; en färdig källa rörs inte, en ny källa indexeras', async () => {
    vi.mocked(vodStatus).mockResolvedValue([source('a'), source('b')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([{ id: 'xtream-vod:a', lastFullSync: 1 }, { id: 'xtream-vod:b', lastFullSync: null }]))
    expect(await maybeAutoScanVod()).toBe('started')
    expect(runLibraryScan).toHaveBeenCalledTimes(1)
    expect(vi.mocked(runLibraryScan).mock.calls[0][1]).toMatchObject({ id: 'xtream-vod:b' })
  })
  it('skippar när alla källor redan är färdiga', async () => {
    vi.mocked(vodStatus).mockResolvedValue([source('a')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([{ id: 'xtream-vod:a', lastFullSync: 1 }]))
    expect(await maybeAutoScanVod()).toBe('skipped')
    expect(runLibraryScan).not.toHaveBeenCalled()
  })
  it('skippar när en genomgång redan kör', async () => {
    vi.mocked(isLibraryScanRunning).mockReturnValueOnce(true)
    expect(await maybeAutoScanVod()).toBe('skipped')
    expect(runLibraryScan).not.toHaveBeenCalled()
  })
  it('skippar utan VOD-källa', async () => {
    vi.mocked(vodStatus).mockResolvedValue([])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    expect(await maybeAutoScanVod()).toBe('skipped')
  })
  it('ett fel räknas som ett försök och nästa källa körs', async () => {
    vi.mocked(vodStatus).mockResolvedValue([source('a'), source('b')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    vi.mocked(runLibraryScan).mockRejectedValueOnce(new Error('panel'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await maybeAutoScanVod({ now: 0 })
    expect(runLibraryScan).toHaveBeenCalledTimes(2)
    expect(await maybeAutoScanVod({ now: 1000 })).toBe('skipped')
  })
  it('två samtidiga anrop startar bara en genomgång', async () => {
    vi.mocked(vodStatus).mockResolvedValue([source('a')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    const [x, y] = await Promise.all([maybeAutoScanVod(), maybeAutoScanVod()])
    expect([x, y].sort()).toEqual(['skipped', 'started'])
    expect(runLibraryScan).toHaveBeenCalledTimes(1)
  })
  it('hoppar över helt medan en källa importeras, utan flagga, och startar när den är klar', async () => {
    vi.mocked(vodStatus).mockResolvedValue([{ ...source('a'), importing: true }])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    expect(await maybeAutoScanVod()).toBe('skipped')
    expect(runLibraryScan).not.toHaveBeenCalled()
    vi.mocked(vodStatus).mockResolvedValue([source('a')])
    expect(await maybeAutoScanVod()).toBe('started')
    expect(runLibraryScan).toHaveBeenCalledTimes(1)
  })
  it('en källa som kommer efter migreringen väntar på kategorivalet', async () => {
    await ensureVodChoiceMigrated(async () => [])
    vi.mocked(vodStatus).mockResolvedValue([source('ny')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    expect(await maybeAutoScanVod()).toBe('skipped')
    expect(runLibraryScan).not.toHaveBeenCalled()
    setVodCategoryChoice('ny', ['42'])
    expect(await maybeAutoScanVod()).toBe('started')
    expect(runLibraryScan).toHaveBeenCalledTimes(1)
  })
  it('källor som fanns före funktionen räknas som valda', async () => {
    vi.mocked(vodStatus).mockResolvedValue([source('gammal')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    expect(await maybeAutoScanVod()).toBe('started')
  })
})

describe('vodHomeState: vad Hem väntar på', () => {
  it('färdigt, ingen VOD, kategorival, import, genomgång, misslyckat och väntar', async () => {
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([{ id: 'xtream-vod:a', lastFullSync: 1 }]))
    vi.mocked(vodStatus).mockResolvedValue([source('a')])
    expect(await vodHomeState()).toBe('ready')
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    vi.mocked(vodStatus).mockResolvedValue([])
    expect(await vodHomeState()).toBe('no-vod')
    vi.mocked(vodStatus).mockResolvedValue([{ ...source('a'), total: 0, importing: true }])
    expect(await vodHomeState()).toBe('importing')
    vi.mocked(vodStatus).mockResolvedValue([source('a')])
    expect(await vodHomeState()).toBe('waiting')
    vi.mocked(isLibraryScanRunning).mockReturnValue(true)
    expect(await vodHomeState()).toBe('indexing')
    vi.mocked(isLibraryScanRunning).mockReturnValue(false)
    await maybeAutoScanVod()
    expect(await vodHomeState()).toBe('failed')
  })
  it('en ny källa utan kategorival', async () => {
    await ensureVodChoiceMigrated(async () => [])
    vi.mocked(vodStatus).mockResolvedValue([source('ny')])
    vi.mocked(fetchLibraryStatus).mockResolvedValue(status([]))
    expect(await vodHomeState()).toBe('choose')
  })
  it('dolt VOD', async () => {
    setVodMode(null, 'off')
    try { expect(await vodHomeState()).toBe('hidden') } finally { setVodMode(null, 'link') }
  })
})
