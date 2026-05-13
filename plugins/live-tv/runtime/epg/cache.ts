import { readPluginJson, writePluginJson, emitPluginStorageChanged } from '@/lib/plugin-sdk'
import { fetchEpg } from './fetcher'
import type { EpgCacheEntry } from './types'

const PLUGIN_ID = 'com.lumio.live-tv'
const TTL_MS = 6 * 60 * 60 * 1000
const RETRY_MS = 60 * 60 * 1000

const inflight = new Map<string, Promise<void>>()
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()
const retryScheduled = new Set<string>()

function cacheKey(listId: string): string {
  return `epg_cache:${listId}`
}

export function readCache(listId: string): EpgCacheEntry | null {
  return readPluginJson<EpgCacheEntry | null>(PLUGIN_ID, cacheKey(listId), null)
}

export function isFresh(entry: EpgCacheEntry | null, now = Date.now()): boolean {
  return entry !== null && now - entry.fetchedAt < TTL_MS
}

async function refresh(listId: string, urls: string[]): Promise<void> {
  const existing = inflight.get(listId)
  if (existing) return existing
  const task = (async () => {
    try {
      const entry = await fetchEpg(urls)
      writePluginJson(PLUGIN_ID, cacheKey(listId), entry)
      emitPluginStorageChanged(PLUGIN_ID, cacheKey(listId))
      const t = retryTimers.get(listId)
      if (t) { clearTimeout(t); retryTimers.delete(listId) }
      retryScheduled.delete(listId)
    } catch (err) {
      console.warn(`[live-tv] EPG refresh failed for ${listId}`, err)
      if (!retryTimers.has(listId) && !retryScheduled.has(listId)) {
        retryScheduled.add(listId)
        const timer = setTimeout(() => {
          retryTimers.delete(listId)
          refresh(listId, urls).catch(() => {})
        }, RETRY_MS)
        retryTimers.set(listId, timer)
      }
    } finally {
      inflight.delete(listId)
    }
  })()
  inflight.set(listId, task)
  return task
}

export async function ensureFresh(listId: string, urls: string[]): Promise<EpgCacheEntry | null> {
  const existing = readCache(listId)
  if (urls.length === 0) return existing
  if (!isFresh(existing)) {
    refresh(listId, urls).catch(() => {})
  }
  return existing
}

export function __resetForTests(): void {
  for (const timer of retryTimers.values()) clearTimeout(timer)
  retryTimers.clear()
  retryScheduled.clear()
  inflight.clear()
}
