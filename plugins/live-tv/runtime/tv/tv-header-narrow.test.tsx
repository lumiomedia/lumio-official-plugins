import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))

import { LiveTvTvShell } from './tv-shell'

/**
 * SCENEN ÄR INTE ALLTID 1920 DESIGNPIXLAR BRED.
 *
 * `tvScene()` i appen lägger ut scenen i 1080 designpixlars HÖJD, men under
 * `TV_SCENE_MIN_WIDTH_PX` (1280) byter den gren: ett fönster som är smalare än
 * 16:9 får i stället 1280 designpixlars BREDD och en högre scen. Skrivbordets
 * TV-läge i ett vanligt fönster hamnar därför på 1280 — och rubrikrader som
 * ritats för 1920 krockade där (uppmätt av Jerry: segmentväxeln bröt "Now /
 * Next" över tre rader och klockan lade sig över listtiteln).
 *
 * happy-dom lägger inte ut något, så testerna kan inte mäta överlapp. De
 * kontrollerar i stället REGLERNA som gör raden tålig: segmentet är en enhet
 * som aldrig bryter sina etiketter, klockan är ett eget block som inte krymper
 * (och som INTE ligger inne i en textspan — ett blockelement i en inline-låda
 * är precis det som ritade klockan ovanpå hälsningen), titeln trunkerar, och
 * raden radbryter i stället för att svämma över.
 */
const atDesignWidth = (width: number, height = 1000) => {
  document.documentElement.style.setProperty('--tv-scene-w', String(width))
  document.documentElement.style.setProperty('--tv-scene-h', String(height))
  document.documentElement.style.setProperty('--tv-scene-scale', '1')
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = {
  id: 'l1',
  name: 'vpn.cleannordy.com',
  channels: [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'News')],
  createdAt: '',
  urlTvg: null,
  epgUrls: [],
  autoEpgDisabled: false,
  fetchedAt: null,
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
  atDesignWidth(1280)
})

const mountGuide = async (mode: string) => {
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', mode)
  const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'guide' }} onNavigate={() => {}} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return rendered
}

const mountHub = async () => {
  const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={{}} onNavigate={() => {}} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return rendered
}

describe('Rubrikrader vid 1280 designpixlar', () => {
  it('segmentväxeln är en enhet som aldrig bryter sina etiketter', async () => {
    await mountGuide('now')
    const segment = screen.getByTestId('tv-segment')
    expect(segment.style.flexShrink).toBe('0')
    expect(segment.style.whiteSpace).toBe('nowrap')
    expect(segment.style.maxWidth).toBe('100%')
    const options = screen.getAllByTestId('tv-segment-option')
    expect(options.length).toBe(4)
    for (const option of options) expect(option.style.whiteSpace).toBe('nowrap')
    // "Now / Next" står kvar som en etikett, inte tre rader.
    expect(options[0]).toHaveTextContent('Now / Next')
  })

  it('guidens klocka är ett eget block som inte krymper, inte inbakad i kanalraden', async () => {
    await mountGuide('now')
    const clock = screen.getByTestId('guide-clock')
    expect(clock.style.flexShrink).toBe('0')
    // Ett blockelement (värdens TvClock är två rader) får inte ligga i en
    // inline-låda: SPAN gav ritningen ovanpå hälsningen.
    expect(clock.tagName).toBe('DIV')
    expect(clock.closest('span')).toBeNull()
    // Kanalnamnet är det som ger vika när raden blir smal. Toppbandet fylls av
    // den fokuserade raden (värdens fokusmotor gör det i skarp drift).
    fireEvent.focus(screen.getAllByTestId('guide-row')[0])
    const name = screen.getByTestId('guide-channel-name')
    expect(name.style.textOverflow).toBe('ellipsis')
    expect(name.style.whiteSpace).toBe('nowrap')
    expect(name.style.minWidth).toBe('0')
  })

  it('guidens rubrikrad radbryter i stället för att svämma över', async () => {
    await mountGuide('now')
    const row = screen.getByTestId('guide-meta-row')
    expect(row.style.flexWrap).toBe('wrap')
  })

  it('spellistvyns rubrik trunkerar titeln och håller klocka och segment hela', async () => {
    await mountGuide('playlists')
    const header = screen.getByTestId('pl-header')
    expect(header.style.flexWrap).toBe('wrap')
    // En trunkerande titel är en rullningsbehållare och får en syntetiserad
    // baslinje — `baseline` hade sänkt titeln några pixlar även på 1920.
    expect(header.style.alignItems).toBe('center')
    const title = screen.getByTestId('pl-title')
    expect(title).toHaveTextContent('vpn.cleannordy.com')
    expect(title.style.textOverflow).toBe('ellipsis')
    expect(title.style.whiteSpace).toBe('nowrap')
    expect(title.style.minWidth).toBe('0')
    const meta = screen.getByTestId('pl-meta')
    expect(meta.style.whiteSpace).toBe('nowrap')
    expect(meta.style.flexShrink).toBe('0')
    const clock = screen.getByTestId('pl-clock')
    expect(clock.style.flexShrink).toBe('0')
    expect(clock.tagName).toBe('DIV')
    expect(clock.closest('span')).toBeNull()
    // Klockan står kvar efter antalet (1920-looken), men som egen låda.
    expect(meta.compareDocumentPosition(clock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByTestId('tv-segment').style.flexShrink).toBe('0')
  })

  it('hubbens topprad radbryter och håller klockan hel', async () => {
    await mountHub()
    const row = screen.getByTestId('hub-topbar')
    expect(row.style.flexWrap).toBe('wrap')
    const clock = screen.getByTestId('hub-clock')
    expect(clock.style.flexShrink).toBe('0')
    expect(clock.closest('span')).toBeNull()
  })
})
