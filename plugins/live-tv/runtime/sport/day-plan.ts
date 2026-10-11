// runtime/sport/day-plan.ts
import type { ProviderId, SportsProvider } from './provider'
import type { SportKind } from './sport-model'

/** `provider`: ligans källa (ligans id är källans). */
export interface LeagueRef { sport: SportKind; leagueId: string; season: string; provider?: ProviderId }
export interface DayPlanInput { today: string; yesterday: string; tomorrow: string; sports: SportKind[]; leagues: LeagueRef[]; done: Set<string> }
export type PlannedCall =
  | { kind: 'day'; sport: SportKind; date: string }
  | { kind: 'standings'; sport: SportKind; leagueId: string; season: string; provider?: ProviderId }

export function planKey(c: PlannedCall): string {
  return c.kind === 'day' ? `day|${c.sport}|${c.date}` : `standings|${c.sport}|${c.leagueId}|${c.season}`
}

/** Bara täckningen behövs: en källa eller routern (täckt = någon källa med nyckel täcker sporten). */
export function planDay(input: DayPlanInput, provider: Pick<SportsProvider, 'coverage'>): PlannedCall[] {
  const sports = [...new Set(input.sports)].filter((s) => provider.coverage(s) === 'full')
  const out: PlannedCall[] = sports.map((sport) => ({ kind: 'day', sport, date: input.today }))
  for (const sport of sports) {
    for (const date of [input.yesterday, input.tomorrow]) {
      const c: PlannedCall = { kind: 'day', sport, date }
      if (!input.done.has(planKey(c))) out.push(c)
    }
  }
  const seen = new Set<string>()
  for (const l of input.leagues) {
    if (provider.coverage(l.sport) !== 'full') continue
    const c: PlannedCall = { kind: 'standings', sport: l.sport, leagueId: l.leagueId, season: l.season, ...(l.provider ? { provider: l.provider } : {}) }
    const k = planKey(c)
    if (seen.has(k) || input.done.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

export function plannedPerBucket(calls: PlannedCall[], provider: SportsProvider): Map<string, number> {
  const out = new Map<string, number>()
  for (const c of calls) out.set(provider.bucket(c.sport), (out.get(provider.bucket(c.sport)) ?? 0) + 1)
  return out
}

/** Återstående planerade anrop per sport (routern bokför dem på källan sporten använder). */
export function plannedPerSport(calls: PlannedCall[]): Map<SportKind, number> {
  const out = new Map<SportKind, number>()
  for (const c of calls) out.set(c.sport, (out.get(c.sport) ?? 0) + 1)
  return out
}

function ymd(ms: number, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Tidszonens förskjutning (ms) vid en tidpunkt, utan bibliotek. */
function offsetMs(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ms))
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')) - Math.floor(ms / 1000) * 1000
}

export function localDates(now: number, tz: string) {
  const today = ymd(now, tz)
  const [y, m, d] = today.split('-').map(Number)
  const shift = (days: number) => ymd(Date.UTC(y, m - 1, d + days, 12), 'UTC')
  const dayEndMs = (date: string) => {
    const [yy, mm, dd] = date.split('-').map(Number)
    const utcMidnight = Date.UTC(yy, mm - 1, dd + 1)
    return utcMidnight - offsetMs(utcMidnight, tz)
  }
  return { today, yesterday: shift(-1), tomorrow: shift(1), dayEndMs }
}
