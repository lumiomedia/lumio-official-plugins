'use client'

import { useEffect, useState } from 'react'
import { TV, dp, station } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { onGoal, type GoalEvent } from '../goal-events'
import { goalAlertWanted, goalBody, matchForGoal } from '../goal-alerts'
import { useResultsController } from '../results-controller'
import { rankedSources } from '../sport-day-model'
import { getFollows, getOverrides, getSportSettings } from '../sport-store'
import { sourceChannel, type SportMatch } from '../sport-model'
import type { M3uChannel } from '../../live-tv-data'

const SHOW_MS = 6_000

export function PlayerGoalOverlay({ channelKey, onJump }: { channelKey: string; onJump(channel: M3uChannel): void }) {
  const { tt } = useTvText()
  const controller = useResultsController()
  const [shown, setShown] = useState<{ e: GoalEvent; match: SportMatch; here: boolean } | null>(null)

  useEffect(() => onGoal((e) => {
    const match = controller ? matchForGoal(e, controller.merged()) : null
    if (!match) return
    const here = match.sources.some((s) => s.channelKey === channelKey)
    if (!here && !goalAlertWanted(match, getSportSettings(), getFollows())) return
    setShown({ e, match, here })
  }), [controller, channelKey])

  useEffect(() => {
    if (!shown) return
    const t = setTimeout(() => setShown(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [shown])

  if (!shown) return null
  const { e, match, here } = shown
  const target = !here ? rankedSources(match, getOverrides())[0] : undefined
  return (
    <div data-live-tv-goal-overlay="" role="status" style={{ position: 'absolute', top: dp(40), left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'flex', alignItems: 'center', gap: dp(20), padding: `${dp(16)}px ${dp(24)}px`, borderRadius: dp(16), background: TV.panel, border: `1px solid ${TV.lineStrong}`, color: TV.text }}>
      <span style={{ fontSize: dp(34), fontWeight: 800, color: TV.live, letterSpacing: '0.04em' }}>{tt('sportGoal')}</span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: dp(22), fontWeight: 600 }}>{`${e.home} ${e.score.home}–${e.score.away} ${e.away}`}</span>
        {goalBody(e) ? <span style={{ fontSize: dp(16), color: TV.muted }}>{goalBody(e)}</span> : null}
      </span>
      {target ? (
        <div {...station(() => { setShown(null); onJump(sourceChannel(target)) })} style={{ padding: `${dp(8)}px ${dp(14)}px`, borderRadius: dp(10), background: TV.text, color: '#0e0f13', fontWeight: 600, cursor: 'pointer' }}>{tt('sportJumpThere')}</div>
      ) : null}
    </div>
  )
}
