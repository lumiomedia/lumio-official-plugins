'use client'

import { useCallback, useEffect, useState } from 'react'
import { getPluginHttpAssetUrl, useTvMode } from '@/lib/plugin-sdk'
import { currentBudget } from './budget'
import { useSportSettings, type SportBackdropMode, type SportBackdrops, type SportCards } from './sport-store'
import type { TeamArt } from './provider'
import type { SportKind, SportMatch } from './sport-model'
import { localDayKey } from './sport-epg'

/** "Alla sporter" eller en sport: var ett val och en egen bild hör hemma. */
export type BackdropScope = 'all' | SportKind
export type Rgb = [number, number, number]

export type BackdropChoice =
  | { kind: 'none' }
  | { kind: 'image'; url: string; from: 'venue' | 'stadium' | 'fanart' | 'custom' | 'standard' }
  | { kind: 'gradient'; sport: SportKind }

export interface BackdropInput {
  mode: SportBackdropMode
  /** Platsen vars egna bild gäller (sportens egen, eller "all" vid arv). */
  slot: BackdropScope
  hasKey: boolean
  hero: Pick<SportMatch, 'kind' | 'venueImage'> | null
  /** Hemmalagets bilder (TheSportsDB). `null` = okänt, eller API-Sports som inte har någon. */
  art: TeamArt | null
  /** Egna bilder på DEN HÄR värden: plats → version. */
  uploads: Partial<Record<BackdropScope, number>>
  /** Standard-bilden för vyn. */
  standard: string
  /** Bilder som inte gick att ladda i den här sessionen. */
  broken?: ReadonlySet<string>
}

/** Appens medföljande bilder (spa/public/sport-backgrounds), 1920 px WebP. */
export const STANDARD_IMAGES: Partial<Record<SportKind, string>> = {
  football: '/sport-backgrounds/football.webp',
  hockey: '/sport-backgrounds/hockey.webp',
  basketball: '/sport-backgrounds/basketball.webp',
  motorsport: '/sport-backgrounds/motorsport.webp',
  tennis: '/sport-backgrounds/tennis.webp',
}
/** Medelfärgen per medföljande bild (uppmätt vid komprimeringen): ingen provtagning behövs. */
export const STANDARD_TONES: Record<string, Rgb> = {
  '/sport-backgrounds/football.webp': [54, 75, 45],
  '/sport-backgrounds/hockey.webp': [84, 76, 77],
  '/sport-backgrounds/basketball.webp': [63, 58, 59],
  '/sport-backgrounds/motorsport.webp': [51, 56, 52],
  '/sport-backgrounds/tennis.webp': [41, 69, 79],
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Sportens egen bild, annars en av dem vald per dag (stabil hela dagen: inget flimmer). */
export function standardImageFor(scope: BackdropScope, dayKey: string): string {
  const own = scope === 'all' ? undefined : STANDARD_IMAGES[scope]
  if (own) return own
  const all = Object.values(STANDARD_IMAGES) as string[]
  return all[hash(`${dayKey}|${scope}`) % all.length]!
}

export function resolveBackdropMode(b: SportBackdrops, scope: BackdropScope): { mode: SportBackdropMode; slot: BackdropScope } {
  const own = scope === 'all' ? undefined : b.sports[scope]
  return own ? { mode: own, slot: scope } : { mode: b.all, slot: 'all' }
}

export function customBackdropUrl(slot: BackdropScope, version: number): string {
  return `/api/live-tv/sport/backdrop?slot=${slot}&v=${version}`
}

/** Tonen ur bilden mörkas så att vit text alltid läses (luminans ≤ 42). */
export function darkTone([r, g, b]: Rgb): Rgb {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const f = Math.min(0.6, lum > 0 ? 42 / lum : 0.6)
  return [Math.round(r * f), Math.round(g * f), Math.round(b * f)]
}

export function averageRgb(data: Uint8ClampedArray): Rgb | null {
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3]! < 16) continue
    r += data[i]!; g += data[i + 1]!; b += data[i + 2]!; n++
  }
  return n === 0 ? null : [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

const GRAY: Rgb = [28, 29, 34]
export const CARD_BLUR = 'blur(14px)'
export type CardSurfaceVars = { '--sport-card-bg': string; '--sport-card-blur': string }

/** EN uppsättning variabler på Sport-roten; alla kort, rader och paneler läser dem. */
export function cardSurfaceVars(cards: SportCards, sampled: Rgb | null, opts: { blur: boolean }): CardSurfaceVars {
  const rgb = cards.tone === 'gray' ? GRAY : cards.tone === 'image' && sampled ? darkTone(sampled) : ([0, 0, 0] as Rgb)
  return { '--sport-card-bg': `rgba(${rgb.join(', ')}, ${cards.opacity / 100})`, '--sport-card-blur': opts.blur ? CARD_BLUR : 'none' }
}

export { SPORT_CARD_BG, SPORT_PANEL_BG, sportBg, sportSurface } from './surface'

/** Neutral bakgrund per sport: mörk och svagt tonad, aldrig en bild. */
export const SPORT_GRADIENTS: Record<SportKind, string> = {
  football: 'radial-gradient(120% 90% at 85% 10%, #1f3b2c 0%, #0d1611 55%, #050806 100%)',
  hockey: 'radial-gradient(120% 90% at 85% 10%, #22364a 0%, #0c141c 55%, #05080b 100%)',
  basketball: 'radial-gradient(120% 90% at 85% 10%, #46301c 0%, #1a120b 55%, #080604 100%)',
  handball: 'radial-gradient(120% 90% at 85% 10%, #3a2a44 0%, #150f19 55%, #070509 100%)',
  motorsport: 'radial-gradient(120% 90% at 85% 10%, #45201f 0%, #190c0c 55%, #080404 100%)',
  tennis: 'radial-gradient(120% 90% at 85% 10%, #3b3f1e 0%, #15160b 55%, #070704 100%)',
  other: 'radial-gradient(120% 90% at 85% 10%, #2a2c33 0%, #111216 55%, #060608 100%)',
}

/** (Hex med alfa i st.f. rgba(): happy-dom släpper gradienter med rgba, så testet kan inte läsa dem annars.) */
/**
 * Läsbarheten: hela bilden mörkas ~50 % (#00000080), mer till vänster där
 * rubrik och hero står och upptill där flikarna ligger. Korten har dessutom
 * egen grund (svart 85 % som standard), så texten och tidslinjens block
 * läses över vilken bild som helst.
 */
export const BACKDROP_SCRIM = 'linear-gradient(180deg, #00000073 0%, #00000026 30%, #00000000 55%), linear-gradient(90deg, #000000a6 0%, #00000059 40%, #00000000 75%), linear-gradient(#00000080, #00000080)'
/** Telefonen: texten går över hela bredden, så bilden tonas också ned uppifrån och ned. */
export const BACKDROP_SCRIM_PHONE = `linear-gradient(180deg, #00000080 0%, #000000b3 45%, #000000e6 100%), linear-gradient(#00000059, #00000059)`

export function chooseSportBackdrop(i: BackdropInput): BackdropChoice {
  if (i.mode === 'off') return { kind: 'none' }
  const sport = i.hero?.kind ?? 'other'
  const usable = (url: string | null | undefined): url is string => !!url && !i.broken?.has(url)
  const standard = (): BackdropChoice => (usable(i.standard) ? { kind: 'image', url: i.standard, from: 'standard' } : { kind: 'gradient', sport })
  if (i.mode === 'standard') return standard()
  if (i.mode === 'custom') {
    const v = i.uploads[i.slot]
    const url = v != null ? customBackdropUrl(i.slot, v) : null
    return usable(url) ? { kind: 'image', url, from: 'custom' } : standard()
  }
  if (!i.hasKey || !i.hero) return standard()
  if (usable(i.hero.venueImage)) return { kind: 'image', url: i.hero.venueImage, from: 'venue' }
  const stadium = i.art?.stadium
  const fanart = i.art?.fanart
  if (usable(stadium)) return { kind: 'image', url: stadium, from: 'stadium' }
  if (usable(fanart)) return { kind: 'image', url: fanart, from: 'fanart' }
  return standard()
}

/** Källornas bilder via appens bildcache (en hämtning per bild); Standard och Egen bild serveras redan av värden. */
export function backdropSrc(c: Extract<BackdropChoice, { kind: 'image' }>): string | null {
  return c.from === 'custom' || c.from === 'standard' ? c.url : getPluginHttpAssetUrl('/api/live-tv/sport/image', c.url)
}

// ---------------------------------------------------------------- egna bilder på värden

const UPLOADS_EVENT = 'lumio-sport-backdrops-changed'
type Uploads = Partial<Record<BackdropScope, number>>
let uploadsCache: Uploads | null = null

export async function fetchBackdropUploads(): Promise<Uploads> {
  try {
    const res = await fetch('/api/live-tv/sport/backdrops', { cache: 'no-store' })
    if (!res.ok) return {}
    const body = (await res.json()) as { slots?: Record<string, unknown> }
    const out: Uploads = {}
    for (const [k, v] of Object.entries(body.slots ?? {})) if (typeof v === 'number') out[k as BackdropScope] = v
    return out
  } catch {
    return {}
  }
}

/** Efter en uppladdning, en överlämning från telefonen eller en borttagning. */
export function notifyBackdropUploadsChanged(): void {
  uploadsCache = null
  try { window.dispatchEvent(new Event(UPLOADS_EVENT)) } catch { /* ingen window i test */ }
}

export function useBackdropUploads(): Uploads {
  const [uploads, setUploads] = useState<Uploads>(() => uploadsCache ?? {})
  useEffect(() => {
    let alive = true
    const load = () => void fetchBackdropUploads().then((u) => { uploadsCache = u; if (alive) setUploads(u) })
    if (!uploadsCache) load()
    window.addEventListener(UPLOADS_EVENT, load)
    return () => { alive = false; window.removeEventListener(UPLOADS_EVENT, load) }
  }, [])
  return uploads
}

/** Laddar upp en fil från skrivbordet (eller telefonen som fjärrklient) till värden. */
export async function uploadBackdrop(slot: BackdropScope, file: Blob): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/live-tv/sport/backdrop?slot=${slot}`, { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: body.error ?? 'failed' }
    }
    notifyBackdropUploadsChanged()
    return { ok: true }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function removeBackdrop(slot: BackdropScope): Promise<void> {
  try { await fetch(`/api/live-tv/sport/backdrop?slot=${slot}`, { method: 'DELETE' }) } catch { /* värden borta */ }
  notifyBackdropUploadsChanged()
}

// ---------------------------------------------------------------- ton ur bilden

const TONE_KEY = 'lumio.sport.backdrop-tones.v1'
const tones = new Map<string, Rgb | null>()
function readToneStore(): Record<string, Rgb> {
  try { return JSON.parse(window.localStorage.getItem(TONE_KEY) ?? '{}') as Record<string, Rgb> } catch { return {} }
}
function writeTone(src: string, rgb: Rgb): void {
  try {
    const all = readToneStore()
    all[src] = rgb
    const keys = Object.keys(all)
    for (const k of keys.slice(0, Math.max(0, keys.length - 40))) delete all[k]
    window.localStorage.setItem(TONE_KEY, JSON.stringify(all))
  } catch { /* privat läge eller fullt: bara minnet */ }
}

function sampleTone(src: string): Promise<Rgb | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.decoding = 'async'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 24
          canvas.height = 24
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(null)
          ctx.drawImage(img, 0, 0, 24, 24)
          resolve(averageRgb(ctx.getImageData(0, 0, 24, 24).data))
        } catch { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = src
    } catch { resolve(null) }
  })
}

/** Medelfärgen för en bild: medföljande bilder ur tabellen, andra provas EN gång och cachas. */
export function useImageTone(src: string | null, wanted: boolean): Rgb | null {
  const known = (s: string | null): Rgb | null | undefined => {
    if (!s) return null
    if (STANDARD_TONES[s]) return STANDARD_TONES[s]!
    if (tones.has(s)) return tones.get(s) ?? null
    const stored = readToneStore()[s]
    if (stored) { tones.set(s, stored); return stored }
    return undefined
  }
  const [tone, setTone] = useState<Rgb | null>(() => (wanted ? known(src) ?? null : null))
  useEffect(() => {
    if (!wanted || !src) { setTone(null); return }
    const hit = known(src)
    if (hit !== undefined) { setTone(hit); return }
    let alive = true
    void sampleTone(src).then((rgb) => {
      tones.set(src, rgb)
      if (rgb) writeTone(src, rgb)
      if (alive) setTone(rgb)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, wanted])
  return tone
}

// `källa:sport:lag` → bilder. Bara lyckade svar sparas; en spärr eller ett nätfel försöks igen nästa gång.
const artCache = new Map<string, TeamArt | null>()
export function __resetBackdropForTests(): void {
  artCache.clear()
}

/**
 * Hemmalagets bilder för hero-matchen. API-Sports har ingen sådan uppslagning
 * (`teamArt` är null, och arenan kommer ur fixturen). TheSportsDB kostar ett
 * `lookupteam` per lag, genom kvothanteraren som ett `search`-anrop (skyddas
 * av reserven), och cachas sedan 30 dygn på disk och här i minnet.
 */
export function useHeroTeamArt(hero: SportMatch | null): TeamArt | null {
  const provider = hero?.fixture?.provider ?? null
  const teamId = provider ? hero?.homeIds?.[provider] ?? null : null
  const key = hero && provider && teamId && !hero.venueImage ? `${provider}:${hero.kind}:${teamId}` : null
  const [art, setArt] = useState<TeamArt | null>(() => (key ? artCache.get(key) ?? null : null))
  useEffect(() => {
    if (!key || !hero || !teamId) { setArt(null); return }
    if (artCache.has(key)) { setArt(artCache.get(key) ?? null); return }
    const budget = currentBudget()
    const call = budget?.provider.teamArt(hero.kind, teamId) ?? null
    if (!budget || !call) { setArt(null); return }
    let alive = true
    void budget.run('search', hero.kind, call).then((res) => {
      if (res.ok) artCache.set(key, res.data)
      if (alive) setArt(res.data ?? null)
    })
    return () => { alive = false }
    // `key` bär allt som avgör uppslagningen; matchobjektet byter identitet vid varje sammanslagning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return key ? art : null
}

export interface SportBackdropState {
  choice: BackdropChoice
  onBroken(url: string): void
  /** Variablerna för Sport-roten; `null` = ingen bild, ytorna behåller sina vanliga färger. */
  surface: CardSurfaceVars | null
}

/** `scope`: vyns sportfilter ("all" = Alla sporter). */
export function useSportBackdrop(hero: SportMatch | null, scope: BackdropScope = 'all', nowMs: number = Date.now()): SportBackdropState {
  const settings = useSportSettings()
  const uploads = useBackdropUploads()
  const tvMode = useTvMode()
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set())
  const { mode, slot } = resolveBackdropMode(settings.backdrops, scope)
  const art = useHeroTeamArt(mode === 'auto' && settings.apiKey ? hero : null)
  const onBroken = useCallback((url: string) => setBroken((b) => (b.has(url) ? b : new Set(b).add(url))), [])
  const choice = chooseSportBackdrop({
    mode,
    slot,
    hasKey: !!settings.apiKey,
    hero,
    art,
    uploads,
    standard: standardImageFor(scope, localDayKey(nowMs)),
    broken,
  })
  const src = choice.kind === 'image' ? backdropSrc(choice) : null
  const tone = useImageTone(src, settings.cards.tone === 'image')
  // Oskärpan kostar på TV-boxarna (och gamla WebViews saknar den): bara skrivbord och telefon.
  const surface = choice.kind === 'image' ? cardSurfaceVars(settings.cards, tone, { blur: !tvMode }) : null
  return { choice, onBroken, surface }
}
