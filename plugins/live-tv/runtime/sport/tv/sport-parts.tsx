'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { formatClock, progressOf } from '../../live-tv-ui'
import { ChannelArt, Tag, TV, dp, station } from '../../tv/tv-ui'
import { matchTitle, sourceChannel, type SportMatch } from '../sport-model'
import { followState, leagueColor, matchdayStrip, rankedSources, statusAt } from '../sport-day-model'
import { sourceLine, type SportCtx } from '../sport-ctx'
import { matchStatusLabel } from '../score-model'
import { MatchScore, ResultOnlyTag } from './sport-score'
import { SportIcon, SportIcons } from './sport-icons'
import { focusAttr, sportCardStyle } from '../surface'
import { Crest } from '../crest'

export { Crest }

export const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
export const overline: CSSProperties = { fontSize: dp(15), fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TV.dim }
export const sectionTitle: CSSProperties = { fontSize: dp(28), fontWeight: 600 }
export const primaryBtn: CSSProperties = {
  height: dp(60), minHeight: dp(60), padding: `0 ${dp(28)}px`, borderRadius: dp(14), background: TV.acc, color: TV.onAcc,
  display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(20), fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
}
export const secondaryBtn: CSSProperties = { ...primaryBtn, background: TV.s12, color: TV.text, border: `1px solid ${TV.lineCard}` }

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

/** Kortets status som text, inte tagg: orange minut/LIVE när det pågår, annars klockslag eller SLUT. */
export function statusText(match: SportMatch, ctx: SportCtx): { text: string; live: boolean } {
  const st = statusAt(match, ctx.now)
  const label = matchStatusLabel(match, ctx.tt)
  if (st === 'live') return { text: label ?? ctx.tt('live'), live: true }
  if (st === 'finished') return { text: label ?? ctx.tt('sportEnded'), live: false }
  return { text: label ?? formatClock(match.start, ctx.locale), live: false }
}

/**
  Matchkortet som en Guide-bricka: kanalens logga (bästa källan) eller
  sportens ikon som ankare till vänster, lagmärkena bredvid varandra med
  titeln och ställningen, en metarad (status · liga · kanal) och förloppet
  som kortets underkant. OK = matchinfo, håll = titta direkt.
*/
/** `fluid`: kortet fyller sin cell (rutnätet) i stället för remsans fasta bredd. */
export function MatchCard({ match, ctx, fluid = false }: { match: SportMatch; ctx: SportCtx; fluid?: boolean }) {
  const st = statusAt(match, ctx.now)
  const followed = followState(match, ctx.follows).any
  const reminded = ctx.isReminded(match)
  const best = rankedSources(match, ctx.overrides)[0] ?? null
  const status = statusText(match, ctx)
  const progress = st === 'live' ? progressOf(match.start, match.stop, ctx.now) : st === 'finished' ? 1 : 0
  return (
    <div data-testid="sport-card" data-match-id={match.id} data-status={st} {...station(() => ctx.openMatch(match), () => ctx.watch(match), focusAttr('card'))} style={{ ...sportCardStyle, position: 'relative', width: fluid ? '100%' : dp(450), minWidth: 0, flexShrink: 0, padding: `${dp(14)}px ${dp(16)}px ${dp(16)}px`, display: 'flex', alignItems: 'center', gap: dp(14), cursor: 'pointer', boxSizing: 'border-box' }}>
      <div data-testid="card-anchor" style={{ width: dp(84), height: dp(84), flexShrink: 0, borderRadius: dp(12), overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: TV.s06, color: TV.muted }}>
        {best ? <ChannelArt channel={sourceChannel(best)} style={{ width: '100%', height: '100%' }} radius={dp(12)} /> : <SportIcon kind={match.kind} size={dp(40)} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(6) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(8), minWidth: 0 }}>
          {match.home && match.away ? (
            <span style={{ display: 'flex', gap: dp(4), flexShrink: 0 }}>
              <Crest name={match.home} colorKey={match.homeKey ?? match.home} size={dp(30)} src={match.homeCrest} />
              <Crest name={match.away} colorKey={match.awayKey ?? match.away} size={dp(30)} src={match.awayCrest} />
            </span>
          ) : null}
          <span style={{ flex: 1, minWidth: 0, fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{matchTitle(match)}</span>
          <MatchScore match={match} size="row" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(8), fontSize: dp(15), color: TV.muted, minWidth: 0 }}>
          <span data-testid="card-status" data-live={status.live ? '1' : '0'} style={{ flexShrink: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: status.live ? TV.acc : TV.text }}>{status.text}</span>
          <span style={{ ...ellipsis, flex: 1 }}>{match.league || ctx.kindLabel(match.kind)}</span>
          {followed ? <span data-testid="card-followed" style={{ color: TV.acc, display: 'inline-flex' }}><SportIcons.Heart size={dp(18)} filled /></span> : null}
          {reminded ? <span data-testid="card-reminded" style={{ display: 'inline-flex' }}><SportIcons.Bell size={dp(18)} /></span> : null}
        </div>
        <div style={{ fontSize: dp(15), color: TV.dim, ...ellipsis }}>{match.resultOnly ? <ResultOnlyTag /> : sourceLine(match, ctx)}</div>
      </div>
      <div data-testid="card-progress" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: dp(4), background: TV.s08 }}>
        <div data-fill="" style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: st === 'finished' ? TV.s18 : TV.acc }} />
      </div>
    </div>
  )
}

/**
  Matchdagens matcher i EN tidsordnad rad (ersätter Live nu / Senare /
  Avslutade): det som startat, nu-markören, det som kommer. Raden rullas
  fram till första pågående match (annars första kommande) när den visas.
*/
/**
 * Matcherna som rutnät (TV:ns Matcher-flik i Matchdag, Jerry 2026-10-12): korten
 * radbryts i tidsordning i stället för en lång vågrät remsa, så fjärrens
 * ▴▾◂▸ rör sig i rutnätet.
 */
export const GRID_MIN_CARD = 420

export function MatchGrid({ matches, ctx, testId = 'sport-grid' }: { matches: SportMatch[]; ctx: SportCtx; testId?: string }) {
  const items = matchdayStrip(matches, ctx.now).items
  if (items.length === 0) return null
  return (
    // Så många kolumner som får plats (minst 420 designpx per kort) och korten sträcks ut: 4 i 1920-scenen, fler på bredare.
    <section data-testid={testId} data-grid="" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${dp(GRID_MIN_CARD)}px, 1fr))`, gap: dp(16) }}>
      {items.map((m) => <MatchCard key={m.id} match={m} ctx={ctx} fluid />)}
    </section>
  )
}

export function MatchStrip({ title, matches, ctx, testId = 'sport-strip' }: { title: string; matches: SportMatch[]; ctx: SportCtx; testId?: string }) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const strip = matchdayStrip(matches, ctx.now)
  const focusId = strip.items[strip.focusIndex]?.id ?? null
  useEffect(() => {
    const row = rowRef.current
    if (!row || !focusId) return
    const card = row.querySelector<HTMLElement>(`[data-match-id="${focusId.replace(/"/g, '\\"')}"]`)
    if (!card) return
    // Sätt rullningen direkt: scrollIntoView kan dra med sig hela sidan lodrätt.
    row.scrollLeft = Math.max(0, card.offsetLeft - row.offsetLeft - dp(80))
  }, [focusId])
  if (matches.length === 0) return null
  const now = (
    <div key="now-marker" data-testid="sport-strip-now" aria-hidden="true" style={{ flexShrink: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(6), padding: `0 ${dp(2)}px` }}>
      <span style={{ fontSize: dp(13), fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: TV.acc, whiteSpace: 'nowrap' }}>{ctx.tt('gridNowAt', { time: formatClock(ctx.now, ctx.locale) })}</span>
      <span style={{ flex: 1, width: dp(3), borderRadius: dp(3), background: TV.acc, boxShadow: `0 0 ${dp(8)}px ${TV.acc}` }} />
    </div>
  )
  const cells = strip.items.map((m) => <MatchCard key={m.id} match={m} ctx={ctx} />)
  cells.splice(strip.nowIndex, 0, now)
  return (
    <section data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: dp(12) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12) }}>
        <span style={sectionTitle}>{title}</span>
        <span style={{ fontSize: dp(17), color: TV.dim }}>{matches.length}</span>
      </div>
      {/* Luft runt korten innanför rullningen så att fokusringen (3 px utanför
          kortet) inte klipps på första och sista kortet; marginalen tar
          tillbaka luften så korten står kvar där de stod. */}
      <div ref={rowRef} data-row="" style={{ display: 'flex', gap: dp(16), overflowX: 'auto', padding: dp(6), margin: `-${dp(6)}px -${dp(6)}px 0` }}>
        {cells}
      </div>
    </section>
  )
}

export function Notice({ text, testId }: { text: ReactNode; testId?: string }) {
  return <div data-testid={testId} style={{ ...sportCardStyle, padding: `${dp(28)}px ${dp(32)}px`, fontSize: dp(20), color: TV.muted }}>{text}</div>
}
