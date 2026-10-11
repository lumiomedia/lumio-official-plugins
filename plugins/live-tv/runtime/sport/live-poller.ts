// runtime/sport/live-poller.ts
'use client'

import { useEffect } from 'react'
import type { Budget } from './budget'
import type { Fixture, LiveOpts } from './provider'
import type { SportKind } from './sport-model'

/**
 * Livepollning går BARA medan sportvyn, matchcentret eller en sportsändning
 * i spelaren har efterfrågan, appen syns och någon täckt match är het. Ett
 * "allt live"-anrop per sport. Intervallet räknas av kvothanteraren.
 */
export type DemandReason = 'sport-view' | 'match-center' | 'player'

const demand = new Map<DemandReason, number>()
const demandListeners = new Set<() => void>()

function emitDemand(): void { for (const cb of [...demandListeners]) cb() }

export function acquirePollDemand(reason: DemandReason): () => void {
  demand.set(reason, (demand.get(reason) ?? 0) + 1)
  emitDemand()
  let released = false
  return () => {
    if (released) return
    released = true
    const n = (demand.get(reason) ?? 1) - 1
    if (n <= 0) demand.delete(reason)
    else demand.set(reason, n)
    emitDemand()
  }
}

export function hasPollDemand(): boolean { return demand.size > 0 }

export function onPollDemandChanged(cb: () => void): () => void {
  demandListeners.add(cb)
  return () => { demandListeners.delete(cb) }
}

export function usePollDemand(reason: DemandReason, active: boolean): void {
  useEffect(() => (active ? acquirePollDemand(reason) : undefined), [reason, active])
}

export function __resetPollDemandForTests(): void {
  demand.clear()
  emitDemand()
}

export interface LiveTarget { sport: SportKind; hot: boolean; windowEndsAt: number }

export interface LivePollerDeps {
  budget: Budget
  targets(): LiveTarget[]
  onFixtures(sport: SportKind, fixtures: Fixture[], fetchedAt: number | null): void
  liveOpts(): LiveOpts
  now?: () => number
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (h: unknown) => void
  isVisible?: () => boolean
  onVisibility?: (cb: () => void) => () => void
}

export interface LivePoller { start(): void; stop(): void; reschedule(): void; nextDelayMs(): number | null }

const defaultVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
const defaultOnVisibility = (cb: () => void) => {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('visibilitychange', cb)
  return () => document.removeEventListener('visibilitychange', cb)
}

export function createLivePoller(deps: LivePollerDeps): LivePoller {
  const now = deps.now ?? Date.now
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms))
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  const isVisible = deps.isVisible ?? defaultVisible
  const due = new Map<SportKind, number>()
  let timer: unknown = null
  let running = false
  let unsubs: Array<() => void> = []

  const active = () => running && hasPollDemand() && isVisible()

  function plan(): Array<{ sport: SportKind; at: number }> {
    const out: Array<{ sport: SportKind; at: number }> = []
    for (const t of deps.targets()) {
      if (!t.hot) { due.delete(t.sport); continue }
      const interval = deps.budget.liveIntervalMs(deps.budget.provider.bucket(t.sport), t.windowEndsAt)
      if (interval == null) { due.delete(t.sport); continue }
      if (!due.has(t.sport)) due.set(t.sport, now() + interval)
      out.push({ sport: t.sport, at: due.get(t.sport)! })
    }
    return out
  }

  function nextDelayMs(): number | null {
    if (!active()) return null
    const items = plan()
    if (items.length === 0) return null
    return Math.max(0, Math.min(...items.map((i) => i.at)) - now())
  }

  function pauseEndsAt(): number | null {
    const ends = deps.targets()
      .filter((t) => t.hot)
      .map((t) => deps.budget.pausedUntil?.(deps.budget.provider.bucket(t.sport)) ?? null)
      .filter((x): x is number => x != null)
    return ends.length ? Math.min(...ends) : null
  }

  function reschedule(): void {
    if (timer != null) { clearTimer(timer); timer = null }
    if (!active()) { due.clear(); return }
    const delay = nextDelayMs()
    if (delay == null) {
      // Spärrad hink (slut i dag / minutspärr): vakna när spärren släpper och
      // planera om, så att pollningen kommer igång utan att vyn öppnas igen.
      const wake = pauseEndsAt()
      if (wake != null) timer = setTimer(() => { timer = null; reschedule() }, Math.max(0, wake - now()) + 1)
      return
    }
    timer = setTimer(() => { timer = null; void tick() }, delay)
  }

  async function tick(): Promise<void> {
    if (!active()) return
    const t = now()
    for (const item of plan()) {
      if (item.at > t) continue
      due.delete(item.sport)
      const res = await deps.budget.live(item.sport, deps.liveOpts())
      if (res.data) deps.onFixtures(item.sport, res.data, res.fetchedAt)
    }
    reschedule()
  }

  return {
    start() {
      if (running) return
      running = true
      unsubs = [onPollDemandChanged(reschedule), (deps.onVisibility ?? defaultOnVisibility)(reschedule)]
      reschedule()
    },
    stop() {
      running = false
      for (const u of unsubs) u()
      unsubs = []
      if (timer != null) { clearTimer(timer); timer = null }
      due.clear()
    },
    reschedule,
    nextDelayMs,
  }
}
