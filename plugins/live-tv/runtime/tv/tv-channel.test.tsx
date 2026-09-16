import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { flushLiveTvIndex, seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, type LiveTvList } from '../live-tv-data'
import type { EpgCacheEntry } from '../epg/types'
import { dp } from './tv-ui'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string; url: string } }) => <div data-testid="player">{channel.name}|{channel.url}</div> }))
import { getReminders } from '../reminders'
import { LiveTvTvShell } from './tv-shell'

/**
 * Klockan låst till mitt på dagen INNAN `now` läses av (toppnivå, inte
 * `beforeAll`: `const now` nedan körs vid modulinläsning): fixturens
 * `now ± 5h` (Morning…Football) välte annars kalenderdygnet vid midnatt
 * beroende på när testkörningen råkade starta — `dayStart`/`dayStart +
 * DAY_MS` (`channel-detail.ts`) tappade rader som i verkligheten hörde till
 * "Idag" (befintlig, förut oupptäckt flaggning, oberoende av Task 8:s
 * ändringar). `toFake: ['Date']` rör inte `setTimeout`/`Promise`.
 */
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date(2026, 8, 16, 12, 0, 0))
afterAll(() => {
  vi.useRealTimers()
})

const now = Date.now()
const H = 3_600_000
const channel = { name: 'ESPN', logo: null, group: 'Sport', url: 'http://x/espn', tvgId: 'espn.tv', archive: { days: 3, streamId: 7, base: 'http://panel', username: 'u', password: 'p' } }
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [channel], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
const cache: EpgCacheEntry = { index: { 'espn.tv': [
  { title: 'Morning', start: now - 5 * H, stop: now - 4 * H, description: 'Old' },
  { title: 'GameDay', start: now - H, stop: now + H, description: 'Live now' },
  { title: 'Football', start: now + H, stop: now + 2 * H },
] }, fetchedAt: now, sources: [] }

afterEach(cleanup)
beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [])
  seedLiveTvIndex({ cache: cache })
})

const params = { view: 'channel', url: channel.url, name: channel.name, logo: '', group: channel.group, tvgId: channel.tvgId }
/** Tablån kommer från appen: modellen och vyn får landa innan något läses av. */
const mount = async (extra: Record<string, string> = {}) => {
  const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={{ ...params, ...extra }} onNavigate={() => {}} onOpenDetails={() => {}} />)
  await flushLiveTvIndex()
  return rendered
}

describe('TvChannel', () => {
  it('pågående program är förvalt och primärknappen är Titta nu', async () => {
    await mount()
    expect(document.querySelector('[data-init]')).toHaveTextContent('GameDay')
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Watch now')
    expect(screen.getByTestId('detail')).toHaveTextContent('Live now')
  })
  it('fokus på passerat program ger Spela repris som spelar timeshift-URL', async () => {
    await mount()
    fireEvent.focus(screen.getByText('Morning').closest('[data-f]')!)
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Play replay')
    fireEvent.click(screen.getByTestId('primary-action'))
    expect(await screen.findByTestId('player')).toHaveTextContent('/timeshift/')
  })
  it('fokus på framtida program ger Påminn mig som togglar påminnelse', async () => {
    await mount()
    fireEvent.focus(screen.getByText('Football').closest('[data-f]')!)
    fireEvent.click(screen.getByTestId('primary-action'))
    expect(getReminders(now)).toHaveLength(1)
    expect(screen.getByTestId('primary-action')).toHaveTextContent('Remove reminder')
  })
  it('programme-param förväljer raden', async () => {
    await mount({ programme: String(now + H) })
    expect(document.querySelector('[data-init]')).toHaveTextContent('Football')
  })
  it('oupplösbar kanal ger en fokuserbar station som går tillbaka', () => {
    // Utan `url` finns ingen kanal att visa. Den gamla grenen ritade bara en
    // textrad: noll stationer, alltså ingen `data-init` — värdens fokusmotor
    // hade ingen startpunkt och fjärrkontrollen låste sig på en tom skärm.
    const onNavigate = vi.fn()
    render(<LiveTvTvShell pageId="live-tv-browse" params={{ view: 'channel' }} onNavigate={onNavigate} onOpenDetails={() => {}} />)
    const station = screen.getByTestId('channel-unresolved')
    expect(station).toHaveAttribute('data-init')
    expect(station).toHaveTextContent('No programme information')
    fireEvent.click(station)
    expect(onNavigate).toHaveBeenCalledWith({ pageId: 'live-tv-browse', params: { view: 'guide' } })
  })
  it('dagväljaren har fem dagar och Idag är vald', async () => {
    await mount()
    expect(screen.getAllByTestId('day-btn')).toHaveLength(5)
    expect(screen.getByTestId('day-btn-0')).toHaveTextContent(/Today|Idag|\w{3}/)
  })
})

/**
 * Ersätter fixrunda 2:s (M-P4, FYND 1) porträttblock: telefonen fick sedan
 * en egen gren (Task 8, `mobile/channel-phone.tsx`) i stället för att
 * skrivbordets tre kolumner staplades om med `phone ? … : …`. Det gamla
 * blocket testade just den stapelomställningen, som inte längre finns —
 * `TvChannel` routar telefonen till `TvChannelPhone` innan skrivbordets
 * kolumner ens byggs, se `channel-phone.test.tsx` för telefongrenens tester.
 */
describe('TvChannel routar telefon till TvChannelPhone (fas 3, Task 8)', () => {
  // En telefon är aldrig en TV: skalet gatar `phone` med `!isTv` (fas 3 ger
  // vyerna `phone` som prop därifrån i stället för en egen mätning), så
  // telefonblocket kör utanför TV-läget som filens beforeEach annars slår på.
  beforeEach(() => __setTvModeForTests(false))
  let box: HTMLElement | null = null
  afterEach(() => { box?.remove(); box = null })

  const mountWith = async (phone: boolean) => {
    box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    if (phone) {
      box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
      box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
    }
    document.body.appendChild(box)
    const rendered = render(<LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
    await flushLiveTvIndex()
    return rendered
  }

  it('på telefon ritas telefongrenen (channel-phone), inte skrivbordets tre kolumner', async () => {
    await mountWith(true)
    expect(screen.getByTestId('channel-phone')).toBeInTheDocument()
    expect(screen.queryByTestId('channel-view-root')).toBeNull()
  })

  it('skrivbord/TV behåller tre fasta kolumner (150/560 dp) och radlayout, oförändrat', async () => {
    await mountWith(false)
    const root = screen.getByTestId('channel-view-root')
    const dayPicker = screen.getByTestId('day-picker')
    const detail = screen.getByTestId('detail')
    expect(root.style.flexDirection).not.toBe('column')
    expect(dayPicker.style.width).toBe(`${dp(150)}px`)
    expect(dayPicker.style.flexShrink).toBe('0')
    expect(dayPicker.style.flexDirection).toBe('column')
    expect(detail.style.width).toBe(`${dp(560)}px`)
    expect(detail.style.flexShrink).toBe('0')
  })
})
