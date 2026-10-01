'use client'

import { describeError, logEmby } from './emby-log'
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

/**
 * Försök per anrop. En stor server (80 000 titlar, användarrapport
 * 2026-10-01) svarar ibland långsamt eller tappar en anslutning mitt i en
 * skanning, och ett enda sådant svar fällde hela indexeringen med "signal is
 * aborted without reason". Tidsgränser, nätfel och 5xx får nya försök; 4xx
 * (fel token, borttaget objekt) avgörs direkt.
 */
const RETRY_DELAYS_MS = [1_500, 5_000]

class EmbyTimeoutError extends Error {}

async function requestOnce<T>(
  target: ApiTarget,
  path: string,
  init?: { query?: URLSearchParams; form?: Record<string, string>; timeoutMs?: number },
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 30_000
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(buildUrl(target, path, init?.query), {
      method: init?.form ? 'POST' : 'GET',
      signal: controller.signal,
      // URLSearchParams som kropp ger application/x-www-form-urlencoded — ett
      // enkelt anrop utan preflight.
      body: init?.form ? new URLSearchParams(init.form) : undefined,
    })
    if (!response.ok) {
      const error = new Error(`emby: HTTP ${response.status} for ${path}`) as Error & { status?: number }
      error.status = response.status
      throw error
    }
    const text = await response.text()
    return (text ? JSON.parse(text) : null) as T
  } catch (err) {
    if (controller.signal.aborted) {
      throw new EmbyTimeoutError(`Emby did not answer within ${Math.round(timeoutMs / 1000)} s (${path})`)
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof EmbyTimeoutError) return true
  if (err instanceof TypeError) return true // "Failed to fetch": nätet, inte servern
  const status = (err as { status?: number } | null)?.status
  return typeof status === 'number' && status >= 500
}

async function request<T>(
  target: ApiTarget,
  path: string,
  init?: { query?: URLSearchParams; form?: Record<string, string>; timeoutMs?: number; noRetry?: boolean },
): Promise<T> {
  // POST (inloggning, progress) görs en gång: ett nytt försök kan dubblera.
  // Serverupptäckten likaså: en felskriven adress ska svara fel direkt.
  const delays = init?.form || init?.noRetry ? [] : RETRY_DELAYS_MS
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await requestOnce<T>(target, path, init)
    } catch (err) {
      if (attempt >= delays.length || !isRetryable(err)) {
        throw delays.length > 0 ? withAttempts(err, path, attempt + 1) : err
      }
      logEmby(`retry ${attempt + 1}/${delays.length} ${logPath(target, path)}: ${describeError(err)}`)
      await new Promise((resolve) => window.setTimeout(resolve, delays[attempt]))
    }
  }
}

/** Sökvägen utan användar-id, för loggen. Frågedelen (med token) följer aldrig med. */
function logPath(target: ApiTarget, path: string): string {
  const userId = (target as { userId?: string | null }).userId
  return userId ? path.replace(userId, '{user}') : path
}

/**
 * Nätfelet säger annars bara "Failed to fetch". Det betyder att svaret aldrig
 * nådde webviewn: nätet föll, eller en proxy framför Emby svarade 502/504
 * utan CORS-huvud så webbläsaren inte fick läsa det. Status och statusfält
 * följer med så återförsöksreglerna gäller även för det inslagna felet.
 */
function withAttempts(err: unknown, path: string, attempts: number): Error {
  const status = (err as { status?: number } | null)?.status
  const shortPath = path.replace(/\/Users\/[^/]+/, '/Users/{user}')
  const reason = err instanceof TypeError ? `no answer from Emby (${err.message}) for ${shortPath}` : describeError(err).replace(path, shortPath)
  const wrapped = new Error(`${reason}, ${attempts} ${attempts === 1 ? 'try' : 'tries'}`) as Error & { status?: number; network?: boolean }
  if (typeof status === 'number') wrapped.status = status
  if (err instanceof TypeError || err instanceof EmbyTimeoutError) wrapped.network = true
  return wrapped
}

/** Sant för fel som en mindre sida kan komma förbi: tidsgräns, nätfel, 5xx. */
export function isTransientEmbyError(err: unknown): boolean {
  if (isRetryable(err)) return true
  return Boolean((err as { network?: boolean } | null)?.network)
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
      const info = await request<PublicSystemInfo>({ apiBase, accessToken: null }, '/System/Info/Public', { timeoutMs: 8_000, noRetry: true })
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
  return request<EmbyItemsPage>(settings, `/Users/${settings.userId}/Items`, { query, timeoutMs: 90_000 })
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
  return request<EmbyItemsPage>(settings, `/Users/${settings.userId}/Items`, { query, timeoutMs: 90_000 })
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
  const page = await request<EmbyItemsPage>(settings, `/Users/${settings.userId}/Items`, { query, timeoutMs: 90_000 })
  return page.Items ?? []
}

/**
 * Avsnitten i sidor om EPISODE_PAGE. En dagsserie med tusentals avsnitt och
 * alla mediaströmmar i ett enda svar tar längre tid än många proxys framför
 * Emby väntar (60–100 s) — proxyn svarar då 504 utan CORS-huvud och webviewn
 * ser bara "Failed to fetch", lika på varje nytt försök.
 */
const EPISODE_PAGE = 300

export async function fetchEpisodes(settings: EmbySettings, seriesId: string): Promise<EmbyItem[]> {
  const all: EmbyItem[] = []
  for (let startIndex = 0; ; ) {
    const query = new URLSearchParams({
      UserId: settings.userId ?? '',
      Fields: ITEM_FIELDS,
      EnableUserData: 'true',
      StartIndex: String(startIndex),
      Limit: String(EPISODE_PAGE),
    })
    const data = await request<EmbyItemsPage>(settings, `/Shows/${seriesId}/Episodes`, { query, timeoutMs: 90_000 })
    const items = data.Items ?? []
    all.push(...items)
    startIndex += items.length
    // Äldre servrar utan TotalRecordCount: en kort sida är den sista.
    const total = typeof data.TotalRecordCount === 'number' ? data.TotalRecordCount : null
    if (items.length === 0 || (total !== null ? startIndex >= total : items.length < EPISODE_PAGE)) break
  }
  return all
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

/**
 * Positionen tillbaka till Emby. `PlaySessionId` är obligatoriskt i Emby 4.10:
 * utan det svarar servern 400 "Value cannot be null. (Parameter 'key')" och
 * sparar ingenting. Med det sparar Progress-anropet positionen direkt — inget
 * `/Sessions/Playing`-startanrop behövs (det räknar dessutom upp PlayCount).
 */
export async function reportPlaybackProgress(settings: EmbySettings, itemId: string, mediaSourceId: string, playSessionId: string, positionMs: number): Promise<void> {
  await request(settings, '/Sessions/Playing/Progress', {
    form: {
      ItemId: itemId,
      MediaSourceId: mediaSourceId,
      PlaySessionId: playSessionId,
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
