import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import { HOUR, MIN, fxMatch } from '../__sport-fixture'
import { __resetSportDayCache, localDayKey, shiftDay } from '../sport-epg'
import { __resetRouterForTests } from '../router'
import { currentResults } from '../results-controller'
import { setSportSettings } from '../sport-store'
import { __resetSportRowsForTests, seenSportLeagues, useSportRows } from './rows-feed'
import { fxFixture, stubHost } from './__rows-fixture'

/*
  Hemradernas delade lager. Det viktiga här är KVOTEN: raderna får aldrig
  göra ett anrop som kan gå till en källa. Allt som når `/sport/fetch` ska
  vara `cache-only` (diskcachen), och bara en gång per sport och dag.
*/

const now = Date.now()
const today = localDayKey(now)
const live = fxMatch({ id: 'live', home: 'GAIS', away: 'Sirius', start: now - 30 * MIN, stop: now + 90 * MIN })
const later = fxMatch({ id: 'later', home: 'AIK', away: 'Hammarby', start: now + 2 * HOUR })

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

describe('hemradernas lager', () => {
  it('sex rader = en prenumeration: varje dag hämtas en gång (igår, idag, imorgon)', async () => {
    const calls = stubHost({ [today]: [live, later] })
    const hooks = Array.from({ length: 6 }, () => renderHook(() => useSportRows()))
    await waitFor(() => expect(hooks[0]!.result.current.ready).toBe(true))
    expect(hooks[5]!.result.current.matches.map((m) => m.id)).toEqual(['live', 'later'])
    expect([...calls.day].sort()).toEqual([shiftDay(today, -1), today, shiftDay(today, 1)].sort())
    expect(calls.fetchModes).toEqual([]) // ingen nyckel: inget mot källan, inte ens cachen
  })

  it('Mina lag vill ha veckan: dag 2–7 hämtas också', async () => {
    const calls = stubHost({ [shiftDay(today, 4)]: [fxMatch({ id: 'far', start: now + 4 * 24 * HOUR })] })
    const { result } = renderHook(() => useSportRows({ week: true }))
    await waitFor(() => expect(result.current.matches.map((m) => m.id)).toContain('far'))
    expect(new Set(calls.day).size).toBe(8)
  })

  it('med nyckel: bara diskcachen (cache-only), en gång per sport och dag, och ingen koppling utan fixturer', async () => {
    setSportSettings({ keys: { 'api-sports': { key: 'k12345', plan: 'Free' } } })
    const calls = stubHost({ [today]: [live, later] })
    const a = renderHook(() => useSportRows())
    renderHook(() => useSportRows())
    await waitFor(() => expect(calls.fetchModes.length).toBe(2)) // fotboll × (idag, igår)
    expect(new Set(calls.fetchModes)).toEqual(new Set(['cache-only']))
    a.unmount()
    cleanup() // alla rader borta: lagret stannar …
    renderHook(() => useSportRows()) // … och startar igen när Hem öppnas
    await new Promise((r) => setTimeout(r, 20))
    expect(calls.fetchModes.length).toBe(2)
    expect(calls.link).toBe(0)
  })

  it('källans fixturer i resultatlagret ger ställning via den lokala kopplingen', async () => {
    setSportSettings({ keys: { 'api-sports': { key: 'k12345', plan: 'Free' } } })
    const calls = stubHost({ [today]: [live] }, { 'fx:api-sports:9': { matchId: 'live', swapped: false } })
    const { result } = renderHook(() => useSportRows())
    await waitFor(() => expect(result.current.ready).toBe(true))
    const fixture = fxFixture({ id: '9', kickoff: live.start })
    currentResults()!.applyFixtures('football', today, [fixture], 'day', Date.now())
    await waitFor(() => expect(result.current.matches.find((m) => m.id === 'live')?.score).toEqual({ home: 2, away: 1 }))
    expect(calls.link).toBe(1)
    expect(new Set(calls.fetchModes)).toEqual(new Set(['cache-only']))
  })

  it('utan data = tom lista, aldrig fel', async () => {
    stubHost({})
    const { result } = renderHook(() => useSportRows())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.matches).toEqual([])
  })

  it('ligorna för radens väljare hämtas lokalt även innan någon rad visats', async () => {
    const calls = stubHost({ [today]: [live] })
    expect(seenSportLeagues()).toEqual([])
    await waitFor(() => expect(seenSportLeagues()).toEqual([{ key: 'allsvenskan', name: 'Allsvenskan' }]))
    expect(calls.fetchModes).toEqual([])
  })
})
