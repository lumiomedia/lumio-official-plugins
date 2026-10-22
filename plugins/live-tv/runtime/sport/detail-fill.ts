// runtime/sport/detail-fill.ts
import type { Fixture, FixtureDetail, FixtureLineup, FixtureStat } from './provider'

/**
 * MATCHCENTRETS DELAR SOM EN KÄLLA SAKNAR.
 *
 * sportapi.ai (fotbollens första källa) svarar med händelser men lämnar
 * statistik och laguppställning tomma (`available: false`, användarens cache
 * 2026-10-22). Ett nytt svar fick då radera det som redan hämtats: telefonen
 * visade uppställningen medan den laddade och bara händelser efteråt.
 *
 * `keepFilled` behåller det tidigare svarets delar när det nya saknar dem.
 * `fillFrom` tar dem från samma match hos en annan källa (ESPN, ingen kvot),
 * med sidorna vända när källorna har hemma och borta åt olika håll.
 */

const fold = (name: string): string => name.replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const AFFIX = new Set(['fc', 'cf', 'afc', 'sc', 'ac', 'ssc', 'fk', 'sk', 'if', 'ik', 'bk', 'ff', 'cd', 'ud', 'sv', 'vfb', 'vfl', 'tsg', 'rc', 'as', 'us', 'club', 'de'])
const words = (name: string): string[] => fold(name).split(' ').filter((w) => w && !AFFIX.has(w))

/**
 * Samma lag i två källor: det kortare namnets ord finns i det längre, ett ord
 * på minst tre bokstäver får vara början av ett ("Getafe"/"Getafe CF",
 * "Man City"/"Manchester City"). Båda lagen och avsparken måste dessutom
 * stämma (`findSameMatch`), så den lösa regeln slår inte ihop olika matcher.
 */
export function sameTeam(a: string, b: string): boolean {
  const x = words(a)
  const y = words(b)
  if (x.length === 0 || y.length === 0) return false
  const xs = x.join(' ')
  const ys = y.join(' ')
  if (xs === ys) return true
  const [short, long] = x.length <= y.length ? [x, y] : [y, x]
  return short.every((w) => long.some((v) => v === w || (w.length >= 3 && v.startsWith(w))))
}

const KICKOFF_SLACK_MS = 3 * 3_600_000

/** Matchen i `list` som är `f`: båda lagen och avspark inom tre timmar. `swapped` = hemma och borta åt andra hållet. */
export function findSameMatch(list: readonly Fixture[], f: Pick<Fixture, 'home' | 'away' | 'kickoff'>): { fixture: Fixture; swapped: boolean } | null {
  for (const x of list) {
    if (Math.abs(x.kickoff - f.kickoff) > KICKOFF_SLACK_MS) continue
    if (sameTeam(x.home.name, f.home.name) && sameTeam(x.away.name, f.away.name)) return { fixture: x, swapped: false }
    if (sameTeam(x.home.name, f.away.name) && sameTeam(x.away.name, f.home.name)) return { fixture: x, swapped: true }
  }
  return null
}

/** Det nya svaret, med statistik och uppställning från det förra när det nya saknar dem. */
export function keepFilled(prev: FixtureDetail | null | undefined, fresh: FixtureDetail): FixtureDetail {
  if (!prev) return fresh
  return {
    ...fresh,
    stats: fresh.stats.length ? fresh.stats : prev.stats,
    lineups: fresh.lineups.length ? fresh.lineups : prev.lineups,
  }
}

const flipStat = (s: FixtureStat): FixtureStat => ({ ...s, home: s.away, away: s.home })
const flipLineup = (l: FixtureLineup): FixtureLineup => ({ ...l, side: l.side === 'home' ? 'away' : 'home' })

/** Fyll det som saknas ur en annan källas detalj för samma match. */
export function fillFrom(detail: FixtureDetail, other: FixtureDetail | null, swapped: boolean): FixtureDetail {
  if (!other) return detail
  const stats = swapped ? other.stats.map(flipStat) : other.stats
  const lineups = swapped ? other.lineups.map(flipLineup) : other.lineups
  return {
    ...detail,
    stats: detail.stats.length ? detail.stats : stats,
    lineups: detail.lineups.length ? detail.lineups : lineups,
  }
}

/** Saknar matchcentret statistik eller uppställning? */
export const lacksDetail = (d: FixtureDetail): boolean => d.stats.length === 0 || d.lineups.length === 0
