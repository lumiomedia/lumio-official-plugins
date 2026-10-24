// Pausade positioner (Fortsätt titta) från tjänstens /sync/playback in i appen.
//
// Pluginen skickade bara positioner uppåt (scrobble) och läste dem aldrig
// tillbaka, så det man pausat i en annan app syntes inte i Lumio ("I can't see
// my mdblist or Simkl continue watching", 2026-10-24). MDBList och SIMKL har
// Trakts /sync/playback; raderna normaliseras här till Trakts form och lämnas
// till värden (importPlaybackPositions i plugin-sdk), som lägger in dem med
// samma regler som Trakts import. Värdar före 0.1.636 saknar mottagaren: då
// görs inte ens anropet mot tjänsten.

type Ids = { tmdb?: number | string | null; imdb?: string | null }
type Obj = Record<string, unknown>

export interface PlaybackRow {
  id: number | null
  progress: number | null
  paused_at: string | null
  type: 'movie' | 'episode'
  movie?: { title?: string | null; year?: number | null; runtime?: number | null; ids?: Ids | null } | null
  show?: { title?: string | null; year?: number | null; runtime?: number | null; ids?: Ids | null } | null
  episode?: { season?: number | null; number?: number | null; runtime?: number | null } | null
}

const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null)
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const ids = (v: unknown): Ids | null => {
  const o = obj(v)
  if (!o) return null
  return { tmdb: num(o.tmdb) ?? null, imdb: str(o.imdb) }
}

/** Svaret som lista, eller som hinkar (playback/movies/episodes/shows). */
export function playbackRows(payload: unknown): Obj[] {
  if (Array.isArray(payload)) return payload.map(obj).filter((r): r is Obj => r !== null)
  const o = obj(payload)
  if (!o) return []
  const out: Obj[] = []
  for (const key of ['playback', 'items', 'movies', 'episodes', 'shows', 'tv_shows']) {
    const bucket = o[key]
    if (Array.isArray(bucket)) out.push(...bucket.map(obj).filter((r): r is Obj => r !== null))
  }
  return out
}

/** En rad i Trakts form, eller null (anime utan TMDb-id, saknad procent). */
export function normalizePlaybackRow(row: Obj): PlaybackRow | null {
  const progress = num(row.progress)
  if (progress == null) return null
  const movie = obj(row.movie)
  const pausedAt = str(row.paused_at) ?? str(row.watched_at) ?? str(row.progress_at)
  if (movie || row.type === 'movie') {
    const m = movie ?? row
    return {
      id: num(row.id), progress, paused_at: pausedAt, type: 'movie',
      movie: { title: str(m.title), year: num(m.year), runtime: num(m.runtime), ids: ids(m.ids) },
    }
  }
  const show = obj(row.show)
  if (!show) return null
  const episode = obj(row.episode) ?? {}
  return {
    id: num(row.id), progress, paused_at: pausedAt, type: 'episode',
    show: { title: str(show.title), year: num(show.year), runtime: num(show.runtime), ids: ids(show.ids) },
    episode: {
      season: num(episode.season) ?? num(row.season),
      number: num(episode.number) ?? num(episode.episode) ?? num(row.episode),
      runtime: num(episode.runtime),
    },
  }
}

export async function pullPlayback(deps: {
  enabled: boolean
  /** Värdens mottagare, eller null på en värd före 0.1.636. */
  importer: ((items: unknown[]) => Promise<{ applied: number }> | null) | null
  fetch(): Promise<{ ok: true; data: unknown } | { ok: false; error: string }>
  log(message: string): void
}): Promise<number> {
  if (!deps.enabled || !deps.importer) return 0
  const result = await deps.fetch()
  if (!result.ok) {
    deps.log(`fortsätt titta: hämtningen misslyckades (${result.error})`)
    return 0
  }
  const rows = playbackRows(result.data).map(normalizePlaybackRow).filter((r): r is PlaybackRow => r !== null)
  const pending = deps.importer(rows)
  if (!pending) return 0
  const { applied } = await pending
  deps.log(`fortsätt titta: ${rows.length} pausade hos tjänsten, ${applied} inlagda`)
  return applied
}
