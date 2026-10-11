import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { PlayerGoalOverlay } from './player-goal-overlay'
import { emitGoals, type GoalEvent } from '../goal-events'
import { setSportSettings } from '../sport-store'
import { fxMatch, fxSource } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'

const src = (key: string) => fxSource(key, { channelKey: key })
const mk = (id: string, fixtureId: string, channel: string, home = 'Malmo FF'): SportMatch => fxMatch({
  id, league: 'A', leagueKey: 'a', home, away: 'AIK', homeKey: home.toLowerCase(), awayKey: 'aik',
  status: 'live', minute: 67, score: { home: 3, away: 1 }, sources: [src(channel)], coverage: 'full',
  fixture: { provider: 'api-sports', id: fixtureId },
})
const goal = (fixtureId: string): GoalEvent => ({ fixtureId, provider: 'api-sports', sport: 'football', side: 'home', score: { home: 3, away: 1 }, scorer: 'S. Larsson', minute: 67, at: 0, home: 'Malmo FF', away: 'AIK' })

const h = vi.hoisted(() => ({ controller: null as unknown }))
vi.mock('../results-controller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../results-controller')>()),
  useResultsController: () => h.controller,
}))

beforeEach(() => {
  vi.useFakeTimers()
  __resetPluginStorageForTests()
  __setLangForTests('sv')
  const merged = [mk('m1', '1', 'cmore1'), mk('m2', '2', 'tv4', 'Hammarby')]
  h.controller = { merged: () => merged, onMerged: () => () => {}, subscribe: () => () => {} }
})
afterEach(() => { cleanup(); vi.useRealTimers(); __setLangForTests('en'); h.controller = null })

describe('PlayerGoalOverlay', () => {
  it('mål i matchen på kanalen: Mål med ställning och målskytt, borta efter 6 s', () => {
    render(<PlayerGoalOverlay channelKey="cmore1" onJump={vi.fn()} />)
    act(() => emitGoals([goal('1')]))
    expect(screen.getByText('Mål')).toBeTruthy()
    expect(screen.getByText('Malmo FF 3–1 AIK')).toBeTruthy()
    expect(screen.getByText("S. Larsson 67'")).toBeTruthy()
    expect(screen.queryByText('Titta')).toBeNull()
    act(() => { vi.advanceTimersByTime(6_001) })
    expect(screen.queryByText('Mål')).toBeNull()
  })
  it('följd match på annan kanal: Titta byter kanal', () => {
    setSportSettings({ goalAlerts: true, goalAlertMatches: { m2: Date.now() + 3_600_000 } })
    const onJump = vi.fn()
    render(<PlayerGoalOverlay channelKey="cmore1" onJump={onJump} />)
    act(() => emitGoals([goal('2')]))
    fireEvent.click(screen.getByText('Titta'))
    expect(onJump).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://x/tv4' }))
  })
  it('ej följd match på annan kanal: ingenting', () => {
    render(<PlayerGoalOverlay channelKey="cmore1" onJump={vi.fn()} />)
    act(() => emitGoals([goal('2')]))
    expect(screen.queryByText('Mål')).toBeNull()
  })
})
