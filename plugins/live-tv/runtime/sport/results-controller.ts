'use client'

import { useEffect, useMemo, useReducer, useState } from 'react'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { currentRouter, type FixtureRef, type SportRouter } from './router'
import { localDates, planDay, shiftDate, planKey, plannedPerSport, type LeagueRef, type PlannedCall } from './day-plan'
import { EventIndex } from './event-index'
import { createLivePoller, type LivePoller, type LiveTarget } from './live-poller'
import { diffGoals, emitGoals, type Score } from './goal-events'
import { isPaidPlan } from './key-flow'
import { linkFixtures, type LinkMap } from './sport-link'
import { fixtureMatchKey, mergeLinked, relevantMatches } from './merge'
import { coverageFor, providerFor } from './providers'
import { followState } from './sport-day-model'
import { SPORT_SETTINGS_KEY, getFollows, getSportSettings, useFollows, useOverrides } from './sport-store'
import type { Fixture, FixtureDetail, ProviderId, StandingRow } from './provider'
import type { SportKind, SportMatch } from './sport-model'

export interface RateStatus {
  /** Källan sporten FAKTISKT använder just nu (efter genomfall vid slut kvot). */
  provider: ProviderId | null
  /** Fler än en källa med nyckel: takraden säger då vilken. */
  multi?: boolean
  state: 'no-key' | 'invalid-key' | 'ok' | 'paused' | 'rate-limited'
  intervalMs: number | null
  remainingToday: number | null
  pausedUntil: number | null
  paid: boolean
}

const TEN_MIN = 10 * 60_000
const TWO_HOURS = 2 * 3_600_000
const LIVE_DETAIL_MS = 60_000
/** Dagarna före gårdagen som repriskollen läser ur diskcachen (aldrig nätet). */
const HISTORY_DAYS = [2, 3]

/**
 * Resultatlagret för nycklarna (en per källa). Håller fixturer per sport och
 * dag i minnet (diskcachen är sanningen i appen), kör dygnsplanen, äger
 * livepollern och skickar målhändelser. Varje nätanrop går via routern, som
 * väljer källa per sport och låter varje källas kvothanterare äga anropet.
 *
 * Samma match hos flera källor (källbyte mitt på dagen) förs under EN
 * händelsenyckel (`EventIndex`): en rad per match, och mål räknas på
 * ställningen under nyckeln — aldrig på att id:t bytts.
 */
export class ResultsController {
  /** sport|datum → händelsenyckel → senast sedda fixtur (från vilken källa som helst). */
  private days = new Map<string, Map<string, Fixture>>()
  private readonly events = new EventIndex()
  /** Ställning per händelsenyckel, med källan som lämnade den. */
  private scores = new Map<string, Score & { provider: ProviderId }>()
  /** När källan såg varje match senast (svarets `fetchedAt`), per händelsenyckel. Äldre data skriver aldrig över nyare. */
  private observed = new Map<string, number>()
  /** Ligans källa (sport|ligans id), för tabellanrop från vyer som bara har ligans id. */
  private leagueProvider = new Map<string, ProviderId>()
  private done = new Set<string>()
  /** sport|datum som repriskollen redan läst ur diskcachen (träff eller ej). */
  private historyPeeked = new Set<string>()
  private doneDay = ''
  private details = new Map<string, { at: number; detail: FixtureDetail }>()
  private tables = new Map<string, StandingRow[]>()
  private mergedById = new Map<string, SportMatch>()
  private listeners = new Set<() => void>()
  private poller: LivePoller | null = null
  private unsubBudget: () => void
  private readonly tz: string
  private readonly now: () => number

  constructor(readonly router: SportRouter, deps: { tz?: string; now?: () => number; startPoller?: boolean } = {}) {
    this.tz = deps.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    this.now = deps.now ?? Date.now
    this.unsubBudget = router.subscribe(() => { this.poller?.reschedule(); this.emit() })
    if (deps.startPoller !== false) {
      this.poller = createLivePoller({
        budget: router,
        targets: () => this.liveTargets(),
        onFixtures: (sport, list, fetchedAt, provider) => this.applyFixtures(sport, this.dates().today, list, 'live', fetchedAt ?? this.now(), provider),
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

  fixtures(sport: SportKind, date: string): Fixture[] {
    return [...(this.days.get(this.dayKey(sport, date))?.values() ?? [])].sort((a, b) => a.kickoff - b.kickoff)
  }
  allFixtures(date: string): Fixture[] {
    const out: Fixture[] = []
    for (const [k, byKey] of this.days) if (k.endsWith(`|${date}`)) out.push(...[...byKey.values()].sort((a, b) => a.kickoff - b.kickoff))
    return out
  }

  /**
   * Källans fixturer från dagarna före `date` (gårdagen ur planen, dagarna innan ur diskcachen):
   * repriskollen i `mergeLinked` jämför tablåns matcher mot dem.
   */
  history(date: string): Fixture[] {
    const days = new Set([1, ...HISTORY_DAYS].map((n) => shiftDate(date, -n)))
    const out: Fixture[] = []
    for (const [k, byKey] of this.days) if (days.has(k.slice(k.indexOf('|') + 1))) out.push(...byKey.values())
    return out
  }

  /** Matchens första källa och id för dagen: "Bara resultat"-radens stabila id över ett källbyte. */
  canonicalOf(f: Pick<Fixture, 'provider' | 'id'>): Pick<Fixture, 'provider' | 'id'> { return this.events.canonicalOf(f) }

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
  applyFixtures(sport: SportKind, date: string, input: Fixture[], source: 'cache' | 'day' | 'live', observedAt: number = this.now(), liveProvider?: ProviderId | null): void {
    const dk = this.dayKey(sport, date)
    const byKey = this.days.get(dk) ?? new Map<string, Fixture>()
    const list = source === 'live' && liveProvider ? [...input, ...this.droppedFromLiveList(byKey, input, sport, liveProvider)] : input
    const keyOf = new Map<Fixture, string>(list.map((f) => [f, this.events.resolve(f)]))
    const key = (f: Fixture) => keyOf.get(f) ?? this.events.resolve(f)
    const seen = (f: Fixture) => this.observed.get(key(f)) ?? -Infinity
    // En pågående match utan ställning och minut (sportapi.ai LIVE/null) skriver inte över en annan
    // källas livedata; källans slutresultat, eller en ställning, går igenom som vanligt.
    const blank = (f: Fixture) => {
      const kept = byKey.get(key(f))
      return (f.status === 'live' || f.status === 'ht') && f.score == null && f.minute == null
        && !!kept && kept.provider !== f.provider && (kept.status === 'live' || kept.status === 'ht') && !!kept.score
    }
    const accepted = list.filter((f) => observedAt >= seen(f) && !blank(f))
    const newer = accepted.filter((f) => observedAt > seen(f))
    const goals = (source === 'live' ? diffGoals(this.scores, newer, this.now(), key) : [])
      .map((g) => ({ ...g, aliases: this.events.refsOf(g.provider, g.fixtureId).map(fixtureMatchKey) }))
    for (const f of accepted) {
      const k = key(f)
      this.observed.set(k, observedAt)
      if (f.league.id) this.leagueProvider.set(`${f.sport}|${f.league.id}`, f.provider)
      if (!f.score) continue
      const prev = this.scores.get(k)
      // Källbyte: den nya källan kan släpa efter. Ställningen sänks bara av SAMMA källa (VAR),
      // så att den inte först går ned och sedan ger ett falskt MÅL! när källan hinner ikapp.
      this.scores.set(k, prev && prev.provider !== f.provider
        ? { home: Math.max(prev.home, f.score.home), away: Math.max(prev.away, f.score.away), provider: f.provider }
        : { ...f.score, provider: f.provider })
    }
    for (const f of accepted) byKey.set(key(f), f)
    this.days.set(dk, byKey)
    if (goals.length) emitGoals(goals)
    this.poller?.reschedule()
    this.emit()
  }

  /**
   * API-Sports `live=all` tar bara med pågående matcher: en match som källan
   * själv hade som pågående och som fallit ur listan är slut. Den får sista
   * ställningen och status slut, så att den slutar vara het (annars pollades
   * sporten resten av dagen). Dyker den upp igen är det nyare data och den
   * blir pågående igen. Källor vars live är hela dagens lista rörs inte.
   */
  private droppedFromLiveList(byKey: Map<string, Fixture>, list: Fixture[], sport: SportKind, provider: ProviderId): Fixture[] {
    if (!providerFor(provider).liveListOnlyLive?.(sport)) return []
    const present = new Set(list.map((f) => this.events.resolve(f)))
    return [...byKey].filter(([k, f]) => !present.has(k) && f.provider === provider && (f.status === 'live' || f.status === 'ht'))
      .map(([, f]) => ({ ...f, status: 'finished' as const, statusShort: 'FT', minute: null }))
  }

  private rollDone(): void {
    const utcDay = new Date(this.now()).toISOString().slice(0, 10)
    if (utcDay !== this.doneDay) { this.doneDay = utcDay; this.done.clear() }
  }

  async runPlan(input: { sports: SportKind[]; leagues: LeagueRef[] }): Promise<void> {
    this.rollDone()
    const d = this.dates()
    const calls = planDay({ today: d.today, yesterday: d.yesterday, tomorrow: d.tomorrow, sports: input.sports, leagues: input.leagues, done: this.done }, this.router)
    // Startvärdet ur diskcachen först (kostar ingenting), så att vyn har ställning innan nätet svarar.
    for (const call of calls) {
      if (call.kind !== 'day' || call.date !== d.today || this.fixtures(call.sport, d.today).length > 0) continue
      const cached = await this.router.peek(call.sport, (p) => p.day(call.sport, d.today, { today: d.today, tz: this.tz, dayEndMs: d.dayEndMs(d.today) }))
      if (cached) this.applyFixtures(call.sport, d.today, cached.data, 'cache', 0) // diskcachen är per definition äldst
    }
    // Repriskollen: dagarna före gårdagen BARA ur diskcachen. Inget nytt anrop och ingen kvot —
    // finns dagen inte cachad blir kollen bara gårdagens.
    for (const sport of new Set(calls.filter((c) => c.kind === 'day').map((c) => c.sport))) {
      for (const date of HISTORY_DAYS.map((n) => shiftDate(d.today, -n))) {
        const key = this.dayKey(sport, date)
        if (this.historyPeeked.has(key) || this.days.has(key)) continue
        this.historyPeeked.add(key)
        const cached = await this.router.peek(sport, (p) => p.day(sport, date, { today: d.today, tz: this.tz, dayEndMs: d.dayEndMs(date) }))
        if (cached) this.applyFixtures(sport, date, cached.data, 'cache', 0)
      }
    }
    const remaining = [...calls]
    const syncPlanned = () => {
      const per = plannedPerSport(remaining)
      for (const c of calls) if (!per.has(c.sport)) per.set(c.sport, 0)
      this.router.setPlanned(per)
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
      const res = await this.router.day(call.sport, call.date, { today, tz: this.tz, dayEndMs: dayEndMs(call.date) })
      if (res.data) this.applyFixtures(call.sport, call.date, res.data, 'day', res.fetchedAt ?? 0)
      if (res.ok && call.date !== today) this.done.add(planKey(call))
      return
    }
    const provider = call.provider ?? this.leagueProvider.get(`${call.sport}|${call.leagueId}`) ?? this.router.candidates(call.sport)[0]?.provider.id
    if (!provider) return
    const res = await this.router.standings(call.sport, provider, call.leagueId, call.season)
    if (res.data) { this.tables.set(planKey(call), res.data); this.emit() }
    if (res.ok) this.done.add(planKey(call))
  }

  /**
   * Matchcentret. `ref` = matchens källa och id. Är källan spärrad hämtas samma
   * match hos en annan källa som sett den i dag (händelseindexets alias).
   */
  async loadFixture(sport: SportKind, ref: FixtureRef, finished: boolean): Promise<FixtureDetail | null> {
    const key = `${sport}|${this.events.keyOf(ref.provider, ref.id) ?? `${ref.provider}:${ref.id}`}`
    const hit = this.details.get(key)
    // Avslutad: minnet räcker för alltid. Pågående: högst 60 s gammal (diskcachen har samma TTL).
    if (hit && (finished || this.now() - hit.at < LIVE_DETAIL_MS)) return hit.detail
    const res = await this.router.fixture(sport, this.events.refsOf(ref.provider, ref.id), { finished, refresh: !!hit })
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

  /** `provider` saknas = ligans källa ur dagens fixturer (vyerna har bara ligans id). */
  async loadStandings(sport: SportKind, leagueId: string, season: string, provider?: ProviderId): Promise<StandingRow[] | null> {
    const call: PlannedCall = { kind: 'standings', sport, leagueId, season, ...(provider ? { provider } : {}) }
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
    // Händelsenycklar: en match kopplad med den ena källans id är het även när en annan källa levererar den.
    const relevant = new Set<string>()
    for (const m of this.mergedById.values()) {
      if (!m.fixture) continue
      const k = this.events.keyOf(m.fixture.provider as ProviderId, m.fixture.id)
      if (k) relevant.add(k)
    }
    const bySport = new Map<SportKind, Fixture[]>()
    for (const [k, byKey] of this.days) {
      const [sport, date] = k.split('|') as [SportKind, string]
      if (date === today) bySport.set(sport, [...byKey].filter(([key]) => relevant.has(key)).map(([, f]) => f))
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

  /**
   * Takraden för en sport (utan sport: den heta sporten, annars den första
   * med fixturer, annars fotboll). Källan är den sporten FAKTISKT använder
   * nu — efter genomfall när den första källans kvot är slut.
   */
  status(sport?: SportKind): RateStatus {
    const multi = this.router.multi()
    const none = { provider: null, multi, intervalMs: null, remainingToday: null, pausedUntil: null, paid: false }
    if (this.router.isInvalid()) return { ...none, state: 'invalid-key' }
    const targets = this.liveTargets()
    const s = sport ?? targets.find((t) => t.hot)?.sport ?? targets[0]?.sport ?? 'football'
    const hot = targets.find((t) => t.hot && t.sport === s)
    const all = this.router.candidates(s)
    if (all.length > 0 && all.every((b) => b.isInvalid())) return { ...none, provider: all[0].provider.id, state: 'invalid-key' }
    const used = this.router.quotaFor(s)
    if (!used) return { ...none, state: 'ok' }
    const q = used.quota
    const base = { ...none, provider: used.provider }
    const paid = isPaidPlan(q.plan ?? getSportSettings().keys[used.provider]?.plan ?? null, used.provider)
    if (!this.router.activeProvider(s)) {
      const until = this.router.pausedUntil(s)
      if (until != null) return { ...base, state: q.reason === 'rate-limited' ? 'rate-limited' : 'paused', pausedUntil: until, remainingToday: q.remaining, paid }
    }
    return { ...base, state: 'ok', intervalMs: hot ? this.router.liveIntervalMs(s, hot.windowEndsAt) : null, remainingToday: q.remaining, paid }
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

let current: { router: SportRouter; controller: ResultsController } | null = null

export function currentResults(): ResultsController | null {
  const router = currentRouter()
  if (!router) {
    current?.controller.dispose()
    current = null
    return null
  }
  if (current?.router !== router) {
    current?.controller.dispose()
    current = { router, controller: new ResultsController(router) }
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

const NO_KEY: RateStatus = { provider: null, multi: false, state: 'no-key', intervalMs: null, remainingToday: null, pausedUntil: null, paid: false }

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
      .map((m) => ({ sport: m.kind, leagueId: m.fixture!.leagueId!, season: m.fixture!.season!, provider: m.fixture!.provider as ProviderId }))
    void controller.runPlan({ sports, leagues })
  }, [controller, opts.day, sports.join(',')])

  const version = controller?.version ?? 0
  const fixtures = useMemo(() => (controller && opts.day ? controller.allFixtures(opts.day) : []), [controller, opts.day, version])
  const fixtureIds = fixtures.map(fixtureMatchKey).sort().join(',')

  useEffect(() => {
    if (!controller || !opts.day || fixtures.length === 0) { setLinks({}); return }
    let cancelled = false
    void linkFixtures({ day: opts.day, fixtures }).then((l) => { if (!cancelled) setLinks(l) })
    return () => { cancelled = true }
    // Länka om bara när mängden fixturer ändras, inte vid varje ställningsuppdatering.
  }, [controller, opts.day, fixtureIds])

  const allMatches = useMemo(() => {
    if (!controller) return opts.epg.map((m) => ({ ...m, coverage: coverageFor(null, m.kind) }))
    const history = opts.day ? controller.history(opts.day) : []
    return mergeLinked({ epg: opts.epg, fixtures, links, overrides, history, coverage: (s) => controller.router.coverage(s), canonical: (f) => controller.canonicalOf(f) })
  }, [controller, opts.epg, opts.day, fixtures, links, overrides, version])
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
