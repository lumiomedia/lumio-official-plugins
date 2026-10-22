// runtime/sport/espn.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- tolkar extern JSON fält för fält */
import type { DayOpts, Fixture, FixtureDetail, FixtureEvent, FixtureLineup, FixtureStat, FixtureStatus, KeyCheck, LineupEntry, ProviderCall, ProviderRequest, SportsProvider, StandingRow, TeamHit } from './provider'
import type { SportKind } from './sport-model'

/**
 * ESPN:s öppna scoreboard-API. INGEN NYCKEL OCH INGEN KVOT: källan används
 * av alla, även utan egna nycklar, och ligger sist i varje sports ordning —
 * med en nyckel svarar användarens källa först, och ESPN tar över när dess
 * kvot är slut. Webbvyn hämtar direkt (ESPN svarar `Access-Control-Allow-Origin: *`),
 * så källan kräver ingen ny app (`sport-direct.ts`).
 *
 * Inofficiellt och odokumenterat: varje fält läses defensivt, och ett svar
 * vi inte känner igen blir en tom lista, aldrig ett fel.
 *
 * ESPN delar upp per liga, så en dag är ett anrop per liga i katalogen.
 * Livepollen frågar bara ligorna som har matcher i dag (dagsanropet minns dem).
 * ESPN:s datum är amerikansk östkusttid och tar bara ett datum per anrop
 * (intervall ger 400): dagen hämtas för de östkustdatum det lokala dygnet
 * täcker (två för Europa), och bara matcher inom det lokala dygnet behålls.
 */

/** Ligorna per sport, i ESPN:s sluggar. Svensk hockey finns inte hos ESPN (SHL kräver API-Sports). */
export const ESPN_LEAGUES: Partial<Record<SportKind, readonly string[]>> = {
  football: [
    'uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'uefa.nations',
    'eng.1', 'eng.2', 'eng.fa', 'eng.league_cup', 'esp.1', 'esp.copa_del_rey', 'ita.1', 'ita.coppa_italia',
    'ger.1', 'ger.dfb_pokal', 'fra.1', 'ned.1', 'por.1', 'sco.1', 'swe.1', 'swe.2', 'nor.1', 'den.1', 'usa.1',
    'fifa.world', 'fifa.worldq.uefa', 'fifa.friendly',
  ],
  hockey: ['nhl'],
  basketball: ['nba', 'wnba'],
}

const SPORT_PATH: Partial<Record<SportKind, string>> = { football: 'soccer', hockey: 'hockey', basketball: 'basketball' }

const arr = (v: any): any[] => (Array.isArray(v) ? v : [])
const num = (v: any): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null
const str = (v: any): string | null => (typeof v === 'string' && v.trim() ? v : null)
const DAY_MS = 86_400_000

const ymd = (t: Date): string => `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, '0')}${String(t.getUTCDate()).padStart(2, '0')}`

/** Östkustdatumen (UTC−4 och UTC−5) som det lokala dygnet [slut − 24 h, slut) täcker. */
export function espnDatesFor(dayEndMs: number): string[] {
  const H = 3_600_000
  const edges = [dayEndMs - DAY_MS, dayEndMs - 1]
  return [...new Set(edges.flatMap((t) => [ymd(new Date(t - 5 * H)), ymd(new Date(t - 4 * H))]))].sort()
}

/** Fixturens id hos oss: ligans slugg och ESPN:s match-id ("eng.1:401915395"), så att matchcentret vet ligan. */
export function espnFixtureId(slug: string, eventId: string): string { return `${slug}:${eventId}` }
function splitId(id: string): { slug: string; event: string } | null {
  const i = id.lastIndexOf(':')
  return i > 0 ? { slug: id.slice(0, i), event: id.slice(i + 1) } : null
}

function statusOf(raw: any): FixtureStatus {
  const name = String(raw?.type?.name ?? '')
  const state = String(raw?.type?.state ?? '')
  if (/POSTPONED|CANCELED|CANCELLED|ABANDONED|SUSPENDED|DELAYED|FORFEIT/.test(name)) return 'postponed'
  if (/HALFTIME/.test(name)) return 'ht'
  if (state === 'in') return 'live'
  if (state === 'post') return 'finished'
  return 'scheduled'
}

/** Fotbollens matchminut ur "67'" eller "90'+3'"; andra sporter har perioder, inte minuter. */
export function espnMinute(displayClock: unknown): number | null {
  const m = /^\s*(\d{1,3})'/.exec(String(displayClock ?? ''))
  return m ? Number(m[1]) : null
}

function teamOf(t: any): Fixture['home'] {
  const team = t?.team ?? {}
  return { id: String(team.id ?? ''), name: String(team.displayName ?? team.name ?? ''), crest: str(team.logo) ?? str(arr(team.logos)[0]?.href) }
}

function fixtureOf(sport: SportKind, slug: string, league: any, e: any): Fixture | null {
  const c = arr(e?.competitions)[0] ?? e
  const sides = arr(c?.competitors)
  const home = sides.find((t) => t?.homeAway === 'home')
  const away = sides.find((t) => t?.homeAway === 'away')
  const kickoff = Date.parse(String(e?.date ?? c?.date ?? ''))
  if (e?.id == null || !home || !away || !Number.isFinite(kickoff)) return null
  const statusRaw = e?.status ?? c?.status
  const status = statusOf(statusRaw)
  const h = num(home.score)
  const a = num(away.score)
  const venue = c?.venue ?? e?.venue
  return {
    provider: 'espn', id: espnFixtureId(slug, String(e.id)), sport,
    league: { id: slug, name: String(league?.name ?? league?.abbreviation ?? slug), season: String(league?.season?.year ?? e?.season?.year ?? ''), round: null, country: null },
    kickoff, status,
    statusShort: String(statusRaw?.type?.shortDetail ?? statusRaw?.type?.detail ?? ''),
    minute: status === 'live' && sport === 'football' ? espnMinute(statusRaw?.displayClock) : null,
    home: teamOf(home), away: teamOf(away),
    score: status !== 'scheduled' && status !== 'postponed' && h != null && a != null ? { home: h, away: a } : null,
    venue: str(venue?.fullName) ?? str(venue?.displayName),
    venueCity: str(venue?.address?.city),
    lastGoal: null,
  }
}

/** Scoreboardens matcher (ligan står i svarets `leagues[0]`). */
export function espnScoreboard(sport: SportKind, slug: string, body: unknown): Fixture[] {
  const league = arr((body as any)?.leagues)[0] ?? null
  return arr((body as any)?.events).map((e) => fixtureOf(sport, slug, league, e)).filter((f): f is Fixture => f !== null)
}

/** Ligorna som hade matcher i dag, per sport (dagsanropet sätter, livepollen läser). */
const leaguesToday = new Map<string, { date: string; slugs: string[] }>()
export function __resetEspnForTests(): void { leaguesToday.clear() }

interface Board { slug: string; date: string }
const boards = (slugs: readonly string[], dayEndMs: number): Board[] => slugs.flatMap((slug) => espnDatesFor(dayEndMs).map((date) => ({ slug, date })))
const scoreboard = (sport: SportKind, b: Board, ttlS: number): ProviderRequest =>
  ({ sport, path: `site/v2/sports/${SPORT_PATH[sport]}/${b.slug}/scoreboard?dates=${b.date}&limit=300`, ttlS })

function dayList(sport: SportKind, list: Board[], bodies: unknown[], dayEndMs: number): Fixture[] {
  const start = dayEndMs - DAY_MS
  const seen = new Set<string>()
  const out: Fixture[] = []
  list.forEach((b, i) => {
    for (const f of espnScoreboard(sport, b.slug, bodies[i])) {
      if (f.kickoff < start || f.kickoff >= dayEndMs || seen.has(f.id)) continue
      seen.add(f.id)
      out.push(f)
    }
  })
  return out.sort((a, b) => a.kickoff - b.kickoff)
}

const EVENT_TYPE: Record<string, FixtureEvent['type']> = {
  goal: 'goal', 'own-goal': 'goal', 'penalty---scored': 'goal',
  'yellow-card': 'card', 'red-card': 'card', 'yellow-red-card': 'card',
  substitution: 'sub', 'var---goal-disallowed': 'var', 'penalty---missed': 'penalty', 'penalty---saved': 'penalty',
}

function eventsOf(body: any, homeId: string): FixtureEvent[] {
  return arr(body?.keyEvents)
    .filter((e) => EVENT_TYPE[String(e?.type?.type ?? '')] !== undefined)
    .map((e): FixtureEvent => {
      const m = /^\s*(\d{1,3})'(?:\s*\+\s*(\d{1,2})')?/.exec(String(e?.clock?.displayValue ?? ''))
      const people = arr(e?.participants).map((p) => str(p?.athlete?.displayName))
      const teamId = e?.team?.id != null ? String(e.team.id) : null
      return {
        minute: m ? Number(m[1]) : null,
        extra: m?.[2] != null ? Number(m[2]) : null,
        side: teamId == null ? null : teamId === homeId ? 'home' : 'away',
        type: EVENT_TYPE[String(e.type.type)],
        detail: String(e?.type?.text ?? ''),
        player: people[0] ?? null,
        assist: EVENT_TYPE[String(e.type.type)] === 'goal' ? people[1] ?? null : null,
      }
    })
}

function statsOf(body: any, homeId: string): FixtureStat[] {
  const teams = arr(body?.boxscore?.teams)
  const home = teams.find((t) => String(t?.team?.id) === homeId)
  const away = teams.find((t) => String(t?.team?.id) !== homeId)
  if (!home || !away) return []
  const awayBy = new Map(arr(away.statistics).map((s) => [String(s?.name), s]))
  return arr(home.statistics)
    .filter((s) => str(s?.label) && awayBy.has(String(s?.name)))
    .map((s) => ({ label: String(s.label), home: String(s.displayValue ?? ''), away: String(awayBy.get(String(s.name))?.displayValue ?? '') }))
}

function lineupsOf(body: any): FixtureLineup[] {
  return arr(body?.rosters).flatMap((r): FixtureLineup[] => {
    const side = r?.homeAway === 'home' || r?.homeAway === 'away' ? r.homeAway : null
    if (!side) return []
    const entry = (p: any): LineupEntry => ({ number: num(p?.jersey), name: String(p?.athlete?.displayName ?? ''), pos: str(p?.position?.abbreviation), photo: null })
    const players = arr(r?.roster)
    const startXI = players.filter((p) => p?.starter === true).map(entry)
    const subs = players.filter((p) => p?.starter !== true).map(entry)
    return startXI.length || subs.length ? [{ side, formation: str(r?.formation), startXI, subs }] : []
  })
}

function detailOf(sport: SportKind, slug: string, body: any): FixtureDetail | null {
  const header = body?.header
  const comp = arr(header?.competitions)[0]
  if (!comp) return null
  const fixture = fixtureOf(sport, slug, { ...(header?.league ?? {}), season: header?.season }, { ...comp, id: header?.id ?? comp?.id, venue: body?.gameInfo?.venue ?? comp?.venue })
  if (!fixture) return null
  const homeId = fixture.home.id
  const events = eventsOf(body, homeId)
  const goal = [...events].reverse().find((e) => e.type === 'goal')
  return {
    fixture: { ...fixture, lastGoal: goal ? { side: goal.side, player: goal.player, minute: goal.minute } : null },
    events,
    stats: statsOf(body, homeId),
    lineups: lineupsOf(body),
  }
}

const STAT = (stats: any[], name: string): any => stats.find((s) => s?.name === name)
function standingRows(body: any): StandingRow[] {
  return arr(body?.children).flatMap((group) => arr(group?.standings?.entries).map((e): StandingRow => {
    const stats = arr(e?.stats)
    const team = e?.team ?? {}
    return {
      rank: num(STAT(stats, 'rank')?.value ?? STAT(stats, 'rank')?.displayValue) ?? 0,
      team: { id: String(team.id ?? ''), name: String(team.displayName ?? ''), crest: str(arr(team.logos)[0]?.href) },
      played: num(STAT(stats, 'gamesPlayed')?.value ?? STAT(stats, 'gamesPlayed')?.displayValue) ?? 0,
      points: num(STAT(stats, 'points')?.value ?? STAT(stats, 'points')?.displayValue) ?? 0,
      goalDiff: num(STAT(stats, 'pointDifferential')?.value ?? STAT(stats, 'pointDifferential')?.displayValue),
      form: null,
      group: arr(body?.children).length > 1 ? str(group?.name) : null,
    }
  }))
}

const covered = (sport: SportKind): readonly string[] => ESPN_LEAGUES[sport] ?? []

export const espn: SportsProvider = {
  id: 'espn',
  keyless: true,
  liveFloorMs: 30_000,
  coverage: (sport) => (covered(sport).length > 0 ? 'full' : 'epg'),
  bucket: (sport) => sport,
  day(sport, date, opts: DayOpts): ProviderCall<Fixture[]> {
    const slugs = covered(sport)
    const list = boards(slugs, opts.dayEndMs)
    const past = date < opts.today
    const ttlS = date === opts.today ? 900 : past ? 21_600 : 3_600
    return {
      requests: list.map((b) => ({ ...scoreboard(sport, b, ttlS), ...(past ? { finalAfter: opts.dayEndMs + 3 * 3_600_000 } : {}) })),
      parse: (bodies) => {
        const day = dayList(sport, list, bodies, opts.dayEndMs)
        if (date === opts.today) leaguesToday.set(sport, { date, slugs: slugs.filter((s) => day.some((f) => f.league.id === s)) })
        return day
      },
    }
  },
  live(sport, opts): ProviderCall<Fixture[]> {
    const known = leaguesToday.get(sport)
    const slugs = known && known.date === opts.today ? known.slugs : covered(sport)
    // Dagens fönster i lokal tid: livepollen har bara datumet, så dygnet räknas ur det.
    const [y, m, d] = opts.today.split('-').map(Number)
    const dayEndMs = new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 1).getTime()
    const list = boards(slugs, dayEndMs)
    return {
      requests: list.map((b) => scoreboard(sport, b, 30)),
      parse: (bodies) => dayList(sport, list, bodies, dayEndMs),
    }
  },
  fixture(sport, id, opts): ProviderCall<FixtureDetail | null> {
    const ref = splitId(id)
    if (!ref || !SPORT_PATH[sport]) return { requests: [], parse: () => null }
    return {
      requests: [{ sport, path: `site/v2/sports/${SPORT_PATH[sport]}/${ref.slug}/summary?event=${encodeURIComponent(ref.event)}`, ttlS: opts.finished ? -1 : 60 }],
      parse: (bodies) => detailOf(sport, ref.slug, bodies[0]),
    }
  },
  standings(sport, leagueId): ProviderCall<StandingRow[]> {
    if (!SPORT_PATH[sport] || !covered(sport).includes(leagueId)) return { requests: [], parse: () => [] }
    return { requests: [{ sport, path: `v2/sports/${SPORT_PATH[sport]}/${leagueId}/standings`, ttlS: 21_600 }], parse: (bodies) => standingRows(bodies[0]) }
  },
  // Lag och ligor söks hos nyckelkällorna; ESPN har ingen sökväg som täcker allt i ett anrop.
  searchTeams(): ProviderCall<TeamHit[]> { return { requests: [], parse: () => [] } },
  validateKey: (): ProviderCall<KeyCheck> => ({ requests: [], parse: () => ({ ok: true, plan: null, used: null, limit: null }) }),
  quotaProbe: () => null,
  crestUrl: (t) => t.crest,
  teamArt: () => null,
}
