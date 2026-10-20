/**
 * Debrid-molnet som kanalkälla: vad användaren redan har i sitt RD/TorBox/
 * AllDebrid-konto, grupperat till titlar och matchat mot TMDb med appens
 * filnamnstolk och matchningscache (värdens neutrala hjälpare).
 *
 * Flyttat ut ur appkärnan 2026-10-20: kärnan namnger inga tjänster. Pluginet
 * talar tjänsternas protokoll via appens befintliga proxyer
 * (/api/stream-providers/<id>/…) med nyckeln ur appens lagring. En leverantör
 * utan nyckel hoppas över; en som svarar fel ger en tom lista för just den.
 * AllDebrids bas-URL saknar versionssegment, så sökvägarna bär /v4 resp. /v4.1.
 * Listan cachas i 6 h — molnet ändras sällan och varje genomgång är flera
 * anrop mot leverantören. Cachen nycklas på nyckeluppsättningen, samtida anrop
 * delar en genomgång, och en lista där enstaka torrentuppslag föll cachas
 * kortare i stället för inte alls.
 */

export type DebridProviderId = 'realdebrid' | 'torbox' | 'alldebrid'
export const DEBRID_PROVIDERS: DebridProviderId[] = ['realdebrid', 'torbox', 'alldebrid']

export interface DebridCloudFile {
  provider: DebridProviderId
  fileRef: string
  name: string
  size: number
  season?: number
  episode?: number
}

export interface DebridCloudTitle {
  kind: 'movie' | 'tv'
  title: string
  year: number | null
  tmdbId?: number
  imdbId?: string
  files: DebridCloudFile[]
}

interface ParsedName { title: string; year: number | null; season: number | null; episode: number | null }

/** Värdens hjälpare (host.ts kopplar dem till SDK:t; testerna ger egna). */
export interface CloudDeps {
  token(provider: DebridProviderId): string | null
  parseFileName(fileName: string, parentFolder?: string): ParsedName | null
  matchTitles(wanted: Array<{ title: string; year: number | null; kind: 'movie' | 'tv' }>): Promise<Array<{ tmdbId: number } | null>>
  /** Paus mellan RD:s torrentuppslag (testerna: 0). */
  pauseMs?: number
}

export function createDebridCloud(deps: CloudDeps) {
  const pauseMs = deps.pauseMs ?? 1000
  let cache: { key: string; at: number; ttl: number; titles: DebridCloudTitle[] } | null = null
  let inflight: { key: string; promise: Promise<DebridCloudTitle[]> } | null = null

  function tokenFor(provider: DebridProviderId): string | null {
    const value = deps.token(provider)
    return value && value.trim() ? value.trim() : null
  }

  /** Filnamnstolken: värdens, med en enkel reserv (bara titeln) om den saknas. */
  function parseLocalName(fileName: string, parentFolder?: string): ParsedName {
    return deps.parseFileName(fileName, parentFolder) ?? { title: fileName.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]+/g, ' ').trim(), year: null, season: null, episode: null }
  }

  const VIDEO = /\.(mkv|mp4|m4v|avi|mov|ts|m2ts|webm)$/i
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000
  /** Lista där enstaka torrentuppslag föll: duger en stund, men ska fyllas på snart. */
  const PARTIAL_TTL_MS = 15 * 60 * 1000
  const FETCH_TIMEOUT_MS = 15_000
  const BASE = '/api/stream-providers'

  const TOKEN_HEADERS: Record<DebridProviderId, string> = {
    realdebrid: 'x-stream-provider-token',
    torbox: 'x-tb-token',
    alldebrid: 'x-ad-token',
  }

  /** Kort, icke-reversibel nyckel för tokenuppsättningen (tokens hålls inte i cachen). */
  function tokenSetKey(providers: DebridProviderId[]): string {
    let hash = 0x811c9dc5
    const text = providers.map((p) => `${p}=${tokenFor(p) ?? ''}`).join('&')
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return `${providers.join(',')}:${hash.toString(36)}`
  }


  async function getJson(provider: DebridProviderId, path: string, init?: RequestInit): Promise<any | null> {
    const token = tokenFor(provider)
    if (!token) return null
    // Ett hängande leverantörsanrop får inte hålla kanalpoolen (eller uppspelningen) i evighet.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(`${BASE}/${provider}${path}`, {
        ...init,
        headers: { ...(init?.headers ?? {}), [TOKEN_HEADERS[provider]]: token },
        signal: controller.signal,
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  /**
   * `failed`: själva listningen föll — skiljer det från ett tomt konto och hindrar cachning.
   * `partial`: listningen gick men enstaka uppslag föll — cachas, men kort.
   */
  interface ProviderListing {
    files: ListedFile[]
    failed: boolean
    partial?: boolean
  }

  /**
   * En fil med sitt sammanhang: torrentens (magnetens) namn och mapparna mellan
   * torrentroten och filen. Filnamnet ensamt räcker inte — ett avsnitt döpt
   * efter sin titel ("To the Lighthouse", Terminator: The Sarah Connor
   * Chronicles S02E20) matchades mot en film från 1983.
   */
  interface ListedFile {
    file: DebridCloudFile
    /** Leverantör + torrent-id: filerna i samma torrent jämförs med varandra. */
    torrentKey: string
    torrentName: string
    folders: string[]
  }

  /** Mapparna mellan torrentroten och filen; roten själv räknas inte. */
  function foldersOf(path: string, torrentName: string): string[] {
    const parts = path.split(/[\\/]/).filter(Boolean)
    parts.pop()
    if (parts.length > 0 && (parts[0] === torrentName || !torrentName)) parts.shift()
    return parts
  }

  async function listRealDebrid(): Promise<ProviderListing> {
    const torrents = await getJson('realdebrid', '/torrents?limit=100')
    if (!Array.isArray(torrents)) return { files: [], failed: true }
    const files: ListedFile[] = []
    let partial = false
    for (const torrent of torrents) {
      if (torrent?.status !== 'downloaded') continue
      // Högst ett anrop per sekund mot RD (deras gräns är generös men delad
      // med användarens egna uppslag).
      await pause(pauseMs)
      const info = await getJson('realdebrid', `/torrents/info/${encodeURIComponent(torrent.id)}`)
      if (!info) {
        partial = true
        continue
      }
      const selected = (info.files ?? []).filter((file: any) => file.selected === 1)
      const links: string[] = info.links ?? []
      const torrentName = String(torrent.filename ?? info.filename ?? info.original_filename ?? '')
      selected.forEach((file: any, index: number) => {
        const path = String(file.path ?? '')
        const name = path.split('/').pop() ?? ''
        const link = links[index]
        if (!link || !VIDEO.test(name)) return
        files.push({
          file: { provider: 'realdebrid', fileRef: `${torrent.id}|${link}`, name, size: Number(file.bytes) || 0 },
          torrentKey: `realdebrid:${torrent.id}`,
          torrentName,
          folders: foldersOf(path, torrentName),
        })
      })
    }
    return { files, failed: false, partial }
  }

  async function listTorBox(): Promise<ProviderListing> {
    const body = await getJson('torbox', '/torrents/mylist?bypass_cache=true')
    if (!body) return { files: [], failed: true }
    const torrents = Array.isArray(body.data) ? body.data : []
    const files: ListedFile[] = []
    for (const torrent of torrents) {
      const torrentName = String(torrent?.name ?? '')
      for (const file of torrent?.files ?? []) {
        const name = String(file.short_name ?? file.name ?? '').split('/').pop() ?? ''
        if (!VIDEO.test(name)) continue
        files.push({
          file: { provider: 'torbox', fileRef: `${torrent.id}|${file.id}`, name, size: Number(file.size) || 0 },
          torrentKey: `torbox:${torrent.id}`,
          torrentName,
          folders: foldersOf(String(file.name ?? name), torrentName),
        })
      }
    }
    return { files, failed: false }
  }

  /** AllDebrid-svar kan ha magnets som lista eller som objekt nyckel→magnet. */
  function asList<T>(value: T[] | Record<string, T> | undefined): T[] {
    if (Array.isArray(value)) return value
    return value && typeof value === 'object' ? Object.values(value) : []
  }

  interface AdFileNode { n: string; s?: number; l?: string; e?: AdFileNode[] }

  function flattenAdFiles(nodes: AdFileNode[], parent = ''): Array<{ path: string; bytes: number; link: string }> {
    const out: Array<{ path: string; bytes: number; link: string }> = []
    for (const node of nodes) {
      const path = parent ? `${parent}/${node.n}` : node.n
      if (node.e?.length) out.push(...flattenAdFiles(node.e, path))
      else if (node.l) out.push({ path, bytes: node.s ?? 0, link: node.l })
    }
    return out
  }

  const AD_FORM = { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }

  // Samma flöde som streams-pluginets AllDebrid-leverantör: POST /v4.1/magnet/status
  // (statusCode 4 = klar), sedan POST /v4.1/magnet/files med ett nästlat filträd.
  async function listAllDebrid(): Promise<ProviderListing> {
    const status = await getJson('alldebrid', '/v4.1/magnet/status', { method: 'POST', headers: AD_FORM, body: '' })
    if (status?.status !== 'success') return { files: [], failed: true }
    const ready = asList<any>(status.data?.magnets).filter((m) => Number(m?.statusCode) === 4 && m?.id != null)
    if (ready.length === 0) return { files: [], failed: false }
    const form = new URLSearchParams()
    for (const magnet of ready) form.append('id[]', String(magnet.id))
    const filesBody = await getJson('alldebrid', '/v4.1/magnet/files', { method: 'POST', headers: AD_FORM, body: form.toString() })
    if (filesBody?.status !== 'success') return { files: [], failed: true }
    const files: ListedFile[] = []
    const namesById = new Map(ready.map((m) => [String(m.id), String(m.filename ?? '')]))
    for (const magnet of asList<any>(filesBody.data?.magnets)) {
      if (magnet?.error) continue
      const torrentName = namesById.get(String(magnet?.id)) ?? ''
      for (const file of flattenAdFiles(magnet?.files ?? [])) {
        const name = file.path.split('/').pop() ?? ''
        if (!VIDEO.test(name)) continue
        files.push({
          file: { provider: 'alldebrid', fileRef: file.link, name, size: file.bytes },
          torrentKey: `alldebrid:${magnet?.id}`,
          torrentName,
          folders: foldersOf(file.path, torrentName),
        })
      }
    }
    return { files, failed: false }
  }

  /**
   * Extramaterial som aldrig är en titel. Ordet räknas bara när det INTE också
   * står i torrentens namn: "Trailer Park Boys" och "Extras" är serier.
   */
  const JUNK_WORDS = /(?:^|[\s._\-[(])(sample|trailers?|featurettes?|extras|bonus|behind[\s._-]the[\s._-]scenes|deleted[\s._-]scenes|interviews?|making[\s._-]of)(?=[\s._\-\])]|$)/gi
  /** Små filer bredvid en mycket större i samma torrent är extramaterial. */
  const TINY_SHARE = 0.15
  const TINY_BYTES = 200 * 1024 * 1024

  function junkWords(text: string): Set<string> {
    return new Set(Array.from(text.matchAll(JUNK_WORDS), (m) => m[1].toLowerCase().replace(/[\s._-]+/g, ' ').replace(/s$/, '')))
  }

  function isJunk(entry: ListedFile, largest: number): boolean {
    const { size } = entry.file
    if (size > 0 && size < largest * TINY_SHARE && size < TINY_BYTES) return true
    const allowed = junkWords(entry.torrentName)
    const stem = entry.file.name.replace(/\.[a-z0-9]{2,4}$/i, '')
    for (const word of [...junkWords(stem), ...entry.folders.flatMap((folder) => [...junkWords(folder)])]) {
      if (!allowed.has(word)) return true
    }
    return false
  }

  interface ContainerInfo {
    title: string
    year: number | null
    /** Säsongen när torrenten gäller en enda (S02, Season 2); null för hela serier. */
    season: number | null
  }

  const SEASON_MARKER = /\b(?:s(\d{1,2})(?:\s*e\d{1,3})?|season\s*(\d{1,2})|s[äa]song\s*(\d{1,2}))\b/gi
  const SERIES_MARKER = /\b(?:complete[\s-]+series|the\s+complete|s\d{1,2}\s*-\s*s?\d{1,2})\b/i

  /** Torrentnamnet som serie: titel + ev. säsong, eller null när namnet inte säger serie. */
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
    // "Season 2" utan seriens namn: torrenten säger inte VILKEN serie.
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
   * Var hör filen hemma? Torrentnamnet först: säger det serie grupperas filen
   * under serien (avsnittet ur filnamnet, säsongen ur filnamnet, mappen eller
   * torrenten) — och en fil i en serietorrent som inte går att placera blir
   * aldrig en film. Bara när torrentnamnet inte säger något gäller filnamnet.
   */
  function placeFile(entry: ListedFile): Placed | null {
    const parsed = parseLocalName(entry.file.name, entry.folders[entry.folders.length - 1] ?? (entry.torrentName || undefined))
    const series = parseSeriesContainer(entry.torrentName)
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

  function groupFiles(entries: ListedFile[]): DebridCloudTitle[] {
    const largest = new Map<string, number>()
    for (const entry of entries) largest.set(entry.torrentKey, Math.max(largest.get(entry.torrentKey) ?? 0, entry.file.size))
    const groups = new Map<string, DebridCloudTitle>()
    for (const entry of entries) {
      if (isJunk(entry, largest.get(entry.torrentKey) ?? 0)) continue
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

  function listDebridCloud(options: { force?: boolean } = {}): Promise<DebridCloudTitle[]> {
    const providers = DEBRID_PROVIDERS.filter((p) => tokenFor(p))
    if (providers.length === 0) return Promise.resolve([])
    const key = tokenSetKey(providers)
    if (!options.force && cache && cache.key === key && Date.now() - cache.at < cache.ttl) return Promise.resolve(cache.titles)
    // Varje kanal laddar sin pool samtidigt vid kallstart: en genomgång delas av alla.
    if (inflight && inflight.key === key) return inflight.promise
    const entry = { key, promise: sweep(providers, key) }
    inflight = entry
    void entry.promise.finally(() => { if (inflight === entry) inflight = null }).catch(() => {})
    return entry.promise
  }

  async function sweep(providers: DebridProviderId[], key: string): Promise<DebridCloudTitle[]> {
    const listings = await Promise.all(providers.map((provider) => {
      if (provider === 'realdebrid') return listRealDebrid()
      if (provider === 'torbox') return listTorBox()
      return listAllDebrid()
    }))
    const titles = groupFiles(listings.flatMap((l) => l.files))
    const hits = await deps.matchTitles(titles.map((t) => ({ title: t.title, year: t.year, kind: t.kind })))
    hits.forEach((hit, index) => {
      if (!hit) return
      // TmdbSearchHit har bara tmdbId; imdbId lämnas osatt (pluginet slår upp det vid behov).
      titles[index].tmdbId = hit.tmdbId
    })
    // Ett övergående leverantörsfel får inte gömma leverantören i 6 h: en listning
    // som föll cachas inte alls, en med enstaka fallna torrentuppslag bara kort.
    if (!listings.some((l) => l.failed)) {
      const ttl = listings.some((l) => l.partial) ? PARTIAL_TTL_MS : CACHE_TTL_MS
      cache = { key, at: Date.now(), ttl, titles }
    }
    return titles
  }

  async function unrestrictDebridFile(input: { provider: DebridProviderId; fileRef: string }): Promise<{ url: string } | null> {
    const { provider, fileRef } = input
    if (provider === 'realdebrid') {
      const link = fileRef.split('|').slice(1).join('|')
      const body = await getJson('realdebrid', '/unrestrict/link', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: `link=${encodeURIComponent(link)}`,
      })
      return typeof body?.download === 'string' ? { url: body.download } : null
    }
    if (provider === 'torbox') {
      const [torrentId, fileId] = fileRef.split('|')
      const token = tokenFor('torbox')
      if (!token) return null
      const body = await getJson('torbox', `/torrents/requestdl?token=${encodeURIComponent(token)}&torrent_id=${encodeURIComponent(torrentId)}&file_id=${encodeURIComponent(fileId)}&redirect=false`)
      return typeof body?.data === 'string' ? { url: body.data } : null
    }
    const body = await getJson('alldebrid', '/v4/link/unlock', {
      method: 'POST',
      headers: AD_FORM,
      body: new URLSearchParams({ link: fileRef }).toString(),
    })
    return typeof body?.data?.link === 'string' ? { url: body.data.link } : null
  }

  return { listDebridCloud, unrestrictDebridFile }
}
