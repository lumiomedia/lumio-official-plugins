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
import { LeagueDrawer, SportChip, YourLeaguesRow } from './sport-league-drawer'
import { FORM_COLOR, defaultResultsFilter, formLetters, groupResults, onlyLeague, type ResultGroup, type ResultsFilter } from '../results-model'
import { sportCardStyle } from '../surface'
import { SportIcons } from './sport-icons'
import { scaleFor, useListScale, type U } from '../match-info/match-info-parts'
import { NOOP, StandingsRows } from '../team-page/page-parts'
import { teamTargetFromRow, type TeamTarget } from '../team-model'
import { teamKeysMatch, type SportFollow } from '../sport-store'
import { foldTeamKey } from '../merge'
import type { ProviderId } from '../provider'
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

/** Följt lag i tabellen: samma nyckelregel som följ-markeringen i övrigt (AIK = AIK Stockholm). */
export function followedRow(follows: SportFollow[], sport: string, name: string): boolean {
  const key = foldTeamKey(name)
  return follows.some((f) => f.kind === 'team' && f.sport === sport && (teamKeysMatch(f.key, key) || teamKeysMatch(foldTeamKey(f.name), key)))
}

// Tabellen på TV: lag- och ligasidans tabell i TV-skala, smal nog att läsas (Jerry 2026-10-12).
export const TV_TABLE_MAX_W = 1200
const TV_U = scaleFor(false, true)

/**
 * Tabellen under en grupp på TV (Jerry 2026-10-12: den gamla var skrivbordsstor
 * och spred kolumnerna över hela bredden). Samma rader som lag- och ligasidan:
 * fokusbara, öppnar lagets sida, följda lag markerade, formen som brickor.
 */
function TvStandings({ g, rows, tt, follows, onOpen, rowAttrs, u = TV_U }: {
  g: ResultGroup; rows: StandingRow[] | 'loading'; tt: TT; follows: SportFollow[]; onOpen?: (row: StandingRow) => void
  rowAttrs: (i: number, n: number) => Record<string, string>; u?: U
}) {
  return (
    <div data-testid={`results-standings-${g.key}`} style={{ width: '100%', maxWidth: dp(TV_TABLE_MAX_W) }}>
      {rows === 'loading' || rows.length === 0
        ? <div data-testid={rows === 'loading' ? 'sport-standings-loading' : 'sport-standings-empty'} {...station(NOOP, undefined, rowAttrs(0, 1))}
            style={{ ...sportCardStyle, padding: `${u(14)}px ${u(18)}px`, fontSize: u(17), color: TV.muted }}>{rows === 'loading' ? tt('sportLoading') : tt('sportTableEmpty')}</div>
        : <StandingsRows u={u} ctx={{ tt }} testId="sport-standings" rows={rows} mark={-1} form onOpen={onOpen} rowAttrs={rowAttrs}
            highlight={(r) => followedRow(follows, g.sport, r.team.name)} />}
    </div>
  )
}

/** Tydlig Tabell-knapp (Jerry 2026-10-12: den gamla var för diskret): ikon, text och TV-storlek, fokusbar. */
function TableButton({ open, onPress, testId, tt, attrs }: { open: boolean; onPress: () => void; testId: string; tt: TT; attrs?: Record<string, string> }) {
  return (
    <div data-testid={testId} {...station(onPress, undefined, attrs)} aria-expanded={open ? 'true' : 'false'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: dp(10), height: dp(52), minHeight: dp(52), padding: `0 ${dp(18)}px`, borderRadius: dp(12), boxSizing: 'border-box', cursor: 'pointer', flexShrink: 0,
        fontSize: dp(18), fontWeight: 700, background: open ? TV.text : TV.s12, color: open ? '#12152a' : TV.text, border: `1px solid ${open ? TV.text : TV.lineStrong}` }}>
      <SportIcons.Table size={dp(22)} />
      <span>{open ? tt('sportTableHide') : tt('sportTable')}</span>
    </div>
  )
}

const sel = (testId: string) => `[data-testid="${testId.replace(/["\\]/g, '\\$&')}"]`

/**
 * Grannarna i resultatlistan (Jerry 2026-10-12: Tabell-knappen gick bara att
 * nå via Tennis-chipet). Läsordning: gruppens Tabell → dess matchrader →
 * (öppen tabell på TV: dess rader →) nästa grupps Tabell. ▸ från en matchrad
 * går till gruppens Tabell och ◂ tillbaka till gruppens första rad.
 * `open` = gruppens tabell står öppen med fokusbara rader (bara TV).
 */
export function groupNav(groups: ResultGroup[], gi: number, open: (key: string) => boolean = () => false): {
  table: Record<string, string>; row: (mi: number) => Record<string, string>; standings: (i: number, n: number) => Record<string, string>
} {
  const g = groups[gi]
  const table = sel(`results-table-${g.key}`)
  const row = (m: SportMatch) => sel(`results-row-${m.id}`)
  const stFirst = (key: string) => `${sel(`results-standings-${key}`)} [data-st-first]`
  const stLast = (key: string) => `${sel(`results-standings-${key}`)} [data-st-last]`
  const prev = groups[gi - 1]
  const next = groups[gi + 1]
  const first = g.matches[0]
  const last = g.matches[g.matches.length - 1]
  const isOpen = open(g.key)
  // Det som ligger sist i en grupp: tabellens sista rad, annars sista matchraden.
  const tail = (x: ResultGroup | undefined) => (!x ? null : open(x.key) ? stLast(x.key) : x.matches.length ? row(x.matches[x.matches.length - 1]) : null)
  const after = next ? sel(`results-table-${next.key}`) : null
  const prevTail = tail(prev)
  return {
    table: {
      ...(first ? { 'data-f-down': row(first), 'data-f-left': row(first) } : isOpen ? { 'data-f-down': stFirst(g.key) } : after ? { 'data-f-down': after } : {}),
      ...(prevTail ? { 'data-f-up': prevTail } : {}),
    },
    row: (mi) => ({
      'data-f-right': table,
      ...(mi === 0 ? { 'data-f-up': table } : {}),
      ...(g.matches[mi] === last ? (isOpen ? { 'data-f-down': stFirst(g.key) } : after ? { 'data-f-down': after } : {}) : {}),
    }),
    standings: (i, n) => ({
      ...(i === 0 ? { 'data-st-first': '', 'data-f-up': last ? row(last) : table } : {}),
      ...(i === n - 1 ? { 'data-st-last': '', ...(after ? { 'data-f-down': after } : {}) } : {}),
    }),
  }
}

const NO_LAYER = { pushLayer: () => () => {} } as unknown as TvNav

export function SportResults({ matches, controller, onOpenMatch, onOpenTeam, tv, sport = 'all', nav = NO_LAYER }: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; onOpenTeam?(target: TeamTarget): void; tv: boolean; sport?: SportFilter; nav?: TvNav }) {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const follows = useFollows()
  // Mina lag är förvalt så fort användaren följer något lag eller någon liga.
  const [filter, setFilter] = useState<ResultsFilter>(() => defaultResultsFilter(follows))
  const [league, setLeague] = useState<string | null>(null)
  const [tables, setTables] = useState<Record<string, StandingRow[] | 'loading'>>({})
  const [drawer, setDrawer] = useState(false)
  // Grupprubriker och matchrader i TV-skala på TV (Jerry 2026-10-12); skrivbordet oförändrat.
  const u = useListScale(tv)
  const forSport = useMemo(() => (sport === 'all' ? matches : matches.filter((m) => m.kind === sport)), [matches, sport])
  const { groups, liveCount, mineCount, followedCount } = useMemo(() => groupResults(forSport, filter, follows), [forSport, filter, follows])
  const shown = useMemo(() => onlyLeague(groups, league), [groups, league])
  const entries = useMemo(() => leagueEntries(groups, follows), [groups, follows])
  // Alla ligor-lådan: varje liga med matcher i dagens data (alla källor), oavsett Mina lag/Live-filtret.
  const allEntries = useMemo(() => leagueEntries(groupResults(forSport, 'all', follows).groups, follows), [forSport, follows])
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
  const labels = new Map(allEntries.map((e) => [e.key, e.label]))
  // En tabellrad öppnar lagets sida hos källan som faktiskt gav tabellen (ligans egen eller ett alias).
  const openTeam = onOpenTeam ? (g: ResultGroup) => (r: StandingRow) => {
    const src = controller.standingsSource?.(g.sport, g.leagueId, g.season)
    const provider = (src?.provider ?? g.matches[0]?.fixture?.provider) as ProviderId | undefined
    if (!provider) return
    onOpenTeam(teamTargetFromRow(g.sport, r, { provider, id: src?.leagueId ?? g.leagueId, season: (src?.season ?? g.season) || null, name: labels.get(g.key) ?? g.league }))
  } : null
  const tvOpen = (key: string) => tv && !!tables[key]

  return (
    <div data-testid="sport-results" style={{ display: 'flex', flexDirection: 'column', gap: dp(20) }}>
      <div style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
        <SportChip data-testid="results-filter-all" active={filter === 'all'} {...station(() => setFilter('all'), undefined, tv ? { 'data-init': '' } : undefined)}>{tt('sportResultsAll')}</SportChip>
        <SportChip data-testid="results-filter-followed" active={filter === 'followed'} {...station(() => setFilter('followed'))}>{tt('sportResultsFollowed', { n: followedCount })}</SportChip>
        <SportChip data-testid="results-filter-live" active={filter === 'live'} {...station(() => setFilter('live'))}>{`${tt('sportResultsLive')} (${liveCount})`}</SportChip>
        <SportChip data-testid="results-filter-mine" active={filter === 'mine'} {...station(() => setFilter('mine'))}>{tt('sportResultsMine', { n: mineCount })}</SportChip>
      </div>
      {groups.length > 0 || league ? <YourLeaguesRow entries={mine.entries} fallback={mine.fallback} active={league} activeLabel={league ? labels.get(league) ?? null : null} onJump={pickLeague} onReset={() => setLeague(null)} onMore={() => setDrawer(true)} tv={tv} /> : null}
      {shown.length === 0 ? <div style={{ color: TV.dim, fontSize: dp(16) }}>{tt('sportResultsEmpty')}</div> : null}
      {shown.map((g, gi) => {
        const gnav = groupNav(shown, gi, tvOpen)
        return (
        <section key={g.key} data-testid={`results-group-${g.key}`} style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: u(20), fontWeight: 600 }}>{g.round != null ? `${labels.get(g.key) ?? g.league} · ${tt('sportRound', { n: g.round })}` : labels.get(g.key) ?? g.league}</div>
            <TableButton testId={`results-table-${g.key}`} open={!!tables[g.key]} onPress={() => toggleTable(g)} tt={tt} attrs={gnav.table} />
          </div>
          {g.matches.map((m, mi) => (
            <div key={m.id} data-testid={`results-row-${m.id}`} {...station(() => onOpenMatch(m), undefined, gnav.row(mi))} style={{ display: 'grid', gridTemplateColumns: `${u(64)}px 1fr auto 1fr`, alignItems: 'center', gap: u(10), minHeight: u(48), boxSizing: 'border-box', fontSize: u(17), padding: `${u(10)}px ${u(12)}px`, ...sportCardStyle, borderRadius: u(10), cursor: 'pointer' }}>
              <span style={{ fontSize: u(14), color: m.status === 'live' ? TV.live : TV.dim }}>{matchStatusLabel(m, tt) ?? ''}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: u(8), justifyContent: 'flex-end' }}>{m.home}<Crest name={m.home ?? ''} colorKey={m.homeKey ?? ''} src={m.homeCrest} size={u(22)} /></span>
              <MatchScore match={m} size="row" px={u(20)} />
              <span style={{ display: 'flex', alignItems: 'center', gap: u(8) }}><Crest name={m.away ?? ''} colorKey={m.awayKey ?? ''} src={m.awayCrest} size={u(22)} />{m.away}</span>
            </div>
          ))}
          {tables[g.key]
            ? tv
              ? <TvStandings g={g} rows={tables[g.key]!} tt={tt} follows={follows} onOpen={openTeam?.(g)} rowAttrs={gnav.standings} />
              : <StandingsTable rows={tables[g.key]!} tt={tt} />
            : null}
        </section>
        )
      })}
      {drawer ? <LeagueDrawer nav={nav} entries={allEntries} showSport={sport === 'all'} onPick={(key) => setLeague(key)} onClose={() => setDrawer(false)} /> : null}
    </div>
  )
}
