import type { MediaItem, SyncIdentityProvider } from '@/lib/plugin-sdk'

async function resolvePlexSyncIdentity(item: MediaItem): Promise<{ tmdbId: string | null; imdbId: string | null }> {
  let resolvedTmdbId = item.id.match(/^(?:movie|tv)-(\d+)$/)?.[1] ?? null
  let resolvedImdbId = item.imdbId?.trim() ?? null

  if (resolvedTmdbId) {
    if (!resolvedImdbId) {
      try {
        const response = await fetch(`/api/wiki?${new URLSearchParams({ tmdbId: resolvedTmdbId, type: item.type }).toString()}`)
        if (response.ok) {
          const payload = (await response.json()) as { imdbId?: string | null }
          resolvedImdbId = payload.imdbId ?? null
        }
      } catch {
        // Best-effort only.
      }
    }
    return { tmdbId: resolvedTmdbId, imdbId: resolvedImdbId }
  }

  if (resolvedImdbId) {
    try {
      const response = await fetch(`/api/wiki?${new URLSearchParams({ imdbId: resolvedImdbId, type: item.type }).toString()}`)
      if (response.ok) {
        const payload = (await response.json()) as { tmdbId?: string | number | null; imdbId?: string | null }
        resolvedTmdbId = payload.tmdbId != null ? String(payload.tmdbId) : null
        resolvedImdbId = payload.imdbId ?? resolvedImdbId
      }
    } catch {
      // Fall through to title search.
    }
  }

  if (!resolvedTmdbId && item.title) {
    try {
      const params = new URLSearchParams({ query: item.title })
      if (item.year) params.set('year', String(item.year))
      const response = await fetch(`/api/local-files/search?${params.toString()}`)
      if (response.ok) {
        const payload = (await response.json()) as { results?: Array<{ tmdbId: number; type: string }> }
        const match = payload.results?.find((entry) => entry.type === item.type) ?? payload.results?.[0]
        if (match) resolvedTmdbId = String(match.tmdbId)
      }
    } catch {
      // Ignore search failures.
    }
  }

  return { tmdbId: resolvedTmdbId, imdbId: resolvedImdbId }
}

export const plexSyncIdentityProvider: SyncIdentityProvider = {
  id: 'plex-sync-identity',
  pluginId: 'com.lumio.plex',
  label: { en: 'Plex sync identity', sv: 'Plex sync-identitet' },
  priority: 100,
  canResolve(item) {
    return item.source === 'plex'
  },
  async resolveIdentity(item) {
    const ids = await resolvePlexSyncIdentity(item)
    return {
      tmdbId: ids.tmdbId,
      imdbId: ids.imdbId,
      title: item.title,
      year: item.year ?? null,
    }
  },
}
