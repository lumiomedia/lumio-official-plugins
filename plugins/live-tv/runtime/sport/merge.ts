import { followState, rankedSources } from './sport-day-model'
import type { Fixture, FixtureStatus } from './provider'
import type { LinkMap } from './sport-link'
import type { MatchStatus, SportKind, SportMatch } from './sport-model'
import type { SportFollow, SportOverrides } from './sport-store'

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
}

const TWO_HOURS = 2 * 3_600_000
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
    fixture: { provider: f.provider, id: f.id, leagueId: f.league.id, season: f.league.season },
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

function fixtureOnly(f: Fixture, overrides: SportOverrides): SportMatch {
  const match: SportMatch = {
    id: fixtureMatchKey(f),
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
    const link = a.links[f.id]
    const i = link ? index.get(link.matchId) : undefined
    if (link && i !== undefined && !used.has(link.matchId) && out[i].coverage === 'full') {
      used.add(link.matchId)
      out[i] = applyFixture(out[i], f, link.swapped)
      continue
    }
    out.push(fixtureOnly(f, a.overrides))
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
