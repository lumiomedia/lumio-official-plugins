'use client'

import { createElement, type CSSProperties, type ReactNode } from 'react'
import { formatClock, progressOf } from '../../live-tv-ui'
import { station } from '../../tv/tv-ui'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { MIcons } from '../../tv/mobile/mobile-icons'
import { matchTitle, type SportMatch } from '../sport-model'
import { followState, leagueColor, statusAt } from '../sport-day-model'
import { matchStatusLabel, showsScore } from '../score-model'
import { sourceLine, type SportCtx } from '../sport-ctx'
import { Crest } from '../crest'
import { sportBg } from '../surface'

/*
  Telefonens Sport-byggstenar (handoffen "Sport på mobil"): korten, taggarna
  och ikonerna som Översikt, Flöde, Tabeller & resultat och Mina lag delar.
  Ytorna följer kortbakgrundens variabel (`--sport-card-bg`) med handoffens
  rgba(18,18,22,.75) som reserv.
*/

export const P = {
  card: sportBg('rgba(18,18,22,0.75)'),
  line14: 'rgba(255,255,255,0.14)', line16: 'rgba(255,255,255,0.16)', line18: 'rgba(255,255,255,0.18)', line12: 'rgba(255,255,255,0.12)',
  text: '#f3f4f8', muted80: 'rgba(243,244,248,0.8)', muted70: 'rgba(243,244,248,0.7)', muted65: 'rgba(243,244,248,0.65)', muted60: 'rgba(243,244,248,0.6)',
  coral: '#f4845f', coralLight: '#ffd9c9', live: '#fb7185', liveMin: '#fda4af', ring: '#ef4444', ink: '#12152a',
  coralBorder: 'rgba(244,132,95,0.45)', coralSoft: 'rgba(244,132,95,0.22)',
} as const

export const cardStyle: CSSProperties = { background: P.card, border: `1px solid ${P.line14}`, borderRadius: 14, boxSizing: 'border-box' }

/** Telefonens lagmärke: källans bild, annars handoffens färgade initialcirkel. */
export function PhoneTeamCrest({ name, colorKey, src, size }: { name: string; colorKey?: string | null; src?: string | null; size: number }) {
  return <Crest name={name} colorKey={colorKey ?? name} src={src} size={size} />
}

type IconProps = { size?: number }
const svg = (size: number, children: ReactNode, filled = false) =>
  createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }, children)

export const PIcons = {
  Tv: ({ size = 14 }: IconProps) => svg(size, <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="m9 3 3 3 3-3" /></>),
  Table: ({ size = 14 }: IconProps) => svg(size, <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M3.5 14.5h17M9 9.5v10" /></>),
  ListNumbers: ({ size = 14 }: IconProps) => svg(size, <><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 5h1v4M4 15.5c.5-.7 2-.7 2 .3 0 .9-2 1.6-2 3.2h2" /></>),
  Calendar: ({ size = 18 }: IconProps) => svg(size, <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>),
  Rows: ({ size = 18 }: IconProps) => svg(size, <><rect x="4" y="5" width="16" height="6" rx="1.5" /><rect x="4" y="13" width="16" height="6" rx="1.5" /></>),
  Check: ({ size = 16 }: IconProps) => svg(size, <path d="m5 12.5 4.5 4.5L19 7.5" />),
  Warning: ({ size = 18 }: IconProps) => svg(size, <><path d="M12 4 2.8 19.5h18.4z" fill="currentColor" stroke="none" /><path d="M12 10v4.2M12 17h.01" stroke="#12152a" strokeWidth="2" /></>),
  BellOn: ({ size = 14 }: IconProps) => svg(size, <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" fill="currentColor" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  BellOff: ({ size = 14 }: IconProps) => svg(size, <><path d="M6 16V11a6 6 0 0 1 9.3-5" /><path d="M18 10.5V16l1.5 2H8" /><path d="M10 20a2 2 0 0 0 4 0M4 4l16 16" /></>),
  Minus: ({ size = 16 }: IconProps) => svg(size, <path d="M6 12h12" />),
  Grid: ({ size = 20 }: IconProps) => svg(size, <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
}

export function Tag({ text, bg, color = '#fff', testId }: { text: string; bg: string; color?: string; testId?: string }) {
  return <span data-testid={testId} style={{ height: 20, padding: '0 7px', borderRadius: 6, flexShrink: 0, display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', background: bg, color, whiteSpace: 'nowrap' }}>{text}</span>
}

/** Matchens förlopp 0–1: fotbollens minut när källan har den, annars EPG-fönstret. */
export function matchProgress(m: SportMatch, now: number): number {
  const st = statusAt(m, now)
  if (st === 'finished') return 1
  if (st === 'upcoming') return 0
  if (m.kind === 'football' && m.minute != null) return Math.min(m.minute / 90, 1)
  return progressOf(m.start, m.stop, now)
}

/** "LIVE 31'" / "21:00" / "SLUT" — kortets statustagg. */
export function cardTag(m: SportMatch, ctx: SportCtx): { text: string; bg: string; color: string } {
  const st = statusAt(m, ctx.now)
  const label = matchStatusLabel(m, ctx.tt)
  if (st === 'live') {
    const live = ctx.tt('sportLiveShort')
    return { text: label && label !== live ? `${live} ${label}` : live, bg: P.live, color: '#fff' }
  }
  if (st === 'finished') return { text: label ?? ctx.tt('sportEnded'), bg: 'rgba(252,252,255,0.14)', color: P.text }
  return { text: label ?? formatClock(m.start, ctx.locale), bg: P.coralSoft, color: P.coralLight }
}

/**
  Matchkortet i Live nu / Senare idag / Avslutade: liga + status, två lagrader
  med hjärtat vid följda lag och ställningen, 3 px förlopp och kanalraden.
  Följda matcher får korallkant. Hjärtat ersätter handoffens gula stjärna.
*/
export function PhoneMatchCard({ ctx, match: m }: { ctx: SportCtx; match: SportMatch }) {
  const st = statusAt(m, ctx.now)
  const fs = followState(m, ctx.follows)
  const tag = cardTag(m, ctx)
  const score = showsScore(m) ? m.score ?? null : null
  const pct = matchProgress(m, ctx.now)
  const hasChannel = m.sources.length > 0
  const team = (side: 'home' | 'away') => {
    const name = side === 'home' ? m.home! : m.away!
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PhoneTeamCrest name={name} colorKey={side === 'home' ? m.homeKey : m.awayKey} src={side === 'home' ? m.homeCrest : m.awayCrest} size={22} />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, ...ellipsis }}>{name}</span>
        {fs[side] ? <span data-testid="phone-card-heart" style={{ color: P.coral, display: 'inline-flex' }}><MIcons.Heart size={13} filled /></span> : null}
        <span style={{ width: 22, textAlign: 'right', fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{score ? score[side] : ''}</span>
      </div>
    )
  }
  return (
    <div data-testid="sport-phone-card" data-status={st} data-followed={fs.any ? '1' : '0'} {...station(() => ctx.openMatch(m))}
      style={{ ...cardStyle, border: `1px solid ${fs.any ? P.coralBorder : P.line14}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px 0' }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: leagueColor(m.leagueKey || m.kind), flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, color: P.muted70, ...ellipsis }}>{m.league || ctx.kindLabel(m.kind)}</span>
        <Tag testId="sport-phone-card-tag" text={tag.text} bg={tag.bg} color={tag.color} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 12px 10px' }}>
        {m.home && m.away ? <>{team('home')}{team('away')}</> : <span style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</span>}
      </div>
      <div style={{ height: 3, background: 'rgba(252,252,255,0.1)' }}>
        <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: st === 'live' ? P.live : 'rgba(243,244,248,0.35)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', fontSize: 12, color: hasChannel ? P.muted80 : 'rgba(243,244,248,0.55)' }}>
        {hasChannel ? <PIcons.Tv /> : <PIcons.ListNumbers />}
        <span style={{ flex: 1, ...ellipsis }}>{hasChannel ? sourceLine(m, ctx) : ctx.tt('sportResultOnly')}</span>
        {ctx.isReminded(m) ? <span data-testid="sport-phone-card-bell" style={{ color: P.coralLight, display: 'inline-flex' }}><PIcons.BellOn /></span> : null}
      </div>
    </div>
  )
}

/** Rubrik för en sektion: färgad prick, titel 18/600 och antal. */
export function SectionHead({ dot, title, sub, testId }: { dot?: string; title: string; sub?: string; testId?: string }) {
  return (
    <div data-testid={testId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {dot ? <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} /> : null}
      <span style={{ fontSize: 18, fontWeight: 600 }}>{title}</span>
      {sub ? <span style={{ fontSize: 13, color: P.muted60 }}>{sub}</span> : null}
    </div>
  )
}
