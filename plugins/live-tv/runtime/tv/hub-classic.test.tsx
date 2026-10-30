import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))
import { LiveTvTvShell } from './tv-shell'

/**
 * Kanaler, layout Klassisk (handoff "Screen 1b"): topprad, spotlight i tre
 * kolumner, Favoriter, Fortsätt titta och Alla kanaler i sex kolumner.
 */
const now = Date.now()
const ch = (name: string, group: string, tvgId: string | null = null) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId })
const list: LiveTvList = {
  id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport', 'a.tv'), ch('B', 'Sport', 'b.tv'), ch('C', 'News')],
  createdAt: '', urlTvg: 'http://x/epg', epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
}
const cache: EpgCacheEntry = {
  index: {
    'a.tv': [{ title: 'Now A', start: now - 10 * 60_000, stop: now + 20 * 60_000 }],
    'b.tv': [{ title: 'Now B', start: now - 5 * 60_000, stop: now + 40 * 60_000 }],
  },
  fetchedAt: now, sources: ['http://x/epg'],
}
const keyOf = (name: string) => channelKey({ name, url: `http://x/${name}` })

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [keyOf('A'), keyOf('B')])
  seedLiveTvIndex({ cache })
})

/** Monterar skalet som värden gör: `onNavigate` ritar om med de nya params. */
const mount = async () => {
  const navigations: Record<string, string>[] = []
  const propsFor = (params: Record<string, string>) => ({ pageId: 'live-tv-browse', params, onNavigate, onOpenDetails: () => {} }) as unknown as ComponentProps<typeof LiveTvTvShell>
  function onNavigate(to: { params: Record<string, string> }) {
    navigations.push(to.params)
    out.rerender(<LiveTvTvShell {...propsFor(to.params)} />)
  }
  const out = render(<LiveTvTvShell {...propsFor({})} />)
  await flushLiveTvIndex()
  return { ...out, navigations }
}

describe('HubClassic', () => {
  it('ritar sektionerna i ordning med exakt en [data-init] på första spotlightkortet', async () => {
    await mount()
    expect(screen.getByTestId('hub-classic')).toBeInTheDocument()
    expect(screen.getByTestId('hub-spotlight')).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' })
    expect(screen.getByTestId('hub-favourites')).toBeInTheDocument()
    expect(screen.getByTestId('all-channels')).toHaveStyle({ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' })
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
    expect(screen.getByTestId('hub-spotlight').querySelector('[data-f]')).toHaveAttribute('data-init')
  })

  it('topraden har sök, spellista, kanalguide och värdens klocka — ingen egen hälsning (värdens klocka hälsar redan)', async () => {
    await mount()
    const top = screen.getByTestId('hub-topbar')
    expect(within(top).getByText('Search channels and programmes')).toBeInTheDocument()
    expect(within(top).getByTestId('playlist-pill')).toBeInTheDocument()
    expect(within(top).getByText('Channel guide')).toBeInTheDocument()
    expect(within(top).getByTestId('hub-clock')).toBeInTheDocument()
    expect(within(top).queryByTestId('hub-greeting')).toBeNull()
  })

  it('OK på en favorit öppnar kanalguiden med fokus på den kanalen', async () => {
    const { navigations } = await mount()
    const cards = within(screen.getByTestId('hub-favourites')).getAllByTestId('hub-favourite')
    const b = cards.find((card) => card.textContent?.includes('Now B'))!
    fireEvent.click(b)
    await flushLiveTvIndex()
    expect(navigations.at(-1)).toEqual({ view: 'guide', channel: keyOf('B') })
    expect(screen.getByTestId('guide-shell')).toBeInTheDocument()
    const init = document.querySelector<HTMLElement>('[data-init]')
    expect(init?.closest('[data-testid="guide-content"]')).not.toBeNull()
    expect(init?.closest('[data-guide-v2-row]')?.getAttribute('data-key')).toBe(keyOf('B'))
  })

  it('kort utan programbild ritar logoplattan, favoritkortet har numret på plattan', async () => {
    await mount()
    const spot = screen.getByTestId('hub-spotlight').querySelector('[data-f]') as HTMLElement
    expect(within(spot).getByTestId('logo-plate')).toBeInTheDocument()
    expect(within(spot).queryByTestId('programme-art-img')).not.toBeInTheDocument()
    const fav = within(screen.getByTestId('hub-favourites')).getAllByTestId('hub-favourite')[0]!
    expect(within(fav).getByTestId('logo-plate-number')).toBeInTheDocument()
    for (const card of screen.getByTestId('all-channels').querySelectorAll('[data-f]')) expect(within(card as HTMLElement).getByTestId('logo-plate')).toBeInTheDocument()
  })

  it('favoritraden visar fjärrhjälpen bara i TV-läge', async () => {
    await mount()
    expect(within(screen.getByTestId('hub-favourites')).getByText('2 channels · OK = guide · hold OK = menu')).toBeInTheDocument()
    cleanup()
    __setTvModeForTests(false)
    await mount()
    expect(within(screen.getByTestId('hub-favourites')).queryByText(/OK =/)).not.toBeInTheDocument()
    expect(within(screen.getByTestId('hub-favourites')).getByText('2 channels')).toBeInTheDocument()
  })

  it('Visa fler syns när kanalerna är fler än ett steg', async () => {
    const big: LiveTvList = { ...list, channels: Array.from({ length: 40 }, (_, i) => ch(`K${i}`, 'Grp')) }
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [big])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
    seedLiveTvIndex()
    await mount()
    expect(screen.getByTestId('all-channels').querySelectorAll('[data-f]').length).toBe(36)
    fireEvent.click(screen.getByText('Show more'))
    expect(screen.getByTestId('all-channels').querySelectorAll('[data-f]').length).toBe(40)
  })

  it('telefonen behåller sin egen hubb', async () => {
    __setTvModeForTests(false)
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
    document.body.appendChild(box)
    const props = { pageId: 'live-tv-browse', params: {}, onNavigate: () => {}, onOpenDetails: () => {} } as unknown as ComponentProps<typeof LiveTvTvShell>
    render(<LiveTvTvShell {...props} />, { container: box })
    expect(screen.queryByTestId('hub-classic')).not.toBeInTheDocument()
    expect(screen.getByTestId('hub-spotlight')).toHaveAttribute('data-f')
    box.remove()
  })
})
