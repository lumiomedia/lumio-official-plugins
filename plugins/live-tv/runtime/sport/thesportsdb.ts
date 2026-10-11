// runtime/sport/thesportsdb.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- tolkar extern JSON fält för fält */
import type { SportKind } from './sport-model'
import type { DayOpts, Fixture, FixtureDetail, FixtureEvent, FixtureLineup, FixtureStatus, KeyCheck, LineupEntry, ProviderCall, SportsProvider, StandingRow, TeamArt, TeamHit } from './provider'

/**
 * TheSportsDB premium (9 USD/mån, alla sporter, 100 anrop/min, ingen
 * dygnskvot). v1 har nyckeln i sökvägen (appen sätter in den), v2 i headern
 * X-API-KEY. Livescore uppdateras ~var 2:a min, därav 120 s golv. Om SHL
 * uppdateras UNDER match i livescore är overifierat (spec, beslut 5).
 */
export const THESPORTSDB_PRICING_URL = 'https://www.thesportsdb.com/pricing'

const SPORTS: Partial<Record<SportKind, { day: string; live: string }>> = {
  football: { day: 'Soccer', live: 'soccer' },
  hockey: { day: 'Ice Hockey', live: 'icehockey' }, // live-namnet: verifiera med nyckel
  basketball: { day: 'Basketball', live: 'basketball' },
  handball: { day: 'Handball', live: 'handball' },
}

const arr = (v: any): any[] => (Array.isArray(v) ? v : [])
const num = (v: any): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null
const str = (v: any): string | null => (typeof v === 'string' && v.trim() ? v : null)
const enc = encodeURIComponent

function utc(ts: unknown, date: unknown, time: unknown): number {
  const raw = str(ts)
  if (raw) return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`)
  const d = str(date)
  const t = str(time) ?? '00:00:00'
  return d ? Date.parse(`${d}T${t.length === 5 ? `${t}:00` : t}Z`) : 0
}

export function tsdbStatus(status: unknown, postponed: unknown): FixtureStatus {
  const v = String(status ?? '').trim().toLowerCase()
  if (String(postponed ?? '').toLowerCase() === 'yes' || v.includes('postponed') || v.includes('cancel') || v === 'abd') return 'postponed'
  if (['ft', 'aet', 'pen', 'aot', 'ap', 'match finished', 'finished', 'after over time', 'after penalties'].includes(v)) return 'finished'
  if (['ht', 'half time', 'break', 'bt'].includes(v)) return 'ht'
  if (['', 'ns', 'not started', 'tbd', 'time to be defined'].includes(v)) return 'scheduled'
  return 'live'
}

function event(sport: SportKind, e: any): Fixture | null {
  if (!e?.idEvent) return null
  const h = num(e.intHomeScore)
  const a = num(e.intAwayScore)
  const status = tsdbStatus(e.strStatus, e.strPostponed)
  return {
    provider: 'thesportsdb', id: String(e.idEvent), sport,
    league: { id: String(e.idLeague ?? ''), name: String(e.strLeague ?? ''), season: String(e.strSeason ?? ''), round: num(e.intRound), country: str(e.strCountry) },
    kickoff: utc(e.strTimestamp, e.dateEvent, e.strTime ?? e.strEventTime),
    status, statusShort: String(e.strStatus ?? ''), minute: status === 'live' ? num(e.strProgress) : null,
    home: { id: String(e.idHomeTeam ?? ''), name: String(e.strHomeTeam ?? ''), crest: str(e.strHomeTeamBadge) },
    away: { id: String(e.idAwayTeam ?? ''), name: String(e.strAwayTeam ?? ''), crest: str(e.strAwayTeamBadge) },
    score: h != null && a != null ? { home: h, away: a } : null,
    venue: str(e.strVenue),
    lastGoal: null,
  }
}

const side = (x: any): 'home' | 'away' | null => (x?.strHome === 'Yes' ? 'home' : x?.strHome === 'No' ? 'away' : null)

function timelineEvent(x: any): FixtureEvent {
  const kind = String(x?.strTimeline ?? '').toLowerCase()
  const type = kind === 'goal' ? 'goal' : kind === 'card' ? 'card' : kind === 'subst' ? 'sub' : kind === 'var' ? 'var' : 'other'
  return { minute: num(x?.intTime), extra: null, side: side(x), type, detail: String(x?.strTimelineDetail ?? ''), player: str(x?.strPlayer), assist: str(x?.strAssist) }
}

function lineups(rows: any[]): FixtureLineup[] {
  const out: FixtureLineup[] = []
  for (const s of ['home', 'away'] as const) {
    const mine = rows.filter((r) => side(r) === s)
    if (mine.length === 0) continue
    const entry = (r: any): LineupEntry => ({ number: num(r?.intSquadNumber), name: String(r?.strPlayer ?? ''), pos: str(r?.strPosition) })
    out.push({ side: s, formation: str(mine[0]?.strFormation), startXI: mine.filter((r) => r?.strSubstitute !== 'Yes').map(entry), subs: mine.filter((r) => r?.strSubstitute === 'Yes').map(entry) })
  }
  return out
}

export const theSportsDb: SportsProvider = {
  id: 'thesportsdb',
  liveFloorMs: 120_000,
  coverage: (sport) => (SPORTS[sport] ? 'full' : 'epg'),
  bucket: () => 'all',
  day(sport, date, opts: DayOpts): ProviderCall<Fixture[]> {
    const s = SPORTS[sport]?.day ?? ''
    const past = date < opts.today
    return {
      requests: [{ sport, path: `/v1/eventsday.php?d=${date}&s=${enc(s)}`, ttlS: date === opts.today ? 900 : 21_600, ...(past ? { finalAfter: opts.dayEndMs + 3 * 3_600_000 } : {}) }],
      parse: (bodies) => arr((bodies[0] as any)?.events).map((e) => event(sport, e)).filter((f): f is Fixture => f !== null),
    }
  },
  live(sport): ProviderCall<Fixture[]> {
    return {
      requests: [{ sport, path: `/v2/livescore/${SPORTS[sport]?.live ?? ''}`, ttlS: 10 }],
      parse: (bodies) => arr((bodies[0] as any)?.livescore).map((e) => event(sport, e)).filter((f): f is Fixture => f !== null),
    }
  },
  fixture(sport, id, opts): ProviderCall<FixtureDetail | null> {
    const ttlS = opts.finished ? -1 : 60
    const parts = ['event', 'event_timeline', 'event_stats', 'event_lineup']
    return {
      requests: parts.map((p) => ({ sport, path: `/v2/lookup/${p}/${enc(id)}`, ttlS })),
      parse: (bodies) => {
        const raw = arr((bodies[0] as any)?.lookup)[0]
        const fixture = raw ? event(sport, raw) : null
        if (!fixture) return null
        return {
          fixture,
          events: arr((bodies[1] as any)?.lookup).map(timelineEvent),
          stats: arr((bodies[2] as any)?.lookup).map((s) => ({ label: String(s?.strStat ?? ''), home: String(s?.intHome ?? '0'), away: String(s?.intAway ?? '0') })),
          lineups: lineups(arr((bodies[3] as any)?.lookup)),
        }
      },
    }
  },
  standings(sport, leagueId, season): ProviderCall<StandingRow[]> {
    return {
      requests: [{ sport, path: `/v1/lookuptable.php?l=${enc(leagueId)}&s=${enc(season)}`, ttlS: 86_400 }],
      parse: (bodies) => arr((bodies[0] as any)?.table).map((r) => ({
        rank: num(r?.intRank) ?? 0,
        team: { id: String(r?.idTeam ?? ''), name: String(r?.strTeam ?? ''), crest: str(r?.strBadge) },
        played: num(r?.intPlayed) ?? 0, points: num(r?.intPoints) ?? 0, goalDiff: num(r?.intGoalDifference), form: str(r?.strForm), group: str(r?.strGroup),
      })),
    }
  },
  searchTeams(sport, q): ProviderCall<TeamHit[]> {
    const query = q.trim()
    if (query.length < 3) return { requests: [], parse: () => [] }
    const want = SPORTS[sport]?.day
    return {
      requests: [{ sport, path: `/v1/searchteams.php?t=${enc(query)}`, ttlS: 604_800 }],
      parse: (bodies) => arr((bodies[0] as any)?.teams)
        .filter((t) => !want || t?.strSport === want)
        .map((t) => ({ id: String(t?.idTeam ?? ''), name: String(t?.strTeam ?? ''), crest: str(t?.strBadge), country: str(t?.strCountry) })),
    }
  },
  validateKey: (): ProviderCall<KeyCheck> => ({
    requests: [{ sport: 'football', path: '/v2/all/sports', ttlS: 0 }],
    parse: (bodies) => (Array.isArray((bodies[0] as any)?.all) ? { ok: true, plan: 'Premium', used: null, limit: null } : { ok: false, plan: null, used: null, limit: null }),
  }),
  quotaProbe: () => null,
  crestUrl: (t) => t.crest,
  teamArt(sport, teamId): ProviderCall<TeamArt | null> {
    return {
      requests: [{ sport, path: `/v1/lookupteam.php?id=${enc(teamId)}`, ttlS: 2_592_000 }],
      parse: (bodies) => {
        const t = arr((bodies[0] as any)?.teams)[0]
        if (!t) return null
        return { stadium: str(t.strStadiumThumb), fanart: str(t.strFanart1) ?? str(t.strFanart2) }
      },
    }
  },
}
