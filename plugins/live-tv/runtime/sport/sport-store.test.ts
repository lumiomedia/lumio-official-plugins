import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import {
  SPORT_FOLLOWS_KEY, SPORT_SETTINGS_KEY, getFollows, getOverrides, getSportSettings, isFollowing, setOverride,
  setFollowAlert, setSportSettings, sportsCompatible, teamKeysMatch, toggleFollow, useFollows,
} from './sport-store'

beforeEach(() => __resetForTests())

describe('sportinställningar', () => {
  it('standard och sanering av skräp', () => {
    expect(getSportSettings()).toMatchObject({ view: 'matchday', alert: '15' })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { view: 'grid', alert: 5 })
    expect(getSportSettings()).toMatchObject({ view: 'matchday', alert: '15' })
    expect(setSportSettings({ view: 'feed' })).toMatchObject({ view: 'feed', alert: '15' })
    expect(setSportSettings({ alert: 'kickoff' })).toMatchObject({ view: 'feed', alert: 'kickoff' })
  })
})

describe('följda lag och turneringar', () => {
  const gais = { sport: 'football' as const, kind: 'team' as const, key: 'gais', name: 'GAIS' }
  it('växlar och lagrar på normaliserad nyckel', () => {
    expect(toggleFollow(gais)).toEqual([gais])
    expect(isFollowing(getFollows(), { sport: 'football', kind: 'team', key: 'gais' })).toBe(true)
    expect(toggleFollow(gais)).toEqual([])
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [gais, { sport: 'curling', kind: 'team', key: 'x', name: 'X' }, null])
    expect(getFollows()).toEqual([gais])
  })
  it('ett följt lag känns igen i kort och lång form, och i en sport som klassats som övrigt', () => {
    toggleFollow({ sport: 'hockey', kind: 'team', key: 'djurgarden', name: 'Djurgården' })
    expect(isFollowing(getFollows(), { sport: 'hockey', kind: 'team', key: 'djurgardens' })).toBe(true)
    expect(isFollowing(getFollows(), { sport: 'other', kind: 'team', key: 'djurgarden' })).toBe(true)
    expect(isFollowing(getFollows(), { sport: 'football', kind: 'team', key: 'djurgarden' })).toBe(false)
    expect(isFollowing(getFollows(), { sport: 'hockey', kind: 'league', key: 'djurgarden' })).toBe(false)
  })
  it('useFollows följer lagringen', () => {
    const { result } = renderHook(() => useFollows())
    expect(result.current).toEqual([])
    act(() => { toggleFollow(gais) })
    expect(result.current).toEqual([gais])
  })
})

describe('klockan per lag', () => {
  it('sparas på den följda posten, Av inräknat; skräp släpps; okänd post ändrar ingenting', () => {
    const aik = { sport: 'football' as const, kind: 'team' as const, key: 'aik', name: 'AIK' }
    toggleFollow(aik)
    setFollowAlert(aik, 'kickoff')
    expect(getFollows()).toEqual([{ ...aik, alert: 'kickoff' }])
    setFollowAlert(aik, 'off')
    expect(getFollows()[0]!.alert).toBe('off')
    setFollowAlert({ ...aik, key: 'okand' }, '15')
    expect(getFollows()).toEqual([{ ...aik, alert: 'off' }])
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, [{ ...aik, alert: 'snart' }])
    expect(getFollows()).toEqual([aik])
  })
})

describe('åsidosättningar', () => {
  it('sätter och tar bort en kanal per match', () => {
    const ch = { key: 'A::http://x/A', name: 'A', url: 'http://x/A', logo: null, group: 'Sport', tvgId: null }
    expect(setOverride('m1', ch)).toEqual({ m1: ch })
    expect(getOverrides().m1?.name).toBe('A')
    expect(setOverride('m1', null)).toEqual({})
  })
})

describe('teamKeysMatch (samma regel som Rust)', () => {
  it.each([
    ['djurgarden', 'djurgarden', true],
    ['djurgarden', 'djurgardens', true],
    ['nybro', 'nybro vikings', true],
    ['karlskoga', 'bik karlskoga', true],
    ['aik', 'hammarby', false],
    ['', '', false],
    [null, 'aik', false],
  ] as const)('%s ~ %s = %s', (a, b, expected) => {
    expect(teamKeysMatch(a, b)).toBe(expected)
  })
  it('sportsCompatible', () => {
    expect(sportsCompatible('hockey', 'other')).toBe(true)
    expect(sportsCompatible('hockey', 'football')).toBe(false)
  })
})

describe('fas 2-fälten', () => {
  it('standardvärden, och providerIds bevaras på följda lag', () => {
    expect(getSportSettings()).toMatchObject({ apiKey: null, goalAlerts: true, provider: 'api-sports', keyPlan: null, goalAlertMatches: {} })
    const f = { sport: 'football' as const, kind: 'team' as const, key: 'malmo', name: 'Malmö FF', providerIds: { 'api-sports': '375' } }
    toggleFollow(f)
    expect(getFollows()).toEqual([f])
  })
})

const OWN = { football: 'standard', hockey: 'standard', basketball: 'standard', motorsport: 'standard', tennis: 'standard' } as const

describe('Bakgrund i Sport', () => {
  it('standard: varje sport med egen bild har Standard (sin bild), Övrigt och Alla sporter ärver/blandar; korten tonas ur bilden 50 %', () => {
    expect(getSportSettings()).toMatchObject({ backdrops: { all: 'standard', sports: OWN }, cards: { opacity: 50, tone: 'image' } })
    expect(getSportSettings().backdrops.sports.other).toBeUndefined()
    expect(setSportSettings({ backdrops: { all: 'bogus' as never, sports: { football: 'nope' as never, cricket: 'off' } as never } })).toMatchObject({ backdrops: { all: 'standard', sports: OWN } })
  })
  it('flytt: en sport utan sparat val (förr underförstått "Som Alla sporter") blir Standard; uttryckliga val står kvar', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { backdrops: { all: 'custom', sports: { hockey: 'image:tennis', tennis: 'off' } } })
    expect(getSportSettings().backdrops).toEqual({ all: 'custom', sports: { ...OWN, hockey: 'image:tennis', tennis: 'off' } })
  })
  it('"Som Alla sporter" sparas uttryckligen och överlever en omläsning', () => {
    setSportSettings({ backdrops: { all: 'auto', sports: { football: 'inherit', other: 'inherit' } } })
    expect(getSportSettings().backdrops).toEqual({ all: 'auto', sports: { ...OWN, football: 'inherit', other: 'inherit' } })
  })
  it('handboll har ingen egen rad: ett gammalt handbollsval släpps', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { backdrops: { all: 'standard', sports: { handball: 'off' } } })
    expect(getSportSettings().backdrops.sports.handball).toBeUndefined()
  })
  it('per sport med arv; Egen bild, Automatisk och Av sparas', () => {
    const s = setSportSettings({ backdrops: { all: 'auto', sports: { football: 'custom', hockey: 'off', tennis: 'standard' } } })
    expect(s.backdrops).toEqual({ all: 'auto', sports: { ...OWN, football: 'custom', hockey: 'off', tennis: 'standard' } })
  })
  it('en vald medföljande bild sparas per plats; okända bilder släpps', () => {
    const s = setSportSettings({ backdrops: { all: 'image:tennis', sports: { hockey: 'image:football', football: 'image:cricket' as never } } })
    expect(s.backdrops).toEqual({ all: 'image:tennis', sports: { ...OWN, hockey: 'image:football' } })
  })
  it('kortens bakgrund: opacitet 0–100 i heltal, tre färger', () => {
    expect(setSportSettings({ cards: { opacity: 140, tone: 'gray' } }).cards).toEqual({ opacity: 100, tone: 'gray' })
    expect(setSportSettings({ cards: { opacity: -3.4, tone: 'image' } }).cards).toEqual({ opacity: 0, tone: 'image' })
    expect(setSportSettings({ cards: { opacity: 42.6, tone: 'pink' as never } }).cards).toEqual({ opacity: 43, tone: 'image' })
  })
  it('gamla inställningar läses ofarligt: Av följer med, länken och startsidans bild glöms', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { backdrop: 'off', backdropCustom: { from: 'url', url: 'https://x/y.jpg' } })
    expect(getSportSettings().backdrops).toEqual({ all: 'off', sports: OWN })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { backdrop: 'custom', backdropCustom: { from: 'home', index: 1 } })
    expect(getSportSettings().backdrops).toEqual({ all: 'standard', sports: OWN })
    expect(getSportSettings()).not.toHaveProperty('backdropCustom')
  })
})
