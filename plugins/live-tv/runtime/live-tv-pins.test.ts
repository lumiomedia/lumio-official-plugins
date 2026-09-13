import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, getPinnedLiveTvKeys, movePinnedLiveTvChannel } from './live-tv-data'

beforeEach(() => {
  __resetForTests()
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', ['a', 'b', 'c'])
})

describe('movePinnedLiveTvChannel', () => {
  it('flyttar upp', () => {
    expect(movePinnedLiveTvChannel('b', -1)).toEqual(['b', 'a', 'c'])
    expect(getPinnedLiveTvKeys()).toEqual(['b', 'a', 'c'])
  })
  it('flyttar ner och stannar vid kanten', () => {
    expect(movePinnedLiveTvChannel('c', 1)).toEqual(['a', 'b', 'c'])
    expect(movePinnedLiveTvChannel('a', -1)).toEqual(['a', 'b', 'c'])
  })
  it('ignorerar okänd nyckel', () => {
    expect(movePinnedLiveTvChannel('x', 1)).toEqual(['a', 'b', 'c'])
  })
})
