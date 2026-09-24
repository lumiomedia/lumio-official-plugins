import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useListTree } from './list-tree'
import type { LiveTvList } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'

const list: LiveTvList = {
  id: 'l1', name: 'Lista', createdAt: '2026-01-01', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null,
  kind: 'm3u', source: 'http://x/p.m3u', url: 'http://x/p.m3u', channelCount: 9,
  groups: [{ name: 'UK Sport', count: 5 }, { name: 'News', count: 3 }, { name: 'Sports UK', count: 1 }],
  curation: { hidden: ['News'], merges: [{ name: 'Sport', groups: ['UK Sport', 'Sports UK'] }] },
}

describe('useListTree', () => {
  it('visar listans grupper kuraterade: dolda borta, ihopslagna som en post', () => {
    const model = { lists: [list] } as unknown as LiveTvModel
    const { result } = renderHook(() => useListTree(model))
    expect(result.current[0].groups).toEqual([{ name: 'Sport', count: 6 }])
  })
})
