'use client'

import { useCallback, useEffect, useState } from 'react'
import { getHomeBackgroundUrls, getPluginHttpAssetUrl, onHomeBackgroundChanged } from '@/lib/plugin-sdk'
import { currentBudget } from './budget'
import { useSportSettings, type SportBackdropCustom, type SportBackdropMode } from './sport-store'
import type { TeamArt } from './provider'
import type { SportKind, SportMatch } from './sport-model'

export type BackdropChoice =
  | { kind: 'none' }
  | { kind: 'image'; url: string; from: 'venue' | 'stadium' | 'fanart' | 'custom' }
  | { kind: 'gradient'; sport: SportKind }

export interface BackdropInput {
  mode: SportBackdropMode
  hasKey: boolean
  hero: Pick<SportMatch, 'kind' | 'venueImage'> | null
  /** Hemmalagets bilder (TheSportsDB). `null` = okänt, eller API-Sports som inte har någon. */
  art: TeamArt | null
  /** Egen bild, redan uppslagen (http(s) eller startsidans data-URL). */
  custom: string | null
  /** Bilder som inte gick att ladda i den här sessionen. */
  broken?: ReadonlySet<string>
}

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
/** Läsbarheten (handoffens hero över arenafotot): mörkt till vänster där texten står, bilden syns till höger. */
export const BACKDROP_SCRIM = 'linear-gradient(90deg, #000000eb 0%, #000000c7 38%, #00000073 70%, #0000004d 100%)'
/** Telefonen: texten går över hela bredden, så bilden tonas också ned uppifrån och ned. */
export const BACKDROP_SCRIM_PHONE = `linear-gradient(180deg, #00000080 0%, #000000d9 45%, #000 100%), ${BACKDROP_SCRIM}`

export function chooseSportBackdrop(i: BackdropInput): BackdropChoice {
  if (i.mode === 'off') return { kind: 'none' }
  const sport = i.hero?.kind ?? 'other'
  const usable = (url: string | null | undefined): url is string => !!url && !i.broken?.has(url)
  if (i.mode === 'custom') return usable(i.custom) ? { kind: 'image', url: i.custom, from: 'custom' } : { kind: 'gradient', sport }
  if (!i.hasKey || !i.hero) return { kind: 'gradient', sport }
  if (usable(i.hero.venueImage)) return { kind: 'image', url: i.hero.venueImage, from: 'venue' }
  const stadium = i.art?.stadium
  const fanart = i.art?.fanart
  if (usable(stadium)) return { kind: 'image', url: stadium, from: 'stadium' }
  if (usable(fanart)) return { kind: 'image', url: fanart, from: 'fanart' }
  return { kind: 'gradient', sport }
}

export function resolveCustomBackdrop(c: SportBackdropCustom | null, homeUrls: string[]): string | null {
  if (!c) return null
  return c.from === 'url' ? c.url : homeUrls[c.index] ?? null
}

/** Källornas bilder via appens bildcache (en hämtning per bild); Egen bild som den är, som startsidan gör. */
export function backdropSrc(c: Extract<BackdropChoice, { kind: 'image' }>): string | null {
  return c.from === 'custom' ? c.url : getPluginHttpAssetUrl('/api/live-tv/sport/image', c.url)
}

export function useHomeBackgrounds(): string[] {
  const [urls, setUrls] = useState(getHomeBackgroundUrls)
  useEffect(() => onHomeBackgroundChanged(() => setUrls(getHomeBackgroundUrls())), [])
  return urls
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

export function useSportBackdrop(hero: SportMatch | null): { choice: BackdropChoice; onBroken(url: string): void } {
  const settings = useSportSettings()
  const homeUrls = useHomeBackgrounds()
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set())
  const art = useHeroTeamArt(settings.backdrop === 'auto' && settings.apiKey ? hero : null)
  const onBroken = useCallback((url: string) => setBroken((b) => (b.has(url) ? b : new Set(b).add(url))), [])
  const choice = chooseSportBackdrop({
    mode: settings.backdrop,
    hasKey: !!settings.apiKey,
    hero,
    art,
    custom: resolveCustomBackdrop(settings.backdropCustom, homeUrls),
    broken,
  })
  return { choice, onBroken }
}
