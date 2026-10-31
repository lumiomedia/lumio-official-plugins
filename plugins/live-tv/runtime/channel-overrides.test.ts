import { beforeEach, describe, expect, it } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, type M3uChannel } from './live-tv-data'
import {
  CHANNEL_OVERRIDES_KEY, applyChannelOverrides, getChannelOverrides, renameChannel, setChannelHidden, setChannelName, sourceName,
} from './channel-overrides'

const ch = (name: string): M3uChannel => ({ name, logo: null, group: 'G', url: `http://x/${name}`, tvgId: null })

beforeEach(() => __resetForTests())

describe('dolda och omdöpta kanaler (Jerry 2026-10-31)', () => {
  it('dölj och visa igen, per kanalnyckel', () => {
    const a = ch('SVT1 HD')
    setChannelHidden(channelKey(a), true)
    expect(getChannelOverrides().hidden).toEqual([channelKey(a)])
    setChannelHidden(channelKey(a), false)
    expect(getChannelOverrides().hidden).toEqual([])
  })

  it('byt namn: visningsnamnet ändras men NYCKELN är kvar (favoriter, lås, historik, EPG)', () => {
    const a = ch('SE| SVT 1 FHD')
    const key = channelKey(a)
    setChannelName(key, 'SVT1')
    const renamed = renameChannel(a, getChannelOverrides())
    expect(renamed.name).toBe('SVT1')
    expect(channelKey(renamed)).toBe(key)
    expect(sourceName(renamed)).toBe('SE| SVT 1 FHD')
    setChannelName(key, '  ')
    expect(getChannelOverrides().names).toEqual({})
  })

  it('tillämpa: dolda bort, omdöpta får nytt namn, övriga samma objekt', () => {
    const a = ch('A'); const b = ch('B'); const c = ch('C')
    setChannelHidden(channelKey(b), true)
    setChannelName(channelKey(c), 'Cee')
    const out = applyChannelOverrides([a, b, c], getChannelOverrides())
    expect(out.map((x) => x.name)).toEqual(['A', 'Cee'])
    expect(out[0]).toBe(a)
  })

  it('sanering: skräp i lagringen ger tomma värden', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, CHANNEL_OVERRIDES_KEY, { hidden: [1, 'k', ''], names: { k: 'N', x: 3, y: '' } })
    expect(getChannelOverrides()).toEqual({ hidden: ['k'], names: { k: 'N' } })
  })
})
