'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { SPORT_KINDS, type SportKind } from './sport-model'

/*
  Sportens egna värden i pluginlagringen. Lagringen synkas med appens vanliga
  inställningssynk (WebDAV) — därför inget "cache" i nycklarna, och inget här
  är härlett ur EPG:t.
*/

export const SPORT_SETTINGS_KEY = 'sport_settings_v1'
export const SPORT_FOLLOWS_KEY = 'sport_follows_v1'
export const SPORT_OVERRIDES_KEY = 'sport_overrides_v1'

export type SportViewMode = 'matchday' | 'feed'
export type KickoffAlert = 'off' | '15' | 'kickoff'
export interface SportSettings {
  view: SportViewMode
  alert: KickoffAlert
}
const DEFAULT_SETTINGS: SportSettings = { view: 'matchday', alert: '15' }

function sanitizeSettings(raw: unknown): SportSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof SportSettings, unknown>>
  return {
    view: r.view === 'feed' || r.view === 'matchday' ? r.view : DEFAULT_SETTINGS.view,
    alert: r.alert === 'off' || r.alert === '15' || r.alert === 'kickoff' ? r.alert : DEFAULT_SETTINGS.alert,
  }
}

export function getSportSettings(): SportSettings {
  return sanitizeSettings(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, DEFAULT_SETTINGS))
}

export function setSportSettings(patch: Partial<SportSettings>): SportSettings {
  const next = sanitizeSettings({ ...getSportSettings(), ...patch })
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, next)
  return next
}

function useStored<T>(key: string, read: () => T): T {
  const [value, setValue] = useState(read)
  useEffect(() => {
    setValue(read())
    return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, key, () => setValue(read()))
    // `read` är en modulfunktion och byter aldrig identitet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return value
}

export function useSportSettings(): SportSettings {
  return useStored(SPORT_SETTINGS_KEY, getSportSettings)
}

/** Samma regel som `keys_match` i `live_tv_sport.rs`: lika, genitiv-s, eller kortformen är början/slutet av den långa. */
export function teamKeysMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  if (a === b || `${a}s` === b || `${b}s` === a) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  const sw = short.split(' ')
  const lw = long.split(' ')
  if (sw.length >= lw.length) return false
  const head = lw.slice(0, sw.length).join(' ')
  const tail = lw.slice(lw.length - sw.length).join(' ')
  return head === short || tail === short
}

/** En match som klassats som "övrigt" (t.ex. en eventkanal) kan vara vilken sport som helst. */
export function sportsCompatible(a: SportKind, b: SportKind): boolean {
  return a === b || a === 'other' || b === 'other'
}

export interface SportFollow {
  sport: SportKind
  kind: 'team' | 'league'
  /** Normaliserad nyckel (Rusts `team_key`, eller ligans nyckel). */
  key: string
  name: string
}

function sanitizeFollows(raw: unknown): SportFollow[] {
  if (!Array.isArray(raw)) return []
  const out: SportFollow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const f = item as Partial<SportFollow>
    if (!SPORT_KINDS.includes(f.sport as SportKind)) continue
    if (f.kind !== 'team' && f.kind !== 'league') continue
    if (typeof f.key !== 'string' || !f.key) continue
    out.push({ sport: f.sport as SportKind, kind: f.kind, key: f.key, name: typeof f.name === 'string' && f.name ? f.name : f.key })
  }
  return out
}

export function getFollows(): SportFollow[] {
  return sanitizeFollows(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, []))
}

export function isFollowing(follows: SportFollow[], f: Pick<SportFollow, 'sport' | 'kind' | 'key'>): boolean {
  return follows.some((x) =>
    x.kind === f.kind
    && sportsCompatible(x.sport, f.sport)
    && (f.kind === 'team' ? teamKeysMatch(x.key, f.key) : x.key === f.key))
}

export function toggleFollow(f: SportFollow): SportFollow[] {
  const current = getFollows()
  const next = isFollowing(current, f)
    ? current.filter((x) => !(x.kind === f.kind && sportsCompatible(x.sport, f.sport) && (f.kind === 'team' ? teamKeysMatch(x.key, f.key) : x.key === f.key)))
    : [...current, f]
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, next)
  return next
}

export function useFollows(): SportFollow[] {
  return useStored(SPORT_FOLLOWS_KEY, getFollows)
}

export interface OverrideChannel {
  key: string
  name: string
  url: string
  logo: string | null
  group: string
  tvgId: string | null
}
export type SportOverrides = Record<string, OverrideChannel>

function sanitizeOverrides(raw: unknown): SportOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: SportOverrides = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const c = value as Partial<OverrideChannel> | null
    if (!c || typeof c.key !== 'string' || typeof c.url !== 'string' || typeof c.name !== 'string') continue
    out[id] = { key: c.key, name: c.name, url: c.url, logo: typeof c.logo === 'string' ? c.logo : null, group: typeof c.group === 'string' ? c.group : '', tvgId: typeof c.tvgId === 'string' ? c.tvgId : null }
  }
  return out
}

export function getOverrides(): SportOverrides {
  return sanitizeOverrides(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, {}))
}

export function setOverride(matchId: string, channel: OverrideChannel | null): SportOverrides {
  const next = { ...getOverrides() }
  if (channel) next[matchId] = channel
  else delete next[matchId]
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, next)
  return next
}

export function useOverrides(): SportOverrides {
  return useStored(SPORT_OVERRIDES_KEY, getOverrides)
}
