'use client'

import { useMemo, useState } from 'react'
import type { TvGlassMenuAction } from '@/lib/plugin-sdk'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { filterGroupNames } from '../group-chips'
import { MT } from './mobile-tokens'
import { MobileSheet } from './mobile-sheet'

/** Rader per steg — samma tanke som hubbens "Visa fler": hundratals grupper ritas inte på en gång. */
export const GROUP_SHEET_STEP = 60

/**
 * Telefonens grupplista bakom "Alla grupper (N)"-chipen: samma bottenark som
 * spellistvalet (`MobileSheet`, eget lager i Bakåt-kedjan), med ett sökfält
 * överst och raderna i steg. Ett val sätter gruppen som filter och stänger.
 */
export function GroupSheetPhone({ groups, counts, value, onPick, onClose, pushLayer }: {
  groups: readonly string[]
  counts?: ReadonlyMap<string, number>
  value: string | null
  onPick: (group: string) => void
  onClose: () => void
  pushLayer: (close: () => void) => () => void
}) {
  const { tt } = useTvText()
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(GROUP_SHEET_STEP)
  const hits = useMemo(() => filterGroupNames(groups, query), [groups, query])
  const items: TvGlassMenuAction[] = hits.slice(0, visible).map((g) => {
    const count = counts?.get(g)
    return { key: g, label: count === undefined ? g : `${g} · ${count}`, run: () => onPick(g) }
  })
  const header = (
    <div style={{ padding: '10px 16px', borderBottom: `1px solid ${MT.line08}` }}>
      <input
        data-testid="group-search-input"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setVisible(GROUP_SHEET_STEP) }}
        placeholder={tt('groupSearch')}
        aria-label={tt('groupSearch')}
        style={{ width: '100%', minHeight: 40, borderRadius: 12, background: MT.s10, border: '1px solid transparent', padding: '0 12px', fontSize: 16, color: MT.text, caretColor: MT.acc, outline: 'none', fontFamily: MT.font, boxSizing: 'border-box' }}
      />
    </div>
  )
  const footer = hits.length === 0
    ? <div data-testid="group-search-empty" style={{ padding: '18px 20px', fontSize: 15, color: MT.muted }}>{tt('noResults')}</div>
    : hits.length > visible
      ? <div data-testid="group-show-more" {...station(() => setVisible((v) => v + GROUP_SHEET_STEP))} style={{ minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{tt('showMore')}</div>
      : null
  return (
    <MobileSheet
      title={tt('groupPickerTitle')}
      subtitle={String(groups.length)}
      header={header}
      footer={footer}
      items={items}
      activeKey={value ?? undefined}
      onClose={onClose}
      pushLayer={pushLayer}
      testId="group-sheet"
    />
  )
}
