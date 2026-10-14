import type { TipMatchInfo, TipStatusAnswer, TipTeam } from '@/lib/plugin-sdk'
import { standardImageFor } from '../backdrop'
import { statusAt } from '../sport-day-model'
import { localDayKey } from '../sport-epg'
import type { SportMatch } from '../sport-model'
import type { SportSettings } from '../sport-store'
import { teamShort } from './snapshot'
import { hiddenOnTv } from './spoiler'

/*
  Tippa matchen (Soffläge Sport fas 3). Rummet bor i appen och Rust; pluginet
  slår bara upp matchen (`tip-open`) och svarar på värdens interna fråga
  `tip-status`, så att värden kan rapportera slutresultatet.
*/

/** Rusts gränser för `TipMatch` (src-tauri/src/couch/tiproom/room.rs). */
const NAME_MAX = 80
const LEAGUE_MAX = 80
const SPORT_MAX = 20
const URL_MAX = 1000

/** Rust tar bara emot `https://`, `http://` eller en rotrelativ sökväg; allt annat blir null. */
function safeUrl(u: string | null | undefined): string | null {
  if (!u || u.length > URL_MAX) return null
  return /^(https?:\/\/|\/)/.test(u) ? u : null
}

function tipTeam(name: string, crest: string | null | undefined): TipTeam {
  const n = name.trim().slice(0, NAME_MAX)
  return { name: n, short: teamShort(n).slice(0, 5), crest: safeUrl(crest) }
}

/** Matchen har två lag (motorsport och tennis-event har det inte). */
export function hasTeams(m: SportMatch): m is SportMatch & { home: string; away: string } {
  return !!m.home?.trim() && !!m.away?.trim()
}

/**
 * Rummets matchinfo. Avspark = EPG:ns start (kan ligga lite före den riktiga
 * avsparken; godtas, avsteg 14). Värden rapporterar själv resultatet bara när
 * källan kan ge det: nyckel, full täckning och en fixtur (repris: originalets
 * kända slutresultat).
 */
export function tipMatchInfo(m: SportMatch, deps: { hasKey: boolean }): TipMatchInfo {
  const auto = deps.hasKey && m.coverage === 'full' && (m.rerun ? !!m.replayOf?.score : !!m.fixture)
  return {
    matchId: m.id,
    sport: m.kind.slice(0, SPORT_MAX),
    league: m.league.slice(0, LEAGUE_MAX),
    home: tipTeam(m.home ?? '', m.homeCrest),
    away: tipTeam(m.away ?? '', m.awayCrest),
    kickoffMs: m.start,
    backdrop: safeUrl(standardImageFor(m.kind, localDayKey(m.start))),
    autoResult: auto,
  }
}

/** Matchen kan inte längre tippas: avspark (repris: sändningsstart) har passerat. */
export function tipTooLate(m: SportMatch, now: number): boolean {
  return statusAt(m, now) !== 'upcoming'
}

/** Källans slutresultat för en riktig match (som `showsScore`, men utan spoilerkontrollen). */
function sourceScore(m: SportMatch): [number, number] | null {
  if (m.rerun || m.coverage !== 'full' || !m.fixture || !m.score || m.status === 'upcoming') return null
  return [m.score.home, m.score.away]
}

/**
 * Svaret på `tip-status`. En repris är live medan den sänds och `finished`
 * först när sändningen är slut, med originalets resultat. Resultatet skickas
 * även när matchen är spoilerdold: värden behöver det för poängen och
 * spärrar själv 2e på TV:n med `spoilerTv`.
 */
export function tipStatus(m: SportMatch, now: number, settings: Pick<SportSettings, 'spoilerReplays'>): Exclude<TipStatusAnswer, { error: string }> {
  const spoilerTv = hiddenOnTv(m, now, settings)
  if (m.rerun) {
    if (now < m.start) return { status: 'upcoming', spoilerTv }
    if (now < m.stop) return { status: 'live', spoilerTv }
    const s = m.replayOf?.score
    return { status: 'finished', ...(s ? { score: [s.home, s.away] as [number, number] } : {}), spoilerTv }
  }
  const status = statusAt(m, now)
  if (status === 'finished') {
    const s = sourceScore(m)
    return { status, ...(s ? { score: s } : {}), spoilerTv }
  }
  if (status === 'live' && m.phase === 'ht') return { status: 'ht', spoilerTv }
  return { status, spoilerTv }
}
