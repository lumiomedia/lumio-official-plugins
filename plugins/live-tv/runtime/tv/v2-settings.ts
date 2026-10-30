import type { TvStringKey } from './tv-strings'

/**
 * UTSEENDET FÖR KANALGUIDE V2 (handoff `design_handoff_live_tv 2`, Jerry 2026-10-30).
 *
 * Kanaler-vyn har två layouter: Klassisk (dagens hubb i ny design, standard)
 * och Upplevelse (Hem v3). Guidens kategorier står i en kolumn eller som chips,
 * färgtonen tas ur bilden, och bakgrunden har tre toner. Allt ligger i samma
 * lager som övriga TV-inställningar (`live_tv_tv_settings_v1`) och gäller
 * direkt utan omstart. Samma mönster som `start-view.ts`: listan är ordningen
 * TV-raderna växlar runt i med OK.
 */
export type HubLayout = 'classic' | 'experience'
export type GuideCategoryLayout = 'column' | 'chips'
export type LiveBackground = 'slate' | 'graphite' | 'night'

export const HUB_LAYOUTS: readonly HubLayout[] = ['classic', 'experience']
export const GUIDE_CATEGORY_LAYOUTS: readonly GuideCategoryLayout[] = ['column', 'chips']
export const LIVE_BACKGROUNDS: readonly LiveBackground[] = ['slate', 'graphite', 'night']

function pick<T extends string>(list: readonly T[], raw: unknown): T {
  return (list as readonly unknown[]).includes(raw) ? (raw as T) : list[0]
}
function cycle<T extends string>(list: readonly T[], current: T): T {
  return list[(list.indexOf(current) + 1) % list.length]
}

export const sanitizeHubLayout = (raw: unknown): HubLayout => pick(HUB_LAYOUTS, raw)
export const sanitizeGuideCategoryLayout = (raw: unknown): GuideCategoryLayout => pick(GUIDE_CATEGORY_LAYOUTS, raw)
export const sanitizeLiveBackground = (raw: unknown): LiveBackground => pick(LIVE_BACKGROUNDS, raw)

export const nextHubLayout = (v: HubLayout): HubLayout => cycle(HUB_LAYOUTS, v)
export const nextGuideCategoryLayout = (v: GuideCategoryLayout): GuideCategoryLayout => cycle(GUIDE_CATEGORY_LAYOUTS, v)
export const nextLiveBackground = (v: LiveBackground): LiveBackground => cycle(LIVE_BACKGROUNDS, v)

export function hubLayoutLabelKey(v: HubLayout): TvStringKey {
  return v === 'classic' ? 'hubLayoutClassic' : 'hubLayoutExperience'
}
export function guideCategoryLayoutLabelKey(v: GuideCategoryLayout): TvStringKey {
  return v === 'column' ? 'guideCategoriesColumn' : 'guideCategoriesChips'
}
export function liveBackgroundLabelKey(v: LiveBackground): TvStringKey {
  return v === 'slate' ? 'bgSlate' : v === 'graphite' ? 'bgGraphite' : 'bgNight'
}
