import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { surfaceCalls } from '@/lib/plugin-sdk'
import { useVideoSurface, videoSurfaceCapabilities, type VideoSurfaceHandle } from './video-surface'

const ch = { name: 'A', group: '', url: 'http://x/a.m3u8', tvgId: null, logo: null }

function Probe({ audio, onHandle }: { audio: boolean; onHandle: (h: VideoSurfaceHandle) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const handle = useVideoSurface(ref, { channel: ch, url: ch.url }, { muted: !audio, audio })
  onHandle(handle)
  return (
    <div ref={ref} data-testid="rect" style={{ width: 100, height: 56, position: 'relative', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', inset: 0 }}>etikett</span>
    </div>
  )
}

afterEach(cleanup)
beforeEach(() => { surfaceCalls.length = 0 })

describe('useVideoSurface v1 (HTML-motor i test)', () => {
  it('rapporterar en levande yta', () => {
    expect(videoSurfaceCapabilities()).toEqual({ maxLive: 1, engine: 'html' })
  })
  it('första instansen blir levande, andra får bildruta', async () => {
    let first: VideoSurfaceHandle | null = null
    let second: VideoSurfaceHandle | null = null
    render(<><Probe audio onHandle={(h) => { first = h }} /><Probe audio={false} onHandle={(h) => { second = h }} /></>)
    await waitFor(() => expect(first?.live).toBe(true))
    await waitFor(() => {
      expect(second?.live).toBe(false)
      expect(second?.frameUrl).toContain('/api/player-frame')
    })
    // Videon ritas INNE i rutan, inte i en portal på body: portalen låg under
    // appens TV-sida (z-index 10) och skalades dubbelt när scenens skala ≠ 1.
    const rects = screen.getAllByTestId('rect')
    expect(rects[0].querySelector('video')).not.toBeNull()
    expect(document.body.querySelector(':scope > video')).toBeNull()
    expect(document.querySelectorAll('video')).toHaveLength(1)
    // Etiketten ligger efter videon i DOM:en och målas därför ovanpå den.
    expect(rects[0].firstElementChild?.tagName).toBe('VIDEO')
  })
  it('städar videon vid unmount', async () => {
    const view = render(<Probe audio onHandle={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('rect').querySelector('video')).not.toBeNull())
    view.unmount()
    expect(document.querySelector('video')).toBeNull()
  })
  it('en evicerad ägare stänger aldrig den nya ägarens ström', async () => {
    let a: VideoSurfaceHandle | null = null
    let b: VideoSurfaceHandle | null = null
    const viewA = render(<Probe audio onHandle={(h) => { a = h }} />)
    await waitFor(() => expect(a?.live).toBe(true))
    render(<Probe audio onHandle={(h) => { b = h }} />)
    await waitFor(() => {
      expect(b?.live).toBe(true)
      expect(a?.live).toBe(false)
    })
    viewA.unmount()
    await waitFor(() => {
      expect(b?.live).toBe(true)
      expect(document.querySelectorAll('video').length).toBe(1)
    })
  })
})
