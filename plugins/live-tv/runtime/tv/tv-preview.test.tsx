import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * Guidens förhandsvisning: samma regel som LivePreviewArt. Kanalbilden ligger
 * kvar tills FÖRSTA BILDRUTAN är ritad — inte bara tills ytan finns. På ett
 * konto med en anslutning kan starten ta länge eller aldrig komma, och då
 * stod rutan svart (Jerry 2026-11-09).
 */
const handle = vi.hoisted(() => ({ ready: false, failed: false, live: true, frameUrl: null as string | null }))
vi.mock('./video-surface', () => ({ useVideoSurface: () => handle }))
const diag = vi.hoisted(() => ({ logSurfaceStack: vi.fn() }))
vi.mock('./surface-diagnostics', () => diag)
import { TvPreview } from './tv-preview'

const channel = { name: 'TV4 HD', group: '', url: 'http://x/tv4', tvgId: null, logo: null }
afterEach(cleanup)

describe('TvPreview', () => {
  it('visar kanalbild och spinner tills första bildrutan är ritad', () => {
    handle.ready = false
    const { container } = render(<TvPreview channel={channel} enabled live width={480} height={270} label="Preview" onOk={() => {}} />)
    expect(screen.getByTestId('preview-spinner')).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).style.background).not.toBe('transparent')
  })
  it('släpper fram videon när bilden kommit', () => {
    handle.ready = true
    const { container } = render(<TvPreview channel={channel} enabled live width={480} height={270} label="Preview" onOk={() => {}} />)
    expect(screen.queryByTestId('preview-spinner')).toBeNull()
    expect((container.firstChild as HTMLElement).style.background).toBe('transparent')
  })
  it('loggar vad som ligger över rutan när bilden kommit (svart ruta efter en spelad kanal, Jerry 2026-11-10)', () => {
    vi.useFakeTimers()
    try {
      handle.ready = true
      diag.logSurfaceStack.mockClear()
      render(<TvPreview channel={channel} enabled live width={480} height={270} label="Preview" onOk={() => {}} />)
      expect(diag.logSurfaceStack).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1500)
      expect(diag.logSurfaceStack).toHaveBeenCalledWith('guide-förhandsvisning +1500 ms', [expect.any(HTMLElement)])
      vi.advanceTimersByTime(3500)
      expect(diag.logSurfaceStack).toHaveBeenCalledWith('guide-förhandsvisning +5000 ms', [expect.any(HTMLElement)])
    } finally {
      vi.useRealTimers()
    }
  })
})
