'use client'

import type { CSSProperties, ReactNode } from 'react'
import { getPluginHttpAssetUrl } from '@/lib/plugin-sdk'
import { TV, dp, station } from '../../tv/tv-ui'
import { matchTitle, type SportMatch } from '../sport-model'
import { crestColor, followState, statusAt } from '../sport-day-model'
import { heroStatusLine, playedOnText, showsScore } from '../score-model'
import { timeLine, type SportCtx } from '../sport-ctx'
import { toggleFollow } from '../sport-store'
import { playerInitials } from '../match-info-model'
import { Crest } from '../crest'
import { SportIcons } from '../sport-icons'
import { sportBg } from '../surface'

/*
  Matchinfons byggstenar (skisserna 2026-10-11). Delas av TV, skrivbord och
  telefon: telefonen ritar samma lådträd med en mindre skala (`u`).
*/

export type U = (n: number) => number
export const scaleFor = (phone: boolean): U => (n) => Math.round(dp(n) * (phone ? 0.8 : 1))

export const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
export const overlineStyle = (u: U): CSSProperties => ({ fontSize: u(15), fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TV.dim })
export const rowCard = (u: U): CSSProperties => ({ background: sportBg(TV.s07), border: `1px solid ${TV.lineCard}`, borderRadius: u(14), boxSizing: 'border-box' })

export function Overline({ u, children, center }: { u: U; children: ReactNode; center?: boolean }) {
  return <div style={{ ...overlineStyle(u), textAlign: center ? 'center' : undefined }}>{children}</div>
}

export function IconBtn({ u, testId, on, label, onPress, children }: { u: U; testId: string; on?: boolean; label: string; onPress: () => void; children: ReactNode }) {
  return (
    <div data-testid={testId} {...station(onPress)} aria-pressed={on === undefined ? undefined : on ? 'true' : 'false'} aria-label={label} title={label}
      style={{ width: u(48), height: u(48), flexShrink: 0, borderRadius: u(12), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: on ? TV.accMix(18) : TV.s08, color: on ? TV.acc : TV.muted, border: `1px solid ${on ? TV.accMix(60) : TV.lineCard}`, boxSizing: 'border-box' }}>
      {children}
    </div>
  )
}

/** "● LIVE" som röd pill; annars tid eller SLUT som neutral pill. */
export function StatusPill({ u, match, ctx }: { u: U; match: SportMatch; ctx: SportCtx }) {
  if (match.rerun) return <ReplayPill u={u} ctx={ctx} testId="mc-status" />
  const st = statusAt(match, ctx.now)
  const live = st === 'live'
  const text = live ? ctx.tt('sportLiveShort') : timeLine(match, ctx)
  return (
    <span data-testid="mc-status" data-live={live ? '1' : '0'} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: u(6), height: u(30), padding: `0 ${u(12)}px`, borderRadius: u(8), fontSize: u(15), fontWeight: 700, letterSpacing: '0.06em', background: live ? TV.live : TV.s12, color: TV.text }}>
      {live ? <span aria-hidden="true" style={{ width: u(7), height: u(7), borderRadius: 999, background: TV.text }} /> : null}
      {text}
    </span>
  )
}

/** "REPRIS" som neutral pill (aldrig röd): en redan spelad match som sänds igen. */
export function ReplayPill({ u, ctx, testId = 'replay-pill' }: { u: U; ctx: SportCtx; testId?: string }) {
  return (
    <span data-testid={testId} data-live="0" data-replay="1" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: u(30), padding: `0 ${u(12)}px`, borderRadius: u(8), fontSize: u(15), fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: TV.s12, border: `1px solid ${TV.lineCard}`, color: TV.text, boxSizing: 'border-box' }}>
      {ctx.tt('sportReplay')}
    </span>
  )
}

/** Lagets följ-pill under märket: orange hjärta + "Följer" / "Följ". */
export function FollowPill({ u, testId, on, name, ctx, onToggle }: { u: U; testId: string; on: boolean; name: string; ctx: SportCtx; onToggle: () => void }) {
  const label = on ? ctx.tt('sportFollowingName', { name }) : ctx.tt('sportFollowName', { name })
  return (
    <div data-testid={testId} {...station(onToggle)} aria-pressed={on ? 'true' : 'false'} aria-label={label} title={label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: u(6), height: u(36), padding: `0 ${u(14)}px`, borderRadius: 999, cursor: 'pointer', fontSize: u(15), fontWeight: 700, background: on ? TV.accMix(20) : TV.s10, color: on ? TV.accText : TV.text, border: `1px solid ${on ? TV.accMix(50) : TV.lineCard}`, boxSizing: 'border-box' }}>
      <span style={{ color: TV.acc, display: 'inline-flex' }}><SportIcons.Heart size={u(16)} filled={on} /></span>
      {on ? ctx.tt('sportFollowing') : ctx.tt('sportFollow')}
    </div>
  )
}

/** Märkena, ställningen "2 : 1" och "31' · pågår", och följ-pillen under varje lag. */
export function TeamsHeader({ u, match, ctx, compact = false }: { u: U; match: SportMatch; ctx: SportCtx; compact?: boolean }) {
  const st = statusAt(match, ctx.now)
  const fs = followState(match, ctx.follows)
  const crest = compact ? u(64) : u(84)
  // Repris: originalets slutresultat och datum ("Spelades lör 10 okt"), aldrig minut eller LIVE.
  const status = match.rerun ? playedOnText(match, ctx.tt, ctx.locale) ?? ctx.tt('sportReplay') : heroStatusLine(match, ctx.tt) ?? timeLine(match, ctx)
  const score = match.rerun ? match.replayOf?.score ?? null : showsScore(match) ? match.score ?? null : null
  if (!match.home || !match.away) {
    return (
      <div data-testid="mc-head" style={{ display: 'flex', flexDirection: 'column', gap: u(6) }}>
        <div data-testid="mc-title" style={{ fontSize: u(30), fontWeight: 700, lineHeight: 1.15 }}>{matchTitle(match)}</div>
        <div style={{ fontSize: u(17), fontWeight: 600, color: st === 'live' ? TV.live : TV.muted }}>{status}</div>
      </div>
    )
  }
  const team = (side: 'home' | 'away') => {
    const name = side === 'home' ? match.home! : match.away!
    const key = side === 'home' ? match.homeKey : match.awayKey
    const src = side === 'home' ? match.homeCrest : match.awayCrest
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(8), minWidth: 0 }}>
        <Crest name={name} colorKey={key ?? name} size={crest} src={src} />
        <div style={{ fontSize: u(21), fontWeight: 700, textAlign: 'center', maxWidth: '100%', ...ellipsis }}>{name}</div>
        {key ? <FollowPill u={u} testId={`mc-follow-${side}`} on={fs[side]} name={name} ctx={ctx} onToggle={() => toggleFollow({ sport: match.kind, kind: 'team', key, name, ...(src ? { crest: src } : {}) })} /> : null}
      </div>
    )
  }
  return (
    <div data-testid="mc-head" aria-label={matchTitle(match)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'start', gap: u(12) }}>
      {team('home')}
      <div data-testid="mc-scoreline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(6), paddingTop: u(compact ? 6 : 14) }}>
        {score ? (
          <span data-testid="mc-score" style={{ fontSize: compact ? u(52) : u(64), fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{`${score.home} : ${score.away}`}</span>
        ) : null}
        <span data-testid="mc-status-line" style={{ fontSize: u(17), fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: st === 'live' ? TV.live : TV.muted, whiteSpace: 'nowrap' }}>{status}</span>
      </div>
      {team('away')}
    </div>
  )
}

/** En rad under MATCHEN: ikon, rubrik, sammanfattning till höger och en pil. */
export function DrillRow({ u, testId, icon, label, value, onOpen, init }: { u: U; testId: string; icon: ReactNode; label: string; value?: string | null; onOpen: () => void; init?: boolean }) {
  return (
    <div data-testid={testId} {...station(onOpen, undefined, init ? { 'data-init': '' } : undefined)} style={{ ...rowCard(u), minHeight: u(72), display: 'flex', alignItems: 'center', gap: u(14), padding: `0 ${u(20)}px`, cursor: 'pointer' }}>
      <span style={{ color: TV.muted, display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: u(19), fontWeight: 700, ...ellipsis }}>{label}</span>
      {value ? <span style={{ fontSize: u(16), color: TV.muted, flexShrink: 0 }}>{value}</span> : null}
      <span style={{ color: TV.muted, display: 'inline-flex', flexShrink: 0 }}><SportIcons.Chevron size={u(20)} /></span>
    </div>
  )
}

/** Rund avatar med initialer (färg ur namnet) — eller källans spelarbild när den finns. */
export function PlayerAvatar({ u, name, photo, size }: { u: U; name: string; photo?: string | null; size?: number }) {
  const s = size ?? u(44)
  const url = photo ? getPluginHttpAssetUrl('/api/m3u-logo', photo) : null
  return (
    <span data-avatar="" aria-hidden="true" style={{ width: s, height: s, borderRadius: 999, flexShrink: 0, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: crestColor(name), color: '#fff', fontSize: Math.round(s * 0.32), fontWeight: 700, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} /> : playerInitials(name)}
    </span>
  )
}

/** Undersidans topp: bakåtpil och rubrik. Bakåtpilen är sidans första fokus. */
export function BackBar({ u, title, onBack, label }: { u: U; title: string; onBack: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: u(12) }}>
      <div data-testid="mc-back" {...station(onBack, undefined, { 'data-init': '' })} aria-label={label} title={label}
        style={{ width: u(48), height: u(48), flexShrink: 0, borderRadius: u(12), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: TV.s08, border: `1px solid ${TV.lineCard}`, color: TV.text, boxSizing: 'border-box' }}>
        <SportIcons.Back size={u(22)} />
      </div>
      <span data-testid="mc-page-title" style={{ flex: 1, minWidth: 0, fontSize: u(22), fontWeight: 700, ...ellipsis }}>{title}</span>
    </div>
  )
}
