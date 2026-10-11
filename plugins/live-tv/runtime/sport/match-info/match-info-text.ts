import type { TvStringKey } from '../../tv/tv-strings'
import type { FixtureEvent } from '../provider'
import type { SportMatch } from '../sport-model'
import type { PositionGroup } from '../match-info-model'
import { getSportSettings, setSportSettings } from '../sport-store'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
const FOUR_HOURS = 4 * 3_600_000

export function eventLabel(e: FixtureEvent, tt: TT): string {
  switch (e.type) {
    case 'goal': return tt('sportEvGoal')
    case 'card': return /red/i.test(e.detail) ? tt('sportEvRed') : /yellow/i.test(e.detail) ? tt('sportEvYellow') : tt('sportEvCard')
    case 'sub': return tt('sportEvSub')
    case 'var': return tt('sportEvVar')
    case 'penalty': return tt('sportEvPenalty')
    default: return e.detail
  }
}

const STAT_KEYS: Record<string, TvStringKey> = {
  'Ball Possession': 'sportStatPossession', 'Total Shots': 'sportStatShots', 'Shots on Goal': 'sportStatShotsOn', 'Corner Kicks': 'sportStatCorners',
}
export function statLabel(label: string, tt: TT): string {
  return STAT_KEYS[label] ? tt(STAT_KEYS[label]) : label
}

const POS_KEYS: Record<PositionGroup, TvStringKey> = { gk: 'sportPosGk', def: 'sportPosDef', mid: 'sportPosMid', att: 'sportPosAtt', other: 'sportPosOther' }
export const positionLabel = (g: PositionGroup, tt: TT): string => tt(POS_KEYS[g])

/** Notis vid mål, per match (gäller bara medan appen körs). */
export function toggleGoalAlert(match: SportMatch): void {
  const current = { ...getSportSettings().goalAlertMatches }
  if (current[match.id]) delete current[match.id]
  else current[match.id] = match.start + FOUR_HOURS
  setSportSettings({ goalAlertMatches: current })
}
