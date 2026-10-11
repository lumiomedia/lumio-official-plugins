'use client'

import { useEffect, useState } from 'react'
import { TV, dp } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { onGoal } from '../goal-events'
import { rateLine } from '../rate-line'
import { API_SPORTS_REGISTER_URL } from '../api-sports'
import { showsScore } from '../score-model'
import type { RateStatus } from '../results-controller'
import type { SportMatch } from '../sport-model'

export { showsScore, scoreText, matchStatusLabel, heroStatusLine } from '../score-model'

const SCORE_SIZE = { hero: dp(64), card: dp(28), row: dp(20) } as const

export function MatchScore({ match, size = 'card' }: { match: SportMatch; size?: 'hero' | 'card' | 'row' }) {
  const blink = useGoalBlink(match)
  if (!showsScore(match) || !match.score) return null
  return (
    <span data-testid="match-score" style={{ fontSize: SCORE_SIZE[size], fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: blink ? TV.live : TV.text, transition: 'color 300ms' }}>
      {match.score.home}–{match.score.away}
    </span>
  )
}

export function ResultOnlyTag() {
  const { tt } = useTvText()
  return <span style={{ fontSize: dp(14), color: TV.dim }}>{tt('sportResultOnly')}</span>
}

const BLINK_MS = 10_000

export function useGoalBlink(match: SportMatch): boolean {
  const [until, setUntil] = useState(0)
  const id = match.fixture?.id ?? null
  useEffect(() => (id ? onGoal((e) => { if (e.fixtureId === id) setUntil(Date.now() + BLINK_MS) }) : undefined), [id])
  useEffect(() => {
    if (!until) return
    const t = setTimeout(() => setUntil(0), Math.max(0, until - Date.now()) + 1)
    return () => clearTimeout(t)
  }, [until])
  return until > Date.now()
}

/** Den tysta takt-raden. "Snabbare med betald nyckel" är en länk utanför TV och text på TV. */
export function RateLineView({ status, tv }: { status: RateStatus; tv: boolean }) {
  const { tt, lang, locale } = useTvText()
  const line = rateLine(status, tt, { lang, locale })
  if (!line) return null
  return (
    <div data-testid="sport-rate-line" style={{ fontSize: dp(14), color: TV.faint, display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
      <span>{line.text}</span>
      {line.showPaidLink
        ? tv
          ? <span>· {tt('sportRateFaster')}</span>
          : <a href={API_SPORTS_REGISTER_URL} target="_blank" rel="noreferrer" style={{ color: TV.dim }}>{tt('sportRateFaster')}</a>
        : null}
    </div>
  )
}
