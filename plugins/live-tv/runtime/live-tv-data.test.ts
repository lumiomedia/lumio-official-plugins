import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import {
  LIVE_TV_PLUGIN_ID,
  MAX_CUSTOM_LIST_CHANNELS,
  __resetXtreamAccountCacheForTests,
  addChannelToLiveTvList,
  deleteLiveTvList,
  getLiveTvLists,
  importList,
  fetchXtreamAccount,
  importMissingSources,
  removeChannelFromLiveTvList,
  saveXtreamLogin,
  type LiveTvList,
  type XtreamLogin,
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

  it('importerar bara källor som SAKNAS i indexet (appens objektform)', async () => {
    // `/api/live-tv/status` svarar med objekt, inte strängar. Så länge
    // klienten jämförde mot objekten var ingen källa någonsin "känd" och
    // VARJE lista importerades om vid varje start på varje enhet.
    const imported: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const s = String(url)
      if (s.includes('/api/live-tv/status')) {
        return jsonResponse({ sources: [{ id: 'http://known.test/list.m3u', channels: 10, updatedAt: 1 }] })
      }
      if (s.includes('/api/live-tv/import/status')) {
        return jsonResponse({ state: 'done', received: 1, result: { total: 1, groups: [], urlTvg: null, truncated: false } })
      }
      if (s.includes('/api/live-tv/import')) {
        imported.push(JSON.parse(String(init?.body ?? '{}')).source)
        return jsonResponse({ job: 'job-1' })
      }
      throw new Error(`unexpected fetch: ${s}`)
    }))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'k1', name: 'known.test', kind: 'm3u', source: 'http://known.test/list.m3u', url: 'http://known.test/list.m3u' }),
      rawList({ id: 'm1', name: 'missing.test', kind: 'm3u', source: 'http://missing.test/list.m3u', url: 'http://missing.test/list.m3u' }),
    ])

    await importMissingSources()

    expect(imported).toEqual(['http://missing.test/list.m3u'])
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

describe('deleteLiveTvList', () => {
  function stubReset(): { calls: unknown[]; fetch: ReturnType<typeof vi.fn> } {
    const calls: unknown[] = []
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const s = String(url)
      if (s.includes('/api/live-tv/reset')) {
        calls.push(JSON.parse(String(init?.body ?? '{}')))
        return jsonResponse({ ok: true, removed: 3 })
      }
      throw new Error(`unexpected fetch: ${s}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    return { calls, fetch: fetchMock }
  }

  it('nollställer källan i indexet och säger till om ändringen', async () => {
    const { calls } = stubReset()
    const changed = vi.fn()
    window.addEventListener('lumio-live-tv-index-changed', changed)
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'm1', name: 'a.tld', kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u' }),
    ])

    deleteLiveTvList('m1')
    await vi.waitFor(() => expect(calls).toEqual([{ source: 'http://a.tld/list.m3u' }]))
    await vi.waitFor(() => expect(changed).toHaveBeenCalled())
    window.removeEventListener('lumio-live-tv-index-changed', changed)
    expect(getLiveTvLists()).toHaveLength(0)
  })

  it('rör inte indexet för en custom-lista (kanalerna bor i listan)', async () => {
    const { fetch: fetchMock } = stubReset()
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'c1', name: 'Min lista', kind: 'custom', source: 'custom:c1', channels: [channel('a')] }),
    ])

    deleteLiveTvList('c1')
    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rör inte indexet när en ANNAN lista delar samma källa', async () => {
    const { fetch: fetchMock } = stubReset()
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [
      rawList({ id: 'a1', name: 'a.tld', kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u' }),
      rawList({ id: 'a2', name: 'a.tld (kopia)', kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u' }),
    ])

    deleteLiveTvList('a1')
    await Promise.resolve()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('importList: kvittot efter ett klart jobb', () => {
  function stubImport(result: unknown) {
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
      const s = String(url)
      if (s.includes('/api/live-tv/import/status')) return jsonResponse({ state: 'done', received: 1, result })
      if (s.includes('/api/live-tv/import')) return jsonResponse({ job: 'job-1' })
      throw new Error(`unexpected fetch: ${s}`)
    }))
  }

  const m3u = rawList({ id: 'm1', name: 'a.tld', kind: 'm3u', source: 'http://a.tld/list.m3u', url: 'http://a.tld/list.m3u' })

  it('bär med sig att spellistan kapades vid taket', async () => {
    stubImport({ total: 12, groups: [], urlTvg: null, truncated: true })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [m3u])

    await importList(getLiveTvLists()[0])

    expect(getLiveTvLists()[0].truncated).toBe(true)
  })

  it('rensar flaggan när nästa hämtning ryms', async () => {
    stubImport({ total: 12, groups: [], urlTvg: null, truncated: false })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...m3u, truncated: true }])

    await importList(getLiveTvLists()[0])

    expect(getLiveTvLists()[0].truncated).toBe(false)
  })

  it('tar appens urlTvg även när den är null (den auto-härledda källan försvann)', async () => {
    stubImport({ total: 12, groups: [], urlTvg: null, truncated: false })
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...m3u, urlTvg: 'http://gammal/epg.xml' }])

    await importList(getLiveTvLists()[0])

    expect(getLiveTvLists()[0].urlTvg).toBeNull()
  })

  it('behåller gammal urlTvg när jobbet föll', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
      const s = String(url)
      if (s.includes('/api/live-tv/import/status')) return jsonResponse({ state: 'error', received: 0, error: 'boom' })
      if (s.includes('/api/live-tv/import')) return jsonResponse({ job: 'job-1' })
      throw new Error(`unexpected fetch: ${s}`)
    }))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [{ ...m3u, urlTvg: 'http://gammal/epg.xml' }])

    await importList(getLiveTvLists()[0])

    expect(getLiveTvLists()[0].urlTvg).toBe('http://gammal/epg.xml')
  })
})

describe('addChannelToLiveTvList: custom-listans gränser', () => {
  const archiveChannel = {
    ...channel('Xtream 1'),
    archive: { days: 7, streamId: 42, base: 'http://panel.test:8080', username: 'u', password: 'hemligt' },
  }

  it('lägger aldrig Xtream-inloggningen i den speglade listan', () => {
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [rawList({ id: 'c1', name: 'Min lista', kind: 'custom', source: 'custom:c1' })])

    expect(addChannelToLiveTvList('c1', archiveChannel)).toBe('added')

    const stored = getLiveTvLists()[0].channels ?? []
    expect(stored).toHaveLength(1)
    expect(stored[0].archive).toBeUndefined()
    expect(JSON.stringify(stored)).not.toContain('hemligt')
  })

  it('stannar vid taket i stället för att svälla den speglade nyckeln', () => {
    const many = Array.from({ length: MAX_CUSTOM_LIST_CHANNELS }, (_, i) => channel(`K${i}`))
    writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [rawList({ id: 'c1', name: 'Min lista', kind: 'custom', source: 'custom:c1', channels: many })])

    expect(addChannelToLiveTvList('c1', channel('En till'))).toBe('full')
    expect(getLiveTvLists()[0].channels).toHaveLength(MAX_CUSTOM_LIST_CHANNELS)
  })
})

describe('fetchXtreamAccount: kontocachen', () => {
  const login: XtreamLogin = { id: 'login-1', base: 'http://panel.test:8080', username: 'jerry', password: 'hemlig', format: 'ts', categoryIds: [] }
  const account = { user_info: { auth: 1, status: 'Active', exp_date: '1800000000', max_connections: '2', allowed_output_formats: ['ts'] } }

  function stubPanel(): { calls: () => number } {
    let calls = 0
    vi.stubGlobal('fetch', ((input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : String(input), 'http://localhost')
      if (url.pathname === '/player_api.php') {
        calls += 1
        return Promise.resolve(jsonResponse(account))
      }
      return Promise.resolve(jsonResponse({}, false, 404))
    }) as typeof fetch)
    return { calls: () => calls }
  }

  beforeEach(() => { __resetXtreamAccountCacheForTests() })

  it('frågar panelen en gång per bas och användare', async () => {
    const panel = stubPanel()
    const first = await fetchXtreamAccount(login)
    const second = await fetchXtreamAccount(login)
    expect(panel.calls()).toBe(1)
    expect(second).toEqual(first)
    expect(first.maxConnections).toBe(2)
  })

  it('force, nytt lösenord och saveXtreamLogin går förbi cachen', async () => {
    const panel = stubPanel()
    await fetchXtreamAccount(login)
    // Inloggningsflödet verifierar alltid mot panelen.
    await fetchXtreamAccount(login, { force: true })
    expect(panel.calls()).toBe(2)
    // Ett annat lösenord är en annan inloggning — en förnyad panel svarar annorlunda.
    await fetchXtreamAccount({ ...login, password: 'nytt' })
    expect(panel.calls()).toBe(3)
    // …och en omskriven inloggning rensar posten.
    saveXtreamLogin({ ...login, password: 'nytt' })
    await fetchXtreamAccount({ ...login, password: 'nytt' })
    expect(panel.calls()).toBe(4)
  })
})
