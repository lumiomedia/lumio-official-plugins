import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { useRef } from 'react'

/**
 * mpv-motorn, med och utan mute-bryggan.
 *
 * `openMpvPlayer` startar ALLTID med ljud; tystandet sker efteråt via den
 * valfria `mpvSetPropertyStrings`. På en värd som saknar den bron (alla
 * skrivbordsbyggen före bron fanns) betydde en "tyst" förhandsvisning full
 * volym rakt ut i rummet — hubbens hjältekort spelade alltså ljud utan att
 * någonstans i gränssnittet säga det. Regeln är därför droid-grenens:
 * kan ytan inte tystas öppnas den inte alls, och kortet visar en bildruta.
 *
 * Bryggan läses via en getter så att BÅDA lägena går att prova i samma fil —
 * modulmocken är filgemensam.
 */
const bridge = vi.hoisted(() => ({ available: false }))

vi.mock('@/lib/plugin-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/plugin-sdk')
  return {
    ...actual,
    isDesktopTauriEnv: true,
    isAndroidTauriEnv: false,
    // Vitest mock-namnrymd kastar på okända egenskaper, och video-surface.ts
    // läser de här VALFRIA broarna defensivt (`typeof … === 'function'`). De
    // måste alltså finnas som explicita undefined, precis som de saknas på en
    // äldre värd.
    createVideoSurface: undefined,
    getVideoSurfaceCapabilities: undefined,
    closeAllAuxSurfaces: undefined,
    get mpvSetPropertyStrings() {
      return bridge.available ? (actual.mpvSetPropertyStrings as unknown) : undefined
    },
  }
})

import { surfaceCalls } from '@/lib/plugin-sdk'
import { releaseAllSurfaces, useVideoSurface, videoSurfaceCapabilities, type VideoSurfaceHandle } from './video-surface'

const ch = { name: 'A', group: '', url: 'http://x/a.m3u8', tvgId: null, logo: null }

function Probe({ muted, audio, onHandle }: { muted: boolean; audio: boolean; onHandle: (h: VideoSurfaceHandle) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  onHandle(useVideoSurface(ref, { channel: ch, url: ch.url }, { muted, audio }))
  return <div ref={ref} style={{ width: 100, height: 56, position: 'relative' }} />
}

afterEach(async () => { cleanup(); await releaseAllSurfaces() })
beforeEach(() => { surfaceCalls.length = 0 })

describe('useVideoSurface på mpv', () => {
  it('rapporterar mpv-motorn', () => {
    expect(videoSurfaceCapabilities()).toEqual({ maxLive: 1, engine: 'mpv' })
  })

  it('utan mpvSetPropertyStrings öppnas ingen tyst förhandsvisning alls', async () => {
    bridge.available = false
    let handle: VideoSurfaceHandle | null = null
    render(<Probe muted audio={false} onHandle={(h) => { handle = h }} />)
    await waitFor(() => {
      expect(handle?.frameUrl).toContain('/api/player-frame')
      // Ingen `mpv:open` — hade den öppnats hade den spelat på full volym.
      expect(surfaceCalls).toEqual([])
      expect(handle?.live).toBe(false)
    })
  })

  it('med ljud öppnas ytan även utan bryggan (inget att tysta)', async () => {
    bridge.available = false
    let handle: VideoSurfaceHandle | null = null
    render(<Probe muted={false} audio onHandle={(h) => { handle = h }} />)
    await waitFor(() => expect(handle?.live).toBe(true))
    await waitFor(() => expect(surfaceCalls).toContain(`mpv:open:${ch.url}`))
  })

  it('med bryggan öppnas den tysta förhandsvisningen och tystas', async () => {
    bridge.available = true
    let handle: VideoSurfaceHandle | null = null
    render(<Probe muted audio={false} onHandle={(h) => { handle = h }} />)
    await waitFor(() => expect(handle?.live).toBe(true))
    await waitFor(() => expect(surfaceCalls).toContain('mpv:prop:mute=yes'))
  })
})
