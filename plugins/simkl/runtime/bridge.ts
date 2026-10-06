import type { Prefs } from '../../_shared/tracker-kit/prefs'
import type { SimklApi } from './api'
import { buildAddToListPayload, buildHistoryPayload, buildRemovePayload, type ListStatus, type WatchedPush } from './payloads'
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
  api: SimklApi
  prefs: Prefs
  isUserMutation(source: Source): boolean
  /** Har serien något lokalt sett avsnitt? Då är den "Tittar på", annars "Planerar". */
  isShowStarted(tmdbId: string): boolean
  /** Är filmen lokalt sedd? Då blir en borttagen film "Klar" i stället för att raderas. */
  isMovieWatched(tmdbId: string): boolean
  log(message: string): void
  now(): number
  schedule(fn: () => void, ms: number): unknown
  cancel(handle: unknown): void
}

const FLUSH_MS = 3_000
const RETRY_MS = 60_000

type Pending =
  | { kind: 'show' | 'movie'; add: boolean; entry: RemoteEntry }
  | { kind: 'watched'; add: boolean; push: WatchedPush }

type Send = { path: string; body: object; entries: Array<[string, Pending]>; what: string; critical: boolean }

/// Användarens egna ändringar till SIMKL direkt (3 s-batch, senaste ändringen
/// per titel vinner, borttagningar och avmarkeringar försöks igen). Bara
/// `source: 'local'`. Mappningen mot SIMKL:s statusar följer specen.
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

  /** Köns poster → SIMKL-anrop, grupperade per mål. */
  function plan(batch: Array<[string, Pending]>): Send[] {
    const lists = new Map<string, { kind: 'show' | 'movie'; to: ListStatus; entries: Array<[string, Pending]> }>()
    const movieRemovals: Array<[string, Pending]> = []
    const watched: Array<[string, Pending]> = []
    const unwatched: Array<[string, Pending]> = []
    for (const item of batch) {
      const [, p] = item
      if (p.kind === 'watched') { (p.add ? watched : unwatched).push(item); continue }
      let to: ListStatus
      if (p.kind === 'show') to = p.add ? (deps.isShowStarted(p.entry.tmdbId) ? 'watching' : 'plantowatch') : 'dropped'
      else if (p.add) to = 'plantowatch'
      else if (deps.isMovieWatched(p.entry.tmdbId)) to = 'completed'
      else { movieRemovals.push(item); continue }
      const groupKey = `${p.kind}:${to}`
      const group = lists.get(groupKey) ?? { kind: p.kind, to, entries: [] }
      group.entries.push(item)
      lists.set(groupKey, group)
    }
    const sends: Send[] = []
    for (const group of lists.values()) {
      const entries = group.entries.map(([, p]) => (p as Extract<Pending, { kind: 'show' | 'movie' }>).entry)
      sends.push({
        path: '/sync/add-to-list', body: buildAddToListPayload(entries, group.kind, group.to), entries: group.entries,
        what: `${group.kind === 'show' ? 'serier' : 'filmer'} → ${group.to}`, critical: group.to === 'dropped',
      })
    }
    if (movieRemovals.length) {
      const entries = movieRemovals.map(([, p]) => (p as Extract<Pending, { kind: 'show' | 'movie' }>).entry)
      sends.push({ path: '/sync/history/remove', body: buildRemovePayload(entries, 'movie'), entries: movieRemovals, what: 'filmer −', critical: true })
    }
    const pushes = (items: Array<[string, Pending]>) => items.map(([, p]) => (p as Extract<Pending, { kind: 'watched' }>).push)
    if (watched.length) sends.push({ path: '/sync/history', body: buildHistoryPayload(pushes(watched)), entries: watched, what: 'sedda +', critical: false })
    if (unwatched.length) sends.push({ path: '/sync/history/remove', body: buildHistoryPayload(pushes(unwatched)), entries: unwatched, what: 'sedda −', critical: true })
    return sends
  }

  async function flush() {
    timer = null
    if (flushing) { arm(FLUSH_MS); return }
    flushing = true
    const batch = [...queue]
    queue.clear()
    const retry: Array<[string, Pending]> = []
    try {
      for (const send of plan(batch)) {
        const result = await deps.api.call('POST', send.path, { body: send.body })
        if (result.ok) continue
        if (send.critical) {
          deps.log(`brygga: ${send.what} misslyckades (${result.error}) — försöker igen`)
          retry.push(...send.entries)
        } else {
          deps.log(`brygga: ${send.what} misslyckades (${result.error}) — nästa synk tar det`)
        }
      }
    } finally {
      flushing = false
    }
    for (const [key, pending] of retry) if (!queue.has(key)) queue.set(key, pending)
    if (queue.size > 0) arm(Math.max(retry.length > 0 ? RETRY_MS : FLUSH_MS, deps.api.pausedUntil() - deps.now()))
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
