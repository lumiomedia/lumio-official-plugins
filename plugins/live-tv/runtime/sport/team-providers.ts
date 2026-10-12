// runtime/sport/team-providers.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- tolkar extern JSON fält för fält */
import { apiSports } from './api-sports'
import { sportApi, sportApiCrest } from './sportapi'
import { theSportsDb } from './thesportsdb'
import type { Fixture, ProviderCall, ProviderId } from './provider'
import type { SportKind } from './sport-model'

/*
  LAG- OCH LIGASIDANS ANROP, per källa. Samma regel som adaptrarna: inget nät
  här, bara förfrågningar och tolkar — kvothanteraren (`budget.ts`) gör
  anropen. Egen modul i stället för fler metoder på `SportsProvider`, så att
  dagsprogrammets adaptrar står orörda; fixturerna tolkas ändå med
  adaptrarnas egna tolkar (samma svarsform som dagsprogrammet).

  `null` = källan har ingen sådan uppslagning för sporten, och då görs inget
  anrop (sidan går vidare till nästa källa, eller döljer sektionen).
*/

/** En match i lagets lista. `dateOnly`: källan gav bara datum (sportapi.ai `/teams/{id}`), klockslaget är okänt. */
export type TeamFixture = Fixture & { dateOnly?: boolean }

export interface TeamFeed {
  fixtures: TeamFixture[]
  /** Lagets serie hos källan, när svaret säger det (sportapi.ai `team.league_id`). Annars räknas den ur fixturerna. */
  leagueId: string | null
  crest: string | null
}

export interface SquadPlayer { name: string; number: number | null; pos: string | null; photo: string | null; injury: string | null }
export interface TopScorer { rank: number; name: string; team: string; goals: number }

export interface TeamCalls {
  /** Lagets matcher (senaste och kommande). `season` = säsongen källan vill ha, `ttlS` sätts av sidan (till nästa match). */
  fixtures(sport: SportKind, teamId: string, opts: { season: string; tz: string; ttlS: number }): ProviderCall<TeamFeed> | null
  squad(sport: SportKind, teamId: string, opts: { season: string }): ProviderCall<SquadPlayer[]> | null
  /** Omgångens matcher och resultat runt `today` (`from`/`to` = lokala datum). */
  leagueFixtures(sport: SportKind, leagueId: string, opts: { season: string; tz: string; from: string; to: string }): ProviderCall<TeamFixture[]> | null
  topScorers(sport: SportKind, leagueId: string, season: string): ProviderCall<TopScorer[]> | null
  /** Källan behöver säsongen i anropen (annars bara ett tomt värde). */
  needsSeason: boolean
}

export const SQUAD_TTL_S = 86_400
export const INJURY_TTL_S = 43_200
export const LEAGUE_ROUND_TTL_S = 3_600
export const TOPSCORERS_TTL_S = 43_200

const arr = (v: any): any[] => (Array.isArray(v) ? v : [])
const num = (v: any): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null
const str = (v: any): string | null => (typeof v === 'string' && v.trim() ? v : null)
const enc = encodeURIComponent
// Adaptrarnas listtolkar bryr sig inte om datumet; bara svarets form räknas.
const LIST_OPTS = { today: '1970-01-01', tz: 'UTC', dayEndMs: 0 }

const apiSportsList = (sport: SportKind, body: unknown): Fixture[] => apiSports.day(sport, LIST_OPTS.today, LIST_OPTS).parse([body])
const tsdbList = (sport: SportKind, list: unknown): Fixture[] => theSportsDb.day(sport, LIST_OPTS.today, LIST_OPTS).parse([{ events: arr(list) }])

/**
 * sportapi.ai:s listor (`/teams/{id}` `matches`, `/leagues/{id}`) har färre fält
 * än dagsprogrammet: ofta bara `date`, och resultatlistan saknar `status`.
 * Klockslaget hittas aldrig på — `dateOnly` säger att bara dagen är känd.
 */
function sportApiList(rows: unknown, finished: boolean): TeamFixture[] {
  const out: TeamFixture[] = []
  for (const raw of arr(rows)) {
    const dateOnly = !str(raw?.kickoff_utc) && !str(raw?.datetime)
    const shaped = { ...raw, status: raw?.status ?? (finished ? 'FT' : 'Scheduled'), ...(dateOnly && str(raw?.date) ? { datetime: `${raw.date} 12:00:00` } : {}) }
    const [f] = sportApi.day('football', LIST_OPTS.today, LIST_OPTS).parse([{ data: [shaped] }])
    if (f) out.push(dateOnly ? { ...f, dateOnly: true } : f)
  }
  return out
}

/** API-Sports `players/squads` + `injuries`. Skadorna gäller lagets senaste eller nästa match (samma spelare står i flera matcher). */
function apiSportsSquad(squadBody: unknown, injuryBody: unknown): SquadPlayer[] {
  const players = arr(arr((squadBody as any)?.response)[0]?.players)
  const injuries = arr((injuryBody as any)?.response)
  const latest = Math.max(0, ...injuries.map((x) => num(x?.fixture?.timestamp) ?? 0))
  const hurt = new Map<string, string>()
  for (const x of injuries) {
    if ((num(x?.fixture?.timestamp) ?? 0) !== latest) continue
    const id = String(x?.player?.id ?? '')
    const reason = str(x?.player?.reason) ?? str(x?.player?.type)
    if (id && reason) hurt.set(id, reason)
  }
  return players.map((p) => ({ name: String(p?.name ?? ''), number: num(p?.number), pos: str(p?.position), photo: str(p?.photo), injury: hurt.get(String(p?.id ?? '')) ?? null })).filter((p) => p.name)
}

const apiSportsCalls: TeamCalls = {
  needsSeason: true,
  fixtures(sport, teamId, opts) {
    // `season` och inte `next`/`last`: gratisplanen tar inte de parametrarna, och en säsong ger båda i ETT anrop.
    const route = sport === 'football' ? '/fixtures' : '/games'
    return {
      requests: [{ sport, path: `${route}?team=${enc(teamId)}&season=${enc(opts.season)}&timezone=${enc(opts.tz)}`, ttlS: opts.ttlS }],
      parse: (bodies) => ({ fixtures: apiSportsList(sport, bodies[0]), leagueId: null, crest: null }),
    }
  },
  squad(sport, teamId, opts) {
    // Truppen finns bara i fotbollens API (v3); hockey och basket (v1) har ingen.
    if (sport !== 'football') return null
    return {
      requests: [
        { sport, path: `/players/squads?team=${enc(teamId)}`, ttlS: SQUAD_TTL_S },
        { sport, path: `/injuries?team=${enc(teamId)}&season=${enc(opts.season)}`, ttlS: INJURY_TTL_S },
      ],
      parse: (bodies) => apiSportsSquad(bodies[0], bodies[1]),
    }
  },
  leagueFixtures(sport, leagueId, opts) {
    // Fotboll: fönstret runt idag. v1 (hockey, basket) har inget datumintervall: hela säsongen i ett anrop, gallrad här.
    if (sport === 'football') {
      return {
        requests: [{ sport, path: `/fixtures?league=${enc(leagueId)}&season=${enc(opts.season)}&from=${opts.from}&to=${opts.to}&timezone=${enc(opts.tz)}`, ttlS: LEAGUE_ROUND_TTL_S }],
        parse: (bodies) => apiSportsList(sport, bodies[0]),
      }
    }
    return {
      requests: [{ sport, path: `/games?league=${enc(leagueId)}&season=${enc(opts.season)}&timezone=${enc(opts.tz)}`, ttlS: LEAGUE_ROUND_TTL_S }],
      parse: (bodies) => apiSportsList(sport, bodies[0]),
    }
  },
  topScorers(sport, leagueId, season) {
    if (sport !== 'football') return null
    return {
      requests: [{ sport, path: `/players/topscorers?league=${enc(leagueId)}&season=${enc(season)}`, ttlS: TOPSCORERS_TTL_S }],
      parse: (bodies) => arr((bodies[0] as any)?.response).map((x, i) => {
        const s = arr(x?.statistics)[0]
        return { rank: i + 1, name: String(x?.player?.name ?? ''), team: String(s?.team?.name ?? ''), goals: num(s?.goals?.total) ?? 0 }
      }).filter((x) => x.name),
    }
  },
}

/*
  sportapi.ai (dokumentationen, overifierat med riktig nyckel): `/teams/{id}`
  har lagets matcher (spelade och kommande) och serien, `/teams/{id}/squad`
  truppen (inga skador), `/leagues/{id}` omgångens matcher och
  `/leagues/{id}/topscorers` skytteligan. Bara fotboll, inga frågeparametrar.
*/
const sportApiCalls: TeamCalls = {
  needsSeason: false,
  fixtures(sport, teamId, opts) {
    if (sport !== 'football') return null
    return {
      requests: [{ sport, path: `/teams/${enc(teamId)}`, ttlS: opts.ttlS }],
      parse: (bodies) => {
        const body = bodies[0] as any
        const all = arr(body?.matches)
        const done = (m: any) => m?.home_score != null && m?.away_score != null && String(m?.status ?? '').toLowerCase() !== 'scheduled'
        return {
          fixtures: [...sportApiList(all.filter(done), true), ...sportApiList(all.filter((m) => !done(m)), false)],
          leagueId: body?.team?.league_id != null ? String(body.team.league_id) : null,
          crest: sportApiCrest(body?.team?.logo_file),
        }
      },
    }
  },
  squad(sport, teamId) {
    if (sport !== 'football') return null
    return {
      requests: [{ sport, path: `/teams/${enc(teamId)}/squad`, ttlS: SQUAD_TTL_S }],
      parse: (bodies) => arr((bodies[0] as any)?.squad).map((p) => ({ name: String(p?.full_name ?? p?.name ?? ''), number: num(p?.jersey_number), pos: str(p?.position), photo: null, injury: null })).filter((p) => p.name),
    }
  },
  leagueFixtures(sport, leagueId) {
    if (sport !== 'football') return null
    return {
      requests: [{ sport, path: `/leagues/${enc(leagueId)}`, ttlS: LEAGUE_ROUND_TTL_S }],
      parse: (bodies) => {
        const body = bodies[0] as any
        return [...sportApiList(body?.recent_results, true), ...sportApiList(body?.upcoming_fixtures, false)]
      },
    }
  },
  topScorers(sport, leagueId) {
    if (sport !== 'football') return null
    return {
      requests: [{ sport, path: `/leagues/${enc(leagueId)}/topscorers`, ttlS: TOPSCORERS_TTL_S }],
      parse: (bodies) => arr((bodies[0] as any)?.data).map((x, i) => ({ rank: num(x?.rank) ?? i + 1, name: String(x?.player_name ?? ''), team: String(x?.team_name ?? ''), goals: num(x?.goals) ?? 0 })).filter((x) => x.name),
    }
  },
}

/*
  TheSportsDB v1 (dokumentationen, overifierat med riktig nyckel): senaste och
  nästa matcher per lag, hela truppen per lag, och ligans senaste/nästa
  matcher. Ingen skytteliga. Tränare och ledare står i spelarlistan — de gallras.
*/
const STAFF = /manager|coach|trainer|tränare|assistant/i
const tsdbCalls: TeamCalls = {
  needsSeason: false,
  fixtures(sport, teamId, opts) {
    return {
      requests: [
        { sport, path: `/v1/eventslast.php?id=${enc(teamId)}`, ttlS: opts.ttlS },
        { sport, path: `/v1/eventsnext.php?id=${enc(teamId)}`, ttlS: opts.ttlS },
      ],
      parse: (bodies) => ({ fixtures: [...tsdbList(sport, (bodies[0] as any)?.results), ...tsdbList(sport, (bodies[1] as any)?.events)], leagueId: null, crest: null }),
    }
  },
  squad(sport, teamId) {
    return {
      requests: [{ sport, path: `/v1/lookup_all_players.php?id=${enc(teamId)}`, ttlS: SQUAD_TTL_S }],
      parse: (bodies) => arr((bodies[0] as any)?.player)
        .filter((p) => !STAFF.test(String(p?.strPosition ?? '')))
        .map((p) => ({ name: String(p?.strPlayer ?? ''), number: num(p?.strNumber), pos: str(p?.strPosition), photo: str(p?.strCutout) ?? str(p?.strThumb), injury: null }))
        .filter((p) => p.name),
    }
  },
  leagueFixtures(sport, leagueId) {
    return {
      requests: [
        { sport, path: `/v1/eventspastleague.php?id=${enc(leagueId)}`, ttlS: LEAGUE_ROUND_TTL_S },
        { sport, path: `/v1/eventsnextleague.php?id=${enc(leagueId)}`, ttlS: LEAGUE_ROUND_TTL_S },
      ],
      parse: (bodies) => [...tsdbList(sport, (bodies[0] as any)?.events), ...tsdbList(sport, (bodies[1] as any)?.events)],
    }
  },
  topScorers: () => null,
}

export function teamCallsFor(id: ProviderId): TeamCalls {
  return id === 'sportapi' ? sportApiCalls : id === 'thesportsdb' ? tsdbCalls : apiSportsCalls
}
