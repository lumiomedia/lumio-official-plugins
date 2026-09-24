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
  resetSource,
  startImport,
  waitForJob,
  type ImportStatus,
  type XtreamImportSource,
} from './index-client'
import { forgetVod } from './vod-client'
import { normalizeCuration } from './list-curation'

export interface M3uChannel {
  name: string
  logo?: string | null
  /**
   * Reservlogotyp ur iptv-orgs öppna register. ÄGS av appen (matchningen
   * sker där, mot indexet) — pluginet läser bara fältet, skriver aldrig till
   * det. `logo` vinner alltid: det här visas bara när leverantörens egen
   * logotyp saknas eller fallerar.
   */
  logoFallback?: string | null
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

export interface ListCuration {
  /** Originalgruppnamn som döljs. */
  hidden: string[]
  /** Ihopslagningar; `groups` är originalgruppnamn, `name` det nya namnet. */
  merges: { name: string; groups: string[] }[]
}

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
   * Appen slutade läsa spellistan vid sitt storlekstak (64 MiB) — kanalerna
   * som kom efter finns inte i indexet. Jobbet svarar `done`, så utan den här
   * flaggan såg en HALV lista ut som en hel: kvittot visade sitt antal och
   * ingenting sa att resten saknades.
   */
  truncated?: boolean
  /**
   * Kategorikuratering per källa (spec 2026-09-24): dolda originalgrupper
   * och ihopslagningar. Tillämpas i modellen ovanpå indexet
   * (`applyCuration` i list-curation.ts) — indexet bär alltid
   * originalgrupperna, så `groups` ovan är OKURATERADE.
   * Frånvarande = allt syns.
   */
  curation?: ListCuration
  /** Kategoripanelen har visats (sparad eller överhoppad) efter en import. */
  curationSeen?: boolean
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
   * inte "nolla urlTvg": varje ny import skriver över urlTvg, så ett nollat
   * värde hade kommit tillbaka vid nästa hämtning. Med en
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
  /**
   * Satt av `importMissingSources`/`importList` när en import misslyckades
   * (t.ex. en Xtream-lista överförd till en ny enhet vars `xtream_logins` inte
   * speglades ännu) — UI kan visa "behöver hämtas om" i stället för att tyst
   * visa en tom/oförändrad lista. Rensas vid nästa lyckade import.
   */
  needsReimport?: boolean
  /** Senaste felmeddelandet, för samma UI. Rensas tillsammans med `needsReimport`. */
  lastImportError?: string
  /**
   * Slår av/på reservlogotypen (`M3uChannel.logoFallback`) för den här
   * listan. `undefined` betyder PÅ — även för listor skapade före v2, som
   * aldrig haft fältet. Filtreringen sker när kanalerna laddas
   * (`loadChannelsShared`), inte i någon vy.
   */
  logoFallbackEnabled?: boolean
}

export function sanitizeChannels(channels: unknown[]): M3uChannel[] {
  return channels
    .filter((channel): channel is Record<string, unknown> => Boolean(channel) && typeof channel === 'object')
    .map((channel) => ({
      name: String(channel.name ?? 'Unknown').trim() || 'Unknown',
      logo: typeof channel.logo === 'string' && channel.logo.trim().length > 0 ? channel.logo.trim() : null,
      logoFallback: typeof channel.logoFallback === 'string' && channel.logoFallback.trim().length > 0
        ? channel.logoFallback.trim()
        : null,
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
function classifyLegacyList(
  id: string,
  name: string,
  xtreamLogins: XtreamLogin[],
  m3uUrls: string[],
): Pick<LiveTvList, 'kind' | 'source' | 'url' | 'xtreamLoginId'> {
  for (const login of xtreamLogins) {
    // Listans `name` kommer från `deriveListName(xtreamPseudoUrl(login))`
    // (hostnamn, UTAN port — `new URL().hostname`) eftersom det är så den
    // GAMLA hämtningsvägen (borttagen i P5) döpte Xtream-listor. Att jämföra
    // mot `new URL(login.base).host` (MED port) missade varje panel på en
    // icke-standardport: listan klassades `custom` och migreringen hoppade
    // över den, trots att den hade en fullt giltig Xtream-källa.
    if (deriveListName(xtreamPseudoUrl(login)) === name) {
      return { kind: 'xtream', source: xtreamPseudoUrl(login), xtreamLoginId: login.id }
    }
  }
  for (const url of m3uUrls) {
    if (deriveListName(url) === name) return { kind: 'm3u', source: getLiveTvUrlsKey([url]), url }
  }
  return { kind: 'custom', source: `custom:${id}` }
}

function sanitizeListEntry(entry: Record<string, unknown>, xtreamLogins: XtreamLogin[], m3uUrls: string[]): LiveTvList {
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
    : classifyLegacyList(id, name, xtreamLogins, m3uUrls)

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
    truncated: entry.truncated === true,
    channels,
    needsReimport: entry.needsReimport === true,
    lastImportError: typeof entry.lastImportError === 'string' && entry.lastImportError.trim().length > 0
      ? entry.lastImportError
      : undefined,
    // `undefined` betyder PÅ (se `isLogoFallbackEnabled`) — bara ett
    // uttryckligt `false` ska överleva saneringen.
    logoFallbackEnabled: entry.logoFallbackEnabled === false ? false : undefined,
    curation: sanitizeCuration(entry.curation),
    curationSeen: entry.curationSeen === true ? true : undefined,
  }
}

/** Kurateringen ur lagringen: okänd form → ignoreras, tom → utelämnas. */
function sanitizeCuration(raw: unknown): ListCuration | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const hidden = Array.isArray(obj.hidden) ? obj.hidden.filter((g): g is string => typeof g === 'string') : []
  const merges = Array.isArray(obj.merges)
    ? obj.merges
        .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object')
        .map((m) => ({
          name: typeof m.name === 'string' ? m.name : '',
          groups: Array.isArray(m.groups) ? m.groups.filter((g): g is string => typeof g === 'string') : [],
        }))
    : []
  return normalizeCuration({ hidden, merges })
}

function readLists(): LiveTvList[] {
  const parsed = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, LIVE_TV_LISTS_KEY, [])
  if (!Array.isArray(parsed)) return []
  // Hissade ut ur loopen: annars läser/JSON.parsar varje legacy-post (utan
  // `kind`/`source`) om HELA `xtream_logins`/`m3u_urls` för sin egen skull —
  // O(listor) parsningar av samma två oföränderliga blobbar i stället för en.
  const xtreamLogins = getXtreamLogins()
  const m3uUrls = getM3uUrls()
  return parsed
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => sanitizeListEntry(entry, xtreamLogins, m3uUrls))
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

/** Skriver kurateringen normaliserad (tom = fältet tas bort) och markerar panelen som visad. */
export function updateLiveTvListCuration(listId: string, curation: ListCuration | undefined): void {
  const normalized = normalizeCuration(curation)
  writeLists(
    readLists().map((list) => {
      if (list.id !== listId) return list
      const { curation: _dropped, ...rest } = list
      return normalized ? { ...rest, curation: normalized, curationSeen: true } : { ...rest, curationSeen: true }
    }),
  )
}

export function markListCurationSeen(listId: string): void {
  writeLists(readLists().map((list) => (list.id === listId ? { ...list, curationSeen: true } : list)))
}

/** `undefined` betyder PÅ — också för listor skapade innan v2-fältet fanns. */
export function isLogoFallbackEnabled(list: LiveTvList): boolean {
  return list.logoFallbackEnabled !== false
}

export function setLogoFallbackEnabled(listId: string, enabled: boolean): void {
  writeLists(
    readLists().map((list) => (list.id === listId ? { ...list, logoFallbackEnabled: enabled } : list)),
  )
}

/**
 * Tar bort listposten OCH dess kanaler ur appens index.
 *
 * Bara att skriva om `lists` räckte inte: kanalerna bor i indexet sedan v2, så
 * en borttagen spellista fortsatte synas i varje uppslag utan källa ("alla
 * kanaler", sök, favoritupplösning) tills något annat råkade skriva om
 * källan. Alla fyra borttagningsvägar (skrivbordets inställningar, Xtream-
 * kortet, TV-inställningarna, rutnätets listflik) går genom den här funktionen
 * och får därför städningen på köpet.
 *
 * Tre undantag: `custom`-listor har inga kanaler i indexet (de bär dem
 * inbäddade), en källa som en ANNAN lista fortfarande pekar på får inte tömmas,
 * och en lista utan källa har ingenting att tömma. Nollställningen är
 * eldochglöm — `emitIndexChanged` skickas när försöket är gjort, eftersom
 * listan är borta oavsett och vyerna måste läsa om.
 */
export function deleteLiveTvList(listId: string): void {
  const lists = readLists()
  const removed = lists.find((list) => list.id === listId) ?? null
  const remaining = lists.filter((list) => list.id !== listId)
  writeLists(remaining)

  const source = removed?.source
  if (!source || removed?.kind === 'custom') return
  if (remaining.some((list) => list.source === source)) return
  // Biblioteket hör till källan och ska gå med den. Utan det blev 16 000
  // titlar kvar i indexet för en spellista användaren just raderat.
  void forgetVod(source).catch(() => {
    // Samma resonemang som kanalerna nedan: ett nätfel lämnar titlarna kvar,
    // och nästa radering eller import städar. Listan är borta ur lagringen.
  })
  void resetSource(source)
    .catch(() => {
      // Ett nätfel lämnar kanalerna i indexet. Vyerna läser ändå om: nästa
      // borttagning/import städar, och listan är borta ur lagringen redan.
    })
    .finally(() => emitIndexChanged())
}

function deriveListName(sourceUrl: string): string {
  try {
    const u = new URL(sourceUrl)
    return u.hostname || sourceUrl
  } catch {
    return sourceUrl
  }
}

export type AddChannelResult = 'added' | 'duplicate' | 'full' | 'not-custom'

/**
 * Tak för en manuellt skapad lista.
 *
 * `lists` SPEGLAS mellan enheter och skrivs i sin helhet vid varje ändring.
 * En "custom"-lista är den enda som fortfarande bär kanaler inbäddade, och
 * utan tak kunde någon lägga dit tusentals — då är vi tillbaka i exakt den
 * lagringsform lagring v2 tog bort (hundratals kB som synkas fram och
 * tillbaka vid varje nålning).
 */
export const MAX_CUSTOM_LIST_CHANNELS = 500

/**
 * BARA manuellt skapade (`kind === 'custom'`) listor lagrar kanaler — m3u/
 * xtream-listors kanaler bor i indexet, och `channelCount`/`groups` för dem är
 * importjobbets kvitto (skrivs av `importList`). Ett anrop på en icke-custom
 * lista är därför ett no-op i stället för att skriva en kanalpayload till
 * speglade `lists` och skeva kvittot till "1 kanal".
 *
 * `archive` FÖLJER ALDRIG MED. Fältet bär Xtream-panelens bas, användarnamn
 * och lösenord: att skriva in det i `lists` la inloggningsuppgifter i den
 * nyckel som speglas mellan enheter, en gång per tillagd kanal. Catch-up
 * behöver dem ändå inte härifrån — kanalens tvilling i indexet har dem, och
 * vyerna slår upp den på URL:en (`withIndexTwins`/`model.byUrl`) innan de
 * spelar eller ritar repriser.
 */
export function addChannelToLiveTvList(listId: string, channel: M3uChannel): AddChannelResult {
  let outcome: AddChannelResult = 'not-custom'
  writeLists(readLists().map((list) => {
    if (list.id !== listId || list.kind !== 'custom') return list
    const current = list.channels ?? []
    if (current.length >= MAX_CUSTOM_LIST_CHANNELS) {
      outcome = 'full'
      return list
    }
    const { archive: _archive, ...withoutArchive } = channel
    const channels = dedupeChannels([...current, withoutArchive])
    if (channels.length === current.length) {
      outcome = 'duplicate'
      return list
    }
    outcome = 'added'
    return { ...list, channels, channelCount: channels.length, groups: computeGroups(channels) }
  }))
  return outcome
}

export function removeChannelFromLiveTvList(listId: string, channel: Pick<M3uChannel, 'name' | 'url'>): void {
  const key = channelKey(channel)
  writeLists(readLists().map((list) => {
    if (list.id !== listId || list.kind !== 'custom') return list
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

export function setPinnedLiveTvKeys(keys: string[]): void {
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
  // En omskriven inloggning (nytt lösenord, förnyat konto) ska inte kunna
  // läsas ur kontocachen — se fetchXtreamAccount.
  invalidateXtreamAccount(login)
}

export function deleteXtreamLogin(id: string): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, XTREAM_LOGINS_KEY, getXtreamLogins().filter((entry) => entry.id !== id))
}

/**
 * Inloggningar som INTE hör till någon spellista.
 *
 * De uppstår när en lista raderas men kontot blir kvar, eller när en
 * inloggning sparas och importen aldrig går igenom. De syns ingenstans i
 * TV-läget — "Spellistor" listar ju spellistor — och gick därför inte att bli
 * av med. Ett gammalt konto som ligger kvar är inte oskyldigt: det bär
 * användarnamn och lösenord.
 */
export function getOrphanXtreamLogins(): XtreamLogin[] {
  const lists = readLists()
  return getXtreamLogins().filter((login) => !lists.some((list) => list.xtreamLoginId === login.id))
}

/**
 * Raderar en Xtream-inloggning OCH allt som hänger på den: spellistan (om
 * någon), kanalerna i indexet och biblioteket.
 *
 * Att bara ta bort inloggningen lämnade en lista som inte gick att hämta och
 * ett index fullt av kanaler ingen kunde spela.
 */
export function deleteXtreamLoginAndData(loginId: string): void {
  const login = getXtreamLogins().find((entry) => entry.id === loginId) ?? null
  const list = readLists().find((entry) => entry.xtreamLoginId === loginId) ?? null

  deleteXtreamLogin(loginId)

  if (list) {
    // Städar index och bibliotek åt oss.
    deleteLiveTvList(list.id)
    return
  }
  // Ingen lista: källan kan ändå ligga kvar i indexen från en tidigare import.
  if (!login) return
  const source = xtreamPseudoUrl(login)
  void forgetVod(source).catch(() => {})
  void resetSource(source)
    .catch(() => {})
    .finally(() => emitIndexChanged())
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

/**
 * `xtream://<host>/<loginId>` → delarna.
 *
 * En Xtream-lista som kommit till enheten via inställningsöverföringen har
 * kvar sin källa men INTE inloggningen (lösenord speglas inte), så källan är
 * det enda som finns kvar att laga listan med: värdnamnet fyller i
 * serverfältet, och login-id:t återanvänds när den nya inloggningen sparas så
 * att `xtreamPseudoUrl` ger SAMMA källa — annars skapas en andra, tom lista
 * bredvid den trasiga i stället för att den lagas.
 */
export function parseXtreamSource(source: string | undefined): { host: string; loginId: string } | null {
  if (!source || !source.startsWith(XTREAM_URL_PREFIX)) return null
  const rest = source.slice(XTREAM_URL_PREFIX.length)
  const slash = rest.lastIndexOf('/')
  if (slash <= 0) return null
  return { host: rest.slice(0, slash), loginId: rest.slice(slash + 1) }
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
 * `getLiveTvUrlsKey([url])` som den gamla hämtningsvägen skrev, så en lista
 * som redan finns (skapad före v2) hittas och återanvänds i stället för att
 * dubbleras.
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
 * Hämtar en lista via värdens importjobb (Rust) i stället för att syntetisera/
 * parsa i webviewn — den ENDA hämtningsvägen sedan P5 (spec 4.1). Uppdaterar listans kvitto (`channelCount/groups/urlTvg/
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
          // `urlTvg` tas RAKT AV ur jobbets svar när det finns ett svar:
          // `?? entry.urlTvg` behöll den gamla adressen när appen svarade
          // null, så en url-tvg som tagits bort ur spellistan levde kvar och
          // pluginet fortsatte be om en tablå ingen längre publicerade. Ett
          // FELAT jobb (ingen `result`) lämnar den orörd, som allt annat.
          urlTvg: result ? result.urlTvg : entry.urlTvg,
          truncated: result?.truncated === true,
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
// Återinträdesskydd: modellen (P3) kan anropa `importMissingSources` på
// mount, och ett spellistbyte eller en snabb remount kan trigga ett andra
// anrop innan det första hunnit klart — utan skyddet startar det om samma
// jobb en gång till för varje lista i stället för att vänta in det pågående.
let importMissingSourcesInFlight: Promise<void> | null = null

export async function importMissingSources(): Promise<void> {
  if (importMissingSourcesInFlight) return importMissingSourcesInFlight
  importMissingSourcesInFlight = (async () => {
    const { sourceIds } = await indexStatus()
    const known = new Set(sourceIds)
    const missing = readLists().filter(
      (list) => list.source && !known.has(list.source) && (list.kind === 'm3u' || list.kind === 'xtream'),
    )
    for (const list of missing) {
      // Ett fel (t.ex. en Xtream-lista överförd till en ny enhet vars
      // `xtream_logins` inte speglades ännu, så `importList` kastar "xtream
      // login missing") fick tidigare tyst svälja varje start om och om
      // igen — listan såg ut att bara sakna kanaler, utan spår av varför.
      // `needsReimport`/`lastImportError` gör felet synligt för UI i stället.
      let errorMessage: string | undefined
      try {
        const status = await importList(list)
        if (status.state === 'error') errorMessage = status.error ?? 'import failed'
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err)
      }
      writeLists(readLists().map((entry) => (entry.id === list.id
        ? { ...entry, needsReimport: Boolean(errorMessage), lastImportError: errorMessage }
        : entry)))
    }
  })()
  try {
    await importMissingSourcesInFlight
  } finally {
    importMissingSourcesInFlight = null
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
  /// Hur många samtidiga strömmar panelen tillåter. null när den inte säger något.
  maxConnections: number | null
  allowedFormats: string[]
}

/**
 * KONTOKORTETS CACHE. Kontot frågades tidigare ut vid varje montering av en
 * inställningsyta — TV-fliken och skrivbordssektionen kunde göra det i samma
 * sekund, en gång per sparad inloggning. Panelerna är långsamma och Jerrys
 * regel är att aldrig öka uppslagsvolymen i onödan, så svaret lever 5 minuter
 * per `base|username`.
 *
 * Cachen förbigås vid NY INLOGGNING på tre sätt: `force` (inloggningsflödet
 * verifierar alltid mot panelen), ett annat lösenord än det cachade (en
 * förnyad panel svarar annorlunda), och `saveXtreamLogin` som rensar posten
 * när en inloggning skrivs om.
 */
const XTREAM_ACCOUNT_TTL_MS = 5 * 60 * 1000
const xtreamAccountCache = new Map<string, { at: number; password: string; account: XtreamAccount }>()

function xtreamAccountKey(login: Pick<XtreamLogin, 'base' | 'username'>): string {
  return `${login.base}|${login.username}`
}

export function invalidateXtreamAccount(login: Pick<XtreamLogin, 'base' | 'username'>): void {
  xtreamAccountCache.delete(xtreamAccountKey(login))
}

export function __resetXtreamAccountCacheForTests(): void {
  xtreamAccountCache.clear()
}

export async function fetchXtreamAccount(
  login: Pick<XtreamLogin, 'base' | 'username' | 'password'>,
  opts?: { force?: boolean },
): Promise<XtreamAccount> {
  const key = xtreamAccountKey(login)
  const cached = xtreamAccountCache.get(key)
  if (!opts?.force && cached && cached.password === login.password && Date.now() - cached.at < XTREAM_ACCOUNT_TTL_MS) {
    return cached.account
  }
  const account = await fetchXtreamAccountUncached(login)
  xtreamAccountCache.set(key, { at: Date.now(), password: login.password, account })
  return account
}

async function fetchXtreamAccountUncached(login: Pick<XtreamLogin, 'base' | 'username' | 'password'>): Promise<XtreamAccount> {
  const payload = (await fetchXtreamJson(xtreamApiUrl(login))) as {
    user_info?: { auth?: unknown; status?: unknown; exp_date?: unknown; max_connections?: unknown; allowed_output_formats?: unknown }
  } | null
  const info = payload?.user_info
  const exp = Number.parseInt(String(info?.exp_date ?? ''), 10)
  // Panelerna skickar `max_connections` som sträng lika ofta som som tal.
  const maxConnections = Number.parseInt(String(info?.max_connections ?? ''), 10)
  return {
    auth: info?.auth === 1 || info?.auth === '1' || info?.auth === true,
    status: typeof info?.status === 'string' ? info.status : null,
    expDate: Number.isFinite(exp) && exp > 0 ? exp : null,
    maxConnections: Number.isFinite(maxConnections) && maxConnections > 0 ? maxConnections : null,
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
