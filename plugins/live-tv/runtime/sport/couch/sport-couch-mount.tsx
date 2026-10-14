'use client'

import { useEffect, useRef, useState } from 'react'
import { hasCouchSdk, notifyCouchSurface, onPluginStorageChanged, registerCouchSurface, requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { MULTIVIEW_KEY, getMultiviewState, setMultiviewState } from '../../tv/tv-multiview-store'
import { onPlayingChannelChanged, playingChannel } from '../goal-alerts'
import type { ProviderId } from '../provider'
import { currentResults, useSportResults, type ResultsController } from '../results-controller'
import { localDayKey, useSportDay } from '../sport-epg'
import type { SportDay, SportMatch } from '../sport-model'
import { SPORT_FOLLOWS_KEY, SPORT_SETTINGS_KEY, getFollows, getOverrides, getSportSettings } from '../sport-store'
import { searchFollowTargets } from '../follow-search'
import { followCandidates } from '../sport-day-model'
import { KIND_KEYS } from '../sport-ctx'
import { tvText, useTvText } from '../../tv/tv-strings'
import { searchSports } from './follows'
import { answerSportQuery, runSportCommand, type SportDeps } from './commands'
import { couchMarks, onCouchMarksChanged } from './context'
import { onGoalsChanged, openGoals } from './goals'
import { hasCouchPresence, onPresenceChanged, sweepPresence } from './presence'
import { buildCouchSport } from './snapshot'
import { hiddenOnTv, noteReplays, onSpoilerChanged, SPOILER_TV_KEY } from './spoiler'

const NOTIFY_MS = 250
const SWEEP_MS = 15_000
const CLOCK_MS = 60_000
/** Dagens EPG-matcher ur feedern: bildens källa när controllern saknas (ingen nyckel). */
let epgToday: SportMatch[] = []

/** TV:n visar något som kan vara sport: en kanal, Sport-sidan eller Multiview. */
function tvShowsSportish(): boolean {
  const marks = couchMarks()
  return playingChannel() != null || marks.sportPage || marks.multiview
}

function audioChannel(): string | null {
  const mv = getMultiviewState()
  return mv.tiles[mv.audioIndex] ?? null
}

/**
 * Sammanslagna matcher (med nyckel) plus dagens EPG-matcher som inte finns
 * bland dem. Utan EPG-delen vet ytan inte vilken match en kanal visar förrän
 * en vy har slagit ihop dagen — och då skulle sportläget aldrig starta.
 */
function todaysMatches(): SportMatch[] {
  const merged = currentResults()?.merged() ?? []
  if (!merged.length) return epgToday
  const ids = new Set(merged.map((m) => m.id))
  return [...merged, ...epgToday.filter((m) => !ids.has(m.id))]
}

function snapshotNow() {
  const c = currentResults()
  const now = Date.now()
  const marks = couchMarks()
  const settings = getSportSettings()
  return buildCouchSport({
    matches: todaysMatches(),
    playing: playingChannel(),
    marks,
    audioChannel: audioChannel(),
    follows: getFollows(),
    overrides: getOverrides(),
    hasKey: !!c,
    updatedAt: c?.lastLiveAt ?? null,
    now,
    multiview: marks.multiview ? getMultiviewState() : null,
    goals: openGoals(now),
    spoilerHidden: (m) => hiddenOnTv(m, now, settings),
  })
}

/**
 * Matchdetaljen: samma ref som matchinfon (use-fixture-detail.ts). Avslutade
 * bara ur cachen. En repris läses ur cachen via originalets fixtur (ingen
 * kvot); spoilerskyddet avgörs innan, i answerSportQuery.
 */
function loadDetail(m: SportMatch) {
  const c = currentResults()
  if (!c || m.coverage !== 'full') return Promise.resolve(null)
  if (m.rerun) {
    const of = m.replayOf?.fixture
    return of ? c.cachedFixture(m.kind, { provider: of.provider as ProviderId, id: of.id }) : Promise.resolve(null)
  }
  if (!m.fixture) return Promise.resolve(null)
  const fr = { provider: m.fixture.provider as ProviderId, id: m.fixture.id }
  return m.status === 'finished' ? c.cachedFixture(m.kind, fr) : c.loadFixture(m.kind, fr, false)
}

/** Värdens språk för Följer-listans texter (sätts av monteringen; frågorna körs utanför React). */
let text: ReturnType<SportDeps['text']> = { tt: (k, v) => tvText('sv', k, v), locale: 'sv-SE' }

/** Följ lag-sökningens kandidater: dagens lag och ligor ur EPG:n, lagen med sin liga. */
function searchDeps(): ReturnType<SportDeps['searchDeps']> {
  const matches = todaysMatches()
  const leagueOf = new Map<string, string>()
  for (const m of matches) {
    if (m.homeKey && !leagueOf.has(m.homeKey)) leagueOf.set(m.homeKey, m.league)
    if (m.awayKey && !leagueOf.has(m.awayKey)) leagueOf.set(m.awayKey, m.league)
  }
  const settings = getSportSettings()
  return {
    candidates: () => followCandidates([{ matches } as SportDay])
      .map((c) => (c.kind === 'team' && leagueOf.has(c.key) ? { ...c, league: leagueOf.get(c.key) } : c)),
    hasKey: !!currentResults(),
    provider: searchFollowTargets,
    sports: () => searchSports(getFollows(), matches),
    primary: settings.provider,
    label: (s) => text.tt(KIND_KEYS[s]),
  }
}

const deps: SportDeps = {
  matches: todaysMatches,
  focusId: () => snapshotNow().focus?.id ?? null,
  overrides: getOverrides,
  open: (t) => requestOpenBrowsePage(t),
  detail: loadDetail,
  now: () => Date.now(),
  multiview: () => (couchMarks().multiview ? getMultiviewState() : null),
  setMultiview: setMultiviewState,
  settings: getSportSettings,
  follows: getFollows,
  text: () => text,
  searchDeps,
}

/**
 * Dagens EPG (lokalt anrop, ingen kvot) medan TV:n visar en kanal, Sport-sidan
 * eller Multiview, så att ytan vet om det är sport. Sammanslagningen med
 * källan (`merge`) körs bara medan en telefon visar sportfliken (spec 4).
 */
function SportCouchFeeder({ onChange, merge }: { onChange: () => void; merge: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), CLOCK_MS)
    return () => clearInterval(t)
  }, [])
  const day = localDayKey(now)
  const today = useSportDay(day, now)
  const epg = today.data?.matches
  useEffect(() => {
    epgToday = epg ?? []
    // Repriser utan nyckel: skyddet gäller även dem (telefonen visar låset).
    noteReplays(epgToday, Date.now())
    onChange()
  }, [epg, onChange])
  useEffect(() => () => { epgToday = [] }, [])
  useSportResults({ day: merge ? day : null, epg: epg ?? EMPTY })
  return null
}
const EMPTY: SportMatch[] = []

/** Soffläges sportyta: registrerar `sport` hos värden och meddelar telefonen vid ändringar. */
export function SportCouchMount() {
  // Äldre app: SDK:t saknar Soffläge, och då görs ingenting.
  const enabled = typeof hasCouchSdk === 'function' && hasCouchSdk()
  const { tt, locale } = useTvText()
  useEffect(() => { text = { tt, locale } }, [tt, locale])
  const [present, setPresent] = useState(hasCouchPresence)
  const [watching, setWatching] = useState(tvShowsSportish)
  const notifyRef = useRef<() => void>(() => {})
  const [notify] = useState(() => () => notifyRef.current())

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | null = null
    notifyRef.current = () => {
      if (timer) return
      timer = setTimeout(() => { timer = null; notifyCouchSurface('sport') }, NOTIFY_MS)
    }
    const off = registerCouchSurface('sport', {
      snapshot: snapshotNow,
      run: (cmd) => runSportCommand(cmd, deps),
      query: (q) => answerSportQuery(q, deps),
    })
    // Controllern byts när nyckeln eller källan ändras: flytta onMerged till den nya.
    let controller: ResultsController | null = null
    let offMerged: (() => void) | null = null
    const watchController = () => {
      const c = currentResults()
      if (c === controller) return
      offMerged?.()
      controller = c
      offMerged = c ? c.onMerged(notify) : null
    }
    watchController()
    const subs = [
      onPlayingChannelChanged(() => { setWatching(tvShowsSportish()); notify() }),
      onCouchMarksChanged(() => { setWatching(tvShowsSportish()); notify() }),
      onPresenceChanged(() => { setPresent(hasCouchPresence()); notify() }),
      onPluginStorageChanged(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, notify),
      // Följda lag ändrar "följt" i bilden (och Följer-listan på telefonen).
      onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, notify),
      onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, () => { watchController(); notify() }),
      // Nytt eller stängt mål (TV:n eller en telefon): alla telefoner får samma lista.
      onGoalsChanged(notify),
      // Spoilerskyddet: ny repris, Visa resultat (telefon eller TV) eller utgånget visat på TV:n.
      onSpoilerChanged(notify),
      onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPOILER_TV_KEY, notify),
    ]
    // Utgångna mål rensas när bilden byggs; utan annan ändring skulle telefonerna inte få veta det.
    const goalSweep = setInterval(() => { openGoals(Date.now()) }, SWEEP_MS)
    return () => {
      off()
      subs.forEach((u) => u())
      clearInterval(goalSweep)
      offMerged?.()
      if (timer) clearTimeout(timer)
      notifyRef.current = () => {}
    }
  }, [enabled, notify])

  // Sopar bort tysta telefoner (låst skärm, tappat wifi) medan någon är närvarande.
  useEffect(() => {
    if (!enabled || !present) return
    const sweep = setInterval(() => sweepPresence(Date.now()), SWEEP_MS)
    return () => clearInterval(sweep)
  }, [enabled, present])

  return enabled && (present || watching) ? <SportCouchFeeder onChange={notify} merge={present} /> : null
}
