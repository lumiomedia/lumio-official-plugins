/** SIMKL:s id-objekt. Tal och strängar godtas i anrop; svar har strängar (utom simkl). */
export interface SimklIds {
  tmdb?: number
  imdb?: string
}

/** Samma form som värdens TrackerScrobbleEvent — speglad så att testerna slipper SDK:n. */
export interface ScrobbleEvent {
  action: 'start' | 'pause' | 'stop'
  mediaType: 'movie' | 'episode'
  tmdbId: string | null
  imdbId: string | null
  season: number | null
  episode: number | null
  progress: number
  /** Spelarens periodiska puls — ingen användarhandling. SIMKL vill inte ha dem. */
  pulse?: boolean
}

/** En post på fjärrsidan av en watchlist (samma form som värdens RemoteEntry). */
export interface RemoteEntry {
  tmdbId: string
  imdbId: string | null
  title: string
  posterUrl: string | null
}

export interface LocalEntry {
  tmdbId: string
  imdbId?: string | null
  title: string
  posterUrl?: string | null
}

export interface RemoteWatched {
  episodes: Array<{ tmdbId: string; season: number; episode: number; watchedAt: string | null }>
  movies: Array<{ tmdbId: string | null; imdbId: string | null; watchedAt: string | null }>
}
