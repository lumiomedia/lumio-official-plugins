// runtime/sport/router.ts
'use client'

import { Budget, type BudgetDeps, type BudgetFailure, type BudgetResult, type CallKind } from './budget'
import { getSportSettings } from './sport-store'
import { effectiveOrder, providerFor } from './providers'
import type { DayOpts, Fixture, FixtureDetail, LiveOpts, ProviderCall, ProviderId, SportsProvider, StandingRow, TeamHit } from './provider'
import type { SportQuota } from './sport-fetch'
import type { SportKind } from './sport-model'
import type { ProviderKeys, SportOrder } from './sport-store'

export type RoutedResult<T> = BudgetResult<T> & { provider: ProviderId | null }
export interface FixtureRef { provider: ProviderId; id: string }

/** Kvotfel: då har nästa källa i ordningen chansen. Nätfel och okänd täckning har det inte. */
const FALL_THROUGH: ReadonlySet<BudgetFailure> = new Set(['paused', 'over-budget', 'invalid-key'])

/**
 * FLERA KÄLLOR SAMTIDIGT, EN NYCKEL PER KÄLLA. En kvothanterare (`Budget`)
 * per källa med nyckel; routern väljer per sport den första källan i
 * sportens ordning som har kvot för anropet. Är den slut (429, boken på 0,
 * minutspärr) eller nyckeln ogiltig går anropet till nästa källa — tills
 * kvoten nollställs, då nästa val åter blir den första. Varje anrop går
 * fortfarande genom en `Budget`, så "budgeten äger varje anrop" gäller.
 *
 * Fixturbundna anrop (matchcenter, tabell, lagbilder) går till källan som äger
 * id:t. Matchcentret får en lista med samma match hos flera källor (alias),
 * så att en spärrad ägare inte släcker centret.
 */
export class SportRouter {
  private readonly budgets = new Map<ProviderId, Budget>()

  /** `make`: återanvänd en källas kvothanterare (samma nyckel) när bara ordningen eller en annan källas nyckel ändras. */
  constructor(readonly keys: ProviderKeys, readonly order: SportOrder, deps: BudgetDeps = {}, make?: (id: ProviderId, key: string) => Budget) {
    for (const [id, k] of Object.entries(keys) as Array<[ProviderId, ProviderKeys[ProviderId]]>) {
      if (k?.key) this.budgets.set(id, make ? make(id, k.key) : new Budget(providerFor(id), k.key, deps))
    }
  }

  budget(id: ProviderId): Budget | null { return this.budgets.get(id) ?? null }
  hasKey(): boolean { return this.budgets.size > 0 }
  /** Fler än en källa med nyckel: då säger takraden vilken källa som används. */
  multi(): boolean { return this.budgets.size > 1 }
  /** Alla nycklar ogiltiga (en ogiltig bland flera är bara den källans problem). */
  isInvalid(): boolean { return this.budgets.size > 0 && [...this.budgets.values()].every((b) => b.isInvalid()) }

  /** Sportens källor med nyckel, i ordning. */
  candidates(sport: SportKind): Budget[] {
    return effectiveOrder({ keys: this.keys, order: this.order }, sport).map((id) => this.budgets.get(id)).filter((b): b is Budget => !!b)
  }

  coverage(sport: SportKind): 'full' | 'epg' {
    return this.candidates(sport).length > 0 ? 'full' : 'epg'
  }

  private usable(b: Budget, kind: CallKind, sport: SportKind, n = 1): boolean {
    return !b.isInvalid() && b.allows(kind, b.provider.bucket(sport), n)
  }

  /** Källan sporten använder just nu (för livetakten och takraden). `null` = ingen har kvot. */
  active(sport: SportKind, kind: CallKind = 'live'): Budget | null {
    return this.candidates(sport).find((b) => this.usable(b, kind, sport)) ?? null
  }
  activeProvider(sport: SportKind): ProviderId | null { return this.active(sport)?.provider.id ?? null }

  /** Kvoten hos källan sporten använder (eller den första, när ingen har kvot kvar). */
  quotaFor(sport: SportKind): { provider: ProviderId; quota: SportQuota } | null {
    const b = this.active(sport) ?? this.candidates(sport)[0]
    return b ? { provider: b.provider.id, quota: b.quota(b.provider.bucket(sport)) } : null
  }

  liveIntervalMs(sport: SportKind, windowEndsAt: number): number | null {
    const b = this.active(sport)
    return b ? b.liveIntervalMs(b.provider.bucket(sport), windowEndsAt) : null
  }

  /** När den första spärren släpper, om ingen källa har kvot nu (pollern vaknar då). */
  pausedUntil(sport: SportKind): number | null {
    if (this.active(sport)) return null
    const ends = this.candidates(sport).map((b) => b.pausedUntil(b.provider.bucket(sport))).filter((x): x is number => x != null)
    return ends.length ? Math.min(...ends) : null
  }

  /** Dygnsplanens återstående anrop per sport, bokförda på den källa sporten använder. */
  setPlanned(perSport: Map<SportKind, number>): void {
    const sums = new Map<Budget, Map<string, number>>()
    for (const b of this.budgets.values()) sums.set(b, new Map())
    for (const [sport, n] of perSport) {
      for (const b of this.candidates(sport)) {
        const m = sums.get(b)!
        const bucket = b.provider.bucket(sport)
        m.set(bucket, m.get(bucket) ?? 0)
      }
      const b = this.active(sport, 'day') ?? this.candidates(sport)[0]
      if (!b) continue
      const m = sums.get(b)!
      const bucket = b.provider.bucket(sport)
      m.set(bucket, (m.get(bucket) ?? 0) + n)
    }
    for (const [b, m] of sums) for (const [bucket, n] of m) b.setPlanned(bucket, n)
  }

  subscribe(cb: () => void): () => void {
    const offs = [...this.budgets.values()].map((b) => b.subscribe(cb))
    return () => { for (const off of offs) off() }
  }

  /**
   * Sportens källor i ordning. En källa som inte kan svara på frågan alls (inga
   * förfrågningar, t.ex. lagsök hos sportapi.ai) hoppas över; en utan kvot också.
   * Ingen källa med kvot: den första svarar ur cachen (Budget går då `cache-only`).
   */
  async route<T>(kind: CallKind, sport: SportKind, build: (p: SportsProvider) => ProviderCall<T> | null): Promise<RoutedResult<T>> {
    const all = this.candidates(sport)
    if (all.length === 0) {
      return { ok: false, reason: this.hasKey() ? 'no-coverage' : 'no-key', data: null, fetchedAt: null, until: null, provider: null }
    }
    const able = all.map((b) => ({ b, call: build(b.provider) })).filter((x): x is { b: Budget; call: ProviderCall<T> } => !!x.call && x.call.requests.length > 0)
    if (able.length === 0) {
      const first = build(all[0].provider)
      return { ok: true, data: first ? first.parse([]) : (null as T), cached: true, fetchedAt: null, provider: all[0].provider.id }
    }
    let last: RoutedResult<T> | null = null
    for (const { b, call } of able) {
      if (!this.usable(b, kind, sport, call.requests.length)) continue
      const res = await b.run(kind, sport, call)
      const routed = { ...res, provider: b.provider.id }
      if (res.ok || !FALL_THROUGH.has(res.reason)) return routed
      last = routed
    }
    if (last) return last
    const { b, call } = able[0]
    return { ...(await b.run(kind, sport, call)), provider: b.provider.id }
  }

  day(sport: SportKind, date: string, opts: DayOpts) { return this.route<Fixture[]>('day', sport, (p) => p.day(sport, date, opts)) }
  live(sport: SportKind, opts: LiveOpts) { return this.route<Fixture[]>('live', sport, (p) => p.live(sport, opts)) }
  searchTeams(sport: SportKind, q: string) { return this.route<TeamHit[]>('search', sport, (p) => p.searchTeams(sport, q)) }
  searchLeagues(sport: SportKind, q: string) { return this.route<TeamHit[]>('search', sport, (p) => p.searchLeagues?.(sport, q) ?? null) }

  /** Matchcentret: ägarens id först, sedan samma match hos andra källor (alias). */
  async fixture(sport: SportKind, refs: FixtureRef[], opts: { finished: boolean; refresh?: boolean }): Promise<RoutedResult<FixtureDetail | null>> {
    const kind: CallKind = opts.refresh && !opts.finished ? 'fixture-refresh' : 'fixture'
    const owned = refs.map((r) => ({ r, b: this.budgets.get(r.provider) })).filter((x): x is { r: FixtureRef; b: Budget } => !!x.b && x.b.provider.coverage(sport) === 'full')
    if (owned.length === 0) return { ok: false, reason: this.hasKey() ? 'no-coverage' : 'no-key', data: null, fetchedAt: null, until: null, provider: null }
    let last: RoutedResult<FixtureDetail | null> | null = null
    for (const { r, b } of owned) {
      const call = b.provider.fixture(sport, r.id, { finished: opts.finished })
      if (!this.usable(b, kind, sport, call.requests.length)) continue
      const res = { ...(await b.run(kind, sport, call)), provider: r.provider }
      if (res.ok || !FALL_THROUGH.has(res.reason)) return res
      last = res
    }
    if (last) return last
    const { r, b } = owned[0]
    return { ...(await b.run(kind, sport, b.provider.fixture(sport, r.id, { finished: opts.finished }))), provider: r.provider }
  }

  /** Tabellen tillhör ligans källa (ligans id är källans). */
  async standings(sport: SportKind, provider: ProviderId, leagueId: string, season: string): Promise<RoutedResult<StandingRow[]>> {
    const b = this.budgets.get(provider)
    if (!b) return { ok: false, reason: 'no-key', data: null, fetchedAt: null, until: null, provider }
    return { ...(await b.standings(sport, leagueId, season)), provider }
  }

  /** Startvärdet ur diskcachen: första källan i ordningen som har något sparat. Kostar aldrig kvot. */
  async peek<T>(sport: SportKind, build: (p: SportsProvider) => ProviderCall<T>): Promise<{ data: T; provider: ProviderId } | null> {
    for (const b of this.candidates(sport)) {
      const data = await b.peek(sport, build(b.provider))
      if (data != null) return { data, provider: b.provider.id }
    }
    return null
  }
}

let current: { id: string; router: SportRouter | null } | null = null
/** En kvothanterare per (källa, nyckel) över hela sessionen: lokal kvotbild och planerat överlever en omordning. */
const budgets = new Map<string, Budget>()

/**
 * EN router för nycklarna (standardordningen per sport). `null` utan nycklar: då görs inga anrop.
 * Samma nycklar och ordning = samma router (och samma resultatlager), även när
 * andra sportinställningar sparas.
 */
export function currentRouter(): SportRouter | null {
  // Källa per sport sköts automatiskt (Jerry 2026-10-11): standardordningen gäller
  // alltid, och en egen ordning sparad av den tidigare väljaren ignoreras.
  const { keys } = getSportSettings()
  const order: SportOrder = {}
  const id = JSON.stringify([keys, order])
  if (current?.id === id) return current.router
  const make = (pid: ProviderId, key: string): Budget => {
    const k = `${pid}|${key}`
    let b = budgets.get(k)
    if (!b) { b = new Budget(providerFor(pid), key); budgets.set(k, b) }
    return b
  }
  const router = new SportRouter(keys, order, {}, make)
  current = { id, router: router.hasKey() ? router : null }
  return current.router
}

export function __resetRouterForTests(): void { current = null; budgets.clear() }
