'use client'

import type { LibraryBatch, LibraryMedia, LibraryProvider, LibraryScanProgress, LibrarySourceRef, LibraryTitle } from '@/lib/plugin-sdk'
import { getPlexAuth, normalizePlexUris, type PlexSettingsState } from './plex-storage'
import { ensureCanonicalPlexSettings } from './plex-storage'

/**
 * Plex som biblioteksleverantör: skyfflar sektionernas titlar och seriernas
 * avsnitt till kärnans index via två sidhandlers i appen
 * (`/api/plugins/plex/index-page`, `/api/plugins/plex/index-episodes`).
 * Kärnan äger index, startsida och spelare — här översätts bara Plex.
 */

const PAGE_SIZE = 200
const EPISODE_CONCURRENCY = 3

export const PLEX_LIBRARY_PROVIDER_ID = 'plex'

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

async function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
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
      await emit({ upsert: items })
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
  label: { en: 'Plex', sv: 'Plex' },
  pluginId: 'com.lumio.plex',
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
    return { url: `${base}${media.playRef}${separator}X-Plex-Token=${encodeURIComponent(token)}`, filename: media.playRef.split('/').pop() }
  },
}
