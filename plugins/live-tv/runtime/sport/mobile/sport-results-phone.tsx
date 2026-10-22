'use client'

import { useEffect, useMemo, useState } from 'react'
import { station } from '../../tv/tv-ui'
import { useTvText, type TvStringKey } from '../../tv/tv-strings'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { MIcons } from '../../tv/mobile/mobile-icons'
import { KeyCard } from '../key-card'
import { FORM_COLOR, defaultResultsFilter, formLetters, type ResultGroup } from '../results-model'
import { matchStatusLabel, showsScore } from '../score-model'
import { type SportFilter, type SportKind, type SportMatch } from '../sport-model'
import { followState, leagueColor } from '../sport-day-model'
import { useFollows, useSportSettings, type SportFollow } from '../sport-store'
import { formatClock } from '../../live-tv-ui'
import { PhoneLeagueSheet } from './sport-league-sheet-phone'
import type { ResultsController } from '../results-controller'
import type { StandingRow } from '../provider'
import { Crest } from '../crest'
import { phoneResults, type ResultsScope } from './phone-sport-model'
import { P, PIcons, cardStyle } from './phone-sport-parts'
import { PhoneSportSheet, sheetTitle } from './phone-sport-sheet'
import { MobileToggle } from '../../tv/mobile/mobile-toggle'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Lagets märke på telefon: källans bild via appens logocache, annars den färgade initialcirkeln. */
export function PhoneCrest({ name, src, size = 22 }: { name: string; src?: string | null; size?: number }) {
  return <Crest name={name} colorKey={name} src={src} size={size} />
}

function PhoneStandings({ rows, tt, follows }: { rows: StandingRow[]; tt: TT; follows: SportFollow[] }) {
  const cols = '22px minmax(0,1fr) 26px 30px 72px'
  const followed = (name: string) => follows.some((f) => f.kind === 'team' && f.name.toLowerCase() === name.toLowerCase())
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: P.muted60, flexShrink: 0 }}>
        <span>#</span><span>{tt('sportColTeam')}</span><span>{tt('sportColPlayed')}</span><span>{tt('sportColPoints')}</span><span>{tt('sportColForm')}</span>
      </div>
      {rows.map((r) => (
        <div key={`${r.group ?? ''}-${r.rank}-${r.team.id}`} data-testid="phone-standings-row" style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, alignItems: 'center', minHeight: 38, flexShrink: 0, fontSize: 14, borderRadius: 8, background: followed(r.team.name) ? 'rgba(244,132,95,0.18)' : 'transparent' }}>
          <span style={{ color: P.muted65, paddingLeft: 4 }}>{r.rank}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><PhoneCrest name={r.team.name} src={r.team.crest} size={18} /><span style={{ fontWeight: 600, ...ellipsis }}>{r.team.name}</span></span>
          <span style={{ color: P.muted70 }}>{r.played}</span>
          <span style={{ fontWeight: 700 }}>{r.points}</span>
          <span style={{ display: 'flex', gap: 3 }}>
            {formLetters(r.form, tt).slice(-5).map((f, i) => (
              <span key={i} data-testid="phone-form" title={f.letter} style={{ width: 12, height: 12, borderRadius: 999, background: FORM_COLOR[f.kind], color: 'transparent', fontSize: 0 }}>{f.letter}</span>
            ))}
          </span>
        </div>
      ))}
    </>
  )
}

/** Laddar, saknas (i stället för en ensam rubrikrad) eller tabellen. */
function StandingsBody({ rows, tt, follows }: { rows: StandingRow[] | null; tt: TT; follows: SportFollow[] }) {
  if (rows === null) return <div style={{ padding: 8, color: MT.muted }}>{tt('sportLoading')}</div>
  if (rows.length === 0) return <div data-testid="phone-standings-empty" style={{ padding: 8, color: MT.muted }}>{tt('sportTableEmpty')}</div>
  return <PhoneStandings rows={rows} tt={tt} follows={follows} />
}

/**
  Tabeller & resultat på telefon (handoffen): växeln "Bara det jag kan se" och
  ligaväljaren överst, sedan en grupp per liga med Tabell ›, raderna 58 px med
  status, lagen staplade, ställningen i en ruta och en spelknapp. Mina lag är
  förvalt när något följs (som på TV).
*/
export function SportResultsPhone({ matches, controller, onOpenMatch, onWatch, pushLayer, sport = 'all', kindLabel }: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; onWatch?(m: SportMatch): void; pushLayer: (close: () => void) => () => void; sport?: SportFilter; kindLabel?: (k: SportKind) => string }) {
  const { tt, locale } = useTvText()
  const settings = useSportSettings()
  const follows = useFollows()
  const [watchable, setWatchable] = useState(false)
  const [scope, setScope] = useState<ResultsScope>(() => (defaultResultsFilter(follows) === 'followed' ? 'followed' : 'all'))
  const [table, setTable] = useState<{ group: ResultGroup; rows: StandingRow[] | null } | null>(null)
  const [leagueSheet, setLeagueSheet] = useState(false)
  const forSport = useMemo(() => (sport === 'all' ? matches : matches.filter((m) => m.kind === sport)), [matches, sport])
  const { groups, entries, followedCount } = useMemo(() => phoneResults(forSport, { watchable, scope }, follows), [forSport, watchable, scope, follows])
  // En vald liga visar sin tabell direkt under matcherna (Jerry 2026-10-12); Alla ligor och Mina lag står stängda.
  const picked = scope !== 'all' && scope !== 'followed' ? groups.find((g) => g.key === scope) ?? null : null
  const pickedKey = picked?.key ?? null
  const [inline, setInline] = useState<{ key: string; rows: StandingRow[] | null } | null>(null)
  useEffect(() => {
    if (!picked || !controller) { setInline(null); return }
    let cancelled = false
    const cached = controller.standings(picked.sport, picked.leagueId, picked.season)
    setInline({ key: picked.key, rows: cached })
    if (!cached) void controller.loadStandings(picked.sport, picked.leagueId, picked.season).then((rows) => { if (!cancelled) setInline({ key: picked.key, rows: rows ?? [] }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedKey, controller, settings.apiKey])

  if (!controller) {
    return <KeyCard variant="tab" pushLayer={pushLayer} />
  }

  const labels = new Map(entries.map((e) => [e.key, e.label]))
  const scopeLabel = scope === 'all' ? tt('sportAllLeagues') : scope === 'followed' ? tt('sportResultsFollowed', { n: followedCount }) : labels.get(scope) ?? tt('sportAllLeagues')
  const openTable = async (g: ResultGroup) => {
    const cached = controller.standings(g.sport, g.leagueId, g.season)
    setTable({ group: g, rows: cached })
    if (cached) return
    const rows = await controller.loadStandings(g.sport, g.leagueId, g.season)
    setTable((t) => (t && t.group.key === g.key ? { group: g, rows: rows ?? [] } : t))
  }

  return (
    <div data-testid="phone-results" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div data-testid="phone-results-watchable" {...station(() => setWatchable((w) => !w))} role="switch" aria-checked={watchable ? 'true' : 'false'}
          style={{ ...cardStyle, borderRadius: 10, height: 38, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <span style={{ flex: 1, ...ellipsis }}>{tt('sportOnlyWatchable')}</span>
          <MobileToggle on={watchable} />
        </div>
        <div data-testid="phone-results-league" {...station(() => setLeagueSheet(true))}
          style={{ ...cardStyle, borderRadius: 10, height: 38, maxWidth: 160, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <span style={ellipsis}>{scopeLabel}</span>
          <MIcons.CaretDown size={14} />
        </div>
      </div>
      {groups.length === 0 ? <div style={{ borderRadius: 14, border: '1px dashed rgba(255,255,255,0.24)', padding: '28px 16px', textAlign: 'center', fontSize: 15, color: 'rgba(243,244,248,0.75)' }}>{tt('sportResultsEmpty')}</div> : null}
      {groups.map((g) => (
        <section key={g.key} data-testid={`phone-results-group-${g.key}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: leagueColor(g.matches[0]?.leagueKey || g.sport), flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, ...ellipsis }}>{g.round != null ? `${labels.get(g.key) ?? g.league} · ${tt('sportRound', { n: g.round })}` : labels.get(g.key) ?? g.league}</span>
            {/* Tydlig knapp (Jerry 2026-10-12): ikon, text och kant. Med en vald liga står tabellen redan nedanför. */}
            {inline?.key === g.key ? null : (
              <div data-testid={`phone-table-${g.key}`} {...station(() => void openTable(g))} style={{ height: 34, padding: '0 12px', borderRadius: 10, background: 'rgba(252,252,255,0.14)', border: '1px solid rgba(255,255,255,0.28)', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                <PIcons.Table size={15} />{tt('sportTable')}<MIcons.CaretRight size={12} />
              </div>
            )}
          </div>
          {g.matches.map((m) => <ResultRow key={m.id} m={m} tt={tt} locale={locale} follows={follows} onOpen={() => onOpenMatch(m)} onWatch={onWatch} />)}
          {inline?.key === g.key ? (
            <div data-testid="phone-standings-inline" style={{ ...cardStyle, borderRadius: 12, padding: '10px 10px 6px', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.muted60, paddingBottom: 4 }}>{tt('sportTable')}</span>
              <StandingsBody rows={inline.rows} tt={tt} follows={follows} />
            </div>
          ) : null}
        </section>
      ))}
      {leagueSheet ? <PhoneLeagueSheet entries={entries} scope={scope} followedCount={followedCount} kindLabel={sport === 'all' ? kindLabel ?? null : null} onPick={setScope} onClose={() => setLeagueSheet(false)} pushLayer={pushLayer} /> : null}
      {table ? (
        <PhoneSportSheet testId="phone-standings-sheet" label={tt('sportTable')} onClose={() => setTable(null)} pushLayer={pushLayer}>
          <span style={sheetTitle}>{`${labels.get(table.group.key) ?? table.group.league} · ${tt('sportTable')}`}</span>
          <StandingsBody rows={table.rows} tt={tt} follows={follows} />
        </PhoneSportSheet>
      ) : null}
    </div>
  )
}

function ResultRow({ m, tt, locale, follows, onOpen, onWatch }: { m: SportMatch; tt: TT; locale: string; follows: SportFollow[]; onOpen: () => void; onWatch?: (m: SportMatch) => void }) {
  const live = m.status === 'live'
  const upcoming = m.status === 'upcoming'
  const status = matchStatusLabel(m, tt) ?? formatClock(m.start, locale)
  const score = showsScore(m) ? m.score ?? null : null
  const can = m.sources.length > 0 && !m.resultOnly && !!onWatch
  const fs = followState(m, follows)
  const watch = () => { if (can) onWatch!(m) }
  return (
    <div data-testid="phone-result-row" data-status={m.status} {...station(onOpen)} style={{ ...cardStyle, borderRadius: 12, border: `1px solid ${P.line12}`, minHeight: 58, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', cursor: 'pointer' }}>
      <span style={{ width: 44, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', fontSize: 12, fontWeight: 700, color: live ? P.liveMin : upcoming ? P.coralLight : P.muted60 }}>{status}</span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}><span style={ellipsis}>{m.home ?? m.event ?? m.league}</span>{fs.home ? <span style={{ color: P.coral, display: 'inline-flex', flexShrink: 0 }}><MIcons.Heart size={11} filled /></span> : null}</span>
        {m.away ? <span style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}><span style={ellipsis}>{m.away}</span>{fs.away ? <span style={{ color: P.coral, display: 'inline-flex', flexShrink: 0 }}><MIcons.Heart size={11} filled /></span> : null}</span> : null}
      </div>
      <div data-testid="phone-result-score" style={{ width: 28, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 15, fontWeight: 700, borderRadius: 7, padding: '3px 0', fontVariantNumeric: 'tabular-nums', background: live ? 'rgba(251,113,133,0.24)' : 'rgba(252,252,255,0.10)' }}>
        <span>{score ? score.home : '–'}</span><span>{score ? score.away : '–'}</span>
      </div>
      <div data-testid="phone-result-play" {...(can ? station(watch) : {})} onClick={(e) => { e.stopPropagation(); watch() }} aria-label={tt('sportWatch')} aria-disabled={can ? 'false' : 'true'}
        style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', background: can ? P.coralSoft : 'transparent', color: can ? P.coralLight : 'rgba(243,244,248,0.4)', cursor: can ? 'pointer' : 'default' }}>
        {can ? <MIcons.Play size={14} /> : <PIcons.Minus />}
      </div>
    </div>
  )
}
