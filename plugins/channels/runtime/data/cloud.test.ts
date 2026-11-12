import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createCloud } from './cloud'
import { evaluateCloudServices } from './cloud-services'

// Den riktiga tjänstefilen ur repots rot: testerna nedan är dess regressionssvit.
const SERVICES = evaluateCloudServices(readFileSync(resolve(process.cwd(), '../../connectors/channels-cloud.js'), 'utf8'))!

/** Testens filnamnstolk (appens är en värdfunktion): titel före SxxEyy/år/kvalitet. */
function parseLocalName(fileName: string) {
  const stem = fileName.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]+/g, ' ').trim()
  const se = stem.match(/\bs(\d{1,2})\s*e(\d{1,3})\b/i)
  const year = stem.match(/\b(19|20)\d{2}\b/)
  const cut = [se?.index, year?.index, stem.search(/\b(2160p|1080p|720p)\b/i)].filter((i): i is number => i != null && i > 0)
  const title = (cut.length ? stem.slice(0, Math.min(...cut)) : stem).trim()
  return { title, year: year ? Number(year[0]) : null, season: se ? Number(se[1]) : null, episode: se ? Number(se[2]) : null }
}

const tokens: Record<string, string> = {}
const matchTitles = vi.fn(async (wanted: unknown[]) => wanted.map((_, i) => ({ tmdbId: 100 + i })))
let cloud = createCloud({ services: () => SERVICES, token: () => null, parseFileName: parseLocalName, matchTitles, pauseMs: 0 })
const listCloud = (options?: { force?: boolean }) => cloud.listCloud(options)
const unlockCloudFile: typeof cloud.unlockCloudFile = (input) => cloud.unlockCloudFile(input)

const fetchMock = vi.fn()
function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
}

/**
 * Testerna nedan beskriver anropen per leverantör (`/<leverantör>/<sökväg>` och
 * leverantörens nyckelrubrik). Pluginet går via appens vidarebefordring
 * (`/api/plugin-relay` + basadress i en rubrik), så attrappen översätter
 * tillbaka. Rutten själv har egna tester längst ned.
 */
const PROVIDER_BY_BASE: Record<string, [string, string]> = {
  'https://api.real-debrid.com/rest/1.0': ['realdebrid', 'x-stream-provider-token'],
  'https://api.torbox.app/v1/api': ['torbox', 'x-tb-token'],
  'https://api.alldebrid.com': ['alldebrid', 'x-ad-token'],
}
const rawFetch = vi.fn()
function relayedFetch(url: string, init?: RequestInit) {
  rawFetch(url, init)
  const headers = { ...((init?.headers as Record<string, string>) ?? {}) }
  const known = PROVIDER_BY_BASE[headers['x-relay-base'] ?? '']
  if (!url.startsWith('/api/plugin-relay') || !known) return fetchMock(url, init)
  headers[known[1]] = headers['x-relay-token']
  return fetchMock(`/api/stream-providers/${known[0]}${url.slice('/api/plugin-relay'.length)}`, { ...init, headers })
}

beforeEach(() => {
  for (const key of Object.keys(tokens)) delete tokens[key]
  fetchMock.mockReset()
  rawFetch.mockReset()
  vi.stubGlobal('fetch', relayedFetch)
  // Ny instans per test = tom cache och ingen pågående genomgång.
  cloud = createCloud({ services: () => SERVICES, token: (p) => tokens[p] ?? null, parseFileName: parseLocalName, matchTitles, pauseMs: 0 })
})

describe('listCloud', () => {
  it('hoppar över leverantörer utan token och anropar ingenting', async () => {
    expect(await listCloud()).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('TorBox: grupperar avsnitt till en serie och filtrerar bort icke-video', async () => {
    tokens.torbox = 'tb'
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/torbox/torrents/mylist')) {
        return json({ data: [{ id: 7, files: [
          { id: 1, name: 'Reacher.S01E01.1080p.mkv', size: 2e9 },
          { id: 2, name: 'Reacher.S01E02.1080p.mkv', size: 2e9 },
          { id: 3, name: 'Reacher.S01E02.1080p.nfo', size: 100 },
        ] }] })
      }
      throw new Error(`oväntat ${url}`)
    })
    const out = await listCloud()
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'tv', title: 'Reacher', tmdbId: 100 })
    expect(out[0].files.map((f: { fileRef: string; season?: number; episode?: number }) => [f.fileRef, f.season, f.episode])).toEqual([['7|1', 1, 1], ['7|2', 1, 2]])
  })

  it('en leverantör som svarar 401 fäller inte de andra', async () => {
    tokens.torbox = 'tb'
    tokens.alldebrid = 'ad'
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/torbox/')) return json({ error: 'bad token' }, 401)
      if (url.includes('/alldebrid/v4.1/magnet/status')) {
        // Klart magnet (statusCode 4) och ett som fortfarande laddas ner (1).
        return json({ status: 'success', data: { magnets: [{ id: 9, statusCode: 4 }, { id: 10, statusCode: 1 }] } })
      }
      if (url.includes('/alldebrid/v4.1/magnet/files')) {
        return json({ status: 'success', data: { magnets: [{ id: '9', files: [
          { n: 'Alien (1979)', e: [{ n: 'Alien.1979.mkv', s: 4e9, l: 'https://ad/l1' }, { n: 'cover.jpg', s: 10, l: 'https://ad/l2' }] },
        ] }] } })
      }
      throw new Error(`oväntat ${url}`)
    })
    const out = await listCloud()
    expect(out.map((t: { kind: string; title: string; year: number | null }) => [t.kind, t.title, t.year])).toEqual([['movie', 'Alien', 1979]])
    expect(out[0].files).toHaveLength(1)
    expect(out[0].files[0]).toMatchObject({ provider: 'alldebrid', fileRef: 'https://ad/l1', size: 4e9 })
    const filesCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/magnet/files'))
    expect(filesCall?.[1]).toMatchObject({ method: 'POST', body: 'id%5B%5D=9' })
  })

  it('Real-Debrid: kopplar valda filer till links[index] och hoppar över ej nedladdade', async () => {
    tokens.realdebrid = 'rd'
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realdebrid/torrents?limit=100')) {
        return json([{ id: 'T1', status: 'downloaded' }, { id: 'T2', status: 'downloading' }])
      }
      if (url.includes('/realdebrid/torrents/info/T1')) {
        return json({
          files: [
            { path: '/Alien.1979/sample.txt', bytes: 5, selected: 0 },
            { path: '/Alien.1979/Alien.1979.mkv', bytes: 4e9, selected: 1 },
            { path: '/Alien.1979/Alien.1979.nfo', bytes: 5, selected: 1 },
          ],
          links: ['https://rd/l1', 'https://rd/l2'],
        })
      }
      throw new Error(`oväntat ${url}`)
    })
    const out = await listCloud()
    expect(out).toHaveLength(1)
    expect(out[0].files).toEqual([{ provider: 'realdebrid', fileRef: 'T1|https://rd/l1', name: 'Alien.1979.mkv', size: 4e9 }])
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/info/T2'))).toBe(false)
  })

  it('cachar inte en lista där en leverantör misslyckades', async () => {
    tokens.torbox = 'tb'
    tokens.alldebrid = 'ad'
    let torboxFails = true
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/torbox/')) return torboxFails ? json({}, 500) : json({ data: [] })
      return json({ status: 'success', data: { magnets: [] } })
    })
    await listCloud()
    const callsAfterFirst = fetchMock.mock.calls.length
    torboxFails = false
    await listCloud()
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst)
    const callsAfterSecond = fetchMock.mock.calls.length
    await listCloud()
    expect(fetchMock.mock.calls.length).toBe(callsAfterSecond)
  })

  it('cachar i 6 h och respekterar force', async () => {
    tokens.alldebrid = 'ad'
    fetchMock.mockImplementation(() => json({ status: 'success', data: { magnets: [] } }))
    await listCloud()
    await listCloud()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await listCloud({ force: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('listCloud: delning, delvisa listor och tokennyckel', () => {
  it('samtida anrop delar en genomgång', async () => {
    tokens.torbox = 'tb'
    let release: () => void = () => {}
    fetchMock.mockImplementation(() => new Promise((resolve) => { release = () => resolve(json({ data: [] })) }).then((r) => r))
    const a = listCloud()
    const b = listCloud()
    const c = listCloud()
    await Promise.resolve()
    release()
    await Promise.all([a, b, c])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('Real-Debrid: ett fallet torrentuppslag ger en delvis lista som cachas kort (15 min)', async () => {
    tokens.realdebrid = 'rd'
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realdebrid/torrents?limit=100')) return json([{ id: 'T1', status: 'downloaded' }, { id: 'T2', status: 'downloaded' }])
      if (url.includes('/info/T1')) return json({ files: [{ path: '/Alien.1979.mkv', bytes: 4e9, selected: 1 }], links: ['https://rd/l1'] })
      if (url.includes('/info/T2')) return json({}, 503)
      throw new Error(`oväntat ${url}`)
    })
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1_000_000)
    const first = await listCloud()
    expect(first).toHaveLength(1)
    const calls = fetchMock.mock.calls.length
    now.mockReturnValue(1_000_000 + 14 * 60_000)
    expect(await listCloud()).toHaveLength(1)
    expect(fetchMock.mock.calls.length).toBe(calls)
    now.mockReturnValue(1_000_000 + 16 * 60_000)
    await listCloud()
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls)
    now.mockRestore()
  })

  it('cachen gäller bara samma tokenuppsättning (profilbyte läcker inte)', async () => {
    tokens.torbox = 'tb-a'
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      const token = (init?.headers as Record<string, string>)['x-tb-token']
      const name = token === 'tb-a' ? 'Alpha.2001.mkv' : 'Beta.2002.mkv'
      return json({ data: [{ id: 1, files: [{ id: 1, name, size: 1 }] }] })
    })
    const a = await listCloud()
    tokens.torbox = 'tb-b'
    const b = await listCloud()
    expect(a[0].title).toBe('Alpha')
    expect(b[0].title).toBe('Beta')
    tokens.torbox = 'tb-a'
    await listCloud()
    // Bara en post cachas: tillbaka till A är en ny genomgång, men aldrig B:s lista.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('ett hängande leverantörsanrop avbryts efter 15 s', async () => {
    vi.useFakeTimers()
    try {
      tokens.torbox = 'tb'
      fetchMock.mockImplementation((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      }))
      const pending = listCloud()
      await vi.advanceTimersByTimeAsync(15_000)
      expect(await pending).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('unlockCloudFile', () => {
  it('AllDebrid: ger data.link', async () => {
    tokens.alldebrid = 'ad'
    fetchMock.mockImplementation(() => json({ status: 'success', data: { link: 'https://cdn/x.mkv' } }))
    expect(await unlockCloudFile({ provider: 'alldebrid', fileRef: 'https://ad/l1' })).toEqual({ url: 'https://cdn/x.mkv' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/alldebrid/v4/link/unlock')
    expect(init).toMatchObject({ method: 'POST', body: 'link=https%3A%2F%2Fad%2Fl1' })
  })

  it('Real-Debrid: POSTar länken och ger download', async () => {
    tokens.realdebrid = 'rd'
    fetchMock.mockImplementation(() => json({ download: 'https://rd/dl.mkv' }))
    expect(await unlockCloudFile({ provider: 'realdebrid', fileRef: 'T1|https://rd/l1' })).toEqual({ url: 'https://rd/dl.mkv' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/realdebrid/unrestrict/link')
    expect(init).toMatchObject({ method: 'POST', body: 'link=https%3A%2F%2Frd%2Fl1' })
  })

  it('ger null vid fel i stället för att kasta', async () => {
    tokens.torbox = 'tb'
    fetchMock.mockImplementation(() => json({}, 500))
    expect(await unlockCloudFile({ provider: 'torbox', fileRef: '7|1' })).toBeNull()
  })
})

describe('listCloud: torrentens namn och mappar som sammanhang', () => {
  type File = { fileRef: string; name: string; season?: number; episode?: number }
  const torbox = (torrents: unknown[]) => {
    tokens.torbox = 'tb'
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/torbox/torrents/mylist')) return json({ data: torrents })
      throw new Error(`oväntat ${url}`)
    })
  }
  const summary = (out: Awaited<ReturnType<typeof listCloud>>) =>
    out.map((t) => [t.kind, t.title, t.files.map((f: File) => [f.fileRef, f.season ?? null, f.episode ?? null])])

  it('ett avsnitt döpt efter sin titel hamnar under serien, inte som film', async () => {
    const root = 'Terminator.The.Sarah.Connor.Chronicles.S02.1080p.BluRay.x264'
    torbox([{ id: 5, name: root, files: [
      { id: 1, name: `${root}/19 - Earthlings Welcome Here.mkv`, short_name: '19 - Earthlings Welcome Here.mkv', size: 1.5e9 },
      { id: 2, name: `${root}/20 - To the Lighthouse.mkv`, short_name: '20 - To the Lighthouse.mkv', size: 1.5e9 },
      { id: 3, name: `${root}/To the Lighthouse.mkv`, short_name: 'To the Lighthouse.mkv', size: 1.5e9 },
    ] }])
    expect(summary(await listCloud())).toEqual([
      ['tv', 'Terminator The Sarah Connor Chronicles', [['5|1', 2, 19], ['5|2', 2, 20]]],
    ])
  })

  it('säsongen kan komma från mappen när torrenten gäller hela serien', async () => {
    const root = 'Reacher.Complete.Series.1080p'
    torbox([{ id: 6, name: root, files: [
      { id: 1, name: `${root}/Season 2/03 - Picture of the Dead.mkv`, short_name: '03 - Picture of the Dead.mkv', size: 2e9 },
      { id: 2, name: `${root}/Season 1/Reacher.S01E01.mkv`, short_name: 'Reacher.S01E01.mkv', size: 2e9 },
    ] }])
    expect(summary(await listCloud())).toEqual([['tv', 'Reacher', [['6|1', 2, 3], ['6|2', 1, 1]]]])
  })

  it('sample, trailer, extramaterial och småfiler bredvid huvudfilen räknas inte', async () => {
    const root = 'Alien.1979.Directors.Cut.1080p'
    torbox([{ id: 7, name: root, files: [
      { id: 1, name: `${root}/Alien.1979.mkv`, short_name: 'Alien.1979.mkv', size: 8e9 },
      { id: 2, name: `${root}/Alien.1979.sample.mkv`, short_name: 'Alien.1979.sample.mkv', size: 60e6 },
      { id: 3, name: `${root}/Trailer.mkv`, short_name: 'Trailer.mkv', size: 300e6 },
      { id: 4, name: `${root}/Featurettes/The Beast Within.mkv`, short_name: 'The Beast Within.mkv', size: 900e6 },
      { id: 5, name: `${root}/clip01.mkv`, short_name: 'clip01.mkv', size: 120e6 },
    ] }])
    expect(summary(await listCloud())).toEqual([['movie', 'Alien', [['7|1', null, null]]]])
  })

  it('ett skräpord som är en del av seriens namn fäller inte avsnitten', async () => {
    const root = 'Trailer.Park.Boys.S01.720p'
    torbox([{ id: 8, name: root, files: [
      { id: 1, name: `${root}/Trailer.Park.Boys.S01E01.mkv`, short_name: 'Trailer.Park.Boys.S01E01.mkv', size: 4e8 },
      { id: 2, name: `${root}/Trailer.Park.Boys.S01E02.mkv`, short_name: 'Trailer.Park.Boys.S01E02.mkv', size: 4e8 },
    ] }])
    expect(summary(await listCloud())).toEqual([['tv', 'Trailer Park Boys', [['8|1', 1, 1], ['8|2', 1, 2]]]])
  })

  it('Real-Debrid: torrentens filnamn och sökvägen ger serien', async () => {
    tokens.realdebrid = 'rd'
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/realdebrid/torrents?limit=100')) return json([{ id: 'T9', status: 'downloaded', filename: 'Firefly.S01.1080p' }])
      if (url.includes('/realdebrid/torrents/info/T9')) {
        return json({ files: [{ path: '/Firefly.S01.1080p/14 - Objects in Space.mkv', bytes: 2e9, selected: 1 }], links: ['https://rd/l9'] })
      }
      throw new Error(`oväntat ${url}`)
    })
    expect(summary(await listCloud())).toEqual([['tv', 'Firefly', [['T9|https://rd/l9', 1, 14]]]])
  })
})

describe('fallerade upplåsningar rapporteras med status och svar', () => {
  it('TorBox 200 utan adress och RD 404 når onUnlockFailed; en lyckad gör det inte', async () => {
    const failed: Array<[string, string, number, unknown]> = []
    cloud = createCloud({ services: () => SERVICES, token: (p) => tokens[p] ?? null, parseFileName: parseLocalName, matchTitles, pauseMs: 0, onUnlockFailed: (p, f, s, b) => { failed.push([p, f, s, b]) } })
    tokens.torbox = 'tb'
    tokens.realdebrid = 'rd'
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/torbox/torrents/requestdl') && url.includes('file_id=378')) return json({ success: false, error: 'DOWNLOAD_NOT_FOUND' })
      if (url.includes('/torbox/torrents/requestdl')) return json({ success: true, data: 'https://cdn/ok.mkv' })
      if (url.includes('/realdebrid/unrestrict/link')) return json({ error: 'unknown_ressource', error_code: 7 }, 404)
      return json({}, 500)
    })
    expect(await unlockCloudFile({ provider: 'torbox', fileRef: '1|378' })).toBeNull()
    expect(await unlockCloudFile({ provider: 'torbox', fileRef: '1|5' })).toEqual({ url: 'https://cdn/ok.mkv' })
    expect(await unlockCloudFile({ provider: 'realdebrid', fileRef: 'T|https://rd/l' })).toBeNull()
    expect(failed).toEqual([
      ['torbox', '1|378', 200, { success: false, error: 'DOWNLOAD_NOT_FOUND' }],
      ['realdebrid', 'T|https://rd/l', 404, { error: 'unknown_ressource', error_code: 7 }],
    ])
  })
})

describe('appens vidarebefordring', () => {
  it('skickar basadress och nyckel i rubriker; AllDebrid även nyckelparameter och standardpar', async () => {
    tokens.torbox = 'tb'
    tokens.alldebrid = 'ad'
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/torbox/')) return json({ data: [] })
      return json({ status: 'success', data: { magnets: [] } })
    })
    await listCloud()
    const calls = rawFetch.mock.calls.map(([u, init]) => [u, init?.headers as Record<string, string>] as const)
    const torbox = calls.find(([, h]) => h['x-relay-base'] === 'https://api.torbox.app/v1/api')!
    expect(torbox[0]).toBe('/api/plugin-relay/torrents/mylist?bypass_cache=true')
    expect(torbox[1]['x-relay-token']).toBe('tb')
    expect(torbox[1]['x-relay-token-param']).toBeUndefined()
    const alldebrid = calls.find(([, h]) => h['x-relay-base'] === 'https://api.alldebrid.com')!
    expect(alldebrid[0]).toBe('/api/plugin-relay/v4.1/magnet/status')
    expect(alldebrid[1]['x-relay-token-param']).toBe('apikey')
    expect(alldebrid[1]['x-relay-defaults']).toBe('agent=lumio')
  })

  it('en äldre app utan rutten: samma anrop går via den gamla vägen, och frågas inte om', async () => {
    tokens.torbox = 'tb'
    const seen: string[] = []
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      seen.push(url)
      if (url.startsWith('/api/plugin-relay')) return json({ error: 'route not found' }, 404)
      expect((init?.headers as Record<string, string>)['x-tb-token']).toBe('tb')
      return json({ data: [{ id: 1, files: [{ id: 1, name: 'Alien.1979.mkv', size: 1 }] }] })
    })
    expect(await listCloud()).toHaveLength(1)
    expect(seen).toEqual(['/api/plugin-relay/torrents/mylist?bypass_cache=true', '/api/stream-providers/torbox/torrents/mylist?bypass_cache=true'])
    await listCloud({ force: true })
    expect(seen.slice(2)).toEqual(['/api/stream-providers/torbox/torrents/mylist?bypass_cache=true'])
  })
})

describe('tjänstefilen', () => {
  it('en listning väntar in filen i stället för att svara tomt', async () => {
    tokens.torbox = 'tb'
    fetchMock.mockImplementation(() => json({ data: [{ id: 1, files: [{ id: 1, name: 'Alien.1979.mkv', size: 1 }] }] }))
    let file: typeof SERVICES | null = null
    const waiting = createCloud({
      services: () => file,
      servicesReady: async () => { file = SERVICES },
      token: (p) => tokens[p] ?? null, parseFileName: parseLocalName, matchTitles, pauseMs: 0,
    })
    expect(await waiting.listCloud()).toHaveLength(1)
  })

  it('utan fil finns inga molntjänster, och inget anropas', async () => {
    tokens.torbox = 'tb'
    const none = createCloud({ services: () => null, servicesReady: async () => null, token: (p) => tokens[p] ?? null, parseFileName: parseLocalName, matchTitles, pauseMs: 0 })
    expect(await none.listCloud()).toEqual([])
    expect(await none.unlockCloudFile({ provider: 'torbox', fileRef: '1|1' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
