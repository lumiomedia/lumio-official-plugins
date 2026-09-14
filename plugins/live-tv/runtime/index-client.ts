'use client'

/**
 * Typed client for the app's channel-index, import-job and EPG endpoints
 * (`/api/live-tv/...`). Channels and programmes never touch plugin storage —
 * this module only talks to the app over `fetch` (same origin) and hands
 * back plain data / job handles for the data layer and model to cache in
 * memory (spec 2026-09-14-live-tv-storage-v2-design.md, sections 3.1–3.3).
 */

import type { M3uChannel } from './live-tv-data'
import type { EpgProgramme, NowNextLater } from './epg/types'

export interface IndexChannel extends M3uChannel {
  key: string
  number: number
  tvgIdResolved: string | null
}

export interface ImportResult {
  total: number
  groups: { name: string; count: number }[]
  urlTvg: string | null
  truncated: boolean
}

export interface ImportStatus {
  state: 'fetching' | 'parsing' | 'writing' | 'done' | 'error'
  received: number
  total?: number
  error?: string
  result?: ImportResult
}

export interface XtreamImportSource {
  base: string
  username: string
  password: string
  format: string
  categoryIds?: string[]
}

/** En kanal redo att batchas till indexet — samma nyckel/nummer som appen härleder vid en jobbimport. */
export interface BatchChannel extends M3uChannel {
  key: string
  number: number
}

/** Bus for "the on-disk index changed" (import finished, migration ran, …). */
export const INDEX_CHANGED_EVENT = 'lumio-live-tv-index-changed'

export function emitIndexChanged(): void {
  window.dispatchEvent(new CustomEvent(INDEX_CHANGED_EVENT))
}

export function onIndexChanged(cb: () => void): () => void {
  const handler = () => cb()
  window.addEventListener(INDEX_CHANGED_EVENT, handler)
  return () => window.removeEventListener(INDEX_CHANGED_EVENT, handler)
}

const QUERY_PAGE_LIMIT = 5000
const LOOKUP_CHUNK_SIZE = 200
const EPG_SCHEDULE_CHUNK_SIZE = 200
const BATCH_CHUNK_SIZE = 1000

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/**
 * A non-OK response throws an Error carrying the HTTP status in its message
 * so callers (job polling, settings UI) can distinguish transient failures.
 */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}`)
  }
  return (await res.json()) as T
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function queryChannels(opts: {
  source?: string
  group?: string
  q?: string
  offset: number
  limit: number
  signal?: AbortSignal
}): Promise<{ items: IndexChannel[]; total: number; known: boolean }> {
  const qs = buildQuery({
    source: opts.source,
    group: opts.group,
    q: opts.q,
    offset: opts.offset,
    limit: opts.limit,
  })
  const data = await requestJson<{ items?: IndexChannel[]; total?: number; known?: boolean }>(
    `/api/live-tv/query${qs}`,
    opts.signal ? { signal: opts.signal } : undefined,
  )
  return { items: data.items ?? [], total: data.total ?? 0, known: Boolean(data.known) }
}

/**
 * Pages through the index in 5 000-item pages until a short page is seen.
 *
 * `signal` avbryter BÅDE den pågående sidan och resten av slingan: ett
 * spellistbyte mitt i en 17 000-kanalers hämtning lämnade annars tre sidor kvar
 * som laddades klart, skrevs till minnescachen och kunde skriva över den nya
 * källans resultat.
 */
export async function loadAllChannels(
  source: string | null,
  onPage?: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<IndexChannel[]> {
  const items: IndexChannel[] = []
  let offset = 0
  for (;;) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
    const page = await queryChannels({ source: source ?? undefined, offset, limit: QUERY_PAGE_LIMIT, signal })
    items.push(...page.items)
    onPage?.(items.length, page.total)
    if (page.items.length < QUERY_PAGE_LIMIT) break
    offset += QUERY_PAGE_LIMIT
  }
  return items
}

/** Chunks into batches of 200 keys per request (favourites, history, reminders). */
export async function lookupChannels(keys: string[]): Promise<IndexChannel[]> {
  const results: IndexChannel[] = []
  for (const group of chunk(keys, LOOKUP_CHUNK_SIZE)) {
    const data = await postJson<{ items?: IndexChannel[] }>('/api/live-tv/lookup', { keys: group })
    results.push(...(data.items ?? []))
  }
  return results
}

export async function searchChannels(q: string, limit?: number): Promise<IndexChannel[]> {
  const qs = buildQuery({ q, limit })
  const data = await requestJson<{ items?: IndexChannel[] }>(`/api/live-tv/search${qs}`)
  return data.items ?? []
}

export async function listGroups(source: string | null): Promise<{ name: string; count: number }[]> {
  const qs = buildQuery({ source: source ?? undefined })
  const data = await requestJson<{ groups?: { name: string; count: number }[] }>(`/api/live-tv/groups${qs}`)
  return data.groups ?? []
}

export interface IndexSourceStatus {
  id: string
  channels: number
  updatedAt: number
}

/**
 * Vilka källor indexet redan känner till (enhetsöverföring:
 * `importMissingSources`).
 *
 * Appen svarar med OBJEKT — `{ sources: [{ id, channels, updatedAt }] }` —
 * inte med rena strängar. Klienten typade svaret som `string[]`, så
 * `new Set(sources).has(list.source)` var alltid falskt och VARJE m3u-/
 * Xtream-lista importerades om vid varje start på varje enhet (spec §3.4
 * säger att bara SAKNADE källor ska hämtas). `sourceIds` är därför den form
 * anroparen jämför mot; mappningen tar också emot en ren sträng, så en äldre
 * app som fortfarande svarar i det formatet inte faller igenom till samma
 * bugg åt andra hållet.
 */
export async function indexStatus(): Promise<{ sourceIds: string[]; sources: IndexSourceStatus[] }> {
  const data = await requestJson<{ sources?: Array<IndexSourceStatus | string> }>('/api/live-tv/status', { cache: 'no-store' })
  const sources = (data.sources ?? []).map((entry) => (typeof entry === 'string'
    ? { id: entry, channels: 0, updatedAt: 0 }
    : { id: String(entry.id ?? ''), channels: entry.channels ?? 0, updatedAt: entry.updatedAt ?? 0 }))
    .filter((entry) => entry.id.length > 0)
  return { sourceIds: sources.map((entry) => entry.id), sources }
}

/**
 * Skriver kanaler direkt till en källa i indexet (befintlig `/batch`-endpoint,
 * inte importjobbet) — bara migreringen av gamla, inbäddade listor använder
 * den här. `replace` gäller bara den FÖRSTA chunken; resten läggs till, annars
 * hade chunk 2+ nollat det chunk 1 just skrev.
 */
export async function batchChannels(source: string, channels: BatchChannel[], replace: boolean): Promise<void> {
  const batches = channels.length > 0 ? chunk(channels, BATCH_CHUNK_SIZE) : [[]]
  for (let i = 0; i < batches.length; i += 1) {
    await postJson('/api/live-tv/batch', { source, replace: replace && i === 0, channels: batches[i] })
  }
}

/**
 * Tömmer EN källa ur appens index (`ResetBody { source }` i `live_tv_index.rs`).
 *
 * Anropas när en spellista tas bort: raden försvann ur `lists`, men kanalerna
 * låg kvar i indexet och kom tillbaka i varje `/query` UTAN källa — "alla
 * kanaler" visade fortfarande den borttagna listan, och en ny lista med samma
 * namn ärvde dess innehåll. Utan `source` skulle endpointen tömma HELA indexet
 * (alla källor), så argumentet är obligatoriskt här.
 */
export async function resetSource(source: string): Promise<void> {
  await postJson('/api/live-tv/reset', { source })
}

/**
 * Ber appen komplettera reservlogotyper (`logoFallback`) för en källas
 * kanaler mot iptv-org-registret ("Komplettera"-knappen). Går INTE via
 * `postJson`/`requestJson`: ett fel-svar här bär appens feltext rakt i
 * kroppen (inte JSON), så den läses som text och blir felmeddelandet — annars
 * hade anroparen bara sett "returned 502" utan att veta varför. Kanalerna i
 * indexet ändrades faktiskt vid ett lyckat svar, så `emitIndexChanged()`
 * krävs precis som i `resetSource`.
 */
export async function completeLogos(source: string): Promise<{ matched: number; total: number }> {
  const res = await fetch('/api/live-tv/logo-fallback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `/api/live-tv/logo-fallback returned ${res.status}`)
  }
  const data = (await res.json()) as { matched?: number; total?: number }
  emitIndexChanged()
  return { matched: data.matched ?? 0, total: data.total ?? 0 }
}

export async function startImport(body: {
  source: string
  m3u?: { url: string }
  xtream?: XtreamImportSource
}): Promise<string> {
  const data = await postJson<{ job: string }>('/api/live-tv/import', body)
  return data.job
}

export async function importStatus(job: string): Promise<ImportStatus> {
  const qs = buildQuery({ job })
  return requestJson<ImportStatus>(`/api/live-tv/import/status${qs}`)
}

/** Polls every `pollMs` until the job reaches `done` or `error`, then resolves. */
export async function waitForJob(
  job: string,
  onProgress?: (status: ImportStatus) => void,
  pollMs = 500,
): Promise<ImportStatus> {
  for (;;) {
    const status = await importStatus(job)
    onProgress?.(status)
    if (status.state === 'done' || status.state === 'error') return status
    await new Promise<void>((resolve) => setTimeout(resolve, pollMs))
  }
}

/**
 * Ber appen hämta om EPG:t. Svaret är ett JOBB av samma modell som importen,
 * och dess `result` återanvänder `ImportResult`-formen: `total` är antalet
 * PROGRAM (inte kanaler) och kanalantalet ligger i `groups[0]`. Koppla därför
 * ALDRIG importens framstegs-UI ("Hämtar 12 000 av 17 000 kanaler…") till ett
 * EPG-jobb — samma fält betyder olika saker.
 */
export async function refreshEpg(
  listId: string,
  urls: string[],
  sources: string[],
  force?: boolean,
): Promise<string> {
  const data = await postJson<{ job: string }>('/api/live-tv/epg/refresh', { listId, urls, sources, force })
  return data.job
}

/** Diagnostik per EPG-adress, så som appen ser den efter senaste hämtningen. */
export interface EpgSourceStatus {
  url: string
  channels: number
  programmes: number
  error?: string
  /** Unix-ms. 0 när adressen aldrig hämtats. */
  fetchedAt: number
}

export interface EpgStatus {
  listId: string
  fetchedAt: number | null
  failedAt: number | null
  channels: number
  programmes: number
  urls: EpgSourceStatus[]
}

/**
 * Vad appens EPG-butik innehåller för en lista, per adress. Ersätter pluginets
 * egen XMLTV-cache (`epg/cache.ts`): webviewn laddade tidigare ner samma
 * tablå en gång till bara för att kunna visa "3 kanaler / 812 program" i
 * inställningarna. En saknad butik är inte ett fel utan "inget hämtat än" —
 * appen svarar med nollor, inte 404.
 */
export async function epgStatus(listId: string): Promise<EpgStatus> {
  const qs = buildQuery({ listId })
  const data = await requestJson<Partial<EpgStatus>>(`/api/live-tv/epg/status${qs}`)
  return {
    listId: data.listId ?? listId,
    fetchedAt: data.fetchedAt ?? null,
    failedAt: data.failedAt ?? null,
    channels: data.channels ?? 0,
    programmes: data.programmes ?? 0,
    urls: (data.urls ?? []).map((entry) => ({
      url: entry.url,
      channels: entry.channels ?? 0,
      programmes: entry.programmes ?? 0,
      ...(entry.error ? { error: entry.error } : {}),
      fetchedAt: entry.fetchedAt ?? 0,
    })),
  }
}

export async function epgNow(opts: {
  source?: string
  listId: string
  at?: number
}): Promise<{ at: number; fetchedAt: number | null; items: Record<string, NowNextLater> }> {
  const qs = buildQuery({ source: opts.source, listId: opts.listId, at: opts.at })
  const data = await requestJson<{
    at: number
    fetchedAt?: number | null
    items?: Record<string, Partial<NowNextLater>>
  }>(`/api/live-tv/epg/now${qs}`)
  const items: Record<string, NowNextLater> = {}
  for (const [key, value] of Object.entries(data.items ?? {})) {
    items[key] = { now: value.now ?? null, next: value.next ?? null, later: value.later ?? null }
  }
  return { at: data.at, fetchedAt: data.fetchedAt ?? null, items }
}

/**
 * Tablåer per kanalnyckel. POST med JSON-kropp, inte querysträng: nyckeln är
 * `namn::url` och BÅDA delarna kan innehålla komma — en kommaseparerad
 * `keys`-parameter hade delat mitt i ett kanalnamn och tyst tappat tablån för
 * just de kanalerna. Chunkas 200 nycklar per anrop och slås ihop.
 */
export async function epgSchedule(
  listId: string,
  keys: string[],
  from: number,
  to: number,
): Promise<Record<string, EpgProgramme[]>> {
  const merged: Record<string, EpgProgramme[]> = {}
  for (const group of chunk(keys, EPG_SCHEDULE_CHUNK_SIZE)) {
    const data = await postJson<{ items?: Record<string, EpgProgramme[]> }>('/api/live-tv/epg/schedule', {
      listId,
      keys: group,
      from,
      to,
    })
    Object.assign(merged, data.items ?? {})
  }
  return merged
}

export async function epgSearch(
  listId: string,
  q: string,
  from: number,
  to: number,
  limit?: number,
): Promise<{ key: string; programme: EpgProgramme }[]> {
  const qs = buildQuery({ listId, q, from, to, limit })
  const data = await requestJson<{ items?: { key: string; programme: EpgProgramme }[] }>(
    `/api/live-tv/epg/search${qs}`,
  )
  return data.items ?? []
}
