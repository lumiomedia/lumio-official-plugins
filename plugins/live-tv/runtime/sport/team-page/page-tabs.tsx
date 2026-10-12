'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { TV, station } from '../../tv/tv-ui'
import type { U } from '../match-info/match-info-parts'
import { focusAttr } from '../surface'

/*
  FLIKAR PÅ LAG- OCH LIGASIDAN (Jerry 2026-10-12: "för mycket navigerande med
  fjärrkontrollen — dela upp det på tabbar"). Samma flikstil som Sports egen
  rad (Översikt / Tabeller & resultat / Mina lag). Bara flikar med innehåll
  visas. På TV byter ◂/▸ på flikraden flik direkt (fokus = vald flik), ▾ går
  till flikens första stopp och ▴ från flikens översta rad tillbaka till den
  valda fliken.
*/

export type TeamTab = 'overview' | 'matches' | 'squad' | 'trophies'
export type LeagueTab = 'table' | 'round' | 'scorers'

/** Senast valda flik per sidtyp under sessionen (nästa lagsida öppnar där man var). */
const lastTab: { team: TeamTab | null; league: LeagueTab | null } = { team: null, league: null }
export function __resetPageTabsForTests(): void { lastTab.team = null; lastTab.league = null }

/** Vald flik: den sparade om den finns bland de tillgängliga, annars den första. */
export function usePageTab<K extends TeamTab | LeagueTab>(kind: 'team' | 'league', available: K[]): [K, (k: K) => void] {
  const [chosen, setChosen] = useState<K | null>(() => (lastTab[kind] as K | null) ?? null)
  const tab = chosen && available.includes(chosen) ? chosen : available[0]
  const set = (k: K) => { setChosen(k); (lastTab as Record<string, string | null>)[kind] = k }
  return [tab, set]
}

export function PageTabs<K extends string>({ u, scope, tabs, value, onChange }: { u: U; scope: string; tabs: Array<{ key: K; label: string }>; value: K; onChange: (k: K) => void }) {
  if (tabs.length < 2) return null
  return (
    <div data-testid="page-tabs" data-row="" role="tablist" style={{ display: 'flex', alignItems: 'flex-end', gap: u(28), borderBottom: `1px solid ${TV.s12}`, flexShrink: 0, overflowX: u.tv ? 'visible' : 'auto', paddingTop: u(4) }}>
      {tabs.map((t) => {
        const on = t.key === value
        return (
          <div key={t.key} data-testid={`page-tab-${t.key}`}
            {...station(() => onChange(t.key), undefined, { ...focusAttr('tab'), 'data-f-down': `${scope} [data-tab-body] [data-f]`, ...(on ? { 'data-tab-active': '' } : null) })}
            role="tab" aria-selected={on ? 'true' : 'false'}
            // TV: att flytta fokus längs raden byter flik, som Sports egen flikrad upplevs.
            onFocus={u.tv && !on ? () => onChange(t.key) : undefined}
            style={{ padding: `${u(6)}px ${u(4)}px ${u(10)}px`, fontSize: u(20), fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, color: on ? TV.text : TV.muted, borderBottom: `${u(4)}px solid ${on ? TV.acc : 'transparent'}`, marginBottom: -1 }}>
            {t.label}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Flikens innehåll. Stationerna i översta raden får ▴ till den valda fliken
 * (mäts efter varje ritning: vilka som står överst beror på layouten).
 */
export function TabBody({ scope, children, gap }: { scope: string; children: ReactNode; gap: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const stations = Array.from(root.querySelectorAll<HTMLElement>('[data-f]'))
    const top = Math.min(...stations.map((el) => el.getBoundingClientRect().top))
    for (const el of stations) {
      const first = Math.abs(el.getBoundingClientRect().top - top) < 8
      if (first && !el.hasAttribute('data-f-up')) { el.setAttribute('data-f-up', `${scope} [data-tab-active]`); el.setAttribute('data-f-up-auto', '1') }
      else if (!first && el.getAttribute('data-f-up-auto') === '1') { el.removeAttribute('data-f-up'); el.removeAttribute('data-f-up-auto') }
    }
  })
  return <div ref={ref} data-tab-body="" style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>
}
