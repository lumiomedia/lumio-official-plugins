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
})
