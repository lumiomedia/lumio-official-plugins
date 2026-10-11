'use client'

import { useEffect, useRef, useState } from 'react'
import { TV, station } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { MT, ellipsis, sectionLabel } from '../../tv/mobile/mobile-tokens'
import { countryGroups, foldText, searchLeagues, type LeagueEntry } from '../league-jump'
import type { SportKind } from '../sport-model'

/*
  Telefonens "Hoppa till": samma rena delar som TV:n (`league-jump.ts`), men
  egen ritning — telefonträdet får inte importera ur sport/tv/* (importcykeln).
  Lådan är ett bottenark på Sports svarta panelyta (TV.panel).
*/

const dot = <span data-testid="league-live-dot" aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: MT.live, flexShrink: 0 }} />

const chipStyle = { minHeight: 34, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0, background: MT.s12, border: `1px solid ${MT.line10}`, color: MT.muted70, cursor: 'pointer' } as const

export function PhoneYourLeagues({ entries, fallback, onJump, onMore }: { entries: LeagueEntry[]; fallback: boolean; onJump: (key: string) => void; onMore: () => void }) {
  const { tt } = useTvText()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={sectionLabel}>{fallback ? tt('sportTopLeagues') : tt('sportYourLeagues')}</span>
      <div data-testid="phone-your-leagues" data-row="" style={{ display: 'flex', gap: 8, overflowX: 'auto', minHeight: 44, padding: '5px 0', alignItems: 'center' }}>
        {entries.map((e) => (
          <div key={e.key} data-testid={`phone-league-chip-${e.key}`} {...station(() => onJump(e.key))} style={chipStyle}>
            {e.live > 0 ? dot : null}
            <span>{e.label}</span>
            <span style={{ color: MT.dim, fontVariantNumeric: 'tabular-nums' }}>{e.count}</span>
          </div>
        ))}
        <div data-testid="phone-league-more" {...station(onMore)} style={{ ...chipStyle, color: MT.text, border: `1px solid ${MT.line20}` }}>{tt('sportMoreLeagues')}</div>
      </div>
    </div>
  )
}

function Row({ entry, showCountry, sportLabel, onPick }: { entry: LeagueEntry; showCountry: boolean; sportLabel: string | null; onPick: () => void }) {
  const sub = [showCountry ? entry.country : null, sportLabel].filter(Boolean).join(' · ')
  return (
    <div data-testid={`phone-league-row-${entry.key}`} {...station(onPick)} style={{ minHeight: 52, padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${MT.line07}`, cursor: 'pointer' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{entry.league}</div>
        {sub ? <div style={{ fontSize: 12.5, color: MT.muted, ...ellipsis }}>{sub}</div> : null}
      </div>
      {entry.live > 0 ? dot : null}
      <span style={{ fontSize: 13, color: MT.dim, fontVariantNumeric: 'tabular-nums' }}>{entry.count}</span>
    </div>
  )
}

/** "Fler ligor…" på telefon: sök överst, ligorna per land (Sverige först), fällda länder fälls ut med ett tryck. */
export function PhoneLeagueSheet({ entries, kindLabel, onPick, onClose, pushLayer }: {
  entries: LeagueEntry[]
  /** Sport per rad bara när "Alla sporter" är valt. */
  kindLabel: ((k: SportKind) => string) | null
  onPick: (key: string) => void
  onClose: () => void
  pushLayer: (close: () => void) => () => void
}) {
  const { tt } = useTvText()
  const [query, setQuery] = useState('')
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  useEffect(() => pushLayer(() => onCloseRef.current()), [pushLayer])
  const searching = foldText(query) !== ''
  const hits = searching ? searchLeagues(entries, query) : []
  const pick = (key: string) => { onClose(); onPick(key) }
  const sportOf = (e: LeagueEntry) => (kindLabel ? kindLabel(e.sport) : null)

  return (
    <>
      <div data-testid="sheet-scrim" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: MT.scrim }} />
      <div role="dialog" aria-modal="true" data-testid="phone-league-sheet" data-live-tv-layer="" data-panel-root=""
        style={{ position: 'fixed', left: 8, right: 8, bottom: 8, zIndex: 71, borderRadius: 26, boxSizing: 'border-box', background: TV.panel, border: `1px solid ${MT.line10}`, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', color: MT.text, fontFamily: MT.font, overflow: 'hidden', paddingBottom: MT.SAFE_BOTTOM, display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        <div style={{ padding: '18px 20px 12px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: `1px solid ${MT.line08}` }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{tt('sportAllLeagues')}</div>
          <input data-testid="phone-league-search" value={query} placeholder={tt('sportLeagueSearch')} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} enterKeyHint="search"
            style={{ height: MT.HIT, borderRadius: 12, border: `1px solid ${MT.line14}`, background: 'rgba(0,0,0,0.25)', color: MT.text, padding: '0 14px', fontSize: 16 }} />
        </div>
        <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {searching
            ? (hits.length === 0
              ? <div style={{ padding: 20, fontSize: 15, color: MT.muted }}>{tt('sportLeagueNoHits')}</div>
              : hits.map((e) => <Row key={e.key} entry={e} showCountry sportLabel={sportOf(e)} onPick={() => pick(e.key)} />))
            : countryGroups(entries).map((g) => {
              const id = g.country ? foldText(g.country) : ''
              const open = toggled[id] ?? !g.collapsed
              return (
                <section key={id || '__other'} data-testid={`phone-league-country-${g.country ?? 'other'}`}>
                  <div {...station(() => setToggled((t) => ({ ...t, [id]: !open })))} aria-expanded={open ? 'true' : 'false'} style={{ minHeight: MT.HIT, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, background: MT.s05, color: MT.muted, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    <span style={{ flex: 1, minWidth: 0, ...ellipsis }}>{g.country ?? tt('sportLeagueOther')}</span>
                    {g.live > 0 ? dot : null}
                    <span style={{ color: MT.dim, letterSpacing: 0, fontWeight: 400 }}>{tt('sportLeagueMatches', { n: g.total })}</span>
                    <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                  </div>
                  {open ? g.entries.map((e) => <Row key={e.key} entry={e} showCountry={false} sportLabel={sportOf(e)} onPick={() => pick(e.key)} />) : null}
                </section>
              )
            })}
        </div>
        <div style={{ padding: 8 }}>
          <div {...station(onClose)} style={{ minHeight: 50, borderRadius: 16, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>{tt('cancel')}</div>
        </div>
      </div>
    </>
  )
}
