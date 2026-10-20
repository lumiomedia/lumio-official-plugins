import { describe, expect, it } from 'vitest'
import { guideWarmTargets } from './guide-warm'
import { createChannel, emptyDraft, type ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'

const ch = (id: string): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name: id }, []), id, airWindow: 'always' } as ChannelDef)
const item = (ref: string, source: PoolItem['source'], play: PoolItem['play']): PoolItem =>
  ({ ref, title: ref, kind: 'movie', source, genres: [], year: null, runtimeMin: 600, runtimeKnown: true, play } as PoolItem)

describe('guidens förvärmning', () => {
  it('programmet just nu per kanal: bibliotek och moln, aldrig strömuppslag eller IPTV-VOD; en gång per plats', () => {
    const channels = [ch('a'), ch('b'), ch('c'), ch('d')]
    const rundowns = {
      a: { rundown: [item('lib:x', 'library', { type: 'library', key: 'x', mediaType: 'movie' })] },
      b: { rundown: [item('db:torbox:1|2', 'debrid', { type: 'debrid', provider: 'torbox', fileRef: '1|2' })] },
      c: { rundown: [item('wl:movie:5', 'watchlist', { type: 'stream', imdbId: 'tt1', mediaType: 'movie' })] },
      d: { rundown: [item('lib:xtream-vod:9', 'vod', { type: 'library', key: 'v', mediaType: 'movie' })] },
    }
    const now = Date.UTC(2026, 9, 20, 18, 0)
    const first = guideWarmTargets(channels, rundowns, now, new Set())
    expect(first.map((t) => t.item.ref)).toEqual(['lib:x', 'db:torbox:1|2'])
    expect(guideWarmTargets(channels, rundowns, now, new Set(first.map((t) => t.key)))).toEqual([])
  })
})
