'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, type M3uChannel } from './live-tv-data'

/**
 * DÖLJ OCH BYT NAMN PÅ ENSKILDA KANALER (Jerry 2026-10-31). Egen nyckel i
 * pluginlagringen — inte i listornas kuratering — så en äldre version på en
 * annan enhet aldrig skriver över den (den känner inte nyckeln och rör den inte).
 *
 * Nyckeln är kanalens vanliga `channelKey` (namn + URL ur källan). Ett nytt
 * namn byter bara VISNINGEN: kanalen bär sitt källnamn i `originalName`, och
 * `channelKey` läser det — så favoriter, lås, historik, påminnelser och EPG
 * fortsätter peka på samma kanal.
 */
export const CHANNEL_OVERRIDES_KEY = 'channel_overrides_v1'

export interface ChannelOverrides { hidden: string[]; names: Record<string, string> }

const EMPTY: ChannelOverrides = { hidden: [], names: {} }

function sanitize(raw: unknown): ChannelOverrides {
  if (!raw || typeof raw !== 'object') return EMPTY
  const r = raw as { hidden?: unknown; names?: unknown }
  const hidden = Array.isArray(r.hidden) ? [...new Set(r.hidden.filter((k): k is string => typeof k === 'string' && k.length > 0))] : []
  const names: Record<string, string> = {}
  if (r.names && typeof r.names === 'object') {
    for (const [key, value] of Object.entries(r.names as Record<string, unknown>)) {
      if (key && typeof value === 'string' && value.trim()) names[key] = value.trim().slice(0, 120)
    }
  }
  return { hidden, names }
}

export function getChannelOverrides(): ChannelOverrides {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, CHANNEL_OVERRIDES_KEY, EMPTY))
}

function write(next: ChannelOverrides): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, CHANNEL_OVERRIDES_KEY, next)
}

export function setChannelHidden(key: string, hidden: boolean): void {
  const current = getChannelOverrides()
  const rest = current.hidden.filter((k) => k !== key)
  write({ ...current, hidden: hidden ? [...rest, key] : rest })
}

/** Tomt namn tar bort det egna namnet. */
export function setChannelName(key: string, name: string | null): void {
  const current = getChannelOverrides()
  const names = { ...current.names }
  const trimmed = name?.trim() ?? ''
  if (trimmed) names[key] = trimmed.slice(0, 120)
  else delete names[key]
  write({ ...current, names })
}

export function onChannelOverridesChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, CHANNEL_OVERRIDES_KEY, listener)
}

export function useChannelOverrides(): ChannelOverrides {
  const [value, setValue] = useState<ChannelOverrides>(() => getChannelOverrides())
  useEffect(() => onChannelOverridesChanged(() => setValue(getChannelOverrides())), [])
  return value
}

/** Källans namn — det som namnmatchning (reservströmmar) ska jämföra. */
export const sourceName = (channel: Pick<M3uChannel, 'name' | 'originalName'>): string => channel.originalName ?? channel.name

export function renameChannel<T extends M3uChannel>(channel: T, overrides: ChannelOverrides): T {
  const name = overrides.names[channelKey(channel)]
  if (!name || name === channel.name) return channel
  return { ...channel, name, originalName: sourceName(channel) }
}

/** Dolda bort, omdöpta med sitt nya namn; orörda kanaler är samma objekt. */
export function applyChannelOverrides<T extends M3uChannel>(channels: readonly T[], overrides: ChannelOverrides): T[] {
  if (overrides.hidden.length === 0 && Object.keys(overrides.names).length === 0) return channels as T[]
  const hidden = new Set(overrides.hidden)
  const out: T[] = []
  for (const channel of channels) {
    if (hidden.has(channelKey(channel))) continue
    out.push(renameChannel(channel, overrides))
  }
  return out
}
