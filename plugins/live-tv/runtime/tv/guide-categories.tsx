'use client'

import type { CSSProperties, JSX } from 'react'
import { dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { V2 } from './v2-tokens'

/** En kategori i guidens kolumn/chips: `key` null = Alla; `count` saknas för "Alla grupper (N)". */
export interface GuideCategoryItem { key: string | null; label: string; count?: number }

export interface GuideCategoriesProps {
  items: GuideCategoryItem[]
  value: string | null
  onPick(key: string | null): void
}

/** Kolumnens bredd (handoff v2 "Category column"). */
export const GUIDE_CATEGORY_COLUMN_W = 236

const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

/**
 * Kategorikolumnen 236 px (standard): rubrik 44 px i samma höjd som vyernas
 * kolumnhuvud, sedan poster 58 px. Vald post = ljusare yta + tunn inre kant;
 * fokusringen är appens (inset, `data-v2f`). OK väljer — fokus ensamt byter
 * inte kategori, annars laddades listan om vid varje ▲▼ genom kolumnen.
 */
export function GuideCategoryColumn({ items, value, onPick }: GuideCategoriesProps): JSX.Element {
  const { tt } = useTvText()
  return (
    <div data-testid="guide-category-column" style={{ width: dp(GUIDE_CATEGORY_COLUMN_W), flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ height: dp(44), flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: dp(6), fontSize: dp(15), letterSpacing: '0.1em', textTransform: 'uppercase', color: V2.text3 }}>{tt('categories')}</div>
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: dp(6), paddingTop: dp(6), paddingBottom: dp(24), scrollbarWidth: 'none' }}>
        {items.map((item) => {
          const on = item.key === value
          return (
            <div
              key={item.key ?? '__all'}
              data-testid="guide-cat"
              data-key={item.key ?? ''}
              {...station(() => onPick(item.key), undefined, { 'data-v2f': 'inset', ...(on ? { 'data-selected': '' } : {}) })}
              style={{ height: dp(58), flexShrink: 0, borderRadius: dp(12), padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(10), fontSize: dp(20), fontWeight: on ? 600 : 400, background: on ? 'rgba(252,252,255,0.14)' : 'transparent', color: on ? V2.text : 'rgba(243,244,248,0.7)', boxShadow: on ? 'inset 0 0 0 1px rgba(255,255,255,0.18)' : 'none', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <span style={{ minWidth: 0, ...ellipsis }}>{item.label}</span>
              {item.count !== undefined ? <span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.45)', fontWeight: 400, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{item.count}</span> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Chipslayouten: 46 px pills ovanför listan — frigör ~240 px åt kanalerna. */
export function GuideCategoryChips({ items, value, onPick }: GuideCategoriesProps): JSX.Element {
  return (
    <div data-testid="guide-category-chips" data-row="" style={{ display: 'flex', gap: dp(10), padding: `${dp(4)}px ${dp(48)}px ${dp(16)}px`, flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none', position: 'relative', zIndex: 1 }}>
      {items.map((item) => {
        const on = item.key === value
        return (
          <div
            key={item.key ?? '__all'}
            data-testid="guide-cat"
            data-key={item.key ?? ''}
            // Upp från chipsen går till lägesväljaren (Jerry 2026-10-31: från
            // Alla hamnade fokus i sidomenyn) — på det aktiva läget.
            {...station(() => onPick(item.key), undefined, { 'data-v2f': 'btn', 'data-f-up': '[data-testid^="guide-mode-"][data-active]', ...(on ? { 'data-selected': '' } : {}) })}
            style={{ flexShrink: 0, height: dp(46), padding: `0 ${dp(22)}px`, borderRadius: 999, fontSize: dp(19), fontWeight: on ? 600 : 400, display: 'inline-flex', alignItems: 'center', background: on ? 'rgba(252,252,255,0.18)' : 'rgba(252,252,255,0.06)', color: on ? V2.text : 'rgba(243,244,248,0.7)', border: `1px solid ${on ? 'rgba(255,255,255,0.24)' : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap', boxSizing: 'border-box' }}
          >
            {item.label}
          </div>
        )
      })}
    </div>
  )
}
