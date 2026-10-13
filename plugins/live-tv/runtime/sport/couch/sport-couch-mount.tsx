'use client'

import { useEffect, useRef, useState } from 'react'
import { hasCouchSdk, notifyCouchSurface, onPluginStorageChanged, registerCouchSurface, requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import { MULTIVIEW_KEY, getMultiviewState } from '../../tv/tv-multiview-store'
import { onPlayingChannelChanged, playingChannel } from '../goal-alerts'
import type { ProviderId } from '../provider'
import { currentResults, useSportResults, type ResultsController } from '../results-controller'
import { localDayKey, useSportDay } from '../sport-epg'
import type { SportMatch } from '../sport-model'
import { SPORT_SETTINGS_KEY, getFollows, getOverrides } from '../sport-store'
import { answerSportQuery, runSportCommand, type SportDeps } from './commands'
import { couchMarks, onCouchMarksChanged } from './context'
import { hasCouchPresence, onPresenceChanged, sweepPresence } from './presence'
import { buildCouchSport } from './snapshot'

const NOTIFY_MS = 250
const SWEEP_MS = 15_000
const CLOCK_MS = 60_000
/** Dagens EPG-matcher ur feedern: bildens källa när controllern saknas (ingen nyckel). */
let epgToday: SportMatch[] = []

function audioChannel(): string | null {
  const mv = getMultiviewState()
  return mv.tiles[mv.audioIndex] ?? null
}

function snapshotNow() {
  const c = currentResults()
  return buildCouchSport({
    matches: c ? c.merged() : epgToday,
    playing: playingChannel(),
    marks: couchMarks(),
    audioChannel: audioChannel(),
    follows: getFollows(),
    overrides: getOverrides(),
    hasKey: !!c,
    updatedAt: c?.lastLiveAt ?? null,
    now: Date.now(),
  })
}

/** Matchdetaljen: samma ref som matchinfon (use-fixture-detail.ts). Repriser och avslutade bara ur cachen. */
function loadDetail(m: SportMatch) {
  const c = currentResults()
  if (!c || m.coverage !== 'full') return Promise.resolve(null)
  const ref = m.rerun ? m.replayOf?.fixture ?? null : m.fixture
  if (!ref) return Promise.resolve(null)
  const fr = { provider: ref.provider as ProviderId, id: ref.id }
  return m.rerun || m.status === 'finished' ? c.cachedFixture(m.kind, fr) : c.loadFixture(m.kind, fr, false)
}

const deps: SportDeps = {
  matches: () => currentResults()?.merged() ?? epgToday,
  focusId: () => snapshotNow().focus?.id ?? null,
  overrides: getOverrides,
  open: (t) => requestOpenBrowsePage(t),
  detail: loadDetail,
  now: () => Date.now(),
}

/** Håller dagens matcher sammanslagna medan en telefon visar sportfliken (spec 4). */
function SportCouchFeeder({ onChange }: { onChange: () => void }) {
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
    onChange()
  }, [epg, onChange])
  useEffect(() => () => { epgToday = [] }, [])
  useSportResults({ day, epg: epg ?? EMPTY })
  return null
}
const EMPTY: SportMatch[] = []

/** Soffläges sportyta: registrerar `sport` hos värden och meddelar telefonen vid ändringar. */
export function SportCouchMount() {
  // Äldre app: SDK:t saknar Soffläge, och då görs ingenting.
  const enabled = typeof hasCouchSdk === 'function' && hasCouchSdk()
  const [present, setPresent] = useState(hasCouchPresence)
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
      onPlayingChannelChanged(notify),
      onCouchMarksChanged(notify),
      onPresenceChanged(() => { setPresent(hasCouchPresence()); notify() }),
      onPluginStorageChanged(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, notify),
      onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, () => { watchController(); notify() }),
    ]
    return () => {
      off()
      subs.forEach((u) => u())
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

  return enabled && present ? <SportCouchFeeder onChange={notify} /> : null
}
