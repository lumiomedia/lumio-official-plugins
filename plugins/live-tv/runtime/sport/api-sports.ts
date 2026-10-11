// runtime/sport/api-sports.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- tolkar extern JSON fält för fält */
import type { SportKind } from './sport-model'
import type {
  DayOpts, Fixture, FixtureDetail, FixtureEvent, FixtureLineup, FixtureStat, FixtureTeam, KeyCheck,
  FixtureStatus, LineupEntry, LiveOpts, ProviderCall, SportsProvider, StandingRow, TeamHit,
} from './provider'

/**
 * API-Sports (api-sports.io). Ett API per sport med samma nyckel och en egen
 * dygnskvot per sport-API. Fotboll är v3 och har fixturer med händelser,
 * uppställningar och statistik i ETT anrop. Hockey, basket och handboll är v1
 * och har "games". Hockey har dessutom games/events.
 */
export const API_SPORTS_REGISTER_URL = 'https://dashboard.api-football.com/register'

const COVERED = new Set<SportKind>(['football', 'hockey', 'basketball', 'handball'])

const FOOTBALL_STATUS: Record<string, FixtureStatus> = {
  TBD: 'scheduled', NS: 'scheduled', '1H': 'live', HT: 'ht', '2H': 'live', ET: 'live', BT: 'ht', P: 'live',
  SUSP: 'live', INT: 'live', LIVE: 'live', FT: 'finished', AET: 'finished', PEN: 'finished',
  PST: 'postponed', CANC: 'postponed', ABD: 'postponed', AWD: 'finished', WO: 'finished',
}
const GAMES_STATUS: Record<string, FixtureStatus> = {
  NS: 'scheduled', P1: 'live', P2: 'live', P3: 'live', OT: 'live', PT: 'live', BT: 'ht',
  Q1: 'live', Q2: 'live', Q3: 'live', Q4: 'live', HT: 'ht', '1H': 'live', '2H': 'live', ET: 'live', INTR: 'live',
  FT: 'finished', AOT: 'finished', AP: 'finished', AW: 'finished', AET: 'finished', AWO: 'finished',
  POST: 'postponed', CANC: 'postponed', ABD: 'postponed',
}
const PERIOD_OFFSET: Record<string, number> = { P1: 0, P2: 20, P3: 40, OT: 60 }

const arr = (v: any): any[] => (Array.isArray(v) ? v : [])
const resp = (body: unknown): any[] => arr((body as any)?.response)
const num = (v: any): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null
const str = (v: any): string | null => (typeof v === 'string' && v.trim() ? v : null)
const enc = encodeURIComponent

export function roundNumber(r: unknown): number | null {
  const m = /(\d+)\s*$/.exec(String(r ?? ''))
  return m ? Number(m[1]) : null
}

function team(raw: any): FixtureTeam {
  return { id: String(raw?.id ?? ''), name: String(raw?.name ?? ''), crest: str(raw?.logo) }
}

function sideOf(homeId: unknown, awayId: unknown, teamId: unknown): 'home' | 'away' | null {
  if (teamId == null) return null
  if (String(teamId) === String(homeId)) return 'home'
  if (String(teamId) === String(awayId)) return 'away'
  return null
}

function footballLastGoal(raw: any): Fixture['lastGoal'] {
  const goals = arr(raw?.events).filter((e) => e?.type === 'Goal' && e?.detail !== 'Missed Penalty')
  const g = goals[goals.length - 1]
  if (!g) return null
  return { side: sideOf(raw?.teams?.home?.id, raw?.teams?.away?.id, g?.team?.id), player: str(g?.player?.name), minute: num(g?.time?.elapsed) }
}

function footballFixture(raw: any): Fixture | null {
  if (raw?.fixture?.id == null) return null
  const short = String(raw.fixture.status?.short ?? 'NS')
  const gh = num(raw.goals?.home)
  const ga = num(raw.goals?.away)
  return {
    provider: 'api-sports', id: String(raw.fixture.id), sport: 'football',
    league: { id: String(raw.league?.id ?? ''), name: String(raw.league?.name ?? ''), season: String(raw.league?.season ?? ''), round: roundNumber(raw.league?.round), country: str(raw.league?.country) },
    kickoff: (num(raw.fixture.timestamp) ?? 0) * 1000,
    status: FOOTBALL_STATUS[short] ?? 'scheduled', statusShort: short, minute: num(raw.fixture.status?.elapsed),
    home: team(raw.teams?.home), away: team(raw.teams?.away),
    score: gh != null && ga != null ? { home: gh, away: ga } : null,
    venue: str(raw.fixture.venue?.name),
    lastGoal: footballLastGoal(raw),
  }
}

function gameFixture(sport: SportKind, raw: any): Fixture | null {
  if (raw?.id == null) return null
  const short = String(raw.status?.short ?? 'NS')
  // Basket har {total}, hockey och handboll har en siffra.
  const total = (v: any) => (v && typeof v === 'object' ? num(v.total) : num(v))
  const h = total(raw.scores?.home)
  const a = total(raw.scores?.away)
  return {
    provider: 'api-sports', id: String(raw.id), sport,
    league: { id: String(raw.league?.id ?? ''), name: String(raw.league?.name ?? ''), season: String(raw.league?.season ?? ''), round: roundNumber(raw.week), country: str(raw.country?.name) },
    kickoff: (num(raw.timestamp) ?? 0) * 1000,
    status: GAMES_STATUS[short] ?? 'scheduled', statusShort: short, minute: num(raw.timer),
    home: team(raw.teams?.home), away: team(raw.teams?.away),
    score: h != null && a != null ? { home: h, away: a } : null,
    venue: str(raw.venue?.name),
    lastGoal: null,
  }
}

const parseFixture = (sport: SportKind, raw: any) => (sport === 'football' ? footballFixture(raw) : gameFixture(sport, raw))
const fixtures = (sport: SportKind) => (bodies: unknown[]): Fixture[] =>
  resp(bodies[0]).map((r) => parseFixture(sport, r)).filter((f): f is Fixture => f !== null)

function footballEvent(raw: any, e: any): FixtureEvent {
  const type = e?.type === 'Goal' ? (e?.detail === 'Missed Penalty' ? 'other' : 'goal')
    : e?.type === 'Card' ? 'card' : e?.type === 'subst' ? 'sub' : e?.type === 'Var' ? 'var' : 'other'
  return { minute: num(e?.time?.elapsed), extra: num(e?.time?.extra), side: sideOf(raw?.teams?.home?.id, raw?.teams?.away?.id, e?.team?.id), type, detail: String(e?.detail ?? ''), player: str(e?.player?.name), assist: str(e?.assist?.name) }
}

function footballStats(raw: any): FixtureStat[] {
  const [h, a] = arr(raw?.statistics)
  if (!h || !a) return []
  const away = new Map(arr(a.statistics).map((s: any) => [s?.type, s?.value]))
  const fmt = (v: any) => (v == null ? '0' : String(v))
  return arr(h.statistics).map((s: any) => ({ label: String(s?.type ?? ''), home: fmt(s?.value), away: fmt(away.get(s?.type)) }))
}

const lineupEntry = (x: any): LineupEntry => ({ number: num(x?.player?.number), name: String(x?.player?.name ?? ''), pos: str(x?.player?.pos) })

function footballLineups(raw: any): FixtureLineup[] {
  return arr(raw?.lineups).map((l: any) => ({
    side: sideOf(raw?.teams?.home?.id, raw?.teams?.away?.id, l?.team?.id) ?? 'home',
    formation: str(l?.formation), startXI: arr(l?.startXI).map(lineupEntry), subs: arr(l?.substitutes).map(lineupEntry),
  }))
}

function hockeyEvent(game: any, e: any): FixtureEvent {
  const m = num(e?.minute)
  const base = PERIOD_OFFSET[String(e?.period)] ?? 0
  const type = e?.type === 'goal' ? 'goal' : e?.type === 'penalty' ? 'penalty' : 'other'
  return { minute: m == null ? null : base + m, extra: null, side: sideOf(game?.teams?.home?.id, game?.teams?.away?.id, e?.team?.id), type, detail: String(e?.comment ?? ''), player: str(arr(e?.players)[0]), assist: str(arr(e?.assists)[0]) }
}

function footballStandingRow(row: any): StandingRow {
  return { rank: num(row?.rank) ?? 0, team: team(row?.team), played: num(row?.all?.played) ?? 0, points: num(row?.points) ?? 0, goalDiff: num(row?.goalsDiff), form: str(row?.form), group: str(row?.group) }
}

function gameStandingRow(row: any): StandingRow {
  const f = num(row?.goals?.for)
  const a = num(row?.goals?.against)
  return { rank: num(row?.position) ?? 0, team: team(row?.team), played: num(row?.games?.played) ?? 0, points: num(row?.points) ?? 0, goalDiff: f != null && a != null ? f - a : null, form: str(row?.form), group: str(row?.group?.name) }
}

function keyCheck(body: unknown): KeyCheck {
  const r = (body as any)?.response
  const used = num(r?.requests?.current)
  const limit = num(r?.requests?.limit_day)
  if (used == null || limit == null) return { ok: false, plan: null, used: null, limit: null }
  return { ok: true, plan: str(r?.subscription?.plan), used, limit }
}

export const apiSports: SportsProvider = {
  id: 'api-sports',
  liveFloorMs: 15_000,
  coverage: (sport) => (COVERED.has(sport) ? 'full' : 'epg'),
  bucket: (sport) => sport,
  day(sport, date, opts: DayOpts): ProviderCall<Fixture[]> {
    const route = sport === 'football' ? '/fixtures' : '/games'
    const past = date < opts.today
    return {
      requests: [{ sport, path: `${route}?date=${date}&timezone=${enc(opts.tz)}`, ttlS: date === opts.today ? 900 : 21_600, ...(past ? { finalAfter: opts.dayEndMs + 3 * 3_600_000 } : {}) }],
      parse: fixtures(sport),
    }
  },
  live(sport, opts: LiveOpts): ProviderCall<Fixture[]> {
    // Hockey, basket och handboll: dagens matcher (verifiera med nyckel om `live=all` finns där också).
    const path = sport === 'football' ? `/fixtures?live=all&timezone=${enc(opts.tz)}` : `/games?date=${opts.today}&timezone=${enc(opts.tz)}`
    return { requests: [{ sport, path, ttlS: 10 }], parse: fixtures(sport) }
  },
  fixture(sport, id, opts): ProviderCall<FixtureDetail | null> {
    const ttlS = opts.finished ? -1 : 60
    if (sport === 'football') {
      return {
        requests: [{ sport, path: `/fixtures?id=${enc(id)}`, ttlS }],
        parse: (bodies) => {
          const raw = resp(bodies[0])[0]
          const fixture = raw ? footballFixture(raw) : null
          if (!fixture) return null
          return { fixture, events: arr(raw.events).map((e) => footballEvent(raw, e)), stats: footballStats(raw), lineups: footballLineups(raw) }
        },
      }
    }
    const requests = [{ sport, path: `/games?id=${enc(id)}`, ttlS }]
    if (sport === 'hockey') requests.push({ sport, path: `/games/events?game=${enc(id)}`, ttlS })
    return {
      requests,
      parse: (bodies) => {
        const raw = resp(bodies[0])[0]
        const fixture = raw ? gameFixture(sport, raw) : null
        if (!fixture) return null
        const events = sport === 'hockey' ? resp(bodies[1]).map((e) => hockeyEvent(raw, e)) : []
        return { fixture, events, stats: [], lineups: [] }
      },
    }
  },
  standings(sport, leagueId, season): ProviderCall<StandingRow[]> {
    return {
      requests: [{ sport, path: `/standings?league=${enc(leagueId)}&season=${enc(season)}`, ttlS: 86_400 }],
      parse: (bodies) => sport === 'football'
        ? resp(bodies[0]).flatMap((r) => arr(r?.league?.standings)).flat().map(footballStandingRow)
        : resp(bodies[0]).flat().map(gameStandingRow),
    }
  },
  searchTeams(sport, q): ProviderCall<TeamHit[]> {
    const query = q.trim()
    if (query.length < 3) return { requests: [], parse: () => [] }
    return {
      requests: [{ sport, path: `/teams?search=${enc(query)}`, ttlS: 604_800 }],
      parse: (bodies) => resp(bodies[0]).map((x) => {
        const t = sport === 'football' ? x?.team : x
        return { id: String(t?.id ?? ''), name: String(t?.name ?? ''), crest: str(t?.logo), country: str(typeof t?.country === 'string' ? t.country : t?.country?.name) }
      }),
    }
  },
  validateKey: () => ({ requests: [{ sport: 'football', path: '/status', ttlS: 0 }], parse: (bodies) => keyCheck(bodies[0]) }),
  quotaProbe: (sport) => (COVERED.has(sport) ? { requests: [{ sport, path: '/status', ttlS: 0 }], parse: (bodies) => keyCheck(bodies[0]) } : null),
  crestUrl: (t) => t.crest,
}
