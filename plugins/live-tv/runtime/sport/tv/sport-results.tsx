'use client'

import { useEffect, useMemo, useState } from 'react'
import { TV, dp, station, Chip } from '../../tv/tv-ui'
import { useTvText, type TvStringKey } from '../../tv/tv-strings'
import { Crest } from './sport-parts'
import { MatchScore, matchStatusLabel } from './sport-score'
import { KeyCard } from '../key-card'
import { useFollows, useSportSettings } from '../sport-store'
import type { ResultsController } from '../results-controller'
import type { StandingRow } from '../provider'
import type { SportFilter, SportMatch } from '../sport-model'
import type { TvNav } from '../../tv/tv-shell'
import { leagueEntries, yourLeagues } from '../league-jump'
import { LeagueDrawer, YourLeaguesRow } from './sport-league-drawer'
import { FORM_COLOR, defaultResultsFilter, formLetters, groupResults, onlyLeague, type ResultGroup, type ResultsFilter } from '../results-model'
import { sportCardStyle } from '../surface'
import { SportIcons } from './sport-icons'
export { formLetters, groupResults, type ResultGroup, type ResultsFilter } from '../results-model'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
function StandingsTable({ rows, tt }: { rows: StandingRow[] | 'loading'; tt: TT }) {
  const cell = { padding: `${dp(6)}px ${dp(8)}px`, fontSize: dp(15) } as const
  // Bara rubrikraden såg ut som ett fel (Jerry 2026-10-12): säg i stället att tabellen laddar eller saknas.
  if (rows === 'loading' || rows.length === 0) {
    return <div data-testid={rows === 'loading' ? 'sport-standings-loading' : 'sport-standings-empty'} style={{ ...sportCardStyle, padding: `${dp(14)}px ${dp(16)}px`, fontSize: dp(16), color: TV.muted }}>{rows === 'loading' ? tt('sportLoading') : tt('sportTableEmpty')}</div>
  }
  return (
    <div data-testid="sport-standings" style={{ ...sportCardStyle, padding: `${dp(4)}px ${dp(8)}px` }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', color: TV.text }}>
      <thead><tr style={{ color: TV.dim, textAlign: 'left' }}><th style={cell}>#</th><th style={cell}>{tt('sportColTeam')}</th><th style={cell}>{tt('sportColPlayed')}</th><th style={cell}>{tt('sportColPoints')}</th><th style={cell}>{tt('sportColForm')}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.group ?? ''}-${r.rank}-${r.team.id}`} style={{ borderTop: `1px solid ${TV.line}` }}>
            <td style={cell}>{r.rank}</td>
            <td style={cell}><span style={{ display: 'flex', alignItems: 'center', gap: dp(8) }}><Crest name={r.team.name} colorKey={r.team.id} src={r.team.crest} size={dp(20)} />{r.team.name}</span></td>
            <td style={cell}>{r.played}</td>
            <td style={{ ...cell, fontWeight: 600 }}>{r.points}</td>
            <td style={cell}><span style={{ display: 'inline-flex', gap: dp(4) }}>{formLetters(r.form, tt).map((f, i) => <span key={i} style={{ width: dp(18), height: dp(18), borderRadius: dp(4), background: FORM_COLOR[f.kind], color: '#0e0f13', fontSize: dp(11), fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{f.letter}</span>)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

/** Tydlig Tabell-knapp (Jerry 2026-10-12: den gamla var för diskret): ikon, text och TV-storlek, fokusbar. */
function TableButton({ open, onPress, testId, tt }: { open: boolean; onPress: () => void; testId: string; tt: TT }) {
  return (
    <div data-testid={testId} {...station(onPress)} aria-expanded={open ? 'true' : 'false'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: dp(10), height: dp(52), minHeight: dp(52), padding: `0 ${dp(18)}px`, borderRadius: dp(12), boxSizing: 'border-box', cursor: 'pointer', flexShrink: 0,
        fontSize: dp(18), fontWeight: 700, background: open ? TV.text : TV.s12, color: open ? '#12152a' : TV.text, border: `1px solid ${open ? TV.text : TV.lineStrong}` }}>
      <SportIcons.Table size={dp(22)} />
      <span>{open ? tt('sportTableHide') : tt('sportTable')}</span>
    </div>
  )
}

const NO_LAYER = { pushLayer: () => () => {} } as unknown as TvNav

export function SportResults({ matches, controller, onOpenMatch, tv, sport = 'all', nav = NO_LAYER }: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; tv: boolean; sport?: SportFilter; nav?: TvNav }) {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const follows = useFollows()
  // Mina lag är förvalt så fort användaren följer något lag eller någon liga.
  const [filter, setFilter] = useState<ResultsFilter>(() => defaultResultsFilter(follows))
  const [league, setLeague] = useState<string | null>(null)
  const [tables, setTables] = useState<Record<string, StandingRow[] | 'loading'>>({})
  const [drawer, setDrawer] = useState(false)
  const forSport = useMemo(() => (sport === 'all' ? matches : matches.filter((m) => m.kind === sport)), [matches, sport])
  const { groups, liveCount, mineCount, followedCount } = useMemo(() => groupResults(forSport, filter, follows), [forSport, filter, follows])
  const shown = useMemo(() => onlyLeague(groups, league), [groups, league])
  const entries = useMemo(() => leagueEntries(groups, follows), [groups, follows])
  const mine = useMemo(() => yourLeagues(entries), [entries])
  // En vald liga visar sin tabell direkt (Jerry 2026-10-12); med Alla ligor står tabellerna stängda.
  const picked = league ? shown.find((g) => g.key === league) ?? null : null
  const pickedKey = picked?.key ?? null
  useEffect(() => {
    if (!picked || !controller || !settings.apiKey) return
    let cancelled = false
    setTables((t) => (t[picked.key] ? t : { ...t, [picked.key]: 'loading' }))
    const cached = controller.standings(picked.sport, picked.leagueId, picked.season)
    const load = cached ? Promise.resolve(cached) : controller.loadStandings(picked.sport, picked.leagueId, picked.season)
    void load.then((rows) => { if (!cancelled) setTables((t) => (t[picked.key] === 'loading' ? { ...t, [picked.key]: rows ?? [] } : t)) })
    // Tillbaka till Alla ligor: den automatiskt öppnade tabellen stängs igen.
    return () => { cancelled = true; setTables((t) => { const { [picked.key]: _drop, ...rest } = t; return rest }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedKey, controller, settings.apiKey])

  if (!settings.apiKey || !controller) {
    return <KeyCard variant="tab" />
  }

  const openTable = async (g: ResultGroup) => {
    setTables((t) => ({ ...t, [g.key]: 'loading' }))
    const rows = controller.standings(g.sport, g.leagueId, g.season) ?? (await controller.loadStandings(g.sport, g.leagueId, g.season))
    setTables((t) => ({ ...t, [g.key]: rows ?? [] }))
  }
  const toggleTable = (g: ResultGroup) => {
    if (tables[g.key]) { setTables((t) => { const { [g.key]: _drop, ...rest } = t; return rest }); return }
    void openTable(g)
  }

  // Ett ligaval FILTRERAR till den ligan (Jerry 2026-10-11) i stället för att rulla dit; "Alla ligor ×" återställer.
  const pickLeague = (key: string) => setLeague((cur) => (cur === key ? null : key))
  const labels = new Map(entries.map((e) => [e.key, e.label]))

  return (
    <div data-testid="sport-results" style={{ display: 'flex', flexDirection: 'column', gap: dp(20) }}>
      <div style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
        <Chip data-testid="results-filter-all" active={filter === 'all'} {...station(() => setFilter('all'), undefined, tv ? { 'data-init': '' } : undefined)}>{tt('sportResultsAll')}</Chip>
        <Chip data-testid="results-filter-followed" active={filter === 'followed'} {...station(() => setFilter('followed'))}>{tt('sportResultsFollowed', { n: followedCount })}</Chip>
        <Chip active={filter === 'live'} {...station(() => setFilter('live'))}>{`${tt('sportResultsLive')} (${liveCount})`}</Chip>
        <Chip active={filter === 'mine'} {...station(() => setFilter('mine'))}>{tt('sportResultsMine', { n: mineCount })}</Chip>
      </div>
      {groups.length > 0 || league ? <YourLeaguesRow entries={mine.entries} fallback={mine.fallback} active={league} activeLabel={league ? labels.get(league) ?? null : null} onJump={pickLeague} onReset={() => setLeague(null)} onMore={() => setDrawer(true)} tv={tv} /> : null}
      {shown.length === 0 ? <div style={{ color: TV.dim, fontSize: dp(16) }}>{tt('sportResultsEmpty')}</div> : null}
      {shown.map((g) => (
        <section key={g.key} data-testid={`results-group-${g.key}`} style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: dp(20), fontWeight: 600 }}>{g.round != null ? `${labels.get(g.key) ?? g.league} · ${tt('sportRound', { n: g.round })}` : labels.get(g.key) ?? g.league}</div>
            <TableButton testId={`results-table-${g.key}`} open={!!tables[g.key]} onPress={() => toggleTable(g)} tt={tt} />
          </div>
          {g.matches.map((m) => (
            <div key={m.id} {...station(() => onOpenMatch(m))} style={{ display: 'grid', gridTemplateColumns: `${dp(64)}px 1fr auto 1fr`, alignItems: 'center', gap: dp(10), padding: `${dp(10)}px ${dp(12)}px`, ...sportCardStyle, borderRadius: dp(10), cursor: 'pointer' }}>
              <span style={{ fontSize: dp(14), color: m.status === 'live' ? TV.live : TV.dim }}>{matchStatusLabel(m, tt) ?? ''}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: dp(8), justifyContent: 'flex-end' }}>{m.home}<Crest name={m.home ?? ''} colorKey={m.homeKey ?? ''} src={m.homeCrest} size={dp(22)} /></span>
              <MatchScore match={m} size="row" />
              <span style={{ display: 'flex', alignItems: 'center', gap: dp(8) }}><Crest name={m.away ?? ''} colorKey={m.awayKey ?? ''} src={m.awayCrest} size={dp(22)} />{m.away}</span>
            </div>
          ))}
          {tables[g.key] ? <StandingsTable rows={tables[g.key]!} tt={tt} /> : null}
        </section>
      ))}
      {drawer ? <LeagueDrawer nav={nav} entries={entries} showSport={sport === 'all'} onPick={(key) => setLeague(key)} onClose={() => setDrawer(false)} /> : null}
    </div>
  )
}
