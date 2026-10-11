'use client'

import { useRef, useState } from 'react'
import { TV, dp, station, Chip } from '../../tv/tv-ui'
import { useTvText, type TvStringKey } from '../../tv/tv-strings'
import { Crest } from './sport-parts'
import { MatchScore, matchStatusLabel } from './sport-score'
import { KeyCard } from '../key-card'
import { useSportSettings } from '../sport-store'
import type { ResultsController } from '../results-controller'
import type { StandingRow } from '../provider'
import type { SportMatch } from '../sport-model'
import { FORM_COLOR, formLetters, groupResults, type ResultGroup, type ResultsFilter } from '../results-model'
import { sportBg } from '../surface'
export { formLetters, groupResults, type ResultGroup, type ResultsFilter } from '../results-model'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string
function StandingsTable({ rows, tt }: { rows: StandingRow[]; tt: TT }) {
  const cell = { padding: `${dp(6)}px ${dp(8)}px`, fontSize: dp(15) } as const
  return (
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
  )
}

export function SportResults({ matches, controller, onOpenMatch, tv }: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; tv: boolean }) {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const [filter, setFilter] = useState<ResultsFilter>('all')
  const [tables, setTables] = useState<Record<string, StandingRow[] | 'loading'>>({})
  const groupRefs = useRef(new Map<string, HTMLElement>())

  if (!settings.apiKey || !controller) {
    return <KeyCard variant="tab" />
  }

  const { groups, liveCount, mineCount } = groupResults(matches, filter)
  const toggleTable = async (g: ResultGroup) => {
    if (tables[g.key]) { setTables((t) => { const { [g.key]: _drop, ...rest } = t; return rest }); return }
    setTables((t) => ({ ...t, [g.key]: 'loading' }))
    const rows = controller.standings(g.sport, g.leagueId, g.season) ?? (await controller.loadStandings(g.sport, g.leagueId, g.season))
    setTables((t) => ({ ...t, [g.key]: rows ?? [] }))
  }

  return (
    <div data-testid="sport-results" style={{ display: 'flex', flexDirection: 'column', gap: dp(20) }}>
      <div style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
        <Chip active={filter === 'all'} {...station(() => setFilter('all'), undefined, tv ? { 'data-init': '' } : undefined)}>{tt('sportResultsAll')}</Chip>
        <Chip active={filter === 'live'} {...station(() => setFilter('live'))}>{`${tt('sportResultsLive')} (${liveCount})`}</Chip>
        <Chip active={filter === 'mine'} {...station(() => setFilter('mine'))}>{tt('sportResultsMine', { n: mineCount })}</Chip>
      </div>
      {groups.length > 0 ? (
        <div style={{ display: 'flex', gap: dp(10), alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: dp(13), letterSpacing: '0.12em', color: TV.dim }}>{tt('sportJumpTo')}</span>
          {groups.map((g) => (
            <Chip key={g.key} active={false} {...station(() => { const el = groupRefs.current.get(g.key); el?.scrollIntoView?.({ block: 'start' }); (el?.querySelector('[data-f]') as HTMLElement | null)?.focus() })}>{g.league}</Chip>
          ))}
        </div>
      ) : null}
      {groups.length === 0 ? <div style={{ color: TV.dim, fontSize: dp(16) }}>{tt('sportResultsEmpty')}</div> : null}
      {groups.map((g) => (
        <section key={g.key} ref={(el) => { if (el) groupRefs.current.set(g.key, el); else groupRefs.current.delete(g.key) }} style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: dp(20), fontWeight: 600 }}>{g.round != null ? `${g.league} · ${tt('sportRound', { n: g.round })}` : g.league}</div>
            <div {...station(() => void toggleTable(g))} style={{ fontSize: dp(15), color: TV.muted, cursor: 'pointer', padding: `${dp(6)}px ${dp(12)}px`, borderRadius: dp(8), background: TV.s08 }}>{tt('sportTable')}</div>
          </div>
          {g.matches.map((m) => (
            <div key={m.id} {...station(() => onOpenMatch(m))} style={{ display: 'grid', gridTemplateColumns: `${dp(64)}px 1fr auto 1fr`, alignItems: 'center', gap: dp(10), padding: `${dp(10)}px ${dp(12)}px`, borderRadius: dp(10), background: sportBg(TV.s05), cursor: 'pointer' }}>
              <span style={{ fontSize: dp(14), color: m.status === 'live' ? TV.live : TV.dim }}>{matchStatusLabel(m, tt) ?? ''}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: dp(8), justifyContent: 'flex-end' }}>{m.home}<Crest name={m.home ?? ''} colorKey={m.homeKey ?? ''} src={m.homeCrest} size={dp(22)} /></span>
              <MatchScore match={m} size="row" />
              <span style={{ display: 'flex', alignItems: 'center', gap: dp(8) }}><Crest name={m.away ?? ''} colorKey={m.awayKey ?? ''} src={m.awayCrest} size={dp(22)} />{m.away}</span>
            </div>
          ))}
          {tables[g.key] && tables[g.key] !== 'loading' ? <StandingsTable rows={tables[g.key] as StandingRow[]} tt={tt} /> : null}
        </section>
      ))}
    </div>
  )
}
