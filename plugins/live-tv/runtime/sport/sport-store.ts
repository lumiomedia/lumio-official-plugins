'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import type { ProviderId } from './provider'
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
export type SportBackdropMode = 'auto' | 'custom' | 'off'
/**
 * Egen bild: en av appens egna bakgrunder (Inställningar > Startsida) per index,
 * eller en http(s)-länk. Bilden själv kopieras aldrig hit: lagringen synkas med
 * WebDAV, och uppladdade bilder är data-URL:er på flera MB.
 */
export type SportBackdropCustom = { from: 'home'; index: number } | { from: 'url'; url: string }

function sanitizeBackdropCustom(raw: unknown): SportBackdropCustom | null {
  const c = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  if (c?.from === 'home' && typeof c.index === 'number' && Number.isInteger(c.index) && c.index >= 0) return { from: 'home', index: c.index }
  if (c?.from === 'url' && typeof c.url === 'string' && /^https?:\/\/\S+$/i.test(c.url.trim())) return { from: 'url', url: c.url.trim() }
  return null
}

export interface SportSettings {
  view: SportViewMode // fas 1
  alert: KickoffAlert // fas 1
  /** Fas 2: användarens egen nyckel. `null` = inga anrop. */
  apiKey: string | null
  /** Fas 2: målnotis. På som standard, och gäller bara följda matcher eller matcher med "Notis vid mål". */
  goalAlerts: boolean
  /** Fas 2: vilken källa nyckeln hör till. */
  provider: ProviderId
  /** Fas 2: källans plan vid senaste validering ("Free", "Pro", "Premium"). */
  keyPlan: string | null
  /** Fas 2: "Inte nu" på nyckelkortet. Efter det visas bara en diskret rad i Resultat. */
  keyCardDismissed: boolean
  /** Fas 2: "Notis vid mål" per match (matchens id → utgår ms, avspark + 4 h). */
  goalAlertMatches: Record<string, number>
  /** Bakgrund i Sport: Automatisk (arenan), Egen bild eller Av. */
  backdrop: SportBackdropMode
  backdropCustom: SportBackdropCustom | null
}

const DEFAULT_SETTINGS: SportSettings = {
  view: 'matchday', alert: '15', apiKey: null, goalAlerts: true, provider: 'api-sports', keyPlan: null, keyCardDismissed: false, goalAlertMatches: {}, backdrop: 'auto', backdropCustom: null,
}

function sanitizeSettings(raw: unknown): SportSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof SportSettings, unknown>>
  return {
    view: r.view === 'feed' || r.view === 'matchday' ? r.view : DEFAULT_SETTINGS.view,
    alert: r.alert === 'off' || r.alert === '15' || r.alert === 'kickoff' ? r.alert : DEFAULT_SETTINGS.alert,
    apiKey: typeof r.apiKey === 'string' && r.apiKey ? r.apiKey : null,
    goalAlerts: r.goalAlerts !== false,
    provider: r.provider === 'thesportsdb' ? 'thesportsdb' : 'api-sports',
    keyPlan: typeof r.keyPlan === 'string' ? r.keyPlan : null,
    keyCardDismissed: r.keyCardDismissed === true,
    goalAlertMatches: Object.fromEntries(
      Object.entries(r.goalAlertMatches && typeof r.goalAlertMatches === 'object' ? (r.goalAlertMatches as Record<string, unknown>) : {})
        .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > Date.now()),
    ),
    backdrop: r.backdrop === 'custom' || r.backdrop === 'off' ? r.backdrop : 'auto',
    backdropCustom: sanitizeBackdropCustom(r.backdropCustom),
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
  /** Fas 2: källans id per källa, känt när laget följdes ur en sökning i källan. */
  providerIds?: Record<string, string>
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
    const ids = f.providerIds && typeof f.providerIds === 'object'
      ? Object.fromEntries(Object.entries(f.providerIds).filter((e): e is [string, string] => typeof e[1] === 'string'))
      : null
    out.push({ sport: f.sport as SportKind, kind: f.kind, key: f.key, name: typeof f.name === 'string' && f.name ? f.name : f.key, ...(ids && Object.keys(ids).length > 0 ? { providerIds: ids } : {}) })
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

/*
  AVBOCKADE AUTOMATISKA PÅMINNELSER. En följd match får en påminnelse av
  synken; bockar användaren av den sparas matchens id här så att nästa synk
  inte skapar den igen. Värdet är matchens start — posterna rensas när
  matchen är ett dygn gammal (nyckeln synkas, Android har ett lagringstak).
*/
export const SPORT_ALERT_SKIP_KEY = 'sport_alert_skip_v1'
const SKIP_KEEP_MS = 24 * 60 * 60_000

export function getAlertSkips(): Record<string, number> {
  const raw = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPORT_ALERT_SKIP_KEY, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [id, start] of Object.entries(raw as Record<string, unknown>)) if (typeof start === 'number') out[id] = start
  return out
}

export function setAlertSkip(matchId: string, start: number, skip: boolean, now: number = Date.now()): void {
  const current = getAlertSkips()
  if (!skip && !(matchId in current)) return
  const next: Record<string, number> = {}
  for (const [id, s] of Object.entries(current)) if (s + SKIP_KEEP_MS > now && id !== matchId) next[id] = s
  if (skip) next[matchId] = start
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_ALERT_SKIP_KEY, next)
}
