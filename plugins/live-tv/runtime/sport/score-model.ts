import type { TvStringKey } from '../tv/tv-strings'
import type { SportMatch } from './sport-model'
import { teamKeysMatch } from './sport-store'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Ställning visas BARA för en täckt sport med en ställning från källan. Ingenting gissas ur EPG:n. */
export function showsScore(m: SportMatch): boolean {
  // En repris visar originalets slutresultat via `replayScoreText`, aldrig en live-ställning.
  if (m.rerun) return false
  return m.coverage === 'full' && !!m.fixture && !!m.score && m.status !== 'upcoming'
}

export function scoreText(m: SportMatch): string | null {
  return showsScore(m) && m.score ? `${m.score.home}–${m.score.away}` : null
}

/** Null = fas 1:s egen status (klockslag eller EPG-fönster). */
export function matchStatusLabel(m: SportMatch, tt: TT): string | null {
  if (m.rerun) return tt('sportReplay')
  if (m.coverage !== 'full' || !m.fixture) return null
  if (m.phase === 'postponed') return tt('sportPostponed')
  if (m.phase === 'ht') return tt('sportHalfTime')
  if (m.status === 'live') return m.minute != null ? `${m.minute}'` : tt('sportLiveShort')
  if (m.status === 'finished') return tt('sportEnded')
  return null
}

export function heroStatusLine(m: SportMatch, tt: TT): string | null {
  if (m.rerun) return tt('sportReplay')
  if (m.coverage !== 'full' || !m.fixture) return null
  if (m.status === 'live' && !m.phase && m.minute != null) return `${m.minute}' · ${tt('sportInProgress')}`
  return matchStatusLabel(m, tt)
}

/** Reprisens slutresultat ur originalmatchen ("2–0"), när källan har den. */
export function replayScoreText(m: SportMatch): string | null {
  const s = m.rerun ? m.replayOf?.score : null
  return s ? `${s.home}–${s.away}` : null
}

/** "Spelades lör 10 okt" — originalmatchens datum. */
export function playedOnText(m: SportMatch, tt: TT, locale: string): string | null {
  if (!m.rerun || !m.replayOf) return null
  const date = new Date(m.replayOf.kickoff).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\.$/, '')
  return tt('sportPlayedOn', { date })
}

/** Märket ur en match som bär det (alla inlästa dagar), annars det som sparades på posten. */
export function crestForFollow(f: { key: string; crest?: string | null }, matches: SportMatch[]): string | null {
  for (const m of matches) {
    if (m.homeCrest && teamKeysMatch(f.key, m.homeKey)) return m.homeCrest
    if (m.awayCrest && teamKeysMatch(f.key, m.awayKey)) return m.awayCrest
  }
  return f.crest ?? null
}
