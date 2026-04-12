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

interface M3uChannel {
  name: string
  logo?: string | null
  group: string
  url: string
}

export const LIVE_TV_PLUGIN_ID = 'com.lumio.live-tv'
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
}

function sanitizeChannels(channels: unknown[]): M3uChannel[] {
  return channels
    .filter((channel): channel is Record<string, unknown> => Boolean(channel) && typeof channel === 'object')
    .map((channel) => ({
      name: String(channel.name ?? 'Unknown').trim() || 'Unknown',
      logo: typeof channel.logo === 'string' && channel.logo.trim().length > 0 ? channel.logo.trim() : null,
      group: String(channel.group ?? 'Other').trim() || 'Other',
      url: String(channel.url ?? '').trim(),
    }))
    .filter((channel) => channel.url.length > 0)
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

export function onLiveTvListsChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, LIVE_TV_LISTS_KEY, listener)
}

export function createLiveTvList(name: string): LiveTvList {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('List name is required')
  const next: LiveTvList = {
    id: crypto.randomUUID(),
    name: trimmed,
    channels: [],
    createdAt: new Date().toISOString(),
  }
  writeLists([...readLists(), next])
  return next
}

export function deleteLiveTvList(listId: string): void {
  writeLists(readLists().filter((list) => list.id !== listId))
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
