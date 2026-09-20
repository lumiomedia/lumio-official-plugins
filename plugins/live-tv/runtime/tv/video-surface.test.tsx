import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { surfaceCalls } from '@/lib/plugin-sdk'
import { useVideoSurface, videoSurfaceCapabilities, type VideoSurfaceHandle } from './video-surface'
import { __resetSurfaceCutouts, getSurfaceCutouts } from './surface-cutouts'

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

function StaticProbe() {
  const ref = useRef<HTMLDivElement | null>(null)
  useVideoSurface(ref, { channel: ch, url: ch.url }, { muted: false, audio: true })
  // Medvetet UTAN position: relative.
  return <div ref={ref} data-testid="static-rect" style={{ width: 100, height: 56 }} />
}

afterEach(cleanup)
beforeEach(() => { surfaceCalls.length = 0 })

describe('blockerad autoplay (fjärrklient/iOS)', () => {
  /*
    jsdom implementerar inte HTMLMediaElement.play, så testet stoppar in en
    egen som avvisar MED ljud och lyckas TYST — exakt iOS regel. Vakten finns
    för att avslaget en gång sveptes under ett tomt catch: ljudrutan startade
    aldrig på en fjärrklient och multivyn blev två svarta rutor.
  */
  it('faller tillbaka till tyst uppspelning i stället för att ge upp', async () => {
    const forsok: boolean[] = []
    const proto = window.HTMLMediaElement.prototype as unknown as { play: () => Promise<void> }
    const original = proto.play
    proto.play = function playStub(this: HTMLVideoElement) {
      forsok.push(this.muted)
      return this.muted ? Promise.resolve() : Promise.reject(new Error('NotAllowedError'))
    }
    try {
      render(<Probe audio onHandle={() => {}} />)
      // Första försöket med ljud, andra tyst — och videon blir kvar i rutan.
      await waitFor(() => expect(forsok).toEqual([false, true]))
      await waitFor(() => expect(document.querySelector('video')?.muted).toBe(true))
    } finally {
      proto.play = original
    }
  })
})

describe('useVideoSurface v1 (HTML-motor i test)', () => {
  it('rapporterar en levande yta', () => {
    expect(videoSurfaceCapabilities()).toEqual({ maxLive: 1, engine: 'html', nativeBehindDom: false })
  })
  it('HTML-motorn klipper INGET hål — videon är ett vanligt DOM-element i rutan', async () => {
    __resetSurfaceCutouts()
    let handle: VideoSurfaceHandle | null = null
    render(<Probe audio onHandle={(h) => { handle = h }} />)
    await waitFor(() => expect(handle?.live).toBe(true))
    expect(getSurfaceCutouts()).toHaveLength(0)
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
    expect(document.querySelector('video')?.parentElement).not.toBe(document.body)
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
  it('en evicerad yta tar tillbaka ytan när ägaren försvinner', async () => {
    // Utan omförsöket blev en evicerad förhandsvisning svart FÖR ALLTID: den
    // satte `live=false` och hade ingen väg tillbaka ens när ägarskapet blev
    // ledigt sekunden efter. Uppmätt i multivyn: byt ljudruta fram och
    // tillbaka och den första rutan kom aldrig igen.
    let a: VideoSurfaceHandle | null = null
    let b: VideoSurfaceHandle | null = null
    render(<Probe audio onHandle={(h) => { a = h }} />)
    await waitFor(() => expect(a?.live).toBe(true))
    const viewB = render(<Probe audio onHandle={(h) => { b = h }} />)
    await waitFor(() => {
      expect(b?.live).toBe(true)
      expect(a?.live).toBe(false)
    })
    viewB.unmount()
    await waitFor(() => expect(a?.live).toBe(true))
    expect(document.querySelectorAll('video')).toHaveLength(1)
  })
  it('en statisk ruta får portalen i stället — hooken skriver aldrig i anroparens stil', async () => {
    render(<StaticProbe />)
    await waitFor(() => expect(document.querySelector('video')).not.toBeNull())
    const rect = screen.getByTestId('static-rect')
    expect(rect.querySelector('video')).toBeNull()
    expect(document.querySelector('video')?.parentElement).toBe(document.body)
    expect(rect.style.position).toBe('')
  })
})
