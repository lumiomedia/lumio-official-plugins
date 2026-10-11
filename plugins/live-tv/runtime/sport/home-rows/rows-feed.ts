'use client'

import { useSyncExternalStore } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { onPluginStorageChanged } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { localDates } from '../day-plan'
import { fixtureMatchKey, mergeLinked, relevantMatches } from '../merge'
import { coverageFor } from '../providers'
import { currentResults, type ResultsController } from '../results-controller'
import { fetchSportDay, localDayKey, shiftDay } from '../sport-epg'
import { linkFixtures, type LinkMap } from '../sport-link'
import type { SportKind, SportMatch } from '../sport-model'
import { leaguesOf } from './rows-model'
import { SPORT_FOLLOWS_KEY, SPORT_OVERRIDES_KEY, SPORT_SETTINGS_KEY, getFollows, getOverrides } from '../sport-store'

/*
  HEMRADERNAS DATA — EN DELAD PRENUMERATION FÖR ALLA SEX RADERNA.

  Kvoten är toppregeln: raderna gör INGA anrop mot någon källa. De läser
  exakt det sportsidan läser, ur samma cacher:

  - EPG-dagarna via `fetchSportDay` — värdens lokala `/sport/day`, med samma
    femminuterscache som sportsidan (en dag hämtas en gång oavsett hur många
    rader och vyer som vill ha den).
  - Källans fixturer ur resultatlagret i minnet (`ResultsController`), som
    sportsidan, spelaren och livepollningen fyller. Raderna kör aldrig
    dygnsplanen, skaffar aldrig pollningsefterfrågan och skriver aldrig den
    sammanslagna listan (som styr livepollningens mål).
  - Startvärdet ur diskcachen (`router.peek`, alltid `cache-only` hos
    kvothanteraren) — samma steg som dygnsplanen gör först, högst en gång per
    sport och dag. Det läggs i resultatlagret, så sportsidan hoppar över sitt
    eget prov när den öppnas.
  - Kopplingen EPG ↔ fixtur via värdens lokala `/sport/link`, bara när
    mängden fixturer ändrats.

  Lagret startar med första raden och stannar med den sista. Omräkning sker
  på lagrets ändringar (följda, åsidosättningar, nycklar, nya fixturer) och en
  gång i minuten (dagen hämtas då ur cachen — nätet bara var femte minut).
*/

export interface SportRowsSnapshot {
  matches: SportMatch[]
  ready: boolean
}

const REFRESH_MS = 60_000
/** Mina lag visar sju dagar fram; de extra dagarna hämtas bara när den raden finns. */
const WEEK_DAYS = [2, 3, 4, 5, 6]

const listeners = new Set<() => void>()
let weekWanted = 0
let snapshot: SportRowsSnapshot = { matches: [], ready: false }
let epg = new Map<string, SportMatch[]>()
const links = new Map<string, { ids: string; map: LinkMap }>()
const linking = new Set<string>()
const peeked = new Set<string>()
let controller: ResultsController | null = null
let cacheOwner: ResultsController | null = null
let unsubs: Array<() => void> = []
let timer: ReturnType<typeof setInterval> | null = null
let generation = 0
const seenLeagues = new Map<string, string>()

function emit(): void {
  for (const cb of [...listeners]) cb()
}

function bindController(): void {
  const next = currentResults()
  if (next === controller) return
  controller = next
  // Proven och kopplingarna hör till resultatlagret; ett nytt lager (ny nyckel) börjar om. Samma lager efter en
  // paus (Hem lämnat och öppnat igen) behåller dem — diskcachen provas en gång per sport och dag.
  if (next !== cacheOwner) {
    cacheOwner = next
    links.clear()
    peeked.clear()
  }
  unsubs = unsubs.filter((u) => u !== unbindController)
  unbindController = controller ? controller.subscribe(recompute) : () => {}
  unsubs.push(unbindController)
}
let unbindController: () => void = () => {}

function recompute(): void {
  const follows = getFollows()
  const overrides = getOverrides()
  const c = controller
  const out: SportMatch[] = []
  for (const [day, list] of epg) {
    const fixtures = c ? c.allFixtures(day) : []
    let merged: SportMatch[]
    if (!c) {
      merged = list.map((m) => ({ ...m, coverage: coverageFor(null, m.kind) }))
    } else {
      const ids = fixtures.map(fixtureMatchKey).sort().join(',')
      const linked = links.get(day)
      if (fixtures.length > 0 && linked?.ids !== ids) ensureLinks(day, ids, fixtures)
      // Utan färsk koppling: bara EPG:n, annars ritas en följd match två gånger tills kopplingen landat.
      const ready = linked?.ids === ids
      merged = mergeLinked({
        epg: list,
        fixtures: ready ? fixtures : [],
        links: ready ? linked.map : {},
        overrides,
        coverage: (s) => c.router.coverage(s),
        canonical: (f) => c.canonicalOf(f),
      })
    }
    out.push(...relevantMatches(merged, follows))
  }
  noteLeagues(out)
  snapshot = { matches: out, ready: true }
  emit()
}

/** Nya ligor i datan: radredigeraren läser väljarens val ur registret, så knuffa det (valfritt i äldre SDK). */
function noteLeagues(matches: SportMatch[]): void {
  let added = false
  for (const l of leaguesOf(matches)) {
    if (seenLeagues.has(l.key)) continue
    seenLeagues.set(l.key, l.name)
    added = true
  }
  if (!added) return
  const notify = (sdk as unknown as { notifyPluginRegistryChanged?: () => void }).notifyPluginRegistryChanged
  if (typeof notify === 'function') notify()
}

function ensureLinks(day: string, ids: string, fixtures: Parameters<typeof linkFixtures>[0]['fixtures']): void {
  const key = `${day}|${ids}`
  if (linking.has(key)) return
  linking.add(key)
  const gen = generation
  void linkFixtures({ day, fixtures }).then((map) => {
    linking.delete(key)
    if (gen !== generation) return
    links.set(day, { ids, map })
    recompute()
  })
}

/** Diskcachens startvärde, som dygnsplanens första steg. `cache-only`: kostar aldrig kvot. */
async function prime(days: { today: string; yesterday: string }): Promise<void> {
  const c = controller
  if (!c) return
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const d = localDates(Date.now(), tz)
  const sports = new Set<SportKind>([...(epg.get(days.today) ?? []).map((m) => m.kind), ...getFollows().map((f) => f.sport)])
  for (const sport of sports) {
    for (const date of [days.today, days.yesterday]) {
      const key = `${sport}|${date}`
      if (peeked.has(key) || c.fixtures(sport, date).length > 0) continue
      peeked.add(key)
      const cached = await c.router.peek(sport, (p) => p.day(sport, date, { today: d.today, tz, dayEndMs: d.dayEndMs(date) })).catch(() => null)
      if (cached && controller === c) c.applyFixtures(sport, date, cached.data, 'cache', 0) // diskcachen är per definition äldst
    }
  }
}

async function refresh(): Promise<void> {
  const gen = generation
  const now = Date.now()
  const today = localDayKey(now)
  const yesterday = shiftDay(today, -1)
  const days = [yesterday, today, shiftDay(today, 1), ...(weekWanted > 0 ? WEEK_DAYS.map((n) => shiftDay(today, n)) : [])]
  const loaded = await Promise.all(days.map((day) => fetchSportDay(day, now).then((d) => d.matches).catch(() => null)))
  if (gen !== generation) return
  const next = new Map<string, SportMatch[]>()
  days.forEach((day, i) => { const list = loaded[i]; if (list) next.set(day, list) })
  epg = next
  recompute()
  void prime({ today, yesterday })
}

function start(): void {
  generation += 1
  controller = null
  bindController()
  unsubs.push(
    onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, () => { bindController(); recompute() }),
    onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, recompute),
    onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_OVERRIDES_KEY, recompute),
  )
  timer = setInterval(() => { void refresh() }, REFRESH_MS)
  void refresh()
}

function stop(): void {
  generation += 1
  for (const u of unsubs) u()
  unsubs = []
  unbindController = () => {}
  controller = null
  if (timer != null) clearInterval(timer)
  timer = null
}

function subscribe(cb: () => void, week: boolean): () => void {
  listeners.add(cb)
  if (week) weekWanted += 1
  if (listeners.size === 1) start()
  // En Mina lag-rad som kommer till ett redan startat lager behöver veckan nu, inte om en minut.
  else if (week && weekWanted === 1) void refresh()
  return () => {
    listeners.delete(cb)
    if (week) weekWanted -= 1
    if (listeners.size === 0) stop()
  }
}

const subscribeDay = (cb: () => void) => subscribe(cb, false)
const subscribeWeek = (cb: () => void) => subscribe(cb, true)
const getSnapshot = () => snapshot

/** Alla sportrader läser samma lager. `week`: också dag 2–7 (Mina lag). */
export function useSportRows(opts: { week?: boolean } = {}): SportRowsSnapshot {
  return useSyncExternalStore(opts.week ? subscribeWeek : subscribeDay, getSnapshot, getSnapshot)
}

let leaguesPrimedAt = -Infinity

/**
 * Ligor som synts i radernas data under sessionen (Liga-radens väljare).
 * Har ingen sportrad visats än hämtas idag och imorgon ur EPG:n (lokalt,
 * samma cache som sportsidan) — högst var femte minut — och registret
 * knuffas när ligorna finns.
 */
export function seenSportLeagues(now: number = Date.now()): Array<{ key: string; name: string }> {
  if (seenLeagues.size === 0 && now - leaguesPrimedAt > 5 * 60_000) {
    leaguesPrimedAt = now
    const today = localDayKey(now)
    void Promise.all([today, shiftDay(today, 1)].map((day) => fetchSportDay(day, now).then((d) => d.matches).catch(() => [] as SportMatch[])))
      .then((days) => noteLeagues(days.flat().filter((m) => !m.rerun)))
  }
  return [...seenLeagues].map(([key, name]) => ({ key, name }))
}

export function __resetSportRowsForTests(): void {
  stop()
  listeners.clear()
  weekWanted = 0
  snapshot = { matches: [], ready: false }
  epg = new Map()
  links.clear()
  linking.clear()
  peeked.clear()
  cacheOwner = null
  seenLeagues.clear()
  leaguesPrimedAt = -Infinity
}
