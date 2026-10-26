'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { sportsCompatible, teamKeysMatch } from './sport-store'
import type { SportKind, SportMatch } from './sport-model'

/**
 * KVÄLLSPLANEN. En bockad match hamnar i "Din kväll" även när den ännu inte
 * har någon kanal — kanalerna kommer ofta senare (Jerry 2026-10-26: "så man
 * kan planera sin kväll"). En påminnelse kräver en kanal, så planen är en egen
 * lista: matchen sparas på sport, lag (eller event) och avspark, och känns
 * igen när tablån senare ger den en kanal och ett annat id. Då skapar sporten
 * påminnelsen (`useEveningPlanUpgrade`).
 */
export const EVENING_PLAN_KEY = 'sport_evening_plan_v1'
const KEEP_MS = 12 * 3_600_000
const SLACK_MS = 3 * 3_600_000

export interface PlanEntry {
  id: string
  kind: SportKind
  homeKey: string | null
  awayKey: string | null
  event: string | null
  title: string
  start: number
}

export function getEveningPlan(now: number = Date.now()): PlanEntry[] {
  const raw = readPluginJson<PlanEntry[] | null>(LIVE_TV_PLUGIN_ID, EVENING_PLAN_KEY, null)
  return Array.isArray(raw) ? raw.filter((e) => e && typeof e.start === 'number' && e.start + KEEP_MS > now) : []
}

const write = (list: PlanEntry[]) => writePluginJson(LIVE_TV_PLUGIN_ID, EVENING_PLAN_KEY, list)

/** Samma match: samma id, eller samma sport, båda lagen (eller eventet) och avspark inom tre timmar. */
export function samePlanned(e: PlanEntry, m: Pick<SportMatch, 'id' | 'kind' | 'homeKey' | 'awayKey' | 'event' | 'start'>): boolean {
  if (e.id === m.id) return true
  if (!sportsCompatible(e.kind, m.kind) || Math.abs(e.start - m.start) > SLACK_MS) return false
  if (e.homeKey && e.awayKey && m.homeKey && m.awayKey) {
    return (teamKeysMatch(e.homeKey, m.homeKey) && teamKeysMatch(e.awayKey, m.awayKey))
      || (teamKeysMatch(e.homeKey, m.awayKey) && teamKeysMatch(e.awayKey, m.homeKey))
  }
  return !!e.event && !!m.event && e.event.toLowerCase() === m.event.toLowerCase()
}

export function isPlanned(plan: readonly PlanEntry[], m: SportMatch): boolean {
  return plan.some((e) => samePlanned(e, m))
}

export function addPlanned(m: SportMatch, title: string, now: number = Date.now()): void {
  const plan = getEveningPlan(now)
  if (plan.some((e) => samePlanned(e, m))) return
  write([...plan, { id: m.id, kind: m.kind, homeKey: m.homeKey ?? null, awayKey: m.awayKey ?? null, event: m.event ?? null, title, start: m.start }])
}

export function removePlanned(m: SportMatch, now: number = Date.now()): void {
  const plan = getEveningPlan(now)
  const next = plan.filter((e) => !samePlanned(e, m))
  if (next.length !== plan.length) write(next)
}

export function useEveningPlan(): PlanEntry[] {
  const [plan, setPlan] = useState(() => getEveningPlan())
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, EVENING_PLAN_KEY, () => setPlan(getEveningPlan())), [])
  return plan
}

/**
 * När en planerad match får en kanal: sätt påminnelsen på den, en gång.
 * `ensureReminder` får matchen och skapar påminnelsen om den saknas.
 */
export function useEveningPlanUpgrade(matches: readonly SportMatch[], plan: readonly PlanEntry[], hasReminder: (m: SportMatch) => boolean, ensureReminder: (m: SportMatch) => void): void {
  useEffect(() => {
    if (plan.length === 0) return
    for (const m of matches) {
      if (m.sources.length === 0 || m.rerun || m.status === 'finished') continue
      if (isPlanned(plan, m) && !hasReminder(m)) ensureReminder(m)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, plan])
}
