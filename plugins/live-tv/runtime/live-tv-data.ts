'use client'

import {
  clearPluginMemoryCache,
  clearPluginMemoryCacheByPrefix,
  getPluginHttpAssetUrl,
  isPluginImageLoaded,
  onPluginStorageChanged,
  preloadPluginImage,
  readPluginJson,
  removePluginStorageByPrefix,
  writePluginJson,
} from '@/lib/plugin-sdk'
import {
  emitIndexChanged,
  indexStatus,
  startImport,
  waitForJob,
  type ImportStatus,
  type XtreamImportSource,
} from './index-client'

export interface M3uChannel {
  name: string
  logo?: string | null
  group: string
  url: string
  tvgId: string | null
  /**
   * Xtream-kanaler med tv_archive: underlag för catch-up (timeshift-URL).
   * Saknas för M3U-listor och för paneler utan arkiv.
   */
  archive?: XtreamArchive
}

export interface XtreamArchive {
  /** Antal dagar panelen behåller sändningar (tv_archive_duration). */
  days: number
  streamId: number
  base: string
  username: string
  password: string
}

function sanitizeArchive(raw: unknown): XtreamArchive | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const a = raw as Record<string, unknown>
  const days = Number(a.days)
  const streamId = Number(a.streamId)
  if (!Number.isFinite(days) || days <= 0 || !Number.isFinite(streamId) || streamId <= 0) return undefined
  if (typeof a.base !== 'string' || typeof a.username !== 'string' || typeof a.password !== 'string') return undefined
  return { days, streamId, base: a.base, username: a.username, password: a.password }
}

export const LIVE_TV_PLUGIN_ID = 'com.lumio.live-tv'
export const LIVE_TV_GLOBAL_EPG_ID = 'global'
const M3U_URLS_KEY = 'm3u_urls'
const M3U_DRAFT_URLS_KEY = 'm3u_urls_draft'
const LIVE_TV_LISTS_KEY = 'lists'
const LIVE_TV_PINS_KEY = 'pins'
export const LIVE_TV_CHANNELS_PREFIX = 'channels:'
const LIVE_TV_LOGO_BUCKET = 'com.lumio.live-tv:logo'

export interface LiveTvList {
  id: string
  name: string
  createdAt: string
  urlTvg: string | null
  epgUrls: string[]
  /**
   * Källnyckel i appens kanalindex (Rust, `/api/live-tv/*`): M3U-listor
   * använder `getLiveTvUrlsKey([url])` (== `url`), Xtream-listor
   * `xtreamPseudoUrl(login)`, manuellt skapade listor en synthetisk
   * `custom:<id>` som aldrig pekar mot en importbar källa.
   *
   * Valfri i TYPEN (inte i det data `readLists` faktiskt lämnar ifrån sig)
   * bara för att gamla testfixturer och `live-tv-model.ts` (byts i P3) som
   * konstruerar `LiveTvList`-objekt för hand utan de här fälten inte ska
   * sluta typchecka.
   */
  source?: string
  kind?: 'm3u' | 'xtream' | 'custom'
  /** M3U-käll-URL:en. Bara satt för `kind === 'm3u'`. */
  url?: string
  /** Id in i `getXtreamLogins()`. Bara satt för `kind === 'xtream'`. */
  xtreamLoginId?: string
  /** Antal kanaler i indexet för den här listan — kvittots källa efter v2. */
  channelCount?: number
  /** Grupper (kategorier) i listan, för filterkedjan utan att ladda kanalerna. */
  groups?: { name: string; count: number }[]
  /**
   * Inbäddade kanaler ur den GAMLA lagringen (innan v2). Läses för sanering
   * och av äldre kod (`flattenChannels` m.fl., bytta i P3) — v2-koden här
   * (`importList`, `migrateStorageV2`, `ensureM3uList`/`ensureXtreamList`)
   * skriver ALDRIG till det här fältet; kanalerna bor i indexet.
   */
  channels?: M3uChannel[]
  /**
   * Stänger av den AUTO-härledda EPG-källan (url-tvg ur spellistan, eller
   * xmltv.php som servern härleder ur en Xtream-inloggning). Egen flagga och
   * inte "nolla urlTvg": upsertLiveTvListFromFetch skriver över urlTvg vid
   * VARJE ny M3U-hämtning, så ett nollat värde hade kommit tillbaka. Med en
   * flagga blir valet kvar, och källan kan slås på igen — den är härledd, så
   * att radera den vore inte återställbart.
   */
  autoEpgDisabled: boolean
  /**
   * När listan senast hämtades. Kvittot i inställningarna läses härifrån och
   * inte ur ett React-tillstånd: hämtningen kan vara flera minuter gammal när
   * någon öppnar sektionen, och "42 kanaler · hämtad 09:41" är det som gör
   * skillnad på "listan är tom" och "hämtningen är inte gjord".
   * Null för listor som lagrades innan fältet fanns.
   */
  fetchedAt: string | null
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
      ...(sanitizeArchive(channel.archive) ? { archive: sanitizeArchive(channel.archive) } : {}),
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

export function channelKey(channel: Pick<M3uChannel, 'name' | 'url'>): string {
  return `${String(channel.name ?? '').trim()}::${String(channel.url ?? '').trim()}`
}

function writeLists(lists: LiveTvList[]): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, LIVE_TV_LISTS_KEY, lists)
}

/**
 * Bara migreringen (`storage-v2-migration.ts`) skriver om HELA listuppsätt-
 * ningen utifrån värden `readLists`/`getLiveTvLists` redan lämnat ut — den
 * bor i en egen fil (spec 4.1), så `writeLists` måste exporteras dit i
 * stället för att dupliceras.
 */
export function replaceLiveTvLists(lists: LiveTvList[]): void {
  writeLists(lists)
}

export function computeGroups(channels: M3uChannel[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const channel of channels) {
    const group = channel.group?.trim() || 'Other'
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => ({ name, count }))
}

function sanitizeGroups(values: unknown): { name: string; count: number }[] {
  if (!Array.isArray(values)) return []
  return values
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .map((value) => ({ name: String(value.name ?? '').trim(), count: Number(value.count ?? 0) }))
    .filter((value) => value.name.length > 0 && Number.isFinite(value.count) && value.count >= 0)
}

/**
 * Listor lagrade FÖRE v2 saknar `kind`/`source` helt. De klassas mot den
 * NUVARANDE Xtream-/M3U-konfigurationen via samma namnhärledning som skapade
 * dem ursprungligen (`xtreamPseudoUrl`/`deriveListName` — listans `name` ÄR
 * käll-URL:ens värdnamn). Ingen träff (manuellt skapad lista via
 * `createLiveTvList`, eller en källa som tagits bort ur inställningarna) blir
 * `kind: 'custom'` med en synthetisk källa — den migreras aldrig (ingen
 * riktig import-URL att skriva om den mot) och behåller sina inbäddade
 * kanaler oförändrat.
 */
function classifyLegacyList(id: string, name: string): Pick<LiveTvList, 'kind' | 'source' | 'url' | 'xtreamLoginId'> {
  for (const login of getXtreamLogins()) {
    let host = login.base
    try {
      host = new URL(login.base).host
    } catch { /* behåll basen som fallback */ }
    if (host === name) return { kind: 'xtream', source: xtreamPseudoUrl(login), xtreamLoginId: login.id }
  }
  for (const url of getM3uUrls()) {
    if (deriveListName(url) === name) return { kind: 'm3u', source: getLiveTvUrlsKey([url]), url }
  }
  return { kind: 'custom', source: `custom:${id}` }
}

function sanitizeListEntry(entry: Record<string, unknown>): LiveTvList {
  const id = String(entry.id ?? '')
  const name = String(entry.name ?? '').trim()
  const channels = sanitizeChannels(Array.isArray(entry.channels) ? entry.channels : [])

  const hasV2Shape = typeof entry.kind === 'string' && typeof entry.source === 'string' && entry.source.length > 0
  const classified = hasV2Shape
    ? {
        kind: (entry.kind === 'xtream' || entry.kind === 'm3u' ? entry.kind : 'custom') as LiveTvList['kind'],
        source: String(entry.source),
        url: typeof entry.url === 'string' && entry.url.length > 0 ? entry.url : undefined,
        xtreamLoginId: typeof entry.xtreamLoginId === 'string' && entry.xtreamLoginId.length > 0 ? entry.xtreamLoginId : undefined,
      }
    : classifyLegacyList(id, name)

  const channelCount = typeof entry.channelCount === 'number' && Number.isFinite(entry.channelCount)
    ? entry.channelCount
    : channels.length
  const groups = Array.isArray(entry.groups) ? sanitizeGroups(entry.groups) : computeGroups(channels)

  return {
    id,
    name,
    ...classified,
    createdAt: String(entry.createdAt ?? ''),
    urlTvg: typeof entry.urlTvg === 'string' && entry.urlTvg.trim().length > 0 ? entry.urlTvg.trim() : null,
    epgUrls: sanitizeEpgUrls(entry.epgUrls),
    autoEpgDisabled: entry.autoEpgDisabled === true,
    fetchedAt: typeof entry.fetchedAt === 'string' && entry.fetchedAt.trim().length > 0 ? entry.fetchedAt : null,
    channelCount,
    groups,
    channels,
  }
}

function readLists(): LiveTvList[] {
  const parsed = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, LIVE_TV_LISTS_KEY, [])
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => sanitizeListEntry(entry))
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

/**
 * Rensning av den GAMLA per-käll-cachen (`channels:<urlsKey>`, både i minnet
 * och på disk). Skriver ingen kod hit längre sedan v2 (kanalerna bor i
 * värdens index, se `index-client.ts`/`storage-v2-migration.ts`) — kvar bara
 * så inställningarnas "uppdatera"-knapp och migreringen kan städa bort rester
 * av den på enheter som haft dem.
 */
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
  const id = crypto.randomUUID()
  const next: LiveTvList = {
    id,
    name: trimmed,
    // Manuellt skapad, inte en M3U/Xtream-källa — `custom:<id>` pekar aldrig
    // mot något importbart och listan migreras därför aldrig av
    // `migrateStorageV2` (se `classifyLegacyList`).
    kind: 'custom',
    source: `custom:${id}`,
    channels: [],
    createdAt: new Date().toISOString(),
    urlTvg: typeof options?.urlTvg === 'string' && options.urlTvg.trim().length > 0 ? options.urlTvg.trim() : null,
    epgUrls: sanitizeEpgUrls(options?.epgUrls ?? []),
    autoEpgDisabled: false,
    // Skapad för hand, inte hämtad: kvittot ska vara tomt tills en hämtning
    // faktiskt gjorts, annars ljuger det om att kanalerna kommer någonstans.
    fetchedAt: null,
    channelCount: 0,
    groups: [],
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

/**
 * Kvarvarande äldre hämtningsväg: pluginlagringen bär kanalerna direkt, ingen
 * import-jobb-körning i värden. Bara `runtime/tv/tv-settings.tsx` (Task P5)
 * anropar den här längre — skrivbordets `live-tv-settings-section.tsx` och
 * `xtream-login-section.tsx` går via `importList` (spec 4.1). Skriver v2-fält
 * (kind/source/channelCount/groups) så listan är sanerbar och konsistent även
 * innan `migrateStorageV2`/P5 hinner byta TV-flödet till jobbet.
 */
export function upsertLiveTvListFromFetch(
  sourceUrl: string,
  urlTvg: string | null,
  channels: M3uChannel[],
): LiveTvList {
  const trimmedSource = sourceUrl.trim()
  if (!trimmedSource) throw new Error('sourceUrl is required')
  const name = deriveListName(trimmedSource)
  const source = getLiveTvUrlsKey([trimmedSource])
  const existing = readLists().find((list) => list.source === source || list.name === name)
  const cleanChannels = sanitizeChannels(channels)
  const cleanUrlTvg = typeof urlTvg === 'string' && urlTvg.trim().length > 0 ? urlTvg.trim() : null
  const groups = computeGroups(cleanChannels)

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
      kind: 'm3u',
      source,
      url: trimmedSource,
      channels: cleanChannels,
      channelCount: cleanChannels.length,
      groups,
      urlTvg: cleanUrlTvg ?? existing.urlTvg,
      fetchedAt: new Date().toISOString(),
    }
    writeLists(readLists().map((list) => (list.id === existing.id ? updated : list)))
    return updated
  }
  const next: LiveTvList = {
    id: crypto.randomUUID(),
    name,
    kind: 'm3u',
    source,
    url: trimmedSource,
    channels: cleanChannels,
    createdAt: new Date().toISOString(),
    urlTvg: cleanUrlTvg,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: new Date().toISOString(),
    channelCount: cleanChannels.length,
    groups,
  }
  writeLists([...readLists(), next])
  return next
}

export function addChannelToLiveTvList(listId: string, channel: M3uChannel): void {
  writeLists(readLists().map((list) => {
    if (list.id !== listId) return list
    const channels = dedupeChannels([...(list.channels ?? []), channel])
    return { ...list, channels, channelCount: channels.length, groups: computeGroups(channels) }
  }))
}

export function removeChannelFromLiveTvList(listId: string, channel: Pick<M3uChannel, 'name' | 'url'>): void {
  const key = channelKey(channel)
  writeLists(readLists().map((list) => {
    if (list.id !== listId) return list
    const channels = (list.channels ?? []).filter((entry) => channelKey(entry) !== key)
    return { ...list, channels, channelCount: channels.length, groups: computeGroups(channels) }
  }))
}

export function isChannelInLiveTvList(listId: string, channel: Pick<M3uChannel, 'name' | 'url'>): boolean {
  const list = readLists().find((entry) => entry.id === listId)
  if (!list) return false
  const key = channelKey(channel)
  return (list.channels ?? []).some((entry) => channelKey(entry) === key)
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

/** Favoritordning styr snabbzapp-numren på TV: flytta en post ett steg. */
export function movePinnedLiveTvChannel(key: string, delta: -1 | 1): string[] {
  const current = getPinnedLiveTvKeys()
  const index = current.indexOf(key)
  if (index === -1) return current
  const target = index + delta
  if (target < 0 || target >= current.length) return current
  const next = [...current]
  next.splice(index, 1)
  next.splice(target, 0, key)
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

function findListBySource(source: string): LiveTvList | undefined {
  return readLists().find((list) => list.source === source)
}

/**
 * Hittar eller skapar listposten för en M3U-URL UTAN att hämta något —
 * `importList` gör den delen (jobbet i värden). Källan är samma
 * `getLiveTvUrlsKey([url])` som `upsertLiveTvListFromFetch` skriver, så en
 * lista som redan finns (skapad via den äldre TV-vägen) hittas och
 * återanvänds i stället för att dubbleras.
 */
export function ensureM3uList(url: string): LiveTvList {
  const trimmed = url.trim()
  const source = getLiveTvUrlsKey([trimmed])
  const existing = findListBySource(source)
  if (existing) return existing
  const next: LiveTvList = {
    id: crypto.randomUUID(),
    name: deriveListName(trimmed),
    kind: 'm3u',
    source,
    url: trimmed,
    channels: [],
    createdAt: new Date().toISOString(),
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
    channelCount: 0,
    groups: [],
  }
  writeLists([...readLists(), next])
  return next
}

/** Hittar eller skapar listposten för en Xtream-inloggning UTAN att hämta något. */
export function ensureXtreamList(login: XtreamLogin): LiveTvList {
  const source = xtreamPseudoUrl(login)
  const existing = findListBySource(source)
  if (existing) return existing
  let host = login.base
  try {
    host = new URL(login.base).host
  } catch { /* behåll basen som fallback */ }
  const next: LiveTvList = {
    id: crypto.randomUUID(),
    name: host,
    kind: 'xtream',
    source,
    xtreamLoginId: login.id,
    channels: [],
    createdAt: new Date().toISOString(),
    urlTvg: null,
    epgUrls: [],
    autoEpgDisabled: false,
    fetchedAt: null,
    channelCount: 0,
    groups: [],
  }
  writeLists([...readLists(), next])
  return next
}

/**
 * Hämtar en lista via värdens importjobb (Rust) i stället för att synto-
 * tisera/parsa i webviewn — ersätter `upsertLiveTvListFromFetch` +
 * `fetchXtreamChannels`-vägen för de skrivbordsinställningar som anropar den
 * här (spec 4.1). Uppdaterar listans kvitto (`channelCount/groups/urlTvg/
 * fetchedAt`) bara vid `done`; ett fel lämnar listan orörd (Rust-jobbets
 * `error` bär texten, `waitForJob` löser aldrig ut på annat än done/error).
 */
export async function importList(list: LiveTvList, onProgress?: (status: ImportStatus) => void): Promise<ImportStatus> {
  if (!list.source) throw new Error(`live tv list "${list.name}" has no source to import`)
  const body: { source: string; m3u?: { url: string }; xtream?: XtreamImportSource } = { source: list.source }

  if (list.kind === 'xtream') {
    const login = getXtreamLogins().find((entry) => entry.id === list.xtreamLoginId)
    if (!login) throw new Error(`xtream login missing for list "${list.name}"`)
    body.xtream = {
      base: login.base,
      username: login.username,
      password: login.password,
      format: login.format,
      ...(login.categoryIds.length > 0 ? { categoryIds: login.categoryIds } : {}),
    }
  } else if (list.kind === 'm3u') {
    if (!list.url) throw new Error(`m3u url missing for list "${list.name}"`)
    body.m3u = { url: list.url }
  } else {
    throw new Error(`cannot import a "${list.kind ?? 'unknown'}" list`)
  }

  const job = await startImport(body)
  const status = await waitForJob(job, onProgress)

  if (status.state === 'done') {
    const result = status.result
    writeLists(readLists().map((entry) => (entry.id === list.id
      ? {
          ...entry,
          channelCount: result?.total ?? entry.channelCount ?? 0,
          groups: result?.groups ?? entry.groups ?? [],
          urlTvg: result?.urlTvg ?? entry.urlTvg,
          fetchedAt: new Date().toISOString(),
        }
      : entry)))
    emitIndexChanged()
  }
  return status
}

/**
 * Mottagarsidan av enhetsöverföringen (spec 3.4): `lists`/`pins`/`m3u_urls*`
 * speglas mellan enheter, men `channels:`-nycklarna gör det inte längre — en
 * lista som dyker upp på en ny enhet har ingen källa i DESS index förrän
 * något importerar den. Anropas av modellen vid start (P3); körs
 * sekventiellt och ett fel på en lista hindrar inte de andra (samma
 * "behåll gammalt innehåll"-princip som `importList`/spec 5).
 */
export async function importMissingSources(): Promise<void> {
  const { sources } = await indexStatus()
  const known = new Set(sources)
  const missing = readLists().filter(
    (list) => list.source && !known.has(list.source) && (list.kind === 'm3u' || list.kind === 'xtream'),
  )
  for (const list of missing) {
    await importList(list).catch(() => {})
  }
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

export function onPinnedLiveTvKeysChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, LIVE_TV_PINS_KEY, listener)
}

/**
 * "Dölj appens hjälte på Live TV-sidan" — pluginets eget val, läses av appen
 * via browse-sidans hideHero() (appar från 0.1.57; äldre ignorerar det).
 */
const HIDE_HERO_KEY = 'hide_hero'
/** Dold som standard (Jerry 2026-09-03): Live TV börjar med hubben, inte under filmhjälten. Valet i inställningarna kan slå på den igen. */
export function getLiveTvHideHero(): boolean {
  return readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, HIDE_HERO_KEY, true) !== false
}
export function setLiveTvHideHero(hide: boolean): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, HIDE_HERO_KEY, hide)
}
export function onLiveTvHideHeroChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, HIDE_HERO_KEY, listener)
}
