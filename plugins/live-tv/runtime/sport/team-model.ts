// runtime/sport/team-model.ts
import { foldTeamKey } from './merge'
import { positionGroup, POSITION_ORDER, type PositionGroup } from './match-info-model'
import { teamKeysMatch, type SportFollow } from './sport-store'
import type { ProviderId, StandingRow } from './provider'
import type { SquadPlayer, TeamFixture } from './team-providers'
import type { SportKind, SportMatch } from './sport-model'

/*
  LAG- OCH LIGASIDANS RENA DELAR: vad sidan ska visa ur det källorna gav.
  Inga anrop, ingen klocka utöver `now` som skickas in.
*/

export interface LeagueRef { provider: ProviderId; id: string; season: string | null; name: string }

/** Laget sidan visar. `ids` = källornas egna lag-id (följt ur en sökning, eller ur dagens matcher). */
export interface TeamTarget {
  sport: SportKind
  name: string
  key: string
  crest: string | null
  ids: Partial<Record<ProviderId, string>>
  league: LeagueRef | null
}

/** Ligan sidan visar. `ref: null` = ligan finns bara i tablån; sidan har då inget att hämta. */
export interface LeagueTarget { sport: SportKind; name: string; key: string; ref: LeagueRef | null }

const PROVIDERS: readonly ProviderId[] = ['api-sports', 'sportapi', 'thesportsdb']
const isProvider = (v: string): v is ProviderId => (PROVIDERS as readonly string[]).includes(v)

/** Matcherna där laget spelar (samma nyckelregel som Följer). */
function teamMatches(key: string, matches: SportMatch[]): Array<{ m: SportMatch; side: 'home' | 'away' }> {
  const out: Array<{ m: SportMatch; side: 'home' | 'away' }> = []
  for (const m of matches) {
    if (teamKeysMatch(key, m.homeKey)) out.push({ m, side: 'home' })
    else if (teamKeysMatch(key, m.awayKey)) out.push({ m, side: 'away' })
  }
  return out
}

/** Ligan ur en kopplad match (källans id och säsong). */
function leagueOfMatch(m: SportMatch): LeagueRef | null {
  const fx = m.fixture
  if (!fx?.leagueId || !isProvider(fx.provider)) return null
  return { provider: fx.provider, id: fx.leagueId, season: fx.season ?? null, name: m.league }
}

/** Den liga som förekommer oftast bland matcherna (serien före en enstaka cupmatch). */
function mostCommonLeague(list: SportMatch[]): LeagueRef | null {
  const counts = new Map<string, { ref: LeagueRef; n: number }>()
  for (const m of list) {
    const ref = leagueOfMatch(m)
    if (!ref) continue
    const k = `${ref.provider}|${ref.id}`
    const hit = counts.get(k)
    if (hit) hit.n += 1
    else counts.set(k, { ref, n: 1 })
  }
  return [...counts.values()].sort((a, b) => b.n - a.n)[0]?.ref ?? null
}

function idsFromMatches(found: Array<{ m: SportMatch; side: 'home' | 'away' }>): Partial<Record<ProviderId, string>> {
  const ids: Partial<Record<ProviderId, string>> = {}
  for (const { m, side } of found) {
    for (const [p, id] of Object.entries((side === 'home' ? m.homeIds : m.awayIds) ?? {})) {
      if (isProvider(p) && id && !ids[p]) ids[p] = id
    }
  }
  return ids
}

/** Från en följd post (Dina lag, Mina lag): postens id först, sedan det dagens matcher vet. */
export function teamTargetFromFollow(f: SportFollow, matches: SportMatch[]): TeamTarget {
  const found = teamMatches(f.key, matches)
  const own: Partial<Record<ProviderId, string>> = {}
  for (const [p, id] of Object.entries(f.providerIds ?? {})) if (isProvider(p) && id) own[p] = id
  const crest = found.map(({ m, side }) => (side === 'home' ? m.homeCrest : m.awayCrest)).find(Boolean) ?? f.crest ?? null
  return { sport: f.sport, name: f.name, key: f.key, crest, ids: { ...idsFromMatches(found), ...own }, league: mostCommonLeague(found.map((x) => x.m)) }
}

/** Från ett lagnamn i matchinfon. */
export function teamTargetFromMatch(m: SportMatch, side: 'home' | 'away', matches: SportMatch[] = []): TeamTarget | null {
  const name = side === 'home' ? m.home : m.away
  const key = side === 'home' ? m.homeKey : m.awayKey
  if (!name || !key) return null
  const found = [{ m, side }, ...teamMatches(key, matches.filter((x) => x.id !== m.id))]
  return { sport: m.kind, name, key, crest: (side === 'home' ? m.homeCrest : m.awayCrest) ?? null, ids: idsFromMatches(found), league: leagueOfMatch(m) ?? mostCommonLeague(found.map((x) => x.m)) }
}

/** `fx:<källa>:<id>` = ligan följdes ur källans sökning; annars tablåns liganyckel. */
export function leagueTargetFromFollow(f: SportFollow, matches: SportMatch[]): LeagueTarget {
  const fx = /^fx:([a-z-]+):(.+)$/.exec(f.key)
  if (fx && isProvider(fx[1])) {
    const seen = matches.find((m) => m.fixture?.provider === fx[1] && m.fixture.leagueId === fx[2])
    return { sport: f.sport, name: f.name, key: f.key, ref: { provider: fx[1], id: fx[2], season: seen?.fixture?.season ?? null, name: f.name } }
  }
  const m = matches.find((x) => x.leagueKey === f.key && leagueOfMatch(x))
  return { sport: f.sport, name: f.name, key: f.key, ref: m ? leagueOfMatch(m) : null }
}

export function leagueTargetFromMatch(m: SportMatch): LeagueTarget {
  return { sport: m.kind, name: m.league, key: m.leagueKey, ref: leagueOfMatch(m) }
}

/**
 * Säsongerna att pröva när ingen match sagt vilken (bästa gissning först).
 * Fotboll: kalenderårsligor (Allsvenskan) och höst–vår-ligor heter båda
 * efter startåret, så juli–december är det i år; januari–juni är höst–vår-
 * ligorna förra året. Hockey och handboll: startåret (säsongen börjar i
 * september). Basket: "2026-2027" (API-Basketballs form för NBA/Euroleague).
 */
export function seasonGuesses(sport: SportKind, now: number): string[] {
  const d = new Date(now)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  if (sport === 'football') return m >= 7 ? [String(y), String(y - 1)] : [String(y - 1), String(y)]
  const start = m >= 9 ? y : y - 1
  if (sport === 'basketball') return [`${start}-${start + 1}`, String(start)]
  return [String(start)]
}

/** Lagets sida i matchen: källans id först, annars namnet. */
export function sideOf(f: TeamFixture, target: Pick<TeamTarget, 'key'>, id: string | null): 'home' | 'away' | null {
  if (id && f.home.id === id) return 'home'
  if (id && f.away.id === id) return 'away'
  if (teamKeysMatch(target.key, foldTeamKey(f.home.name))) return 'home'
  if (teamKeysMatch(target.key, foldTeamKey(f.away.name))) return 'away'
  return null
}

export interface FormEntry { result: 'W' | 'D' | 'L'; opponent: string; opponentCrest: string | null; score: string; home: boolean; fixture: TeamFixture }

/** De fem senaste spelade matcherna, senaste först, med lagets resultat. */
export function formOf(fixtures: TeamFixture[], target: Pick<TeamTarget, 'key'>, id: string | null, n = 5): FormEntry[] {
  return fixtures
    .filter((f) => f.status === 'finished' && f.score)
    .sort((a, b) => b.kickoff - a.kickoff)
    .flatMap((f) => {
      const side = sideOf(f, target, id)
      if (!side || !f.score) return []
      const mine = side === 'home' ? f.score.home : f.score.away
      const theirs = side === 'home' ? f.score.away : f.score.home
      const opp = side === 'home' ? f.away : f.home
      return [{ result: mine > theirs ? 'W' : mine < theirs ? 'L' : 'D', opponent: opp.name, opponentCrest: opp.crest, score: `${f.score.home}–${f.score.away}`, home: side === 'home', fixture: f } as FormEntry]
    })
    .slice(0, n)
}

/** Pågående match (källans status), annars ingen. */
export function liveFixture(fixtures: TeamFixture[]): TeamFixture | null {
  return fixtures.find((f) => f.status === 'live' || f.status === 'ht') ?? null
}

/** Kommande matcher i tidsordning, alla turneringar. */
export function upcomingFixtures(fixtures: TeamFixture[], now: number, n = 5): TeamFixture[] {
  return fixtures
    .filter((f) => f.status === 'scheduled' && (f.dateOnly ? f.kickoff + 12 * 3_600_000 : f.kickoff) >= now - 15 * 60_000)
    .sort((a, b) => a.kickoff - b.kickoff)
    .slice(0, n)
}

/**
 * Matcherna gäller fram till lagets nästa match är spelad (avspark + 2,5 h),
 * räknat från när posten hämtades. Ingen nästa match: ett dygn. Golv tio
 * minuter (en match som redan borde vara slut), tak en vecka.
 */
export function fixturesTtlS(fixtures: TeamFixture[], fetchedAt: number | null, now: number): number {
  const at = fetchedAt ?? now
  const next = fixtures.filter((f) => f.status === 'scheduled' || f.status === 'live' || f.status === 'ht').map((f) => f.kickoff).filter((k) => k > 0).sort((a, b) => a - b)[0]
  if (next == null) return 86_400
  const until = next + 2.5 * 3_600_000 - at
  return Math.round(Math.min(7 * 86_400_000, Math.max(10 * 60_000, until)) / 1000)
}

/** Serien bland lagets matcher hos källan: den som förekommer oftast (en cupmatch byter inte tabell). */
export function mainLeagueOf(fixtures: TeamFixture[]): { id: string; season: string; name: string } | null {
  const counts = new Map<string, { id: string; season: string; name: string; n: number; last: number }>()
  for (const f of fixtures) {
    if (!f.league.id) continue
    const hit = counts.get(f.league.id) ?? { id: f.league.id, season: f.league.season, name: f.league.name, n: 0, last: 0 }
    hit.n += 1
    if (f.kickoff >= hit.last) { hit.last = f.kickoff; hit.season = f.league.season || hit.season }
    counts.set(f.league.id, hit)
  }
  const best = [...counts.values()].sort((a, b) => b.n - a.n || b.last - a.last)[0]
  return best ? { id: best.id, season: best.season, name: best.name } : null
}

/** Lagets rad i tabellen: källans id, annars namnet. */
export function teamRowIndex(rows: StandingRow[], target: Pick<TeamTarget, 'key'>, id: string | null): number {
  const byId = id ? rows.findIndex((r) => r.team.id === id) : -1
  if (byId >= 0) return byId
  return rows.findIndex((r) => teamKeysMatch(target.key, foldTeamKey(r.team.name)))
}

/** Tabellen runt laget: två över, två under (i lagets grupp). `rows: []` = laget finns inte i tabellen. */
export function standingsSlice(rows: StandingRow[], index: number, around = 2): { rows: StandingRow[]; group: StandingRow[]; teamIndex: number } {
  if (index < 0) return { rows: [], group: [], teamIndex: -1 }
  const groupName = rows[index].group
  const group = rows.filter((r) => r.group === groupName)
  const at = group.indexOf(rows[index])
  let from = Math.max(0, at - around)
  const to = Math.min(group.length, from + 2 * around + 1)
  from = Math.max(0, to - (2 * around + 1))
  return { rows: group.slice(from, to), group, teamIndex: at - from }
}

/** "3:a" / "3rd" — svensk ordning: 1:a och 2:a (utom 11, 12), annars :e. */
export function ordinal(n: number, lang: string): string {
  const last = n % 10
  const teen = n % 100 >= 11 && n % 100 <= 13
  if (lang === 'sv') return `${n}:${!teen && (last === 1 || last === 2) ? 'a' : 'e'}`
  return `${n}${teen ? 'th' : last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`
}

export interface SquadGroup { group: PositionGroup; players: SquadPlayer[] }

/** Truppen per position (MV, försvar, mittfält, anfall), tröjnummer i ordning; okända positioner sist. */
export function squadGroups(players: SquadPlayer[]): SquadGroup[] {
  const byNumber = (a: SquadPlayer, b: SquadPlayer) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name)
  return POSITION_ORDER
    .map((group) => ({ group, players: players.filter((p) => positionGroup(p.pos) === group).sort(byNumber) }))
    .filter((g) => g.players.length > 0)
}

const KICKOFF_SLACK_MS = 3 * 3_600_000

/**
 * Tablåns match för en källfixtur: samma källa och id (kopplad), annars båda
 * lagen och avspark inom tre timmar. Det är den som har kanaler, så "Titta"
 * och påminnelsen går via den.
 */
export function epgMatchFor(f: TeamFixture, matches: SportMatch[]): SportMatch | null {
  const linked = matches.find((m) => m.fixture?.provider === f.provider && m.fixture.id === f.id)
  if (linked) return linked
  const h = foldTeamKey(f.home.name)
  const a = foldTeamKey(f.away.name)
  return matches.find((m) => !m.rerun && m.sources.length > 0 && Math.abs(m.start - f.kickoff) <= (f.dateOnly ? 14 * 3_600_000 : KICKOFF_SLACK_MS)
    && teamKeysMatch(h, m.homeKey) && teamKeysMatch(a, m.awayKey)) ?? null
}

/**
 * Ligans "omgång": numrerade omgångar → omgången närmast idag (den som pågår
 * eller står näst på tur); annars matcherna en vecka bakåt och framåt.
 */
export function roundFixtures(fixtures: TeamFixture[], now: number): { round: number | null; fixtures: TeamFixture[] } {
  const sorted = [...fixtures].sort((a, b) => a.kickoff - b.kickoff)
  const numbered = sorted.filter((f) => f.league.round != null)
  if (numbered.length > 0) {
    const nearest = [...numbered].sort((a, b) => Math.abs(a.kickoff - now) - Math.abs(b.kickoff - now))[0]
    const round = nearest.league.round!
    return { round, fixtures: numbered.filter((f) => f.league.round === round) }
  }
  const window = 7 * 86_400_000
  return { round: null, fixtures: sorted.filter((f) => Math.abs(f.kickoff - now) <= window) }
}
