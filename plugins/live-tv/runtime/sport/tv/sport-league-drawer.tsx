'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { Chip, TV, dp, station } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { PickerPanel } from '../../tv/tv-list-picker'
import { useTextPrompt } from '../../tv/tv-text-entry'
import type { TvNav } from '../../tv/tv-shell'
import { countryGroups, foldText, searchLeagues, type LeagueEntry } from '../league-jump'
import { sportBg, sportStackedStyle, sportSurface } from '../surface'
import { SportIcon } from './sport-icons'
import { ellipsis } from './sport-parts'

/** Röd punkt = minst en match i ligan pågår. */
export function LiveDot({ size = dp(9) }: { size?: number }) {
  return <span data-testid="league-live-dot" aria-hidden="true" style={{ width: size, height: size, borderRadius: 999, background: TV.live, flexShrink: 0, display: 'inline-block' }} />
}

/** Chipets innehåll i "Dina ligor": namn, livepunkt, antal. */
export function LeagueChipBody({ entry }: { entry: LeagueEntry }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: dp(8) }}>
      {entry.live > 0 ? <LiveDot /> : null}
      <span>{entry.label}</span>
      <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{entry.count}</span>
    </span>
  )
}

const rowStyle = { minHeight: dp(60), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(12), padding: `0 ${dp(12)}px`, cursor: 'pointer' } as const

function LeagueRow({ entry, showCountry, showSport, onPick, init }: { entry: LeagueEntry; showCountry: boolean; showSport: boolean; onPick: () => void; init: boolean }) {
  return (
    <div data-testid={`league-row-${entry.key}`} {...station(onPick, undefined, init ? { 'data-init': '' } : undefined)} style={rowStyle}>
      {showSport ? <span style={{ color: TV.muted, display: 'inline-flex', flexShrink: 0 }}><SportIcon kind={entry.sport} size={dp(22)} /></span> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{entry.league}</div>
        {showCountry && entry.country ? <div style={{ fontSize: dp(15), color: TV.dim, ...ellipsis }}>{entry.country}</div> : null}
      </div>
      {entry.live > 0 ? <LiveDot /> : null}
      <span style={{ fontSize: dp(16), color: TV.faint, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{entry.count}</span>
    </div>
  )
}

/**
 * "Fler ligor…" på TV och skrivbord: Sports högerlåda (`PickerPanel`, TV.panel,
 * `nav.pushLayer` som Bakåt). Sök överst — på TV via skärmtangentbordet
 * (`useTextPrompt`), på skrivbordet ett riktigt fält som filtrerar medan man
 * skriver (lokalt, kostar ingen kvot). Annars ligorna per land; fällda länder
 * fälls ut med OK på rubriken. Ett val stänger lådan via panelens egen close
 * (fokus tillbaka till öppnaren) och hoppar sedan.
 */
export function LeagueDrawer({ nav, entries, showSport, onPick, onClose }: { nav: TvNav; entries: LeagueEntry[]; showSport: boolean; onPick: (key: string) => void; onClose: () => void }) {
  const { tt } = useTvText()
  const tv = useTvMode()
  const prompt = useTextPrompt({ pushLayer: nav.pushLayer })
  const [query, setQuery] = useState('')
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const searching = foldText(query) !== ''
  const hits = searching ? searchLeagues(entries, query) : []
  const groups = searching ? [] : countryGroups(entries)
  const empty = searching ? hits.length === 0 : entries.length === 0

  const searchField = tv ? (
    <div data-testid="league-search" {...station(() => prompt.ask(tt('sportLeagueSearch'), query, setQuery), undefined, empty ? { 'data-init': '' } : undefined)} style={{ height: dp(48), minHeight: dp(48), padding: `0 ${dp(16)}px`, borderRadius: dp(10), background: TV.s08, border: `1px solid ${TV.lineCard}`, display: 'flex', alignItems: 'center', fontSize: dp(17), color: query ? TV.text : TV.dim, cursor: 'pointer' }}>{query || tt('sportLeagueSearch')}</div>
  ) : (
    <input data-testid="league-search" value={query} placeholder={tt('sportLeagueSearch')} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false}
      style={{ height: dp(48), borderRadius: dp(10), border: `1px solid ${TV.lineStrong}`, background: 'rgba(0,0,0,0.25)', color: TV.text, padding: `0 ${dp(14)}px`, fontSize: dp(17) }} />
  )

  return (
    <PickerPanel
      nav={nav}
      title={tt('sportAllLeagues')}
      onClose={onClose}
      testId="league-drawer"
      // Tät (som kanalväljaren): resultaten bakom ska aldrig lysa igenom.
      surface={sportStackedStyle}
      chips={<>{searchField}{prompt.node}</>}
      rows={(close) => {
        const pick = (key: string) => { close(); onPick(key) }
        if (empty) return <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{searching ? tt('sportLeagueNoHits') : tt('sportResultsEmpty')}</div>
        if (searching) return hits.map((e, i) => <LeagueRow key={e.key} entry={e} showCountry showSport={showSport} onPick={() => pick(e.key)} init={i === 0} />)
        let first = true
        return groups.map((g) => {
          const id = g.country ? foldText(g.country) : ''
          const open = toggled[id] ?? !g.collapsed
          const rows = open ? g.entries.map((e) => {
            const init = first
            first = false
            return <LeagueRow key={e.key} entry={e} showCountry={false} showSport={showSport} onPick={() => pick(e.key)} init={init} />
          }) : null
          return (
            <section key={id || '__other'} data-testid={`league-country-${g.country ?? 'other'}`} style={{ display: 'flex', flexDirection: 'column', marginBottom: dp(8) }}>
              <div {...station(() => setToggled((t) => ({ ...t, [id]: !open })))} aria-expanded={open ? 'true' : 'false'} style={{ ...rowStyle, minHeight: dp(48), color: TV.muted, fontSize: dp(15), letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <span style={{ flex: 1, minWidth: 0, ...ellipsis }}>{g.country ?? tt('sportLeagueOther')}</span>
                {g.live > 0 ? <LiveDot /> : null}
                <span style={{ color: TV.faint, letterSpacing: 0 }}>{tt('sportLeagueMatches', { n: g.total })}</span>
                <span aria-hidden="true" style={{ width: dp(18), textAlign: 'center' }}>{open ? '▾' : '▸'}</span>
              </div>
              {rows}
            </section>
          )
        })
      }}
    />
  )
}

/**
 * Sports chip (Jerry 2026-10-12: valda och ovalda gick knappt att skilja,
 * ovalda såg ut som svag text på bakgrunden). Ovald = tät pill i kortytan
 * med vit text; vald = fylld ljus pill med mörk text, som sportchipsen
 * (Alla / Fotboll …). Fokus = Sports fokusmarkering; en vald chip behåller
 * sin mörka text under tonen (`data-chip-on`).
 */
export function SportChip({ active, children, style, ...rest }: { active: boolean; children: ReactNode; style?: CSSProperties } & Record<string, unknown>) {
  return (
    <Chip active={active} data-chip-on={active ? '1' : '0'} {...rest}
      style={{ height: dp(52), minHeight: dp(52), padding: `0 ${dp(20)}px`, gap: dp(8), fontSize: dp(19), fontWeight: active ? 700 : 600, boxSizing: 'border-box',
        ...(active ? { background: TV.text, color: '#12152a', border: `1px solid ${TV.text}` } : { ...sportSurface(sportBg('rgba(252,252,255,0.12)')), color: TV.text, border: `1px solid ${TV.lineCard}` }),
        ...style }}>
      {children}
    </Chip>
  )
}

/**
 * Raden ovanför resultaten: "Dina ligor" (eller de största) + "Fler ligor…".
 * Ett val filtrerar till ligan; då står "Alla ligor ×" först (återställer) och
 * den valda ligan markerad — även när den kom ur lådan och inte finns i raden.
 */
export function YourLeaguesRow({ entries, fallback, active = null, activeLabel = null, onJump, onReset, onMore, tv }: { entries: LeagueEntry[]; fallback: boolean; active?: string | null; activeLabel?: string | null; onJump: (key: string) => void; onReset?: () => void; onMore: () => void; tv: boolean }) {
  const { tt } = useTvText()
  const inRow = active ? entries.some((e) => e.key === active) : true
  return (
    <div data-testid="your-leagues" data-row="" style={{ display: 'flex', gap: dp(10), alignItems: 'center', flexWrap: tv ? 'nowrap' : 'wrap', overflowX: tv ? 'auto' : undefined }}>
      <span style={{ fontSize: dp(15), fontWeight: 700, letterSpacing: '0.12em', color: TV.muted, flexShrink: 0 }}>{fallback ? tt('sportTopLeagues') : tt('sportYourLeagues')}</span>
      {active && onReset ? (
        <SportChip data-testid="league-reset" active={false} {...station(onReset)}>{tt('sportAllLeaguesReset')}<span aria-hidden="true">✕</span></SportChip>
      ) : null}
      {active && !inRow ? (
        <SportChip data-testid={`league-chip-${active}`} active aria-pressed="true" {...station(() => onJump(active))}>{activeLabel ?? active}</SportChip>
      ) : null}
      {entries.map((e) => (
        <SportChip key={e.key} data-testid={`league-chip-${e.key}`} active={e.key === active} aria-pressed={e.key === active ? 'true' : 'false'} {...station(() => onJump(e.key))}><LeagueChipBody entry={e} /></SportChip>
      ))}
      <SportChip data-testid="league-more" active={false} {...station(onMore)}>{tt('sportMoreLeagues')}</SportChip>
    </div>
  )
}
