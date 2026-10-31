import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { GUIDE_MODE_KEY } from './tv-settings-store'
import type { EpgCacheEntry } from '../epg/types'

/**
 * Prestanda (Mi Box S 2026-10-31): en fokusflytt i guiden ritade om ALLA
 * rader (80 rader, 238 block) — ~2 s huvudtråd per pil-tryck. Raderna är nu
 * memoiserade: bara raden fokus lämnar och raden den landar på ritas om.
 * Mäts på två sätt: kanalcellens logotyp (en per rad) och antalet
 * programceller (`station` med `data-v2f: inset`) som byggs under flytten.
 */
const renders = vi.hoisted(() => [] as string[])
const cells = vi.hoisted(() => ({ n: 0 }))
vi.mock('./v2-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./v2-ui')>()
  return { ...actual, LogoPlate: (props: { channel: { name: string } }) => { renders.push(props.channel.name); return <span data-testid="logo-stub" /> } }
})
vi.mock('./tv-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./tv-ui')>()
  return { ...actual, station: (...args: Parameters<typeof actual.station>) => { if (args[2]?.['data-v2f'] === 'inset') cells.n++; return actual.station(...args) } }
})
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => <div data-testid="player" /> }))
import { LiveTvTvShell } from './tv-shell'

const at = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime() }
const NOW = at(14, 45)
const NAMES = Array.from({ length: 30 }, (_, i) => `K${i}`)
const list: LiveTvList = {
  id: 'l1', name: 'Xtream', channels: NAMES.map((name) => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: `${name}.tv` })),
  createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
const cache: EpgCacheEntry = {
  index: Object.fromEntries(NAMES.map((name) => [`${name}.tv`, [
    { title: `${name} nu`, start: at(14, 30), stop: at(15, 30) },
    { title: `${name} sen`, start: at(15, 30), stop: at(16, 30) },
    { title: `${name} senare`, start: at(16, 30), stop: at(17, 30) },
  ]])),
  fetchedAt: NOW, sources: ['http://x/epg'],
}

afterEach(() => { cleanup(); vi.useRealTimers() })
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache })
})

const mount = async (mode: 'now' | 'tl' | 'list') => {
  writePluginJson(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, mode)
  const props = { pageId: 'live-tv-browse', params: { view: 'guide' }, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
  render(<LiveTvTvShell {...props} />)
  await flushLiveTvIndex()
  await flushLiveTvIndex()
}

/**
 * Kanalcellernas logotyper som ritades om när fokus gick från rad `from` till
 * rad `to` (utom målradens egen, som heron också visar) och antalet
 * programceller som byggdes under flytten.
 */
async function rerenderedRows(rowTestId: string, cell: (row: HTMLElement) => HTMLElement, from: number, to: number): Promise<{ others: string[]; cells: number }> {
  const rows = () => screen.getAllByTestId(rowTestId)
  expect(rows().length).toBe(NAMES.length)
  await act(async () => { fireEvent.focus(cell(rows()[from])) })
  // Heron följer med fördröjning — låt den landa innan mätningen börjar.
  await act(async () => { await new Promise((r) => setTimeout(r, 400)) })
  renders.length = 0
  cells.n = 0
  await act(async () => { fireEvent.focus(cell(rows()[to])) })
  await act(async () => { await new Promise((r) => setTimeout(r, 400)) })
  return { others: [...new Set(renders)].filter((name) => name !== NAMES[to]), cells: cells.n }
}

const rowOf = (name: string) => NAMES.indexOf(name)

describe('guidens rader ritas inte om vid en fokusflytt', () => {
  it('Tablå: bara raden fokus lämnar och raden det landar på', async () => {
    await mount('tl')
    const { others, cells: built } = await rerenderedRows('tl-row', (row) => row.querySelector<HTMLElement>('[data-tl-block]')!, 2, 3)
    expect(others.map(rowOf)).toEqual(others.length ? [2] : [])
    // Två rader × högst tre block i fönstret (+ kategoriposterna). Förut: alla 30 raders block, flera gånger.
    expect(built).toBeLessThan(NAMES.length)
  })

  it('Nu/Sen: bara raden fokus lämnar och raden det landar på', async () => {
    await mount('now')
    const { others, cells: built } = await rerenderedRows('nowsen-row', (row) => row.querySelector<HTMLElement>('[data-testid=nowsen-now]')!, 2, 3)
    expect(others.map(rowOf)).toEqual(others.length ? [2] : [])
    expect(built).toBeLessThan(NAMES.length)
  })

  it('Kanallista: bara raden fokus lämnar och raden det landar på', async () => {
    await mount('list')
    const { others, cells: built } = await rerenderedRows('list-row', (row) => row.querySelector<HTMLElement>('[data-testid=list-now]')!, 2, 3)
    expect(others.map(rowOf)).toEqual(others.length ? [2] : [])
    expect(built).toBeLessThan(NAMES.length)
  })
})
