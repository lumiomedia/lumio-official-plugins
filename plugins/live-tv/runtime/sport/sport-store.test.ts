import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import {
  SPORT_FOLLOWS_KEY, SPORT_SETTINGS_KEY, getFollows, getOverrides, getSportSettings, isFollowing, setOverride,
  setSportSettings, sportsCompatible, teamKeysMatch, toggleFollow, useFollows,
} from './sport-store'

beforeEach(() => __resetForTests())

describe('sportinställningar', () => {
  it('standard och sanering av skräp', () => {
    expect(getSportSettings()).toEqual({ view: 'matchday', alert: '15' })
    writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, { view: 'grid', alert: 5 })
    expect(getSportSettings()).toEqual({ view: 'matchday', alert: '15' })
    expect(setSportSettings({ view: 'feed' })).toEqual({ view: 'feed', alert: '15' })
    expect(setSportSettings({ alert: 'kickoff' })).toEqual({ view: 'feed', alert: 'kickoff' })
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
