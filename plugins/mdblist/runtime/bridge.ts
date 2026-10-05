import type { MdblistApi } from './api'
import { buildWatchedPayload, buildWatchlistPayload, type WatchedPush } from './payloads'
import type { Prefs } from './prefs'
import type { RemoteEntry } from './types'

type Source = 'local' | 'trakt' | 'tracker'
type Entry = { tmdbId: string; imdbId: string | null; title: string; posterUrl: string | null }

export interface BridgeDeps {
  subscribe: {
    onShow(listener: (m: { action: 'add' | 'remove'; entry: Entry; source: Source }) => void): () => void
    onMovie(listener: (m: { action: 'add' | 'remove'; entry: Entry; source: Source }) => void): () => void
    onEpisodeWatched(listener: (m: { tmdbId: string; season: number; episode: number; watched: boolean; source: Source; watchedAt?: string }) => void): () => void
    onMovieWatched(listener: (m: { action: 'add' | 'remove'; entry: { tmdbId?: string | null; imdbId?: string | null; watchedAt: string }; source: Source; entries: unknown[] }) => void): () => void
  }
  api: MdblistApi
  prefs: Prefs
  isUserMutation(source: Source): boolean
  log(message: string): void
  schedule(fn: () => void, ms: number): unknown
  cancel(handle: unknown): void
}

const FLUSH_MS = 3_000

/// Användarens egna ändringar till MDBList direkt (3 s-batch). Bara
/// `source: 'local'` — det Trakt eller vi själva skrev ner ska inte eka.
/// Ett misslyckat tillägg fångas av nästa periodiska diff; en misslyckad
/// borttagning gör det inte, och loggas därför tydligt.
export function startBridge(deps: BridgeDeps): () => void {
  const queue = {
    showAdd: [] as RemoteEntry[], showRemove: [] as RemoteEntry[],
    movieAdd: [] as RemoteEntry[], movieRemove: [] as RemoteEntry[],
    watched: [] as WatchedPush[], unwatched: [] as WatchedPush[],
  }
  let timer: unknown = null

  const toRemote = (e: Entry): RemoteEntry => ({ tmdbId: e.tmdbId, imdbId: e.imdbId ?? null, title: e.title, posterUrl: null })

  async function flush() {
    timer = null
    const batch = { ...queue }
    for (const key of Object.keys(queue) as Array<keyof typeof queue>) (queue as Record<string, unknown[]>)[key] = []
    const send = async (path: string, body: object, what: string, critical: boolean) => {
      const result = await deps.api.call('POST', path, { body })
      if (!result.ok) deps.log(`brygga: ${what} misslyckades (${result.error})${critical ? ' — BORTTAGNINGEN NÅDDE INTE MDBLIST' : ''}`)
    }
    if (batch.showAdd.length) await send('/watchlist/items/add', buildWatchlistPayload(batch.showAdd, 'show'), 'serier +', false)
    if (batch.movieAdd.length) await send('/watchlist/items/add', buildWatchlistPayload(batch.movieAdd, 'movie'), 'filmer +', false)
    if (batch.showRemove.length) await send('/watchlist/items/remove', buildWatchlistPayload(batch.showRemove, 'show'), 'serier -', true)
    if (batch.movieRemove.length) await send('/watchlist/items/remove', buildWatchlistPayload(batch.movieRemove, 'movie'), 'filmer -', true)
    if (batch.watched.length) await send('/sync/watched', buildWatchedPayload(batch.watched), 'sedda +', false)
    if (batch.unwatched.length) await send('/sync/watched/remove', buildWatchedPayload(batch.unwatched), 'sedda -', true)
  }

  function arm() {
    if (timer != null) deps.cancel(timer)
    timer = deps.schedule(() => { void flush() }, FLUSH_MS)
  }

  const offs = [
    deps.subscribe.onShow((m) => {
      if (!deps.isUserMutation(m.source) || !deps.prefs.isOn('watchlist')) return
      ;(m.action === 'add' ? queue.showAdd : queue.showRemove).push(toRemote(m.entry))
      arm()
    }),
    deps.subscribe.onMovie((m) => {
      if (!deps.isUserMutation(m.source) || !deps.prefs.isOn('watchlist')) return
      ;(m.action === 'add' ? queue.movieAdd : queue.movieRemove).push(toRemote(m.entry))
      arm()
    }),
    deps.subscribe.onEpisodeWatched((m) => {
      if (!deps.isUserMutation(m.source) || !deps.prefs.isOn('watched')) return
      const push: WatchedPush = { kind: 'episode', tmdbId: m.tmdbId, season: m.season, episode: m.episode, watchedAt: m.watchedAt ?? new Date().toISOString() }
      ;(m.watched ? queue.watched : queue.unwatched).push(push)
      arm()
    }),
    deps.subscribe.onMovieWatched((m) => {
      if (!deps.isUserMutation(m.source) || !deps.prefs.isOn('watched')) return
      const push: WatchedPush = { kind: 'movie', tmdbId: m.entry.tmdbId ?? null, imdbId: m.entry.imdbId ?? null, watchedAt: m.entry.watchedAt }
      ;(m.action === 'add' ? queue.watched : queue.unwatched).push(push)
      arm()
    }),
  ]

  return () => {
    if (timer != null) deps.cancel(timer)
    for (const off of offs) off()
  }
}
