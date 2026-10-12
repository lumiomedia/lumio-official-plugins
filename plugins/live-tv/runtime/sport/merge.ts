import { followState, rankedSources } from './sport-day-model'
import type { Fixture, FixtureStatus } from './provider'
import type { LinkMap } from './sport-link'
import type { MatchStatus, SportKind, SportMatch } from './sport-model'
import { sportsCompatible, teamKeysMatch, type SportFollow, type SportOverrides } from './sport-store'

export function fixtureMatchKey(f: Pick<Fixture, 'provider' | 'id'>): string {
  return `fx:${f.provider}:${f.id}`
}

/** Som Rusts `team_key`, men bara det ett källnamn behöver: gemener, diakritik bort, skiljetecken till mellanslag. */
export function foldTeamKey(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export interface MergeArgs {
  epg: SportMatch[]
  fixtures: Fixture[]
  links: LinkMap
  overrides: SportOverrides
  coverage(sport: SportKind): 'full' | 'epg'
  /**
   * Matchens första källa och id för dagen (resultatlagrets händelseindex). "Bara resultat"-raden
   * får sitt id därifrån, så att den behåller id (följd, "Notis vid mål", vald kanal) över ett källbyte.
   */
  canonical?(f: Fixture): Pick<Fixture, 'provider' | 'id'>
  /**
   * Källans fixturer från dagarna före (minnet och diskcachen, inga nya anrop). En okopplad
   * EPG-match vars lag redan spelat färdigt där är en repris som tablån inte märkt.
   */
  history?: Fixture[]
}

const TWO_HOURS = 2 * 3_600_000
/** En direktsändning börjar senast strax efter avspark; en sändning två timmar efter en spelad match är en repris. */
const REPLAY_GAP = TWO_HOURS
/** Hur långt bak en spelad match får ligga för att en sändning av samma lag ska räknas som repris av den. */
const REPLAY_LOOKBACK = 7 * 24 * 3_600_000
const STATUS: Record<FixtureStatus, MatchStatus> = { scheduled: 'upcoming', postponed: 'upcoming', live: 'live', ht: 'live', finished: 'finished' }
const phaseOf = (s: FixtureStatus): SportMatch['phase'] => (s === 'ht' || s === 'postponed' ? s : undefined)

function fromFixture(f: Fixture): Partial<SportMatch> {
  return {
    home: f.home.name,
    away: f.away.name,
    homeCrest: f.home.crest,
    awayCrest: f.away.crest,
    homeIds: { [f.provider]: f.home.id },
    awayIds: { [f.provider]: f.away.id },
    status: STATUS[f.status],
    phase: phaseOf(f.status),
    minute: f.minute,
    score: f.score ?? undefined,
    fixture: { provider: f.provider, id: f.id, leagueId: f.league.id, season: f.league.season, country: f.league.country },
    lastGoal: f.lastGoal,
    ...(f.venueImage ? { venueImage: f.venueImage } : {}),
    coverage: 'full',
  }
}

function applyFixture(m: SportMatch, f: Fixture, swapped: boolean): SportMatch {
  // Källans lag ligger i källans ordning. EPG-nycklarna följer det lag de hör till.
  const homeKey = swapped ? m.awayKey : m.homeKey
  const awayKey = swapped ? m.homeKey : m.awayKey
  return {
    ...m,
    ...fromFixture(f),
    league: f.league.name || m.league,
    homeKey: homeKey ?? foldTeamKey(f.home.name),
    awayKey: awayKey ?? foldTeamKey(f.away.name),
    round: f.league.round ?? m.round,
    venue: f.venue ?? m.venue,
    resultOnly: false,
  }
}

function fixtureOnly(f: Fixture, overrides: SportOverrides, canonical: Pick<Fixture, 'provider' | 'id'> = f): SportMatch {
  const match: SportMatch = {
    id: fixtureMatchKey(canonical),
    kind: f.sport,
    league: f.league.name,
    leagueKey: `fx:${f.provider}:${f.league.id}`,
    home: f.home.name,
    away: f.away.name,
    homeKey: foldTeamKey(f.home.name),
    awayKey: foldTeamKey(f.away.name),
    event: null,
    start: f.kickoff,
    stop: f.kickoff + TWO_HOURS,
    status: 'upcoming',
    rerun: false,
    round: f.league.round,
    venue: f.venue,
    sources: [],
    ...fromFixture(f),
    resultOnly: true,
  }
  // Fas 1:s "Välj annan kanal…" skriver sport_overrides_v1[match.id]: en vald kanal gör matchen tittbar.
  return overrides[match.id] ? { ...match, sources: rankedSources(match, overrides), resultOnly: false } : match
}

function sameTeams(m: SportMatch, f: Fixture): boolean {
  const h = foldTeamKey(f.home.name)
  const a = foldTeamKey(f.away.name)
  return (teamKeysMatch(m.homeKey, h) && teamKeysMatch(m.awayKey, a)) || (teamKeysMatch(m.homeKey, a) && teamKeysMatch(m.awayKey, h))
}

/**
 * Tablån märker en repris bara med datum i beskrivningen eller en tidigare live-flaggad
 * sändning samma dag. TV4 Fotboll och ESPN sänder om gårdagens matcher utan något av det,
 * och då stod de som LIVE utan ställning. Källan vet bättre: samma lag har redan spelat
 * (avspark minst två timmar före sändningen, inom en vecka) och inget nytt möte väntar i dag.
 */
function isProviderRerun(m: SportMatch, today: Fixture[], history: Fixture[]): boolean {
  if (m.rerun || m.coverage !== 'full' || !m.homeKey || !m.awayKey) return false
  const fits = (f: Fixture) => sportsCompatible(f.sport, m.kind) && sameTeams(m, f)
  if (today.some((f) => fits(f) && f.status !== 'finished' && f.status !== 'postponed')) return false
  return [...today, ...history].some((f) => fits(f) && f.status !== 'postponed' && f.kickoff + REPLAY_GAP <= m.start && m.start - f.kickoff <= REPLAY_LOOKBACK)
}

/**
 * EPG-matcherna ligger kvar i sin ordning. En kopplad fixtur lägger på
 * ställning, status, märken och kanoniska namn. Okopplade fixturer i täckta
 * sporter läggs sist som "Bara resultat". En override (fas 1:s "Välj annan
 * kanal…") vinner alltid.
 */
export function mergeLinked(a: MergeArgs): SportMatch[] {
  const out: SportMatch[] = a.epg.map((m) => ({ ...m, coverage: a.coverage(m.kind) }))
  const index = new Map(out.map((m, i) => [m.id, i]))
  const used = new Set<string>()
  for (const f of a.fixtures) {
    if (a.coverage(f.sport) !== 'full') continue
    // Kopplingen är nycklad på källa + id (flera källors id kan krocka); äldre kartor på bara id.
    const link = a.links[fixtureMatchKey(f)] ?? a.links[f.id]
    const i = link ? index.get(link.matchId) : undefined
    if (link && i !== undefined && !used.has(link.matchId) && out[i].coverage === 'full') {
      used.add(link.matchId)
      out[i] = applyFixture(out[i], f, link.swapped)
      continue
    }
    out.push(fixtureOnly(f, a.overrides, a.canonical?.(f)))
  }
  for (let i = 0; i < a.epg.length; i += 1) {
    if (!used.has(out[i].id) && isProviderRerun(out[i], a.fixtures, a.history ?? [])) out[i] = { ...out[i], rerun: true }
  }
  return out
}

/**
 * Det användaren bryr sig om: EPG-matcherna (med eller utan kopplad fixtur),
 * och av "Bara resultat" bara följda lag och ligor. En vald kanal (override)
 * gör redan raden tittbar (`resultOnly: false`). Dagsprogrammet täcker hela
 * världen; det här är vad vyerna, spelarens låda och livepollningen ser.
 * Resultat-fliken läser hela listan och pollar inte resten live.
 */
export function relevantMatches(all: SportMatch[], follows: SportFollow[]): SportMatch[] {
  return all.filter((m) => !m.resultOnly || followState(m, follows).any)
}
