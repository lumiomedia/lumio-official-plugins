'use client'

import type { LibraryBatch, LibraryMedia, LibraryProvider, LibraryScanProgress, LibrarySourceRef, LibraryTitle } from '@/lib/plugin-sdk'
import { ensurePlexClientIdentifier, getPlexAuth, normalizePlexUris, type PlexSettingsState } from './plex-storage'
import { ensureCanonicalPlexSettings } from './plex-storage'

/**
 * Plex som biblioteksleverantör: skyfflar sektionernas titlar och seriernas
 * avsnitt till kärnans index via två sidhandlers i appen
 * (`/api/plugins/plex/index-page`, `/api/plugins/plex/index-episodes`).
 * Kärnan äger index, startsida och spelare — här översätts bara Plex.
 */

const PAGE_SIZE = 200
const EPISODE_CONCURRENCY = 3
/**
 * Övre gräns för en batch mot kärnans index. `/api/library/batch` har axums
 * standardgräns på 2 MB, och en sida om 200 serier med alla avsnitt inbakade
 * blir flera MB: servern svarar 413 mitt i uppladdningen, Chromium rapporterar
 * det som "Failed to fetch" och skanningen dör innan den hunnit klart
 * (samma fel som Jellyfin 0.1.2 rättade). Marginal kvar för id-ifyllnaden.
 */
const MAX_BATCH_BYTES = 1_000_000

export const PLEX_LIBRARY_PROVIDER_ID = 'plex'

/**
 * Titelns/avsnittets ratingKey ur versionens indexnycklar: filmer
 * `<källa>:<ratingKey>:m<n>`, avsnitt `<titelnyckel>:e<ratingKey>`.
 */
export function plexRatingKeyOf(media: Pick<LibraryMedia, 'key' | 'episodeKey'>): string | null {
  if (media.episodeKey) return /:e(\d+)$/.exec(media.episodeKey)?.[1] ?? null
  return /:(\d+):m\d+$/.exec(media.key)?.[1] ?? null
}

/** Plex sidofiler som Lumios spelare kan läsa: SRT (och VTT) — ASS/PGS skickas inte om av Plex. */
const PLEX_TEXT_SUBTITLE_CODECS = new Set(['srt', 'subrip', 'vtt', 'webvtt'])

type PlexSubtitleStream = {
  streamType?: number | string
  key?: string
  codec?: string
  languageTag?: string
  languageCode?: string
  title?: string
  displayTitle?: string
  forced?: boolean | number
  hearingImpaired?: boolean | number
}

/**
 * Versionens externa undertextfiler. Inbäddade spår följer med i filen; en
 * sidofil (.srt bredvid filmen) har en egen `key` (/library/streams/<id>) och
 * når bara spelaren om den räknas upp här (Jellyfin-rapporten 2026-11-07 —
 * Plex fungerar likadant).
 */
export async function fetchPlexExternalSubtitles(base: string, token: string, ratingKey: string, partKey: string): Promise<Array<{ url: string; language: string; label?: string; forced?: boolean; sdh?: boolean }>> {
  const controller = new AbortController()
  // Kort: listan får aldrig hålla uppe starten.
  const timer = window.setTimeout(() => controller.abort(), 6_000)
  try {
    const response = await fetch(`${base}/library/metadata/${encodeURIComponent(ratingKey)}?X-Plex-Token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) return []
    const data = (await response.json()) as { MediaContainer?: { Metadata?: Array<{ Media?: Array<{ Part?: Array<{ key?: string; Stream?: PlexSubtitleStream[] }> }> }> } }
    const parts = (data.MediaContainer?.Metadata?.[0]?.Media ?? []).flatMap((media) => media.Part ?? [])
    const part = parts.find((candidate) => candidate.key === partKey) ?? null
    return (part?.Stream ?? [])
      .filter((stream) => String(stream.streamType ?? '') === '3' && stream.key && PLEX_TEXT_SUBTITLE_CODECS.has((stream.codec ?? '').toLowerCase()))
      .map((stream) => ({
        url: `${base}${stream.key}?X-Plex-Token=${encodeURIComponent(token)}`,
        language: stream.languageTag ?? stream.languageCode ?? '',
        label: stream.title || stream.displayTitle || undefined,
        ...(stream.forced ? { forced: true } : {}),
        ...(stream.hearingImpaired ? { sdh: true } : {}),
      }))
  } finally {
    window.clearTimeout(timer)
  }
}

export function plexLibrarySourceId(settings: PlexSettingsState): string | null {
  return settings.serverId ? `plex-${settings.serverId}` : null
}

export function plexLibrarySourceRef(settings: PlexSettingsState): LibrarySourceRef | null {
  const id = plexLibrarySourceId(settings)
  if (!id) return null
  return { id, name: settings.serverName ?? 'Plex' }
}

interface PageResponse {
  items: LibraryTitle[]
  total?: number | null
  nextStart?: number | null
  serverUri?: string
}

/**
 * Sidanropen går till appens egen endpoint, som i sin tur frågar Plex. Ett
 * tappat anrop ("Failed to fetch") fällde hela indexeringen av ett stort
 * bibliotek; nätfel får två nya försök. Ett avbrott från användaren och
 * HTTP-fel avgörs direkt.
 */
const NETWORK_RETRY_DELAYS_MS = [1_000, 3_000]

async function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
  let response: Response
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(url, init)
      break
    } catch (err) {
      if (signal.aborted || !(err instanceof TypeError) || attempt >= NETWORK_RETRY_DELAYS_MS.length) throw err
      await new Promise((resolve) => window.setTimeout(resolve, NETWORK_RETRY_DELAYS_MS[attempt]))
    }
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Plex ${response.status}: ${text.slice(0, 200)}`)
  }
  return (await response.json()) as T
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      out[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return out
}

/**
 * Skickar titlarna i batchar under MAX_BATCH_BYTES. En enskild titel som
 * själv är större (en jätteserie) går ensam — den kan inte delas.
 */
async function emitSized(emit: (batch: LibraryBatch) => Promise<void>, titles: LibraryTitle[]): Promise<void> {
  let chunk: LibraryTitle[] = []
  let bytes = 0
  for (const title of titles) {
    const size = JSON.stringify(title).length
    if (chunk.length > 0 && bytes + size > MAX_BATCH_BYTES) {
      await emit({ upsert: chunk })
      chunk = []
      bytes = 0
    }
    chunk.push(title)
    bytes += size
  }
  if (chunk.length > 0) await emit({ upsert: chunk })
}

async function scan(
  source: LibrarySourceRef,
  updatedAtMin: number | null,
  emit: (batch: LibraryBatch) => Promise<void>,
  progress: (state: LibraryScanProgress) => void,
  signal: AbortSignal,
): Promise<{ cursor: string | null }> {
  const auth = getPlexAuth()
  const settings = ensureCanonicalPlexSettings()
  if (!auth || !settings.serverUri || settings.libraries.length === 0) {
    throw new Error('Plex är inte anslutet eller saknar valda bibliotek')
  }
  const scanStartedAt = Math.floor(Date.now() / 1000)
  let done = 0
  for (const library of settings.libraries) {
    if (signal.aborted) break
    let start = 0
    let total: number | null = null
    progress({ phase: 'listing', section: library.title, done, total: total ?? undefined })
    while (!signal.aborted) {
      const page = await postJson<PageResponse>(
        '/api/plugins/plex/index-page',
        { auth, settings, sourceId: source.id, libraryKey: library.key, kind: library.type, start, size: PAGE_SIZE, updatedAtMin },
        signal,
      )
      total = page.total ?? total
      if (page.items.length === 0) break
      let items = page.items
      if (library.type === 'show') {
        progress({ phase: 'episodes', section: library.title, done, total: total ?? undefined })
        items = await mapWithLimit(items, EPISODE_CONCURRENCY, async (title) => {
          const ratingKey = title.key.slice(source.id.length + 1)
          try {
            const leaves = await postJson<{ episodes: LibraryTitle['episodes']; media: LibraryMedia[] }>(
              '/api/plugins/plex/index-episodes',
              { auth, settings, sourceId: source.id, showRatingKey: ratingKey },
              signal,
            )
            return { ...title, episodes: leaves.episodes ?? [], media: leaves.media ?? [] }
          } catch {
            return title
          }
        })
      }
      await emitSized(emit, items)
      done += items.length
      progress({ phase: 'titles', section: library.title, done, total: total ?? undefined })
      if (page.nextStart == null) break
      start = page.nextStart
    }
  }
  return { cursor: String(scanStartedAt) }
}

export const plexLibraryProvider: LibraryProvider = {
  id: PLEX_LIBRARY_PROVIDER_ID,
  label: { en: 'Plex', sv: 'Plex', de: 'Plex', fr: 'Plex', es: 'Plex' },
  pluginId: 'com.lumio.plex',
  // Kopplat (samma villkor som indexpanelen): värden bygger första indexet
  // själv i appar som stöder det; äldre appar läser inte metoden.
  configuredSources: () => {
    const settings = ensureCanonicalPlexSettings()
    if (!getPlexAuth() || !settings.serverUri || settings.libraries.length === 0) return []
    const source = plexLibrarySourceRef(settings)
    return source ? [source] : []
  },
  scanAll: (source, emit, progress, signal) => scan(source, null, emit, progress, signal),
  scanDelta: (source, cursor, emit, progress, signal) => {
    const since = cursor ? Number.parseInt(cursor, 10) : NaN
    return scan(source, Number.isFinite(since) ? since : null, emit, progress, signal)
  },
  async resolvePlayback(_source, media) {
    const auth = getPlexAuth()
    const settings = ensureCanonicalPlexSettings()
    const token = settings.serverAccessToken ?? auth?.authToken ?? null
    const uris = normalizePlexUris(settings.serverUri, settings.serverUris)
    const base = uris[0]
    if (!base || !token) return null
    const separator = media.playRef.includes('?') ? '&' : '?'
    const url = `${base}${media.playRef}${separator}X-Plex-Token=${encodeURIComponent(token)}`
    const filename = media.playRef.split('/').pop()
    // Sidofilerna följer inte med i filen. Kan listan inte hämtas spelas
    // filmen ändå — med filens egna spår och OpenSubtitles.
    const ratingKey = plexRatingKeyOf(media)
    const subtitles = ratingKey ? await fetchPlexExternalSubtitles(base, token, ratingKey, media.playRef.split('?')[0]).catch(() => []) : []
    return subtitles.length > 0 ? { url, filename, subtitles } : { url, filename }
  },

  /**
   * Progress tillbaka till Plex: `/:/timeline` under uppspelning (så Plex
   * egna appar visar samma "Fortsätt titta") och `/:/scrobble` vid slutet.
   * ratingKey ligger i indexnycklarna: titel `<källa>:<ratingKey>`, avsnitt
   * `<titelnyckel>:e<ratingKey>`.
   */
  async reportProgress(_source, ref, state) {
    const auth = getPlexAuth()
    const settings = ensureCanonicalPlexSettings()
    const token = settings.serverAccessToken ?? auth?.authToken ?? null
    const base = normalizePlexUris(settings.serverUri, settings.serverUris)[0]
    if (!base || !token) return
    const ratingKey = ref.episodeKey ? ref.episodeKey.split(':e').pop() : ref.title.key.split(':').pop()
    if (!ratingKey) return
    const common = `X-Plex-Token=${encodeURIComponent(token)}&X-Plex-Client-Identifier=${encodeURIComponent(ensurePlexClientIdentifier())}`
    const url = state.finished
      ? `${base}/:/scrobble?identifier=com.plexapp.plugins.library&key=${encodeURIComponent(ratingKey)}&${common}`
      : `${base}/:/timeline?ratingKey=${encodeURIComponent(ratingKey)}&key=${encodeURIComponent(`/library/metadata/${ratingKey}`)}&state=playing&time=${Math.max(0, state.positionMs)}&duration=${Math.max(0, state.durationMs)}&${common}`
    await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  },
}
