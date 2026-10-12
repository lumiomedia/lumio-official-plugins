'use client'

import { formatClock } from '../../live-tv-ui'
import { TV, dp, station } from '../../tv/tv-ui'
import { matchTitle, type SportMatch } from '../sport-model'
import { leagueColor, rankedSources } from '../sport-day-model'
import { playedOnText, replayScoreText } from '../score-model'
import type { SportCtx } from '../sport-ctx'
import { ellipsis, sectionTitle } from './sport-parts'
import { SportIcons } from './sport-icons'
import { sportCardStyle } from '../surface'

/** "REPRIS" som neutral tagg (aldrig röd): samma form som kortens statustaggar. */
export function ReplayTag({ ctx }: { ctx: SportCtx }) {
  return (
    <span data-testid="replay-tag" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: dp(28), padding: `0 ${dp(10)}px`, borderRadius: dp(7), fontSize: dp(14), fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: TV.s12, border: `1px solid ${TV.lineCard}`, color: TV.text, boxSizing: 'border-box' }}>
      {ctx.tt('sportReplay')}
    </span>
  )
}

/**
 * REPRISER (Jerry 2026-10-12): redan spelade matcher som sänds igen står i en
 * egen liten grupp sist i dagens lista, både i Matchdag och Flöde — utanför
 * Live nu, rubrikens "N live" och heron. Raden har REPRIS-taggen, sändningens
 * tid, "Spelades lör 10 okt" och originalets slutresultat; OK = matchinfo,
 * håll eller ▶ = titta som vanligt.
 */
export function SportReplays({ ctx, matches }: { ctx: SportCtx; matches: SportMatch[] }) {
  if (matches.length === 0) return null
  return (
    <section data-testid="sport-replays" style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
        <span style={sectionTitle}>{ctx.tt('sportReplays')}</span>
        <span style={{ fontSize: dp(16), color: TV.dim }}>{ctx.tt('sportReplaysSub')}</span>
      </div>
      {matches.map((m) => {
        const best = rankedSources(m, ctx.overrides)[0] ?? null
        const score = replayScoreText(m)
        return (
          <div key={m.id} data-testid="sport-replay-row" data-match-id={m.id} style={{ ...sportCardStyle, display: 'flex', alignItems: 'center', gap: dp(16), padding: `${dp(12)}px ${dp(16)}px`, borderLeft: `${dp(6)}px solid ${leagueColor(m.leagueKey || m.kind)}` }}>
            <ReplayTag ctx={ctx} />
            <span style={{ fontSize: dp(20), fontWeight: 700, width: dp(76), flexShrink: 0, color: TV.muted, fontVariantNumeric: 'tabular-nums' }}>{formatClock(m.start, ctx.locale)}</span>
            <div {...station(() => ctx.openMatch(m), () => ctx.watch(m))} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <div style={{ fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
              <div data-testid="sport-replay-meta" style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{[playedOnText(m, ctx.tt, ctx.locale), m.league || ctx.kindLabel(m.kind), best?.name].filter(Boolean).join(' · ')}</div>
            </div>
            {score ? <span data-testid="sport-replay-score" style={{ fontSize: dp(20), fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: TV.muted, flexShrink: 0 }}>{score}</span> : null}
            {best ? (
              <div data-testid="sport-replay-play" {...station(() => ctx.watch(m))} aria-label={ctx.tt('sportWatch')} style={{ width: dp(52), height: dp(52), minHeight: dp(52), borderRadius: 999, background: TV.s14, color: TV.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <SportIcons.Play size={dp(20)} />
              </div>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
