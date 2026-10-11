import type { M3uChannel } from '../live-tv-data'

/** Spegel av Rusts `SportKind` (`src-tauri/src/live_tv_sport.rs`). */
export type SportKind = 'football' | 'hockey' | 'basketball' | 'handball' | 'motorsport' | 'tennis' | 'other'
export const SPORT_KINDS: readonly SportKind[] = ['football', 'hockey', 'basketball', 'handball', 'motorsport', 'tennis', 'other']
/** Sportknapparna (spec, beslut 2026-10-10), i ordning. */
export const SPORT_CHIPS: readonly SportKind[] = ['football', 'hockey', 'basketball', 'handball', 'motorsport', 'tennis']
export type SportFilter = SportKind | 'all'
export type Quality = '4K' | 'FHD' | 'HD' | 'SD'
export type MatchStatus = 'live' | 'upcoming' | 'finished'

export interface MatchSource {
  channelKey: string
  name: string
  url: string
  logo: string | null
  group: string
  tvgId: string | null
  /** Källan i kanalindexet; spellistans namn slås upp på den. */
  sourceId: string
  quality: Quality | null
  programmeStart: number
  programmeStop: number
  liveFlag: boolean
}

export interface SportMatch {
  id: string
  kind: SportKind
  league: string
  leagueKey: string
  home: string | null
  away: string | null
  homeKey: string | null
  awayKey: string | null
  /** Lagsportlösa event (motorsport, tennis). */
  event: string | null
  start: number
  stop: number
  status: MatchStatus
  rerun: boolean
  round: number | null
  venue: string | null
  sources: MatchSource[]
  /** Fas 2: allt nedan sätts bara av `merge.ts` ur en källfixtur. Utan `coverage: 'full'` är matchen bara EPG. */
  coverage?: 'full' | 'epg'
  /** Paus (live) eller uppskjuten (upcoming); `status` har bara fas 1:s tre värden. */
  phase?: 'ht' | 'postponed'
  minute?: number | null
  score?: { home: number; away: number }
  homeCrest?: string | null
  awayCrest?: string | null
  /** Källans lag-id per källa, för följda lag och tabeller. */
  homeIds?: Record<string, string>
  awayIds?: Record<string, string>
  /** Källans fixtur. `leagueId`/`season` behövs för tabellen; `country` (ligans land) skiljer dubblettnamn i Hoppa till. */
  fixture?: { provider: string; id: string; leagueId?: string; season?: string; country?: string | null }
  /** Fixtur utan kopplad kanal ("Bara resultat"). Visas bara med nyckel. */
  resultOnly?: boolean
  /** Senaste målet om källan skickar händelser (målskytt i MÅL!). */
  venueImage?: string | null
  lastGoal?: { side: 'home' | 'away' | null; player: string | null; minute: number | null } | null
}

export interface SportDay {
  day: string
  from: number
  to: number
  at: number
  fetchedAt: number | null
  matches: SportMatch[]
  counts: Partial<Record<SportKind, number>>
}

export function matchTitle(m: Pick<SportMatch, 'home' | 'away' | 'event' | 'league'>): string {
  return m.home && m.away ? `${m.home} - ${m.away}` : m.event ?? m.league
}

const CREST_SKIP = new Set(['fc', 'if', 'ik', 'ifk', 'aif', 'bk', 'sk', 'hc', 'ff', 'is', 'cf', 'afc', 'ssc', 'hf', 'bik', 'gik'])

/** Handoffens initialcirkel: tre bokstäver ur första ordet som inte är ett föreningsaffix ("FC Barcelona" → BAR). */
export function crestText(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  const word = words.find((w) => !CREST_SKIP.has(w.toLowerCase()) && /\p{L}/u.test(w)) ?? words[0] ?? '?'
  return word.slice(0, 3).toUpperCase()
}

export function sourceChannel(s: MatchSource): M3uChannel {
  return { name: s.name, url: s.url, logo: s.logo, group: s.group, tvgId: s.tvgId }
}
