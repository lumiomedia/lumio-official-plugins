// runtime/sport/budget.ts
'use client'

import { sportFetch, sportQuota, type FetchMode, type SportFetchResponse, type SportQuota } from './sport-fetch'
import { sportDirect } from './sport-direct'
import type { DayOpts, Fixture, FixtureDetail, KeyCheck, LiveOpts, ProviderCall, ProviderId, ProviderRequest, SportsProvider, StandingRow, TeamHit } from './provider'
import type { SportKind } from './sport-model'

/**
 * KVOTHANTERAREN. Äger VARJE anrop mot källan (spec: "Kvothanteraren").
 * Ingen annan modul får importera `sport-fetch` med värde. Det fäller ett
 * test i sport-fetch.test.ts.
 *
 * Sanningen om kvoten är svarets `quota` (Rust läser källans headers och
 * för en bok som delas av alla klienter mot värden). Mellan svaren räknar vi
 * ned lokalt, så att två samtidiga anrop inte båda tror att samma sista
 * anrop är ledigt.
 *
 * Källor utan nyckel (`provider.keyless`, ESPN) hämtas direkt från webbvyn
 * (`sport-direct`) och har ingen kvot; resten av vägen är densamma.
 */
/**
 * `fixture` = matchcentret öppnas (får ta ur reserven, som är till för just det).
 * `fixture-refresh` = en pågående match hämtas om medan centret står öppet. Den
 * följer pollningstakten och räknas som live: reserven och planen går före.
 */
export type CallKind = 'validate' | 'fixture' | 'fixture-refresh' | 'day' | 'standings' | 'search' | 'live'
export type BudgetFailure = 'no-key' | 'no-coverage' | 'over-budget' | 'paused' | 'invalid-key' | 'network'
export type BudgetResult<T> =
  | { ok: true; data: T; cached: boolean; fetchedAt: number | null }
  | { ok: false; reason: BudgetFailure; data: T | null; fetchedAt: number | null; until: number | null }

export interface BudgetDeps {
  fetch?: typeof sportFetch
  direct?: typeof sportDirect
  ledger?: typeof sportQuota
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

const RETRY_MS = 2_000
const DAY_MS = 86_400_000

export function reserveFor(limit: number | null): number {
  return limit == null ? 0 : Math.max(5, Math.ceil(limit * 0.1))
}

const unknownQuota = (bucket: string): SportQuota => ({ bucket, limit: null, remaining: null, minuteLimit: null, minuteRemaining: null, blockedUntil: null, reason: null, plan: null })

export class Budget {
  private quotas = new Map<string, SportQuota>()
  /** När varje hinks kvot senast kom från ett svar. Dygnskvoter nollställs 00:00 UTC. */
  private notedAt = new Map<string, number>()
  private planned = new Map<string, number>()
  private primed = new Set<string>()
  private invalid = false
  private listeners = new Set<() => void>()
  private readonly fetchImpl: typeof sportFetch
  private readonly directImpl: typeof sportDirect
  private readonly ledgerImpl: typeof sportQuota
  private readonly now: () => number
  private readonly sleep: (ms: number) => Promise<void>

  constructor(readonly provider: SportsProvider, readonly key: string | null, deps: BudgetDeps = {}) {
    this.fetchImpl = deps.fetch ?? sportFetch
    this.directImpl = deps.direct ?? sportDirect
    this.ledgerImpl = deps.ledger ?? sportQuota
    this.now = deps.now ?? Date.now
    this.sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  hasKey(): boolean { return !!this.key }
  /** Kan göra anrop: har en nyckel, eller källan behöver ingen. */
  private canCall(): boolean { return !!this.key || !!this.provider.keyless }

  private get(req: ProviderRequest, mode: FetchMode): Promise<SportFetchResponse> {
    return this.provider.keyless
      ? this.directImpl({ provider: this.provider.id, req, mode })
      : this.fetchImpl({ provider: this.provider.id, key: this.key ?? '', req, mode })
  }

  /** Dagens kvot ur värdens bok (delas av TV och telefon). Lokalt anrop, kostar ingen kvot: för inställningarnas Nycklar. */
  async loadLedger(): Promise<void> {
    if (!this.key) return
    for (const q of await this.ledgerImpl(this.provider.id, this.key)) this.noteQuota(q)
  }
  isInvalid(): boolean { return this.invalid }

  /**
   * En spärr som passerat släpps här, utan att vänta på nästa svar: står vyn
   * öppen över dygnsskiftet ska pollningen komma igång av sig själv. "Slut i
   * dag" betyder att den lagrade `remaining: 0` är gårdagens, så den blir okänd
   * (nästa svar sätter den). En minutspärr behåller dygnets siffror.
   */
  quota(bucket: string): SportQuota {
    const q = this.quotas.get(bucket)
    if (!q) return unknownQuota(bucket)
    // Dygnskvoten nollställs 00:00 UTC (API-Sports och sportapi.ai). Gårdagens
    // siffror är okända i dag; nästa svar sätter dem. Utan det hade en källa som
    // räknats ned lokalt till 0 (utan spärr) aldrig kommit tillbaka.
    if (q.limit != null && Math.floor((this.notedAt.get(bucket) ?? 0) / DAY_MS) < Math.floor(this.now() / DAY_MS)) {
      return q.reason === 'exhausted' || q.blockedUntil == null || q.blockedUntil <= this.now()
        ? { ...q, remaining: null, blockedUntil: null, reason: null }
        : { ...q, remaining: null }
    }
    if (q.blockedUntil == null || q.blockedUntil > this.now()) return q
    return q.reason === 'exhausted'
      ? { ...q, remaining: null, blockedUntil: null, reason: null }
      : { ...q, blockedUntil: null, reason: null }
  }

  /** Tidpunkten då en spärr på hinken släpper, eller `null` om ingen spärr gäller nu. */
  pausedUntil(bucket: string): number | null {
    const until = this.quota(bucket).blockedUntil
    return until != null && until > this.now() ? until : null
  }

  noteQuota(q: SportQuota): void {
    this.quotas.set(q.bucket, q)
    this.notedAt.set(q.bucket, this.now())
    this.emit()
  }

  setPlanned(bucket: string, n: number): void {
    if ((this.planned.get(bucket) ?? 0) === n) return
    this.planned.set(bucket, Math.max(0, n))
    this.emit()
  }
  plannedFor(bucket: string): number { return this.planned.get(bucket) ?? 0 }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }
  private emit(): void { for (const cb of [...this.listeners]) cb() }

  private blocked(bucket: string): boolean {
    const until = this.quota(bucket).blockedUntil
    return until != null && until > this.now()
  }

  allows(kind: CallKind, bucket: string, n: number): boolean {
    if (this.blocked(bucket)) return false
    if (kind === 'validate') return true
    const q = this.quota(bucket)
    if (q.remaining == null) return true
    const reserve = reserveFor(q.limit)
    switch (kind) {
      case 'fixture': return q.remaining >= n
      case 'day':
      case 'standings':
      case 'search': return q.remaining - n >= reserve
      case 'live':
      case 'fixture-refresh': return q.remaining - n >= reserve + this.plannedFor(bucket)
    }
  }

  /** `max(golv, återstående livefönster / (kvar − reserv − planerat))`. `null` = polla inte. */
  liveIntervalMs(bucket: string, windowEndsAt: number): number | null {
    if (this.blocked(bucket)) return null
    const floor = this.provider.liveFloorMs
    const q = this.quota(bucket)
    if (q.remaining == null) return floor
    const spendable = q.remaining - reserveFor(q.limit) - this.plannedFor(bucket)
    if (spendable <= 0) return null
    return Math.max(floor, Math.ceil(Math.max(0, windowEndsAt - this.now()) / spendable))
  }

  private spendLocal(bucket: string, n: number): void {
    if (!this.quotas.has(bucket)) return
    const q = this.quota(bucket)
    if (q.remaining != null && n > 0) this.quotas.set(bucket, { ...q, remaining: Math.max(0, q.remaining - n) })
  }

  private async prime(sport: SportKind, bucket: string): Promise<void> {
    if (this.primed.has(bucket) || this.quota(bucket).remaining != null) return
    const probe = this.provider.quotaProbe(sport)
    this.primed.add(bucket)
    if (!probe) return
    for (const req of probe.requests) {
      const res = await this.fetchImpl({ provider: this.provider.id, key: this.key ?? '', req, mode: 'cache-first' })
      if (res.quota) this.noteQuota(res.quota)
      if (res.error === 'unauthorized') { this.invalid = true; this.emit() }
    }
  }

  async run<T>(kind: CallKind, sport: SportKind, call: ProviderCall<T>): Promise<BudgetResult<T>> {
    const none = (reason: BudgetFailure): BudgetResult<T> => ({ ok: false, reason, data: null, fetchedAt: null, until: null })
    if (!this.canCall()) return none('no-key')
    if (this.provider.coverage(sport) !== 'full') return none('no-coverage')
    if (this.invalid && kind !== 'validate') return none('invalid-key')
    if (call.requests.length === 0) return { ok: true, data: call.parse([]), cached: true, fetchedAt: null }
    const bucket = this.provider.bucket(sport)
    if (kind !== 'validate') {
      await this.prime(sport, bucket)
      if (this.invalid) return none('invalid-key')
    }
    const n = call.requests.length
    const affordable = this.allows(kind, bucket, n)
    const mode: FetchMode = affordable ? 'cache-first' : 'cache-only'
    if (affordable && kind !== 'validate') this.spendLocal(bucket, n)
    let failure: BudgetFailure | null = affordable ? null : this.blocked(bucket) ? 'paused' : 'over-budget'
    let cached = true
    let fetchedAt: number | null = null
    const bodies: unknown[] = []
    // En nyckelfri källa har ingen kvot att räkna ned i ordning: dess förfrågningar går samtidigt.
    const ahead = this.provider.keyless ? call.requests.map((req) => this.get(req, mode)) : null
    for (const [i, req] of call.requests.entries()) {
      let res: SportFetchResponse = await (ahead ? ahead[i] : this.get(req, mode))
      if (res.error === 'network' && mode === 'cache-first') {
        await this.sleep(RETRY_MS)
        if (this.allows(kind, bucket, 1)) res = await this.get(req, mode)
      }
      if (res.quota) this.noteQuota(res.quota)
      if (res.error === 'unauthorized') {
        this.invalid = true
        this.emit()
        return none('invalid-key')
      }
      if (res.error && !failure) failure = res.error === 'network' || res.error === 'upstream' || res.error === 'not-allowed' ? 'network' : 'paused'
      if (!res.cached) cached = false
      if (res.fetchedAt != null) fetchedAt = fetchedAt == null ? res.fetchedAt : Math.min(fetchedAt, res.fetchedAt)
      bodies.push(res.data)
    }
    let data: T | null = null
    if (bodies.some((b) => b != null)) {
      try { data = call.parse(bodies) } catch { data = null }
    }
    if (failure || data == null) {
      return { ok: false, reason: failure ?? 'network', data, fetchedAt, until: this.quota(bucket).blockedUntil }
    }
    return { ok: true, data, cached, fetchedAt }
  }

  day(sport: SportKind, date: string, opts: DayOpts) { return this.run<Fixture[]>('day', sport, this.provider.day(sport, date, opts)) }
  live(sport: SportKind, opts: LiveOpts) { return this.run<Fixture[]>('live', sport, this.provider.live(sport, opts)) }
  fixture(sport: SportKind, id: string, opts: { finished: boolean; refresh?: boolean }) {
    return this.run<FixtureDetail | null>(opts.refresh && !opts.finished ? 'fixture-refresh' : 'fixture', sport, this.provider.fixture(sport, id, { finished: opts.finished }))
  }
  standings(sport: SportKind, leagueId: string, season: string) { return this.run<StandingRow[]>('standings', sport, this.provider.standings(sport, leagueId, season)) }
  searchTeams(sport: SportKind, q: string) { return this.run<TeamHit[]>('search', sport, this.provider.searchTeams(sport, q)) }
  searchLeagues(sport: SportKind, q: string): Promise<BudgetResult<TeamHit[]>> | null {
    const call = this.provider.searchLeagues?.(sport, q)
    return call ? this.run<TeamHit[]>('search', sport, call) : null
  }
  validate() { return this.run<KeyCheck>('validate', 'football', this.provider.validateKey()) }

  /** Startvärdet ur diskcachen innan något anrop görs. Alltid `cache-only`, så det kostar aldrig kvot. */
  async peek<T>(sport: SportKind, call: ProviderCall<T>): Promise<T | null> {
    if (!this.canCall() || this.provider.coverage(sport) !== 'full' || call.requests.length === 0) return null
    const bodies: unknown[] = []
    for (const req of call.requests) bodies.push((await this.get(req, 'cache-only')).data)
    if (bodies.every((b) => b == null)) return null
    try { return call.parse(bodies) } catch { return null }
  }

  /**
   * Som `peek`, med när posten hämtades (den äldsta av förfrågningarnas). Lagsidan
   * räknar sin TTL ur det: matcherna gäller fram till lagets nästa match.
   */
  async peekAged<T>(sport: SportKind, call: ProviderCall<T>): Promise<{ data: T; fetchedAt: number | null } | null> {
    if (!this.canCall() || this.provider.coverage(sport) !== 'full' || call.requests.length === 0) return null
    const bodies: unknown[] = []
    let fetchedAt: number | null = null
    for (const req of call.requests) {
      const res = await this.get(req, 'cache-only')
      bodies.push(res.data)
      if (res.fetchedAt != null) fetchedAt = fetchedAt == null ? res.fetchedAt : Math.min(fetchedAt, res.fetchedAt)
    }
    if (bodies.every((b) => b == null)) return null
    try { return { data: call.parse(bodies), fetchedAt } } catch { return null }
  }
}

/** Kvar för äldre tester; routern (router.ts) äger nu singeltonen. */
export function __resetBudgetForTests(): void { /* ingen modulstatus här längre */ }
