import type { ResultGroup } from './results-model'
import type { SportKind } from './sport-model'
import type { SportFollow } from './sport-store'
import { relevantMatches } from './merge'
import { followState } from './sport-day-model'

/*
  Resultatflikens "Hoppa till" (Jerry 2026-10-11): hundratals ligachips gick
  inte att hitta i, och "Premier League" ×4 sa ingenting. Rena delar här,
  delade av TV/skrivbord och telefon:
  - `yourLeagues`: en kort rad med det användaren bryr sig om (följda ligor och
    ligor med en match på användarens kanaler), annars de största ligorna.
  - `countryGroups`/`searchLeagues`: lådan "Fler ligor…", grupperad per land.
  Dubblettnamn skiljs med "· <land>" (källans `league.country`).
*/

export interface LeagueEntry {
  /** Resultatgruppens nyckel (`ResultGroup.key`) — det man hoppar till. */
  key: string
  sport: SportKind
  league: string
  country: string | null
  /** Namnet som visas: "<liga> · <land>" när namnet finns i flera länder. */
  label: string
  count: number
  live: number
  /** Följd liga/lag eller en match kopplad till användarens kanaler (resultatlagrets `relevantMatches`). */
  relevant: boolean
  followed: boolean
}

export interface CountryGroup { country: string | null; total: number; live: number; entries: LeagueEntry[]; collapsed: boolean }

export const YOUR_LEAGUES_MAX = 10
export const TOP_LEAGUES_MAX = 6
export const OPEN_COUNTRIES = 6

export function foldText(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

const HOME_COUNTRIES = new Set(['sweden', 'sverige'])
export const isHomeCountry = (c: string | null) => c !== null && HOME_COUNTRIES.has(foldText(c))

export function leagueEntries(groups: ResultGroup[], follows: SportFollow[]): LeagueEntry[] {
  const names = new Map<string, Set<string>>()
  for (const g of groups) {
    const k = foldText(g.league)
    const set = names.get(k) ?? new Set<string>()
    set.add(g.key)
    names.set(k, set)
  }
  return groups.map((g) => {
    const duplicate = (names.get(foldText(g.league))?.size ?? 0) > 1
    return {
      key: g.key,
      sport: g.sport,
      league: g.league,
      country: g.country,
      label: duplicate && g.country ? `${g.league} · ${g.country}` : g.league,
      count: g.matches.length,
      live: g.matches.filter((m) => m.status === 'live').length,
      relevant: relevantMatches(g.matches, follows).length > 0,
      followed: g.matches.some((m) => followState(m, follows).league),
    }
  })
}

const byCount = (a: LeagueEntry, b: LeagueEntry) => b.count - a.count || a.label.localeCompare(b.label)

/** "Dina ligor": följda först, sedan de med live, sedan flest matcher. Tomt → de största ligorna (`fallback`). */
export function yourLeagues(entries: LeagueEntry[]): { entries: LeagueEntry[]; fallback: boolean } {
  const relevant = entries.filter((e) => e.relevant)
  if (relevant.length === 0) return { entries: [...entries].sort(byCount).slice(0, TOP_LEAGUES_MAX), fallback: true }
  const rank = (e: LeagueEntry) => (e.followed ? 0 : e.live > 0 ? 1 : 2)
  return { entries: [...relevant].sort((a, b) => rank(a) - rank(b) || byCount(a, b)).slice(0, YOUR_LEAGUES_MAX), fallback: false }
}

/** Lådans grupper: Sverige först, sedan länder efter antal matcher, ligor utan land sist. Grupper efter de första sex fälls ihop. */
export function countryGroups(entries: LeagueEntry[]): CountryGroup[] {
  const map = new Map<string, CountryGroup>()
  for (const e of entries) {
    const k = e.country ? foldText(e.country) : ''
    const g = map.get(k) ?? { country: e.country, total: 0, live: 0, entries: [], collapsed: false }
    g.total += e.count
    g.live += e.live
    g.entries.push(e)
    map.set(k, g)
  }
  const tier = (g: CountryGroup) => (isHomeCountry(g.country) ? 0 : g.country === null ? 2 : 1)
  const list = [...map.values()].sort((a, b) => tier(a) - tier(b) || b.total - a.total || (a.country ?? '').localeCompare(b.country ?? ''))
  return list.map((g, i) => ({ ...g, entries: [...g.entries].sort(byCount), collapsed: i >= OPEN_COUNTRIES }))
}

/** Sök i liga och land (utan accenter, alla ord måste finnas). Namn som börjar med frågan först, sedan flest matcher. */
export function searchLeagues(entries: LeagueEntry[], query: string): LeagueEntry[] {
  const q = foldText(query)
  if (!q) return []
  const words = q.split(/\s+/)
  const hits = entries.filter((e) => {
    const hay = `${foldText(e.league)} ${e.country ? foldText(e.country) : ''}`
    return words.every((w) => hay.includes(w))
  })
  const prefix = (e: LeagueEntry) => (foldText(e.league).startsWith(q) ? 0 : 1)
  return hits.sort((a, b) => prefix(a) - prefix(b) || byCount(a, b))
}
