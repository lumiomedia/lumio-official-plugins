/**
 * Molnet som kanalkälla: det användaren redan har i sina molnkonton,
 * grupperat till titlar och matchat mot TMDb med appens filnamnstolk och
 * matchningscache (värdens neutrala hjälpare).
 *
 * Pluginet känner inte till någon tjänst. Vilka tjänster som finns, deras
 * adresser och hur man listar och låser upp filer hos dem står i tjänstefilen
 * (data/cloud-services.ts hämtar den och håller en kopia). Här finns det som
 * är gemensamt: anropen via appens vidarebefordring med nyckeln ur appens
 * lagring, grupperingen, matchningen och cachen. En tjänst utan nyckel hoppas
 * över; en som svarar fel ger en tom lista för just den.
 * Listan cachas i 6 h — molnet ändras sällan och varje genomgång är flera
 * anrop. Cachen nycklas på nyckeluppsättningen, samtida anrop delar en
 * genomgång, och en lista där enstaka uppslag föll cachas kortare i stället
 * för inte alls.
 */
import type { CloudApi, CloudService, CloudServicesFile, ListedFile, ProviderListing } from './cloud-services'

/** Tjänstens id, som tjänstefilen anger det. */
export type CloudServiceId = string

export interface CloudFile {
  provider: CloudServiceId
  fileRef: string
  name: string
  size: number
  season?: number
  episode?: number
}

export interface CloudTitle {
  kind: 'movie' | 'tv'
  title: string
  year: number | null
  tmdbId?: number
  imdbId?: string
  files: CloudFile[]
}

interface ParsedName { title: string; year: number | null; season: number | null; episode: number | null }

/** Värdens hjälpare (host.ts kopplar dem till SDK:t; testerna ger egna). */
export interface CloudDeps {
  /** Tjänstefilen, eller null innan den hämtats. */
  services(): CloudServicesFile | null
  /** Väntar in tjänstefilen (ur lagringen eller nätet); en lista byggd utan den vore tom i sex timmar. */
  servicesReady?(): Promise<unknown>
  token(provider: CloudServiceId): string | null
  parseFileName(fileName: string, parentFolder?: string): ParsedName | null
  matchTitles(wanted: Array<{ title: string; year: number | null; kind: 'movie' | 'tv' }>): Promise<Array<{ tmdbId: number } | null>>
  /** Paus mellan RD:s uppslag (testerna: 0). */
  pauseMs?: number
  /**
   * En upplåsning som inte gav någon adress: HTTP-status (0 = nätverksfel,
   * avbrott eller ingen nyckel) och svarets kropp. Loggas och avgör om
   * filen är död (data/dead-files).
   */
  onUnlockFailed?(provider: CloudServiceId, fileRef: string, status: number, body: unknown): void
}

export function createCloud(deps: CloudDeps) {
  const pauseMs = deps.pauseMs ?? 1000
  let cache: { key: string; at: number; ttl: number; titles: CloudTitle[] } | null = null
  let inflight: { key: string; promise: Promise<CloudTitle[]> } | null = null

  function tokenFor(provider: CloudServiceId): string | null {
    const value = deps.token(provider)
    return value && value.trim() ? value.trim() : null
  }

  /** Filnamnstolken: värdens, med en enkel reserv (bara titeln) om den saknas. */
  function parseLocalName(fileName: string, parentFolder?: string): ParsedName {
    return deps.parseFileName(fileName, parentFolder) ?? { title: fileName.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]+/g, ' ').trim(), year: null, season: null, episode: null }
  }

  const VIDEO = /\.(mkv|mp4|m4v|avi|mov|ts|m2ts|webm)$/i
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000
  /** Lista där enstaka uppslag föll: duger en stund, men ska fyllas på snart. */
  const PARTIAL_TTL_MS = 15 * 60 * 1000
  const FETCH_TIMEOUT_MS = 15_000
  /**
   * Appens vidarebefordring (`/api/plugin-relay`): tjänstefilen anger adress
   * och var nyckeln ska sitta, appen känner inte till någon tjänst. Appar
   * före rutten svarar 404 "route not found" på den; då används den äldre
   * vägen resten av sessionen.
   */
  const RELAY = '/api/plugin-relay'
  const LEGACY_BASE = '/api/stream-providers'
  let relayMissing = false

  function serviceOf(provider: CloudServiceId): CloudService | null {
    return deps.services()?.services.find((service) => service.id === provider) ?? null
  }

  function apiFor(service: CloudService): CloudApi {
    return {
      getJson: (path, init) => getJson(service.id, path, init),
      request: (path, init) => request(service.id, path, init),
      token: tokenFor(service.id) ?? '',
      pause,
      pauseMs,
      isVideo: (name) => VIDEO.test(name),
      foldersOf,
    }
  }

  /** Kort, icke-reversibel nyckel för tokenuppsättningen (tokens hålls inte i cachen). */
  function tokenSetKey(providers: CloudServiceId[]): string {
    let hash = 0x811c9dc5
    const text = providers.map((p) => `${p}=${tokenFor(p) ?? ''}`).join('&')
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return `${providers.join(',')}:${hash.toString(36)}`
  }


  type Failure = { status: number; body: unknown }

  async function getJson(provider: CloudServiceId, path: string, init?: RequestInit): Promise<any | null> {
    return (await request(provider, path, init)).data
  }

  /** Svaret, eller felet (status 0 = nätverksfel, avbrott eller ingen nyckel) för upplåsningens rapport. */
  async function request(provider: CloudServiceId, path: string, init?: RequestInit): Promise<{ data: any | null; failure: Failure | null }> {
    const token = tokenFor(provider)
    if (!token) return { data: null, failure: { status: 0, body: 'ingen nyckel' } }
    // Ett hängande leverantörsanrop får inte hålla kanalpoolen (eller uppspelningen) i evighet.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const service = serviceOf(provider)
      if (!service) return { data: null, failure: { status: 0, body: 'ingen tjänst' } }
      const viaLegacy = () => fetch(`${LEGACY_BASE}/${provider}${path}`, {
        ...init,
        headers: { ...(init?.headers ?? {}), [service.legacyHeader]: token },
        signal: controller.signal,
      })
      let response: Response
      if (relayMissing) {
        response = await viaLegacy()
      } else {
        response = await fetch(`${RELAY}${path}`, {
          ...init,
          headers: {
            ...(init?.headers ?? {}),
            'x-relay-base': service.base,
            'x-relay-token': token,
            ...(service.tokenParam ? { 'x-relay-token-param': service.tokenParam } : {}),
            ...(service.defaults ? { 'x-relay-defaults': service.defaults } : {}),
          },
          signal: controller.signal,
        })
        if (response.status === 404) {
          const body = await response.clone().json().catch(() => null)
          if (body?.error === 'route not found') {
            relayMissing = true
            response = await viaLegacy()
          }
        }
      }
      if (!response.ok) return { data: null, failure: { status: response.status, body: await response.json().catch(() => null) } }
      return { data: await response.json(), failure: null }
    } catch (e) {
      return { data: null, failure: { status: 0, body: String(e) } }
    } finally {
      clearTimeout(timer)
    }
  }

  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  /** Mapparna mellan paketets rot och filen; roten själv räknas inte. */
  function foldersOf(path: string, containerName: string): string[] {
    const parts = path.split(/[\\/]/).filter(Boolean)
    parts.pop()
    if (parts.length > 0 && (parts[0] === containerName || !containerName)) parts.shift()
    return parts
  }

  /**
   * Extramaterial som aldrig är en titel. Ordet räknas bara när det INTE också
   * står i paketets namn: "Trailer Park Boys" och "Extras" är serier.
   */
  const JUNK_WORDS = /(?:^|[\s._\-[(])(sample|trailers?|featurettes?|extras|bonus|behind[\s._-]the[\s._-]scenes|deleted[\s._-]scenes|interviews?|making[\s._-]of)(?=[\s._\-\])]|$)/gi
  /** Små filer bredvid en mycket större i samma paket är extramaterial. */
  const TINY_SHARE = 0.15
  const TINY_BYTES = 200 * 1024 * 1024

  function junkWords(text: string): Set<string> {
    return new Set(Array.from(text.matchAll(JUNK_WORDS), (m) => m[1].toLowerCase().replace(/[\s._-]+/g, ' ').replace(/s$/, '')))
  }

  function isJunk(entry: ListedFile, largest: number): boolean {
    const { size } = entry.file
    if (size > 0 && size < largest * TINY_SHARE && size < TINY_BYTES) return true
    const allowed = junkWords(entry.containerName)
    const stem = entry.file.name.replace(/\.[a-z0-9]{2,4}$/i, '')
    for (const word of [...junkWords(stem), ...entry.folders.flatMap((folder) => [...junkWords(folder)])]) {
      if (!allowed.has(word)) return true
    }
    return false
  }

  interface ContainerInfo {
    title: string
    year: number | null
    /** Säsongen när paketet gäller en enda (S02, Season 2); null för hela serier. */
    season: number | null
  }

  const SEASON_MARKER = /\b(?:s(\d{1,2})(?:\s*e\d{1,3})?|season\s*(\d{1,2})|s[äa]song\s*(\d{1,2}))\b/gi
  const SERIES_MARKER = /\b(?:complete[\s-]+series|the\s+complete|s\d{1,2}\s*-\s*s?\d{1,2})\b/i

  /** Paketnamnet som serie: titel + ev. säsong, eller null när namnet inte säger serie. */
  function parseSeriesContainer(name: string): ContainerInfo | null {
    const work = name.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (!work) return null
    const seasons = new Set<number>()
    let firstAt = -1
    for (const m of work.matchAll(SEASON_MARKER)) {
      const n = Number(m[1] ?? m[2] ?? m[3])
      if (Number.isFinite(n)) seasons.add(n)
      if (firstAt < 0) firstAt = m.index ?? 0
    }
    const seriesAt = work.search(SERIES_MARKER)
    if (seasons.size === 0 && seriesAt < 0) return null
    const cut = [firstAt, seriesAt].filter((i) => i >= 0)
    const head = work.slice(0, Math.min(...cut)).trim()
    // "Season 2" utan seriens namn: paketet säger inte VILKEN serie.
    if (!head) return null
    const parsed = parseLocalName(`${head}.mkv`)
    const title = parsed.title.replace(/[\s\-–(\[]+$/g, '').trim()
    if (!title) return null
    return { title, year: parsed.year, season: seasons.size === 1 && seriesAt < 0 ? [...seasons][0] : null }
  }

  /** Säsong ur en mapp ("Season 2", "S02", "Säsong 2"). */
  function seasonFromFolders(folders: string[]): number | null {
    for (const folder of [...folders].reverse()) {
      const m = folder.match(/^(?:season|s[äa]song|s)\s*(\d{1,2})\b/i) ?? folder.match(/\bs(\d{1,2})(?!\s*e\d)\b/i)
      if (m) return Number(m[1])
    }
    return null
  }

  /** Avsnittsnummer ur ett filnamn utan SxxEyy: "20 - To the Lighthouse", "E20", "Episode 20". */
  function episodeFromName(stem: string): number | null {
    const work = stem.replace(/[._]+/g, ' ').trim()
    const m = work.match(/^(\d{1,3})(?:\s*[-–]\s*|\s+)(?!\d)/) ?? work.match(/\b(?:e|ep|episode|avsnitt)\s*(\d{1,3})\b/i)
    if (!m) return null
    const n = Number(m[1])
    return n >= 1 ? n : null
  }

  interface Placed {
    kind: 'movie' | 'tv'
    title: string
    year: number | null
    season?: number
    episode?: number
  }

  /**
   * Var hör filen hemma? Paketnamnet först: säger det serie grupperas filen
   * under serien (avsnittet ur filnamnet, säsongen ur filnamnet, mappen eller
   * paketet) — och en fil i en seriepaket som inte går att placera blir
   * aldrig en film. Bara när paketnamnet inte säger något gäller filnamnet.
   */
  function placeFile(entry: ListedFile): Placed | null {
    const parsed = parseLocalName(entry.file.name, entry.folders[entry.folders.length - 1] ?? (entry.containerName || undefined))
    const series = parseSeriesContainer(entry.containerName)
    if (series) {
      const stem = entry.file.name.replace(/\.[a-z0-9]{2,4}$/i, '')
      const season = parsed.season ?? seasonFromFolders(entry.folders) ?? series.season
      const episode = parsed.episode ?? episodeFromName(stem)
      if (season == null || episode == null) return null
      return { kind: 'tv', title: series.title, year: series.year, season, episode }
    }
    if (parsed.season != null && parsed.episode != null) {
      return { kind: 'tv', title: parsed.title, year: parsed.year ?? null, season: parsed.season, episode: parsed.episode }
    }
    return { kind: 'movie', title: parsed.title, year: parsed.year ?? null }
  }

  function groupFiles(entries: ListedFile[]): CloudTitle[] {
    const largest = new Map<string, number>()
    for (const entry of entries) largest.set(entry.containerKey, Math.max(largest.get(entry.containerKey) ?? 0, entry.file.size))
    const groups = new Map<string, CloudTitle>()
    for (const entry of entries) {
      if (isJunk(entry, largest.get(entry.containerKey) ?? 0)) continue
      const placed = placeFile(entry)
      if (!placed) continue
      const norm = placed.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (!norm) continue
      const key = placed.kind === 'tv' ? `tv:${norm}` : `movie:${norm}:${placed.year ?? ''}`
      const group = groups.get(key) ?? { kind: placed.kind, title: placed.title, year: placed.year, files: [] }
      group.files.push(placed.kind === 'tv' ? { ...entry.file, season: placed.season!, episode: placed.episode! } : entry.file)
      groups.set(key, group)
    }
    return [...groups.values()]
  }

  async function listCloud(options: { force?: boolean } = {}): Promise<CloudTitle[]> {
    if (!deps.services()) await deps.servicesReady?.().catch(() => null)
    const providers = (deps.services()?.services ?? []).map((service) => service.id).filter((p) => tokenFor(p))
    if (providers.length === 0) return []
    const key = tokenSetKey(providers)
    if (!options.force && cache && cache.key === key && Date.now() - cache.at < cache.ttl) return cache.titles
    // Varje kanal laddar sin pool samtidigt vid kallstart: en genomgång delas av alla.
    if (inflight && inflight.key === key) return inflight.promise
    const entry = { key, promise: sweep(providers, key) }
    inflight = entry
    void entry.promise.finally(() => { if (inflight === entry) inflight = null }).catch(() => {})
    return entry.promise
  }

  async function sweep(providers: CloudServiceId[], key: string): Promise<CloudTitle[]> {
    const listings = await Promise.all(providers.map(async (provider): Promise<ProviderListing> => {
      const service = serviceOf(provider)
      if (!service) return { files: [], failed: true }
      // En trasig tjänstefil får inte fälla de andra tjänsterna.
      return service.list(apiFor(service)).catch(() => ({ files: [], failed: true }))
    }))
    const titles = groupFiles(listings.flatMap((l) => l.files))
    const hits = await deps.matchTitles(titles.map((t) => ({ title: t.title, year: t.year, kind: t.kind })))
    hits.forEach((hit, index) => {
      if (!hit) return
      // TmdbSearchHit har bara tmdbId; imdbId lämnas osatt (pluginet slår upp det vid behov).
      titles[index].tmdbId = hit.tmdbId
    })
    // Ett övergående leverantörsfel får inte gömma leverantören i 6 h: en listning
    // som föll cachas inte alls, en med enstaka fallna uppslag bara kort.
    if (!listings.some((l) => l.failed)) {
      const ttl = listings.some((l) => l.partial) ? PARTIAL_TTL_MS : CACHE_TTL_MS
      cache = { key, at: Date.now(), ttl, titles }
    }
    return titles
  }

  async function unlock(input: { provider: CloudServiceId; fileRef: string }): Promise<{ url: string } | { failure: Failure }> {
    const { provider, fileRef } = input
    const service = serviceOf(provider)
    if (!service) return { failure: { status: 0, body: 'ingen tjänst' } }
    if (!tokenFor(provider)) return { failure: { status: 0, body: 'ingen nyckel' } }
    const { r, url } = await service.unlock(apiFor(service), fileRef)
    // Ett 200-svar utan adress räknas som fel med sin kropp.
    return typeof url === 'string' ? { url } : { failure: r.failure ?? { status: 200, body: r.data } }
  }

  async function unlockCloudFile(input: { provider: CloudServiceId; fileRef: string }): Promise<{ url: string } | null> {
    const result = await unlock(input)
    if ('url' in result) return result
    deps.onUnlockFailed?.(input.provider, input.fileRef, result.failure.status, result.failure.body)
    return null
  }

  return { listCloud, unlockCloudFile }
}
