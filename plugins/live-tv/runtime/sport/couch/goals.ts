import type { CouchSportGoal } from '@/lib/plugin-sdk'
import { goalAlertWanted } from '../goal-alerts'
import type { GoalEvent } from '../goal-events'
import { rankedSources } from '../sport-day-model'
import type { SportMatch } from '../sport-model'
import type { SportFollow, SportOverrides, SportSettings } from '../sport-store'
import { teamShort } from './snapshot'

/**
 * Soffläge: öppna mål för följda lag. Ligger i sportbilden (`goals`), så att
 * alla telefoner och TV:n ser samma lista; ett Stäng var som helst tar bort
 * målet överallt. Ett mål försvinner av sig självt efter GOAL_TTL_MS.
 */
export const GOAL_TTL_MS = 120_000
/** TV-toasten stängs av sig själv efter 8 s; målet ligger kvar på telefonerna. */
export const GOAL_TOAST_MS = 8_000
export const GOALS_MAX = 5

type Entry = { goal: CouchSportGoal; addedAt: number }
let entries: Entry[] = []
const listeners = new Set<() => void>()
const emit = () => { for (const cb of [...listeners]) cb() }

export function addGoal(g: CouchSportGoal, now: number): void {
  if (entries.some((e) => e.goal.goalId === g.goalId)) return
  entries = [{ goal: g, addedAt: now }, ...entries].slice(0, GOALS_MAX)
  emit()
}

export function dismissGoal(goalId: string): void {
  if (!entries.some((e) => e.goal.goalId === goalId)) return
  entries = entries.filter((e) => e.goal.goalId !== goalId)
  emit()
}

/** De öppna målen, nyaste först. Utgångna rensas (och lyssnarna meddelas). */
export function openGoals(now: number): CouchSportGoal[] {
  const fresh = entries.filter((e) => now - e.addedAt <= GOAL_TTL_MS)
  if (fresh.length !== entries.length) {
    entries = fresh
    emit()
  }
  return entries.map((e) => e.goal)
}

export function onGoalsChanged(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function __resetGoalsForTests(): void { entries = []; listeners.clear() }

/**
 * Målet som kort/toast. `score` räknas från lagets håll (laget som gjorde
 * mål först): "Malmö FF 2–1" läses rätt oavsett hemma eller borta.
 * `goalId` är stabilt per ställning, så att samma mål aldrig läggs in två gånger.
 */
export function goalFromEvent(e: GoalEvent, match: SportMatch, overrides: SportOverrides): CouchSportGoal {
  const home = e.side === 'home'
  const name = (home ? match.home : match.away) ?? (home ? e.home : e.away)
  const crest = (home ? match.homeCrest : match.awayCrest) ?? null
  const opponent = (home ? match.away : match.home) ?? (home ? e.away : e.home)
  const own = home ? e.score.home : e.score.away
  const other = home ? e.score.away : e.score.home
  const best = rankedSources(match, overrides)[0] ?? null
  return {
    goalId: `${match.id}|${e.score.home}-${e.score.away}|${e.side}`,
    matchId: match.id,
    team: { name, short: teamShort(name), crest },
    opponent,
    score: [own, other],
    minute: e.minute != null ? `${e.minute}'` : null,
    league: match.league,
    channel: best?.name ?? null,
    at: e.at,
  }
}

/**
 * Kort och toast bara när målet gäller ett följt lag (eller en match med notis),
 * matchen INTE redan visas på TV:n (kanalen som spelar eller Multiviews
 * ljudruta) och det inte är en repris.
 */
export function shouldCard(match: SportMatch, ctx: { playing: string | null; audioChannel: string | null; settings: SportSettings; follows: SportFollow[] }, now: number = Date.now()): boolean {
  if (match.rerun) return false
  const shown = (key: string | null) => !!key && match.sources.some((s) => s.channelKey === key)
  if (shown(ctx.playing) || shown(ctx.audioChannel)) return false
  return goalAlertWanted(match, ctx.settings, ctx.follows, now)
}
