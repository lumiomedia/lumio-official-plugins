import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import { getGuideMode } from './tv-settings-store'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = {
  index: { 'a.tv': [
    { title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 },
    { title: 'Next A', start: now + 20 * 60_000, stop: now + 50 * 60_000 },
    { title: 'Later A', start: now + 50 * 60_000, stop: now + 80 * 60_000 },
  ] },
  fetchedAt: now, sources: ['http://x/epg'],
}

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache: cache })
})

/** Tablån kommer från appen: modellen och vyn får landa innan något läses av. */
const mount = async (params: Record<string, string> = { view: 'guide' }) => {
  const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={() => {}} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return rendered
}

describe('TvGuide', () => {
  it('visar Nu/Sen/Senare för kanalen med tablå och tomtext för de utan', async () => {
    await mount()
    // "Nu" står både på raden och i toppbandet för den valda kanalen.
    expect(screen.getAllByText('Now A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Next A').length).toBeGreaterThan(0)
    expect(screen.getByText('Later A')).toBeInTheDocument()
    expect(screen.getAllByText('No programme information').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('tomlägets nod ligger kvar när raderna kommit — bara stationen flyttar', async () => {
    // Noden bar `data-init` under laddningen och AVMONTERADES när raderna kom:
    // fokusmotorn stod utan startstation i ögonblicket däremellan.
    await mount()
    const empty = screen.getByTestId('guide-empty')
    expect(empty).toBeInTheDocument()
    expect(empty).not.toHaveAttribute('data-f')
    expect(empty).not.toHaveAttribute('data-init')
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })

  it('fokus på en rad uppdaterar toppbandet', async () => {
    await mount()
    const rows = screen.getAllByTestId('guide-row')
    fireEvent.focus(rows[2])
    expect(screen.getByTestId('guide-headline')).toHaveTextContent('C')
  })
  it('tablåläget visar "Hämtar tablå…" tills fönstret landat, sedan raderna', async () => {
    // Tablån bor i appen sedan lagring v2: raden har ingen tablå att visa
    // förrän fönstret svarat, och "Ingen programinformation" dessförinnan
    // hade varit en lögn om data som är på väg.
    await mount()
    fireEvent.click(screen.getByText('Timeline'))
    expect(screen.getAllByText('Fetching guide…').length).toBeGreaterThan(0)
    await flushLiveTvIndex()
    expect(screen.queryByText('Fetching guide…')).not.toBeInTheDocument()
    expect(screen.getAllByText('Now A').length).toBeGreaterThan(0)
    // Kanalerna utan tablå får tomtexten — först NU, när svaret är läst.
    expect(screen.getAllByText('No programme information').length).toBeGreaterThan(0)
  })
  it('segmentväxeln byter till tablåläge med nu-linje', async () => {
    await mount()
    fireEvent.click(screen.getByText('Timeline'))
    await flushLiveTvIndex()
    expect(screen.getByTestId('now-line')).toBeInTheDocument()
    expect(screen.getAllByText('Now A').length).toBeGreaterThan(0)
  })
  it('OK på raden spelar kanalen', async () => {
    mount()
    fireEvent.click(screen.getAllByTestId('guide-row')[1])
    expect(await screen.findByTestId('player')).toHaveTextContent('B')
  })
  it('▸ på en rad byter kategori och tar med sig valet till nya första raden', async () => {
    await mount()
    const rows = screen.getAllByTestId('guide-row')
    fireEvent.focus(rows[2])
    expect(screen.getByTestId('guide-headline')).toHaveTextContent('C')
    // Alla → Sport. Toppbandet ska visa Sports första kanal direkt, utan att
    // användaren först måste pila upp/ner för att avfyra en ny onFocus.
    fireEvent.keyDown(rows[2], { key: 'ArrowRight' })
    expect(screen.getAllByTestId('guide-row')).toHaveLength(2)
    expect(screen.getByTestId('guide-headline')).toHaveTextContent('Now A')
  })
  it('vald rad utanför de synliga raderna ger ändå exakt en data-init', async () => {
    // 60 kanaler: listan visar 40 åt gången. Efter "Visa fler" + fokus på rad
    // 45 nollställer ett lägesbyte `visible` till 40 — den valda raden ritas
    // då inte längre, och `selected ? focused : index === 0` gav NOLL
    // data-init i hela vyn, alltså ingen startstation för fokusmotorn.
    const many = Array.from({ length: 60 }, (_, i) => ch(`K${i + 1}`, 'Sport'))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...list, channels: many }])
    seedLiveTvIndex({ cache })
    await mount()
    fireEvent.click(screen.getByText('Show more'))
    const rows = screen.getAllByTestId('guide-row')
    expect(rows.length).toBeGreaterThan(45)
    fireEvent.focus(rows[45])
    fireEvent.click(screen.getByText('Timeline'))
    const after = screen.getAllByTestId('guide-row')
    expect(after).toHaveLength(40)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(after[0]).toHaveAttribute('data-init')
  })
  it('okänd group-parameter faller tillbaka till Alla i stället för en tom vy', async () => {
    await mount({ view: 'guide', group: 'Nonexistent' })
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getAllByTestId('guide-row')).toHaveLength(3)
  })
})

/**
 * Lägesbytet i guiden (Nu/Sen · Tablå · Spellistor) är en navigering INNE i
 * vyn. Skalets Back kände bara till vyer: Back ur ett bytt läge lämnade hela
 * guiden, och eftersom läget sparas landade nästa besök i samma bytta läge —
 * spellistevyn hade dessutom ingen växel alls, så vägen tillbaka till den nya
 * guidevyn fanns helt enkelt inte (Jerry, riktig TV, plugin 0.5.0).
 */
describe('TvGuide: lägesbyte och Bakåt', () => {
  const mountWithNav = async (onNavigate: (arg: unknown) => void, params: Record<string, string> = { view: 'guide' }) => {
    const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={onNavigate} onOpenDetails={() => {}} />)
    await flushLiveTvIndex()
    return rendered
  }

  it('spellisteläget behåller lägesväxeln — vägen tillbaka till guiden finns kvar', async () => {
    await mount()
    fireEvent.click(screen.getByText('Playlists'))
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('pl-row').length).toBeGreaterThan(0)
    // Exakt en startstation även här.
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    // Och en station som tar användaren tillbaka.
    fireEvent.click(screen.getByText('Now / Next'))
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('guide-row').length).toBeGreaterThan(0)
    expect(getGuideMode()).toBe('now')
  })

  it('Bakåt efter ett lägesbyte går tillbaka till läget före — inte ut ur guiden', async () => {
    const onNavigate = vi.fn()
    await mountWithNav(onNavigate)
    fireEvent.click(screen.getByText('Playlists'))
    await flushLiveTvIndex()
    fireEvent.keyDown(window, { key: 'Backspace' })
    await flushLiveTvIndex()
    expect(screen.getAllByTestId('guide-row').length).toBeGreaterThan(0)
    expect(getGuideMode()).toBe('now')
    expect(onNavigate).not.toHaveBeenCalled()
    // Stacken är tom: nästa Bakåt lämnar guiden som förut.
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect((onNavigate.mock.calls[0][0] as { params: Record<string, string> }).params.view).toBe('hub')
  })

  it('två byten kräver två Bakåt — ett läge per tryck', async () => {
    await mount()
    fireEvent.click(screen.getByText('Timeline'))
    await flushLiveTvIndex()
    fireEvent.click(screen.getByText('Playlists'))
    await flushLiveTvIndex()
    fireEvent.keyDown(window, { key: 'Backspace' })
    await flushLiveTvIndex()
    expect(screen.getByTestId('now-line')).toBeInTheDocument()
    expect(getGuideMode()).toBe('tl')
    fireEvent.keyDown(window, { key: 'Backspace' })
    await flushLiveTvIndex()
    expect(screen.queryByTestId('now-line')).toBeNull()
    expect(getGuideMode()).toBe('now')
  })

  it('utan lägesbyte i sessionen lämnar Bakåt guiden precis som förut', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_guide_mode_v1', 'playlists')
    const onNavigate = vi.fn()
    await mountWithNav(onNavigate)
    expect(screen.getAllByTestId('pl-row').length).toBeGreaterThan(0)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect((onNavigate.mock.calls[0][0] as { params: Record<string, string> }).params.view).toBe('hub')
  })
})
