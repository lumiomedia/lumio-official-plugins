'use client'

import { ensureEmbyDeviceId, type EmbyLibraryOption, type EmbySettings } from './emby-storage'

/**
 * Tunna anrop mot Embys REST-API, direkt från webviewn.
 *
 * Emby är Jellyfins ursprung och API:t är nästan detsamma, men två saker
 * skiljer och styr hela formen här:
 *
 * - Inloggningen läses inte ur `Authorization: MediaBrowser …` utan ur
 *   `X-Emby-*`. Emby tar samma fält som frågeparametrar (`X-Emby-Client`,
 *   `X-Emby-Device-Id`, `X-Emby-Token` …), och det är vad Embys egen
 *   webbklient gör.
 * - Vilka huvuden Emby tillåter i CORS är odokumenterat. Därför skickas INGA
 *   egna huvuden och inget JSON-Content-Type: GET utan huvuden och POST med
 *   formulärkropp är "enkla" anrop som aldrig förhandsfrågas (preflight).
 *   Servern behöver bara svara med Access-Control-Allow-Origin.
 *
 * Adresserna byggs mot `apiBase`, som vid anslutningen blev antingen
 * `<server>/emby` eller `<server>` — beroende på vilket som svarade.
 */

export interface EmbyMediaStream {
  Type: string
  Codec?: string
  Width?: number
  Height?: number
  Channels?: number
  Language?: string
  /** "SDR" / "HDR". */
  VideoRange?: string
  /** "None", "Hdr10", "Hdr10Plus", "HyperLogGamma", "DolbyVision". */
  ExtendedVideoType?: string
  DisplayTitle?: string
}

export interface EmbyItem {
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
  MediaSources?: Array<{
    Id: string
    Path?: string
    Container?: string
    Size?: number
    MediaStreams?: EmbyMediaStream[]
  }>
}

export interface EmbyItemsPage {
  Items: EmbyItem[]
  TotalRecordCount: number
  StartIndex?: number
}

type ApiTarget = Pick<EmbySettings, 'apiBase' | 'accessToken'>

/** Klientens identitet (och token) som frågeparametrar — se filhuvudet. */
function authParams(token: string | null): URLSearchParams {
  const params = new URLSearchParams({
    'X-Emby-Client': 'Lumio',
    'X-Emby-Device-Name': 'Lumio',
    'X-Emby-Device-Id': ensureEmbyDeviceId(),
    'X-Emby-Client-Version': '1.0.0',
  })
  if (token) params.set('X-Emby-Token', token)
  return params
}

function buildUrl(target: ApiTarget, path: string, query?: URLSearchParams): string {
  if (!target.apiBase) throw new Error('emby: no server')
  const params = authParams(target.accessToken)
  query?.forEach((value, key) => params.set(key, value))
  return `${target.apiBase}${path}?${params.toString()}`
}

async function request<T>(
  target: ApiTarget,
  path: string,
  init?: { query?: URLSearchParams; form?: Record<string, string>; timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), init?.timeoutMs ?? 20_000)
  try {
    const response = await fetch(buildUrl(target, path, init?.query), {
      method: init?.form ? 'POST' : 'GET',
      signal: controller.signal,
      // URLSearchParams som kropp ger application/x-www-form-urlencoded — ett
      // enkelt anrop utan preflight.
      body: init?.form ? new URLSearchParams(init.form) : undefined,
    })
    if (!response.ok) throw new Error(`emby: HTTP ${response.status} for ${path}`)
    const text = await response.text()
    return (text ? JSON.parse(text) : null) as T
  } finally {
    window.clearTimeout(timer)
  }
}

interface PublicSystemInfo {
  Id?: string
  ServerName?: string
  Version?: string
  ProductName?: string
}

/**
 * Hittar API-roten: `/emby` först (Embys egen sökväg, och den enda som
 * fungerar bakom många omvända proxys), sedan roten. En Jellyfin-server
 * svarar också här — den avvisas med ett eget fel så användaren hänvisas
 * till rätt plugin i stället för att få halvfungerande avvikelser.
 */
export async function discoverServer(serverUrl: string): Promise<{ apiBase: string; serverId: string; serverName: string }> {
  let lastError: unknown = null
  for (const apiBase of [`${serverUrl}/emby`, serverUrl]) {
    try {
      const info = await request<PublicSystemInfo>({ apiBase, accessToken: null }, '/System/Info/Public', { timeoutMs: 8_000 })
      if (!info?.Id) continue
      if (/jellyfin/i.test(info.ProductName ?? '')) throw new EmbyServerKindError('jellyfin')
      return { apiBase, serverId: info.Id, serverName: info.ServerName ?? 'Emby' }
    } catch (error) {
      if (error instanceof EmbyServerKindError) throw error
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('emby: server not found')
}

export class EmbyServerKindError extends Error {
  constructor(readonly kind: 'jellyfin') {
    super(`emby: this is a ${kind} server`)
  }
}

export async function authenticate(serverUrl: string, username: string, password: string): Promise<{ apiBase: string; accessToken: string; userId: string; userName: string; serverId: string; serverName: string }> {
  const server = await discoverServer(serverUrl)
  const auth = await request<{ AccessToken: string; User: { Id: string; Name: string } }>(
    { apiBase: server.apiBase, accessToken: null },
    '/Users/AuthenticateByName',
    { form: { Username: username, Pw: password }, timeoutMs: 12_000 },
  )
  return { apiBase: server.apiBase, accessToken: auth.AccessToken, userId: auth.User.Id, userName: auth.User.Name, serverId: server.serverId, serverName: server.serverName }
}

export async function fetchViews(settings: EmbySettings): Promise<EmbyLibraryOption[]> {
  const data = await request<{ Items: Array<{ Id: string; Name: string; CollectionType?: string }> }>(settings, `/Users/${settings.userId}/Views`)
  return (data.Items ?? [])
    .filter((view) => view.CollectionType === 'movies' || view.CollectionType === 'tvshows')
    .map((view) => ({ id: view.Id, name: view.Name, type: view.CollectionType as 'movies' | 'tvshows' }))
}

export const ITEM_FIELDS = 'ProviderIds,Genres,Overview,CommunityRating,RunTimeTicks,DateCreated,PremiereDate,MediaSources,MediaStreams,Path,ProductionYear,BackdropImageTags'

export async function fetchLibraryItems(
  settings: EmbySettings,
  library: EmbyLibraryOption,
  startIndex: number,
  limit: number,
  minDateLastSaved: string | null,
): Promise<EmbyItemsPage> {
  const query = new URLSearchParams({
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
  if (minDateLastSaved) query.set('MinDateLastSaved', minDateLastSaved)
  return request<EmbyItemsPage>(settings, `/Users/${settings.userId}/Items`, { query, timeoutMs: 40_000 })
}

/**
 * Avsnitt som ändrats sedan `minDateLastSaved`, för deltaskanningen: ett nytt
 * avsnitt i en befintlig serie sparar inte om serien (samma arv som i
 * Jellyfin), så seriefrågan ensam missar det. Avsnittens SeriesId pekar ut
 * vilka serier som måste läsas om.
 */
export async function fetchChangedEpisodes(
  settings: EmbySettings,
  library: EmbyLibraryOption,
  startIndex: number,
  limit: number,
  minDateLastSaved: string,
): Promise<EmbyItemsPage> {
  const query = new URLSearchParams({
    ParentId: library.id,
    IncludeItemTypes: 'Episode',
    Recursive: 'true',
    Fields: 'SeriesId',
    StartIndex: String(startIndex),
    Limit: String(limit),
    MinDateLastSaved: minDateLastSaved,
  })
  return request<EmbyItemsPage>(settings, `/Users/${settings.userId}/Items`, { query, timeoutMs: 40_000 })
}

/** Serier per id, i samma form som bibliotekslistningen (för omläsning efter avsnittsändringar). */
export async function fetchSeriesByIds(settings: EmbySettings, ids: string[]): Promise<EmbyItem[]> {
  if (ids.length === 0) return []
  const query = new URLSearchParams({
    Ids: ids.join(','),
    IncludeItemTypes: 'Series',
    Fields: ITEM_FIELDS,
    EnableUserData: 'true',
  })
  const page = await request<EmbyItemsPage>(settings, `/Users/${settings.userId}/Items`, { query, timeoutMs: 40_000 })
  return page.Items ?? []
}

export async function fetchEpisodes(settings: EmbySettings, seriesId: string): Promise<EmbyItem[]> {
  const query = new URLSearchParams({
    UserId: settings.userId ?? '',
    Fields: ITEM_FIELDS,
    EnableUserData: 'true',
  })
  const data = await request<{ Items: EmbyItem[] }>(settings, `/Shows/${seriesId}/Episodes`, { query, timeoutMs: 40_000 })
  return data.Items ?? []
}

export function imageUrl(settings: ApiTarget, itemId: string, kind: 'Primary' | 'Backdrop', maxHeight: number): string | null {
  if (!settings.apiBase || !settings.accessToken) return null
  const path = kind === 'Backdrop' ? `/Items/${itemId}/Images/Backdrop/0` : `/Items/${itemId}/Images/Primary`
  return `${settings.apiBase}${path}?maxHeight=${maxHeight}&quality=90&api_key=${encodeURIComponent(settings.accessToken)}`
}

/**
 * Direktströmmen. Filändelsen följer med i sökvägen (`stream.mkv`) eftersom
 * media3 på Android gissar containern på den; utan ändelse kan den gissa fel.
 * Embys `Container` kan vara en lista ("mov,mp4,m4a") — första ledet räcker.
 */
export function streamUrl(settings: ApiTarget, itemId: string, mediaSourceId: string, container: string | null): string | null {
  if (!settings.apiBase || !settings.accessToken) return null
  const ext = container?.split(',')[0]?.trim().toLowerCase()
  const file = ext && /^[a-z0-9]{2,5}$/.test(ext) ? `stream.${ext}` : 'stream'
  return `${settings.apiBase}/Videos/${itemId}/${file}?Static=true&MediaSourceId=${encodeURIComponent(mediaSourceId)}&api_key=${encodeURIComponent(settings.accessToken)}`
}

export async function reportPlaybackProgress(settings: EmbySettings, itemId: string, mediaSourceId: string, positionMs: number): Promise<void> {
  await request(settings, '/Sessions/Playing/Progress', {
    form: {
      ItemId: itemId,
      MediaSourceId: mediaSourceId,
      PositionTicks: String(Math.round(positionMs * 10_000)),
      IsPaused: 'false',
      PlayMethod: 'DirectPlay',
      EventName: 'TimeUpdate',
    },
    timeoutMs: 8_000,
  })
}

export async function markPlayed(settings: EmbySettings, itemId: string): Promise<void> {
  await request(settings, `/Users/${settings.userId}/PlayedItems/${itemId}`, { form: {}, timeoutMs: 8_000 })
}
