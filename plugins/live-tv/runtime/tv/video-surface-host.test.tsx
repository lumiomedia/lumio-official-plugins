import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { useRef } from 'react'

/**
 * Värdens fleryte-API.
 *
 * `getVideoSurfaceCapabilities()` lovar FLERA samtidiga ytor, så modulens
 * `owner`/`ownerClose` (som bara rymmer EN) kan inte hålla reda på dem.
 * `releaseAllSurfaces()` — som skalet kallar strax innan spelaren öppnas —
 * rev därför bara den senaste, och multivyns övriga rutor fortsatte spela
 * bakom spelaren. Det är precis det anroparen ber om att slippa.
 */
const opened = vi.hoisted(() => [] as Array<{ destroyed: boolean }>)
const closeAllAux = vi.hoisted(() => vi.fn())

vi.mock('@/lib/plugin-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/plugin-sdk')
  return {
    ...actual,
    isDesktopTauriEnv: false,
    isAndroidTauriEnv: false,
    getVideoSurfaceCapabilities: () => ({ maxSurfaces: 3 }),
    createVideoSurface: () => {
      const entry = { destroyed: false }
      opened.push(entry)
      return {
        open: async () => {},
        close: async () => {},
        setBounds: () => {},
        setMuted: async () => {},
        onState: () => () => {},
        destroy: async () => { entry.destroyed = true },
      }
    },
    closeAllAuxSurfaces: closeAllAux,
  }
})

import { releaseAllSurfaces, useVideoSurface, videoSurfaceCapabilities, type VideoSurfaceHandle } from './video-surface'

const ch = (name: string) => ({ name, group: '', url: `http://x/${name}.m3u8`, tvgId: null, logo: null })

function Probe({ name, onHandle }: { name: string; onHandle: (h: VideoSurfaceHandle) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  onHandle(useVideoSurface(ref, { channel: ch(name), url: ch(name).url }, { muted: true, audio: false }))
  return <div ref={ref} style={{ width: 100, height: 56, position: 'relative' }} />
}

afterEach(cleanup)
beforeEach(() => { opened.length = 0; closeAllAux.mockClear() })

describe('useVideoSurface på värdens fleryte-API', () => {
  it('rapporterar värdmotorn med maxSurfaces − 1 levande', () => {
    expect(videoSurfaceCapabilities()).toEqual({ maxLive: 2, engine: 'host' })
  })

  it('releaseAllSurfaces river ALLA värdytor, inte bara den sista', async () => {
    let a: VideoSurfaceHandle | null = null
    let b: VideoSurfaceHandle | null = null
    render(<><Probe name="A" onHandle={(h) => { a = h }} /><Probe name="B" onHandle={(h) => { b = h }} /></>)
    await waitFor(() => {
      expect(a?.live).toBe(true)
      expect(b?.live).toBe(true)
      expect(opened).toHaveLength(2)
    })
    await releaseAllSurfaces()
    expect(opened.every((s) => s.destroyed)).toBe(true)
    await waitFor(() => {
      expect(a?.live).toBe(false)
      expect(b?.live).toBe(false)
    })
  })

  it('releaseAllSurfaces ber också värden städa sina egna extraytor', async () => {
    render(<Probe name="A" onHandle={() => {}} />)
    await waitFor(() => expect(opened).toHaveLength(1))
    await releaseAllSurfaces()
    // Ytor som pluginet aldrig såg (värdens egna) städas bara av värden.
    expect(closeAllAux).toHaveBeenCalledTimes(1)
  })
})
