import type { MdblistApi } from './api'
import { buildWatchedPayload, buildWatchlistPayload, type WatchedPush } from './payloads'
import type { Prefs } from '../../_shared/tracker-kit/prefs'
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
  now(): number
  schedule(fn: () => void, ms: number): unknown
  cancel(handle: unknown): void
}

const FLUSH_MS = 3_000
const RETRY_MS = 60_000

/** En köad ändring. Nyckeln är titeln, så en senare ändring av samma titel ersätter en tidigare. */
type Pending =
  | { kind: 'show' | 'movie'; add: boolean; entry: RemoteEntry }
  | { kind: 'watched'; add: boolean; push: WatchedPush }

/// Användarens egna ändringar till MDBList direkt (3 s-batch). Bara
/// `source: 'local'` — det Trakt eller vi själva skrev ner ska inte eka.
///
/// Senaste ändringen per titel vinner: ta bort + ångra inom 3 s blir EN
/// tillägg, inte tillägg följt av borttagning (som den periodiska diffen
/// sedan hade tolkat som "borttagen på MDBList" och raderat lokalt).
/// Borttagningar och avmarkeringar som inte når fram köas om — den periodiska
/// synken är additiv och hade annars ångrat användarens avmarkering.
export function startBridge(deps: BridgeDeps): () => void {
  const queue = new Map<string, Pending>()
  let timer: unknown = null
  let flushing = false

  const toRemote = (e: Entry): RemoteEntry => ({ tmdbId: e.tmdbId, imdbId: e.imdbId ?? null, title: e.title, posterUrl: null })
  const watchedKey = (p: WatchedPush) => (p.kind === 'episode' ? `e:${p.tmdbId}:${p.season}:${p.episode}` : `m:${p.tmdbId ?? p.imdbId}`)

  function arm(ms: number) {
    if (timer != null) deps.cancel(timer)
    timer = deps.schedule(() => { void flush() }, ms)
  }

  function enqueue(key: string, pending: Pending) {
    queue.set(key, pending)
    arm(FLUSH_MS)
  }

  async function flush() {
    timer = null
    if (flushing) { arm(FLUSH_MS); return }
    flushing = true
    const batch = new Map(queue)
    queue.clear()
    const retry: Array<[string, Pending]> = []
    const send = async (path: string, body: object, entries: Array<[string, Pending]>, what: string, critical: boolean) => {
      const result = await deps.api.call('POST', path, { body })
      if (result.ok) return
      if (critical) {
        deps.log(`brygga: ${what} misslyckades (${result.error}) — försöker igen`)
        retry.push(...entries)
      } else {
        deps.log(`brygga: ${what} misslyckades (${result.error}) — nästa synk tar det`)
      }
    }
    try {
      const pick = (kind: Pending['kind'], add: boolean) => [...batch].filter(([, p]) => p.kind === kind && p.add === add)
      for (const kind of ['show', 'movie'] as const) {
        for (const add of [true, false]) {
          const entries = pick(kind, add)
          if (entries.length === 0) continue
          const list = entries.map(([, p]) => (p as Extract<Pending, { kind: 'show' | 'movie' }>).entry)
          await send(add ? '/watchlist/items/add' : '/watchlist/items/remove', buildWatchlistPayload(list, kind), entries,
            `${kind === 'show' ? 'serier' : 'filmer'} ${add ? '+' : '-'}`, !add)
        }
      }
      for (const add of [true, false]) {
        const entries = pick('watched', add)
        if (entries.length === 0) continue
        const pushes = entries.map(([, p]) => (p as Extract<Pending, { kind: 'watched' }>).push)
        await send(add ? '/sync/watched' : '/sync/watched/remove', buildWatchedPayload(pushes), entries, `sedda ${add ? '+' : '-'}`, !add)
      }
    } finally {
      flushing = false
    }
    // En nyare ändring av samma titel som kom under sändningen vinner över omförsöket.
    for (const [key, pending] of retry) if (!queue.has(key)) queue.set(key, pending)
    if (queue.size > 0) {
      const wait = Math.max(retry.length > 0 ? RETRY_MS : FLUSH_MS, deps.api.pausedUntil() - deps.now())
      arm(wait)
    }
  }

  const offs = [
    deps.subscribe.onShow((m) => {
      if (!deps.isUserMutation(m.source) || !deps.prefs.isOn('watchlist')) return
      enqueue(`s:${m.entry.tmdbId}`, { kind: 'show', add: m.action === 'add', entry: toRemote(m.entry) })
    }),
    deps.subscribe.onMovie((m) => {
      if (!deps.isUserMutation(m.source) || !deps.prefs.isOn('watchlist')) return
      enqueue(`f:${m.entry.tmdbId}`, { kind: 'movie', add: m.action === 'add', entry: toRemote(m.entry) })
    }),
    deps.subscribe.onEpisodeWatched((m) => {
      if (!deps.isUserMutation(m.source) || !deps.prefs.isOn('watched')) return
      const push: WatchedPush = { kind: 'episode', tmdbId: m.tmdbId, season: m.season, episode: m.episode, watchedAt: m.watchedAt ?? new Date(deps.now()).toISOString() }
      enqueue(watchedKey(push), { kind: 'watched', add: m.watched, push })
    }),
    deps.subscribe.onMovieWatched((m) => {
      if (!deps.isUserMutation(m.source) || !deps.prefs.isOn('watched')) return
      const push: WatchedPush = { kind: 'movie', tmdbId: m.entry.tmdbId ?? null, imdbId: m.entry.imdbId ?? null, watchedAt: m.entry.watchedAt }
      enqueue(watchedKey(push), { kind: 'watched', add: m.action === 'add', push })
    }),
  ]

  return () => {
    if (timer != null) deps.cancel(timer)
    queue.clear()
    for (const off of offs) off()
  }
}
