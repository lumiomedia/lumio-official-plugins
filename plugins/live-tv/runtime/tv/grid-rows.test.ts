import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { EpgProgramme } from '../epg/types'

/**
 * `useSchedules` gör ett riktigt nätverksanrop (`epgSchedule`) — mockas här
 * så testet styr exakt vilka kanaler som "har tablå" utan att röra
 * cache/fetch-lagret. Samma mockstrategi som `useSchedules.test.ts`.
 */
const schedulesByKey = new Map<string, EpgProgramme[]>()
vi.mock('../hooks/useSchedules', () => ({
  useSchedules: (channels: readonly M3uChannel[]) => ({
    schedules: Object.fromEntries(channels.map((c) => [channelKey(c), schedulesByKey.get(channelKey(c)) ?? []])),
    loading: false,
  }),
}))

import { useGridRows } from './grid-rows'

const ch = (name: string): M3uChannel => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const withEpg = (channel: M3uChannel) => schedulesByKey.set(channelKey(channel), [{ title: `${channel.name} nu`, start: 0, stop: 1 }])

const modelWith = (channels: M3uChannel[]): LiveTvModel =>
  ({
    channels,
    pinnedKeys: [],
    pinnedSet: new Set<string>(),
    byKey: new Map(channels.map((c) => [channelKey(c), c])),
    favouriteChannels: [],
  }) as unknown as LiveTvModel

describe('useGridRows — withoutEpg sorteras sist', () => {
  it('kanaler utan tablå hamnar i withoutEpg, efter rows, i ursprunglig ordning', () => {
    schedulesByKey.clear()
    const [a, b, c, d] = [ch('A'), ch('B'), ch('C'), ch('D')]
    withEpg(a)
    withEpg(c)
    const model = modelWith([a, b, c, d])
    const { result } = renderHook(() => useGridRows(model, null, 10, 0, 1))
    expect(result.current.rows.map((row) => row.channel.name)).toEqual(['A', 'C'])
    expect(result.current.withoutEpg.map((channel) => channel.name)).toEqual(['B', 'D'])
    expect(result.current.hasMore).toBe(false)
  })

  it('visibleRows räknar rows OCH withoutEpg tillsammans — utan rum kvar blir withoutEpg tom men hasMore sant', () => {
    schedulesByKey.clear()
    const [a, b] = [ch('A'), ch('B')]
    withEpg(a) // B saknar tablå
    const model = modelWith([a, b])
    const { result } = renderHook(() => useGridRows(model, null, 1, 0, 1))
    expect(result.current.rows.map((row) => row.channel.name)).toEqual(['A'])
    expect(result.current.withoutEpg).toEqual([])
    expect(result.current.hasMore).toBe(true)
  })

  it('withoutEpg fylls upp till den plats som blir kvar efter rows, resten räknas som hasMore', () => {
    schedulesByKey.clear()
    const [a, b, c] = [ch('A'), ch('B'), ch('C')]
    withEpg(a) // B och C saknar tablå
    const model = modelWith([a, b, c])
    const { result } = renderHook(() => useGridRows(model, null, 2, 0, 1))
    expect(result.current.rows.map((row) => row.channel.name)).toEqual(['A'])
    expect(result.current.withoutEpg.map((channel) => channel.name)).toEqual(['B'])
    expect(result.current.hasMore).toBe(true)
  })

  it('allt får plats: ingen mer att visa', () => {
    schedulesByKey.clear()
    const [a, b] = [ch('A'), ch('B')]
    withEpg(a)
    const model = modelWith([a, b])
    const { result } = renderHook(() => useGridRows(model, null, 5, 0, 1))
    expect(result.current.rows.map((row) => row.channel.name)).toEqual(['A'])
    expect(result.current.withoutEpg.map((channel) => channel.name)).toEqual(['B'])
    expect(result.current.hasMore).toBe(false)
  })
})
