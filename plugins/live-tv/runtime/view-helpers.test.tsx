import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { __resetForTests, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type LiveTvList, type M3uChannel } from './live-tv-data'
import { __resetLiveTvModelForTests } from './live-tv-model'
import { emitIndexChanged } from './index-client'
import { pickReplayChannels, useChannelsBySource, useChannelsPage, withIndexTwins } from './view-helpers'

const SOURCE_A = 'http://a.tld/list.m3u'
const SOURCE_B = 'http://b.tld/list.m3u'

const ch = (name: string, extra: Partial<M3uChannel> = {}) => ({
  name,
  logo: null,
  group: 'Sport',
  url: `http://x/${name}`,
  tvgId: null,
  key: `${name}::http://x/${name}`,
  number: 1,
  tvgIdResolved: null,
  ...extra,
})

function listFor(id: string, source: string): LiveTvList {
  return {
    id,
    name: id,
    kind: 'm3u',
    source,
    url: source,
    createdAt: '',
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
    channels: [],
  } as LiveTvList
}

/** Indexets innehåll per källa — bytbart mitt i ett test. */
let index: Record<string, ReturnType<typeof ch>[]> = {}
/** Källor vars svar hålls tillbaka tills testet släpper dem. */
let gated = new Set<string>()
let release: Record<string, () => void> = {}
let queryCalls: string[] = []

function json(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

beforeEach(() => {
  __resetForTests()
  __resetLiveTvModelForTests()
  index = {}
  gated = new Set()
  release = {}
  queryCalls = []
  // Migreringen är redan gjord och alla källor finns — bootstrap är ett no-op.
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_storage_v2_migrated', true)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [listFor('a', SOURCE_A), listFor('b', SOURCE_B)])

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname === '/api/live-tv/status') return json({ sources: [SOURCE_A, SOURCE_B] })
    if (url.pathname === '/api/live-tv/query') {
      const source = url.searchParams.get('source') ?? ''
      queryCalls.push(source)
      if (gated.has(source)) await new Promise<void>((resolve) => { release[source] = resolve })
      const items = index[source] ?? []
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? 5000)
      return json({ items: items.slice(offset, offset + limit), total: items.length, known: true })
    }
    return json({})
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useChannelsBySource', () => {
  it('delar EN hämtning per källa mellan flera monterade vyer', async () => {
    index[SOURCE_A] = [ch('Ett')]
    const first = renderHook(() => useChannelsBySource([SOURCE_A]))
    const second = renderHook(() => useChannelsBySource([SOURCE_A]))

    await waitFor(() => expect(first.result.current.bySource[SOURCE_A]).toHaveLength(1))
    await waitFor(() => expect(second.result.current.bySource[SOURCE_A]).toHaveLength(1))
    // Modellens delade laddare: två vyer, ett anrop — inte två hämtningar av
    // samma 17 000 kanaler.
    expect(queryCalls.filter((source) => source === SOURCE_A)).toHaveLength(1)
  })

  it('håller loading tills ALLA källor svarat, inte bara den första', async () => {
    index[SOURCE_A] = [ch('Ett')]
    index[SOURCE_B] = [ch('Tva')]
    gated.add(SOURCE_B)

    const { result } = renderHook(() => useChannelsBySource([SOURCE_A, SOURCE_B]))

    await waitFor(() => expect(result.current.bySource[SOURCE_A]).toHaveLength(1))
    expect(result.current.loading).toBe(true)

    await act(async () => {
      release[SOURCE_B]?.()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.bySource[SOURCE_B]).toHaveLength(1)
  })

  it('efter en indexändring läses de NYA kanalerna, inte den gamla laddningen', async () => {
    index[SOURCE_A] = [ch('Fore')]
    const { result } = renderHook(() => useChannelsBySource([SOURCE_A]))
    await waitFor(() => expect(result.current.bySource[SOURCE_A]?.[0]?.name).toBe('Fore'))

    // En import har ersatt källans innehåll.
    index[SOURCE_A] = [ch('Efter')]
    act(() => { emitIndexChanged() })

    // Modellens invalidering rensar cachen OCH den pågående hämtningen, så
    // ingen gammal promise kan skriva tillbaka kanalerna som just ersattes.
    await waitFor(() => expect(result.current.bySource[SOURCE_A]?.[0]?.name).toBe('Efter'))
    expect(queryCalls.filter((source) => source === SOURCE_A)).toHaveLength(2)
  })

  it('ett listbyte fram och tillbaka använder den varma cachen', async () => {
    index[SOURCE_A] = [ch('Ett')]
    index[SOURCE_B] = [ch('Tva')]
    const { result, rerender } = renderHook(({ sources }: { sources: string[] }) => useChannelsBySource(sources), {
      initialProps: { sources: [SOURCE_A] },
    })
    await waitFor(() => expect(result.current.bySource[SOURCE_A]).toHaveLength(1))

    rerender({ sources: [SOURCE_B] })
    await waitFor(() => expect(result.current.bySource[SOURCE_B]).toHaveLength(1))
    rerender({ sources: [SOURCE_A] })
    await waitFor(() => expect(result.current.bySource[SOURCE_A]).toHaveLength(1))

    // Inget "force" som blivit klibbigt av en tidigare indexändring: A låg
    // varmt kvar och hämtades inte om.
    expect(queryCalls.filter((source) => source === SOURCE_A)).toHaveLength(1)
  })
})

describe('useChannelsPage', () => {
  it('hämtar bara sidan och rapporterar hela antalet ur indexet', async () => {
    index[SOURCE_A] = Array.from({ length: 120 }, (_, i) => ch(`K${i}`))
    const lists = [listFor('a', SOURCE_A)]
    const { result } = renderHook(() => useChannelsPage(lists, 10))

    await waitFor(() => expect(result.current.byListId.a).toHaveLength(10))
    // Sidan är tio poster — men vyn får veta att det finns 120 bakom den.
    expect(result.current.totalByListId.a).toBe(120)
  })

  it('manuella listor svarar ur sina inbäddade kanaler utan att fråga indexet', async () => {
    const manual = { ...listFor('c', 'custom:c'), kind: 'custom', channels: [ch('Egen')] } as LiveTvList
    const { result } = renderHook(() => useChannelsPage([manual], 10))

    await waitFor(() => expect(result.current.byListId.c).toHaveLength(1))
    expect(queryCalls).toHaveLength(0)
  })
})

describe('pickReplayChannels', () => {
  const archive = (name: string) =>
    ch(name, {
      archive: { days: 3, streamId: 7, base: 'http://p.tld', username: 'u', password: 'p' },
    } as Partial<M3uChannel>) as M3uChannel
  const plain = (name: string) => ch(name) as M3uChannel

  it('tar bara arkivkanaler, favoriter före historik, utan dubbletter', () => {
    const picked = pickReplayChannels([archive('Fav'), plain('UtanArkiv')], [archive('Fav'), archive('Sedd')])
    expect(picked.map((channel) => channel.name)).toEqual(['Fav', 'Sedd'])
  })

  it('har ett tak — hela spellistan frågas aldrig', () => {
    const many = Array.from({ length: 80 }, (_, i) => archive(`K${i}`))
    expect(pickReplayChannels([], many)).toHaveLength(40)
    expect(pickReplayChannels([], many, 5)).toHaveLength(5)
  })

  it('inga arkivkanaler bland favoriter/historik ger ingen reprisrad', () => {
    expect(pickReplayChannels([plain('A')], [plain('B')])).toEqual([])
  })
})

describe('withIndexTwins', () => {
  it('hämtar tillbaka arkivet ur indexet för en lagrad kanal', () => {
    // Custom-listan lagrar kanalen UTAN `archive` (inloggningen ska inte
    // speglas mellan enheter) — repriserna behöver den ändå.
    const stored = { name: 'Sport 1', logo: null, group: 'Sport', url: 'http://x/s1', tvgId: null }
    const twin = { ...stored, archive: { days: 7, streamId: 42, base: 'http://panel', username: 'u', password: 'p' } }
    const byUrl = new Map([[twin.url, twin]])

    expect(withIndexTwins([stored], byUrl)[0]).toBe(twin)
  })

  it('behåller kanalen när indexet inte känner URL:en', () => {
    const stored = { name: 'Egen', logo: null, group: 'Other', url: 'http://x/egen', tvgId: null }
    expect(withIndexTwins([stored], new Map())[0]).toBe(stored)
  })
})
