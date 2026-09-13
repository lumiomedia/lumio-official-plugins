import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import {
  __resetSurfaceCutouts,
  cutoutClipPath,
  getSurfaceCutouts,
  registerSurfaceCutout,
  subscribeSurfaceCutouts,
  unregisterSurfaceCutout,
} from './surface-cutouts'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

const ch = (name: string) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'X', channels: [ch('A'), ch('B'), ch('C')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(() => { cleanup(); __resetSurfaceCutouts() })
beforeEach(() => {
  __resetForTests()
  __resetSurfaceCutouts()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_multiview_v1', { layout: 4, tiles: [channelKey(ch('A')), null, null, null], audioIndex: 0 })
  seedLiveTvIndex()
})

const mount = (view = 'multi') => render(<LiveTvTvShell pageId="live-tv-browse" params={{ view }} onNavigate={() => {}} onOpenDetails={() => {}} />)

const rect = (left: number, top: number) => ({ left, top, width: 480, height: 270, radius: 14 })

describe('surface-cutouts (registret)', () => {
  it('registrerar, flyttar och avregistrerar ett hål', () => {
    const key = Symbol('yta')
    expect(getSurfaceCutouts()).toHaveLength(0)
    registerSurfaceCutout(key, rect(10, 20))
    expect(getSurfaceCutouts()).toEqual([{ left: 10, top: 20, width: 480, height: 270, radius: 14 }])
    registerSurfaceCutout(key, rect(11, 20))
    expect(getSurfaceCutouts()).toHaveLength(1)
    expect(getSurfaceCutouts()[0].left).toBe(11)
    unregisterSurfaceCutout(key)
    expect(getSurfaceCutouts()).toHaveLength(0)
  })

  it('flera ytor får varsitt hål och rivs oberoende', () => {
    const a = Symbol('a')
    const b = Symbol('b')
    registerSurfaceCutout(a, rect(0, 0))
    registerSurfaceCutout(b, rect(500, 0))
    expect(getSurfaceCutouts()).toHaveLength(2)
    unregisterSurfaceCutout(a)
    expect(getSurfaceCutouts()).toEqual([{ left: 500, top: 0, width: 480, height: 270, radius: 14 }])
  })

  it('oförändrad rektangel ger varken händelse eller ny ögonblicksbild', () => {
    // ResizeObserver skickar samma mått om och om igen. En ny array per
    // avläsning hade gett en oändlig render→mät→render-slinga i skalet.
    const key = Symbol('yta')
    let events = 0
    const off = subscribeSurfaceCutouts(() => { events += 1 })
    registerSurfaceCutout(key, rect(10, 20))
    const first = getSurfaceCutouts()
    registerSurfaceCutout(key, rect(10, 20))
    expect(events).toBe(1)
    expect(getSurfaceCutouts()).toBe(first)
    off()
  })

  it('avregistrering av en okänd yta väcker ingen', () => {
    let events = 0
    const off = subscribeSurfaceCutouts(() => { events += 1 })
    unregisterSurfaceCutout(Symbol('finns inte'))
    expect(events).toBe(0)
    off()
  })
})

describe('cutoutClipPath', () => {
  it('ger en evenodd-bana med hålets koordinater', () => {
    const clip = cutoutClipPath([{ left: 100, top: 50, width: 400, height: 200, radius: 0 }])
    expect(clip.startsWith('path(evenodd, "')).toBe(true)
    expect(clip).toContain('M100 50H500V250H100Z')
  })

  it('rundar hörnen när rutan har radie, klampat till halva sidan', () => {
    const clip = cutoutClipPath([{ left: 0, top: 0, width: 100, height: 40, radius: 90 }])
    // 90 klampas till 20 (halva höjden), annars skulle bågarna korsa varandra.
    expect(clip).toContain('A20 20 0 0 1')
  })

  it('hoppar över tomma rektanglar men behåller den yttre banan', () => {
    const clip = cutoutClipPath([{ left: 0, top: 0, width: 0, height: 0, radius: 0 }])
    expect(clip).toBe(cutoutClipPath([]))
  })
})

describe('TV-skalets bakgrund', () => {
  it('utan hål: bakgrunden sitter på roten och ingen bakgrundsplatta ritas', () => {
    mount()
    const root = document.querySelector('[data-live-tv-tv-root]') as HTMLElement
    expect(root.style.background).toBe('#000')
    expect(document.querySelector('[data-live-tv-backdrop]')).toBeNull()
  })

  it('med hål: roten blir genomskinlig och plattan bär ett clip-path med hålets mått', () => {
    registerSurfaceCutout(Symbol('yta'), { left: 120, top: 80, width: 400, height: 225, radius: 0 })
    mount()
    const root = document.querySelector('[data-live-tv-tv-root]') as HTMLElement
    expect(root.style.background).toBe('transparent')
    const backdrop = document.querySelector('[data-live-tv-backdrop]') as HTMLElement
    expect(backdrop).not.toBeNull()
    expect(backdrop.style.background).toBe('#000')
    expect(backdrop.style.pointerEvents).toBe('none')
    expect(backdrop.style.clipPath).toContain('evenodd')
    expect(backdrop.style.clipPath).toContain('M120 80H520V305H120Z')
  })
})

describe('Multivyns rutor', () => {
  it('rutan med en levande yta är genomskinlig, tom ruta behåller plattan', () => {
    mount()
    const tiles = screen.getAllByTestId('mv-tile') as HTMLElement[]
    expect(tiles[0].style.background).toBe('transparent')
    expect(tiles[1].style.background).toBe('#05070d')
  })
})
