'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatClock } from '../../live-tv-ui'
import { station } from '../../tv/tv-ui'
import { ellipsis } from '../../tv/mobile/mobile-tokens'
import { MIcons } from '../../tv/mobile/mobile-icons'
import { localDayKey } from '../sport-epg'
import { crestText, matchTitle, type MatchSource, type SportDay, type SportMatch } from '../sport-model'
import { featuredMatch, followState, leagueColor, nextMatchFor, nextOnYourChannels, rankedSources, splitSections, statusAt, teamRing } from '../sport-day-model'
import { heroStatusLine, matchStatusLabel, playedOnText, replayScoreText, scoreText, showsScore } from '../score-model'
import { useBackfillFollowCrests } from '../follow-crest'
import { crestForFollow } from '../score-model'
import { sourceLine, timeLine, type SportCtx } from '../sport-ctx'
import type { SportFollow } from '../sport-store'
import { eveningPlan, phoneTimeline } from './phone-sport-model'
import { P, PIcons, PhoneMatchCard, PhoneTeamCrest, SectionHead, cardStyle, matchProgress } from './phone-sport-parts'
import { PhoneSportSheet, SheetRow, sheetTitle } from './phone-sport-sheet'

/*
  Översikt på telefon (handoffen): Matchdag — hero med delad Titta-knapp,
  Nästa på dina kanaler, tidslinjen och Live nu / Senare idag / Avslutade — och
  Flöde — Dina lag, Just nu och Kvällsplan.
*/

type Offset = -1 | 0 | 1

export function PhoneMatchday({ ctx, matches, dayFrom, offset }: { ctx: SportCtx; matches: SportMatch[]; dayFrom: number; offset: Offset }) {
  // Heron ska gå att titta på: bara matcher med kanal (handoffen).
  const hero = useMemo(() => featuredMatch(matches.filter((m) => m.sources.length > 0), ctx.follows, ctx.now), [matches, ctx.follows, ctx.now])
  const next = nextOnYourChannels(matches, ctx.now, hero?.id ?? null, 8)
  const { live, later, finished } = splitSections(matches, ctx.now)
  const laterTitle = offset === 1 ? ctx.tt('sportTomorrow') : offset === 0 ? ctx.tt('sportLaterToday') : ctx.tt('sportLater')
  const sections = [
    { key: 'live', title: ctx.tt('sportLiveNow'), dot: P.live, list: live },
    { key: 'later', title: laterTitle, dot: P.coral, list: later },
    { key: 'finished', title: ctx.tt('sportFinished'), dot: 'rgba(243,244,248,0.4)', list: finished },
  ].filter((s) => s.list.length > 0)
  return (
    <>
      {hero ? <PhoneHero ctx={ctx} match={hero} /> : null}
      {next.length > 0 ? (
        <div data-testid="sport-phone-next" style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.muted60 }}>{ctx.tt('sportNextOnChannels')}</span>
          <div data-row="" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
            {next.map((m) => (
              <div key={m.id} data-testid="sport-phone-next-card" {...station(() => ctx.openMatch(m))} style={{ ...cardStyle, borderRadius: 12, flex: '0 0 200px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: P.coralLight }}>{formatClock(m.start, ctx.locale)}</span>
                <span style={{ fontSize: 14, fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</span>
                <span style={{ fontSize: 12, color: P.muted65, ...ellipsis }}>{rankedSources(m, ctx.overrides)[0]?.name ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <PhoneTimelineCard ctx={ctx} matches={matches} dayFrom={dayFrom} />
      {sections.map((s) => (
        <section key={s.key} data-testid={`sport-phone-section-${s.key}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <SectionHead dot={s.dot} title={s.title} sub={ctx.tt('sportJustNowSub', { n: s.list.length })} />
          {s.list.map((m) => <PhoneMatchCard key={m.id} ctx={ctx} match={m} />)}
        </section>
      ))}
    </>
  )
}

function heroTag(m: SportMatch, ctx: SportCtx): { text: string; bg: string } {
  const st = statusAt(m, ctx.now)
  if (st === 'live') return { text: `● ${ctx.tt('sportLiveShort')}`, bg: P.live }
  if (st === 'finished') return { text: ctx.tt('sportEnded'), bg: 'rgba(252,252,255,0.22)' }
  const evening = localDayKey(m.start) === localDayKey(ctx.now) && new Date(m.start).getHours() >= 17
  return { text: evening ? ctx.tt('sportTonight') : formatClock(m.start, ctx.locale), bg: 'rgba(252,252,255,0.22)' }
}

/** "FHD · 3 källor", eller kanalens namn när den är ensam. */
function sourceLabel(ctx: SportCtx, ranked: MatchSource[], chosen: MatchSource): string {
  if (ranked.length === 1) return chosen.name
  return [chosen.quality, ctx.tt('sportSourcesShort', { n: ranked.length })].filter(Boolean).join(' · ')
}

function PhoneHero({ ctx, match: m }: { ctx: SportCtx; match: SportMatch }) {
  const [picked, setPicked] = useState(0)
  const [sheet, setSheet] = useState(false)
  const ranked = rankedSources(m, ctx.overrides)
  const index = Math.min(picked, Math.max(ranked.length - 1, 0))
  const chosen = ranked[index] ?? null
  const st = statusAt(m, ctx.now)
  const tag = heroTag(m, ctx)
  const followed = followState(m, ctx.follows).any
  const kicker = `${followed ? ctx.tt('sportYouFollow') : ctx.tt('sportTopMatch')} · ${m.league || ctx.kindLabel(m.kind)}`
  const score = showsScore(m) ? m.score ?? null : null
  const status = st === 'live' ? heroStatusLine(m, ctx.tt) ?? timeLine(m, ctx) : st === 'upcoming' ? ctx.tt('sportKickoffAt', { time: formatClock(m.start, ctx.locale) }) : matchStatusLabel(m, ctx.tt) ?? ctx.tt('sportEnded')
  const team = (side: 'home' | 'away') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <PhoneTeamCrest name={side === 'home' ? m.home! : m.away!} colorKey={side === 'home' ? m.homeKey : m.awayKey} src={side === 'home' ? m.homeCrest : m.awayCrest} size={34} />
      <span style={{ flex: 1, fontSize: 20, fontWeight: 600, ...ellipsis }}>{side === 'home' ? m.home : m.away}</span>
      <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{score ? score[side] : ''}</span>
    </div>
  )
  return (
    <div data-testid="sport-phone-hero" style={{ ...cardStyle, borderRadius: 18, border: `1px solid ${P.line18}`, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span data-testid="sport-phone-hero-tag" style={{ height: 22, padding: '0 8px', borderRadius: 6, background: tag.bg, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>{tag.text}</span>
        <span style={{ fontSize: 13, color: P.muted80, ...ellipsis }}>{kicker}</span>
      </div>
      <div data-testid="sport-phone-hero-board" {...station(() => ctx.openMatch(m))} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
        {m.home && m.away ? <>{team('home')}{team('away')}</> : <span style={{ fontSize: 20, fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(252,252,255,0.2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(matchProgress(m, ctx.now) * 100)}%`, background: P.coral }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: st === 'live' ? P.liveMin : P.coralLight, whiteSpace: 'nowrap' }}>{status}</span>
          <span style={{ fontSize: 12, color: P.muted60, display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>{ctx.tt('sportMatchCenter')}<MIcons.CaretRight size={12} /></span>
        </div>
      </div>
      {chosen ? (
        <div style={{ display: 'flex' }}>
          <div data-testid="sport-phone-hero-watch" {...station(() => ctx.watch(m, chosen))} style={{ flex: 1, minWidth: 0, height: 46, borderRadius: '12px 0 0 12px', background: P.coral, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <MIcons.Play size={16} />
            {ctx.tt('sportWatch')}
            <span style={{ fontWeight: 500, opacity: 0.9, ...ellipsis }}>{`· ${sourceLabel(ctx, ranked, chosen)}`}</span>
          </div>
          <div data-testid="sport-phone-hero-sources" {...station(() => setSheet(true))} aria-label={ctx.tt('sportPickSource')} style={{ width: 46, height: 46, borderRadius: '0 12px 12px 0', background: P.coral, color: '#fff', borderLeft: '1px solid rgba(0,0,0,0.25)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <MIcons.CaretDown size={18} />
          </div>
        </div>
      ) : null}
      {sheet ? (
        <PhoneSportSheet testId="sport-phone-source-sheet" label={ctx.tt('sportPickSource')} onClose={() => setSheet(false)} pushLayer={ctx.nav.pushLayer}>
          <span style={sheetTitle}>{ctx.tt('sportPickSource')}</span>
          {ranked.map((s, i) => (
            <SheetRow key={s.channelKey} testId="sport-phone-source-row" on={i === index} height={56} onPress={() => { setPicked(i); setSheet(false) }}>
              <span style={{ width: 16, display: 'inline-flex' }}>{i === index ? <PIcons.Check /> : null}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, ...ellipsis }}>{s.name}</div>
                <div style={{ fontSize: 11, opacity: 0.7, ...ellipsis }}>{[ctx.playlistName(s.sourceId), i === 0 && ranked.length > 1 ? ctx.tt('sportBestLower') : null].filter(Boolean).join(' · ')}</div>
              </div>
              {s.quality ? <span style={{ fontSize: 12, fontWeight: 700 }}>{s.quality}</span> : null}
            </SheetRow>
          ))}
        </PhoneSportSheet>
      ) : null}
    </div>
  )
}

const PX_PER_HOUR = 90
const TIMELINE_ROWS = 5
const LABEL_W = 48

/** Tidslinjen: sidledes rullbar, klistrade ligaetiketter, banor för överlapp, nu-linjen. Bara dina kanaler. */
function PhoneTimelineCard({ ctx, matches, dayFrom }: { ctx: SportCtx; matches: SportMatch[]; dayFrom: number }) {
  const tl = phoneTimeline(matches, dayFrom, ctx.now, ctx.follows)
  const scroller = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const hours = tl ? (tl.end - tl.start) / 3_600_000 : 0
  const track = hours * PX_PER_HOUR
  const nowPx = tl?.nowPct != null ? (tl.nowPct / 100) * track : null
  // Nu-linjen i bild från början (en gång per dag/axel).
  useEffect(() => {
    const el = scroller.current
    if (el && nowPx != null) el.scrollLeft = Math.max(0, nowPx - 90)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tl?.start, tl?.end])
  if (!tl) return null
  const pct = (t: number) => ((Math.min(Math.max(t, tl.start), tl.end) - tl.start) / (tl.end - tl.start)) * 100
  // Med en riktig spellista kan tjugo ligor ha matcher på dina kanaler: de fem
  // första (följda, pågående, flest matcher) syns, resten fälls ut.
  const rows = expanded ? tl.rows : tl.rows.slice(0, TIMELINE_ROWS)
  const hidden = tl.rows.length - rows.length
  return (
    <div data-testid="sport-phone-timeline" style={{ ...cardStyle, borderRadius: 16, padding: '12px 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingRight: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{ctx.tt('sportMatchday')}</span>
        <span style={{ fontSize: 12, color: P.muted60, ...ellipsis }}>{ctx.tt('sportMatchdaySwipe')}</span>
      </div>
      <div ref={scroller} data-row="" style={{ overflowX: 'auto' }}>
        <div style={{ width: LABEL_W + 4 + track + 12, position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 12, boxSizing: 'border-box' }}>
          <div style={{ height: 18, position: 'relative', marginLeft: LABEL_W + 4 }}>
            {tl.hours.map((h) => (
              <span key={h} style={{ position: 'absolute', top: 0, left: `${pct(h)}%`, fontSize: 11, fontWeight: 600, color: P.muted60, paddingLeft: 4, borderLeft: `1px solid ${P.line14}` }}>{formatClock(h, ctx.locale)}</span>
            ))}
          </div>
          {rows.flatMap((row) => row.lanes.map((lane, laneIndex) => (
            <div key={`${row.key}-${laneIndex}`} data-testid="sport-phone-lane" style={{ height: 32, display: 'flex', gap: 4 }}>
              <span data-testid={laneIndex === 0 ? 'sport-phone-lane-label' : undefined} style={{ width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 2, background: '#121216', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'rgba(243,244,248,0.85)', overflow: 'hidden' }}>
                {laneIndex === 0 ? <><span style={{ width: 7, height: 7, borderRadius: 2, background: leagueColor(row.key), flexShrink: 0 }} />{row.abbr || ctx.kindLabel(row.kind).slice(0, 3).toUpperCase()}</> : null}
              </span>
              <div style={{ flex: 1, position: 'relative', borderRadius: 7, background: 'rgba(252,252,255,0.04)' }}>
                {lane.map((m) => <TimelineBlock key={m.id} ctx={ctx} m={m} left={pct(m.start)} width={pct(m.stop) - pct(m.start)} />)}
              </div>
            </div>
          )))}
          {nowPx != null ? <div data-testid="sport-phone-now" aria-hidden="true" style={{ position: 'absolute', top: 18, bottom: 0, left: LABEL_W + 4 + nowPx, width: 2, background: P.coral, boxShadow: '0 0 8px rgba(244,132,95,0.8)', pointerEvents: 'none' }} /> : null}
        </div>
      </div>
      {hidden > 0 ? (
        <div data-testid="sport-phone-timeline-more" {...station(() => setExpanded(true))} style={{ alignSelf: 'flex-start', minHeight: 32, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: P.coralLight, cursor: 'pointer' }}>
          {ctx.tt('showMoreN', { n: hidden })}<MIcons.CaretDown size={14} />
        </div>
      ) : null}
    </div>
  )
}

function TimelineBlock({ ctx, m, left, width }: { ctx: SportCtx; m: SportMatch; left: number; width: number }) {
  const st = statusAt(m, ctx.now)
  const pair = m.home && m.away ? `${crestText(m.home)}–${crestText(m.away)}` : matchTitle(m)
  const score = showsScore(m) && m.score && m.home && m.away ? `${crestText(m.home)} ${m.score.home}–${m.score.away} ${crestText(m.away)}` : null
  const label = st === 'upcoming' ? `${formatClock(m.start, ctx.locale)} ${pair}` : score ?? pair
  return (
    <div data-testid={`sport-phone-block-${m.id}`} data-status={st} {...station(() => ctx.openMatch(m))} title={matchTitle(m)} aria-label={`${matchTitle(m)} ${formatClock(m.start, ctx.locale)}`}
      style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `calc(${Math.max(width, 1.5)}% - 3px)`, boxSizing: 'border-box', borderRadius: 7, padding: '0 7px', display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'pointer',
        background: st === 'live' ? 'rgba(244,132,95,0.32)' : st === 'finished' ? 'rgba(252,252,255,0.07)' : 'rgba(252,252,255,0.14)',
        border: `1px solid ${st === 'live' ? 'rgba(244,132,95,0.85)' : P.line14}`, color: st === 'finished' ? P.muted60 : P.text }}>
      {label}
    </div>
  )
}

/** Flöde: Dina lag (ringar), Just nu och Kvällsplan. */
export function PhoneFeed({ ctx, matches, days, onAddTeam }: { ctx: SportCtx; matches: SportMatch[]; days: (SportDay | null)[]; onAddTeam: () => void }) {
  const { live, later } = splitSections(matches, ctx.now)
  const plan = eveningPlan(later, ctx.isReminded)
  const dayMatches = days[0]?.matches ?? []
  const allMatches = useMemo(() => days.flatMap((d) => d?.matches ?? []), [days])
  useBackfillFollowCrests(allMatches)
  return (
    <>
      <section data-testid="sport-phone-teams" style={{ ...cardStyle, borderRadius: 16, border: `1px solid ${P.line16}`, padding: '12px 0 10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{ctx.tt('sportYourTeams')}</span>
        <div data-row="" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 12px 4px 0' }}>
          {ctx.follows.map((f) => <TeamAvatar key={`${f.kind}:${f.key}`} ctx={ctx} follow={f} dayMatches={dayMatches} allMatches={allMatches} days={days} />)}
          <div data-testid="sport-phone-teams-add" {...station(onAddTeam)} style={{ flex: '0 0 70px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, border: '2px dashed rgba(255,255,255,0.35)', boxSizing: 'border-box', display: 'grid', placeItems: 'center' }}><MIcons.Plus size={22} /></span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{ctx.tt('sportAddTeam')}</span>
          </div>
        </div>
      </section>

      {live.length > 0 ? (
        <section data-testid="sport-phone-now-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <SectionHead dot={P.live} title={ctx.tt('sportJustNow')} sub={ctx.tt('sportJustNowSub', { n: live.length })} />
          {live.map((m) => {
            const has = m.sources.length > 0
            const score = scoreText(m)
            const title = score && m.home && m.away ? `${m.home} ${score} ${m.away}` : matchTitle(m)
            return (
              <div key={m.id} data-testid="sport-phone-now-row" {...station(() => ctx.openMatch(m))} style={{ ...cardStyle, minHeight: 64, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 0 0', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                <div style={{ width: 4, alignSelf: 'stretch', background: leagueColor(m.leagueKey || m.kind) }} />
                <span style={{ width: 34, flexShrink: 0, fontSize: 13, fontWeight: 700, color: P.liveMin }}>{matchStatusLabel(m, ctx.tt) ?? ctx.tt('sportLiveShort')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{title}</div>
                  <div style={{ fontSize: 12, color: P.muted65, ...ellipsis }}>{[m.league || ctx.kindLabel(m.kind), has ? sourceLine(m, ctx) : ctx.tt('sportResultOnly')].join(' · ')}</div>
                </div>
                <div data-testid="sport-phone-now-play" {...(has ? station(() => ctx.watch(m)) : {})} onClick={(e) => { e.stopPropagation(); if (has) ctx.watch(m) }} aria-label={ctx.tt('sportWatch')} aria-disabled={has ? 'false' : 'true'}
                  style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', background: has ? P.coral : 'rgba(252,252,255,0.14)', color: '#fff', opacity: has ? 1 : 0.4, cursor: has ? 'pointer' : 'default' }}>
                  <MIcons.Play size={16} />
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      {later.length > 0 ? (
        <section data-testid="sport-phone-plan" style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{ctx.tt('sportEveningPlan')}</span>
            <span data-testid="sport-phone-plan-sum" style={{ fontSize: 13, color: P.muted60 }}>{plan.chosen > 0 ? ctx.tt('sportPlanChosen', { n: plan.chosen }) : ctx.tt('sportPlanHint')}</span>
          </div>
          {plan.rows.map(({ match: m, on, clash }) => {
            const best = rankedSources(m, ctx.overrides)[0]
            return (
              <div key={m.id} data-testid="sport-phone-plan-row" data-on={on ? '1' : '0'} {...station(() => ctx.openMatch(m))} style={{ minHeight: 58, flexShrink: 0, borderRadius: 14, background: on ? 'rgba(244,132,95,0.12)' : P.card, border: `1px solid ${on ? 'rgba(244,132,95,0.55)' : P.line14}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', cursor: 'pointer', boxSizing: 'border-box' }}>
                <div data-testid="sport-phone-plan-check" {...(best ? station(() => ctx.toggleRemind(m)) : {})} role="checkbox" aria-checked={on ? 'true' : 'false'} aria-label={ctx.tt('sportRemindMe')}
                  onClick={(e) => { e.stopPropagation(); if (best) ctx.toggleRemind(m) }}
                  style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, boxSizing: 'border-box', display: 'grid', placeItems: 'center', background: on ? P.coral : 'transparent', border: `2px solid ${on ? P.coral : 'rgba(255,255,255,0.4)'}`, color: '#fff', opacity: best ? 1 : 0.4, cursor: best ? 'pointer' : 'default' }}>
                  {on ? <PIcons.Check size={16} /> : null}
                </div>
                <span style={{ width: 44, flexShrink: 0, fontSize: 15, fontWeight: 700, color: P.coralLight }}>{formatClock(m.start, ctx.locale)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
                  <div style={{ fontSize: 11, color: P.muted65, ...ellipsis }}>{[m.league || ctx.kindLabel(m.kind), best?.name ?? ctx.tt('sportResultOnly')].join(' · ')}</div>
                </div>
                {followState(m, ctx.follows).any ? <span style={{ color: P.coral, display: 'inline-flex' }}><MIcons.Heart size={14} filled /></span> : null}
                {clash ? <span data-testid="sport-phone-plan-clash" title={ctx.tt('sportClash')} aria-label={ctx.tt('sportClash')} style={{ color: '#fbbf24', display: 'inline-flex' }}><PIcons.Warning /></span> : null}
              </div>
            )
          })}
        </section>
      ) : null}
    </>
  )
}

/**
 * Repriser (Jerry 2026-10-12): egen liten grupp sist i både Matchdag och Flöde,
 * som på TV:n. Neutral REPRIS-tagg, sändningens tid, "Spelades lör 10 okt" och
 * originalets slutresultat; tryck = matchinfo, ▶ = titta som vanligt.
 */
export function PhoneReplays({ ctx, matches }: { ctx: SportCtx; matches: SportMatch[] }) {
  if (matches.length === 0) return null
  return (
    <section data-testid="sport-phone-replays" style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
      <SectionHead dot="rgba(243,244,248,0.4)" title={ctx.tt('sportReplays')} sub={ctx.tt('sportJustNowSub', { n: matches.length })} />
      {matches.map((m) => {
        const has = m.sources.length > 0
        const score = replayScoreText(m)
        return (
          <div key={m.id} data-testid="sport-phone-replay-row" {...station(() => ctx.openMatch(m))} style={{ ...cardStyle, minHeight: 64, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 0 0', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: 4, alignSelf: 'stretch', background: leagueColor(m.leagueKey || m.kind) }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, flexShrink: 0 }}>
              <span data-testid="sport-phone-replay-tag" style={{ height: 18, padding: '0 6px', borderRadius: 5, background: 'rgba(252,252,255,0.16)', color: P.text, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center' }}>{ctx.tt('sportReplay')}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: P.muted70, fontVariantNumeric: 'tabular-nums' }}>{formatClock(m.start, ctx.locale)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
              <div data-testid="sport-phone-replay-meta" style={{ fontSize: 12, color: P.muted65, ...ellipsis }}>{[playedOnText(m, ctx.tt, ctx.locale), m.league || ctx.kindLabel(m.kind), has ? sourceLine(m, ctx) : null].filter(Boolean).join(' · ')}</div>
            </div>
            {score ? <span data-testid="sport-phone-replay-score" style={{ fontSize: 15, fontWeight: 700, color: P.muted80, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{score}</span> : null}
            {has ? (
              <div data-testid="sport-phone-replay-play" {...station(() => ctx.watch(m))} onClick={(e) => { e.stopPropagation(); ctx.watch(m) }} aria-label={ctx.tt('sportWatch')}
                style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'rgba(252,252,255,0.16)', color: '#fff', cursor: 'pointer' }}>
                <MIcons.Play size={16} />
              </div>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}

function TeamAvatar({ ctx, follow, dayMatches, allMatches, days }: { ctx: SportCtx; follow: SportFollow; dayMatches: SportMatch[]; allMatches: SportMatch[]; days: (SportDay | null)[] }) {
  const ring = teamRing(follow, dayMatches, ctx.now)
  const next = nextMatchFor(follow, days, ctx.now)
  const liveMatch = ring === 'live' ? dayMatches.find((m) => statusAt(m, ctx.now) === 'live' && followState(m, [follow]).any) : undefined
  const status = ring === 'live'
    ? (liveMatch ? scoreText(liveMatch) : null) ?? ctx.tt('sportLiveShort')
    : next
      ? localDayKey(next.start) === localDayKey(ctx.now) ? formatClock(next.start, ctx.locale) : ctx.tt('sportTomorrow')
      : '–'
  const ringColor = ring === 'live' ? P.ring : ring === 'today' ? P.text : 'rgba(255,255,255,0.18)'
  const open = liveMatch ?? next
  return (
    <div data-testid="sport-phone-team" data-ring={ring} {...station(() => { if (open) ctx.openMatch(open) })} style={{ flex: '0 0 70px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 999, padding: 3, boxSizing: 'border-box', border: `3px solid ${ringColor}`, position: 'relative', display: 'grid', placeItems: 'center' }}>
        <PhoneTeamCrest name={follow.name} colorKey={follow.key} src={crestForFollow(follow, allMatches)} size={44} />
        {ring === 'live' ? <span style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)', height: 15, padding: '0 5px', borderRadius: 4, background: P.ring, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center' }}>{ctx.tt('sportLiveShort')}</span> : null}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, maxWidth: 70, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{follow.name}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: ring === 'live' ? P.liveMin : ring === 'today' ? P.coralLight : P.muted60 }}>{status}</span>
    </div>
  )
}
