'use client'

import { useEffect } from 'react'
import { requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { tryNativeNotification } from '../reminders'
import { encodeChannelParams } from '../live-tv-shell'
import { pushToast } from '../toast-center'
import { useTvText } from '../tv/tv-strings'
import { onGoal, type GoalEvent } from './goal-events'
import { goalAlertWanted, goalBody, goalTitle, matchForGoal, playingChannel } from './goal-alerts'
import { currentResults } from './results-controller'
import { rankedSources } from './sport-day-model'
import { getFollows, getOverrides, getSportSettings } from './sport-store'
import { sourceChannel } from './sport-model'

/** Målnotis medan appen körs (native och banner), på samma sätt som påminnelserna. */
export function SportGoalMount() {
  const { tt } = useTvText()
  useEffect(() => onGoal((e) => {
    const match = matchForGoal(e, currentResults()?.merged() ?? [])
    if (!match || !goalAlertWanted(match, getSportSettings(), getFollows())) return
    if (match.sources.some((s) => s.channelKey === playingChannel())) return
    tryNativeNotification(goalTitle(e, tt), goalBody(e))
    const source = rankedSources(match, getOverrides())[0]
    // Notisen ritas av påminnelsernas stapel (toast-center.tsx): fjärrbar på TV, Titta och Stäng.
    pushToast({
      title: goalTitle(e, tt),
      body: goalBody(e) || null,
      ...(source ? { watchLabel: tt('sportWatch'), onWatch: () => requestOpenBrowsePage({ pageId: 'live-tv-browse', params: { view: 'channel', autoplay: '1', ...encodeChannelParams(sourceChannel(source)) } }) } : {}),
      dismissLabel: tt('sportClose'),
      timeoutMs: 20_000,
    })
  }), [tt])
  return null
}
