'use client'

/**
 * Bibliotekets inställningar och bryggan till appens detaljvy.
 *
 * Titlarna själva ligger i värdens index (`vod-client`); här ligger bara det
 * som är användarens val — läget per spellista, sorteringen, vald kategori —
 * och översättningen från en panelrad till något appen kan öppna.
 */

import { onPluginStorageChanged, readPluginJson, requestOpenMediaItem, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'
import type { VodItem } from './vod-client'

/**
 * Vad spellistans film och serier får göra i Live TV.
 *
 * `link` (standard): kanallistan är ren, hubben visar en hänvisningsrad till
 * Biblioteket. `rows`: film och serier får en egen rad i hubben. `off`: inget
 * om VOD syns i Live TV alls — Biblioteket finns kvar i ikonraden.
 */
export type VodMode = 'link' | 'rows' | 'off'

export const VOD_MODE_DEFAULT: VodMode = 'link'
const VOD_MODE_KEY = 'vod_mode_v1'
const VOD_SORT_KEY = 'library_sort_v1'
const VOD_CATEGORY_KEY = 'library_category_v1'

export type VodSort = 'new' | 'az' | 'rating'
export const VOD_SORT_DEFAULT: VodSort = 'new'

function isVodMode(value: unknown): value is VodMode {
  return value === 'link' || value === 'rows' || value === 'off'
}

function readRecord(key: string): Record<string, string> {
  const parsed = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, key, {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out: Record<string, string> = {}
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'string') out[id] = value
  }
  return out
}

/* ---------- Läget per spellista ---------- */

/**
 * Nyckeln valet sparas under.
 *
 * `activePlaylistId` finns bara i TV-läge — på skrivbordet och telefonen är
 * den null, och då spänner Biblioteket alla spellistor. Det läget får en egen,
 * delad nyckel i stället för att valet tyst inte går att spara (vilket det
 * inte gjorde: `setVodMode` returnerade utan att skriva).
 */
const ALL_PLAYLISTS_KEY = '*'

function modeKey(playlistId: string | null): string {
  return playlistId || ALL_PLAYLISTS_KEY
}

export function getVodMode(playlistId: string | null): VodMode {
  const value = readRecord(VOD_MODE_KEY)[modeKey(playlistId)]
  return isVodMode(value) ? value : VOD_MODE_DEFAULT
}

export function setVodMode(playlistId: string | null, mode: VodMode): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, VOD_MODE_KEY, { ...readRecord(VOD_MODE_KEY), [modeKey(playlistId)]: mode })
}

export function onVodModeChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, VOD_MODE_KEY, listener)
}

/* ---------- Sortering och vald kategori ---------- */

export function getVodSort(): VodSort {
  const raw = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, VOD_SORT_KEY, VOD_SORT_DEFAULT)
  return raw === 'az' || raw === 'rating' ? raw : VOD_SORT_DEFAULT
}

export function setVodSort(sort: VodSort): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, VOD_SORT_KEY, sort)
}

/**
 * Vald kategori PER SPELLISTA. En delad nyckel hade pekat på en kategori som
 * inte finns i nästa panel, och rutnätet hade öppnat sig tomt.
 */
export function getVodCategory(playlistId: string | null): string | null {
  return readRecord(VOD_CATEGORY_KEY)[modeKey(playlistId)] ?? null
}

export function setVodCategory(playlistId: string | null, categoryId: string): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, VOD_CATEGORY_KEY, {
    ...readRecord(VOD_CATEGORY_KEY),
    [modeKey(playlistId)]: categoryId,
  })
}

/* ---------- Bryggan till appen ---------- */

/**
 * Titelns id i appens värld: `movie-<tmdb>` / `tv-<tmdb>`.
 *
 * Det är DEN strängen som gör att appens vanliga detaljvy tar över med full
 * TMDB-data — samma form som biblioteksläget bygger i
 * `libraryTitleToMediaItem`. Utan ett TMDB-id finns ingen sådan identitet, och
 * kortet får klara sig med panelens egen affisch.
 */
export function mediaItemIdFor(item: Pick<VodItem, 'kind' | 'tmdbId'>): string | null {
  if (item.tmdbId == null || !Number.isFinite(item.tmdbId) || item.tmdbId <= 0) return null
  return `${item.kind === 'series' ? 'tv' : 'movie'}-${item.tmdbId}`
}

/** Sant när titeln kan öppnas i appens detaljvy utan en TMDB-sökning först. */
export function canOpenDetails(item: Pick<VodItem, 'kind' | 'tmdbId'>): boolean {
  return mediaItemIdFor(item) != null
}

/**
 * Panelraden som ett `MediaItem` appen kan visa.
 *
 * Fälten som saknas fylls INTE på med gissningar: detaljvyn hämtar sitt eget
 * från TMDB så fort den har id:t, och en påhittad `overview` hade bara lyst
 * fram tills den riktiga kom. Panelens affisch följer med som första bild så
 * kortet inte blinkar tomt under hämtningen.
 */
export function vodItemToMediaItem(item: VodItem): Record<string, unknown> | null {
  const id = mediaItemIdFor(item)
  if (!id) return null
  return {
    id,
    title: item.title,
    type: item.kind === 'series' ? 'tv' : 'movie',
    year: item.year ?? null,
    imdbId: item.imdbId ?? null,
    posterUrl: item.posterUrl ?? null,
    backdropUrl: null,
    genres: [],
    keywords: [],
    providers: [],
    ratings: { imdb: item.rating != null ? item.rating.toFixed(1) : null, metacritic: null, rottenTomatoes: null },
    overview: '',
    originalLanguage: null,
    source: 'tmdb',
    runtimeMinutes: null,
  }
}

/**
 * Öppnar titeln i appens detaljvy. Returnerar false när den inte går att
 * öppna (inget TMDB-id) — anroparen får då visa panelens egen information i
 * stället för att inte göra någonting alls när man trycker OK.
 */
export function openVodItem(item: VodItem, opts?: { autoPlay?: boolean }): boolean {
  const media = vodItemToMediaItem(item)
  if (!media) return false
  requestOpenMediaItem({
    item: media as never,
    source: 'live-tv-library',
    ...(opts?.autoPlay ? { autoPlay: true } : {}),
  })
  return true
}
