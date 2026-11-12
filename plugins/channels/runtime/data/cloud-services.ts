/**
 * Tjänstefilen: vilka molntjänster som finns och hur man talar med dem.
 *
 * Pluginet bär ingen tjänstekod. Filen ligger i det officiella pluginrepot
 * och hämtas via appens rutt för pluginkod (`/api/plugins/runtime`, som bara
 * släpper igenom repots värdar). Den senast hämtade kopian sparas i pluginets
 * lagring och gäller direkt vid nästa start; en ny hämtas i bakgrunden högst
 * en gång per dygn. Utan fil och utan kopia finns inga molntjänster.
 */

export const CLOUD_SERVICES_URL = 'https://raw.githubusercontent.com/lumiomedia/lumio-official-plugins/main/connectors/channels-cloud.js'

/** Så ofta en sparad kopia byts mot en nyhämtad. */
const REFRESH_MS = 24 * 60 * 60 * 1000
/** Efter ett misslyckat försök. */
const RETRY_MS = 10 * 60 * 1000
/** Så länge en listning väntar på filen innan den ger upp för den här gången. */
const READY_TIMEOUT_MS = 10_000

export interface CloudFileRef {
  provider: string
  fileRef: string
  name: string
  size: number
  season?: number
  episode?: number
}

/**
 * En fil med sitt sammanhang: paketets namn och mapparna mellan paketets rot
 * och filen. Filnamnet ensamt räcker inte — ett avsnitt döpt efter sin titel
 * matchades annars mot en film.
 */
export interface ListedFile {
  file: CloudFileRef
  /** Tjänst + paket-id: filerna i samma paket jämförs med varandra. */
  containerKey: string
  containerName: string
  folders: string[]
}

/**
 * `failed`: tjänsten gick inte att lista alls — resultatet får inte cachas.
 * `partial`: listningen gick men enstaka uppslag föll — cachas, men kort.
 */
export interface ProviderListing {
  files: ListedFile[]
  failed: boolean
  partial?: boolean
}

export type CloudRequestResult = { data: any | null; failure: { status: number; body: unknown } | null }

/** Det pluginet ger tjänstekoden att arbeta med. */
export interface CloudApi {
  getJson(path: string, init?: RequestInit): Promise<any | null>
  request(path: string, init?: RequestInit): Promise<CloudRequestResult>
  token: string
  pause(ms: number): Promise<unknown>
  pauseMs: number
  isVideo(name: string): boolean
  foldersOf(path: string, containerName: string): string[]
}

export interface CloudService {
  id: string
  /** Namnet som visas för kontot. */
  name: string
  base: string
  tokenParam?: string
  defaults?: string
  /** Nyckelrubriken i appar före vidarebefordringsrutten. */
  legacyHeader: string
  list(api: CloudApi): Promise<ProviderListing>
  unlock(api: CloudApi, fileRef: string): Promise<{ r: CloudRequestResult; url: unknown }>
}

export interface CloudServicesFile {
  version: number
  /** Id:t sparade kanaler bär för molnkällan (det äldre pluginversioner läser). */
  sourceId?: string
  services: CloudService[]
}

/** Tolkar tjänstefilens kod. Trasig eller oväntad kod ger null. */
export function evaluateCloudServices(code: string): CloudServicesFile | null {
  try {
    const value = new Function(`return (${code}\n)`)() as CloudServicesFile | null
    if (!value || !Array.isArray(value.services)) return null
    const services = value.services.filter((s) => s && typeof s.id === 'string' && typeof s.base === 'string' && typeof s.list === 'function' && typeof s.unlock === 'function')
    return { version: Number(value.version) || 0, ...(typeof value.sourceId === 'string' && value.sourceId ? { sourceId: value.sourceId } : {}), services }
  } catch {
    return null
  }
}

export interface StoredCloudServices { code: string; at: number }

export interface CloudServicesDeps {
  read(): StoredCloudServices | null
  write(value: StoredCloudServices): void
  /** Hämtar filens kod; null när det inte gick. */
  fetchCode(): Promise<string | null>
  now?(): number
}

/** Hämtar filens kod genom appen. */
export async function fetchCloudServicesCode(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(`/api/plugins/runtime?url=${encodeURIComponent(CLOUD_SERVICES_URL)}`)
    if (!response.ok) return null
    const body = (await response.json()) as { code?: unknown }
    return typeof body.code === 'string' && body.code.trim() ? body.code : null
  } catch {
    return null
  }
}

export function createCloudServices(deps: CloudServicesDeps) {
  const now = deps.now ?? Date.now
  let current: CloudServicesFile | null = null
  let loadedAt = 0
  let nextFetchAt = 0
  let inflight: Promise<CloudServicesFile | null> | null = null
  let restored = false

  function restore(): void {
    if (restored) return
    restored = true
    const stored = deps.read()
    if (!stored || typeof stored.code !== 'string') return
    const file = evaluateCloudServices(stored.code)
    if (!file) return
    current = file
    loadedAt = Number(stored.at) || 0
  }

  function refresh(): Promise<CloudServicesFile | null> {
    if (inflight) return inflight
    const run = (async () => {
      const code = await deps.fetchCode()
      const file = code ? evaluateCloudServices(code) : null
      if (code && file && file.services.length > 0) {
        current = file
        loadedAt = now()
        nextFetchAt = loadedAt + REFRESH_MS
        try { deps.write({ code, at: loadedAt }) } catch { /* full lagring: kopian i minnet gäller */ }
      } else {
        nextFetchAt = now() + RETRY_MS
      }
      return current
    })()
    inflight = run
    void run.finally(() => { if (inflight === run) inflight = null })
    return run
  }

  /** Filen som gäller nu (ur kopian eller nätet), eller null. Startar en hämtning när kopian är gammal. */
  function get(): CloudServicesFile | null {
    restore()
    const t = now()
    if (t >= nextFetchAt && (!current || t - loadedAt >= REFRESH_MS)) {
      nextFetchAt = t + RETRY_MS
      void refresh()
    }
    return current
  }

  /** Väntar in filen när ingen finns än. Ger upp efter en stund: en listning ska inte hänga. */
  function ready(): Promise<CloudServicesFile | null> {
    if (get()) return Promise.resolve(current)
    const waiting = inflight ?? refresh()
    return Promise.race([waiting, new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS))]).then(() => current)
  }

  return { get, ready, refresh }
}
