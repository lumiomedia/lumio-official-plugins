import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
vi.mock('../vod-autoscan', async (orig) => ({ ...(await orig<object>()), vodHomeStatus: vi.fn(), maybeAutoScanVod: vi.fn(async () => 'skipped') }))
import { VOD_READY_EVENT, maybeAutoScanVod, vodHomeStatus, type VodHomeStatus } from '../vod-autoscan'
import { TvVodPreparing, PREPARING_POLL_MS } from './tv-vod-preparing'
import { getTvSettings } from './tv-settings-store'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'

const nav = () => ({ go: vi.fn(), toast: vi.fn(), pushLayer: vi.fn(() => () => {}), playerOpen: false, params: {}, view: 'preparing' }) as unknown as TvNav
const model = { nowMs: Date.now() } as unknown as LiveTvModel
const status = (s: VodHomeStatus) => { vi.mocked(vodHomeStatus).mockResolvedValue(s) }

beforeEach(() => { __resetForTests(); __setTvModeForTests(false); vi.clearAllMocks(); vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

const mount = () => render(<TvVodPreparing model={model} nav={nav()} params={{}} settings={getTvSettings()} phone={false} />)

describe('TvVodPreparing', () => {
  it('visar hur långt genomgången kommit som stapel och tal', async () => {
    status({ state: 'indexing', indexed: 400, total: 8148 })
    mount()
    await act(async () => { await Promise.resolve() })
    expect(screen.getByTestId('vod-preparing-count')).toHaveTextContent('400 of 8,148')
    expect(screen.getByTestId('vod-preparing-bar').querySelector('[data-fill]')).toHaveStyle({ width: '5%' })
  })
  it('utan tal ännu: ingen stapel, men texten om att katalogen hämtas', async () => {
    status({ state: 'importing', indexed: null, total: null })
    mount()
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByTestId('vod-preparing-bar')).toBeNull()
    expect(screen.getByTestId('vod-preparing-state')).toHaveTextContent('still downloading')
  })
  it('pollar, och säger till när biblioteket blev färdigt', async () => {
    status({ state: 'indexing', indexed: 8000, total: 8148 })
    const ready = vi.fn()
    window.addEventListener(VOD_READY_EVENT, ready)
    try {
      mount()
      await act(async () => { await Promise.resolve() })
      expect(ready).not.toHaveBeenCalled()
      status({ state: 'ready', indexed: null, total: null })
      await act(async () => { vi.advanceTimersByTime(PREPARING_POLL_MS); await Promise.resolve() })
      expect(ready).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener(VOD_READY_EVENT, ready)
    }
  })
  it('ett misslyckat eller aldrig startat försök startas om när sidan öppnas', async () => {
    status({ state: 'failed', indexed: null, total: 8148 })
    mount()
    await act(async () => { await Promise.resolve() })
    expect(maybeAutoScanVod).toHaveBeenCalledWith({ force: true })
  })
})
