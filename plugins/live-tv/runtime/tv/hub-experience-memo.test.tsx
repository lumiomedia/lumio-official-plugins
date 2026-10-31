import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'
import { setTvSettings } from './tv-settings-store'

/**
 * Prestanda (Mi Box S 2026-10-31): varje pil-tryck i Upplevelse ritade om
 * alla ~100 kort (CardFace, programbildsuppslag, påminnelser) — ~0,65 s
 * huvudtråd. Korten är nu memoiserade: bara kort vars fokus/läge ändras
 * ritas om. Räknas som antalet kortstationer (`data-xp="rN-M"`) som byggs.
 */
const built = vi.hoisted(() => ({ n: 0 }))
vi.mock('./tv-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./tv-ui')>()
  return { ...actual, station: (...args: Parameters<typeof actual.station>) => { if (/^r\d+-\d+$/.test(args[2]?.['data-xp'] ?? '')) built.n++; return actual.station(...args) } }
})
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const NAMES = Array.from({ length: 24 }, (_, i) => `K${i}`)
const list: LiveTvList = {
  id: 'l1', name: 'Xtream', channels: NAMES.map((name) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: `${name}.tv` })),
  createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
const cache: EpgCacheEntry = {
  index: Object.fromEntries(NAMES.map((name) => [`${name}.tv`, [
    { title: `${name} nu`, start: now - 10 * 60_000, stop: now + 20 * 60_000 },
    { title: `${name} sen`, start: now + 20 * 60_000, stop: now + 50 * 60_000 },
  ]])),
  fetchedAt: now, sources: ['http://x/epg'],
}

afterEach(() => { cleanup() })
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', NAMES.slice(0, 12).map((name) => channelKey({ name, url: `http://x/${name}` })))
  seedLiveTvIndex({ cache })
  setTvSettings({ hubLayout: 'experience' })
})

const press = (key: string) => act(() => { fireEvent.keyDown(document.activeElement ?? document.body, { key }) })

describe('Upplevelse: korten ritas inte om vid en fokusflytt', () => {
  it('▸ i en rad bygger bara om ett fåtal kort, inte alla', async () => {
    const props = { pageId: 'live-tv-browse', params: {}, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
    const out = render(<LiveTvTvShell {...props} />)
    // Värden ritar om hela pluginträdet vid varje fokusbyte (uppmätt på Mi Box S: 8 commits per tryck);
    // modellen blir då ett nytt objekt. Samma sak här: skalet ritas om efter varje tryck.
    const hostRerender = () => act(() => { out.rerender(<LiveTvTvShell {...props} />) })
    await flushLiveTvIndex()
    act(() => { document.querySelector<HTMLElement>('[data-init]')!.focus() })
    press('ArrowDown'); press('ArrowDown')
    press('ArrowRight')
    await act(async () => { await new Promise((r) => setTimeout(r, 400)) })
    const total = document.querySelectorAll('[data-xp^="r"]').length
    expect(total).toBeGreaterThan(30)
    built.n = 0
    press('ArrowRight'); hostRerender()
    press('ArrowDown'); hostRerender()
    await act(async () => { await new Promise((r) => setTimeout(r, 400)) })
    // Två flyttar: kortet fokus lämnar, kortet det landar på och de som byter synlighet/uppslag.
    expect(built.n).toBeLessThan(total / 2)
  })
})
