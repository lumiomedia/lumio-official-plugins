import type { TvStringKey } from './tv-strings'

/**
 * UTSEENDET FÖR KANALGUIDE V2 (handoff `design_handoff_live_tv 2`, Jerry 2026-10-30).
 *
 * Kanaler-vyn har två layouter: Klassisk (dagens hubb i ny design) och
 * Upplevelse (Hem v3, standard sedan 2026-10-31). Guidens kategorier står i en kolumn eller som chips,
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

function pick<T extends string>(list: readonly T[], raw: unknown, fallback: T = list[0]): T {
  return (list as readonly unknown[]).includes(raw) ? (raw as T) : fallback
}
function cycle<T extends string>(list: readonly T[], current: T): T {
  return list[(list.indexOf(current) + 1) % list.length]
}

/** Upplevelse är standard på alla enheter (Jerry 2026-10-31); listans ordning är bara visningsordningen. */
export const DEFAULT_HUB_LAYOUT: HubLayout = 'experience'
export const sanitizeHubLayout = (raw: unknown): HubLayout => pick(HUB_LAYOUTS, raw, DEFAULT_HUB_LAYOUT)
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

/**
 * DE TVÅ EGNA FÄRGERNA (Jerry 2026-10-30: "en färgväljare … med dessa som
 * standard och en återställ-knapp"). `null` = standard: bakgrunden följer då
 * Skiffer/Grafit/Natt och meny/kort ser ut precis som förut. Bara `#rrggbb`
 * sparas (gemener) — värdet hamnar rakt i CSS och i `mixHex`.
 */
export function sanitizeHexColor(raw: unknown): string | null {
  return typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : null
}

/**
 * TV:ns paletter (en färgväljare går inte att styra med en fjärrkontroll).
 * Mörka, dämpade toner; den första i varje lista är standardfärgen.
 */
export const LIVE_BG_SWATCHES: readonly string[] = ['#161a23', '#1b1b1f', '#0f1219', '#1a1f2e', '#10202a', '#13201b', '#221a24', '#241a1a', '#201d16', '#1c1c28']
export const LIVE_SURFACE_SWATCHES: readonly string[] = ['#2b3142', '#33333a', '#2a3550', '#24414a', '#2c3a34', '#3a2e3e', '#3e2c2c', '#38342a', '#30304a', '#3a3f4c']
