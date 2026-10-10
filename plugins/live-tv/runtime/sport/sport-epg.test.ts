import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { SportEndpointMissing, __resetSportDayCache, fetchSportDay, localDayKey, shiftDay, tzOffsetFor, useSportDay } from './sport-epg'
import { crestText, matchTitle } from './sport-model'
import { HOUR, fxMatch, stubSportDays } from './__sport-fixture'

afterEach(() => __resetSportDayCache())

describe('dagnycklar', () => {
  it('flyttar över månads- och årsskiften i lokal tid', () => {
    expect(shiftDay('2026-10-10', -1)).toBe('2026-10-09')
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01')
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
    expect(localDayKey(new Date(2026, 9, 10, 0, 30).getTime())).toBe('2026-10-10')
  })
  it('tidszonen räknas för just den dagen (sommartid och vintertid kan skilja)', () => {
    expect(tzOffsetFor('2026-07-01')).toBe(-new Date(2026, 6, 1, 12).getTimezoneOffset())
    expect(tzOffsetFor('2026-12-01')).toBe(-new Date(2026, 11, 1, 12).getTimezoneOffset())
  })
})

describe('fetchSportDay', () => {
  it('frågar den globala EPG-butiken med dag och tidszon, och cachar i fem minuter', async () => {
    const spy = stubSportDays({ '2026-10-10': [fxMatch()] })
    const now = Date.now()
    const first = await fetchSportDay('2026-10-10', now)
    await fetchSportDay('2026-10-10', now + 60_000)
    expect(spy).toHaveBeenCalledTimes(1)
    const url = new URL(String(spy.mock.calls[0]![0]), 'http://localhost')
    expect(url.searchParams.get('listId')).toBe('global')
    expect(url.searchParams.get('day')).toBe('2026-10-10')
    expect(url.searchParams.get('tzOffset')).toBe(String(tzOffsetFor('2026-10-10')))
    expect(first.matches).toHaveLength(1)
    await fetchSportDay('2026-10-10', now + 6 * 60_000)
    expect(spy).toHaveBeenCalledTimes(2)
  })
  it('404 = äldre app: SportEndpointMissing, och felet cachas inte', async () => {
    const spy = stubSportDays('missing')
    await expect(fetchSportDay('2026-10-10')).rejects.toBeInstanceOf(SportEndpointMissing)
    await expect(fetchSportDay('2026-10-10')).rejects.toBeInstanceOf(SportEndpointMissing)
    expect(spy).toHaveBeenCalledTimes(2)
  })
  it('useSportDay ger missing på en äldre app och ready med data annars', async () => {
    stubSportDays('missing')
    const missing = renderHook(() => useSportDay('2026-10-10', Date.now()))
    await waitFor(() => expect(missing.result.current.state).toBe('missing'))
    stubSportDays({ '2026-10-11': [fxMatch({ start: Date.now() + HOUR })] })
    const ready = renderHook(() => useSportDay('2026-10-11', Date.now()))
    expect(ready.result.current.state).toBe('loading')
    await waitFor(() => expect(ready.result.current.state).toBe('ready'))
    expect(ready.result.current.data?.matches).toHaveLength(1)
    const none = renderHook(() => useSportDay(null, Date.now()))
    await act(async () => {})
    expect(none.result.current).toEqual({ data: null, state: 'ready' })
  })
})

describe('modellen', () => {
  it('titel och initialer', () => {
    expect(matchTitle({ home: 'GAIS', away: 'IK Sirius', event: null, league: 'Allsvenskan' })).toBe('GAIS - IK Sirius')
    expect(matchTitle({ home: null, away: null, event: 'Singapores GP - Kval', league: 'Formel 1' })).toBe('Singapores GP - Kval')
    expect(crestText('FC Barcelona')).toBe('BAR')
    expect(crestText('IFK Göteborg')).toBe('GÖT')
    expect(crestText('Paris SG')).toBe('PAR')
    expect(crestText('IF')).toBe('IF')
  })
})
