import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { useRef } from 'react'

/**
 * EN NATIV YTA FÖLJER RUTAN ÄVEN NÄR RUTAN BARA FLYTTAR SIG.
 *
 * ResizeObserver ser bara STORLEKSändringar i layoutpixlar. När sidan lägger
 * om sig runt rutan — scenens transform, en rubrikrad som kommer tillbaka när
 * spelaren stängts — flyttas rutan på skärmen utan att dess layoutstorlek
 * ändras, och ytan + hålet i skalets bakgrund blev kvar där rutan stod vid
 * första mätningen. Spelaren (live-tv-player.tsx) har av samma skäl mätt om i
 * en trappa efter start; rutorna gör nu likadant.
 */
const bounds = vi.hoisted(() => [] as Array<{ left: number; top: number; width: number; height: number }>)

vi.mock('@/lib/plugin-sdk', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/plugin-sdk')
  return {
    ...actual,
    isDesktopTauriEnv: false,
    isAndroidTauriEnv: false,
    getVideoSurfaceCapabilities: () => ({ maxSurfaces: 4, nativeBehindDom: true }),
    createVideoSurface: () => ({
      open: async () => {},
      close: async () => {},
      setBounds: (rect: { left: number; top: number; width: number; height: number }) => { bounds.push(rect) },
      setMuted: async () => {},
      onState: () => () => {},
      destroy: async () => {},
    }),
    closeAllAuxSurfaces: () => {},
  }
})

import { useVideoSurface } from './video-surface'
import { __resetSurfaceCutouts, getSurfaceCutouts } from './surface-cutouts'

const ch = { name: 'A', group: '', url: 'http://x/a.m3u8', tvgId: null, logo: null }
let rect = { left: 0, top: 0, width: 400, height: 225 }

function Probe() {
  const ref = useRef<HTMLDivElement | null>(null)
  useVideoSurface(ref, { channel: ch, url: ch.url }, { muted: true, audio: false })
  return (
    <div
      ref={(el) => {
        ref.current = el
        if (el) el.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect
      }}
      style={{ position: 'relative' }}
    />
  )
}

beforeEach(() => { bounds.length = 0; rect = { left: 100, top: 100, width: 400, height: 225 }; __resetSurfaceCutouts(); vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('useVideoSurface mäter om efter start', () => {
  it('en ruta som flyttats utan att ändra storlek får nya bounds och nytt hål', async () => {
    render(<Probe />)
    await act(async () => { await Promise.resolve() })
    expect(bounds.at(-1)).toEqual({ left: 100, top: 100, width: 400, height: 225 })
    // Sidan lägger om sig: rutan flyttar 60 px nedåt, samma storlek.
    rect = { left: 100, top: 160, width: 400, height: 225 }
    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(bounds.at(-1)).toEqual({ left: 100, top: 160, width: 400, height: 225 })
    expect(getSurfaceCutouts()).toEqual([{ left: 100, top: 160, width: 400, height: 225, radius: 0 }])
  })

  it('mäter inte om i all evighet', async () => {
    render(<Probe />)
    await act(async () => { await Promise.resolve() })
    await act(async () => { vi.advanceTimersByTime(5000) })
    const settled = bounds.length
    rect = { left: 0, top: 0, width: 400, height: 225 }
    await act(async () => { vi.advanceTimersByTime(60_000) })
    expect(bounds.length).toBe(settled)
  })
})
