'use client'

import {
  clearPluginMemoryCache,
  clearPluginMemoryCacheByPrefix,
  getPluginHttpAssetUrl,
  getPluginMemoryCache,
  isPluginImageLoaded,
  onPluginStorageChanged,
  preloadPluginImage,
  readPluginJson,
  removePluginStorageByPrefix,
  setPluginMemoryCache,
  writePluginJson,
} from '@/lib/plugin-sdk'

export interface M3uChannel {
  name: string
  logo?: string | null
  group: string
  url: string
  tvgId: string | null
}

export const LIVE_TV_PLUGIN_ID = 'com.lumio.live-tv'
export const LIVE_TV_GLOBAL_EPG_ID = 'global'
const M3U_URLS_KEY = 'm3u_urls'
const M3U_DRAFT_URLS_KEY = 'm3u_urls_draft'
const LIVE_TV_LISTS_KEY = 'lists'
const LIVE_TV_PINS_KEY = 'pins'
const LIVE_TV_CHANNELS_PREFIX = 'channels:'
const LIVE_TV_LOGO_BUCKET = 'com.lumio.live-tv:logo'

export interface LiveTvList {
  id: string
  name: string
  channels: M3uChannel[]
  createdAt: string
  urlTvg: string | null
  epgUrls: string[]
  /**
   * Stänger av den AUTO-härledda EPG-källan (url-tvg ur spellistan, eller
   * xmltv.php som servern härleder ur en Xtream-inloggning). Egen flagga och
   * inte "nolla urlTvg": upsertLiveTvListFromFetch skriver över urlTvg vid
   * VARJE ny M3U-hämtning, så ett nollat värde hade kommit tillbaka. Med en
   * flagga blir valet kvar, och källan kan slås på igen — den är härledd, så
   * att radera den vore inte återställbart.
   */
  autoEpgDisabled: boolean
}

function sanitizeChannels(channels: unknown[]): M3uChannel[] {
  return channels
    .filter((channel): channel is Record<string, unknown> => Boolean(channel) && typeof channel === 'object')
    .map((channel) => ({
      name: String(channel.name ?? 'Unknown').trim() || 'Unknown',
      logo: typeof channel.logo === 'string' && channel.logo.trim().length > 0 ? channel.logo.trim() : null,
      group: String(channel.group ?? 'Other').trim() || 'Other',
      url: String(channel.url ?? '').trim(),
      tvgId: typeof channel.tvgId === 'string' && channel.tvgId.trim().length > 0 ? channel.tvgId.trim() : null,
    }))
    .filter((channel) => channel.url.length > 0)
}

function sanitizeEpgUrls(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

function sanitizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

function channelKey(channel: Pick<M3uChannel, 'name' | 'url'>): string {
  return `${String(channel.name ?? '').trim()}::${String(channel.url ?? '').trim()}`
}

function writeLists(lists: LiveTvList[]): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, LIVE_TV_LISTS_KEY, lists)
}

function readLists(): LiveTvList[] {
  const parsed = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, LIVE_TV_LISTS_KEY, [])
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id ?? ''),
      name: String(entry.name ?? '').trim(),
      createdAt: String(entry.createdAt ?? ''),
      channels: sanitizeChannels(Array.isArray(entry.channels) ? entry.channels : []),
      urlTvg: typeof entry.urlTvg === 'string' && entry.urlTvg.trim().length > 0 ? entry.urlTvg.trim() : null,
      epgUrls: sanitizeEpgUrls(entry.epgUrls),
      autoEpgDisabled: entry.autoEpgDisabled === true,
    }))
    .filter((entry) => entry.id.length > 0 && entry.name.length > 0)
}

function dedupeChannels(channels: M3uChannel[]): M3uChannel[] {
  const seen = new Set<string>()
  const unique: M3uChannel[] = []
  for (const channel of channels) {
    const key = channelKey(channel)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(channel)
  }
  return unique
}

export function getLiveTvLogoSrc(logo: string | null | undefined): string | null {
  return getPluginHttpAssetUrl('/api/m3u-logo', logo)
}

export function isLiveTvLogoLoaded(src: string | null | undefined): boolean {
  return typeof src === 'string' && src.length > 0
    ? isPluginImageLoaded(LIVE_TV_LOGO_BUCKET, src)
    : false
}

export async function preloadLiveTvLogo(src: string): Promise<boolean> {
  return preloadPluginImage(LIVE_TV_LOGO_BUCKET, src)
}

export function getM3uUrls(): string[] {
  return sanitizeStringArray(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, M3U_URLS_KEY, []))
}

export function getM3uDraftUrls(): string[] {
  const draftUrls = sanitizeStringArray(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, M3U_DRAFT_URLS_KEY, []))
  return draftUrls.length > 0 ? draftUrls : getM3uUrls()
}

export function onM3uUrlsChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, M3U_URLS_KEY, listener)
}

export function setM3uDraftUrls(urls: string[]): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, M3U_DRAFT_URLS_KEY, urls.filter(Boolean))
}

export function applyM3uUrls(urls: string[]): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, M3U_URLS_KEY, urls.filter(Boolean))
  setM3uDraftUrls(urls)
}

export function getLiveTvUrlsKey(urls: string[]): string {
  return urls.join('|')
}

function getLiveTvChannelsStorageKey(urlsKey: string): string {
  return `${LIVE_TV_CHANNELS_PREFIX}${urlsKey}`
}

export function getLiveTvMemoryCache(urlsKey: string): { channels: M3uChannel[]; ts: number } | undefined {
  return getPluginMemoryCache<{ channels: M3uChannel[]; ts: number }>(
    LIVE_TV_PLUGIN_ID,
    getLiveTvChannelsStorageKey(urlsKey),
  )
}

export function setLiveTvMemoryCache(urlsKey: string, channels: M3uChannel[]): void {
  setPluginMemoryCache(LIVE_TV_PLUGIN_ID, getLiveTvChannelsStorageKey(urlsKey), {
    channels,
    ts: Date.now(),
  })
}

export function readStoredLiveTvChannels(urlsKey: string): M3uChannel[] {
  if (!urlsKey) return []
  const parsed = readPluginJson<{ channels?: unknown[] } | unknown>(
    LIVE_TV_PLUGIN_ID,
    getLiveTvChannelsStorageKey(urlsKey),
    { channels: [] },
  )
  return sanitizeChannels((parsed as { channels?: unknown[] })?.channels ?? [])
}

export function storeLiveTvChannels(urlsKey: string, channels: M3uChannel[]): void {
  if (!urlsKey) return
  writePluginJson(LIVE_TV_PLUGIN_ID, getLiveTvChannelsStorageKey(urlsKey), { channels })
}

export function clearLiveTvMemoryCache(urlsKey?: string): void {
  if (!urlsKey) {
    clearPluginMemoryCacheByPrefix(LIVE_TV_PLUGIN_ID, LIVE_TV_CHANNELS_PREFIX)
    return
  }
  clearPluginMemoryCache(LIVE_TV_PLUGIN_ID, getLiveTvChannelsStorageKey(urlsKey))
}

export function clearStoredLiveTvChannels(urlsKey?: string): void {
  if (!urlsKey) {
    removePluginStorageByPrefix(LIVE_TV_PLUGIN_ID, LIVE_TV_CHANNELS_PREFIX)
    return
  }
  removePluginStorageByPrefix(LIVE_TV_PLUGIN_ID, getLiveTvChannelsStorageKey(urlsKey))
}

export function getLiveTvLists(): LiveTvList[] {
  return readLists()
}

export function getAllLiveTvEpgUrls(lists = readLists()): string[] {
  const urls = new Set<string>()
  for (const list of lists) {
    if (list.urlTvg && !list.autoEpgDisabled) urls.add(list.urlTvg)
    for (const url of list.epgUrls) urls.add(url)
  }
  return [...urls]
}

export function onLiveTvListsChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, LIVE_TV_LISTS_KEY, listener)
}

export function createLiveTvList(name: string, options?: { urlTvg?: string | null; epgUrls?: string[] }): LiveTvList {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('List name is required')
  const next: LiveTvList = {
    id: crypto.randomUUID(),
    name: trimmed,
    channels: [],
    createdAt: new Date().toISOString(),
    urlTvg: typeof options?.urlTvg === 'string' && options.urlTvg.trim().length > 0 ? options.urlTvg.trim() : null,
    epgUrls: sanitizeEpgUrls(options?.epgUrls ?? []),
    autoEpgDisabled: false,
  }
  writeLists([...readLists(), next])
  return next
}

export function updateLiveTvListEpg(
  listId: string,
  patch: { urlTvg?: string | null; epgUrls?: string[]; autoEpgDisabled?: boolean },
): void {
  writeLists(
    readLists().map((list) => {
      if (list.id !== listId) return list
      return {
        ...list,
        urlTvg: patch.urlTvg !== undefined
          ? (typeof patch.urlTvg === 'string' && patch.urlTvg.trim().length > 0
            ? patch.urlTvg.trim()
            : null)
          : list.urlTvg,
        epgUrls: patch.epgUrls !== undefined ? sanitizeEpgUrls(patch.epgUrls) : list.epgUrls,
        autoEpgDisabled: patch.autoEpgDisabled !== undefined
          ? patch.autoEpgDisabled
          : list.autoEpgDisabled,
      }
    }),
  )
}

export function deleteLiveTvList(listId: string): void {
  writeLists(readLists().filter((list) => list.id !== listId))
}

function deriveListName(sourceUrl: string): string {
  try {
    const u = new URL(sourceUrl)
    return u.hostname || sourceUrl
  } catch {
    return sourceUrl
  }
}

export function upsertLiveTvListFromFetch(
  sourceUrl: string,
  urlTvg: string | null,
  channels: M3uChannel[],
): LiveTvList {
  const trimmedSource = sourceUrl.trim()
  if (!trimmedSource) throw new Error('sourceUrl is required')
  const name = deriveListName(trimmedSource)
  const existing = readLists().find((list) => list.name === name)
  const cleanChannels = sanitizeChannels(channels)
  const cleanUrlTvg = typeof urlTvg === 'string' && urlTvg.trim().length > 0 ? urlTvg.trim() : null

  if (existing) {
    /*
     * EN HÄMTNING UTAN url-tvg FÅR INTE RADERA DEN SOM REDAN FINNS.
     *
     * Tidigare skrevs urlTvg över vid VARJE hämtning, också när svaret saknade
     * attributet. En spellista som ibland bär `url-tvg` och ibland inte — eller
     * en uppdatering mot en variant av samma källa — nollade då EPG-källan
     * tyst. Kanalerna blev kvar (de fanns i samma svar), så det såg ut som att
     * bara EPG:n försvann av sig själv, och kom tillbaka först vid nästa
     * hämtning som råkade ha attributet med.
     *
     * Att INTE nolla tar inte ifrån användaren kontrollen: `autoEpgDisabled` är
     * den uttryckliga vägen att stänga av den härledda källan, och den ligger
     * kvar orörd här.
     */
    const updated: LiveTvList = {
      ...existing,
      channels: cleanChannels,
      urlTvg: cleanUrlTvg ?? existing.urlTvg,
    }
    writeLists(readLists().map((list) => (list.id === existing.id ? updated : list)))
    return updated
  }
  const next: LiveTvList = {
    id: crypto.randomUUID(),
    name,
    channels: cleanChannels,
    createdAt: new Date().toISOString(),
    urlTvg: cleanUrlTvg,
    epgUrls: [],
    autoEpgDisabled: false,
  }
  writeLists([...readLists(), next])
  return next
}

export function addChannelToLiveTvList(listId: string, channel: M3uChannel): void {
  writeLists(readLists().map((list) => (
    list.id !== listId
      ? list
      : { ...list, channels: dedupeChannels([...list.channels, channel]) }
  )))
}

export function removeChannelFromLiveTvList(listId: string, channel: Pick<M3uChannel, 'name' | 'url'>): void {
  const key = channelKey(channel)
  writeLists(readLists().map((list) => (
    list.id !== listId
      ? list
      : { ...list, channels: list.channels.filter((entry) => channelKey(entry) !== key) }
  )))
}

export function isChannelInLiveTvList(listId: string, channel: Pick<M3uChannel, 'name' | 'url'>): boolean {
  const list = readLists().find((entry) => entry.id === listId)
  if (!list) return false
  const key = channelKey(channel)
  return list.channels.some((entry) => channelKey(entry) === key)
}

export function getPinnedLiveTvKeys(): string[] {
  return sanitizeStringArray(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, LIVE_TV_PINS_KEY, []))
}

function setPinnedLiveTvKeys(keys: string[]): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, LIVE_TV_PINS_KEY, keys)
}

export function isPinnedLiveTvChannel(channel: Pick<M3uChannel, 'name' | 'url'>): boolean {
  return getPinnedLiveTvKeys().includes(channelKey(channel))
}

export function togglePinnedLiveTvChannel(channel: Pick<M3uChannel, 'name' | 'url'>): string[] {
  const key = channelKey(channel)
  const current = getPinnedLiveTvKeys()
  const next = current.includes(key)
    ? current.filter((entry) => entry !== key)
    : [...current, key]
  setPinnedLiveTvKeys(next)
  return next
}

export function sortChannelsWithPins(channels: M3uChannel[]): M3uChannel[] {
  const pinned = getPinnedLiveTvKeys()
  if (pinned.length === 0) return channels

  const order = new Map(pinned.map((key, index) => [key, index]))
  return [...channels].sort((left, right) => {
    const leftIndex = order.get(channelKey(left))
    const rightIndex = order.get(channelKey(right))
    if (leftIndex != null && rightIndex != null) return leftIndex - rightIndex
    if (leftIndex != null) return -1
    if (rightIndex != null) return 1
    return String(left?.name ?? '').localeCompare(String(right?.name ?? ''))
  })
}

/*
 * ============================== Xtream-inloggning ==============================
 *
 * Vissa leverantörer stänger av M3U-exporten helt: get.php svarar tomt (eller
 * med påhittade statuskoder som 884) oavsett User-Agent, medan player_api.php
 * fungerar fullt ut. För dem är API-inloggningen den ENDA vägen in, så Live TV
 * kan logga in med server/användarnamn/lösenord och syntetisera kanallistan ur
 * API-svaren i stället för att tolka en spellista.
 *
 * Hämtningen görs direkt från webviewn när panelen skickar CORS-headers (de
 * flesta gör det), annars via värdens /api/m3u?stream=-proxy — den fanns redan
 * i 0.1.54, så hela funktionen fungerar utan appuppdatering.
 */

export interface XtreamLogin {
  id: string
  /// Normaliserad bas-URL utan avslutande snedstreck, t.ex. http://host:8080
  base: string
  username: string
  password: string
  /// Kanal-URL-ändelse. ts när panelen tillåter det (rå MPEG-TS spelar i mpv
  /// och native-spelaren), annars m3u8.
  format: 'ts' | 'm3u8'
  /// Valda kategori-id:n. Tom lista = alla kategorier (upp till kanalgränsen).
  categoryIds: string[]
}

const XTREAM_LOGINS_KEY = 'xtream_logins'
export const XTREAM_URL_PREFIX = 'xtream://'

export function normalizeXtreamBase(raw: string): string | null {
  let text = raw.trim()
  if (!text) return null
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`
  try {
    const parsed = new URL(text)
    const port = parsed.port ? `:${parsed.port}` : ''
    return `${parsed.protocol}//${parsed.hostname}${port}`
  } catch {
    return null
  }
}

export function getXtreamLogins(): XtreamLogin[] {
  const parsed = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, XTREAM_LOGINS_KEY, [])
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id ?? ''),
      base: String(entry.base ?? ''),
      username: String(entry.username ?? ''),
      password: String(entry.password ?? ''),
      format: entry.format === 'm3u8' ? 'm3u8' as const : 'ts' as const,
      categoryIds: sanitizeStringArray(entry.categoryIds),
    }))
    .filter((entry) => entry.id && entry.base && entry.username && entry.password)
}

export function saveXtreamLogin(login: XtreamLogin): void {
  const rest = getXtreamLogins().filter((entry) => entry.id !== login.id)
  writePluginJson(LIVE_TV_PLUGIN_ID, XTREAM_LOGINS_KEY, [...rest, login])
}

export function deleteXtreamLogin(id: string): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, XTREAM_LOGINS_KEY, getXtreamLogins().filter((entry) => entry.id !== id))
}

export function onXtreamLoginsChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, XTREAM_LOGINS_KEY, listener)
}

/// Pseudo-URL:en som representerar inloggningen i griden och i urlsKey.
/// Värdnamnet i den gör att deriveListName ger panelens värdnamn som listnamn.
export function xtreamPseudoUrl(login: XtreamLogin): string {
  let host = login.base
  try {
    host = new URL(login.base).host
  } catch { /* behåll basen som fallback */ }
  return `${XTREAM_URL_PREFIX}${host}/${login.id}`
}

export function findXtreamLoginByPseudoUrl(url: string): XtreamLogin | null {
  if (!url.startsWith(XTREAM_URL_PREFIX)) return null
  const id = url.slice(url.lastIndexOf('/') + 1)
  return getXtreamLogins().find((entry) => entry.id === id) ?? null
}

function xtreamApiUrl(login: Pick<XtreamLogin, 'base' | 'username' | 'password'>, params?: Record<string, string>): string {
  const search = new URLSearchParams({ username: login.username, password: login.password, ...(params ?? {}) })
  return `${login.base}/player_api.php?${search.toString()}`
}

/// Hämta JSON från panelen: direkt när CORS tillåter, annars via värdens
/// spellisteproxy (application/json är ingen spellista, så proxyn skickar
/// svaret vidare orört).
async function fetchXtreamJson(url: string): Promise<unknown> {
  try {
    const direct = await fetch(url)
    if (direct.ok) return await direct.json()
  } catch { /* CORS eller nätfel — prova proxyn */ }
  const proxied = await fetch(`/api/m3u?stream=${encodeURIComponent(url)}`)
  if (!proxied.ok) throw new Error(`xtream fetch failed: ${proxied.status}`)
  return await proxied.json()
}

export interface XtreamAccount {
  auth: boolean
  status: string | null
  /// Unix-sekunder, eller null när panelen inte skickar något utgångsdatum.
  expDate: number | null
  allowedFormats: string[]
}

export async function fetchXtreamAccount(login: Pick<XtreamLogin, 'base' | 'username' | 'password'>): Promise<XtreamAccount> {
  const payload = (await fetchXtreamJson(xtreamApiUrl(login))) as {
    user_info?: { auth?: unknown; status?: unknown; exp_date?: unknown; allowed_output_formats?: unknown }
  } | null
  const info = payload?.user_info
  const exp = Number.parseInt(String(info?.exp_date ?? ''), 10)
  return {
    auth: info?.auth === 1 || info?.auth === '1' || info?.auth === true,
    status: typeof info?.status === 'string' ? info.status : null,
    expDate: Number.isFinite(exp) && exp > 0 ? exp : null,
    allowedFormats: Array.isArray(info?.allowed_output_formats)
      ? info.allowed_output_formats.filter((f): f is string => typeof f === 'string')
      : [],
  }
}

export interface XtreamCategory {
  id: string
  name: string
}

export async function fetchXtreamCategories(login: XtreamLogin): Promise<XtreamCategory[]> {
  const payload = await fetchXtreamJson(xtreamApiUrl(login, { action: 'get_live_categories' }))
  if (!Array.isArray(payload)) return []
  return payload
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({ id: String(entry.category_id ?? ''), name: String(entry.category_name ?? '').trim() }))
    .filter((entry) => entry.id && entry.name)
}

interface XtreamRawStream {
  name?: unknown
  stream_id?: unknown
  stream_icon?: unknown
  category_id?: unknown
  epg_channel_id?: unknown
}

function xtreamStreamToChannel(
  login: XtreamLogin,
  stream: XtreamRawStream,
  categoryNames: Map<string, string>,
): M3uChannel | null {
  const streamId = Number.parseInt(String(stream.stream_id ?? ''), 10)
  if (!Number.isFinite(streamId)) return null
  const icon = typeof stream.stream_icon === 'string' && stream.stream_icon.trim() ? stream.stream_icon.trim() : null
  const epgId = typeof stream.epg_channel_id === 'string' && stream.epg_channel_id.trim() ? stream.epg_channel_id.trim() : null
  return {
    name: String(stream.name ?? 'Unknown').trim() || 'Unknown',
    logo: icon,
    group: categoryNames.get(String(stream.category_id ?? '')) ?? 'Other',
    url: `${login.base}/live/${encodeURIComponent(login.username)}/${encodeURIComponent(login.password)}/${streamId}.${login.format}`,
    tvgId: epgId,
  }
}

export interface XtreamChannelsResult {
  channels: M3uChannel[]
  /// Panelens EPG — samma xmltv.php som en get.php-inloggning hade härlett.
  urlTvg: string
  /// Totalt antal strömmar hos panelen (för "visar X av Y"-raden).
  total: number
}

/// Kanallistan syntetiserad ur API:t. Med valda kategorier hämtas de en och en
/// (små svar, avbryts vid taket); utan val hämtas hela listan i ett svep och
/// kapas — paneler med tiotusentals kanaler kräver kategoriurvalet för att bli
/// användbara, och det säger UI:t när kapningen slår till.
export async function fetchXtreamChannels(login: XtreamLogin, maxChannels: number): Promise<XtreamChannelsResult> {
  const categories = await fetchXtreamCategories(login)
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const urlTvg = `${login.base}/xmltv.php?${new URLSearchParams({ username: login.username, password: login.password })}`
  const channels: M3uChannel[] = []
  let total = 0

  if (login.categoryIds.length > 0) {
    for (const categoryId of login.categoryIds) {
      const payload = await fetchXtreamJson(xtreamApiUrl(login, { action: 'get_live_streams', category_id: categoryId }))
      if (!Array.isArray(payload)) continue
      total += payload.length
      for (const raw of payload) {
        if (channels.length >= maxChannels) continue
        const channel = xtreamStreamToChannel(login, raw as XtreamRawStream, categoryNames)
        if (channel) channels.push(channel)
      }
      // Ge webviewn andrum mellan kategorier — samma skäl som gridens yield.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    return { channels, urlTvg, total }
  }

  const payload = await fetchXtreamJson(xtreamApiUrl(login, { action: 'get_live_streams' }))
  if (Array.isArray(payload)) {
    total = payload.length
    for (const raw of payload) {
      if (channels.length >= maxChannels) break
      const channel = xtreamStreamToChannel(login, raw as XtreamRawStream, categoryNames)
      if (channel) channels.push(channel)
    }
  }
  return { channels, urlTvg, total }
}
