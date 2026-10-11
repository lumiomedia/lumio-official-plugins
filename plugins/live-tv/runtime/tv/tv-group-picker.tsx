'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import type { TvNav } from './tv-shell'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { useTextPrompt } from './tv-text-entry'
import { PickerPanel, Check } from './picker-panel'
import { filterGroupNames } from './group-chips'
import { GroupSheetPhone } from './mobile/group-sheet-phone'

/**
 * Rader per steg. En TV-box med 2 GB ska inte bygga några hundra fokusbara
 * rader på en gång när panelen öppnas — samma stegtanke som hubbens
 * "Visa fler" och guidens `ROW_STEP`. Fokus nära slutet lägger på nästa steg,
 * så fjärren märker inget; "Visa fler" sist är musens väg.
 */
export const GROUP_PANEL_STEP = 40
/** Så här många rader före slutet räcker för att nästa steg ska ritas. */
const PREFETCH_ROWS = 5

/**
 * Grupplistan bakom "Alla grupper (N)" på TV och skrivbord: samma högerpanel
 * som kanal- och flervalsväljaren (`PickerPanel` — `data-panel-root`,
 * `nav.pushLayer(close)` som enda Bakåt-väg, fokus tillbaka till öppnaren).
 *
 * Sök: på TV är det en station som öppnar värdens tangentbordspanel
 * (`useTextPrompt`, samma väg som inställningarnas textfält — ett eget
 * skärmtangentbord i panelen hade varit 45 stationer till), utanför TV ett
 * riktigt `<input>` som filtrerar medan man skriver.
 */
export function TvGroupPanel({ nav, groups, counts, value, onPick, onClose, opener }: {
  nav: TvNav
  groups: readonly string[]
  counts?: ReadonlyMap<string, number>
  value: string | null
  onPick: (group: string) => void
  onClose: () => void
  /** Se `PickerPanel`: fokusmålet efter stängning när öppnaren redan är riven. */
  opener?: HTMLElement | null
}) {
  const { tt } = useTvText()
  const tvMode = useTvMode()
  const prompt = useTextPrompt({ pushLayer: nav.pushLayer })
  const [query, setQuery] = useState('')
  const hits = useMemo(() => filterGroupNames(groups, query), [groups, query])
  // Den valda gruppen ska stå med i första ritningen, annars landar fjärren
  // högst upp i stället för där man stod.
  const [visible, setVisible] = useState(() => {
    const index = value === null ? -1 : groups.indexOf(value)
    return Math.max(GROUP_PANEL_STEP, Math.ceil((index + 1) / GROUP_PANEL_STEP) * GROUP_PANEL_STEP)
  })
  const changeQuery = (next: string) => { setQuery(next); setVisible(GROUP_PANEL_STEP) }
  const shown = hits.slice(0, visible)
  const more = hits.length > shown.length
  const initIndex = Math.max(0, value === null ? 0 : shown.indexOf(value))

  let search: ReactNode = null
  if (!tvMode) {
    search = (
      <input
        data-testid="group-search-input"
        data-f=""
        // Utanför TV tar fältet första fokus: man öppnar listan för att skriva.
        data-init=""
        value={query}
        placeholder={tt('groupSearch')}
        aria-label={tt('groupSearch')}
        onChange={(event) => changeQuery(event.target.value)}
        style={{ height: dp(48), minHeight: dp(48), borderRadius: dp(12), background: TV.s10, border: `1px solid ${TV.line}`, color: TV.text, padding: `0 ${dp(16)}px`, fontSize: dp(18) }}
      />
    )
  } else if (prompt.available) {
    search = (
      <div data-row="">
        <div
          data-testid="group-search"
          {...station(() => prompt.ask(tt('groupSearch'), query, changeQuery), undefined, shown.length === 0 ? { 'data-init': '' } : undefined)}
          style={{ height: dp(52), minHeight: dp(52), borderRadius: dp(12), background: TV.s10, display: 'flex', alignItems: 'center', padding: `0 ${dp(16)}px`, fontSize: dp(18), color: query ? TV.text : TV.dim, cursor: 'pointer' }}
        >
          {query || tt('groupSearch')}
        </div>
      </div>
    )
  }

  return (
    <>
      <PickerPanel
        nav={nav}
        title={`${tt('groupPickerTitle')} (${groups.length})`}
        onClose={onClose}
        testId="group-picker"
        opener={opener}
        chips={search}
        rows={(close) => (
          <>
            {shown.length === 0 ? <div data-testid="group-search-empty" style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('noResults')}</div> : null}
            {shown.map((group, index) => {
              const on = group === value
              const count = counts?.get(group)
              return (
                <div
                  key={group}
                  data-testid={`group-row-${group}`}
                  {...station(() => { onPick(group); close() }, undefined, tvMode && index === initIndex ? { 'data-init': '' } : undefined)}
                  onFocus={more && index >= shown.length - PREFETCH_ROWS ? () => setVisible((v) => v + GROUP_PANEL_STEP) : undefined}
                  style={{ height: dp(56), minHeight: dp(56), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(12), padding: `0 ${dp(12)}px`, cursor: 'pointer', background: on ? TV.s08 : 'transparent' }}
                >
                  <Check on={on} label={group} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: dp(18), fontWeight: on ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group}</span>
                  {count !== undefined ? <span style={{ fontSize: dp(15), color: TV.faint, flexShrink: 0 }}>{count}</span> : null}
                </div>
              )
            })}
            {more ? (
              <div data-testid="group-show-more" {...station(() => setVisible((v) => v + GROUP_PANEL_STEP))} style={{ height: dp(56), minHeight: dp(56), borderRadius: dp(12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: dp(17), fontWeight: 600, cursor: 'pointer' }}>{tt('showMore')}</div>
            ) : null}
          </>
        )}
      />
      {prompt.node}
    </>
  )
}

/**
 * "Alla grupper"-väljaren som krok: `open()` från chipen, `node` monteras i
 * vyn. Telefonen får bottenarket, TV och skrivbord högerpanelen.
 */
export function useGroupPicker({ nav, phone, groups, counts, value, onPick }: {
  nav: TvNav
  phone: boolean
  groups: readonly string[]
  counts?: ReadonlyMap<string, number>
  value: string | null
  onPick: (group: string) => void
}): { open: () => void; node: ReactNode } {
  const [isOpen, setOpen] = useState(false)
  const close = () => setOpen(false)
  let node: ReactNode = null
  if (isOpen) {
    node = phone
      ? <GroupSheetPhone groups={groups} counts={counts} value={value} onPick={onPick} onClose={close} pushLayer={nav.pushLayer} />
      : <TvGroupPanel nav={nav} groups={groups} counts={counts} value={value} onPick={onPick} onClose={close} />
  }
  return { open: () => setOpen(true), node }
}
