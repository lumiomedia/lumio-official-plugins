'use client'

import { useEffect, useState } from 'react'
import { formatClock } from '../../live-tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { TV } from '../../tv/tv-ui'
import { Crest } from '../crest'
import { matchTitle, type SportMatch } from '../sport-model'
import { localDayKey } from '../sport-epg'
import { revealedReplayScore, scoreHidden } from '../score-model'
import { useSpoilerVersion } from '../couch/spoiler'
import { hasCouchPresence, onPresenceChanged } from '../couch/presence'
import { SportIcons } from '../sport-icons'

/*
  Spoilerkromen i spelaren (handoff 2b, skärmdump 13). Två delar:
  - Reprisbrickan uppe till vänster: märkena, ställningen och REPRIS. Med
    spoilerskyddet på ritas en suddad PLATSHÅLLARE (0–0) med ett lås ovanpå;
    det riktiga resultatet finns aldrig i DOM:en (avsteg 6). Brickan är ny,
    spelaren hade ingen ställningsbricka (avsteg 5).
  - Infodelen i bottenfältet: "{LIGA} · {DAG TID}", titeln och, när
    resultatet är dolt, brickan "Resultat dolt · Visa på telefonen" (en
    telefon har sportfliken öppen) eller "· Visa i matchinfo" (avsteg 8).
  Alla mått i designytan via spelarens `ps()`.
*/

type PS = (n: number) => number

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const

function useHidden(match: SportMatch): boolean {
  useSpoilerVersion()
  return scoreHidden(match)
}

function usePresence(): boolean {
  const [present, setPresent] = useState(hasCouchPresence)
  useEffect(() => onPresenceChanged(() => setPresent(hasCouchPresence())), [])
  return present
}

export function PlayerReplayBadge({ match, ps, top }: { match: SportMatch; ps: PS; top: number }) {
  const { tt } = useTvText()
  const hidden = useHidden(match)
  const score = hidden ? null : revealedReplayScore(match)
  return (
    <div data-testid="player-replay-badge" data-hidden={hidden ? '1' : '0'}
      style={{ position: 'absolute', top, left: ps(32), zIndex: 31, display: 'flex', alignItems: 'center', gap: ps(10), height: ps(44), padding: `0 ${ps(8)}px`, borderRadius: ps(12), background: 'rgba(18,18,22,0.72)', border: `1px solid ${TV.lineCard}`, boxSizing: 'border-box', color: TV.text, pointerEvents: 'none', fontFamily: TV.font }}>
      {match.home ? <Crest name={match.home} colorKey={match.homeKey ?? match.home} size={ps(28)} src={match.homeCrest} /> : null}
      {hidden ? (
        <span data-testid="player-replay-score-hidden" aria-label={tt('sportResultHidden')} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Platshållaren, aldrig resultatet: suddningen döljer en form, inte siffrorna. */}
          <span aria-hidden="true" style={{ fontSize: ps(18), fontWeight: 700, fontVariantNumeric: 'tabular-nums', filter: 'blur(7px)', opacity: 0.8 }}>0–0</span>
          <span style={{ position: 'absolute', inset: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><SportIcons.Lock size={ps(16)} /></span>
        </span>
      ) : score ? (
        <span data-testid="player-replay-score" style={{ fontSize: ps(18), fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{`${score.home}–${score.away}`}</span>
      ) : null}
      {match.away ? <Crest name={match.away} colorKey={match.awayKey ?? match.away} size={ps(28)} src={match.awayCrest} /> : null}
      <span data-testid="player-replay-tag" style={{ display: 'inline-flex', alignItems: 'center', height: ps(24), padding: `0 ${ps(8)}px`, borderRadius: ps(6), background: 'rgba(252,252,255,0.16)', fontSize: ps(11), fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{tt('sportReplay')}</span>
    </div>
  )
}

/** "IGÅR 21:00" / "IDAG 13:00" / "LÖR 10 OKT 17:30": originalets avspark. */
export function playedWhen(kickoff: number, now: number, locale: string, tt: (k: 'sportToday' | 'sportYesterday') => string): string {
  const time = formatClock(kickoff, locale)
  const day = localDayKey(kickoff)
  if (day === localDayKey(now)) return `${tt('sportToday')} ${time}`
  if (day === localDayKey(now - 86_400_000)) return `${tt('sportYesterday')} ${time}`
  return `${new Date(kickoff).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\.$/, '')} ${time}`
}

export function PlayerReplayInfo({ match, ps, nowMs, locale }: { match: SportMatch; ps: PS; nowMs: number; locale: string }) {
  const { tt } = useTvText()
  const hidden = useHidden(match)
  const present = usePresence()
  const kickoff = match.replayOf?.kickoff ?? null
  const overline = [match.league, kickoff != null ? playedWhen(kickoff, nowMs, locale, tt) : null].filter(Boolean).join(' · ')
  return (
    <div data-testid="player-replay-info" style={{ display: 'flex', alignItems: 'flex-end', gap: ps(16), marginBottom: ps(10), pointerEvents: 'none' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {overline ? <div data-testid="player-replay-overline" style={{ fontSize: ps(12), fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TV.muted, ...ellipsis }}>{overline}</div> : null}
        <div style={{ fontSize: ps(34), fontWeight: 700, lineHeight: 1.15, ...ellipsis }}>{matchTitle(match)}</div>
      </div>
      {hidden ? (
        <div data-testid="player-replay-hidden" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: ps(8), padding: `${ps(8)}px ${ps(14)}px`, borderRadius: ps(12), background: 'rgba(18,18,22,0.72)', border: `1px solid ${TV.lineCard}`, fontSize: ps(14) }}>
          <SportIcons.Lock size={ps(14)} />
          <span style={{ fontWeight: 600 }}>{tt('sportResultHidden')}</span>
          <span data-testid="player-replay-where" style={{ color: TV.muted }}>· {present ? tt('sportShowOnPhone') : tt('sportShowInInfo')}</span>
        </div>
      ) : null}
    </div>
  )
}
