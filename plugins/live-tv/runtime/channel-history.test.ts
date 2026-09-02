import { beforeEach, describe, expect, it } from 'vitest'
import {
  CHANNEL_HISTORY_LIMIT,
  clearChannelHistory,
  getChannelHistory,
  recordChannelWatch,
  topGroupsFromHistory,
} from './channel-history'

const channel = (name: string, group = 'Sport') => ({
  name,
  url: `http://example.test/${name.toLowerCase()}.m3u8`,
  group,
  logo: null,
  tvgId: null,
})

describe('channel history', () => {
  beforeEach(() => clearChannelHistory())

  it('puts the latest watched channel first and dedupes by channel', () => {
    recordChannelWatch(channel('SVT1', 'Nyheter'), 'list-a', 1000)
    recordChannelWatch(channel('TV4'), 'list-a', 2000)
    recordChannelWatch(channel('SVT1', 'Nyheter'), 'list-a', 3000)
    const history = getChannelHistory()
    expect(history.map((entry) => entry.name)).toEqual(['SVT1', 'TV4'])
    expect(history[0].watchedAt).toBe(3000)
    expect(history[0].listId).toBe('list-a')
  })

  it('caps the history at the limit', () => {
    for (let i = 0; i < CHANNEL_HISTORY_LIMIT + 5; i++) {
      recordChannelWatch(channel(`Kanal ${i}`), null, i)
    }
    const history = getChannelHistory()
    expect(history).toHaveLength(CHANNEL_HISTORY_LIMIT)
    expect(history[0].name).toBe(`Kanal ${CHANNEL_HISTORY_LIMIT + 4}`)
  })

  it('ignores channels without url or name', () => {
    recordChannelWatch({ ...channel('Tom'), url: '' }, null, 1)
    recordChannelWatch({ ...channel(''), url: 'http://x' }, null, 2)
    expect(getChannelHistory()).toEqual([])
  })

  it('ranks the most watched groups first', () => {
    recordChannelWatch(channel('A', 'Sport'), null, 1)
    recordChannelWatch(channel('B', 'Sport'), null, 2)
    recordChannelWatch(channel('C', 'Nyheter'), null, 3)
    recordChannelWatch(channel('D', 'Film'), null, 4)
    recordChannelWatch(channel('E', 'Film'), null, 5)
    recordChannelWatch(channel('F', 'Film'), null, 6)
    expect(topGroupsFromHistory(getChannelHistory(), 2)).toEqual(['Film', 'Sport'])
  })
})
