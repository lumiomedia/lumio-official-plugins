// runtime/sport/key-model.ts
import { maskKey } from './key-flow'
import { PROVIDER_IDS, PROVIDER_LABEL, providerFor } from './providers'
import { SPORT_CHIPS } from './sport-model'
import type { Budget } from './budget'
import type { KeyedProviderId, ProviderId } from './provider'
import type { SportKind } from './sport-model'
import type { SportSettings } from './sport-store'
import type { TvStringKey } from '../tv/tv-strings'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Sportens namn i inställningarna: översatt och med versal ("Fotboll", "Ice hockey"). Samma nycklar som sportchipsen. */
export const SPORT_LABEL_KEY: Record<SportKind, TvStringKey> = {
  football: 'sportKindFootball', hockey: 'sportKindHockey', basketball: 'sportKindBasketball', handball: 'sportKindHandball',
  motorsport: 'sportKindMotorsport', tennis: 'sportKindTennis', other: 'sportKindOther',
}
export function sportLabel(sport: SportKind, tt: TT): string { return tt(SPORT_LABEL_KEY[sport]) }

/** Sporterna någon källa ger resultat för (motorsport och tennis har ingen källa). */
export const ORDER_SPORTS: readonly SportKind[] = SPORT_CHIPS.filter((s) => PROVIDER_IDS.some((id) => providerFor(id).coverage(s) === 'full'))

/** Kortets rad om täckning och gräns. */
export const PROVIDER_BLURB_KEY: Record<KeyedProviderId, TvStringKey> = {
  sportapi: 'sportKeyBlurbSportApi', 'api-sports': 'sportKeyBlurbApiSports', thesportsdb: 'sportKeyBlurbTheSportsDb',
}

export interface KeyQuota { bucket: string; used: number; limit: number }
export interface KeyRow {
  id: KeyedProviderId
  label: string
  state: 'none' | 'ok' | 'paused' | 'invalid'
  masked: string | null
  /** Pausad: när den första spärren släpper. */
  until: number | null
  /** Dagens förbrukning per hink (API-Sports har en per sport). Bara kända hinkar. */
  quotas: KeyQuota[]
  /** Källan har ingen dygnsgräns (TheSportsDB). */
  noDailyLimit: boolean
}

/** Hinkarna en källa har: en per täckt sport, utan dubbletter (TheSportsDB delar en). */
export function bucketsOf(id: ProviderId): string[] {
  const p = providerFor(id)
  return [...new Set(ORDER_SPORTS.filter((s) => p.coverage(s) === 'full').map((s) => p.bucket(s)))]
}

/** En rad per källa i Nycklar: status, maskad nyckel och dagens kvot. `budget(id)` = källans kvothanterare (routern). */
export function keyRows(s: Pick<SportSettings, 'keys'>, budget: (id: ProviderId) => Budget | null, now: number): KeyRow[] {
  return PROVIDER_IDS.map((id) => {
    const k = s.keys[id]
    const base: KeyRow = { id, label: PROVIDER_LABEL[id], state: 'none', masked: null, until: null, quotas: [], noDailyLimit: id === 'thesportsdb' }
    if (!k) return base
    const b = budget(id)
    const masked = maskKey(k.key)
    if (!b) return { ...base, state: 'ok', masked }
    if (b.isInvalid()) return { ...base, state: 'invalid', masked }
    const quotas: KeyQuota[] = []
    const untils: number[] = []
    for (const bucket of bucketsOf(id)) {
      const q = b.quota(bucket)
      if (q.limit != null && q.remaining != null) quotas.push({ bucket, used: Math.max(0, q.limit - q.remaining), limit: q.limit })
      if (q.blockedUntil != null && q.blockedUntil > now) untils.push(q.blockedUntil)
    }
    return { ...base, masked, quotas, state: untils.length ? 'paused' : 'ok', until: untils.length ? Math.min(...untils) : null }
  })
}

export type KeyTone = 'ok' | 'none' | 'warn' | 'bad'

/** Kortets statuspiller: "Aktiv · 47 kvar idag", "Ingen nyckel", "Pausad till 02:00", "Nyckeln godtogs inte". */
export function keyStatus(r: KeyRow, tt: TT, opts: { locale: string; tz?: string }): { text: string; tone: KeyTone } {
  if (r.state === 'none') return { text: tt('sportKeyStateNone'), tone: 'none' }
  if (r.state === 'invalid') return { text: tt('sportKeyRejected'), tone: 'bad' }
  if (r.state === 'paused' && r.until != null) {
    const time = new Intl.DateTimeFormat(opts.locale, { hour: '2-digit', minute: '2-digit', timeZone: opts.tz }).format(r.until)
    return { text: tt('sportKeyStatePaused', { time }), tone: 'warn' }
  }
  const active = tt('sportKeyStateActive')
  if (r.noDailyLimit) return { text: `${active} · ${tt('sportKeyNoDailyLimit')}`, tone: 'ok' }
  // En hink (sportapi.ai): kvar i dag i pillret. Flera (API-Sports, en per sport): raden under kortet.
  if (bucketsOf(r.id).length === 1 && r.quotas.length === 1) {
    const q = r.quotas[0]
    return { text: `${active} · ${tt('sportKeyLeftToday', { n: new Intl.NumberFormat(opts.locale).format(Math.max(0, q.limit - q.used)) })}`, tone: 'ok' }
  }
  return { text: active, tone: 'ok' }
}

/** Källor med en hink per sport: "Kvar idag: Fotboll 0 · Ishockey 97" (bara kända hinkar). */
export function keyQuotaDetail(r: KeyRow, tt: TT, locale: string): string | null {
  if (r.state === 'none' || r.state === 'invalid' || bucketsOf(r.id).length < 2 || r.quotas.length === 0) return null
  const nf = new Intl.NumberFormat(locale)
  const list = r.quotas.map((q) => `${sportLabel(q.bucket as SportKind, tt)} ${nf.format(Math.max(0, q.limit - q.used))}`).join(' · ')
  return tt('sportKeyLeftPerSport', { list })
}
