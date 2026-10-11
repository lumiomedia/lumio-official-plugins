'use client'

import { useEffect, useMemo, useReducer, useState } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { currentBudget, type Budget } from './budget'
import { localDates, planDay, planKey, plannedPerBucket, type LeagueRef, type PlannedCall } from './day-plan'
import { createLivePoller, type LivePoller, type LiveTarget } from './live-poller'
import { diffGoals, emitGoals, type Score } from './goal-events'
import { isPaidPlan } from './key-flow'
import { linkFixtures, type LinkMap } from './sport-link'
import { mergeLinked, relevantMatches } from './merge'
import { coverageFor } from './providers'
import { followState } from './sport-day-model'
import { SPORT_SETTINGS_KEY, getFollows, getSportSettings, useFollows, useOverrides } from './sport-store'
import type { Fixture, FixtureDetail, ProviderId, StandingRow } from './provider'
import type { SportKind, SportMatch } from './sport-model'

export interface RateStatus {
  provider: ProviderId | null
  state: 'no-key' | 'invalid-key' | 'ok' | 'paused' | 'rate-limited'
  intervalMs: number | null
  remainingToday: number | null
  pausedUntil: number | null
  paid: boolean
}

const TEN_MIN = 10 * 60_000
const TWO_HOURS = 2 * 3_600_000
const LIVE_DETAIL_MS = 60_000

/**
 * Resultatlagret för EN (källa, nyckel). Håller fixturer per sport och dag i
 * minnet (diskcachen är sanningen i appen), kör dygnsplanen, äger
 * livepollern och skickar målhändelser. Varje nätanrop går via `budget`.
 */
export class ResultsController {
  private days = new Map<string, Fixture[]>()
  private scores = new Map<string, Score>()
  /** När källan såg varje fixtur senast (svarets `fetchedAt`). Äldre data skriver aldrig över nyare. */
  private observed = new Map<string, number>()
  private done = new Set<string>()
  private doneDay = ''
  private details = new Map<string, { at: number; detail: FixtureDetail }>()
  private tables = new Map<string, StandingRow[]>()
  private mergedById = new Map<string, SportMatch>()
  private listeners = new Set<() => void>()
  private poller: LivePoller | null = null
  private unsubBudget: () => void
  private readonly tz: string
  private readonly now: () => number

  constructor(readonly budget: Budget, deps: { tz?: string; now?: () => number; startPoller?: boolean } = {}) {
    this.tz = deps.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    this.now = deps.now ?? Date.now
    this.unsubBudget = budget.subscribe(() => { this.poller?.reschedule(); this.emit() })
    if (deps.startPoller !== false) {
      this.poller = createLivePoller({
        budget,
        targets: () => this.liveTargets(),
        onFixtures: (sport, list, fetchedAt) => this.applyFixtures(sport, this.dates().today, list, 'live', fetchedAt ?? this.now()),
        liveOpts: () => ({ today: this.dates().today, tz: this.tz }),
        now: this.now,
      })
      this.poller.start()
    }
  }

  private dates() { return localDates(this.now(), this.tz) }
  private dayKey(sport: SportKind, date: string) { return `${sport}|${date}` }

  /** Räknas upp vid varje dataändring (fixturer, tabeller, matchcenter, kvot). Hookarna memoiserar på den. */
  version = 0
  private mergedListeners = new Set<() => void>()

  subscribe(cb: () => void): () => void { this.listeners.add(cb); return () => { this.listeners.delete(cb) } }
  private emit(): void { this.version += 1; for (const cb of [...this.listeners]) cb() }

  fixtures(sport: SportKind, date: string): Fixture[] { return this.days.get(this.dayKey(sport, date)) ?? [] }
  allFixtures(date: string): Fixture[] {
    const out: Fixture[] = []
    for (const [k, list] of this.days) if (k.endsWith(`|${date}`)) out.push(...list)
    return out
  }

  /**
   * Målhändelser BARA från livepollningen. En äldre cachepost följd av ett
   * färskt dagsprogram är ingen "händelse" som användaren ska få MÅL! för.
   *
   * `observedAt` = när källan lämnade datan (svarets `fetchedAt`). En fixtur
   * som redan setts med nyare data rörs inte: ett dagsprogram ur diskcachen
   * får aldrig sänka en ställning som livepollningen sett, för då hade nästa
   * livesvar gett ett falskt MÅL! för ett gammalt mål. Mål räknas bara på
   * data som är STRIKT nyare än förra observationen.
   */
  applyFixtures(sport: SportKind, date: string, list: Fixture[], source: 'cache' | 'day' | 'live', observedAt: number = this.now()): void {
    const seen = (f: Fixture) => this.observed.get(f.id) ?? -Infinity
    const accepted = list.filter((f) => observedAt >= seen(f))
    const newer = accepted.filter((f) => observedAt > seen(f))
    const goals = source === 'live' ? diffGoals(this.scores, newer, this.now()) : []
    for (const f of accepted) {
      this.observed.set(f.id, observedAt)
      if (f.score) this.scores.set(f.id, f.score)
    }
    const byId = new Map(this.fixtures(sport, date).map((f) => [f.id, f]))
    for (const f of accepted) byId.set(f.id, f)
    this.days.set(this.dayKey(sport, date), [...byId.values()].sort((a, b) => a.kickoff - b.kickoff))
    if (goals.length) emitGoals(goals)
    this.poller?.reschedule()
    this.emit()
  }

  private rollDone(): void {
    const utcDay = new Date(this.now()).toISOString().slice(0, 10)
    if (utcDay !== this.doneDay) { this.doneDay = utcDay; this.done.clear() }
  }

  async runPlan(input: { sports: SportKind[]; leagues: LeagueRef[] }): Promise<void> {
    this.rollDone()
    const d = this.dates()
    const provider = this.budget.provider
    const calls = planDay({ today: d.today, yesterday: d.yesterday, tomorrow: d.tomorrow, sports: input.sports, leagues: input.leagues, done: this.done }, provider)
    // Startvärdet ur diskcachen först (kostar ingenting), så att vyn har ställning innan nätet svarar.
    for (const call of calls) {
      if (call.kind !== 'day' || call.date !== d.today || this.fixtures(call.sport, d.today).length > 0) continue
      const cached = await this.budget.peek(call.sport, provider.day(call.sport, d.today, { today: d.today, tz: this.tz, dayEndMs: d.dayEndMs(d.today) }))
      if (cached) this.applyFixtures(call.sport, d.today, cached, 'cache', 0) // diskcachen är per definition äldst
    }
    const remaining = [...calls]
    const syncPlanned = () => {
      const per = plannedPerBucket(remaining, provider)
      for (const bucket of new Set([...per.keys(), ...calls.map((c) => provider.bucket(c.sport))])) this.budget.setPlanned(bucket, per.get(bucket) ?? 0)
    }
    syncPlanned()
    for (const call of calls) {
      await this.runPlanned(call, d.today, d.dayEndMs)
      remaining.shift()
      syncPlanned()
    }
  }

  private async runPlanned(call: PlannedCall, today: string, dayEndMs: (date: string) => number): Promise<void> {
    if (call.kind === 'day') {
      const res = await this.budget.day(call.sport, call.date, { today, tz: this.tz, dayEndMs: dayEndMs(call.date) })
      if (res.data) this.applyFixtures(call.sport, call.date, res.data, 'day', res.fetchedAt ?? 0)
      if (res.ok && call.date !== today) this.done.add(planKey(call))
      return
    }
    const res = await this.budget.standings(call.sport, call.leagueId, call.season)
    if (res.data) { this.tables.set(planKey(call), res.data); this.emit() }
    if (res.ok) this.done.add(planKey(call))
  }

  async loadFixture(sport: SportKind, id: string, finished: boolean): Promise<FixtureDetail | null> {
    const key = `${sport}|${id}`
    const hit = this.details.get(key)
    // Avslutad: minnet räcker för alltid. Pågående: högst 60 s gammal (diskcachen har samma TTL).
    if (hit && (finished || this.now() - hit.at < LIVE_DETAIL_MS)) return hit.detail
    const res = await this.budget.fixture(sport, id, { finished, refresh: !!hit })
    if (res.data) {
      this.details.set(key, { at: this.now(), detail: res.data })
      this.emit()
      return res.data
    }
    return hit?.detail ?? null
  }

  standings(sport: SportKind, leagueId: string, season: string): StandingRow[] | null {
    return this.tables.get(planKey({ kind: 'standings', sport, leagueId, season })) ?? null
  }

  async loadStandings(sport: SportKind, leagueId: string, season: string): Promise<StandingRow[] | null> {
    const call: PlannedCall = { kind: 'standings', sport, leagueId, season }
    const cached = this.tables.get(planKey(call))
    if (cached && this.done.has(planKey(call))) return cached
    await this.runPlanned(call, this.dates().today, this.dates().dayEndMs)
    return this.tables.get(planKey(call)) ?? null
  }

  /**
   * Heta sporter och livefönstret räknas BARA på fixturer användaren bryr sig
   * om: kopplade till en EPG-match, följda eller valda (= de som finns i den
   * sammanslagna listan). Dagsprogrammet täcker hela världen, och då hade
   * nästan alltid något varit live någonstans och kvoten spridits tunt.
   */
  liveTargets(): LiveTarget[] {
    const today = this.dates().today
    const now = this.now()
    const providerId = this.budget.provider.id
    const relevant = new Set<string>()
    for (const m of this.mergedById.values()) if (m.fixture && m.fixture.provider === providerId) relevant.add(m.fixture.id)
    const bySport = new Map<SportKind, Fixture[]>()
    for (const [k, list] of this.days) {
      const [sport, date] = k.split('|') as [SportKind, string]
      if (date === today) bySport.set(sport, list.filter((f) => relevant.has(f.id)))
    }
    const out: LiveTarget[] = []
    for (const [sport, list] of bySport) {
      const open = list.filter((f) => f.status !== 'finished' && f.status !== 'postponed')
      if (open.length === 0) continue
      const hot = open.some((f) => f.status === 'live' || f.status === 'ht' || (f.kickoff - now <= TEN_MIN && f.kickoff + TWO_HOURS > now))
      out.push({ sport, hot, windowEndsAt: Math.max(...open.map((f) => f.kickoff)) + TWO_HOURS })
    }
    return out
  }

  status(): RateStatus {
    const provider = this.budget.provider
    const base = { provider: provider.id, intervalMs: null, remainingToday: null, pausedUntil: null, paid: false }
    if (this.budget.isInvalid()) return { ...base, state: 'invalid-key' }
    const targets = this.liveTargets()
    const hot = targets.find((t) => t.hot)
    const bucket = provider.bucket(hot?.sport ?? targets[0]?.sport ?? 'football')
    const q = this.budget.quota(bucket)
    const paid = isPaidPlan(q.plan ?? getSportSettings().keyPlan, provider.id)
    if (q.blockedUntil != null && q.blockedUntil > this.now()) {
      return { ...base, state: q.reason === 'rate-limited' ? 'rate-limited' : 'paused', pausedUntil: q.blockedUntil, remainingToday: q.remaining, paid }
    }
    return { ...base, state: 'ok', intervalMs: hot ? this.budget.liveIntervalMs(bucket, hot.windowEndsAt) : null, remainingToday: q.remaining, paid }
  }

  /**
   * Den sammanslagna listan, som spelaren läser (MÅL!, efterfrågan). Den
   * meddelar BARA `onMerged`-lyssnare och aldrig datalyssnarna. Annars hade
   * useSportResults → setMerged → emit → omritning → setMerged blivit en loop.
   */
  setMerged(m: SportMatch[]): void {
    // Lägg till/uppdatera per id: spelarens ticker och Sport-vyn skriver var sin delmängd.
    const cutoff = this.now() - 36 * 3_600_000
    for (const x of m) this.mergedById.set(x.id, x)
    for (const [id, x] of this.mergedById) if (x.stop < cutoff) this.mergedById.delete(id)
    this.poller?.reschedule() // mängden heta fixturer kan ha ändrats
    for (const cb of [...this.mergedListeners]) cb()
  }
  merged(): SportMatch[] { return [...this.mergedById.values()] }
  onMerged(cb: () => void): () => void { this.mergedListeners.add(cb); return () => { this.mergedListeners.delete(cb) } }

  dispose(): void {
    this.poller?.stop()
    this.unsubBudget()
    this.listeners.clear()
    this.mergedListeners.clear()
  }
}

let current: { budget: Budget; controller: ResultsController } | null = null

export function currentResults(): ResultsController | null {
  const budget = currentBudget()
  if (!budget) {
    current?.controller.dispose()
    current = null
    return null
  }
  if (current?.budget !== budget) {
    current?.controller.dispose()
    current = { budget, controller: new ResultsController(budget) }
  }
  return current.controller
}

/** Byter instans när nyckeln eller källan ändras, och ritar om vid varje uppdatering. */
export function useResultsController(): ResultsController | null {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const [controller, setController] = useState(() => currentResults())
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, () => setController(currentResults())), [])
  useEffect(() => (controller ? controller.subscribe(bump) : undefined), [controller])
  return controller
}

const NO_KEY: RateStatus = { provider: null, state: 'no-key', intervalMs: null, remainingToday: null, pausedUntil: null, paid: false }

/**
 * EPG-dagen (fas 1:s `useSportDay`) plus källans fixturer. `day: null` = ingen plan, ingen länkning och ingen
 * skrivning till den sammanslagna listan (spelarens ticker är avstängd när spelaren är stängd).
 */
/**
 * `matches` = det användaren bryr sig om (EPG + följda/valda "Bara resultat"); vyer, spelarens låda och
 * livepollningen läser den. `allMatches` = plus hela dagsprogrammet, bara för Resultat-fliken (pollas inte live).
 */
export function useSportResults(opts: { day: string | null; epg: SportMatch[] }): { matches: SportMatch[]; allMatches: SportMatch[]; status: RateStatus; controller: ResultsController | null } {
  const controller = useResultsController()
  const overrides = useOverrides()
  const follows = useFollows()
  const [links, setLinks] = useState<LinkMap>({})
  const providerId = controller?.budget.provider.id ?? null

  const sports = useMemo(() => {
    const follows = getFollows()
    return [...new Set([...opts.epg.map((m) => m.kind), ...follows.map((f) => f.sport)])].sort()
  }, [opts.epg])

  useEffect(() => {
    if (!controller || !opts.day) return
    // Tabeller i dygnsplanen: ligor för följda lag och ligor bland redan kopplade matcher.
    const follows = getFollows()
    const leagues = controller.merged()
      .filter((m) => m.fixture?.leagueId && m.fixture.season && followState(m, follows).any)
      .map((m) => ({ sport: m.kind, leagueId: m.fixture!.leagueId!, season: m.fixture!.season! }))
    void controller.runPlan({ sports, leagues })
  }, [controller, opts.day, sports.join(',')])

  const version = controller?.version ?? 0
  const fixtures = useMemo(() => (controller && opts.day ? controller.allFixtures(opts.day) : []), [controller, opts.day, version])
  const fixtureIds = fixtures.map((f) => f.id).sort().join(',')

  useEffect(() => {
    if (!controller || !opts.day || fixtures.length === 0) { setLinks({}); return }
    let cancelled = false
    void linkFixtures({ day: opts.day, fixtures }).then((l) => { if (!cancelled) setLinks(l) })
    return () => { cancelled = true }
    // Länka om bara när mängden fixturer ändras, inte vid varje ställningsuppdatering.
  }, [controller, opts.day, fixtureIds])

  const allMatches = useMemo(() => {
    if (!controller) return opts.epg.map((m) => ({ ...m, coverage: coverageFor(null, m.kind) }))
    return mergeLinked({ epg: opts.epg, fixtures, links, overrides, coverage: (s) => coverageFor(providerId, s) })
  }, [controller, opts.epg, fixtures, links, overrides, providerId])
  const matches = useMemo(() => relevantMatches(allMatches, follows), [allMatches, follows])

  useEffect(() => { if (opts.day) controller?.setMerged(matches) }, [controller, opts.day, matches])

  return { matches, allMatches, status: controller ? controller.status() : NO_KEY, controller }
}

/** Matchen som går på kanalen just nu, om den är live i en täckt sport. Driver spelarens efterfrågan och MÅL!. */
export function useChannelSportLive(channelKey: string | null): SportMatch | null {
  const controller = useResultsController()
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => (controller ? controller.onMerged(bump) : undefined), [controller])
  if (!controller || !channelKey) return null
  return controller.merged().find((m) => m.coverage === 'full' && !!m.fixture && m.status === 'live' && m.sources.some((s) => s.channelKey === channelKey)) ?? null
}
