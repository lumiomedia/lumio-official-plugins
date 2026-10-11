import { followState } from './sport-day-model'
import type { SportFollow, SportSettings } from './sport-store'
import type { GoalEvent } from './goal-events'
import type { SportMatch } from './sport-model'
import type { TvStringKey } from '../tv/tv-strings'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

export function matchForGoal(e: GoalEvent, merged: SportMatch[]): SportMatch | null {
  return merged.find((m) => m.fixture?.provider === e.provider && m.fixture.id === e.fixtureId) ?? null
}

export function goalAlertWanted(match: SportMatch | null, settings: SportSettings, follows: SportFollow[], now: number = Date.now()): boolean {
  if (!match || !settings.goalAlerts) return false
  return followState(match, follows).any || (settings.goalAlertMatches[match.id] ?? 0) > now
}

export function goalTitle(e: GoalEvent, tt: TT): string {
  return `${tt('sportGoal')} · ${e.home} ${e.score.home}–${e.score.away} ${e.away}`
}

export function goalBody(e: GoalEvent): string {
  const minute = e.minute != null ? `${e.minute}'` : ''
  return [e.scorer, minute].filter(Boolean).join(' ')
}

let playing: string | null = null
/** Spelaren sätter sin kanal. Notisen hoppas över när overlayn redan visar målet. */
export function setPlayingChannel(key: string | null): void { playing = key }
export function playingChannel(): string | null { return playing }
