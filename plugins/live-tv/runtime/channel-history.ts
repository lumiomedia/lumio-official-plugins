'use client'

import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, type M3uChannel } from './live-tv-data'

/**
 * Kanalhistorik för hubbens "Fortsätt titta". Lokal plugin-lagring, inga
 * uppslag mot leverantörer. Senaste kanal först, max CHANNEL_HISTORY_LIMIT.
 */
export const CHANNEL_HISTORY_KEY = 'channel_history_v1'
export const CHANNEL_HISTORY_LIMIT = 20

export interface ChannelHistoryEntry {
  key: string
  name: string
  url: string
  group: string
  logo: string | null
  tvgId: string | null
  listId: string | null
  watchedAt: number
}

function sanitize(raw: unknown): ChannelHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ChannelHistoryEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Partial<ChannelHistoryEntry>
    if (typeof entry.url !== 'string' || !entry.url.trim()) continue
    if (typeof entry.name !== 'string' || !entry.name.trim()) continue
    out.push({
      key: typeof entry.key === 'string' && entry.key ? entry.key : channelKey({ name: entry.name, url: entry.url }),
      name: entry.name,
      url: entry.url,
      group: typeof entry.group === 'string' ? entry.group : 'Other',
      logo: typeof entry.logo === 'string' ? entry.logo : null,
      tvgId: typeof entry.tvgId === 'string' ? entry.tvgId : null,
      listId: typeof entry.listId === 'string' ? entry.listId : null,
      watchedAt: typeof entry.watchedAt === 'number' && Number.isFinite(entry.watchedAt) ? entry.watchedAt : 0,
    })
  }
  return out
}

export function getChannelHistory(): ChannelHistoryEntry[] {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, CHANNEL_HISTORY_KEY, []))
}

export function recordChannelWatch(
  channel: M3uChannel,
  listId: string | null = null,
  now: number = Date.now(),
): ChannelHistoryEntry[] {
  if (!channel.url?.trim() || !channel.name?.trim()) return getChannelHistory()
  const key = channelKey(channel)
  const entry: ChannelHistoryEntry = {
    key,
    name: channel.name,
    url: channel.url,
    group: channel.group || 'Other',
    logo: channel.logo ?? null,
    tvgId: channel.tvgId ?? null,
    listId,
    watchedAt: now,
  }
  const next = [entry, ...getChannelHistory().filter((item) => item.key !== key)].slice(0, CHANNEL_HISTORY_LIMIT)
  writePluginJson(LIVE_TV_PLUGIN_ID, CHANNEL_HISTORY_KEY, next)
  return next
}

/** Ta bort en kanal ur Fortsätt titta (hållmenyn på TV, Jerry 2026-09-06). */
export function removeChannelHistoryEntry(key: string): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, CHANNEL_HISTORY_KEY, getChannelHistory().filter((item) => item.key !== key))
}

export function clearChannelHistory(): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, CHANNEL_HISTORY_KEY, [])
}

export function onChannelHistoryChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, CHANNEL_HISTORY_KEY, listener)
}

/**
 * Grupper användaren oftast tittar på, mest sedda först. Underlag för
 * "Rekommenderat för dig" — helt lokalt.
 */
export function topGroupsFromHistory(history: ChannelHistoryEntry[], limit = 3): string[] {
  const counts = new Map<string, number>()
  for (const entry of history) {
    const group = entry.group.trim()
    if (!group) continue
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([group]) => group)
}
