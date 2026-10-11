'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { HomeRowProps } from '@/lib/plugin-sdk'
import { formatClock } from '../../live-tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { Crest } from '../crest'
import { KIND_KEYS } from '../sport-ctx'
import { localDayKey, shiftDay } from '../sport-epg'
import { leagueColor, rankedSources, statusAt } from '../sport-day-model'
import { matchStatusLabel, showsScore } from '../score-model'
import { SPORT_KINDS, matchTitle, type SportFilter, type SportKind, type SportMatch } from '../sport-model'
import { hasAnyKey, useFollows, useOverrides, useSportSettings, type SportOverrides } from '../sport-store'
import { useSportRows } from './rows-feed'
import {
  leagueName,
  leagueRow,
  liveNowRow,
  myTeamsRow,
  resolveLeague,
  resultsRow,
  sportRowTarget,
  tonightRow,
  zapRow,
  type SportRowKind,
} from './rows-model'

/*
  EN SPORTRAD PÅ HEM. Samma rad för alla sex varianterna — det enda som
  skiljer är urvalet (rows-model.ts) och rubriken. Kortet är sportens kort i
  hemradens format: liga, status (LIVE + minut), lagen med märken och
  ställning, och kanalen matchen går på.

  TV: varje kort är en riktig knapp med `data-f` och appens kortring
  (`focus-card-ring`), remsan är `data-row` — fokusmotorn sköter resten.
  Typografin går på appens `--st-*`, så den skalar på TV.
*/

const TEXT = '#f8fafc'
const MUTED = '#94a3c8'
const DIM = 'rgba(248,250,252,0.55)'
const LIVE = '#ef4444'

function useNow(stepMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), stepMs)
    return () => clearInterval(t)
  }, [stepMs])
  return now
}

const sportOf = (option: string | null | undefined): SportFilter =>
  option && (SPORT_KINDS as readonly string[]).includes(option) ? (option as SportKind) : 'all'

const TITLE_KEYS = {
  'live-now': 'sportRowLiveNow',
  'my-teams': 'sportRowMyTeams',
  tonight: 'sportRowTonight',
  zap: 'sportRowZap',
  league: 'sportRowLeague',
  results: 'sportRowResults',
} as const

export interface SportHomeRowProps extends HomeRowProps {
  kind: SportRowKind
}

export function SportHomeRow({ kind, onNavigate, layout = 'slider', count = 20, sliderCardWidth = 'calc((100% - 5 * 0.75rem) / 6)', option }: SportHomeRowProps) {
  const { tt, locale } = useTvText()
  const feed = useSportRows({ week: kind === 'my-teams' })
  const follows = useFollows()
  const overrides = useOverrides()
  const settings = useSportSettings()
  const now = useNow(30_000)
  // Zappa: nytt frö per montering (Hem öppnas), samma frö vid omritning.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const sport = sportOf(option)
  const league = kind === 'league' ? resolveLeague(option, follows) : null

  const matches = useMemo(() => {
    const all = feed.matches
    switch (kind) {
      case 'live-now': return liveNowRow(all, follows, overrides, now, sport)
      case 'my-teams': return myTeamsRow(all, follows, now)
      case 'tonight': return tonightRow(all, overrides, now, sport)
      case 'zap': return zapRow(all, overrides, now, sport, seed)
      case 'league': return leagueRow(all, league, now)
      case 'results': return hasAnyKey(settings) ? resultsRow(all, follows, now) : []
    }
  }, [kind, feed.matches, follows, overrides, now, sport, seed, league, settings])

  if (!feed.ready || matches.length === 0) return null
  const shown = matches.slice(0, count)

  const title = kind === 'league' && league ? leagueName(league, follows, feed.matches) ?? tt('sportRowLeague') : tt(TITLE_KEYS[kind])
  const subtitle = (kind === 'live-now' || kind === 'tonight' || kind === 'zap') && sport !== 'all' ? tt(KIND_KEYS[sport]) : null
  const hideScores = kind === 'results' && option === 'hide'
  const slider = layout === 'slider'
  const cardWidth = slider ? `clamp(15rem, calc(${sliderCardWidth} * 2 + 0.75rem), 24rem)` : '100%'

  return (
    <section data-sport-home-row={kind}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 data-home-row-title="" className="truncate font-semibold text-white" style={{ fontSize: 'var(--home-row-heading, 1.25rem)', letterSpacing: '-0.2px' }}>
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 truncate" style={{ fontSize: 'var(--st-small, 0.8125rem)', color: MUTED }}>{subtitle}</p> : null}
        </div>
      </div>
      <div
        data-row=""
        className={slider ? 'thin-slider-scrollbar flex gap-3 overflow-x-auto pb-3' : undefined}
        style={slider ? undefined : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))', gap: '0.75rem' }}
      >
        {shown.map((m) => (
          <SportRowCard
            key={m.id}
            match={m}
            now={now}
            locale={locale}
            tt={tt}
            overrides={overrides}
            hideScore={hideScores}
            width={cardWidth}
            onOpen={() => onNavigate(sportRowTarget(m, overrides))}
          />
        ))}
      </div>
    </section>
  )
}

type TT = ReturnType<typeof useTvText>['tt']

const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

/** "19:00" idag, "Imorgon 19:00", annars "lör 19:00". */
function whenText(m: SportMatch, now: number, locale: string, tt: TT): string {
  const time = formatClock(m.start, locale)
  const day = localDayKey(m.start)
  const today = localDayKey(now)
  if (day === today) return time
  if (day === shiftDay(today, 1)) return tt('sportTomorrowAt', { time })
  return `${new Date(m.start).toLocaleDateString(locale, { weekday: 'short' })} ${time}`
}

export function SportRowCard({ match: m, now, locale, tt, overrides, hideScore, width, onOpen }: {
  match: SportMatch
  now: number
  locale: string
  tt: TT
  overrides: SportOverrides
  hideScore: boolean
  width: string
  onOpen: () => void
}) {
  const st = statusAt(m, now)
  const label = matchStatusLabel(m, tt)
  const score = !hideScore && showsScore(m) && m.score ? m.score : null
  const ranked = rankedSources(m, overrides)
  const best = ranked[0] ?? null
  const channel = best ? (ranked.length > 1 ? `${best.name} · ${tt('sportSourcesShort', { n: ranked.length })}` : best.name) : tt('sportResultOnly')
  const teams = m.home && m.away
  return (
    <button
      type="button"
      data-f=""
      data-sport-row-card=""
      data-match-id={m.id}
      data-status={st}
      className="focus-card-ring"
      onClick={onOpen}
      aria-label={`${matchTitle(m)} · ${m.league}`}
      style={{
        width, flex: 'none', boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', color: TEXT,
        borderRadius: 14, padding: '0.75rem 0.875rem', background: 'rgba(252,252,255,0.07)',
        border: '1px solid rgba(255,255,255,0.10)', display: 'flex', flexDirection: 'column', gap: '0.55rem',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, fontSize: 'var(--st-label, 0.6875rem)', color: MUTED }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: leagueColor(m.leagueKey || m.kind), flexShrink: 0 }} />
        <span style={{ ...ellipsis, flex: 1, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{m.league || tt(KIND_KEYS[m.kind])}</span>
        {st === 'live' ? (
          <span data-testid="sport-row-live" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
            <span style={{ padding: '1px 6px', borderRadius: 6, background: LIVE, color: '#fff', fontWeight: 700, letterSpacing: '0.06em' }}>{tt('live')}</span>
            {label && label !== tt('sportLiveShort') ? <span data-testid="sport-row-minute" style={{ color: TEXT, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{label}</span> : null}
          </span>
        ) : (
          <span data-testid="sport-row-when" style={{ flexShrink: 0, color: TEXT, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {st === 'finished' ? (label ?? tt('sportEnded')) : (label ?? whenText(m, now, locale, tt))}
          </span>
        )}
      </span>
      {teams ? (
        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {([['home', m.home!, m.homeKey, m.homeCrest], ['away', m.away!, m.awayKey, m.awayCrest]] as const).map(([side, name, key, crest]) => (
            <span key={side} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <Crest name={name} colorKey={key ?? name} size={24} src={crest} />
              <span style={{ ...ellipsis, flex: 1, fontSize: 'var(--st-body, 0.875rem)', fontWeight: 600 }}>{name}</span>
              {score ? <span data-testid="sport-row-score" style={{ fontSize: 'var(--st-h3, 1rem)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{side === 'home' ? score.home : score.away}</span> : null}
            </span>
          ))}
        </span>
      ) : (
        <span style={{ ...ellipsis, fontSize: 'var(--st-body, 0.875rem)', fontWeight: 600 }}>{matchTitle(m)}</span>
      )}
      <span data-testid="sport-row-channel" style={{ ...ellipsis, fontSize: 'var(--st-small, 0.75rem)', color: DIM }}>{channel}</span>
    </button>
  )
}
