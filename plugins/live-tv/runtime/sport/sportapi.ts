// runtime/sport/sportapi.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- tolkar extern JSON fält för fält */
import type { DayOpts, Fixture, FixtureDetail, FixtureEvent, FixtureLineup, FixtureStat, FixtureStatus, KeyCheck, LineupEntry, ProviderCall, SportsProvider, StandingRow, TeamHit } from './provider'

/**
 * sportapi.ai. BARA FOTBOLL. Gratisplanen: 2 000 anrop/dygn, nollställs
 * 00:00 UTC, och varje anrop räknas (även fel). Nyckeln i headern X-Api-Key
 * (appen sätter den), kvoten i X-RateLimit-Limit/-Remaining, 429 = dygnet slut.
 *
 * Ingen liveväg finns (bara WebSocket): live = dagens datum med kort TTL, och
 * källan uppdaterar ställningen varje minut — därav golvet. Ingen lagsökning
 * finns heller; ligor söks lokalt i ligalistan (ett anrop i veckan).
 *
 * SVARSFORMERNA KOMMER UR DOKUMENTATIONEN och är overifierade med riktig nyckel
 * (se __fixtures__/sportapi). Särskilt: händelsetyper utöver "goal", och att
 * `home_logo` ("espn-359.png") är ESPN:s lag-id på deras CDN.
 */
export const SPORTAPI_REGISTER_URL = 'https://sportapi.ai/pricing'
const ESPN_CREST = 'https://a.espncdn.com/i/teamlogos/soccer/500'

const arr = (v: any): any[] => (Array.isArray(v) ? v : [])
const num = (v: any): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null
const str = (v: any): string | null => (typeof v === 'string' && v.trim() ? v : null)
const enc = encodeURIComponent
/** Samma vikning som merge.ts `foldTeamKey` (inlinad: adaptern ska inte dra in sammanslagningen). */
const foldTeamKey = (name: string): string => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

const STATUS: Record<string, FixtureStatus> = {
  scheduled: 'scheduled', ns: 'scheduled', tbd: 'scheduled',
  live: 'live', '1h': 'live', '2h': 'live', et: 'live', p: 'live', suspended: 'live',
  ht: 'ht', break: 'ht',
  ft: 'finished', aet: 'finished', pens: 'finished', pen: 'finished',
  postponed: 'postponed', cancelled: 'postponed', canceled: 'postponed', abandoned: 'postponed',
}

/** "67'" → 67, "90+3'" → 90 + 3. */
export function sportApiMinute(v: unknown): { minute: number | null; extra: number | null } {
  if (typeof v === 'number' && Number.isFinite(v)) return { minute: v, extra: null }
  const m = /^\s*(\d+)(?:\s*\+\s*(\d+))?/.exec(String(v ?? ''))
  return m ? { minute: Number(m[1]), extra: m[2] != null ? Number(m[2]) : null } : { minute: null, extra: null }
}

/** `espn-359.png` = ESPN:s lag 359 (overifierat). En hel https-länk används som den är. */
export function sportApiCrest(logo: unknown): string | null {
  const s = str(logo)
  if (!s) return null
  if (/^https:\/\//.test(s)) return s
  const m = /^espn-(\d{1,9})\.(png|svg)$/.exec(s)
  return m ? `${ESPN_CREST}/${m[1]}.png` : null
}

function kickoffOf(raw: any): number {
  const utc = str(raw?.kickoff_utc)
  if (utc) {
    const t = Date.parse(utc)
    if (Number.isFinite(t)) return t
  }
  // Reserv: `datetime` är centraleuropeisk tid. Utan zondata räcker CET (+1).
  const local = str(raw?.datetime)
  const t = local ? Date.parse(`${local.replace(' ', 'T')}+01:00`) : NaN
  return Number.isFinite(t) ? t : 0
}

function fixtureOf(raw: any): Fixture | null {
  if (raw?.id == null) return null
  const short = String(raw.status ?? 'Scheduled')
  const parsed = STATUS[short.trim().toLowerCase()] ?? 'scheduled'
  // Dokumentationen: i halvtid står status kvar på LIVE och `minute` är "HT".
  const status: FixtureStatus = parsed === 'live' && /^\s*ht\s*$/i.test(String(raw.minute ?? '')) ? 'ht' : parsed
  const h = num(raw.home_score)
  const a = num(raw.away_score)
  return {
    provider: 'sportapi', id: String(raw.id), sport: 'football',
    // Ingen säsong i svaret, och tabellen tar bara ligans id: "current" håller dygnsplanens tabellregel igång.
    league: { id: String(raw.league_id ?? ''), name: String(raw.league_name ?? ''), season: 'current', round: null, country: str(raw.league_zone) },
    kickoff: kickoffOf(raw),
    status, statusShort: short, minute: status === 'live' ? sportApiMinute(raw.minute).minute : null,
    home: { id: String(raw.home_id ?? ''), name: String(raw.home_team ?? ''), crest: sportApiCrest(raw.home_logo) },
    away: { id: String(raw.away_id ?? ''), name: String(raw.away_team ?? ''), crest: sportApiCrest(raw.away_logo) },
    score: status !== 'scheduled' && h != null && a != null ? { home: h, away: a } : null,
    venue: str(raw.home_stadium),
    venueCity: str(raw.home_city),
    lastGoal: null,
  }
}

const side = (v: unknown): 'home' | 'away' | null => (v === 'home' || v === 'away' ? v : null)

function eventOf(e: any): FixtureEvent {
  const kind = String(e?.event_type ?? '').toLowerCase()
  const info = String(e?.extra_info ?? '')
  const missed = /miss/i.test(kind) || /miss/i.test(info)
  const type: FixtureEvent['type'] = kind.includes('goal') && !missed ? 'goal'
    : kind.includes('card') || kind === 'yellow' || kind === 'red' ? 'card'
      : kind.includes('sub') ? 'sub'
        : kind.includes('var') ? 'var' : 'other'
  const { minute, extra } = sportApiMinute(e?.minute)
  return { minute, extra, side: side(e?.team_side), type, detail: info, player: str(e?.player_name), assist: null }
}

const STAT_LABELS: Array<[string, string, boolean?]> = [
  ['shots', 'Total Shots'], ['shots_on_target', 'Shots on Goal'], ['shots_off_target', 'Shots off Goal'],
  ['fouls', 'Fouls'], ['total_passes', 'Total passes'], ['pass_accuracy', 'Passes %', true],
  ['tackles', 'Tackles'], ['tackle_success', 'Tackles %', true], ['saves', 'Goalkeeper Saves'], ['yellow_cards', 'Yellow Cards'],
]

function statsOf(body: any): FixtureStat[] {
  const d = body?.data
  if (!d || body?.available === false || typeof d.home !== 'object' || typeof d.away !== 'object' || !d.home || !d.away) return []
  const fmt = (v: any, pct?: boolean) => (num(v) == null ? '0' : `${num(v)}${pct ? '%' : ''}`)
  return STAT_LABELS.filter(([k]) => k in d.home || k in d.away).map(([k, label, pct]) => ({ label, home: fmt(d.home[k], pct), away: fmt(d.away[k], pct) }))
}

function lineupsOf(body: any): FixtureLineup[] {
  const d = body?.data
  if (!d || body?.available === false) return []
  const entry = (p: any): LineupEntry => {
    const pos = str(p?.position)
    return { number: num(p?.shirt), name: String(p?.name ?? ''), pos: pos && pos.toLowerCase() !== 'substitute' ? pos : null, photo: null }
  }
  const out: FixtureLineup[] = []
  for (const s of ['home', 'away'] as const) {
    const t = d[s]
    const startXI = arr(t?.starters).map(entry)
    const subs = arr(t?.subs).map(entry)
    if (startXI.length || subs.length) out.push({ side: s, formation: null, startXI, subs })
  }
  return out
}

function standingRow(r: any): StandingRow {
  const form = arr(r?.form).map((x) => str(x?.result)).filter((x): x is string => !!x).join('')
  return {
    rank: num(r?.position) ?? 0,
    team: { id: String(r?.team?.id ?? ''), name: String(r?.team?.name ?? ''), crest: sportApiCrest(r?.team?.logo) },
    played: num(r?.played) ?? 0, points: num(r?.points) ?? 0, goalDiff: num(r?.goal_difference), form: form || null, group: str(r?.group),
  }
}

const listOf = (body: unknown): Fixture[] => arr((body as any)?.data).map(fixtureOf).filter((f): f is Fixture => f !== null)
const okBody = (body: unknown): boolean => (body as any)?.success === true

export const sportApi: SportsProvider = {
  id: 'sportapi',
  liveFloorMs: 60_000,
  coverage: (sport) => (sport === 'football' ? 'full' : 'epg'),
  bucket: () => 'football',
  day(sport, date, opts: DayOpts): ProviderCall<Fixture[]> {
    const past = date < opts.today
    return {
      requests: [{ sport, path: `/fixtures/date/${date}`, ttlS: date === opts.today ? 900 : 21_600, ...(past ? { finalAfter: opts.dayEndMs + 3 * 3_600_000 } : {}) }],
      parse: (bodies) => listOf(bodies[0]),
    }
  },
  live(sport, opts): ProviderCall<Fixture[]> {
    return { requests: [{ sport, path: `/fixtures/date/${opts.today}`, ttlS: 30 }], parse: (bodies) => listOf(bodies[0]) }
  },
  fixture(sport, id, opts): ProviderCall<FixtureDetail | null> {
    const ttl = opts.finished ? -1 : 60
    const base = `/fixtures/${enc(id)}`
    return {
      // Uppställningen ändras sällan under match: tio minuter räcker.
      requests: [{ sport, path: base, ttlS: ttl }, { sport, path: `${base}/stats`, ttlS: ttl }, { sport, path: `${base}/lineups`, ttlS: opts.finished ? -1 : 600 }],
      parse: (bodies) => {
        const body = bodies[0] as any
        if (!okBody(body)) return null
        const fixture = fixtureOf(body?.fixture)
        if (!fixture) return null
        const events = arr(body?.events ?? body?.fixture?.events).map(eventOf)
        const goal = [...events].reverse().find((e) => e.type === 'goal')
        return {
          fixture: { ...fixture, lastGoal: goal ? { side: goal.side, player: goal.player, minute: goal.minute } : null },
          events,
          stats: statsOf(bodies[1]),
          lineups: lineupsOf(bodies[2]),
        }
      },
    }
  },
  standings(sport, leagueId): ProviderCall<StandingRow[]> {
    return {
      requests: [{ sport, path: `/standings/${enc(leagueId)}`, ttlS: 86_400 }],
      parse: (bodies) => arr((bodies[0] as any)?.data).flatMap((r) => (Array.isArray(r?.rows) ? r.rows : [r])).map(standingRow),
    }
  },
  searchTeams(): ProviderCall<TeamHit[]> {
    return { requests: [], parse: () => [] }
  },
  searchLeagues(sport, q): ProviderCall<TeamHit[]> {
    const needle = foldTeamKey(q)
    if (needle.length < 3) return { requests: [], parse: () => [] }
    return {
      requests: [{ sport, path: '/leagues', ttlS: 604_800 }],
      // Riktiga svaret (användarens cache 2026-10-12) grupperar per land: data: [{ country, leagues: [...] }].
      // Dokumentationens platta lista med `zone` läses också.
      parse: (bodies) => arr((bodies[0] as any)?.data)
        .flatMap((g) => (Array.isArray(g?.leagues) ? g.leagues.map((l: any) => ({ ...l, zone: l?.zone ?? g?.country })) : [g]))
        .filter((l) => foldTeamKey(String(l?.name ?? '')).includes(needle) || foldTeamKey(String(l?.zone ?? '')).includes(needle))
        .map((l) => ({ id: String(l?.id ?? ''), name: String(l?.name ?? ''), crest: null, country: str(l?.zone) })),
    }
  },
  validateKey: (): ProviderCall<KeyCheck> => ({
    requests: [{ sport: 'football', path: '/leagues', ttlS: 0 }],
    parse: (bodies) => (okBody(bodies[0]) || Array.isArray((bodies[0] as any)?.data)
      ? { ok: true, plan: null, used: null, limit: null }
      : { ok: false, plan: null, used: null, limit: null }),
  }),
  quotaProbe: () => null,
  crestUrl: (t) => t.crest,
  teamArt: () => null,
}
