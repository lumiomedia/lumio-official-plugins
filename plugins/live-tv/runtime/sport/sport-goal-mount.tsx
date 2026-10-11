'use client'

import { useEffect, useState } from 'react'
import { requestOpenBrowsePage } from '@/lib/plugin-sdk'
import { tryNativeNotification } from '../reminders'
import { encodeChannelParams } from '../live-tv-shell'
import { Btn, LT } from '../live-tv-ui'
import { TV } from '../tv/tv-ui'
import { useTvText } from '../tv/tv-strings'
import { onGoal, type GoalEvent } from './goal-events'
import { goalAlertWanted, goalBody, goalTitle, matchForGoal, playingChannel } from './goal-alerts'
import { currentResults } from './results-controller'
import { rankedSources } from './sport-day-model'
import { getFollows, getOverrides, getSportSettings } from './sport-store'
import { sourceChannel, type SportMatch } from './sport-model'

/** Målnotis medan appen körs (native och banner), på samma sätt som påminnelserna. */
export function SportGoalMount() {
  const { tt } = useTvText()
  const [banner, setBanner] = useState<{ e: GoalEvent; match: SportMatch } | null>(null)
  useEffect(() => onGoal((e) => {
    const match = matchForGoal(e, currentResults()?.merged() ?? [])
    if (!match || !goalAlertWanted(match, getSportSettings(), getFollows())) return
    if (match.sources.some((s) => s.channelKey === playingChannel())) return
    tryNativeNotification(goalTitle(e, tt), goalBody(e))
    setBanner({ e, match })
  }), [tt])
  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 20_000)
    return () => window.clearTimeout(t)
  }, [banner])
  if (!banner) return null
  const source = rankedSources(banner.match, getOverrides())[0]
  return (
    <div role="status" style={{ position: 'fixed', right: 20, bottom: 24, zIndex: 400, maxWidth: 380, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: LT.radiusLg, background: TV.panel, border: `1px solid ${LT.line}`, boxShadow: '0 18px 40px rgba(0,0,0,0.45)', color: LT.text }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{goalTitle(banner.e, tt)}</div>
        {goalBody(banner.e) ? <div style={{ fontSize: 12, color: LT.dim }}>{goalBody(banner.e)}</div> : null}
      </div>
      {source ? (
        <Btn variant="primary" small onClick={() => { setBanner(null); requestOpenBrowsePage({ pageId: 'live-tv-browse', params: { view: 'channel', autoplay: '1', ...encodeChannelParams(sourceChannel(source)) } }) }}>{tt('sportWatch')}</Btn>
      ) : null}
    </div>
  )
}
