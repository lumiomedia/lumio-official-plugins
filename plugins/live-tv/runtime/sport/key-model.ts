// runtime/sport/key-model.ts
import { maskKey } from './key-flow'
import { PROVIDER_IDS, PROVIDER_LABEL, orderFor, providerFor } from './providers'
import type { Budget } from './budget'
import type { ProviderId } from './provider'
import type { SportKind } from './sport-model'
import type { SportSettings } from './sport-store'
import type { TvStringKey } from '../tv/tv-strings'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Sporterna i Källa per sport (de någon källa kan ge resultat för). */
export const ORDER_SPORTS: readonly SportKind[] = ['football', 'hockey', 'basketball', 'handball']
export const SPORT_NAME_KEY: Partial<Record<SportKind, TvStringKey>> = {
  football: 'sportNameFootball', hockey: 'sportNameHockey', basketball: 'sportNameBasketball', handball: 'sportNameHandball',
}

export interface KeyQuota { bucket: string; used: number; limit: number }
export interface KeyRow {
  id: ProviderId
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

const BUCKET_NAME: Record<string, TvStringKey> = {
  football: 'sportNameFootball', hockey: 'sportNameHockey', basketball: 'sportNameBasketball', handball: 'sportNameHandball',
}

/** "OK · ••••3f9a · 12 / 2 000 i dag", "Pausad till 01:00", "Ingen nyckel". */
export function keyRowText(r: KeyRow, tt: TT, opts: { locale: string; tz?: string }): string {
  if (r.state === 'none') return tt('sportKeyStateNone')
  if (r.state === 'invalid') return [tt('sportKeyStateInvalid'), r.masked].filter(Boolean).join(' · ')
  const nf = new Intl.NumberFormat(opts.locale)
  const head = r.state === 'paused' && r.until != null
    ? tt('sportKeyStatePaused', { time: new Intl.DateTimeFormat(opts.locale, { hour: '2-digit', minute: '2-digit', timeZone: opts.tz }).format(r.until) })
    : tt('sportKeyStateOk')
  const quota = r.noDailyLimit
    ? tt('sportKeyNoDailyLimit')
    : r.quotas.map((q) => {
      const n = tt('sportKeyQuotaToday', { used: nf.format(q.used), limit: nf.format(q.limit) })
      return r.quotas.length > 1 && BUCKET_NAME[q.bucket] ? `${tt(BUCKET_NAME[q.bucket])} ${n}` : n
    }).join(', ')
  return [head, r.masked, quota].filter(Boolean).join(' · ')
}

/** Sportens hela ordning (alla källor som täcker den), med nyckelstatus för visningen. */
export function orderRows(s: Pick<SportSettings, 'keys' | 'order'>, sport: SportKind): Array<{ id: ProviderId; label: string; hasKey: boolean }> {
  return orderFor(s.order, sport).map((id) => ({ id, label: PROVIDER_LABEL[id], hasKey: !!s.keys[id] }))
}

/** Flytta en källa ett steg (−1 = upp). Utanför kanten: oförändrat. */
export function moveProvider(order: ProviderId[], id: ProviderId, dir: -1 | 1): ProviderId[] {
  const i = order.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= order.length) return order
  const next = [...order]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}
