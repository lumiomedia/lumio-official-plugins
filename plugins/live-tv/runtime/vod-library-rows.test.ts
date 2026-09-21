import { describe, expect, it } from 'vitest'

import type { LibraryStatus } from '@/lib/plugin-sdk'
import type { VodSourceStatus } from './vod-client'
import { vodLibraryBuildDisabled, vodLibraryRows } from './vod-library-rows'

const source = (over: Partial<VodSourceStatus> = {}): VodSourceStatus => ({
  id: 'kkzbigserver',
  total: 41_000,
  movies: 32_000,
  series: 9_000,
  updatedAt: 1_758_000_000,
  importing: false,
  ...over,
})

const library = (sources: LibraryStatus['sources']): LibraryStatus => ({
  sources,
  movies: 0,
  series: 0,
  unmatched: 0,
  total: 0,
})

describe('vodLibraryRows', () => {
  it('ger en rad per källa med VOD', () => {
    const rader = vodLibraryRows([source()], null)
    expect(rader).toHaveLength(1)
    expect(rader[0]).toMatchObject({ vodSource: 'kkzbigserver', libraryId: 'xtream-vod:kkzbigserver', vodTitles: 41_000 })
  })

  it('visar värden som etikett, inte pseudo-URL:en', () => {
    const rader = vodLibraryRows([source({ id: 'xtream://tv.kkzbigserver.iptv.uno/8bc57014-9dae-4ce3-9660-1e37e17a4429' })], null)
    expect(rader[0].label).toBe('tv.kkzbigserver.iptv.uno')
  })

  it('faller tillbaka på nyckeln när den inte går att tolka', () => {
    expect(vodLibraryRows([source({ id: 'kkzbigserver' })], null)[0].label).toBe('kkzbigserver')
  })

  it('utelämnar källor utan VOD-poster', () => {
    expect(vodLibraryRows([source({ id: 'bara-kanaler', total: 0 })], null)).toEqual([])
  })

  it('säger null om biblioteket aldrig byggts för källan', () => {
    expect(vodLibraryRows([source()], library([]))[0].indexedTitles).toBeNull()
  })

  it('läser antalet ur biblioteksindexet när källan finns där', () => {
    const status = library([{ id: 'xtream-vod:kkzbigserver', provider: 'xtream-vod', titles: 40_812 }])
    expect(vodLibraryRows([source()], status)[0].indexedTitles).toBe(40_812)
  })

  it('parar ihop på biblioteks-id och inte på VOD-nyckeln', () => {
    // En annan leverantörs källa får inte råka matcha.
    const status = library([{ id: 'kkzbigserver', provider: 'plex', titles: 7 }])
    expect(vodLibraryRows([source()], status)[0].indexedTitles).toBeNull()
  })
})

describe('vodLibraryBuildDisabled', () => {
  const rad = vodLibraryRows([source()], null)[0]

  it('släpper igenom när inget pågår', () => {
    expect(vodLibraryBuildDisabled(rad, false)).toBe(false)
  })

  it('stänger av medan en genomgång kör — också värdens egen', () => {
    expect(vodLibraryBuildDisabled(rad, true)).toBe(true)
  })

  it('stänger av medan panelen fortfarande importeras', () => {
    const under = vodLibraryRows([source({ importing: true })], null)[0]
    expect(vodLibraryBuildDisabled(under, false)).toBe(true)
  })
})
