'use client'

import { formatClock, progressOf } from '../../live-tv-ui'
import { Progress, Tag, TV, dp, station } from '../../tv/tv-ui'
import { crestText, matchTitle, type SportMatch } from '../sport-model'
import { blockShowsLabel, mergeLane, featuredMatch, followState, leagueColor, nextOnYourChannels, rankedSources, statusAt, timelineAxis, timelineRows } from '../sport-day-model'
import { timeLine, type SportCtx } from '../sport-ctx'
import { heroStatusLine, matchStatusLabel, scoreText, showsScore } from '../score-model'
import { MatchScore, ResultOnlyTag, useGoalBlink } from './sport-score'
import { Crest, MatchStrip, LeagueDot, ellipsis, overline, primaryBtn, secondaryBtn } from './sport-parts'
import { SportIcons } from './sport-icons'
import { SPORT_CARD_BG, sportCardStyle } from '../surface'

export function SportMatchday({ ctx, matches, dayFrom }: { ctx: SportCtx; matches: SportMatch[]; dayFrom: number }) {
  const hero = featuredMatch(matches, ctx.follows, ctx.now)
  const next = nextOnYourChannels(matches, ctx.now, hero?.id ?? null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dp(28) }}>
      <div style={{ display: 'flex', gap: dp(20), alignItems: 'stretch' }}>
        {hero ? <SportHero ctx={ctx} match={hero} /> : null}
        <NextOnChannels ctx={ctx} matches={next} />
      </div>
      <MatchdayTimeline ctx={ctx} matches={matches} dayFrom={dayFrom} />
      <MatchStrip title={ctx.tt('sportMatches')} matches={matches} ctx={ctx} />
    </div>
  )
}

function SportHero({ ctx, match }: { ctx: SportCtx; match: SportMatch }) {
  const best = rankedSources(match, ctx.overrides)[0] ?? null
  const st = statusAt(match, ctx.now)
  const followed = followState(match, ctx.follows).any
  const context = [followed ? ctx.tt('sportYouFollow') : null, match.league || ctx.kindLabel(match.kind), match.venue].filter(Boolean).join(' · ')
  return (
    <div data-testid="sport-hero" style={{ ...sportCardStyle, flex: 1, minWidth: 0, borderRadius: dp(20), padding: `${dp(24)}px ${dp(32)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(16), background: `radial-gradient(60% 80% at 50% 0%, ${TV.accMix(14)}, transparent), ${SPORT_CARD_BG}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), fontSize: dp(17), color: TV.muted }}>
        {st === 'live' ? <Tag variant="live">{ctx.tt('live')}</Tag> : null}
        <span>{context}</span>
      </div>
      {match.home && match.away ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: dp(28), width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: dp(18), minWidth: 0 }}>
            <span style={{ fontSize: dp(42), fontWeight: 600, ...ellipsis }}>{match.home}</span>
            <Crest name={match.home} colorKey={match.homeKey ?? match.home} size={dp(84)} src={match.homeCrest} />
          </div>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(4) }}>
            {showsScore(match) ? <MatchScore match={match} size="hero" /> : null}
            <span style={{ fontSize: dp(22), fontWeight: 600, color: st === 'live' ? TV.liveText : TV.muted, whiteSpace: 'nowrap' }}>{heroStatusLine(match, ctx.tt) ?? timeLine(match, ctx)}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(18), minWidth: 0 }}>
            <Crest name={match.away} colorKey={match.awayKey ?? match.away} size={dp(84)} src={match.awayCrest} />
            <span style={{ fontSize: dp(42), fontWeight: 600, ...ellipsis }}>{match.away}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(8) }}>
          <span style={{ fontSize: dp(42), fontWeight: 600 }}>{matchTitle(match)}</span>
          <span style={{ fontSize: dp(22), color: st === 'live' ? TV.liveText : TV.muted }}>{timeLine(match, ctx)}</span>
        </div>
      )}
      {st === 'live' ? <Progress value={match.minute != null && match.kind === 'football' ? Math.min(match.minute / 90, 1) : progressOf(match.start, match.stop, ctx.now)} height={dp(5)} style={{ width: '40%' }} /> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(14), flexWrap: 'wrap', justifyContent: 'center' }}>
        {best ? (
          <div data-testid="sport-hero-watch" {...station(() => ctx.watch(match))} style={primaryBtn}>
            <SportIcons.Play size={dp(20)} />
            {ctx.tt('sportWatchOn', { channel: best.name })}
          </div>
        ) : null}
        <div data-testid="sport-hero-mc" {...station(() => ctx.openMatch(match))} style={secondaryBtn}>{ctx.tt('sportMatchCenter')}</div>
        {match.resultOnly ? <ResultOnlyTag /> : match.sources.length > 0 ? <span style={{ fontSize: dp(16), color: '#86efac' }}>{ctx.tt('sportSources', { n: match.sources.length })}</span> : null}
      </div>
    </div>
  )
}

function NextOnChannels({ ctx, matches }: { ctx: SportCtx; matches: SportMatch[] }) {
  return (
    <div data-testid="sport-next" style={{ ...sportCardStyle, width: dp(450), flexShrink: 0, padding: `${dp(20)}px ${dp(20)}px`, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <span style={overline}>{ctx.tt('sportNextOnChannels')}</span>
      {matches.map((m) => {
        const best = rankedSources(m, ctx.overrides)[0]
        return (
          <div key={m.id} data-testid="sport-next-row" data-match-id={m.id} {...station(() => ctx.openMatch(m), () => ctx.toggleRemind(m))} style={{ display: 'flex', alignItems: 'center', gap: dp(14), padding: `${dp(12)}px ${dp(14)}px`, borderRadius: dp(12), background: TV.s08, border: `1px solid ${TV.line}`, cursor: 'pointer' }}>
            <span style={{ fontSize: dp(24), fontWeight: 700, flexShrink: 0 }}>{formatClock(m.start, ctx.locale)}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
              <div style={{ fontSize: dp(15), color: TV.dim, ...ellipsis }}>{best?.name ?? ''}</div>
            </div>
            {ctx.isReminded(m) ? <span data-testid="next-reminded" style={{ display: 'inline-flex', color: TV.accText }}><SportIcons.Bell size={dp(20)} /></span> : null}
          </div>
        )
      })}
    </div>
  )
}

const LABEL_W = 216

function MatchdayTimeline({ ctx, matches, dayFrom }: { ctx: SportCtx; matches: SportMatch[]; dayFrom: number }) {
  const axis = timelineAxis(matches, dayFrom)
  const rows = timelineRows(matches)
  const span = axis.end - axis.start
  const pct = (t: number) => ((Math.min(Math.max(t, axis.start), axis.end) - axis.start) / span) * 100
  const nowInside = ctx.now >= axis.start && ctx.now <= axis.end
  return (
    <div data-testid="sport-timeline" style={{ ...sportCardStyle, padding: `${dp(20)}px ${dp(24)}px`, display: 'flex', flexDirection: 'column', gap: dp(14) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
        <span style={{ fontSize: dp(26), fontWeight: 600 }}>{ctx.tt('sportMatchday')}</span>
        <span style={{ fontSize: dp(17), color: TV.muted }}>{ctx.tt('sportMatchdayHint')}</span>
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ width: dp(LABEL_W), flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1, height: dp(26) }}>
          {axis.hours.map((h) => <span key={h} style={{ position: 'absolute', left: `${pct(h)}%`, fontSize: dp(15), color: TV.muted }}>{formatClock(h, ctx.locale)}</span>)}
        </div>
      </div>
      {rows.flatMap((row, rowIndex) => row.lanes.map((lane, laneIndex) => (
        <div key={`${row.key}-${laneIndex}`} data-row="" style={{ display: 'flex', alignItems: 'center', height: dp(50), marginTop: laneIndex === 0 && rowIndex > 0 ? dp(10) : 0 }}>
          <div style={{ width: dp(LABEL_W), flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(18), fontWeight: 600, paddingRight: dp(10), boxSizing: 'border-box' }}>
            {laneIndex === 0 ? <><LeagueDot leagueKey={row.key} /><span style={ellipsis}>{row.label || ctx.kindLabel(row.kind)}</span></> : null}
          </div>
          <div style={{ position: 'relative', flex: 1, height: dp(42), background: TV.s05, borderRadius: dp(8) }}>
            {mergeLane(lane).map((m) => <TimelineBlock key={m.id} ctx={ctx} m={m} left={pct(m.start)} width={Math.max(pct(m.stop) - pct(m.start), 1.5)} showLabel={blockShowsLabel(m.stop - m.start, span)} />)}
            {nowInside ? <div aria-hidden="true" style={{ position: 'absolute', top: -dp(4), bottom: -dp(4), left: `${pct(ctx.now)}%`, width: dp(3), background: TV.acc, boxShadow: `0 0 ${dp(8)}px ${TV.acc}` }} /> : null}
          </div>
        </div>
      )))}
    </div>
  )
}

/** Egen komponent: en hook (`useGoalBlink`) får inte ligga i en `map`. */
function TimelineBlock({ ctx, m, left, width, showLabel }: { ctx: SportCtx; m: SportMatch; left: number; width: number; showLabel: boolean }) {
  const blink = useGoalBlink(m)
  const st = statusAt(m, ctx.now)
  const base = m.home && m.away ? `${crestText(m.home)}–${crestText(m.away)}` : matchTitle(m)
  const tail = scoreText(m) ?? (st === 'finished' ? matchStatusLabel(m, ctx.tt) : null)
  const label = st === 'upcoming' ? `${formatClock(m.start, ctx.locale)} ${base}` : [base, tail].filter(Boolean).join(' ')
  return (
    <div
      data-testid={`sport-block-${m.id}`}
      data-status={st}
      title={label}
      aria-label={label}
      {...station(() => ctx.openMatch(m))}
      style={{
        position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${width}%`, boxSizing: 'border-box', padding: showLabel ? `0 ${dp(10)}px` : 0,
        display: 'flex', alignItems: 'center', fontSize: dp(16), fontWeight: 600, borderRadius: dp(8), cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap',
        background: st === 'live' ? TV.accMix(30) : st === 'finished' ? TV.s07 : TV.s14,
        border: `1px solid ${st === 'live' ? TV.accMix(85) : TV.lineCard}`,
        borderLeft: `${dp(4)}px solid ${leagueColor(m.leagueKey || m.kind)}`,
        outline: blink ? `2px solid ${TV.live}` : undefined,
        color: st === 'finished' ? TV.dim : TV.text,
      }}
    >
      {showLabel ? label : null}
    </div>
  )
}
