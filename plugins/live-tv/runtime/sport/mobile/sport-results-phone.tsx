'use client'

import { useMemo, useRef, useState } from 'react'
import { getPluginHttpAssetUrl } from '@/lib/plugin-sdk'
import { station } from '../../tv/tv-ui'
import { useTvText, type TvStringKey } from '../../tv/tv-strings'
import { MT, ellipsis, sectionLabel } from '../../tv/mobile/mobile-tokens'
import { MobileChips } from '../../tv/mobile/mobile-chips'
import { MobileSheet } from '../../tv/mobile/mobile-sheet'
import { KeyCard } from '../key-card'
import { FORM_COLOR, formLetters, groupResults, type ResultGroup, type ResultsFilter } from '../results-model'
import { matchStatusLabel, scoreText } from '../score-model'
import { crestText, type SportFilter, type SportKind, type SportMatch } from '../sport-model'
import { useFollows, useSportSettings } from '../sport-store'
import { leagueEntries, yourLeagues } from '../league-jump'
import { PhoneLeagueSheet, PhoneYourLeagues } from './sport-league-sheet-phone'
import type { ResultsController } from '../results-controller'
import type { StandingRow } from '../provider'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Lagets märke på telefon: källans bild via appens logocache, annars initialerna (som fas 1:s Crest, utan TV-skalning). */
export function PhoneCrest({ name, src, size = 22 }: { name: string; src?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const url = src && !broken ? getPluginHttpAssetUrl('/api/m3u-logo', src) : null
  if (url) return <img data-crest="" src={url} alt="" width={size} height={size} onError={() => setBroken(true)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 999, background: MT.s12, color: MT.muted, fontSize: Math.round(size * 0.42), fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {crestText(name)}
    </span>
  )
}

function PhoneStandings({ rows, tt }: { rows: StandingRow[]; tt: TT }) {
  const cell = { padding: '8px 6px', fontSize: 14 } as const
  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '4px 14px 12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: MT.text }}>
        <thead>
          <tr style={{ color: MT.dim, textAlign: 'left', fontSize: 12 }}>
            <th style={cell}>#</th><th style={cell}>{tt('sportColTeam')}</th><th style={cell}>{tt('sportColPlayed')}</th><th style={cell}>{tt('sportColPoints')}</th><th style={cell}>{tt('sportColForm')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.group ?? ''}-${r.rank}-${r.team.id}`} style={{ borderTop: `1px solid ${MT.line08}` }}>
              <td style={cell}>{r.rank}</td>
              <td style={{ ...cell, maxWidth: 150 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><PhoneCrest name={r.team.name} src={r.team.crest} size={18} /><span style={ellipsis}>{r.team.name}</span></span></td>
              <td style={cell}>{r.played}</td>
              <td style={{ ...cell, fontWeight: 700 }}>{r.points}</td>
              <td style={cell}>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {formLetters(r.form, tt).slice(-5).map((f, i) => (
                    <span key={i} data-testid="phone-form" style={{ width: 16, height: 16, borderRadius: 4, background: FORM_COLOR[f.kind], color: '#0e0f13', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{f.letter}</span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SportResultsPhone({ matches, controller, onOpenMatch, pushLayer, sport = 'all', kindLabel }: { matches: SportMatch[]; controller: ResultsController | null; onOpenMatch(m: SportMatch): void; pushLayer: (close: () => void) => () => void; sport?: SportFilter; kindLabel?: (k: SportKind) => string }) {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const [filter, setFilter] = useState<ResultsFilter>('all')
  const [table, setTable] = useState<{ group: ResultGroup; rows: StandingRow[] | null } | null>(null)
  const [leagueSheet, setLeagueSheet] = useState(false)
  const follows = useFollows()
  const sections = useRef(new Map<string, HTMLElement>())
  const forSport = useMemo(() => (sport === 'all' ? matches : matches.filter((m) => m.kind === sport)), [matches, sport])
  const { groups, liveCount, mineCount } = useMemo(() => groupResults(forSport, filter), [forSport, filter])
  const entries = useMemo(() => leagueEntries(groups, follows), [groups, follows])
  const mine = useMemo(() => yourLeagues(entries), [entries])

  if (!settings.apiKey || !controller) {
    return <KeyCard variant="tab" pushLayer={pushLayer} />
  }

  const labels = new Map(entries.map((e) => [e.key, e.label]))
  const jump = (key: string) => sections.current.get(key)?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  const openTable = async (g: ResultGroup) => {
    const cached = controller.standings(g.sport, g.leagueId, g.season)
    setTable({ group: g, rows: cached })
    if (cached) return
    const rows = await controller.loadStandings(g.sport, g.leagueId, g.season)
    setTable((t) => (t && t.group.key === g.key ? { group: g, rows: rows ?? [] } : t))
  }

  return (
    <div data-testid="phone-results" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <MobileChips<ResultsFilter>
        testId="phone-results-filter"
        items={[
          { key: 'all', label: tt('sportResultsAll'), id: 'all' },
          { key: 'live', label: `${tt('sportResultsLive')} (${liveCount})`, id: 'live' },
          { key: 'mine', label: tt('sportResultsMine', { n: mineCount }), id: 'mine' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {groups.length > 0 ? <PhoneYourLeagues entries={mine.entries} fallback={mine.fallback} onJump={jump} onMore={() => setLeagueSheet(true)} /> : null}
      {groups.length === 0 ? <div style={{ padding: '24px 4px', fontSize: 15, color: MT.muted }}>{tt('sportResultsEmpty')}</div> : null}
      {groups.map((g) => (
        <section key={g.key} data-testid={`phone-results-group-${g.key}`} ref={(el) => { if (el) sections.current.set(g.key, el); else sections.current.delete(g.key) }} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, scrollMarginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, fontSize: 17, fontWeight: 600, ...ellipsis }}>{g.round != null ? `${labels.get(g.key) ?? g.league} · ${tt('sportRound', { n: g.round })}` : labels.get(g.key) ?? g.league}</div>
            <div data-testid={`phone-table-${g.key}`} {...station(() => void openTable(g))} style={{ minHeight: MT.HIT, padding: '0 14px', borderRadius: 12, background: MT.s08, border: `1px solid ${MT.line08}`, display: 'inline-flex', alignItems: 'center', fontSize: 14, color: MT.muted70, cursor: 'pointer', flexShrink: 0 }}>{tt('sportTable')}</div>
          </div>
          {g.matches.map((m) => (
            <div key={m.id} data-testid="phone-result-row" {...station(() => onOpenMatch(m))} style={{ minHeight: 56, display: 'grid', gridTemplateColumns: '46px minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 14, background: MT.s07, border: `1px solid ${MT.line08}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: m.status === 'live' ? MT.live : MT.muted }}>{matchStatusLabel(m, tt) ?? ''}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minWidth: 0 }}><span style={{ fontSize: 14, ...ellipsis }}>{m.home}</span><PhoneCrest name={m.home ?? ''} src={m.homeCrest} /></span>
              <span data-testid="phone-result-score" style={{ fontSize: 16, fontWeight: 700, minWidth: 38, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{scoreText(m) ?? '–'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}><PhoneCrest name={m.away ?? ''} src={m.awayCrest} /><span style={{ fontSize: 14, ...ellipsis }}>{m.away}</span></span>
            </div>
          ))}
        </section>
      ))}
      {leagueSheet ? <PhoneLeagueSheet entries={entries} kindLabel={sport === 'all' ? kindLabel ?? null : null} onPick={jump} onClose={() => setLeagueSheet(false)} pushLayer={pushLayer} /> : null}
      {table ? (
        <MobileSheet
          testId="phone-standings-sheet"
          title={`${labels.get(table.group.key) ?? table.group.league} · ${tt('sportTable')}`}
          body={table.rows === null ? <div style={{ padding: 16, color: MT.muted }}>{tt('sportLoading')}</div> : <PhoneStandings rows={table.rows} tt={tt} />}
          items={[]}
          onClose={() => setTable(null)}
          pushLayer={pushLayer}
        />
      ) : null}
    </div>
  )
}
