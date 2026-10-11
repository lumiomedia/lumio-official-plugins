'use client'

import { useEffect, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { TV, dp, station, Toggle } from '../../tv/tv-ui'
import { useTvText, type TvStringKey } from '../../tv/tv-strings'
import { RateLineView } from './sport-score'
import { useResultsController } from '../results-controller'
import { usePollDemand } from '../live-poller'
import { getSportSettings, setSportSettings, useSportSettings } from '../sport-store'
import type { FixtureDetail, FixtureEvent } from '../provider'
import type { SportMatch } from '../sport-model'
import { eventTimeline, markerKind, type MarkerKind } from '../event-timeline'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
const FOUR_HOURS = 4 * 3_600_000

export function eventLabel(e: FixtureEvent, tt: TT): string {
  switch (e.type) {
    case 'goal': return tt('sportEvGoal')
    case 'card': return /red/i.test(e.detail) ? tt('sportEvRed') : /yellow/i.test(e.detail) ? tt('sportEvYellow') : tt('sportEvCard')
    case 'sub': return tt('sportEvSub')
    case 'var': return tt('sportEvVar')
    case 'penalty': return tt('sportEvPenalty')
    default: return e.detail
  }
}

const STAT_KEYS: Record<string, TvStringKey> = {
  'Ball Possession': 'sportStatPossession', 'Total Shots': 'sportStatShots', 'Shots on Goal': 'sportStatShotsOn', 'Corner Kicks': 'sportStatCorners',
}
export function statLabel(label: string, tt: TT): string {
  return STAT_KEYS[label] ? tt(STAT_KEYS[label]) : label
}

export function toggleGoalAlert(match: SportMatch): void {
  const current = { ...getSportSettings().goalAlertMatches }
  if (current[match.id]) delete current[match.id]
  else current[match.id] = match.start + FOUR_HOURS
  setSportSettings({ goalAlertMatches: current })
}

export function MatchCenterData({ match }: { match: SportMatch }) {
  const { tt } = useTvText()
  const tv = useTvMode()
  const controller = useResultsController()
  const settings = useSportSettings()
  const [detail, setDetail] = useState<FixtureDetail | null>(null)
  const covered = match.coverage === 'full' && !!match.fixture
  const live = match.status === 'live'
  usePollDemand('match-center', covered && live)

  useEffect(() => {
    if (!covered || !controller || !match.fixture) return
    let cancelled = false
    void controller.loadFixture(match.kind, match.fixture.id, match.status === 'finished').then((d) => { if (!cancelled) setDetail(d) })
    return () => { cancelled = true }
    // Pågående match: hämta om BARA när ställning eller status ändras. Minuten
    // ändras vid varje livepollning, och en omhämtning per pollning dubblade
    // förbrukningen. Omhämtningen räknas som live i kvothanteraren.
  }, [covered, controller, match.kind, match.fixture?.id, match.status, match.score?.home, match.score?.away])

  if (!covered) return null
  const alertOn = !!settings.goalAlertMatches[match.id]
  const h2 = { fontSize: dp(18), fontWeight: 600, marginTop: dp(12) } as const
  const sideName = (s: 'home' | 'away' | null) => (s === 'home' ? match.home ?? '' : s === 'away' ? match.away ?? '' : '')

  return (
    <div data-testid="sport-match-center-data" style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      {controller ? <RateLineView status={controller.status()} tv={tv} /> : null}
      <div data-testid="sport-goal-alert" {...station(() => toggleGoalAlert(match))} aria-pressed={alertOn ? 'true' : 'false'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(12), padding: `${dp(10)}px ${dp(12)}px`, borderRadius: dp(10), background: TV.s06, cursor: 'pointer' }}>
        <span><span style={{ fontSize: dp(16) }}>{tt('sportGoalAlert')}</span><br /><span style={{ fontSize: dp(13), color: TV.dim }}>{tt('sportAppRunningOnly')}</span></span>
        <Toggle on={alertOn} />
      </div>
      {detail && detail.events.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={h2}>{tt('sportEvents')}</div>
          <EventTimelineView match={match} events={detail.events} />
          {detail.events.map((e, i) => {
            const kind = markerKind(e)
            return (
              <div key={i} data-testid="mc-event" style={{ display: 'grid', gridTemplateColumns: `${dp(56)}px ${dp(20)}px 1fr`, alignItems: 'center', gap: dp(10), padding: `${dp(6)}px 0`, fontSize: dp(16), borderTop: `1px solid ${TV.line}` }}>
                <span style={{ color: TV.dim, fontVariantNumeric: 'tabular-nums' }}>{e.minute != null ? `${e.minute}'${e.extra ? `+${e.extra}` : ''}` : ''}</span>
                <span style={{ display: 'inline-flex', justifyContent: 'center' }}>{kind ? <Marker kind={kind} /> : null}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{eventLabel(e, tt)}</span>
                  <span style={{ color: TV.muted }}>{[e.player ? ` · ${e.player}` : '', e.assist ? ` (${e.assist})` : '', sideName(e.side) ? ` · ${sideName(e.side)}` : ''].join('')}</span>
                </span>
              </div>
            )
          })}
        </section>
      ) : null}
      {detail && detail.stats.length > 0 ? (
        <section>
          <div style={h2}>{tt('sportStats')}</div>
          {detail.stats.map((s) => (
            <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: dp(8), padding: `${dp(6)}px 0`, fontSize: dp(15), borderTop: `1px solid ${TV.line}` }}>
              <span style={{ textAlign: 'right' }}>{s.home}</span><span style={{ color: TV.dim }}>{statLabel(s.label, tt)}</span><span>{s.away}</span>
            </div>
          ))}
        </section>
      ) : null}
      {detail && detail.lineups.length > 0 ? (
        <section>
          <div style={h2}>{tt('sportLineups')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: dp(16) }}>
            {detail.lineups.map((l) => (
              <div key={l.side} data-lineup={l.side} style={{ display: 'flex', flexDirection: 'column', gap: dp(4), fontSize: dp(14) }}>
                <div style={{ fontWeight: 600 }}>{sideName(l.side)}{l.formation ? ` · ${l.formation}` : ''}</div>
                {l.startXI.map((p, i) => <div key={`s${i}`}><span style={{ color: TV.dim, display: 'inline-block', width: dp(28) }}>{p.number ?? ''}</span><span>{p.name}</span>{p.pos ? <span style={{ color: TV.faint }}> {p.pos}</span> : null}</div>)}
                {l.subs.length > 0 ? <div style={{ color: TV.dim, marginTop: dp(6) }}>{tt('sportSubs')}</div> : null}
                {l.subs.map((p, i) => <div key={`b${i}`} style={{ color: TV.muted }}><span style={{ display: 'inline-block', width: dp(28) }}>{p.number ?? ''}</span>{p.name}</div>)}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

const MARKER_COLOR: Record<MarkerKind, string> = { goal: TV.acc, yellow: '#facc15', red: '#ef4444', penalty: TV.muted }

/** Mål som en rund prick i accentfärg, kort och utvisningar som små rektanglar. */
function Marker({ kind }: { kind: MarkerKind }) {
  const goal = kind === 'goal'
  return <span data-marker={kind} aria-hidden="true" style={{ display: 'inline-block', width: goal ? dp(14) : dp(10), height: dp(14), borderRadius: goal ? 999 : dp(2), background: MARKER_COLOR[kind], boxShadow: goal ? `0 0 0 ${dp(2)}px rgba(0,0,0,0.5)` : undefined }} />
}

/**
  Matchens tidslinje: en vågrät linje 0–90' (hockey: tre perioder), streck
  vid periodgränserna, hemmalagets markörer ovanför och bortalagets under,
  och en nu-markör på minuten medan matchen pågår.
*/
function EventTimelineView({ match, events }: { match: SportMatch; events: FixtureEvent[] }) {
  const t = eventTimeline(events, match.kind, match.status === 'live' ? match.minute ?? null : null)
  const ticks = [0, ...t.periods, t.length]
  return (
    <div data-testid="mc-timeline" data-length={t.length} style={{ position: 'relative', height: dp(76), margin: `0 ${dp(8)}px` }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: dp(30), height: dp(2), borderRadius: dp(2), background: TV.s14 }} />
      {t.now != null ? <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: dp(30), height: dp(2), width: `${t.now}%`, background: TV.acc }} /> : null}
      {t.periods.map((p) => <div key={p} data-period={p} aria-hidden="true" style={{ position: 'absolute', left: `${(p / t.length) * 100}%`, top: dp(20), height: dp(22), width: dp(2), marginLeft: -dp(1), background: TV.lineStrong }} />)}
      {ticks.map((m, i) => (
        <span key={`${m}-${i}`} style={{ position: 'absolute', left: `${(m / t.length) * 100}%`, top: dp(52), transform: i === 0 ? 'none' : i === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: dp(14), color: TV.dim, fontVariantNumeric: 'tabular-nums' }}>{`${m}'`}</span>
      ))}
      {t.markers.map((mk) => {
        const e = events[mk.index]!
        return (
          <span key={mk.index} data-testid="mc-marker" data-kind={mk.kind} data-side={mk.side ?? ''} title={`${mk.minute}' ${e.player ?? ''}`.trim()} style={{ position: 'absolute', left: `${mk.at}%`, top: mk.side === 'away' ? dp(36) : dp(10), transform: 'translateX(-50%)', display: 'inline-flex' }}>
            <Marker kind={mk.kind} />
          </span>
        )
      })}
      {t.now != null ? <div data-testid="mc-timeline-now" aria-hidden="true" style={{ position: 'absolute', left: `${t.now}%`, top: dp(16), height: dp(30), width: dp(3), marginLeft: -dp(1), background: TV.acc, boxShadow: `0 0 ${dp(8)}px ${TV.acc}` }} /> : null}
    </div>
  )
}
