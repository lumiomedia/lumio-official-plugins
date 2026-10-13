'use client'

import { useEffect } from 'react'
import { requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { tryNativeNotification } from '../reminders'
import { encodeChannelParams } from '../live-tv-shell'
import { dismissToast, pushToast } from '../toast-center'
import { getMultiviewState } from '../tv/tv-multiview-store'
import { useTvText } from '../tv/tv-strings'
import { couchMarks } from './couch/context'
import { addGoal, dismissGoal, goalFromEvent, GOAL_TOAST_MS, onGoalsChanged, openGoals, shouldCard } from './couch/goals'
import { onGoal } from './goal-events'
import { goalBody, goalTitle, matchForGoal, playingChannel } from './goal-alerts'
import { currentResults } from './results-controller'
import { rankedSources } from './sport-day-model'
import { getFollows, getOverrides, getSportSettings } from './sport-store'
import { sourceChannel } from './sport-model'

/** Multiviews ljudruta, bara medan Multiview faktiskt visas. */
function audioChannel(): string | null {
  if (!couchMarks().multiview) return null
  const mv = getMultiviewState()
  return mv.tiles[mv.audioIndex] ?? null
}

/**
 * Målnotis medan appen körs (native och toast), och Soffläges målregister:
 * samma mål är kortet på telefonerna och toasten på TV:n (handoff 2a). Ett
 * aktivt val på TV:n (Byt till eller Stäng) stänger målet överallt; stänger
 * en telefon det försvinner toasten här också. Tidsgränsen stänger bara toasten.
 */
export function SportGoalMount() {
  const { tt } = useTvText()
  useEffect(() => {
    const toastFor = new Map<string, string>()
    const offGoal = onGoal((e) => {
      const match = matchForGoal(e, currentResults()?.merged() ?? [])
      if (!match) return
      const ctx = { playing: playingChannel(), audioChannel: audioChannel(), settings: getSportSettings(), follows: getFollows() }
      if (!shouldCard(match, ctx)) return
      const overrides = getOverrides()
      const goal = goalFromEvent(e, match, overrides)
      if (toastFor.has(goal.goalId)) return
      addGoal(goal, Date.now())
      tryNativeNotification(goalTitle(e, tt), goalBody(e))
      const source = rankedSources(match, overrides)[0]
      const title = `${goal.team.name} ${goal.score[0]}–${goal.score[1]}${goal.minute ? ` · ${goal.minute}` : ''}`
      // Notisen ritas av påminnelsernas stapel (toast-center.tsx): fjärrbar på TV, Byt till och Stäng.
      const id = pushToast({
        look: 'goal',
        badge: goal.team.short,
        kicker: tt('couchGoalKicker'),
        title,
        body: [tt('sportVs', { opponent: goal.opponent }), goal.channel].filter(Boolean).join(' · '),
        ...(source ? {
          watchLabel: tt('couchGoalSwitch'),
          onWatch: () => {
            dismissGoal(goal.goalId)
            requestOpenBrowsePage({ pageId: 'live-tv-browse', params: { view: 'channel', autoplay: '1', ...encodeChannelParams(sourceChannel(source)) } })
          },
        } : {}),
        onDismiss: () => dismissGoal(goal.goalId),
        dismissLabel: tt('sportClose'),
        timeoutMs: GOAL_TOAST_MS,
      })
      toastFor.set(goal.goalId, id)
    })
    // En telefon stängde målet (eller det gick ut): ta bort toasten om den fortfarande syns.
    const offGoals = onGoalsChanged(() => {
      const open = new Set(openGoals(Date.now()).map((g) => g.goalId))
      for (const [goalId, toastId] of toastFor) {
        if (open.has(goalId)) continue
        toastFor.delete(goalId)
        dismissToast(toastId)
      }
    })
    return () => { offGoal(); offGoals() }
  }, [tt])
  return null
}
