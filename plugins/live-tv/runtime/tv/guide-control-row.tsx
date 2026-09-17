'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { DesktopGuideMode } from './guide-surface'
import type { TimelineZoom } from './tv-settings-store'
import { TV, station } from './tv-ui'
import { useTvText } from './tv-strings'

/**
 * Kontrollradens indata (spec §2). Lägesberoende delar är valfria: Nu-knappen
 * ritas i Grid/Timeline, zoomsegmentet i Timeline, Detaljer-toggeln i
 * Now / Next — raden själv avgör utifrån `mode`, inte utifrån om callbacken
 * råkar finnas.
 */
export interface GuideControls {
  mode: DesktopGuideMode
  onMode(next: DesktopGuideMode): void
  sourceLabel: string
  sourceCount: number
  onOpenSource(): void
  categoryLabel: string
  categoryCount: number
  onOpenCategory(): void
  dayOffset: 0 | 1
  onDay(next: 0 | 1): void
  /** Grid/Timeline: hoppa till nu. */
  onNow?: () => void
  /** Timeline. */
  zoom?: TimelineZoom
  onZoom?(z: TimelineZoom): void
  /** Now / Next. */
  details?: boolean
  onDetails?(): void
  clock: ReactNode
}

/**
 * Handoffens mått är designpixlar i scenen (`dp()` är identitet), så talen
 * står rakt av. Dropdown: 34 px, radius 10, yta .08 + kant .08. Segment:
 * padding 3, radius 999, yta .07; knappar 28 px, `0 16px`, 13 px; aktiv .16
 * + 600. Dagväljarens aktiva knapp är vit yta med mörk text.
 */
const DROPDOWN: CSSProperties = { height: 34, minHeight: 34, padding: '0 12px', borderRadius: 10, background: TV.s08, border: `1px solid ${TV.line}`, display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: 230, cursor: 'pointer', flexShrink: 1, minWidth: 0 }
const SEGMENT: CSSProperties = { display: 'inline-flex', padding: 3, borderRadius: 999, background: TV.s07, flexShrink: 0, whiteSpace: 'nowrap' }
const SEGMENT_BTN: CSSProperties = { height: 28, minHeight: 28, padding: '0 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: 13, whiteSpace: 'nowrap', cursor: 'pointer' }

function Dropdown({ label, count, onOpen, testId }: { label: string; count: number; onOpen: () => void; testId: string }) {
  return (
    <div data-testid={testId} {...station(onOpen)} style={DROPDOWN} title={label}>
      <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: TV.faint, flexShrink: 0 }}>{count}</span>
      <span aria-hidden="true" style={{ color: TV.faint, fontSize: 10, flexShrink: 0 }}>▾</span>
    </div>
  )
}

/**
 * Lokalt segment i stället för `tv-ui`:s `Segment`: det är ritat för
 * TV-rubrikraden (38 px, `tv-segment`-testid) och skulle krocka med både
 * handoffens mått och testid:n som skiljer kontrollradens tre segment åt.
 * `data-active` på den valda knappen är den enda tillståndsmarkören.
 */
function ControlSegment<K extends string>({ options, value, onChange, testId, activeStyle }: {
  options: { key: K; label: string }[]
  value: K
  onChange: (key: K) => void
  testId: string
  activeStyle?: CSSProperties
}) {
  return (
    <div data-testid={testId} style={SEGMENT}>
      {options.map((option) => {
        const active = option.key === value
        return (
          <div
            key={option.key}
            {...station(() => onChange(option.key), undefined, active ? { 'data-active': '' } : undefined)}
            style={{ ...SEGMENT_BTN, background: active ? TV.s16 : 'transparent', color: active ? TV.text : TV.muted, fontWeight: active ? 600 : 400, ...(active ? activeStyle : undefined) }}
          >
            {option.label}
          </div>
        )
      })}
    </div>
  )
}

const Divider = () => <span aria-hidden="true" style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

/**
 * Kontrollraden (spec §2, handoffen §Ram och kontrollrad): 56 px och den
 * ENDA raden över innehållet. Ordning: källa · kategori · avdelare · [dag] ·
 * [Nu] · mellanrum · läge · [zoom] · avdelare · [Detaljer] · klocka. Fler
 * val ska bli fler dropdowns här — aldrig en ny rad.
 */
export function GuideControlRow(props: GuideControls) {
  const { tt } = useTvText()
  const { mode } = props
  // Dag och Nu hör till fönstervyerna: Now / Next visar alltid just nu, så
  // ett dagsegment där vore en knapp som inte gör något.
  const showDay = mode !== 'nownext'
  const showNow = mode !== 'nownext'
  const showZoom = mode === 'timeline'
  const showDetails = mode === 'nownext'
  return (
    <div data-testid="guide-control-row" style={{ height: 56, minHeight: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${TV.line}`, flexShrink: 0, boxSizing: 'border-box' }}>
      <Dropdown testId="guide-source" label={props.sourceLabel} count={props.sourceCount} onOpen={props.onOpenSource} />
      <Dropdown testId="guide-category" label={props.categoryLabel} count={props.categoryCount} onOpen={props.onOpenCategory} />
      <Divider />
      {showDay ? (
        <ControlSegment<'0' | '1'>
          testId="guide-day"
          options={[{ key: '0', label: tt('today') }, { key: '1', label: tt('tomorrow') }]}
          value={props.dayOffset === 1 ? '1' : '0'}
          onChange={(key) => props.onDay(key === '1' ? 1 : 0)}
          activeStyle={{ background: '#f3f4f8', color: '#111' }}
        />
      ) : null}
      {showNow ? (
        <div
          data-testid="guide-now"
          {...station(() => props.onNow?.())}
          style={{ height: 34, minHeight: 34, padding: '0 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 600, background: TV.accMix(18), border: `1px solid ${TV.accMix(45)}`, color: TV.text, cursor: 'pointer', flexShrink: 0 }}
        >
          {tt('gridNow')}
        </div>
      ) : null}
      <span style={{ flex: 1 }} />
      <ControlSegment<DesktopGuideMode>
        testId="guide-mode"
        options={[{ key: 'grid', label: tt('modeGrid') }, { key: 'nownext', label: tt('modeNowNext') }, { key: 'timeline', label: tt('modeTimelineDay') }]}
        value={mode}
        onChange={props.onMode}
      />
      {showZoom ? (
        <ControlSegment<TimelineZoom>
          testId="guide-zoom"
          options={[{ key: '2h', label: tt('zoom2h') }, { key: '6h', label: tt('zoom6h') }, { key: 'day', label: tt('zoomDay') }]}
          value={props.zoom ?? 'day'}
          onChange={(z) => props.onZoom?.(z)}
        />
      ) : null}
      <Divider />
      {showDetails ? (
        <div
          data-testid="guide-details"
          {...station(() => props.onDetails?.(), undefined, props.details ? { 'data-active': '' } : undefined)}
          style={{ height: 34, minHeight: 34, padding: '0 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: props.details ? 600 : 400, background: props.details ? TV.s16 : TV.s08, border: `1px solid ${TV.line}`, color: props.details ? TV.text : TV.muted, cursor: 'pointer', flexShrink: 0 }}
        >
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: props.details ? TV.acc : TV.faint }} />
          {tt('details')}
        </div>
      ) : null}
      {/* Egen blocklåda (inte span): värdens klocka kan vara ett blockelement,
          och ett block i en inline-låda ritades förut ovanpå grannen. */}
      <div data-testid="guide-clock" style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, color: TV.dim, letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0 }}>{props.clock}</div>
    </div>
  )
}
