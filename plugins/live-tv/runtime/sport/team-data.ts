// runtime/sport/team-data.ts
'use client'

import type { Budget, BudgetResult } from './budget'
import type { SportRouter } from './router'
import { localDates, shiftDate } from './day-plan'
import { foldTeamKey } from './merge'
import { teamKeysMatch } from './sport-store'
import { fixturesTtlS, mainLeagueOf, roundFixtures, seasonGuesses, teamRowIndex, type LeagueRef, type LeagueTarget, type TeamTarget } from './team-model'
import { teamCallsFor, type SquadPlayer, type TeamFeed, type TeamFixture, type TopScorer } from './team-providers'
import type { ProviderCall, ProviderId, StandingRow } from './provider'
import type { SportKind } from './sport-model'

/*
  LAG- OCH LIGASIDANS DATA. Hämtas BARA när sidan öppnas, aldrig i bakgrunden
  och aldrig med en klocka: inget här pollar. Varje anrop går genom källans
  kvothanterare (`Budget.run`, som `standings`: reserven skyddas), och
  värdens diskcache bär TTL:erna — tabellen några timmar, truppen ett dygn,
  lagets matcher fram till lagets nästa match är spelad. Samma fråga två
  gånger inom några minuter (sidan öppnas igen) delar ett och samma löfte.

  Tabellen går genom resultatlagrets tabellväg (`ResultsController.loadStandings`):
  ligans egen källa, sedan samma liga hos andra källor, och en saknad tabell
  frågas inte om på sex timmar — samma väg som Tabeller & resultat.

  Källorna prövas i sportens ordning. En källa utan id för laget får först
  slå upp det (lagsök, en gång; sparas på den följda posten), och en källa
  som är spärrad eller saknar kvot lämnar över till nästa — som routern.
*/

/** En gissad säsongs matcher måste ligga inom fyra månader från idag. */
const NEAR_MS = 120 * 86_400_000
const MEMO_MS = 5 * 60_000
const memo = new Map<string, { at: number; promise: Promise<unknown> }>()

export function __resetTeamDataForTests(): void { memo.clear() }

/** Samma anrop inom fem minuter delar svaret; ett misslyckat glöms direkt (nästa öppning får försöka igen). */
function once<T>(key: string, now: number, run: () => Promise<T>, keep: (v: T) => boolean): Promise<T> {
  const hit = memo.get(key)
  if (hit && now - hit.at < MEMO_MS) return hit.promise as Promise<T>
  const promise = run()
  memo.set(key, { at: now, promise })
  promise.then((v) => { if (!keep(v) && memo.get(key)?.promise === promise) memo.delete(key) }, () => memo.delete(key))
  return promise
}

const callKey = (b: Budget, call: ProviderCall<unknown>) => `${b.provider.id}|${call.requests.map((r) => `${r.sport}${r.path}@${r.ttlS}`).join(',')}`
const withTtl = <T>(call: ProviderCall<T>, ttlS: number): ProviderCall<T> => ({ ...call, requests: call.requests.map((r) => ({ ...r, ttlS })) })

function run<T>(b: Budget, sport: SportKind, call: ProviderCall<T>, now: number): Promise<BudgetResult<T>> {
  return once(callKey(b, call as ProviderCall<unknown>), now, () => b.run('standings', sport, call), (r) => r.data != null)
}

export interface TeamPageData {
  /** `no-key` = ingen källa med nyckel täcker sporten (sidan visar bara det tablån vet). */
  state: 'loading' | 'ready' | 'no-key'
  provider: ProviderId | null
  teamId: string | null
  fixtures: TeamFixture[]
  league: LeagueRef | null
  standings: StandingRow[] | null
  squad: SquadPlayer[] | null
  crest: string | null
}

export const EMPTY_TEAM: TeamPageData = { state: 'loading', provider: null, teamId: null, fixtures: [], league: null, standings: null, squad: null, crest: null }

/** Tabellvägen. `[]`/`null` = ingen tabell för ligan just nu. */
export type StandingsLoader = (sport: SportKind, league: LeagueRef) => Promise<StandingRow[] | null>

/** Resultatlagrets tabellväg som laddare (säsongen "current" när källan inte gett någon: sportapi.ai bryr sig inte). */
export function standingsVia(controller: { loadStandings(sport: SportKind, leagueId: string, season: string, provider?: ProviderId): Promise<StandingRow[] | null> }, now: number): StandingsLoader {
  return (sport, league) => controller.loadStandings(sport, league.id, league.season ?? (league.provider === 'sportapi' ? 'current' : seasonGuesses(sport, now)[0]), league.provider)
}

export interface LoadOpts {
  now: number
  tz: string
  standings: StandingsLoader
  onUpdate(data: TeamPageData): void
  /** Ett id som slogs upp (lagsök): sparas på den följda posten så att uppslaget görs en gång. */
  onResolved?(provider: ProviderId, id: string): void
}

/** Bästa träffen i ett lagsök: samma namn, annars samma nyckelregel som Följer, annars namnet som delsträng. Ett ensamt orelaterat svar tas aldrig. */
function pickHit(hits: Array<{ id: string; name: string }>, target: Pick<TeamTarget, 'key' | 'name'>): string | null {
  const key = foldTeamKey(target.key || target.name)
  const valid = hits.filter((h) => h.id && h.name)
  const exact = valid.find((h) => foldTeamKey(h.name) === key)
  const loose = valid.find((h) => teamKeysMatch(key, foldTeamKey(h.name)))
  const contains = valid.find((h) => foldTeamKey(h.name).includes(key) || key.includes(foldTeamKey(h.name)))
  return (exact ?? loose ?? contains)?.id ?? null
}

/**
 * Källans id för laget. Känt (följt ur sökning, dagens matcher) → direkt.
 * sportapi.ai har inget lagsök: id:t läses ur ligans tabell när ligan är känd
 * hos den källan. Övriga: ett lagsök (en gång, cachat en vecka på disk).
 */
async function resolveId(b: Budget, target: TeamTarget, opts: LoadOpts, standings: Map<string, StandingRow[] | null>): Promise<string | null> {
  const pid = b.provider.id
  const known = target.ids[pid]
  if (known) return known
  let id: string | null = null
  if (pid === 'sportapi') {
    if (target.league?.provider !== 'sportapi') return null
    const k = `${target.league.provider}|${target.league.id}`
    if (!standings.has(k)) standings.set(k, await opts.standings(target.sport, target.league))
    const rows = standings.get(k) ?? []
    const i = teamRowIndex(rows, target, null)
    id = i >= 0 ? rows[i].team.id || null : null
  } else {
    const call = b.provider.searchTeams(target.sport, target.name)
    if (call.requests.length === 0) return null
    const res = await once(`search|${callKey(b, call as ProviderCall<unknown>)}`, opts.now, () => b.run('search', target.sport, call), (r) => r.data != null)
    id = pickHit(res.data ?? [], target)
  }
  if (id) opts.onResolved?.(pid, id)
  return id
}

export async function loadTeamPage(router: SportRouter, target: TeamTarget, opts: LoadOpts): Promise<TeamPageData> {
  const sport = target.sport
  const candidates = router.candidates(sport)
  let data: TeamPageData = { ...EMPTY_TEAM, crest: target.crest }
  const update = (patch: Partial<TeamPageData>) => { data = { ...data, ...patch }; opts.onUpdate(data) }
  if (candidates.length === 0) { update({ state: 'no-key' }); return data }
  const standings = new Map<string, StandingRow[] | null>()
  const ids = new Map<ProviderId, string | null>()
  const idFor = async (b: Budget) => {
    if (!ids.has(b.provider.id)) ids.set(b.provider.id, await resolveId(b, target, opts, standings))
    return ids.get(b.provider.id) ?? null
  }

  // 1. Lagets matcher: form, nu/nästa och kommande.
  let got: { b: Budget; id: string; season: string; feed: TeamFeed } | null = null
  for (const b of candidates) {
    const calls = teamCallsFor(b.provider.id)
    if (!calls.fixtures(sport, '0', { season: '', tz: opts.tz, ttlS: 0 })) continue
    const id = await idFor(b)
    if (!id) continue
    const known = target.league?.provider === b.provider.id ? target.league.season : null
    const seasons = calls.needsSeason ? (known ? [known] : seasonGuesses(sport, opts.now)) : ['']
    // En gissad säsong utan matcher prövar nästa gissning; en spärrad källa lämnar över till nästa källa.
    for (const season of seasons) {
      const base = calls.fixtures(sport, id, { season, tz: opts.tz, ttlS: 86_400 })!
      const aged = await b.peekAged(sport, base)
      const res = await run(b, sport, withTtl(base, aged ? fixturesTtlS(aged.data.fixtures, aged.fetchedAt, opts.now) : 86_400), opts.now)
      // En gissad säsong godtas bara med matcher nära idag: förra säsongens resultat är ingen form.
      const near = res.data?.fixtures.some((f) => Math.abs(f.kickoff - opts.now) < NEAR_MS)
      if (res.data && res.data.fixtures.length > 0 && (known || !calls.needsSeason || near)) { got = { b, id, season, feed: res.data }; break }
      // Fel (spärr, kvot, planens säsongsgräns): nästa källa. Tomt svar: nästa gissade säsong.
      if (!res.ok && res.data == null) break
    }
    if (got) break
  }
  if (got) {
    const fixtures = [...got.feed.fixtures].sort((a, b) => a.kickoff - b.kickoff)
    update({ provider: got.b.provider.id, teamId: got.id, fixtures, crest: target.crest ?? got.feed.crest })
  }

  // 2. Tabellen: serien hos källan som svarade, annars ligan dagens matcher känner.
  const main = got ? (got.feed.leagueId ? { id: got.feed.leagueId, season: got.season || 'current', name: target.league?.name ?? '' } : mainLeagueOf(got.feed.fixtures)) : null
  const league: LeagueRef | null = got && main ? { provider: got.b.provider.id, id: main.id, season: main.season || null, name: main.name || target.league?.name || '' } : target.league
  if (league) {
    const k = `${league.provider}|${league.id}`
    if (!standings.has(k)) standings.set(k, await opts.standings(sport, league))
    const rows = standings.get(k)
    update({ league, standings: rows && rows.length > 0 ? rows : null })
  }

  // 3. Truppen: källan som svarade först, sedan övriga som har en trupp för sporten.
  const order = got ? [got.b, ...candidates.filter((b) => b !== got!.b)] : candidates
  const season = league?.season ?? seasonGuesses(sport, opts.now)[0]
  for (const b of order) {
    const calls = teamCallsFor(b.provider.id)
    if (!calls.squad(sport, '0', { season })) continue
    const id = await idFor(b)
    if (!id) continue
    const res = await run(b, sport, calls.squad(sport, id, { season })!, opts.now)
    if (res.data && res.data.length > 0) { update({ squad: res.data }); break }
  }
  update({ state: 'ready' })
  return data
}

export interface LeaguePageData {
  state: 'loading' | 'ready' | 'no-key'
  standings: StandingRow[] | null
  round: { round: number | null; fixtures: TeamFixture[] } | null
  scorers: TopScorer[] | null
}

export const EMPTY_LEAGUE: LeaguePageData = { state: 'loading', standings: null, round: null, scorers: null }

/** Ligasidan: tabellen, omgångens matcher och skytteligan — hos ligans egen källa (id:t är dess). */
export async function loadLeaguePage(router: SportRouter, target: LeagueTarget, opts: Omit<LoadOpts, 'onUpdate' | 'onResolved'> & { onUpdate(d: LeaguePageData): void }): Promise<LeaguePageData> {
  let data: LeaguePageData = { ...EMPTY_LEAGUE }
  const update = (patch: Partial<LeaguePageData>) => { data = { ...data, ...patch }; opts.onUpdate(data) }
  const ref = target.ref
  const b = ref ? router.budget(ref.provider) : null
  if (!ref || !b) { update({ state: 'no-key' }); return data }
  const sport = target.sport
  const calls = teamCallsFor(ref.provider)
  const season = ref.season ?? (calls.needsSeason ? seasonGuesses(sport, opts.now)[0] : '')
  const rows = await opts.standings(sport, { ...ref, season: ref.season ?? (season || null) })
  update({ standings: rows && rows.length > 0 ? rows : null })
  const d = localDates(opts.now, opts.tz)
  const roundCall = calls.leagueFixtures(sport, ref.id, { season, tz: opts.tz, from: shiftDate(d.today, -4), to: shiftDate(d.today, 4) })
  if (roundCall) {
    const res = await run(b, sport, roundCall, opts.now)
    if (res.data && res.data.length > 0) update({ round: roundFixtures(res.data, opts.now) })
  }
  const scorers = calls.topScorers(sport, ref.id, season)
  if (scorers) {
    const res = await run(b, sport, scorers, opts.now)
    if (res.data && res.data.length > 0) update({ scorers: res.data.slice(0, 10) })
  }
  update({ state: 'ready' })
  return data
}
