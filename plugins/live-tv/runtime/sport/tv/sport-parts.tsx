'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { getPluginHttpAssetUrl } from '@/lib/plugin-sdk'
import { formatClock, progressOf } from '../../live-tv-ui'
import { Progress, Tag, TV, cardStyle, dp, station } from '../../tv/tv-ui'
import { crestText, matchTitle, type SportMatch } from '../sport-model'
import { crestColor, followState, leagueColor, statusAt } from '../sport-day-model'
import { sourceLine, type SportCtx } from '../sport-ctx'
import { matchStatusLabel, showsScore } from '../score-model'
import { MatchScore, ResultOnlyTag } from './sport-score'
import { SportIcons } from './sport-icons'

export const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
export const overline: CSSProperties = { fontSize: dp(15), fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TV.dim }
export const sectionTitle: CSSProperties = { fontSize: dp(28), fontWeight: 600 }
export const primaryBtn: CSSProperties = {
  height: dp(60), minHeight: dp(60), padding: `0 ${dp(28)}px`, borderRadius: dp(14), background: TV.acc, color: TV.onAcc,
  display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
}
export const secondaryBtn: CSSProperties = { ...primaryBtn, background: TV.s12, color: TV.text, border: `1px solid ${TV.lineCard}` }

/** Handoffens initialcirkel. Med `src` (källans märke) ritas märket via appens bildcache i stället. */
export function Crest({ name, colorKey, size = dp(56), src }: { name: string; colorKey: string; size?: number; src?: string | null }) {
  const [broken, setBroken] = useState(false)
  const url = src && !broken ? getPluginHttpAssetUrl('/api/m3u-logo', src) : null
  if (url) {
    return <img data-crest="" src={url} alt="" width={size} height={size} onError={() => setBroken(true)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
  }
  return (
    <span data-crest="" aria-hidden="true" style={{ width: size, height: size, borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: crestColor(colorKey), color: '#fff', fontSize: Math.round(size * 0.32), fontWeight: 700, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)' }}>
      {crestText(name)}
    </span>
  )
}

export function LeagueDot({ leagueKey, size = dp(12) }: { leagueKey: string; size?: number }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: dp(3), background: leagueColor(leagueKey), flexShrink: 0 }} />
}

export function StatusTag({ match, ctx }: { match: SportMatch; ctx: SportCtx }) {
  const st = statusAt(match, ctx.now)
  const label = matchStatusLabel(match, ctx.tt) // null utan fixtur: fas 1:s egen status
  if (st === 'live') return <Tag variant="live">{label ?? ctx.tt('live')}</Tag>
  if (st === 'finished') return <Tag variant="neutral">{label ?? ctx.tt('sportEnded')}</Tag>
  return <Tag variant="neutral">{label ?? formatClock(match.start, ctx.locale)}</Tag>
}

function TeamCell({ name, colorKey, align, crest }: { name: string; colorKey: string; align: 'start' | 'end'; crest?: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'end' ? 'flex-end' : 'flex-start', gap: dp(10), minWidth: 0, flexDirection: align === 'end' ? 'row' : 'row-reverse' }}>
      <span style={{ fontSize: dp(18), fontWeight: 600, ...ellipsis }}>{name}</span>
      <Crest name={name} colorKey={colorKey} size={dp(42)} src={crest} />
    </div>
  )
}

/** Matchkortet (handoff 300 px på 1280-scenen): OK = matchcenter, håll = titta direkt. */
export function MatchCard({ match, ctx }: { match: SportMatch; ctx: SportCtx }) {
  const st = statusAt(match, ctx.now)
  const followed = followState(match, ctx.follows).any
  const reminded = ctx.isReminded(match)
  return (
    <div data-testid="sport-card" data-match-id={match.id} {...station(() => ctx.openMatch(match), () => ctx.watch(match))} style={{ ...cardStyle, width: dp(450), flexShrink: 0, padding: `${dp(16)}px ${dp(18)}px`, display: 'flex', flexDirection: 'column', gap: dp(12), cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(15), color: TV.muted }}>
        <LeagueDot leagueKey={match.leagueKey || match.kind} />
        <span style={{ ...ellipsis, flex: 1 }}>{match.league || ctx.kindLabel(match.kind)}</span>
        <StatusTag match={match} ctx={ctx} />
      </div>
      {match.home && match.away ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: dp(12) }}>
          <TeamCell name={match.home} colorKey={match.homeKey ?? match.home} align="end" crest={match.homeCrest} />
          {showsScore(match) ? <MatchScore match={match} size="card" /> : <span style={{ fontSize: dp(16), color: TV.dim }}>–</span>}
          <TeamCell name={match.away} colorKey={match.awayKey ?? match.away} align="start" crest={match.awayCrest} />
        </div>
      ) : (
        <div style={{ fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{matchTitle(match)}</div>
      )}
      <Progress value={st === 'live' ? progressOf(match.start, match.stop, ctx.now) : st === 'finished' ? 1 : 0} height={dp(4)} track={TV.s10} />
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(8), fontSize: dp(15), color: TV.muted }}>
        <span style={{ ...ellipsis, flex: 1 }}>{match.resultOnly ? <ResultOnlyTag /> : sourceLine(match, ctx)}</span>
        {followed ? <span data-testid="card-followed" style={{ color: '#fbbf24', display: 'inline-flex' }}><SportIcons.Star size={dp(18)} filled /></span> : null}
        {reminded ? <span data-testid="card-reminded" style={{ display: 'inline-flex' }}><SportIcons.Bell size={dp(18)} /></span> : null}
      </div>
    </div>
  )
}

export function CardRow({ title, matches, ctx, testId }: { title: string; matches: SportMatch[]; ctx: SportCtx; testId: string }) {
  if (matches.length === 0) return null
  return (
    <section data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: dp(12) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}>
        <span style={sectionTitle}>{title}</span>
        <span style={{ fontSize: dp(17), color: TV.dim }}>{matches.length}</span>
      </div>
      <div data-row="" style={{ display: 'flex', gap: dp(16), overflowX: 'auto', paddingBottom: dp(6) }}>
        {matches.map((m) => <MatchCard key={m.id} match={m} ctx={ctx} />)}
      </div>
    </section>
  )
}

export function Notice({ text, testId }: { text: ReactNode; testId?: string }) {
  return <div data-testid={testId} style={{ ...cardStyle, padding: `${dp(28)}px ${dp(32)}px`, fontSize: dp(20), color: TV.muted }}>{text}</div>
}
