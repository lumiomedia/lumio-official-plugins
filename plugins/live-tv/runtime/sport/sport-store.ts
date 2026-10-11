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
/**
 * Bakgrund i Sport. Standard = appens medföljande bild för sporten,
 * Automatisk = källans arena-/lagbild (med nyckel) och annars Standard,
 * Egen bild = en bild uppladdad till DEN HÄR värden (själva bilden synkas
 * aldrig; saknas den här blir det Standard), Av = ingen bakgrund.
 */
/** Appens medföljande bilder (spa/public/sport-backgrounds), valbara för vilken sport som helst. */
export const BUNDLED_IMAGES = ['football', 'hockey', 'basketball', 'motorsport', 'tennis'] as const
export type BundledImage = (typeof BUNDLED_IMAGES)[number]
/** `image:<bild>` = en av de medföljande bilderna, vald för hand (Jerry 2026-10-11). */
export type SportBackdropMode = 'standard' | 'auto' | 'custom' | 'off' | `image:${BundledImage}`
const BACKDROP_MODES: readonly string[] = ['standard', 'auto', 'custom', 'off', ...BUNDLED_IMAGES.map((b) => `image:${b}`)]
/**
 * "Alla sporter" plus egna val per sport. `inherit` = "Som Alla sporter",
 * sparat uttryckligen: en sport med egen medföljande bild har Standard (sin
 * egen bild) som standard (Jerry 2026-10-11), så en saknad nyckel betyder
 * Standard för dem och arv bara för Övrigt. Handboll har ingen egen rad —
 * dess matcher följer Övrigt.
 */
export type SportBackdropChoice = SportBackdropMode | 'inherit'
export interface SportBackdrops { all: SportBackdropMode; sports: Partial<Record<SportKind, SportBackdropChoice>> }
/** Sporterna med en egen rad i inställningarna (handboll följer Övrigt). */
export const BACKDROP_SPORTS: readonly SportKind[] = SPORT_KINDS.filter((k) => k !== 'handball')
/** Sporter vars standardläge är Standard med egen bild i stället för arv. */
const OWN_IMAGE_SPORTS: readonly SportKind[] = BUNDLED_IMAGES
const ownImageDefaults = (): Partial<Record<SportKind, SportBackdropChoice>> => Object.fromEntries(OWN_IMAGE_SPORTS.map((k) => [k, 'standard']))
/** Kortens bakgrund medan en bild visas. */
export type SportCardTone = 'black' | 'gray' | 'image'
export interface SportCards { opacity: number; tone: SportCardTone }

const isMode = (v: unknown): v is SportBackdropMode => typeof v === 'string' && BACKDROP_MODES.includes(v)

function sanitizeBackdrops(raw: unknown, legacy: unknown): SportBackdrops {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  if (!r) return { all: legacy === 'off' ? 'off' : 'standard', sports: ownImageDefaults() }
  const sportsRaw = r.sports && typeof r.sports === 'object' ? (r.sports as Record<string, unknown>) : {}
  // Flytt: en saknad nyckel var förr det underförstådda "Som Alla sporter" och blir nu Standard
  // för sporterna med egen bild. Uttryckliga val (även `inherit`) står kvar.
  const sports = ownImageDefaults()
  for (const k of BACKDROP_SPORTS) {
    const v = sportsRaw[k]
    if (isMode(v) || v === 'inherit') sports[k] = v
  }
  return { all: isMode(r.all) ? r.all : 'standard', sports }
}

function sanitizeCards(raw: unknown): SportCards {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const n = typeof r.opacity === 'number' && Number.isFinite(r.opacity) ? Math.round(Math.min(100, Math.max(0, r.opacity))) : DEFAULT_CARDS.opacity
  const tone = r.tone === 'gray' || r.tone === 'image' || r.tone === 'black' ? r.tone : DEFAULT_CARDS.tone
  return { opacity: n, tone }
}

/** Standard 50 % i en ton ur bilden (Jerry 2026-10-11: "sätt standard opacitet till 50%"). */
export const DEFAULT_CARDS: SportCards = { opacity: 50, tone: 'image' }

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
  /** Fas 2: "Notis vid mål" per match (matchens id → utgår ms, avspark + 4 h). */
  goalAlertMatches: Record<string, number>
  /** Bakgrund i Sport per sport, med "Alla sporter" som standard. */
  backdrops: SportBackdrops
  /** Kortens bakgrund medan en bild visas. */
  cards: SportCards
}

const DEFAULT_SETTINGS: SportSettings = {
  view: 'matchday', alert: '15', apiKey: null, goalAlerts: true, provider: 'api-sports', keyPlan: null, goalAlertMatches: {}, backdrops: { all: 'standard', sports: ownImageDefaults() }, cards: DEFAULT_CARDS,
}

function sanitizeSettings(raw: unknown): SportSettings {
  // `backdrop`/`backdropCustom` är fas 2:s första form (länk eller startsidans bild); bara Av följer med.
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof SportSettings | 'backdrop', unknown>>
  return {
    view: r.view === 'feed' || r.view === 'matchday' ? r.view : DEFAULT_SETTINGS.view,
    alert: r.alert === 'off' || r.alert === '15' || r.alert === 'kickoff' ? r.alert : DEFAULT_SETTINGS.alert,
    apiKey: typeof r.apiKey === 'string' && r.apiKey ? r.apiKey : null,
    goalAlerts: r.goalAlerts !== false,
    provider: r.provider === 'thesportsdb' ? 'thesportsdb' : 'api-sports',
    keyPlan: typeof r.keyPlan === 'string' ? r.keyPlan : null,
    goalAlertMatches: Object.fromEntries(
      Object.entries(r.goalAlertMatches && typeof r.goalAlertMatches === 'object' ? (r.goalAlertMatches as Record<string, unknown>) : {})
        .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > Date.now()),
    ),
    backdrops: sanitizeBackdrops(r.backdrops, r.backdrop),
    cards: sanitizeCards(r.cards),
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
