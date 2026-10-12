/**
 * Sportkällornas gemensamma gränssnitt (fas 2).
 *
 * ADAPTRARNA HAR INGET NÄT. En metod returnerar ett `ProviderCall`: de
 * förfrågningar som behövs och en tolk för svaren. Bara kvothanteraren
 * (`budget.ts`) utför förfrågningar, så "budgeten äger varje anrop" gäller
 * per konstruktion och inte som en konvention.
 */
import type { SportKind } from './sport-model'

export type ProviderId = 'api-sports' | 'thesportsdb' | 'sportapi'
export type FixtureStatus = 'scheduled' | 'live' | 'ht' | 'finished' | 'postponed'
export interface FixtureTeam { id: string; name: string; crest: string | null }
export interface Fixture {
  provider: ProviderId; id: string; sport: SportKind
  league: { id: string; name: string; season: string; round: number | null; country: string | null }
  kickoff: number; status: FixtureStatus; statusShort: string; minute: number | null
  home: FixtureTeam; away: FixtureTeam; score: { home: number; away: number } | null; venue: string | null
  venueImage?: string | null
  /** Arenans stad, när källan skickar den i samma svar (API-Sports fotboll). */
  venueCity?: string | null
  lastGoal: { side: 'home' | 'away' | null; player: string | null; minute: number | null } | null
}
export type EventType = 'goal' | 'card' | 'sub' | 'var' | 'penalty' | 'other'
export interface FixtureEvent { minute: number | null; extra: number | null; side: 'home' | 'away' | null; type: EventType; detail: string; player: string | null; assist: string | null }
export interface FixtureStat { label: string; home: string; away: string }
/** `photo`: spelarens bild på källans CDN (kostar inget anrop), när källan har den. */
export interface LineupEntry { number: number | null; name: string; pos: string | null; photo?: string | null }
export interface FixtureLineup { side: 'home' | 'away'; formation: string | null; startXI: LineupEntry[]; subs: LineupEntry[] }
export interface FixtureDetail { fixture: Fixture; events: FixtureEvent[]; stats: FixtureStat[]; lineups: FixtureLineup[] }
export interface StandingRow { rank: number; team: FixtureTeam; played: number; points: number; goalDiff: number | null; form: string | null; group: string | null }
/** `provider`: källan som svarade (sätts av sökningen; id:t är den källans). */
export interface TeamHit { id: string; name: string; crest: string | null; country: string | null; provider?: ProviderId }
/** Lagets bilder för Sports bakgrund (TheSportsDB `lookupteam`). */
export interface TeamArt { stadium: string | null; fanart: string | null }
export interface KeyCheck { ok: boolean; plan: string | null; used: number | null; limit: number | null }
export interface ProviderRequest { sport: SportKind; path: string; ttlS: number; finalAfter?: number }
export interface ProviderCall<T> { requests: ProviderRequest[]; parse(bodies: unknown[]): T }
export interface DayOpts { today: string; tz: string; dayEndMs: number }
export interface LiveOpts { today: string; tz: string }
export interface SportsProvider {
  id: ProviderId
  liveFloorMs: number
  coverage(sport: SportKind): 'full' | 'epg'
  bucket(sport: SportKind): string
  day(sport: SportKind, date: string, opts: DayOpts): ProviderCall<Fixture[]>
  live(sport: SportKind, opts: LiveOpts): ProviderCall<Fixture[]>
  /** Livesvaret tar bara med pågående matcher (API-Sports `live=all`): en match som faller ur det är slut. */
  liveListOnlyLive?(sport: SportKind): boolean
  fixture(sport: SportKind, id: string, opts: { finished: boolean }): ProviderCall<FixtureDetail | null>
  standings(sport: SportKind, leagueId: string, season: string): ProviderCall<StandingRow[]>
  searchTeams(sport: SportKind, q: string): ProviderCall<TeamHit[]>
  /** Turneringar per namn. Saknas = källan kan inte söka turneringar, och då görs inget anrop. */
  searchLeagues?(sport: SportKind, q: string): ProviderCall<TeamHit[]>
  validateKey(): ProviderCall<KeyCheck>
  quotaProbe(sport: SportKind): ProviderCall<KeyCheck> | null
  crestUrl(team: FixtureTeam): string | null
  /** Bilder för bakgrunden. `null` = källan har ingen sådan uppslagning, och då görs inget anrop. */
  teamArt(sport: SportKind, teamId: string): ProviderCall<TeamArt | null> | null
}
