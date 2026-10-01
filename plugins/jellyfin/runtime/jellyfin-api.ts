'use client'

import { ensureJellyfinDeviceId, type JellyfinLibraryOption, type JellyfinSettings } from './jellyfin-storage'

/**
 * Tunna anrop mot Jellyfins REST-API. Servern svarar med CORS för alla
 * origins, så pluginet talar direkt med den från webviewn — ingen proxy.
 * Autentisering går i `Authorization: MediaBrowser …`-huvudet.
 */

export interface JellyfinItem {
  Id: string
  Name: string
  Type: 'Movie' | 'Series' | 'Episode' | string
  ServerId?: string
  ProductionYear?: number
  Overview?: string
  Genres?: string[]
  CommunityRating?: number
  RunTimeTicks?: number
  DateCreated?: string
  PremiereDate?: string
  ProviderIds?: Record<string, string>
  ImageTags?: Record<string, string>
  BackdropImageTags?: string[]
  ParentIndexNumber?: number
  IndexNumber?: number
  SeriesId?: string
  UserData?: { PlaybackPositionTicks?: number; LastPlayedDate?: string; Played?: boolean; PlayCount?: number }
  /** Trickplay-manifest: per mediakälla, per bredd. Finns när servern genererat scrubbningsbilder. */
  Trickplay?: Record<string, Record<string, { Width: number; Height: number; TileWidth: number; TileHeight: number; ThumbnailCount: number; Interval: number; Bandwidth?: number }>>
  MediaSources?: Array<{
    Id: string
    Path?: string
    Container?: string
    Size?: number
    MediaStreams?: Array<{ Type: string; Codec?: string; Width?: number; Height?: number; Channels?: number; Language?: string; VideoRangeType?: string; DisplayTitle?: string }>
  }>
}

export interface JellyfinItemsPage {
  Items: JellyfinItem[]
  TotalRecordCount: number
  StartIndex: number
}

export function authorizationHeader(token: string | null): string {
  const device = ensureJellyfinDeviceId()
  const base = `MediaBrowser Client="Lumio", Device="Lumio", DeviceId="${device}", Version="1.0.0"`
  return token ? `${base}, Token="${token}"` : base
}

/**
 * Försök per anrop, som i Emby-pluginet: på en stor server fällde ett enda
 * långsamt svar eller en tappad anslutning hela indexeringen ("signal is
 * aborted without reason", användarrapport 2026-10-01). Tidsgränser, nätfel
 * och 5xx får nya försök; 4xx avgörs direkt.
 */
const RETRY_DELAYS_MS = [1_500, 5_000]

class JellyfinTimeoutError extends Error {}

async function requestOnce<T>(settings: Pick<JellyfinSettings, 'serverUrl' | 'accessToken'>, path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  if (!settings.serverUrl) throw new Error('jellyfin: no server')
  const timeoutMs = init?.timeoutMs ?? 30_000
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${settings.serverUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authorizationHeader(settings.accessToken),
        ...(init?.headers ?? {}),
      },
    })
    if (!response.ok) {
      const error = new Error(`jellyfin: HTTP ${response.status} for ${path}`) as Error & { status?: number }
      error.status = response.status
      throw error
    }
    const text = await response.text()
    return (text ? JSON.parse(text) : null) as T
  } catch (err) {
    if (controller.signal.aborted) {
      throw new JellyfinTimeoutError(`Jellyfin did not answer within ${Math.round(timeoutMs / 1000)} s (${path.split('?')[0]})`)
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof JellyfinTimeoutError) return true
  if (err instanceof TypeError) return true // "Failed to fetch": nätet, inte servern
  const status = (err as { status?: number } | null)?.status
  return typeof status === 'number' && status >= 500
}

async function request<T>(settings: Pick<JellyfinSettings, 'serverUrl' | 'accessToken'>, path: string, init?: RequestInit & { timeoutMs?: number; noRetry?: boolean }): Promise<T> {
  // POST (inloggning, progress) görs en gång: ett nytt försök kan dubblera.
  // Serverupptäckten likaså: en felskriven adress ska svara fel direkt.
  const isWrite = Boolean(init?.method && init.method.toUpperCase() !== 'GET')
  const delays = isWrite || init?.noRetry ? [] : RETRY_DELAYS_MS
  const { noRetry: _noRetry, ...rest } = init ?? {}
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await requestOnce<T>(settings, path, rest)
    } catch (err) {
      if (attempt >= delays.length || !isRetryable(err)) throw err
      await new Promise((resolve) => window.setTimeout(resolve, delays[attempt]))
    }
  }
}

export async function authenticate(serverUrl: string, username: string, password: string): Promise<{ accessToken: string; userId: string; userName: string; serverId: string; serverName: string }> {
  const info = await request<{ Id: string; ServerName: string }>({ serverUrl, accessToken: null }, '/System/Info/Public', { timeoutMs: 8_000, noRetry: true })
  const auth = await request<{ AccessToken: string; User: { Id: string; Name: string } }>(
    { serverUrl, accessToken: null },
    '/Users/AuthenticateByName',
    { method: 'POST', body: JSON.stringify({ Username: username, Pw: password }), timeoutMs: 12_000 },
  )
  return { accessToken: auth.AccessToken, userId: auth.User.Id, userName: auth.User.Name, serverId: info.Id, serverName: info.ServerName }
}

export async function fetchViews(settings: JellyfinSettings): Promise<JellyfinLibraryOption[]> {
  const data = await request<{ Items: Array<{ Id: string; Name: string; CollectionType?: string }> }>(settings, `/Users/${settings.userId}/Views`)
  return (data.Items ?? [])
    .filter((view) => view.CollectionType === 'movies' || view.CollectionType === 'tvshows')
    .map((view) => ({ id: view.Id, name: view.Name, type: view.CollectionType as 'movies' | 'tvshows' }))
}

export const ITEM_FIELDS = 'ProviderIds,Genres,Overview,CommunityRating,RunTimeTicks,DateCreated,PremiereDate,MediaSources,Path,ProductionYear,BackdropImageTags,Trickplay'

export async function fetchLibraryItems(
  settings: JellyfinSettings,
  library: JellyfinLibraryOption,
  startIndex: number,
  limit: number,
  minDateLastSaved: string | null,
): Promise<JellyfinItemsPage> {
  const params = new URLSearchParams({
    ParentId: library.id,
    IncludeItemTypes: library.type === 'movies' ? 'Movie' : 'Series',
    Recursive: 'true',
    Fields: ITEM_FIELDS,
    SortBy: 'SortName',
    SortOrder: 'Ascending',
    StartIndex: String(startIndex),
    Limit: String(limit),
    EnableUserData: 'true',
  })
  if (minDateLastSaved) params.set('MinDateLastSaved', minDateLastSaved)
  return request<JellyfinItemsPage>(settings, `/Users/${settings.userId}/Items?${params.toString()}`, { timeoutMs: 90_000 })
}

/**
 * Avsnitt som ändrats sedan `minDateLastSaved`, för deltaskanningen.
 *
 * Ett nytt avsnitt i en BEFINTLIG serie ändrar inte seriens DateLastSaved, så
 * en delta som bara frågar efter serier såg det aldrig — serien stod kvar
 * utan avsnittet tills dygnets fullskanning (Jerry 2026-09-06, Reacher S01E04
 * indexerad som serie med noll avsnitt). Avsnittens SeriesId pekar ut vilka
 * serier som måste läsas om.
 */
export async function fetchChangedEpisodes(
  settings: JellyfinSettings,
  library: JellyfinLibraryOption,
  startIndex: number,
  limit: number,
  minDateLastSaved: string,
): Promise<JellyfinItemsPage> {
  const params = new URLSearchParams({
    ParentId: library.id,
    IncludeItemTypes: 'Episode',
    Recursive: 'true',
    Fields: 'SeriesId',
    StartIndex: String(startIndex),
    Limit: String(limit),
    MinDateLastSaved: minDateLastSaved,
  })
  return request<JellyfinItemsPage>(settings, `/Users/${settings.userId}/Items?${params.toString()}`, { timeoutMs: 90_000 })
}

/** Serier per id, i samma form som bibliotekslistningen (för omläsning efter avsnittsändringar). */
export async function fetchSeriesByIds(settings: JellyfinSettings, ids: string[]): Promise<JellyfinItem[]> {
  if (ids.length === 0) return []
  const params = new URLSearchParams({
    Ids: ids.join(','),
    IncludeItemTypes: 'Series',
    Fields: ITEM_FIELDS,
    EnableUserData: 'true',
  })
  const page = await request<JellyfinItemsPage>(settings, `/Users/${settings.userId}/Items?${params.toString()}`, { timeoutMs: 90_000 })
  return page.Items ?? []
}

export async function fetchEpisodes(settings: JellyfinSettings, seriesId: string): Promise<JellyfinItem[]> {
  const params = new URLSearchParams({
    UserId: settings.userId ?? '',
    Fields: ITEM_FIELDS,
    EnableUserData: 'true',
  })
  const data = await request<{ Items: JellyfinItem[] }>(settings, `/Shows/${seriesId}/Episodes?${params.toString()}`, { timeoutMs: 90_000 })
  return data.Items ?? []
}

export function imageUrl(settings: Pick<JellyfinSettings, 'serverUrl' | 'accessToken'>, itemId: string, kind: 'Primary' | 'Backdrop', maxHeight: number): string | null {
  if (!settings.serverUrl || !settings.accessToken) return null
  const path = kind === 'Backdrop' ? `/Items/${itemId}/Images/Backdrop/0` : `/Items/${itemId}/Images/Primary`
  return `${settings.serverUrl}${path}?maxHeight=${maxHeight}&quality=90&api_key=${encodeURIComponent(settings.accessToken)}`
}

/**
 * Trickplay-rutnätsbild: `/Videos/{itemId}/Trickplay/{width}/{index}.jpg`.
 * Returnerar en mall med `{index}` som kärnans spelare byter ut per bild.
 */
export function trickplayUrlTemplate(settings: Pick<JellyfinSettings, 'serverUrl' | 'accessToken'>, itemId: string, mediaSourceId: string, width: number): string | null {
  if (!settings.serverUrl || !settings.accessToken) return null
  return `${settings.serverUrl}/Videos/${itemId}/Trickplay/${width}/{index}.jpg?mediaSourceId=${encodeURIComponent(mediaSourceId)}&api_key=${encodeURIComponent(settings.accessToken)}`
}

export function streamUrl(settings: Pick<JellyfinSettings, 'serverUrl' | 'accessToken'>, itemId: string, mediaSourceId: string): string | null {
  if (!settings.serverUrl || !settings.accessToken) return null
  return `${settings.serverUrl}/Videos/${itemId}/stream?static=true&MediaSourceId=${encodeURIComponent(mediaSourceId)}&api_key=${encodeURIComponent(settings.accessToken)}`
}

export async function reportPlaybackProgress(settings: JellyfinSettings, itemId: string, mediaSourceId: string, positionMs: number): Promise<void> {
  await request(settings, '/Sessions/Playing/Progress', {
    method: 'POST',
    body: JSON.stringify({ ItemId: itemId, MediaSourceId: mediaSourceId, PositionTicks: Math.round(positionMs * 10_000), IsPaused: false, PlayMethod: 'DirectPlay' }),
    timeoutMs: 8_000,
  })
}

export async function markPlayed(settings: JellyfinSettings, itemId: string): Promise<void> {
  await request(settings, `/Users/${settings.userId}/PlayedItems/${itemId}`, { method: 'POST', timeoutMs: 8_000 })
}
