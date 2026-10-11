import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { __resetForTests, __setLangForTests, writePluginJson } from '@/lib/plugin-sdk'
import { HOUR, MIN, fxMatch } from '../__sport-fixture'
import { __resetSportDayCache, localDayKey } from '../sport-epg'
import { __resetRouterForTests } from '../router'
import { currentResults } from '../results-controller'
import { SPORT_FOLLOWS_KEY, setSportSettings, type SportFollow } from '../sport-store'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { LiveTvPlugin } from '../../index'
import { __resetSportRowsForTests } from './rows-feed'
import { fxFixture, stubHost } from './__rows-fixture'
import { SportHomeRow } from './sport-home-row'

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const liveHockey = fxMatch({ id: 'liveHockey', kind: 'hockey', league: 'SHL', leagueKey: 'shl', home: 'Frölunda', away: 'Luleå', start: now - 10 * MIN, stop: now + 2 * HOUR })
const aik: SportFollow = { sport: 'football', kind: 'team', key: 'gais', name: 'GAIS' }

beforeEach(() => {
  __resetForTests()
  __resetSportDayCache()
  __resetRouterForTests()
  __resetSportRowsForTests()
})
afterEach(() => {
  cleanup()
  __resetSportRowsForTests()
})

describe('registreringen', () => {
  it('sex rader och sex källor i radväljaren, ingen visas av sig själv; val på allt utom Mina lag', () => {
    const rows: Array<Record<string, unknown>> = []
    const sources: Array<Record<string, unknown> & { option?: { choices: () => Array<{ value: string }> } }> = []
    LiveTvPlugin.register({
      registerBootstrap: () => {},
      registerSettingsSection: () => {},
      registerHomeOverride: () => {},
      registerBrowsePage: () => {},
      registerHomeRow: (row: Record<string, unknown>) => { rows.push(row) },
      registerHomeSource: (source: Record<string, unknown>) => { sources.push(source as never) },
    } as never)
    expect(sources.map((s) => s.id)).toEqual(['sport-live-now', 'sport-my-teams', 'sport-tonight', 'sport-zap', 'sport-league', 'sport-results'])
    expect(rows.every((r) => r.showOnHome === false)).toBe(true)
    expect(sources.map((s) => s.rowId)).toEqual(rows.map((r) => r.id))
    expect(sources[0]!.label).toEqual({ en: 'Sport: Live now', sv: 'Sport: Live nu' })
    expect(sources[5]!.label).toEqual({ en: 'Sport: Results for my teams', sv: 'Sport: Resultat för mina lag' })
    expect(sources.filter((s) => s.option).map((s) => s.id)).toEqual(['sport-live-now', 'sport-tonight', 'sport-zap', 'sport-league', 'sport-results'])
    expect(sources[0]!.option!.choices().map((c) => c.value)).toEqual(['', 'football', 'hockey', 'basketball', 'handball', 'motorsport', 'tennis'])
    expect(sources[5]!.option!.choices().map((c) => c.value)).toEqual(['', 'hide'])
  })
  it('Liga-valet: följda ligor först', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [{ sport: 'hockey', kind: 'league', key: 'shl', name: 'SHL' }])
    stubHost({})
    const sources: Array<{ id: string; option?: { choices: () => Array<{ value: string }> } }> = []
    LiveTvPlugin.register({
      registerBootstrap: () => {}, registerSettingsSection: () => {}, registerHomeOverride: () => {}, registerBrowsePage: () => {},
      registerHomeRow: () => {}, registerHomeSource: (s: never) => { sources.push(s) },
    } as never)
    expect(sources.find((s) => s.id === 'sport-league')!.option!.choices().map((c) => c.value)).toEqual(['', 'shl'])
  })
})

describe('raden', () => {
  it('Live nu: kort med LIVE, lagen och kanalen; TV-stationer i en data-row; klick öppnar Sport och spelar', async () => {
    stubHost({ [today]: [live] })
    const onNavigate = vi.fn()
    render(<SportHomeRow kind="live-now" onNavigate={onNavigate} />)
    const card = await screen.findByRole('button', { name: /GAIS - Sirius/ })
    expect(screen.getByRole('heading', { name: 'Live now' })).toBeInTheDocument()
    expect(within(card).getByTestId('sport-row-live')).toHaveTextContent('LIVE')
    expect(within(card).getByTestId('sport-row-channel')).toHaveTextContent('TV4 Fotboll FHD SE')
    expect(card).toHaveAttribute('data-f')
    expect(card.className).toContain('focus-card-ring')
    expect(card.closest('[data-row]')).not.toBeNull()
    fireEvent.click(card)
    expect(onNavigate).toHaveBeenCalledWith({
      pageId: 'live-tv-sport',
      params: { view: 'sport', autoplay: '1', url: 'http://x/TV4 Fotboll FHD SE', name: 'TV4 Fotboll FHD SE', logo: '', group: 'Sport', tvgId: '' },
    })
  })

  it('svenska rubriker', async () => {
    __setLangForTests('sv')
    stubHost({ [today]: [live] })
    render(<SportHomeRow kind="zap" onNavigate={() => {}} />)
    expect(await screen.findByRole('heading', { name: 'Zappa live' })).toBeInTheDocument()
  })

  it('radens val: en sport', async () => {
    stubHost({ [today]: [live, liveHockey] })
    render(<SportHomeRow kind="live-now" onNavigate={() => {}} option="hockey" />)
    await screen.findByRole('button', { name: /Frölunda/ })
    expect(screen.queryByRole('button', { name: /GAIS/ })).toBeNull()
    expect(screen.getByText('Ice hockey')).toBeInTheDocument()
  })

  it('utan data ritas ingenting', async () => {
    const calls = stubHost({})
    const { container } = render(<SportHomeRow kind="live-now" onNavigate={() => {}} />)
    await waitFor(() => expect(calls.day.length).toBeGreaterThan(0))
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    expect(container).toBeEmptyDOMElement()
  })

  it('Liga: ligans namn som rubrik', async () => {
    stubHost({ [today]: [live, liveHockey] })
    render(<SportHomeRow kind="league" onNavigate={() => {}} option="shl" />)
    expect(await screen.findByRole('heading', { name: 'SHL' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('Resultat syns bara med nyckel', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [aik])
    stubHost({ [today]: [live] })
    const { container } = render(<SportHomeRow kind="results" onNavigate={() => {}} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    expect(container).toBeEmptyDOMElement()
  })

  it('Resultat för mina lag: ställningen från källan, och "dölj ställning" döljer den', async () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [aik])
    setSportSettings({ keys: { 'api-sports': { key: 'k12345', plan: 'Free' } } })
    const done = fxMatch({ id: 'done', home: 'GAIS', away: 'Sirius', start: now - 4 * HOUR, stop: now - 2 * HOUR })
    const calls = stubHost({ [today]: [done] }, { 'fx:api-sports:9': { matchId: 'done', swapped: false } })
    const view = render(<SportHomeRow kind="results" onNavigate={() => {}} />)
    await waitFor(() => expect(calls.day.length).toBeGreaterThan(0))
    act(() => { currentResults()!.applyFixtures('football', today, [fxFixture({ id: '9', kickoff: done.start, status: 'finished', statusShort: 'FT', minute: 90 })], 'day', Date.now()) })
    const card = await screen.findByRole('button', { name: /GAIS - Sirius/ })
    expect(within(card).getAllByTestId('sport-row-score').map((n) => n.textContent)).toEqual(['2', '1'])
    view.rerender(<SportHomeRow kind="results" onNavigate={() => {}} option="hide" />)
    expect(within(screen.getByRole('button', { name: /GAIS - Sirius/ })).queryByTestId('sport-row-score')).toBeNull()
    expect(new Set(calls.fetchModes)).toEqual(new Set(['cache-only']))
  })

  it('Zappa live: samma ordning vid omritning', async () => {
    const many = Array.from({ length: 8 }, (_, i) => fxMatch({ id: `z${i}`, home: `Lag${i}`, away: `Mot${i}`, start: now - 10 * MIN, stop: now + HOUR }))
    stubHost({ [today]: many })
    const view = render(<SportHomeRow kind="zap" onNavigate={() => {}} />)
    await screen.findAllByRole('button')
    const order = () => screen.getAllByRole('button').map((b) => b.getAttribute('data-match-id'))
    const first = order()
    view.rerender(<SportHomeRow kind="zap" onNavigate={() => {}} count={20} />)
    expect(order()).toEqual(first)
  })
})
