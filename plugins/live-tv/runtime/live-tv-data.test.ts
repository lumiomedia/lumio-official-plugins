import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import {
  LIVE_TV_PLUGIN_ID,
  addChannelToLiveTvList,
  getLiveTvLists,
  importMissingSources,
  removeChannelFromLiveTvList,
  type LiveTvList,
} from './live-tv-data'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response
}

function rawList(overrides: Partial<LiveTvList> & { id: string; name: string }): LiveTvList {
  return {
    createdAt: '',
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
    channels: [],
    channelCount: 0,
    groups: [],
    ...overrides,
  } as LiveTvList
}

const channel = (name: string) => ({ name, logo: null, group: 'Other', url: `http://stream/${name}`, tvgId: null })

beforeEach(() => {
  __resetForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('classifyLegacyList (via readLists/getLiveTvLists)', () => {
  it('klassar en gammal Xtream-lista som xtream även när panelen har en port', () => {
    // Den gamla `upsertLiveTvListFromFetch`-vägen döpte listan via
    // `deriveListName(xtreamPseudoUrl(login))` — ett HOSTNAMN utan port
    // (`new URL().hostname`). En jämförelse mot `new URL(base).host` (MED
    // port) missar därför varje panel på en icke-standardport.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [
      { id: 'login1', base: 'http://panel.example:8080', username: 'u', password: 'p', format: 'ts', categoryIds: [] },
    ])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      { id: 'legacy1', name: 'panel.example', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, channels: [channel('a')] },
    ])

    const [list] = getLiveTvLists()
    expect(list.kind).toBe('xtream')
    expect(list.xtreamLoginId).toBe('login1')
    expect(list.source).toBe('xtream://panel.example:8080/login1')
  })

  it('faller tillbaka på custom när ingen konfigurerad källa matchar namnet', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      { id: 'legacy2', name: 'Min egen lista', createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null, channels: [channel('a')] },
    ])
    const [list] = getLiveTvLists()
    expect(list.kind).toBe('custom')
    expect(list.source).toBe('custom:legacy2')
  })
})

describe('addChannelToLiveTvList / removeChannelFromLiveTvList', () => {
  it('är ett no-op för m3u/xtream-listor (kanalerna bor i indexet, inte i lists)', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'm1', name: 'M3U', kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u', channelCount: 42, groups: [{ name: 'Sport', count: 42 }] }),
    ])

    addChannelToLiveTvList('m1', channel('a'))
    let list = getLiveTvLists().find((l) => l.id === 'm1')
    expect(list?.channels).toEqual([])
    expect(list?.channelCount).toBe(42)
    expect(list?.groups).toEqual([{ name: 'Sport', count: 42 }])

    removeChannelFromLiveTvList('m1', channel('a'))
    list = getLiveTvLists().find((l) => l.id === 'm1')
    expect(list?.channelCount).toBe(42)
  })

  it('fungerar som förut för custom-listor', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'c1', name: 'Custom', kind: 'custom', source: 'custom:c1' }),
    ])

    addChannelToLiveTvList('c1', channel('a'))
    let list = getLiveTvLists().find((l) => l.id === 'c1')
    expect(list?.channels).toEqual([channel('a')])
    expect(list?.channelCount).toBe(1)

    removeChannelFromLiveTvList('c1', channel('a'))
    list = getLiveTvLists().find((l) => l.id === 'c1')
    expect(list?.channels).toEqual([])
    expect(list?.channelCount).toBe(0)
  })
})

describe('importMissingSources', () => {
  it('markerar en lista med needsReimport/lastImportError i stället för att svälja felet tyst', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('/api/live-tv/status')) return jsonResponse({ sources: [] })
      throw new Error(`unexpected fetch: ${String(url)}`)
    }))

    // Xtream-lista utan motsvarande xtream_logins-post — t.ex. speglad till
    // en ny enhet innan xtream_logins hunnit synkas dit.
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'x1', name: 'Panel', kind: 'xtream', source: 'xtream://panel.test/login1', xtreamLoginId: 'login1' }),
    ])

    await importMissingSources()

    const list = getLiveTvLists().find((l) => l.id === 'x1')
    expect(list?.needsReimport).toBe(true)
    expect(list?.lastImportError).toContain('xtream login missing')
  })

  it('rensar needsReimport/lastImportError vid en efterföljande lyckad import', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
      const s = String(url)
      if (s.includes('/api/live-tv/status')) return jsonResponse({ sources: [] })
      if (s.includes('/api/live-tv/import/status')) return jsonResponse({ state: 'done', received: 1, result: { total: 1, groups: [], urlTvg: null, truncated: false } })
      if (s.includes('/api/live-tv/import')) return jsonResponse({ job: 'job-1' })
      throw new Error(`unexpected fetch: ${s}`)
    }))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'xtream_logins', [
      { id: 'login1', base: 'http://panel.test', username: 'u', password: 'p', format: 'ts', categoryIds: [] },
    ])
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'x2', name: 'Panel', kind: 'xtream', source: 'xtream://panel.test/login1', xtreamLoginId: 'login1', needsReimport: true, lastImportError: 'boom' }),
    ])

    await importMissingSources()

    const list = getLiveTvLists().find((l) => l.id === 'x2')
    expect(list?.needsReimport).toBe(false)
    expect(list?.lastImportError).toBeUndefined()
  })

  it('två samtidiga anrop kör bara en gång (återinträdesskydd)', async () => {
    let statusCalls = 0
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('/api/live-tv/status')) {
        statusCalls += 1
        return jsonResponse({ sources: [] })
      }
      throw new Error(`unexpected fetch: ${String(url)}`)
    }))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [])

    await Promise.all([importMissingSources(), importMissingSources()])

    expect(statusCalls).toBe(1)
  })
})
