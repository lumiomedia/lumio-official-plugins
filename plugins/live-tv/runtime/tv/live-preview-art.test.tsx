import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * En live-kanal tar flera sekunder att starta (samma väg som spelaren). Under
 * tiden ska reservbilden ligga kvar — förut doldes den så fort ytan skapades
 * och rutan stod svart tills första bildrutan kom (Jerry 2026-10-30).
 */
const handle = vi.hoisted(() => ({ ready: false, failed: false, live: true, frameUrl: null as string | null }))
vi.mock('./video-surface', () => ({ useVideoSurface: () => handle }))
import { LivePreviewArt } from './live-preview-art'

const channel = { name: 'TV4 HD', group: '', url: 'http://x/tv4', tvgId: null, logo: null }
afterEach(cleanup)

describe('LivePreviewArt', () => {
  it('reservbilden ligger kvar tills första bildrutan är ritad', () => {
    handle.ready = false
    render(<LivePreviewArt channel={channel} live enabled fallback={<div data-testid="fb" />} />)
    expect(screen.getByTestId('fb')).toBeInTheDocument()
  })
  it('försvinner när videon visar bild', () => {
    handle.ready = true
    render(<LivePreviewArt channel={channel} live enabled fallback={<div data-testid="fb" />} />)
    expect(screen.queryByTestId('fb')).toBeNull()
  })
})
