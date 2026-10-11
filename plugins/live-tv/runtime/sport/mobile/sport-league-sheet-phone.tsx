'use client'

import { useState } from 'react'
import { station } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { countryGroups, foldText, searchLeagues, type LeagueEntry } from '../league-jump'
import type { SportKind } from '../sport-model'
import { PhoneSportSheet, SheetRow, sheetTitle } from './phone-sport-sheet'
import type { ResultsScope } from './phone-sport-model'

/*
  Ligaväljaren på telefon ("Alla ligor ▾" i Tabeller & resultat): Alla ligor
  och Mina lag överst, sedan sök och ligorna per land (Sverige först, fällda
  länder fälls ut med ett tryck). Samma rena delar som TV:n (`league-jump.ts`),
  egen ritning — telefonträdet får inte importera ur sport/tv/* (importcykeln).
*/

const dot = <span data-testid="league-live-dot" aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: MT.live, flexShrink: 0 }} />

function Row({ entry, on, showCountry, sportLabel, onPick }: { entry: LeagueEntry; on: boolean; showCountry: boolean; sportLabel: string | null; onPick: () => void }) {
  const sub = [showCountry ? entry.country : null, sportLabel].filter(Boolean).join(' · ')
  return (
    <SheetRow testId={`phone-league-row-${entry.key}`} on={on} height={50} onPress={onPick}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{entry.league}</div>
        {sub ? <div style={{ fontSize: 12, opacity: 0.7, ...ellipsis }}>{sub}</div> : null}
      </div>
      {entry.live > 0 ? dot : null}
      <span style={{ fontSize: 13, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{entry.count}</span>
    </SheetRow>
  )
}

export function PhoneLeagueSheet({ entries, scope, followedCount, kindLabel, onPick, onClose, pushLayer }: {
  entries: LeagueEntry[]
  scope: ResultsScope
  followedCount: number
  /** Sport per rad bara när "Alla sporter" är valt. */
  kindLabel: ((k: SportKind) => string) | null
  onPick: (scope: ResultsScope) => void
  onClose: () => void
  pushLayer: (close: () => void) => () => void
}) {
  const { tt } = useTvText()
  const [query, setQuery] = useState('')
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const searching = foldText(query) !== ''
  const hits = searching ? searchLeagues(entries, query) : []
  const pick = (key: ResultsScope) => { onClose(); onPick(key) }
  const sportOf = (e: LeagueEntry) => (kindLabel ? kindLabel(e.sport) : null)
  const total = entries.reduce((n, e) => n + e.count, 0)

  return (
    <PhoneSportSheet testId="phone-league-sheet" label={tt('sportAllLeagues')} onClose={onClose} pushLayer={pushLayer}>
      <span style={sheetTitle}>{tt('sportAllLeagues')}</span>
      <SheetRow testId="phone-league-all" on={scope === 'all'} height={50} onPress={() => pick('all')}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(243,244,248,0.5)' }} />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{tt('sportAllLeagues')}</span>
        <span style={{ fontSize: 13, opacity: 0.7 }}>{total}</span>
      </SheetRow>
      <SheetRow testId="phone-league-followed" on={scope === 'followed'} height={50} onPress={() => pick('followed')}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: MT.acc }} />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{tt('sportTabFollows')}</span>
        <span style={{ fontSize: 13, opacity: 0.7 }}>{followedCount}</span>
      </SheetRow>
      <input data-testid="phone-league-search" value={query} placeholder={tt('sportLeagueSearch')} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} enterKeyHint="search"
        style={{ height: MT.HIT, flexShrink: 0, borderRadius: 12, border: `1px solid ${MT.line14}`, background: 'rgba(0,0,0,0.25)', color: MT.text, padding: '0 14px', fontSize: 16, marginTop: 4 }} />
      {searching
        ? (hits.length === 0
          ? <div style={{ padding: 8, fontSize: 15, color: MT.muted }}>{tt('sportLeagueNoHits')}</div>
          : hits.map((e) => <Row key={e.key} entry={e} on={scope === e.key} showCountry sportLabel={sportOf(e)} onPick={() => pick(e.key)} />))
        : countryGroups(entries).map((g) => {
          const id = g.country ? foldText(g.country) : ''
          const open = toggled[id] ?? !g.collapsed
          return (
            <section key={id || '__other'} data-testid={`phone-league-country-${g.country ?? 'other'}`} style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <div {...station(() => setToggled((t) => ({ ...t, [id]: !open })))} aria-expanded={open ? 'true' : 'false'} style={{ minHeight: 36, display: 'flex', alignItems: 'center', gap: 8, color: MT.muted, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                <span style={{ flex: 1, minWidth: 0, ...ellipsis }}>{g.country ?? tt('sportLeagueOther')}</span>
                {g.live > 0 ? dot : null}
                <span style={{ color: MT.dim, letterSpacing: 0, fontWeight: 400, textTransform: 'none' }}>{tt('sportLeagueMatches', { n: g.total })}</span>
                <span aria-hidden="true">{open ? '▾' : '▸'}</span>
              </div>
              {open ? g.entries.map((e) => <Row key={e.key} entry={e} on={scope === e.key} showCountry={false} sportLabel={sportOf(e)} onPick={() => pick(e.key)} />) : null}
            </section>
          )
        })}
    </PhoneSportSheet>
  )
}
