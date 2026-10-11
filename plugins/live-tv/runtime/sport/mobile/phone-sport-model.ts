import type { TvStringKey } from '../../tv/tv-strings'
import type { SportMatch } from '../sport-model'
import type { KickoffAlert, SportFollow } from '../sport-store'
import { clashes, timelineAxis, timelineRows, type TimelineRow } from '../sport-day-model'
import { groupResults, onlyLeague, type ResultGroup } from '../results-model'
import { leagueEntries, type LeagueEntry } from '../league-jump'

/*
  Telefonens Sport (handoffen "Live TV – Sport på mobil"), de rena delarna.
  Ingen React här — vyerna i sport-phone*.tsx ritar det som räknas ut.
*/

/** Live TV-sektionerna i rubrikens ark ("Sport ▾"), i handoffens ordning. Nycklarna är skalets vyer. */
export type PhoneSection = 'hub' | 'guide' | 'sport' | 'favs' | 'multi'
export const PHONE_SECTIONS: readonly { key: PhoneSection; label: TvStringKey }[] = [
  { key: 'hub', label: 'tabChannels' },
  { key: 'guide', label: 'tabGuide' },
  { key: 'sport', label: 'sheetSport' },
  { key: 'favs', label: 'tabFavourites' },
  { key: 'multi', label: 'sheetMultiview' },
]

/** Vyn ett tryck i arket ska gå till — `null` när det är sektionen man redan står i (arket stängs bara). */
export function sectionTarget(key: PhoneSection, current: PhoneSection = 'sport'): PhoneSection | null {
  return key === current ? null : key
}

/** "Champions League" → CL, "Allsvenskan" → ALLS, "SHL" → SHL. Tidslinjens klistrade ligaetikett är 48 px bred. */
export function leagueAbbr(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]!.slice(0, 4).toUpperCase()
  return words.slice(0, 4).map((w) => w[0]!).join('').toUpperCase()
}

export interface PhoneTimelineRow extends TimelineRow { abbr: string }
export interface PhoneTimeline { start: number; end: number; hours: number[]; rows: PhoneTimelineRow[]; nowPct: number | null }

/** Matchdagens tidslinje: BARA matcher på användarens kanaler (handoffen), banor för överlapp, nu-linjen i procent. */
export function phoneTimeline(matches: SportMatch[], dayFrom: number, now: number): PhoneTimeline | null {
  const own = matches.filter((m) => m.sources.length > 0)
  if (own.length === 0) return null
  const axis = timelineAxis(own, dayFrom)
  const span = axis.end - axis.start
  const rows = timelineRows(own).map((r) => ({ ...r, abbr: leagueAbbr(r.label) }))
  const nowPct = now >= axis.start && now <= axis.end && span > 0 ? ((now - axis.start) / span) * 100 : null
  return { ...axis, rows, nowPct }
}

/** `scope`: Alla ligor, Mina lag (följda lag och ligor) eller en ligas resultatnyckel. */
export type ResultsScope = 'all' | 'followed' | string
const watchable = (m: SportMatch) => m.sources.length > 0 && !m.resultOnly

/**
  Tabeller & resultat på telefon: växeln "Bara det jag kan se" gallrar till
  matcher med kanal, ligaväljaren väljer omfång. Ligalistan (arket) räknas med
  växeln men utan ligavalet, så att man alltid kan byta liga.
*/
export function phoneResults(matches: SportMatch[], opts: { watchable: boolean; scope: ResultsScope }, follows: SportFollow[]): { groups: ResultGroup[]; entries: LeagueEntry[]; followedCount: number } {
  const base = opts.watchable ? matches.filter(watchable) : matches
  const all = groupResults(base, 'all', follows)
  const entries = leagueEntries(all.groups, follows)
  if (opts.scope === 'all') return { groups: all.groups, entries, followedCount: all.followedCount }
  if (opts.scope === 'followed') return { groups: groupResults(base, 'followed', follows).groups, entries, followedCount: all.followedCount }
  return { groups: onlyLeague(all.groups, opts.scope), entries, followedCount: all.followedCount }
}

/** Kvällsplanen: bockad = påminnelse; två bockade närmare än 100 min varnar. */
export function eveningPlan(later: SportMatch[], isReminded: (m: SportMatch) => boolean): { rows: { match: SportMatch; on: boolean; clash: boolean }[]; chosen: number } {
  const on = later.filter(isReminded)
  const clash = clashes(on)
  return { rows: later.map((match) => ({ match, on: on.includes(match), clash: clash.has(match.id) })), chosen: on.length }
}

/** Mina lags klockpill: Av → 15 min → Avspark → Av. */
export function nextAlert(a: KickoffAlert): KickoffAlert {
  return a === 'off' ? '15' : a === '15' ? 'kickoff' : 'off'
}

/**
  Plattformens stil (rubrikens storlek, arkens hörn och handtag). Webbappen
  vet bara vad UA:n och Android-appen säger; allt annat får iOS-stilen.
*/
export function phonePlatform(ua: string, androidTauri: boolean): 'ios' | 'android' {
  return androidTauri || /Android/i.test(ua) ? 'android' : 'ios'
}
