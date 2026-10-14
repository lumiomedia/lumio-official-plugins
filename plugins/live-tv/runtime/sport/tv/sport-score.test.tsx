import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { __resetPluginStorageForTests, __setLangForTests } from '@/lib/plugin-sdk'
import { MatchScore, ResultOnlyTag, heroStatusLine, matchStatusLabel, scoreText, useGoalBlink } from './sport-score'
import { Crest } from './sport-parts'
import { searchProviderTeams } from '../follow-search'
import { crestForFollow } from '../score-model'
import { setSportSettings } from '../sport-store'
import { __resetRouterForTests as __resetBudgetForTests } from '../router'
import { tvText } from '../../tv/tv-strings'
import { emitGoals } from '../goal-events'
import { fxMatch } from '../__sport-fixture'
import type { SportMatch } from '../sport-model'
import { __resetSpoilerForTests, noteReplays } from '../couch/spoiler'

const tt = (k: Parameters<typeof tvText>[1], v?: Record<string, string | number>) => tvText('sv', k, v)
const m = (over: Partial<SportMatch> = {}): SportMatch => fxMatch({
  id: 'm1', home: 'Malmo FF', away: 'AIK', homeKey: 'malmo', awayKey: 'aik', homeCrest: 'https://m/375.png', awayCrest: null,
  status: 'live', minute: 31, score: { home: 2, away: 1 }, coverage: 'full', fixture: { provider: 'api-sports', id: '1180001' }, ...over,
})

beforeEach(() => { __setLangForTests('sv'); __resetPluginStorageForTests(); __resetBudgetForTests() })
afterEach(() => { cleanup(); __setLangForTests('en') })

describe('ställning och status', () => {
  it('täckt sport: "2–1" och minut', () => {
    render(<MatchScore match={m()} />)
    expect(screen.getByTestId('match-score').textContent).toBe('2–1')
    expect(scoreText(m())).toBe('2–1')
    expect(matchStatusLabel(m(), tt)).toBe("31'")
    expect(heroStatusLine(m(), tt)).toBe("31' · pågår")
  })
  it('tennis (bara EPG): inget ställningsfält, ingen status från källan, även om data råkar finnas', () => {
    const t = m({ kind: 'tennis', coverage: 'epg' })
    const { container } = render(<MatchScore match={t} />)
    expect(container.innerHTML).toBe('')
    expect(scoreText(t)).toBeNull()
    expect(matchStatusLabel(t, tt)).toBeNull()
  })
  it('inte startad: ingen ställning; avslutad: SLUT; paus: Paus; uppskjuten: Uppskjuten', () => {
    const { container } = render(<MatchScore match={m({ status: 'upcoming', score: undefined })} />)
    expect(container.innerHTML).toBe('')
    expect(matchStatusLabel(m({ status: 'finished' }), tt)).toBe('SLUT')
    expect(matchStatusLabel(m({ phase: 'ht' }), tt)).toBe('Paus')
    expect(matchStatusLabel(m({ status: 'upcoming', phase: 'postponed', score: undefined }), tt)).toBe('Uppskjuten')
  })
  it('EPG-match utan fixtur: fas 1:s egen status gäller (null)', () => {
    expect(matchStatusLabel(m({ fixture: undefined, score: undefined }), tt)).toBeNull()
  })
})

describe('märken', () => {
  it('märket går genom appens bildcache; utan märke fas 1:s initialer', () => {
    const { container } = render(<><Crest name="Malmo FF" colorKey="malmo" src="https://m/375.png" size={40} /><Crest name="AIK" colorKey="aik" size={40} /></>)
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/api/m3u-logo?src=' + encodeURIComponent('https://m/375.png'))
    expect(screen.getByText('AIK')).toBeTruthy()
  })
  it('följt lag får märket ur en match som bär det', () => {
    expect(crestForFollow({ key: 'malmo' }, [m()])).toBe('https://m/375.png')
    expect(crestForFollow({ key: 'aik' }, [m()])).toBeNull()
  })
  it('saknas märke i matcherna gäller det lagrade; matchens märke går först', () => {
    expect(crestForFollow({ key: 'aik', crest: 'https://s/aik.png' }, [m()])).toBe('https://s/aik.png')
    expect(crestForFollow({ key: 'malmo', crest: 'https://s/old.png' }, [m()])).toBe('https://m/375.png')
    expect(crestForFollow({ key: 'aik', crest: null }, [])).toBeNull()
  })
  it('"Ingen kanal"', () => {
    render(<ResultOnlyTag />)
    expect(screen.getByText('Ingen kanal')).toBeTruthy()
  })
})

describe('Följer: sök i källan', () => {
  it('utan nyckel, kort fråga eller tennis: inget anrop', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchProviderTeams('football', 'malmo')).toEqual([])
    setSportSettings({ apiKey: 'k123' })
    expect(await searchProviderTeams('football', 'ma')).toEqual([])
    expect(await searchProviderTeams('tennis', 'federer')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('målblink', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })
  it('blinkar 10 s efter ett mål i matchen', () => {
    const { result } = renderHook(() => useGoalBlink(m()))
    expect(result.current).toBe(false)
    act(() => { emitGoals([{ fixtureId: '1180001', provider: 'api-sports', sport: 'football', side: 'home', score: { home: 3, away: 1 }, scorer: null, minute: 70, at: 0, home: 'Malmo FF', away: 'AIK' }]) })
    expect(result.current).toBe(true)
    act(() => { vi.advanceTimersByTime(10_001) })
    expect(result.current).toBe(false)
  })
})

describe('spoilerskydd', () => {
  beforeEach(() => { __resetSpoilerForTests() })
  it('en dold avslutad match: lås och "–", ingen siffra i DOM:en', () => {
    const T = Date.now()
    const done = m({ status: 'finished', minute: null, score: { home: 3, away: 0 }, fixture: { provider: 'api-sports', id: '77' }, start: T - 3_600_000, stop: T })
    noteReplays([m({ id: 'r', rerun: true, fixture: undefined, start: T, stop: T + 3_600_000, replayOf: { kickoff: T - 3_600_000, score: { home: 3, away: 0 }, fixture: { provider: 'api-sports', id: '77' } } })], T)
    render(<MatchScore match={done} />)
    expect(screen.getByTestId('match-score-hidden')).toHaveTextContent('–')
    expect(screen.queryByTestId('match-score')).toBeNull()
    expect(document.body).not.toHaveTextContent('3–0')
    expect(document.body.textContent).not.toMatch(/[0-9]/)
  })
})
