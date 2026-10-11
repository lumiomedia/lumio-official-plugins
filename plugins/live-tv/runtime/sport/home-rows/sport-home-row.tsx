'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { HomeRowProps } from '@/lib/plugin-sdk'
import { useTvText } from '../../tv/tv-strings'
import { Crest } from '../crest'
import { KIND_KEYS } from '../sport-ctx'
import { leagueColor, rankedSources, statusAt } from '../sport-day-model'
import { matchStatusLabel, showsScore } from '../score-model'
import { SPORT_KINDS, matchTitle, type SportFilter, type SportKind, type SportMatch } from '../sport-model'
import { hasAnyKey, useFollows, useOverrides, useSportSettings, type SportOverrides } from '../sport-store'
import { useSportRows } from './rows-feed'
import { sportHeroMirror, whenText } from './rows-mirror'
import { useBackdropUploads } from '../backdrop'
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
  const uploads = useBackdropUploads()
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
            mirror={JSON.stringify(sportHeroMirror(m, { now, locale, tt, overrides, follows, settings, uploads, hideScore: hideScores }))}
            onOpen={() => onNavigate(sportRowTarget(m, overrides))}
          />
        ))}
      </div>
    </section>
  )
}

type TT = ReturnType<typeof useTvText>['tt']

/** Text som aldrig lämnar kortet: blocknivå, får krympa, klipps med ellips. */
const line: CSSProperties = { display: 'block', minWidth: 0, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
/** Titeln: högst två rader, sedan ellips. */
const twoLines: CSSProperties = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minWidth: 0, maxWidth: '100%', overflow: 'hidden', whiteSpace: 'normal', overflowWrap: 'anywhere' }

/**
 * Kortets yta. Tät (Jerry 2026-10-11, "med mindre opacitet"): på TV:ns
 * startsida ligger raden över herons bild, och sportsidans glasyta (7 %) gick
 * inte att läsa där. Samma täta mörka ton som appens kort på alla ytor.
 */
const CARD_BG = 'rgba(17, 20, 32, 0.94)'

export function SportRowCard({ match: m, now, locale, tt, overrides, hideScore, width, mirror, onOpen }: {
  match: SportMatch
  now: number
  locale: string
  tt: TT
  overrides: SportOverrides
  hideScore: boolean
  width: string
  /** TV-herons spegling (värdens `data-tv-mirror`), färdig JSON. */
  mirror?: string
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
      // Ett KORT för TV-startsidans scen även utan bild (märken kan vara initialer):
      // utan markeringen räknades raden som krom och ritades över heron.
      data-tv-card=""
      data-tv-mirror={mirror}
      data-sport-row-card=""
      data-match-id={m.id}
      data-status={st}
      className="focus-card-ring"
      onClick={onOpen}
      aria-label={`${matchTitle(m)} · ${m.league}`}
      style={{
        width, flex: 'none', boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', color: TEXT,
        borderRadius: 14, padding: '0.75rem 0.875rem', background: CARD_BG, overflow: 'hidden', minWidth: 0,
        border: '1px solid rgba(255,255,255,0.12)', display: 'block',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', minWidth: 0, width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, fontSize: 'var(--st-label, 0.6875rem)', color: MUTED }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: leagueColor(m.leagueKey || m.kind), flexShrink: 0 }} />
          <span style={{ ...line, flex: '1 1 0%', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{m.league || tt(KIND_KEYS[m.kind])}</span>
          {st === 'live' ? (
            <span data-testid="sport-row-live" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
              <span style={{ padding: '1px 6px', borderRadius: 6, background: LIVE, color: '#fff', fontWeight: 700, letterSpacing: '0.06em' }}>{tt('live')}</span>
              {label && label !== tt('sportLiveShort') ? <span data-testid="sport-row-minute" style={{ color: TEXT, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{label}</span> : null}
            </span>
          ) : (
            <span data-testid="sport-row-when" style={{ ...line, flex: '0 1 auto', color: TEXT, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {st === 'finished' ? (label ?? tt('sportEnded')) : (label ?? whenText(m, now, locale, tt))}
            </span>
          )}
        </span>
        {teams ? (
          <span style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
            {([['home', m.home!, m.homeKey, m.homeCrest], ['away', m.away!, m.awayKey, m.awayCrest]] as const).map(([side, name, key, crest]) => (
              <span key={side} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <Crest name={name} colorKey={key ?? name} size={24} src={crest} />
                <span data-testid="sport-row-team" style={{ ...line, flex: '1 1 0%', fontSize: 'var(--st-body, 0.875rem)', fontWeight: 600 }}>{name}</span>
                {score ? <span data-testid="sport-row-score" style={{ flexShrink: 0, fontSize: 'var(--st-h3, 1rem)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{side === 'home' ? score.home : score.away}</span> : null}
              </span>
            ))}
          </span>
        ) : (
          // maxHeight = två rader även där line-clamp saknas (gamla webbvyer).
          <span data-testid="sport-row-title" style={{ ...twoLines, fontSize: 'var(--st-body, 0.875rem)', fontWeight: 600, lineHeight: 1.3, maxHeight: '2.6em' }}>{matchTitle(m)}</span>
        )}
        <span data-testid="sport-row-channel" style={{ ...line, fontSize: 'var(--st-small, 0.75rem)', color: DIM }}>{channel}</span>
      </span>
    </button>
  )
}
