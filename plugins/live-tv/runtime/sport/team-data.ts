// runtime/sport/team-data.ts
'use client'

import type { Budget, BudgetResult } from './budget'
import type { SportRouter } from './router'
import { localDates, shiftDate } from './day-plan'
import { foldTeamKey } from './merge'
import { teamKeysMatch } from './sport-store'
import { fixturesTtlS, mainLeagueOf, roundFixtures, seasonGuesses, teamRowIndex, type LeagueRef, type LeagueTarget, type TeamTarget } from './team-model'
import { teamCallsFor, type SquadPlayer, type TeamFeed, type TeamFixture, type TeamInfo, type TopScorer, type Trophy } from './team-providers'
import type { Fixture, ProviderCall, ProviderId, StandingRow } from './provider'
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
  slå upp det (dagens matcher hos samma källa, ligans tabell, lagsök eller
  sportapi.ai:s slug — en gång; sparas på den följda posten), och en källa
  som är spärrad eller saknar kvot lämnar över till nästa — som routern.
  ETT ID HÖR TILL EN KÄLLA: id:n slås aldrig upp hos en källa och används
  hos en annan.

  Ger ingen källa lagets matcher (API-Sports gratisplan saknar innevarande
  säsong) läses de matcher som redan ligger i minnet (dygnsplanens dagar,
  `known`) — en källa i taget, och utan nya anrop.
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
  info: TeamInfo | null
  trophies: Trophy[] | null
}

export const EMPTY_TEAM: TeamPageData = { state: 'loading', provider: null, teamId: null, fixtures: [], league: null, standings: null, squad: null, crest: null, info: null, trophies: null }

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
  /** Fixturer som redan finns i minnet (resultatlagrets dagar), alla källor. Läses, kostar inget. */
  known?: Fixture[]
  onUpdate(data: TeamPageData): void
  /** Ett id som slogs upp: sparas på den följda posten så att uppslaget görs en gång. */
  onResolved?(provider: ProviderId, id: string): void
}

/** Samma lag: samma vikta namn, samma nyckelregel som Följer, eller det ena namnet i det andra. */
function sameTeam(name: string, target: Pick<TeamTarget, 'key' | 'name'>): boolean {
  const key = foldTeamKey(target.key || target.name)
  const n = foldTeamKey(name)
  return !!n && (n === key || teamKeysMatch(key, n) || n.includes(key) || key.includes(n))
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

/** Lagets id hos källan ur matcher den källan själv lämnat (aldrig en annan källas id). */
function idFromFixtures(provider: ProviderId, fixtures: Fixture[], target: TeamTarget): string | null {
  for (const f of fixtures) {
    if (f.provider !== provider) continue
    if (f.home.id && sameTeam(f.home.name, target)) return f.home.id
    if (f.away.id && sameTeam(f.away.name, target)) return f.away.id
  }
  return null
}

const AFFIX = new Set(['fc', 'cf', 'if', 'ik', 'ifk', 'aif', 'bk', 'sk', 'ff', 'afc', 'sc', 'ac', 'ssc', 'club', 'cd', 'ud', 'sv', 'fk'])

/** sportapi.ai:s slug ur namnet: "Real Madrid" → real-madrid; utan föreningsaffix som andra försök ("FC Barcelona" → barcelona). */
export function slugCandidates(name: string): string[] {
  const words = foldTeamKey(name).split(' ').filter(Boolean)
  const full = words.join('-')
  const bare = words.filter((w) => !AFFIX.has(w)).join('-')
  return [...new Set([full, bare].filter((x) => x.length >= 2))]
}

/**
 * Källans id för laget. Känt (följt ur sökning, dagens matcher) → direkt.
 * Annars i den här ordningen, så billigt som möjligt: matcher källan redan
 * lämnat (inget anrop), ligans tabell hos källan, och sist ett uppslag —
 * lagsök (API-Sports, TheSportsDB) eller slug (sportapi.ai, som saknar
 * lagsök). Ett uppslag godtas bara när svarets namn är laget.
 */
async function resolveId(b: Budget, target: TeamTarget, opts: LoadOpts, standings: Map<string, StandingRow[] | null>): Promise<string | null> {
  const pid = b.provider.id
  const known = target.ids[pid]
  if (known) return known
  let id = idFromFixtures(pid, opts.known ?? [], target)
  if (!id && target.league?.provider === pid) {
    const k = `${target.league.provider}|${target.league.id}`
    if (!standings.has(k)) standings.set(k, await opts.standings(target.sport, target.league))
    const rows = standings.get(k) ?? []
    const i = teamRowIndex(rows, target, null)
    id = i >= 0 ? rows[i].team.id || null : null
  }
  if (!id) {
    const calls = teamCallsFor(pid)
    if (calls.lookup) {
      for (const slug of slugCandidates(target.name)) {
        const call = calls.lookup(target.sport, slug)
        if (!call) break
        const res = await run(b, target.sport, call, opts.now)
        if (res.data && sameTeam(res.data.name, target)) { id = res.data.id; break }
        if (!res.ok && res.data == null && res.reason !== 'network') break
      }
    } else {
      const call = b.provider.searchTeams(target.sport, target.name)
      if (call.requests.length > 0) {
        const res = await once(`search|${callKey(b, call as ProviderCall<unknown>)}`, opts.now, () => b.run('search', target.sport, call), (r) => r.data != null)
        id = pickHit(res.data ?? [], target)
      }
    }
  }
  if (id) opts.onResolved?.(pid, id)
  return id
}

/** Lagets matcher ur minnet: källan med flest matcher för laget, bara dess egna (id:n blandas inte). */
function knownFeed(fixtures: Fixture[], target: TeamTarget, providers: ProviderId[]): { provider: ProviderId; id: string | null; fixtures: TeamFixture[] } | null {
  let best: { provider: ProviderId; id: string | null; fixtures: TeamFixture[] } | null = null
  for (const provider of providers) {
    const mine = fixtures.filter((f) => f.provider === provider && (sameTeam(f.home.name, target) || sameTeam(f.away.name, target) || (!!target.ids[provider] && (f.home.id === target.ids[provider] || f.away.id === target.ids[provider]))))
    const unique = [...new Map(mine.map((f) => [f.id, f])).values()]
    if (unique.length > (best?.fixtures.length ?? 0)) best = { provider, id: target.ids[provider] ?? idFromFixtures(provider, unique, target), fixtures: unique }
  }
  return best
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
  // Ingen källa gav lagets matcher: det som redan finns i minnet (inga anrop).
  if (!got) {
    const mem = knownFeed(opts.known ?? [], target, candidates.map((b) => b.provider.id))
    const b = mem ? router.budget(mem.provider) : null
    if (mem && b) got = { b, id: mem.id ?? '', season: '', feed: { fixtures: mem.fixtures, leagueId: null, crest: null } }
  }
  if (got) {
    const fixtures = [...got.feed.fixtures].sort((a, b) => a.kickoff - b.kickoff)
    update({ provider: got.b.provider.id, teamId: got.id || null, fixtures, crest: target.crest ?? got.feed.crest, info: got.feed.info ?? null })
  }

  // 2. Tabellen: serien hos källan som svarade, annars ligan dagens matcher känner.
  const main = got ? (got.feed.leagueId ? { id: got.feed.leagueId, season: got.season || 'current', name: target.league?.name ?? '' } : mainLeagueOf(got.feed.fixtures)) : null
  const league: LeagueRef | null = got && main ? { provider: got.b.provider.id, id: main.id, season: main.season || null, name: main.name || target.league?.name || '' } : target.league
  if (league) {
    const k = `${league.provider}|${league.id}`
    if (!standings.has(k)) standings.set(k, await opts.standings(sport, league))
    const rows = standings.get(k)
    // Ligans namn ur svaret när källan bara gav id:t (sportapi.ai `/teams/{id}`).
    const named = league.name ? league : { ...league, name: got?.feed.fixtures.find((f) => f.league.id === league.id)?.league.name ?? rows?.[0]?.group ?? '' }
    update({ league: named, standings: rows && rows.length > 0 ? rows : null })
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

  // 4. Titlarna, när källan har dem (sportapi.ai).
  if (got?.id) {
    const call = teamCallsFor(got.b.provider.id).trophies?.(sport, got.id)
    if (call) {
      const res = await run(got.b, sport, call, opts.now)
      if (res.data && res.data.length > 0) update({ trophies: res.data })
    }
  }
  update({ state: 'ready' })
  return data
}

export interface LeaguePageData {
  state: 'loading' | 'ready' | 'no-key'
  /** Ligan sidan till slut använde (uppslagen när den bara fanns i tablån). */
  ref: LeagueRef | null
  standings: StandingRow[] | null
  round: { round: number | null; fixtures: TeamFixture[] } | null
  scorers: TopScorer[] | null
}

export const EMPTY_LEAGUE: LeaguePageData = { state: 'loading', ref: null, standings: null, round: null, scorers: null }

/**
 * Ligan när sidan bara har tablåns namn: först matcher i minnet (samma
 * namn hos en källa med nyckel, inget anrop), sedan ligasöket (cachat en
 * vecka). Namnet måste stämma; ett ensamt orelaterat svar tas inte.
 */
async function resolveLeague(router: SportRouter, target: LeagueTarget, known: Fixture[]): Promise<LeagueRef | null> {
  const want = foldTeamKey(target.name)
  if (!want) return null
  const keyed = new Set(router.candidates(target.sport).map((b) => b.provider.id))
  const named = (n: string) => { const f = foldTeamKey(n); return !!f && (f === want || f.includes(want) || want.includes(f)) }
  for (const pid of router.candidates(target.sport).map((b) => b.provider.id)) {
    const hit = known.filter((f) => f.provider === pid && f.league.id && named(f.league.name)).sort((a, b) => b.kickoff - a.kickoff)[0]
    if (hit) return { provider: pid, id: hit.league.id, season: hit.league.season || null, name: hit.league.name }
  }
  const res = await router.searchLeagues(target.sport, target.name)
  if (!res.provider || !keyed.has(res.provider)) return null
  const hits = res.data ?? []
  const best = hits.find((h) => foldTeamKey(h.name) === want) ?? hits.find((h) => named(h.name))
  return best ? { provider: res.provider, id: best.id, season: null, name: best.name } : null
}

/** Ligasidan: tabellen, omgångens matcher och skytteligan — hos ligans egen källa (id:t är dess). */
export async function loadLeaguePage(router: SportRouter, target: LeagueTarget, opts: Omit<LoadOpts, 'onUpdate' | 'onResolved'> & { onUpdate(d: LeaguePageData): void }): Promise<LeaguePageData> {
  let data: LeaguePageData = { ...EMPTY_LEAGUE }
  const update = (patch: Partial<LeaguePageData>) => { data = { ...data, ...patch }; opts.onUpdate(data) }
  const known = opts.known ?? []
  if (router.candidates(target.sport).length === 0) { update({ state: 'no-key' }); return data }
  const ref = target.ref ?? await resolveLeague(router, target, known)
  const b = ref ? router.budget(ref.provider) : null
  if (!ref || !b) { update({ state: 'ready' }); return data }
  const sport = target.sport
  const calls = teamCallsFor(ref.provider)
  // Säsongen ur matcher källan själv lämnat för ligan, annars gissad.
  const seen = known.find((f) => f.provider === ref.provider && f.league.id === ref.id && f.league.season)
  const season = ref.season ?? seen?.league.season ?? (calls.needsSeason ? seasonGuesses(sport, opts.now)[0] : '')
  const resolved = { ...ref, season: season || null }
  update({ ref: resolved })
  const rows = await opts.standings(sport, resolved)
  update({ standings: rows && rows.length > 0 ? rows : null })
  const d = localDates(opts.now, opts.tz)
  const roundCall = calls.leagueFixtures(sport, ref.id, { season, tz: opts.tz, from: shiftDate(d.today, -4), to: shiftDate(d.today, 4) })
  let round: TeamFixture[] = []
  if (roundCall) {
    const res = await run(b, sport, roundCall, opts.now)
    round = res.data ?? []
  }
  // Källans eget ligaanrop gav inget (planens säsongsgräns): ligans matcher ur minnet.
  if (round.length === 0) round = [...new Map(known.filter((f) => f.provider === ref.provider && f.league.id === ref.id).map((f) => [f.id, f])).values()]
  if (round.length > 0) update({ round: roundFixtures(round, opts.now) })
  const scorers = calls.topScorers(sport, ref.id, season)
  if (scorers) {
    const res = await run(b, sport, scorers, opts.now)
    if (res.data && res.data.length > 0) update({ scorers: res.data.slice(0, 10) })
  }
  update({ state: 'ready' })
  return data
}
