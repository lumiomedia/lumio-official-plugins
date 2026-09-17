import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { __resetForTests, __setDesktopTauriEnvForTests, __setTvModeForTests, BROWSE_BACK_EVENT, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'

// Fix round 1 (Task 16-review): spelaren äger Back helt medan den är öppen —
// skalet står numera tillbaka (se tv-shell.tsx: `if (active) return` i dess
// Back-lyssnare). Mocken måste därför själv stänga sig på Back, precis som
// den riktiga spelaren gör, annars bevisar "Back stänger spelaren"-testet
// nedan bara att ingenting händer.
vi.mock('../live-tv-player', () => ({
  LiveTvPlayer: ({ channel, onClose }: { channel: { name: string }; onClose: () => void }) => {
    useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Backspace' || event.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey, true)
      return () => window.removeEventListener('keydown', onKey, true)
    }, [onClose])
    return <div data-testid="player" data-panel-root="">{channel.name}<button type="button" onClick={onClose}>close</button></div>
  },
}))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [ch('A', 'Sport'), ch('B', 'Sport'), ch('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex()
})

function mount(params: Record<string, string> = {}) {
  const onNavigate = vi.fn()
  const view = render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={onNavigate} onOpenDetails={() => {}} />)
  return { onNavigate, view }
}

describe('LiveTvTvShell', () => {
  it('ritar ikonraden med sex stationer och exakt en data-init', () => {
    mount()
    expect(screen.getAllByTestId(/rail-/)).toHaveLength(6)
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
  it('Back på hubben lämnar Live TV', () => {
    mount()
    const fired = vi.fn()
    window.addEventListener(BROWSE_BACK_EVENT, fired)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(fired).toHaveBeenCalledTimes(1)
  })
  it('Back på guiden navigerar till hubben', () => {
    const { onNavigate } = mount({ view: 'guide' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'hub' } })
  })
  it('ikonradens Kanalguide navigerar', () => {
    const { onNavigate } = mount()
    fireEvent.click(screen.getByTestId('rail-guide'))
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide' } })
  })
  it('nummertangent zappar till listnummer och Back stänger spelaren', async () => {
    vi.useFakeTimers()
    mount()
    fireEvent.keyDown(window, { key: '2' })
    act(() => { vi.advanceTimersByTime(1500) })
    vi.useRealTimers()
    await waitFor(() => expect(screen.getByTestId('player')).toHaveTextContent('B'))
    fireEvent.keyDown(window, { key: 'Backspace' })
    await waitFor(() => expect(screen.queryByTestId('player')).toBeNull())
  })
})

/**
 * `data-live-tv-desktop` (spec "Beslut", TV-rester): den städade guidens
 * CSS-krok för tunn fokuskant i stället för TV:ns glöd (`TvFocusStyle`).
 * Bara skrivbordsappen (Tauri, ej TV, ej telefon) — se `guide-surface.ts`.
 */
describe('LiveTvTvShell: data-live-tv-desktop (skrivbordsappen, Task 0)', () => {
  it('sätts i skrivbordsappen (Tauri, ej TV, ej telefon)', () => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(true)
    mount()
    expect(document.querySelector('[data-live-tv-tv-root]')).toHaveAttribute('data-live-tv-desktop', '1')
  })
  it('saknas i TV-läge, även med Tauri-flaggan satt', () => {
    __setTvModeForTests(true)
    __setDesktopTauriEnvForTests(true)
    mount()
    expect(document.querySelector('[data-live-tv-tv-root]')).not.toHaveAttribute('data-live-tv-desktop')
  })
  it('saknas på LAN/fjärr (ingen Tauri-flagga)', () => {
    __setTvModeForTests(false)
    __setDesktopTauriEnvForTests(false)
    mount()
    expect(document.querySelector('[data-live-tv-tv-root]')).not.toHaveAttribute('data-live-tv-desktop')
  })
})
