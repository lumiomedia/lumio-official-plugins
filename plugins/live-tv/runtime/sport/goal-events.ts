import type { Fixture, ProviderId } from './provider'
import type { SportKind } from './sport-model'

export interface Score { home: number; away: number }
export interface GoalEvent {
  fixtureId: string; provider: ProviderId; sport: SportKind; side: 'home' | 'away'; score: Score
  scorer: string | null; minute: number | null; at: number; home: string; away: string
}

/**
 * Mål = en sidas ställning har ÖKAT sedan förra observationen av samma
 * fixtur. Första observationen ger aldrig mål (appen öppnas mitt i en
 * match). En ställning som går ned (VAR) ger inget.
 */
export function diffGoals(prev: ReadonlyMap<string, Score>, next: Fixture[], now: number): GoalEvent[] {
  const out: GoalEvent[] = []
  for (const f of next) {
    if (!f.score) continue
    const before = prev.get(f.id)
    if (!before) continue
    for (const side of ['home', 'away'] as const) {
      if (f.score[side] <= before[side]) continue
      const own = f.lastGoal?.side === side ? f.lastGoal : null
      out.push({
        fixtureId: f.id, provider: f.provider, sport: f.sport, side, score: { ...f.score },
        scorer: own?.player ?? null, minute: own?.minute ?? f.minute, at: now, home: f.home.name, away: f.away.name,
      })
    }
  }
  return out
}

const listeners = new Set<(e: GoalEvent) => void>()

export function emitGoals(events: GoalEvent[]): void {
  for (const e of events) for (const cb of [...listeners]) cb(e)
}

export function onGoal(cb: (e: GoalEvent) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
