import type { BrowsePageTarget } from '@/lib/plugin-sdk'
import { encodeChannelParams, LIVE_TV_SPORT_PAGE_ID } from '../../live-tv-shell'
import { showsScore } from '../score-model'
import { followState, matchInterest, rankedSources, statusAt } from '../sport-day-model'
import { sourceChannel, type SportFilter, type SportMatch } from '../sport-model'
import { teamKeysMatch, type SportFollow, type SportOverrides } from '../sport-store'

/*
  SPORTENS HEMRADER, SOM RENA FUNKTIONER.

  Raderna läser samma sammanslagna matcher som sportsidan (EPG + källans
  fixturer, se `rows-feed.ts`) och väljer bara ut och ordnar. Ingen React,
  ingen lagring, ingen klocka — allt skickas in, så att varje rad går att
  testa på en fast tidpunkt.
*/

const HOUR = 3_600_000
const WEEK_MS = 7 * 24 * HOUR

export type SportRowKind = 'live-now' | 'my-teams' | 'tonight' | 'zap' | 'league' | 'results'

/** Repriser bort och samma match (två dagar i tablån) en gång. */
function unique(matches: SportMatch[]): SportMatch[] {
  const seen = new Set<string>()
  return matches.filter((m) => {
    if (m.rerun || seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

const ofSport = (m: SportMatch, sport: SportFilter) => sport === 'all' || m.kind === sport
/** Tittbar = har en kanal, eller en vald kanal (sportens "Välj annan kanal"). */
const watchable = (m: SportMatch, overrides: SportOverrides) => rankedSources(m, overrides).length > 0
const byStart = (a: SportMatch, b: SportMatch) => a.start - b.start

/** Pågående matcher på dina kanaler, mest intressanta först (sportsidans heromått). */
export function liveNowRow(matches: SportMatch[], follows: SportFollow[], overrides: SportOverrides, now: number, sport: SportFilter): SportMatch[] {
  return unique(matches)
    .filter((m) => ofSport(m, sport) && statusAt(m, now) === 'live' && watchable(m, overrides))
    .sort((a, b) => matchInterest(b, follows) - matchInterest(a, follows) || byStart(a, b))
}

/** Följda lag och ligor: det som pågår först, sedan kommande sju dagar i tidsordning. */
export function myTeamsRow(matches: SportMatch[], follows: SportFollow[], now: number): SportMatch[] {
  if (follows.length === 0) return []
  const mine = unique(matches).filter((m) => followState(m, follows).any)
  const live = mine.filter((m) => statusAt(m, now) === 'live').sort(byStart)
  const upcoming = mine.filter((m) => statusAt(m, now) === 'upcoming' && m.start <= now + WEEK_MS).sort(byStart)
  return [...live, ...upcoming]
}

/** Kvällen tar slut kl. 03 natten till (sena matcher hör till kvällen), men högst tolv timmar fram. */
export function tonightEnd(now: number): number {
  const d = new Date(now)
  const threeAm = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 3, 0, 0, 0).getTime()
  return Math.min(threeAm, now + 12 * HOUR)
}

/** Kommande matcher på dina kanaler som startar i kväll. */
export function tonightRow(matches: SportMatch[], overrides: SportOverrides, now: number, sport: SportFilter): SportMatch[] {
  const end = tonightEnd(now)
  return unique(matches)
    .filter((m) => ofSport(m, sport) && statusAt(m, now) === 'upcoming' && m.start <= end && watchable(m, overrides))
    .sort(byStart)
}

/** Deterministisk slump (mulberry32): samma frö = samma ordning, så raden står still under ett besök. */
function random(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/** Pågående matcher på dina kanaler i slumpad ordning. Fröet byts när Hem öppnas, inte vid omritning. */
export function zapRow(matches: SportMatch[], overrides: SportOverrides, now: number, sport: SportFilter, seed: number): SportMatch[] {
  const list = unique(matches)
    .filter((m) => ofSport(m, sport) && statusAt(m, now) === 'live' && watchable(m, overrides))
    .sort((a, b) => a.id.localeCompare(b.id))
  const next = random(seed)
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1))
    ;[list[i], list[j]] = [list[j]!, list[i]!]
  }
  return list
}

/** Ligans matcher: live först, sedan kommande, sedan senaste resultaten. */
export function leagueRow(matches: SportMatch[], leagueKey: string | null, now: number): SportMatch[] {
  if (!leagueKey) return []
  const league = unique(matches).filter((m) => m.leagueKey === leagueKey)
  const live = league.filter((m) => statusAt(m, now) === 'live').sort(byStart)
  const upcoming = league.filter((m) => statusAt(m, now) === 'upcoming').sort(byStart)
  const finished = league.filter((m) => statusAt(m, now) === 'finished').sort((a, b) => b.start - a.start)
  return [...live, ...upcoming, ...finished]
}

/** Radens liga: det sparade valet, annars den första följda ligan. */
export function resolveLeague(option: string | null | undefined, follows: SportFollow[]): string | null {
  return option || follows.find((f) => f.kind === 'league')?.key || null
}

/** Ligorna ur en matchlista (nyckel → namn, första namnet vinner). */
export function leaguesOf(matches: SportMatch[]): Array<{ key: string; name: string }> {
  const out = new Map<string, string>()
  for (const m of matches) if (m.leagueKey && m.league && !out.has(m.leagueKey)) out.set(m.leagueKey, m.league)
  return [...out].map(([key, name]) => ({ key, name }))
}

/** Ligorna i radens väljare: följda först, sedan de som syns i datan (i namnordning). */
export function leagueChoices(follows: SportFollow[], seen: Array<{ key: string; name: string }>): Array<{ key: string; name: string }> {
  const out = new Map<string, string>()
  for (const f of follows) if (f.kind === 'league' && !out.has(f.key)) out.set(f.key, f.name)
  const rest = seen.filter((l) => !out.has(l.key)).sort((a, b) => a.name.localeCompare(b.name))
  for (const l of rest) if (!out.has(l.key)) out.set(l.key, l.name)
  return [...out].map(([key, name]) => ({ key, name }))
}

/** Ligans namn för rubriken: ur datan, annars den följda posten. */
export function leagueName(leagueKey: string, follows: SportFollow[], matches: SportMatch[]): string | null {
  return matches.find((m) => m.leagueKey === leagueKey)?.league
    ?? follows.find((f) => f.kind === 'league' && f.key === leagueKey)?.name
    ?? null
}

/** Följda LAGS avslutade matcher med ställning från källan, senaste först. Kräver nyckel — utan den finns ingen ställning. */
export function resultsRow(matches: SportMatch[], follows: SportFollow[], now: number): SportMatch[] {
  const teams = follows.filter((f) => f.kind === 'team')
  if (teams.length === 0) return []
  return unique(matches)
    .filter((m) => statusAt(m, now) === 'finished' && showsScore(m)
      && teams.some((f) => teamKeysMatch(f.key, m.homeKey) || teamKeysMatch(f.key, m.awayKey)))
    .sort((a, b) => b.start - a.start)
}

/**
 * Klick på ett kort: Sport-sidan, som startar matchens bästa kanal och
 * sedan tar bort `autoplay` (se `sportOnly` i tv-shell). Utan kanal öppnas
 * bara sidan.
 */
export function sportRowTarget(m: SportMatch, overrides: SportOverrides): BrowsePageTarget {
  const best = rankedSources(m, overrides)[0]
  if (!best) return { pageId: LIVE_TV_SPORT_PAGE_ID, params: { view: 'sport' } }
  return { pageId: LIVE_TV_SPORT_PAGE_ID, params: { view: 'sport', autoplay: '1', ...encodeChannelParams(sourceChannel(best)) } }
}
