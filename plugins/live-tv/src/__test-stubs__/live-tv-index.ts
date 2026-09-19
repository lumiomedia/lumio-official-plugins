/**
 * Testhjälp: appens kanalindex och EPG-endpoints (`/api/live-tv/*`).
 *
 * Sedan lagring v2 läser modellen kanalerna ur appens index och tablån ur
 * Rust i stället för ur pluginlagringen. Vy-testerna seedar fortfarande
 * `lists` i lagringen — det är den läsbara formen — och den här hjälpen gör
 * om dem till ett index: kanalerna läggs i minnescachen (så modellen kan rita
 * synkront, precis som förr) OCH bakom en `fetch`-stubb (så alla asynkrona
 * vägar, uppslag och tablåfönster, svarar med samma data).
 *
 * `cache` är den gamla `EpgCacheEntry`-fixturen. Den behålls som INDATA för
 * att testerna ska slippa skrivas om till en ny form: namnmatchningen som
 * numera görs i Rust körs här i stället (`resolveTvgId`), så en fixtur nycklad
 * på tvg-id blir tablåer nycklade på kanalnyckel.
 */

import { act } from '@testing-library/react'
import { setPluginMemoryCache, writePluginJson } from '@/lib/plugin-sdk'
import {
  LIVE_TV_CHANNELS_PREFIX,
  LIVE_TV_PLUGIN_ID,
  channelKey,
  getLiveTvLists,
  type M3uChannel,
} from '../../runtime/live-tv-data'
import { buildNameToTvgIdIndex, resolveTvgId } from '../../runtime/epg/name-match'
import { nowNextLaterFrom } from '../../runtime/epg/lookup'
import { __resetScheduleCacheForTests } from '../../runtime/epg/schedule-cache'
import { __resetNowSnapshotForTests } from '../../runtime/epg/now-snapshot'
import { __resetChannelResolverForTests } from '../../runtime/channel-resolver'
import { __resetLiveTvModelForTests } from '../../runtime/live-tv-model'
import type { EpgCacheEntry, EpgProgramme } from '../../runtime/epg/types'

interface IndexChannel extends M3uChannel {
  key: string
  number: number
  tvgIdResolved: string | null
}

export interface SeedOptions {
  /** Tablåfixtur i den gamla cacheformen (nycklad på tvg-id). */
  cache?: EpgCacheEntry | null
  /** När appen senast hämtade EPG:t. Default "nyss", så ingen omhämtning begärs. */
  epgFetchedAt?: number | null
  /**
   * Bibliotekets titlar per KÄLLA — samma nyckel som kanalerna ligger på.
   * Utelämnad = panelen har ingen VOD, och `/vod/*` svarar `known: false`
   * precis som en källa som aldrig importerats.
   */
  vod?: Record<string, VodItemFixture[]>
  /** Sant = värden håller på att hämta biblioteket (vyn ska visa "hämtar"). */
  vodImporting?: boolean
}

/** Bibliotekstitel som fixtur — samma form som `VodItem` över tråden. */
export interface VodItemFixture {
  key: string
  kind: 'movie' | 'series'
  title: string
  categoryId: string
  categoryName: string
  posterUrl?: string
  year?: number
  rating?: number
  addedAt?: number
  tmdbId?: number
  /** Film: panelens ström-id. Serier: `seriesId` i stället. */
  streamId?: number
  seriesId?: number
  url?: string
}

/** Nollställer allt modulminne som modellen och EPG-hookarna delar. */
export function resetLiveTvIndex(): void {
  __resetScheduleCacheForTests()
  __resetNowSnapshotForTests()
  __resetChannelResolverForTests()
  __resetLiveTvModelForTests()
}

export function seedLiveTvIndex(opts: SeedOptions = {}): void {
  resetLiveTvIndex()
  // Migreringen ska inte köra i vy-tester: den skriver om `lists` och plockar
  // bort de inbäddade kanalerna som fixturerna bygger på.
  writePluginJson(LIVE_TV_PLUGIN_ID, 'live_tv_storage_v2_migrated', true)

  const lists = getLiveTvLists()
  const cache = opts.cache ?? null
  const nameIndex = cache ? buildNameToTvgIdIndex(cache) : new Map<string, string>()
  const fetchedAt = opts.epgFetchedAt === undefined ? Date.now() : opts.epgFetchedAt
  const vodBySource: Record<string, VodItemFixture[]> = opts.vod ?? {}
  const vodImporting = opts.vodImporting === true

  const bySource = new Map<string, IndexChannel[]>()
  const all: IndexChannel[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    const items: IndexChannel[] = (list.channels ?? []).map((channel, index) => ({
      ...channel,
      key: channelKey(channel),
      number: index + 1,
      tvgIdResolved: cache ? resolveTvgId(channel.tvgId, channel.name, nameIndex) : channel.tvgId,
    }))
    bySource.set(list.source ?? `custom:${list.id}`, items)
    for (const item of items) {
      if (seen.has(item.key)) continue
      seen.add(item.key)
      all.push(item)
    }
  }
  const allNumbered = all.map((channel, index) => ({ ...channel, number: index + 1 }))

  setPluginMemoryCache(LIVE_TV_PLUGIN_ID, `${LIVE_TV_CHANNELS_PREFIX}all`, allNumbered)
  for (const [source, items] of bySource) {
    setPluginMemoryCache(LIVE_TV_PLUGIN_ID, `${LIVE_TV_CHANNELS_PREFIX}${source}`, items)
  }

  const byKey = new Map(allNumbered.map((channel) => [channel.key, channel]))
  const scheduleFor = (channel: IndexChannel): EpgProgramme[] =>
    cache && channel.tvgIdResolved ? cache.index[channel.tvgIdResolved] ?? [] : []

  const json = (body: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: async () => body } as unknown as Response)

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : String(input)
    const url = new URL(raw, 'http://localhost')
    const path = url.pathname
    const params = url.searchParams

    if (path === '/api/live-tv/query') {
      const source = params.get('source')
      const items = source ? bySource.get(source) ?? [] : allNumbered
      const offset = Number(params.get('offset') ?? 0)
      const limit = Number(params.get('limit') ?? 5000)
      return json({ items: items.slice(offset, offset + limit), total: items.length, known: true })
    }
    if (path === '/api/live-tv/lookup') {
      const keys: string[] = JSON.parse(String(init?.body ?? '{}')).keys ?? []
      return json({ items: keys.map((key) => byKey.get(key)).filter(Boolean) })
    }
    if (path === '/api/live-tv/search') {
      const q = (params.get('q') ?? '').toLowerCase()
      return json({ items: allNumbered.filter((channel) => channel.name.toLowerCase().includes(q)) })
    }
    if (path === '/api/live-tv/groups') {
      const counts = new Map<string, number>()
      for (const channel of allNumbered) counts.set(channel.group, (counts.get(channel.group) ?? 0) + 1)
      return json({ groups: [...counts].map(([name, count]) => ({ name, count })) })
    }
    if (path === '/api/live-tv/status') {
      // Appens form: objekt, inte strängar (se indexStatus i index-client.ts).
      return json({ sources: [...bySource].map(([id, items]) => ({ id, channels: items.length, updatedAt: Date.now() })) })
    }
    if (path === '/api/live-tv/epg/now') {
      const at = Date.now()
      const items: Record<string, unknown> = {}
      for (const channel of allNumbered) {
        const programmes = scheduleFor(channel)
        if (programmes.length === 0) continue
        items[channel.key] = nowNextLaterFrom(programmes, at)
      }
      return json({ at, fetchedAt, items })
    }
    if (path === '/api/live-tv/epg/status') {
      // Diagnostiken som EPG-källsektionen läser (ersätter pluginets gamla
      // XMLTV-cache). Fixturen har ingen per-adress-statistik, så listan är
      // tom och totalerna räknas ur samma tablå som resten av stubben.
      const programmes = allNumbered.reduce((sum, channel) => sum + scheduleFor(channel).length, 0)
      const channels = allNumbered.filter((channel) => scheduleFor(channel).length > 0).length
      return json({ listId: params.get('listId') ?? '', fetchedAt, failedAt: null, channels, programmes, urls: [] })
    }
    if (path === '/api/live-tv/epg/schedule') {
      // POST med JSON-kropp: kanalnycklar kan innehålla komma.
      const body = JSON.parse(String(init?.body ?? '{}')) as { keys?: string[]; from?: number; to?: number }
      const keys = body.keys ?? []
      const from = Number(body.from ?? 0)
      const to = Number(body.to ?? 0)
      const items: Record<string, EpgProgramme[]> = {}
      for (const key of keys) {
        const channel = byKey.get(key)
        if (!channel) continue
        const programmes = scheduleFor(channel).filter((p) => p.stop > from && p.start < to)
        if (programmes.length > 0) items[key] = programmes
      }
      return json({ items })
    }
    if (path === '/api/live-tv/epg/search') {
      const q = (params.get('q') ?? '').toLowerCase()
      const from = Number(params.get('from') ?? 0)
      const to = Number(params.get('to') ?? 0)
      const items: { key: string; programme: EpgProgramme }[] = []
      for (const channel of allNumbered) {
        for (const programme of scheduleFor(channel)) {
          if (programme.stop <= from || programme.start >= to) continue
          if (!programme.title.toLowerCase().includes(q)) continue
          items.push({ key: channel.key, programme })
        }
      }
      return json({ items })
    }
    if (path === '/api/live-tv/epg/refresh' || path === '/api/live-tv/import') {
      return json({ job: 'test-job' })
    }
    if (path === '/api/live-tv/import/status') {
      return json({ state: 'done', received: allNumbered.length, total: allNumbered.length })
    }
    if (path === '/api/live-tv/batch') {
      return json({ ok: true })
    }
    if (path === '/api/live-tv/vod/categories') {
      const source = params.get('source')
      const items = source ? vodBySource[source] : Object.values(vodBySource).flat()
      if (!items) return json({ categories: [], total: 0, known: false, importing: vodImporting })
      const counts = new Map<string, { id: string; name: string; kind: string; count: number }>()
      for (const item of items) {
        const key = `${item.kind}:${item.categoryId}`
        const seen = counts.get(key)
        if (seen) seen.count += 1
        else counts.set(key, { id: item.categoryId, name: item.categoryName, kind: item.kind, count: 1 })
      }
      // Film före serier, sedan namn — samma ordning som värden svarar med.
      const categories = [...counts.values()].sort(
        (left, right) =>
          (left.kind === 'movie' ? 0 : 1) - (right.kind === 'movie' ? 0 : 1) || left.name.localeCompare(right.name),
      )
      return json({ categories, total: items.length, known: true, importing: vodImporting })
    }
    if (path === '/api/live-tv/vod/query') {
      const source = params.get('source')
      const all = source ? vodBySource[source] : Object.values(vodBySource).flat()
      if (!all) return json({ items: [], total: 0, known: false })
      const categoryId = params.get('categoryId')
      const kind = params.get('kind')
      const q = (params.get('q') ?? '').toLowerCase()
      let hits = all.filter(
        (item) =>
          (!categoryId || item.categoryId === categoryId)
          && (!kind || item.kind === kind)
          && (!q || item.title.toLowerCase().includes(q)),
      )
      const sort = params.get('sort') ?? 'new'
      hits = [...hits].sort((left, right) =>
        sort === 'az'
          ? left.title.localeCompare(right.title)
          : sort === 'rating'
            ? (right.rating ?? 0) - (left.rating ?? 0)
            : (right.addedAt ?? 0) - (left.addedAt ?? 0),
      )
      const offset = Number(params.get('offset') ?? 0)
      const limit = Number(params.get('limit') ?? 120)
      return json({ items: hits.slice(offset, offset + limit), total: hits.length, known: true })
    }
    if (path === '/api/live-tv/vod/status') {
      return json({
        sources: Object.entries(vodBySource).map(([id, items]) => ({
          id,
          total: items.length,
          movies: items.filter((item) => item.kind === 'movie').length,
          series: items.filter((item) => item.kind === 'series').length,
          updatedAt: 0,
          importing: vodImporting,
        })),
      })
    }
    if (path === '/api/live-tv/vod/lookup') {
      const keys: string[] = JSON.parse(String(init?.body ?? '{}')).keys ?? []
      const all = Object.values(vodBySource).flat()
      return json({ items: keys.map((key) => all.find((item) => item.key === key)).filter(Boolean) })
    }
    if (path === '/api/live-tv/vod/import') {
      return json({ importing: true, started: true })
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as unknown as Response)
  }) as typeof fetch
}

/**
 * Låter modellens och hookarnas asynkrona vägar landa: kanalerna kommer ur
 * minnescachen synkront, men nu-snapshotet och tablåfönstren är `fetch`-svar
 * (flera mikrotasksteg). Vy-tester som läser programtitlar väntar på den här.
 */
export async function flushLiveTvIndex(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve()
  })
}
