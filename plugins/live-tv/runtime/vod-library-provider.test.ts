// runtime/vod-library-provider.test.ts
//
// Katalogskanningen läser VÄRDENS redan importerade VOD-index och gör noll
// paneluppslag. Testerna matar in `query`/`status` som beroenden, så de
// verifierar sidhanteringen och avbrottet utan nät.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import type { LibraryBatch } from '@/lib/plugin-sdk'
import {
  scanVodSource,
  vodPlaybackUrl,
  vodDeltaNeeded,
  vodSourceFromLibraryId,
  vodLibraryProvider,
  VOD_SCAN_PAGE,
} from './vod-library-provider'

function item(n: number) {
  return {
    key: `vod:${n}`,
    kind: 'movie' as const,
    title: `Film ${n}`,
    categoryId: '1',
    categoryName: 'MOVIE: Swedish',
    url: `http://panel/${n}.mkv`,
  }
}

function pagedQuery(total: number) {
  return vi.fn(async ({ offset, limit }: { offset: number; limit: number }) => {
    const items = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => item(offset + i))
    return { items, total, known: true }
  })
}

const status = (updatedAt: number) => vi.fn(async () => [
  { id: 'kkz', total: 0, movies: 0, series: 0, updatedAt, importing: false },
])

describe('vodSourceFromLibraryId', () => {
  it('plockar ut kontot ur bibliotekskällans id', () => {
    expect(vodSourceFromLibraryId('xtream-vod:kkz')).toBe('kkz')
  })

  it('ger null för en källa som inte är vår', () => {
    // Skanningen ska inte råka gå igång för Plex.
    expect(vodSourceFromLibraryId('plex:1')).toBeNull()
    expect(vodSourceFromLibraryId('xtream-vod:')).toBeNull()
  })
})

describe('scanVodSource', () => {
  it('går igenom alla sidor en gång', async () => {
    const query = pagedQuery(VOD_SCAN_PAGE * 2 + 30)
    const batches: LibraryBatch[] = []
    const out = await scanVodSource('xtream-vod:kkz', async (b) => { batches.push(b) }, () => {}, undefined, { query: query as never, status: status(99) as never })
    expect(out.titles).toBe(VOD_SCAN_PAGE * 2 + 30)
    expect(batches).toHaveLength(3)
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('slutar på en kort sida i stället för att lita på total', async () => {
    // `total` kan växa mitt i genomgången när en import kör klart; en loop som
    // väntar på att nå det talet hade kunnat låsa sig.
    const query = pagedQuery(10)
    const out = await scanVodSource('xtream-vod:kkz', async () => {}, () => {}, undefined, { query: query as never, status: status(1) as never })
    expect(query).toHaveBeenCalledTimes(1)
    expect(out.titles).toBe(10)
  })

  it('läser markören FÖRE första sidan', async () => {
    // Hinner en import bli klar mitt i skanningen ska nästa delta göra om
    // jobbet, inte hoppa över det som ändrades.
    const out = await scanVodSource('xtream-vod:kkz', async () => {}, () => {}, undefined, { query: pagedQuery(5) as never, status: status(4242) as never })
    expect(out.cursor).toBe('4242')
  })

  it('avbryts av signalen', async () => {
    const controller = new AbortController()
    const query = vi.fn(async ({ offset, limit }: { offset: number; limit: number }) => {
      controller.abort()
      return { items: Array.from({ length: limit }, (_, i) => item(offset + i)), total: 10_000, known: true }
    })
    const out = await scanVodSource('xtream-vod:kkz', async () => {}, () => {}, controller.signal, { query: query as never, status: status(1) as never })
    expect(query).toHaveBeenCalledTimes(1)
    expect(out.titles).toBe(VOD_SCAN_PAGE)
  })

  it('gör ingenting för en främmande källa', async () => {
    const query = pagedQuery(100)
    const out = await scanVodSource('plex:1', async () => {}, () => {}, undefined, { query: query as never, status: status(1) as never })
    expect(query).not.toHaveBeenCalled()
    expect(out).toEqual({ titles: 0, cursor: null })
  })

  it('sänder inga tomma batchar', async () => {
    const query = pagedQuery(0)
    const batches: LibraryBatch[] = []
    await scanVodSource('xtream-vod:kkz', async (b) => { batches.push(b) }, () => {}, undefined, { query: query as never, status: status(1) as never })
    expect(batches).toEqual([])
  })
})

describe('vodDeltaNeeded', () => {
  it('hoppar över en källa som inte ändrats', () => {
    // En full genomgång av 40 000 titlar var kvart hade varit ren spilld tid.
    expect(vodDeltaNeeded('4242', 4242)).toBe(false)
  })

  it('kör när indexet ändrats', () => {
    expect(vodDeltaNeeded('4242', 4243)).toBe(true)
  })

  it('kör när vi inte vet', () => {
    expect(vodDeltaNeeded(null, 4242)).toBe(true)
    expect(vodDeltaNeeded('4242', undefined)).toBe(true)
  })
})

describe('vodPlaybackUrl', () => {
  it('lämnar tillbaka panelens färdiga adress', () => {
    expect(vodPlaybackUrl('http://panel/movie/u/p/4211.mkv')).toBe('http://panel/movie/u/p/4211.mkv')
    expect(vodPlaybackUrl('https://panel/4211.mkv')).toBe('https://panel/4211.mkv')
  })

  it('säger nej i stället för att skicka skräp till spelaren', () => {
    expect(vodPlaybackUrl('')).toBeNull()
    expect(vodPlaybackUrl(null)).toBeNull()
    expect(vodPlaybackUrl('  ')).toBeNull()
    // En playRef som inte är en adress hör till en annan leverantör.
    expect(vodPlaybackUrl('/library/parts/99/file.mkv')).toBeNull()
  })
})

/*
  FAS B — avsnitten, lata.

  `loadEpisodes` är enda stället i biblioteksvägen som rör en inloggning.
  Testerna låser tre saker: rätt avsnitt och versioner ut, tyst null när
  inloggningen är borta, och att `resolvePlayback` väljer avsnittets egen
  adress.
*/
describe('loadEpisodes', () => {
  const KÄLLA = { id: 'xtream-vod:xtream://panel.example/login-1' }
  const TITEL = { key: 'xtream-vod:xtream://panel.example/login-1:series:77' }

  const avsnittssvar = [
    { season: 1, episode: 1, title: 'Pilot', url: 'http://panel.example/s1e1.mkv', runtimeMin: 42 },
    { season: 1, episode: 2, title: 'Nästa', url: 'http://panel.example/s1e2.mkv' },
  ]

  beforeEach(() => {
    __resetForTests()
    writePluginJson('com.lumio.live-tv', 'xtream_logins', [
      { id: 'login-1', base: 'http://panel.example', username: 'u', password: 'p', format: 'ts', categoryIds: [] },
    ])
  })

  afterEach(() => { vi.unstubAllGlobals() })

  const medPanel = (svar: unknown, spion?: (body: unknown) => void) => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      if (url.includes('/api/live-tv/vod/series')) {
        spion?.(JSON.parse(String(init?.body ?? '{}')))
        return { ok: true, status: 200, json: async () => svar, text: async () => JSON.stringify(svar) } as unknown as Response
      }
      throw new Error(`oväntat anrop: ${url}`)
    }))
  }

  it('avsnitt mappas med egen playRef, knuten till sitt avsnitt', async () => {
    medPanel({ episodes: avsnittssvar })
    const ut = await vodLibraryProvider.loadEpisodes!(KÄLLA, TITEL, new AbortController().signal)
    expect(ut).not.toBeNull()
    expect(ut!.episodes.map((e) => `${e.season}x${e.episode}`)).toEqual(['1x1', '1x2'])
    expect(ut!.media).toHaveLength(2)
    // Varje version pekar på SITT avsnitt, annars hänger de löst i vyn.
    for (const m of ut!.media) {
      expect(ut!.episodes.some((e) => e.key === m.episodeKey)).toBe(true)
    }
    expect(ut!.media[0].playRef).toBe('http://panel.example/s1e1.mkv')
  })

  it('lösenordet går till panelen och ingen annanstans', async () => {
    let skickat: unknown = null
    medPanel({ episodes: avsnittssvar }, (body) => { skickat = body })
    await vodLibraryProvider.loadEpisodes!(KÄLLA, TITEL, new AbortController().signal)
    expect((skickat as { xtream: { password: string } }).xtream.password).toBe('p')
    const ut = await vodLibraryProvider.loadEpisodes!(KÄLLA, TITEL, new AbortController().signal)
    // Inget av det som går vidare till biblioteket får bära inloggningen.
    expect(JSON.stringify(ut)).not.toContain('password')
    expect(JSON.stringify(ut)).not.toMatch(/[?&]password=/)
  })

  it('saknad inloggning ger null i stället för ett kastat fel', async () => {
    writePluginJson('com.lumio.live-tv', 'xtream_logins', [])
    medPanel({ episodes: avsnittssvar })
    expect(await vodLibraryProvider.loadEpisodes!(KÄLLA, TITEL, new AbortController().signal)).toBeNull()
  })

  it('en titel som inte är en serie ger null', async () => {
    medPanel({ episodes: avsnittssvar })
    const film = { key: 'xtream-vod:xtream://panel.example/login-1:vod:9' }
    expect(await vodLibraryProvider.loadEpisodes!(KÄLLA, film, new AbortController().signal)).toBeNull()
  })

  it('fel från panelen ger null, inte ett kast', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('nätet nere') }))
    expect(await vodLibraryProvider.loadEpisodes!(KÄLLA, TITEL, new AbortController().signal)).toBeNull()
  })

  it('resolvePlayback väljer avsnittets egen adress', async () => {
    medPanel({ episodes: avsnittssvar })
    const ut = await vodLibraryProvider.loadEpisodes!(KÄLLA, TITEL, new AbortController().signal)
    const spelbar = await vodLibraryProvider.resolvePlayback(KÄLLA, ut!.media[1])
    expect(spelbar).toEqual({ url: 'http://panel.example/s1e2.mkv' })
  })
})
