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
 * sparat uttryckligen. Alla rader, Övrigt med, har Standard som standard
 * (Jerry 2026-10-11), så en saknad nyckel betyder Standard. Handboll har
 * ingen egen rad — dess matcher följer Övrigt.
 */
export type SportBackdropChoice = SportBackdropMode | 'inherit'
export interface SportBackdrops { all: SportBackdropMode; sports: Partial<Record<SportKind, SportBackdropChoice>> }
/** Sporterna med en egen rad i inställningarna (handboll följer Övrigt). */
export const BACKDROP_SPORTS: readonly SportKind[] = SPORT_KINDS.filter((k) => k !== 'handball')
const ownImageDefaults = (): Partial<Record<SportKind, SportBackdropChoice>> => Object.fromEntries(BACKDROP_SPORTS.map((k) => [k, 'standard']))
/**
 * Bakgrundsvalens version. Val sparade före 2 (Egen bild på Alla sporter,
 * Övrigt som ärvde) nollställs en gång till Standard överallt (Jerry 2026-10-11).
 */
const BACKDROPS_REV = 2
/** Kortens bakgrund medan en bild visas. */
export type SportCardTone = 'black' | 'gray' | 'image'
/**
 * `opacity` gäller skrivbordet och telefonen, `tvOpacity` TV-läget. `null` =
 * inte valt: plattformens standard (CARD_OPACITY_DEFAULT). Jerry 2026-10-11:
 * "50 på desktop, 85 på TV-mode" — ett eget val vinner på sin plattform.
 */
export interface SportCards { opacity: number | null; tvOpacity?: number | null; tone: SportCardTone }

/** Standardopaciteten per plattform. */
export const CARD_OPACITY_DEFAULT = { desktop: 50, tv: 85 } as const

/** Den opacitet som gäller på plattformen (eget val, annars standarden). */
export function cardOpacity(cards: SportCards, tv: boolean): number {
  const own = tv ? cards.tvOpacity : cards.opacity
  return typeof own === 'number' ? own : tv ? CARD_OPACITY_DEFAULT.tv : CARD_OPACITY_DEFAULT.desktop
}

/** Kortvalen med plattformens opacitet satt (ett uttryckligt val). */
export function withCardOpacity(cards: SportCards, tv: boolean, value: number): SportCards {
  return tv ? { ...cards, tvOpacity: value } : { ...cards, opacity: value }
}

/**
 * Kortvalens version. Före 2 fanns ett enda värde, och 50 skrevs som
 * bieffekt av andra sparningar — det räknas som "inte valt". Ett annat värde
 * var ett riktigt val och gällde överallt, så det följer med till båda
 * plattformarna.
 */
const CARDS_REV = 2

const isMode = (v: unknown): v is SportBackdropMode => typeof v === 'string' && BACKDROP_MODES.includes(v)

function sanitizeBackdrops(raw: unknown, legacy: unknown, rev: unknown): SportBackdrops {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  if (!r) return { all: legacy === 'off' ? 'off' : 'standard', sports: ownImageDefaults() }
  if (rev !== BACKDROPS_REV) return { all: 'standard', sports: ownImageDefaults() }
  const sportsRaw = r.sports && typeof r.sports === 'object' ? (r.sports as Record<string, unknown>) : {}
  const sports = ownImageDefaults()
  for (const k of BACKDROP_SPORTS) {
    const v = sportsRaw[k]
    if (isMode(v) || v === 'inherit') sports[k] = v
  }
  return { all: isMode(r.all) ? r.all : 'standard', sports }
}

const pct = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(100, Math.max(0, v))) : null)

function sanitizeCards(raw: unknown, rev: unknown): SportCards {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const tone = r.tone === 'gray' || r.tone === 'image' || r.tone === 'black' ? r.tone : DEFAULT_CARDS.tone
  if (rev !== CARDS_REV) {
    const old = pct(r.opacity)
    const chosen = old === null || old === 50 ? null : old
    return { opacity: chosen, tvOpacity: chosen, tone }
  }
  return { opacity: pct(r.opacity), tvOpacity: pct(r.tvOpacity), tone }
}

/** Ingen opacitet vald (plattformens standard) i en ton ur bilden. */
export const DEFAULT_CARDS: SportCards = { opacity: null, tvOpacity: null, tone: 'image' }

/** Alla källor, i den ordning de visas i Nycklar. */
export const ALL_PROVIDERS: readonly ProviderId[] = ['sportapi', 'api-sports', 'thesportsdb']
/** En källas nyckel och planen vid senaste validering. */
export interface ProviderKey { key: string; plan: string | null }
/**
 * EN nyckel per källa. Flera nycklar för samma källa stöds med flit inte:
 * att rotera gratisnycklar runt en gräns bryter mot källornas villkor.
 */
export type ProviderKeys = Partial<Record<ProviderId, ProviderKey>>
/** Användarens egen källordning per sport; saknad sport = standardordningen (providers.ts). */
export type SportOrder = Partial<Record<SportKind, ProviderId[]>>

export interface SportSettings {
  view: SportViewMode // fas 1
  /** Telefonens eget val; saknas = Matchdag. Skild från `view` så ett skrivbords-/TV-val av Flöde inte följer med till telefonen. */
  phoneView?: SportViewMode | null
  alert: KickoffAlert // fas 1
  /** Nycklarna, en per källa. Sanningen; `apiKey`/`provider`/`keyPlan` härleds ur den. */
  keys: ProviderKeys
  /** Källordning per sport (Källa per sport). */
  order: SportOrder
  /**
   * HÄRLEDD: den primära källans nyckel (`null` = inga nycklar). Sparas med
   * för äldre appversioner som synkar samma inställningar. Skriv nycklar med
   * `setProviderKey`; en skrivning av `apiKey` gäller den primära källan.
   */
  apiKey: string | null
  /** Fas 2: målnotis. På som standard, och gäller bara följda matcher eller matcher med "Notis vid mål". */
  goalAlerts: boolean
  /** HÄRLEDD: den primära källan (första med nyckel i ALL_PROVIDERS; API-Sports utan nycklar). */
  provider: ProviderId
  /** HÄRLEDD: den primära källans plan vid senaste validering ("Free", "Pro", "Premium"). */
  keyPlan: string | null
  /** Fas 2: "Notis vid mål" per match (matchens id → utgår ms, avspark + 4 h). */
  goalAlertMatches: Record<string, number>
  /** Bakgrund i Sport per sport, med "Alla sporter" som standard. */
  backdrops: SportBackdrops
  /** Bakgrundsvalens version (BACKDROPS_REV); sätts av läsningen, skrivs aldrig för hand. */
  backdropsRev?: number
  /** Kortens bakgrund medan en bild visas. */
  cards: SportCards
  /** Kortvalens version (CARDS_REV); sätts av läsningen, skrivs aldrig för hand. */
  cardsRev?: number
}

const DEFAULT_SETTINGS: SportSettings = {
  view: 'matchday', alert: '15', keys: {}, order: {}, apiKey: null, goalAlerts: true, provider: 'api-sports', keyPlan: null, goalAlertMatches: {}, backdrops: { all: 'standard', sports: ownImageDefaults() }, cards: DEFAULT_CARDS,
}

const isProvider = (v: unknown): v is ProviderId => typeof v === 'string' && (ALL_PROVIDERS as readonly string[]).includes(v)
const KEY_RE = /^[A-Za-z0-9_-]{3,128}$/

function sanitizeKeys(raw: unknown): ProviderKeys {
  const out: ProviderKeys = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const e = v && typeof v === 'object' ? (v as Record<string, unknown>) : null
    if (!isProvider(id) || !e || typeof e.key !== 'string' || !KEY_RE.test(e.key)) continue
    out[id] = { key: e.key, plan: typeof e.plan === 'string' ? e.plan : null }
  }
  return out
}

/** Flytt från fas 2:s enkla nyckel: `{apiKey, provider, keyPlan}` → en post i kartan. */
function legacyKeys(r: Record<string, unknown>): ProviderKeys {
  if (typeof r.apiKey !== 'string' || !KEY_RE.test(r.apiKey)) return {}
  const id: ProviderId = r.provider === 'thesportsdb' ? 'thesportsdb' : 'api-sports'
  return { [id]: { key: r.apiKey, plan: typeof r.keyPlan === 'string' ? r.keyPlan : null } }
}

function sanitizeOrder(raw: unknown): SportOrder {
  const out: SportOrder = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [sport, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!SPORT_KINDS.includes(sport as SportKind) || !Array.isArray(list)) continue
    const ids = [...new Set(list.filter(isProvider))]
    if (ids.length) out[sport as SportKind] = ids
  }
  return out
}

export function primaryProvider(keys: ProviderKeys): ProviderId {
  return ALL_PROVIDERS.find((id) => keys[id]) ?? 'api-sports'
}

export function hasAnyKey(s: Pick<SportSettings, 'keys'>): boolean {
  return ALL_PROVIDERS.some((id) => !!s.keys[id])
}

function sanitizeSettings(raw: unknown): SportSettings {
  // `backdrop`/`backdropCustom` är fas 2:s första form (länk eller startsidans bild); bara Av följer med.
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof SportSettings | 'backdrop', unknown>>
  // En post med nyckelkarta flyttas aldrig igen: kartan är sanningen, de härledda fälten bara en spegel.
  const keys = r.keys && typeof r.keys === 'object' ? sanitizeKeys(r.keys) : legacyKeys(r as Record<string, unknown>)
  const provider = primaryProvider(keys)
  return {
    view: r.view === 'feed' || r.view === 'matchday' ? r.view : DEFAULT_SETTINGS.view,
    phoneView: r.phoneView === 'feed' || r.phoneView === 'matchday' ? r.phoneView : null,
    alert: r.alert === 'off' || r.alert === '15' || r.alert === 'kickoff' ? r.alert : DEFAULT_SETTINGS.alert,
    keys,
    order: sanitizeOrder(r.order),
    apiKey: keys[provider]?.key ?? null,
    goalAlerts: r.goalAlerts !== false,
    provider,
    keyPlan: keys[provider]?.plan ?? null,
    goalAlertMatches: Object.fromEntries(
      Object.entries(r.goalAlertMatches && typeof r.goalAlertMatches === 'object' ? (r.goalAlertMatches as Record<string, unknown>) : {})
        .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > Date.now()),
    ),
    backdrops: sanitizeBackdrops(r.backdrops, r.backdrop, r.backdropsRev),
    backdropsRev: BACKDROPS_REV,
    cards: sanitizeCards(r.cards, r.cardsRev),
    cardsRev: CARDS_REV,
  }
}

export function getSportSettings(): SportSettings {
  return sanitizeSettings(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, DEFAULT_SETTINGS))
}

export function setSportSettings(patch: Partial<SportSettings>): SportSettings {
  const current = getSportSettings()
  let keys = patch.keys ?? current.keys
  if ('apiKey' in patch) {
    // Äldre skrivform (en nyckel): gäller den angivna eller den primära källan, och lämnar andra källor.
    const id = patch.provider ?? current.provider
    keys = { ...keys }
    if (patch.apiKey) keys[id] = { key: patch.apiKey, plan: patch.keyPlan ?? null }
    else delete keys[id]
  }
  const next = sanitizeSettings({ ...current, ...patch, keys })
  writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, next)
  return next
}

/** Sparar (eller ERSÄTTER) källans enda nyckel. */
export function setProviderKey(id: ProviderId, key: string, plan: string | null): SportSettings {
  return setSportSettings({ keys: { ...getSportSettings().keys, [id]: { key, plan } } })
}

export function removeProviderKey(id: ProviderId): SportSettings {
  const keys = { ...getSportSettings().keys }
  delete keys[id]
  return setSportSettings({ keys })
}

export function setSportOrder(sport: SportKind, order: ProviderId[]): SportSettings {
  return setSportSettings({ order: { ...getSportSettings().order, [sport]: order } })
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
  /** Lagets egen klocka (Mina lag på telefon). Saknas = den allmänna (`SportSettings.alert`). */
  alert?: KickoffAlert
  /** Märket (lagets bricka / ligans logga), sparat när posten skapades eller hittades i en match. Utan det blir det initialer när dagens matcher saknar laget. */
  crest?: string | null
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
    const alert = f.alert === 'off' || f.alert === '15' || f.alert === 'kickoff' ? f.alert : null
    out.push({ sport: f.sport as SportKind, kind: f.kind, key: f.key, name: typeof f.name === 'string' && f.name ? f.name : f.key, ...(ids && Object.keys(ids).length > 0 ? { providerIds: ids } : {}), ...(alert ? { alert } : {}), ...(typeof f.crest === 'string' && f.crest ? { crest: f.crest } : {}) })
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

/** Lagets egen klocka, annars den allmänna. */
export const followAlert = (f: SportFollow, global: KickoffAlert): KickoffAlert => f.alert ?? global

/** Sätter klockan på den följda posten (samma matchningsregel som `isFollowing`); en okänd post lämnas orörd. */
export function setFollowAlert(f: Pick<SportFollow, 'sport' | 'kind' | 'key'>, alert: KickoffAlert): SportFollow[] {
  const next = getFollows().map((x) => (isFollowing([x], f) ? { ...x, alert } : x))
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
