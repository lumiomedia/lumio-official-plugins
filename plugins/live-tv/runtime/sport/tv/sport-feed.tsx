'use client'

import { useMemo, type CSSProperties } from 'react'
import { formatClock, progressOf } from '../../live-tv-ui'
import { Progress, TV, dp, station } from '../../tv/tv-ui'
import { localDayKey } from '../sport-epg'
import { matchTitle, type SportDay, type SportMatch } from '../sport-model'
import { clashes, followState, leagueColor, nextMatchFor, splitSections, statusAt, teamRing } from '../sport-day-model'
import { alertLabel, sourceChip, type SportCtx } from '../sport-ctx'
import type { SportFollow } from '../sport-store'
import { useBackfillFollowCrests } from '../follow-crest'
import { crestForFollow, matchStatusLabel, scoreText } from '../score-model'
import { openFollowPage } from '../team-model'
import { Crest, ellipsis, overline, sectionTitle } from './sport-parts'
import { MatchScore } from './sport-score'
import { SportIcons } from './sport-icons'
import { focusAttr, sportCardStyle } from '../surface'
import { SportReplays } from './sport-replays'

const avatarCol: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(8), width: dp(150), flexShrink: 0, cursor: 'pointer' }

export function SportFeed({ ctx, matches, days, replays = [] }: { ctx: SportCtx; matches: SportMatch[]; days: (SportDay | null)[]; replays?: SportMatch[] }) {
  const { live, later, finished } = splitSections(matches, ctx.now)
  const planned = later.filter((m) => ctx.isReminded(m))
  const clash = clashes(planned)
  const dayMatches = days[0]?.matches ?? []
  const allMatches = useMemo(() => days.flatMap((d) => d?.matches ?? []), [days])
  useBackfillFollowCrests(allMatches)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dp(32) }}>
      {/* Egen ruta, som övriga sektioner med kortbakgrund (Jerry 2026-10-11). */}
      <section data-testid="feed-teams" style={{ ...sportCardStyle, display: 'flex', flexDirection: 'column', gap: dp(14), padding: `${dp(20)}px ${dp(24)}px` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
          <span style={{ ...sectionTitle, display: 'inline-flex', alignItems: 'center', gap: dp(12) }}><span style={{ color: TV.acc, display: 'inline-flex' }}><SportIcons.Heart size={dp(26)} filled /></span>{ctx.tt('sportYourTeams')}</span>
          <span style={{ fontSize: dp(16), color: TV.dim }}>{ctx.tt('sportYourTeamsHint')}</span>
        </div>
        <div data-row="" style={{ display: 'flex', gap: dp(24), overflowX: 'auto', padding: `${dp(8)}px ${dp(6)}px` }}>
          {ctx.follows.map((f) => <TeamAvatar key={`${f.kind}:${f.key}`} ctx={ctx} follow={f} dayMatches={dayMatches} allMatches={allMatches} days={days} />)}
          <div data-testid="feed-add" {...station(ctx.openFollowPicker, undefined, focusAttr('circle'))} style={avatarCol}>
            <span data-focus-circle="" style={{ width: dp(108), height: dp(108), borderRadius: 999, border: `2px dashed ${TV.lineStrong}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><SportIcons.Plus size={dp(36)} /></span>
            <span style={{ fontSize: dp(17), fontWeight: 600 }}>{ctx.tt('sportAddTeam')}</span>
          </div>
        </div>
      </section>

      {live.length > 0 ? (
        <section data-testid="feed-now" style={{ display: 'flex', flexDirection: 'column', gap: dp(12) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
            <span style={sectionTitle}>{ctx.tt('sportJustNow')}</span>
            <span style={{ fontSize: dp(16), color: TV.dim }}>{ctx.tt('sportJustNowSub', { n: live.length })}</span>
          </div>
          {live.map((m) => (
            <div key={m.id} data-testid="feed-now-row" data-focus-row="" style={{ ...sportCardStyle, display: 'flex', alignItems: 'center', gap: dp(18), padding: `${dp(14)}px ${dp(18)}px`, borderLeft: `${dp(6)}px solid ${leagueColor(m.leagueKey || m.kind)}` }}>
              <div style={{ width: dp(80), display: 'flex', flexDirection: 'column', gap: dp(6), flexShrink: 0 }}>
                <span style={{ color: TV.live, fontWeight: 700, fontSize: dp(16) }}>{[ctx.tt('live'), matchStatusLabel(m, ctx.tt)].filter(Boolean).join(' ')}</span>
                <Progress value={progressOf(m.start, m.stop, ctx.now)} height={dp(4)} />
              </div>
              {/* Hela raden markeras (data-focus-row), inte bara textblocket. */}
              <div {...station(() => ctx.openMatch(m), undefined, focusAttr('none'))} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: dp(16), cursor: 'pointer' }}>
                {m.home && m.away ? (
                  <span style={{ display: 'flex', flexShrink: 0 }}>
                    <Crest name={m.home} colorKey={m.homeKey ?? m.home} size={dp(48)} src={m.homeCrest} />
                    <span style={{ marginLeft: -dp(14) }}><Crest name={m.away} colorKey={m.awayKey ?? m.away} size={dp(48)} src={m.awayCrest} /></span>
                  </span>
                ) : null}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: dp(21), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
                  <div style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{[m.league || ctx.kindLabel(m.kind), followState(m, ctx.follows).any ? ctx.tt('sportYouFollow').toLowerCase() : null].filter(Boolean).join(' · ')}</div>
                </div>
                <MatchScore match={m} size="row" />
              </div>
              <span data-testid="feed-source-chip" style={{ fontSize: dp(15), padding: `${dp(6)}px ${dp(12)}px`, borderRadius: dp(8), background: TV.s12, whiteSpace: 'nowrap' }}>{sourceChip(m, ctx)}</span>
              <div data-testid="feed-play" {...station(() => ctx.watch(m))} aria-label={ctx.tt('sportWatch')} style={{ width: dp(56), height: dp(56), minHeight: dp(56), borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <SportIcons.Play size={dp(22)} />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {later.length > 0 ? (
        <section data-testid="feed-plan" style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          {/* Rubriken står ovanför båda kolumnerna, så Din kväll börjar i höjd med första raden (handoffen). */}
          <span style={sectionTitle}>{ctx.tt('sportEveningPlan')}</span>
          <div data-testid="feed-plan-body" style={{ display: 'flex', gap: dp(20), alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
              {later.map((m) => {
                const reminded = ctx.isReminded(m)
                const best = m.sources[0]
                return (
                  <div key={m.id} data-testid="feed-plan-row" data-focus-row="" style={{ ...sportCardStyle, display: 'flex', alignItems: 'center', gap: dp(16), padding: `${dp(12)}px ${dp(16)}px` }}>
                    <div data-testid="feed-plan-check" {...station(() => ctx.toggleRemind(m))} role="checkbox" aria-checked={reminded ? 'true' : 'false'} aria-label={ctx.tt('sportRemindMe')} style={{ width: dp(34), height: dp(34), minHeight: dp(34), borderRadius: dp(8), border: `2px solid ${reminded ? TV.acc : TV.lineStrong}`, background: reminded ? TV.acc : 'transparent', color: TV.onAcc, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: dp(20), cursor: 'pointer', flexShrink: 0 }}>{reminded ? '✓' : ''}</div>
                    <span style={{ fontSize: dp(22), fontWeight: 700, width: dp(84), flexShrink: 0 }}>{formatClock(m.start, ctx.locale)}</span>
                    <div {...station(() => ctx.openMatch(m), undefined, focusAttr('none'))} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                      <div style={{ fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
                      <div style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{[m.league || ctx.kindLabel(m.kind), best?.name].filter(Boolean).join(' · ')}</div>
                    </div>
                    {followState(m, ctx.follows).any ? <span data-testid="feed-plan-fav" style={{ color: TV.acc, display: 'inline-flex' }}><SportIcons.Heart size={dp(22)} filled /></span> : null}
                  </div>
                )
              })}
            </div>
            <div data-testid="sport-evening" style={{ ...sportCardStyle, width: dp(420), flexShrink: 0, padding: dp(20), display: 'flex', flexDirection: 'column', gap: dp(10) }}>
              <span style={overline}>{ctx.tt('sportYourEvening')}</span>
              <span style={{ fontSize: dp(20), fontWeight: 600 }}>{ctx.tt('sportEveningCount', { n: planned.length })}</span>
              <span style={{ fontSize: dp(15), color: TV.muted }}>{`${ctx.tt('sportKickoffAlert')}: ${alertLabel(ctx)}`}</span>
              {planned.map((m) => (
                <div key={m.id} data-testid="evening-row" style={{ display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(16) }}>
                  <span style={{ fontWeight: 700 }}>{formatClock(m.start, ctx.locale)}</span>
                  <span style={{ ...ellipsis, flex: 1 }}>{matchTitle(m)}</span>
                  {clash.has(m.id) ? <span data-testid="evening-clash" title={ctx.tt('sportClash')} style={{ color: '#fbbf24' }}>⚠ {ctx.tt('sportClash')}</span> : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {finished.length > 0 ? (
        <section data-testid="feed-finished" style={{ display: 'flex', flexDirection: 'column', gap: dp(12) }}>
          <span style={sectionTitle}>{ctx.tt('sportFinished')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: dp(12) }}>
            {finished.map((m) => (
              <div key={m.id} {...station(() => ctx.openMatch(m), undefined, focusAttr('card'))} style={{ ...sportCardStyle, padding: `${dp(12)}px ${dp(16)}px`, display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(17), cursor: 'pointer' }}>
                <span style={{ ...ellipsis, flex: 1 }}>{matchTitle(m)}</span>
                <span style={{ fontSize: dp(14), color: TV.dim }}>{scoreText(m) ?? ctx.tt('sportEnded')}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Repriser sist, utanför Just nu och kvällsplanen (Jerry 2026-10-12). */}
      <SportReplays ctx={ctx} matches={replays} />
    </div>
  )
}

function TeamAvatar({ ctx, follow, dayMatches, allMatches, days }: { ctx: SportCtx; follow: SportFollow; dayMatches: SportMatch[]; allMatches: SportMatch[]; days: (SportDay | null)[] }) {
  const ring = teamRing(follow, dayMatches, ctx.now)
  const next = nextMatchFor(follow, days, ctx.now)
  const liveMatch = ring === 'live' ? dayMatches.find((m) => statusAt(m, ctx.now) === 'live' && followState(m, [follow]).any) : undefined
  const status = ring === 'live'
    ? [ctx.tt('live'), liveMatch ? scoreText(liveMatch) : null].filter(Boolean).join(' ')
    : next
      ? localDayKey(next.start) === localDayKey(ctx.now) ? formatClock(next.start, ctx.locale) : ctx.tt('sportTomorrow')
      : ''
  const ringShadow = ring === 'live' ? `0 0 0 ${dp(4)}px #ef4444` : ring === 'today' ? `0 0 0 ${dp(3)}px ${TV.text}` : `0 0 0 ${dp(2)}px ${TV.s14}`
  return (
    <div data-testid="feed-team" data-ring={ring} {...station(() => openFollowPage(ctx, follow, allMatches), undefined, focusAttr('circle'))} aria-label={ctx.tt('sportTeamOpen', { name: follow.name })} style={avatarCol}>
      {/* Ringen (live/idag) står på cirkeln; fokus ritas på samma cirkel (data-focus-circle). */}
      <span data-focus-circle="" style={{ position: 'relative', borderRadius: 999, boxShadow: ringShadow, display: 'inline-flex' }}>
        <Crest name={follow.name} colorKey={follow.key} size={dp(108)} src={crestForFollow(follow, allMatches)} />
        {ring === 'live' ? <span style={{ position: 'absolute', left: '50%', bottom: -dp(10), transform: 'translateX(-50%)', padding: `${dp(2)}px ${dp(8)}px`, borderRadius: dp(6), background: '#ef4444', color: '#fff', fontSize: dp(12), fontWeight: 700, letterSpacing: '0.1em' }}>{ctx.tt('live')}</span> : null}
      </span>
      <span style={{ fontSize: dp(17), fontWeight: 600, maxWidth: '100%', textAlign: 'center', ...ellipsis, marginTop: dp(6) }}>{follow.name}</span>
      <span style={{ fontSize: dp(15), color: ring === 'live' ? TV.live : TV.muted }}>{status}</span>
    </div>
  )
}
