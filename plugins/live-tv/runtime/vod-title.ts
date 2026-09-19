'use client'

/**
 * TMDB-uppgifterna bakom en bibliotekstitel.
 *
 * Appens egen detaljsida är 6 000 rader och bär rekommendationer, kommentarer,
 * trailers, strömväljare och mycket annat. Live TV:s bibliotek ska ha en egen,
 * mager vy INNE i Live TV (Jerry 2026-09-19) — bakgrundsbild, spelknapp, Min
 * lista, skådespelare. Den behöver alltså bara data, inte appens komponent.
 *
 * `/api/wiki` är samma endpoint appens detaljsida hämtar sin rollista ur, så
 * svaret är redan cachat i värden när användaren varit på titeln förut.
 */

export interface VodCastMember {
  id: number
  name: string
  character: string
  profileUrl: string | null
}

export interface VodTitleInfo {
  tmdbId: number | null
  imdbId: string | null
  title: string
  originalTitle: string | null
  tagline: string | null
  overview: string
  backdropUrl: string | null
  posterUrl: string | null
  year: number | null
  /** Minuter, film. Serier har `numberOfSeasons` i stället. */
  runtime: number | null
  numberOfSeasons: number | null
  genres: string[]
  directors: string[]
  voteAverage: number | null
  cast: VodCastMember[]
}

const CAST_LIMIT = 20

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : null
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

/**
 * Hämtar titelns uppgifter. Kastar aldrig — vyn ska kunna rita panelens egen
 * affisch och titel även när TMDB är nere, och en tom `VodTitleInfo` är ett
 * giltigt svar på "vi vet inget mer än det panelen sa".
 */
export async function fetchVodTitleInfo(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  signal?: AbortSignal,
): Promise<VodTitleInfo | null> {
  const params = new URLSearchParams({ type: mediaType, tmdbId: String(tmdbId), castLimit: String(CAST_LIMIT) })
  try {
    const res = await fetch(`/api/wiki?${params.toString()}`, signal ? { signal } : undefined)
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    return {
      tmdbId: asNumber(data.tmdbId),
      imdbId: typeof data.imdbId === 'string' ? data.imdbId : null,
      title: typeof data.title === 'string' ? data.title : '',
      originalTitle: typeof data.originalTitle === 'string' ? data.originalTitle : null,
      tagline: typeof data.tagline === 'string' && data.tagline ? data.tagline : null,
      overview: typeof data.overview === 'string' ? data.overview : '',
      backdropUrl: typeof data.backdropUrl === 'string' ? data.backdropUrl : null,
      posterUrl: typeof data.posterUrl === 'string' ? data.posterUrl : null,
      year: asNumber(data.year),
      runtime: asNumber(data.runtime),
      numberOfSeasons: asNumber(data.numberOfSeasons),
      genres: asStringList(data.genres),
      directors: asStringList(data.directors),
      voteAverage: asNumber(data.voteAverage),
      cast: Array.isArray(data.cast)
        ? data.cast
            .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
            .map((entry) => ({
              id: Number(entry.id ?? 0),
              name: String(entry.name ?? ''),
              character: String(entry.character ?? ''),
              profileUrl: typeof entry.profileUrl === 'string' ? entry.profileUrl : null,
            }))
            .filter((entry) => entry.name)
        : [],
    }
  } catch {
    // Avbruten hämtning eller nätfel — vyn klarar sig på panelens uppgifter.
    return null
  }
}

/** `102` → `1 h 42`. Null när speltiden saknas. */
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours} h ${rest}` : `${rest} min`
}

/**
 * Titelns logotyp (TMDB `images.logos`), samma som appens detaljsida ritar i
 * stället för en textrubrik. Saknas för många titlar — då är `null` svaret och
 * anroparen skriver titeln som text.
 */
export async function fetchTitleLogo(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(`/api/title-logo?tmdbId=${tmdbId}&type=${mediaType}`, signal ? { signal } : undefined)
    if (!res.ok) return null
    const data = (await res.json()) as { logoUrl?: unknown }
    return typeof data.logoUrl === 'string' && data.logoUrl ? data.logoUrl : null
  } catch {
    return null
  }
}
