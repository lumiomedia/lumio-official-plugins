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
  )
  return { items: data.items ?? [], total: data.total ?? 0, known: Boolean(data.known) }
}

/** Pages through the index in 5 000-item pages until a short page is seen. */
export async function loadAllChannels(
  source: string | null,
  onPage?: (loaded: number, total: number) => void,
): Promise<IndexChannel[]> {
  const items: IndexChannel[] = []
  let offset = 0
  for (;;) {
    const page = await queryChannels({ source: source ?? undefined, offset, limit: QUERY_PAGE_LIMIT })
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

/** Vilka källor indexet redan känner till (enhetsöverföring: `importMissingSources`). */
export async function indexStatus(): Promise<{ sources: string[] }> {
  const data = await requestJson<{ sources?: string[] }>('/api/live-tv/status', { cache: 'no-store' })
  return { sources: data.sources ?? [] }
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

export async function refreshEpg(
  listId: string,
  urls: string[],
  sources: string[],
  force?: boolean,
): Promise<string> {
  const data = await postJson<{ job: string }>('/api/live-tv/epg/refresh', { listId, urls, sources, force })
  return data.job
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

/** Chunks into batches of 200 keys per request and merges the results. */
export async function epgSchedule(
  listId: string,
  keys: string[],
  from: number,
  to: number,
): Promise<Record<string, EpgProgramme[]>> {
  const merged: Record<string, EpgProgramme[]> = {}
  for (const group of chunk(keys, EPG_SCHEDULE_CHUNK_SIZE)) {
    const qs = buildQuery({ listId, keys: group.join(','), from, to })
    const data = await requestJson<{ items?: Record<string, EpgProgramme[]> }>(`/api/live-tv/epg/schedule${qs}`)
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
