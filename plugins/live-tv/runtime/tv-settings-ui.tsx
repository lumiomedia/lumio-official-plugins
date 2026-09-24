'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { station } from './tv/tv-ui'
import { useBackLayer } from './settings-ui'

/**
 * TV-PRIMITIVERNA FÖR LIVE TV:S INSTÄLLNINGAR I APPENS TV-LÄGE (handoff
 * 2026-09-24 §4.2, facit `wireframes/Lumio TV Settings v2.dc.html`).
 *
 * Sidan är RADER i appens TV-inställningars stil, och de tre staplade vyerna
 * (L:list, L:cats, L:name) är detaljpaneler till höger. Varje interaktiv rad
 * är en station (`data-f`, via `station()` i tv-ui: OK/Enter kör raden);
 * eyebrows, noter och info-rader är inte det. Måtten är wireframens
 * designpixlar — TV-scenen skalas av appen.
 *
 * Färgerna är appens TV-inställningars (components/tv/tv-settings-rows.tsx),
 * accenten alltid via `--color-accent*`.
 */
export const TVS = {
  bg: '#161826',
  text: '#e9e9ed',
  accent: 'var(--color-accent)',
  accent100: 'var(--color-accent-100)',
  accent200: 'var(--color-accent-200)',
  accent300: 'var(--color-accent-300)',
  accent800: 'var(--color-accent-800)',
  accent900: 'var(--color-accent-900)',
  n300: '#cfd3e5',
  n400: '#b2b6ca',
  n500: '#9397ab',
  n600: '#75798c',
  n700: '#595d6c',
  n800: '#3f424d',
  n900: '#292b31',
  danger: '#e0776a',
  scrim: 'rgba(10,11,18,.66)',
} as const

export type TvSize = 'page' | 'panel'

/** Fokusläget kan inte skrivas inline: rad → accent-900-grund, knapp → accent-800 + accent-100-text. */
export function TvFocusStyle() {
  return <style>{'[data-lt-tv-row]:focus{outline:none;background:var(--color-accent-900)!important}[data-lt-tv-btn]:focus{outline:none;background:var(--color-accent-800)!important;color:var(--color-accent-100)!important}'}</style>
}

export function TvEyebrow({ children, size = 'page' }: { children: ReactNode; size?: TvSize }) {
  return (
    <div style={size === 'page'
      ? { fontSize: 11, fontWeight: 500, lineHeight: 1, letterSpacing: '.2em', textTransform: 'uppercase', color: TVS.n600, padding: '12px 0 2px' }
      : { fontSize: 11, fontWeight: 500, lineHeight: 1, letterSpacing: '.16em', textTransform: 'uppercase', color: TVS.n600, padding: '10px 2px 4px' }}
    >
      {children}
    </div>
  )
}

export function TvNote({ children, size = 'page', tone = 'muted' }: { children: ReactNode; size?: TvSize; tone?: 'muted' | 'danger' }) {
  return (
    <div style={size === 'page'
      ? { fontSize: 13.5, lineHeight: 1.5, color: tone === 'danger' ? TVS.danger : TVS.n500, padding: 2, maxWidth: '78ch' }
      : { fontSize: 12.5, lineHeight: 1.5, color: tone === 'danger' ? TVS.danger : TVS.n500, padding: '6px 2px' }}
    >
      {children}
    </div>
  )
}

function Switch({ on, size }: { on: boolean; size: TvSize }) {
  const w = size === 'page' ? 62 : 56
  const h = size === 'page' ? 32 : 29
  const knob = size === 'page' ? 26 : 23
  return (
    <span aria-hidden style={{ display: 'inline-block', width: w, height: h, borderRadius: 999, background: on ? TVS.accent : TVS.n800, flex: 'none', position: 'relative', transition: 'background .16s ease' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? w - 3 - knob : 3, width: knob, height: knob, borderRadius: 999, background: '#f4f4f6', boxShadow: '0 1px 3px rgba(0,0,0,.4)', transition: 'left .16s ease' }} />
    </span>
  )
}

/**
 * Raden. Tre former:
 *  - växel (`toggle` satt): role=switch, hela raden växlar;
 *  - handling/navigering (`onOk` satt): värde till höger i accent, ev. `›`;
 *  - info (varken toggle eller onOk): ingen station, värdet i neutral.
 * `size` väljer sidans (17/13, 15/20) eller panelens (16/12.5, 15/18) mått.
 */
export function TvRow({ label, hint, value, valueTone = 'accent', caret = false, glyph, toggle, onToggle, onOk, size = 'page', testId, init = false, disabled = false, style }: {
  label: ReactNode
  hint?: ReactNode
  value?: ReactNode
  valueTone?: 'accent' | 'muted'
  caret?: boolean
  /** En glyf i stället för `›` (tangentbordsraden: ⌨). */
  glyph?: string
  toggle?: boolean
  onToggle?: (next: boolean) => void
  onOk?: () => void
  size?: TvSize
  testId?: string
  init?: boolean
  disabled?: boolean
  style?: CSSProperties
}) {
  const page = size === 'page'
  const base: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    padding: page ? '15px 20px' : '15px 18px',
    borderRadius: 8,
    background: TVS.n900,
    border: page ? `1px solid ${TVS.n800}` : '1px solid transparent',
    color: TVS.text,
    opacity: disabled ? 0.5 : 1,
    ...style,
  }
  const interactive = toggle !== undefined || onOk !== undefined
  const act = () => {
    if (disabled) return
    if (toggle !== undefined) onToggle?.(!toggle)
    else onOk?.()
  }
  const extra: Record<string, string> = { 'data-lt-tv-row': '' }
  if (init) extra['data-init'] = ''
  if (toggle !== undefined) {
    extra.role = 'switch'
    extra['aria-checked'] = toggle ? 'true' : 'false'
    extra['aria-label'] = typeof label === 'string' ? label : ''
  }
  const props = interactive ? { ...station(act, undefined, extra), style: { ...base, cursor: disabled ? 'default' : 'pointer' } } : { style: base }
  return (
    <div data-testid={testId} {...props}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: page ? 17 : 16, fontWeight: 500, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {hint ? <div style={{ fontSize: page ? 13 : 12.5, lineHeight: 1.4, color: TVS.n500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</div> : null}
      </div>
      {toggle !== undefined ? <Switch on={toggle} size={size} /> : null}
      {value !== undefined && value !== null && value !== '' ? (
        <div style={{ flex: 'none', fontSize: 15, fontWeight: 500, lineHeight: 1, color: valueTone === 'accent' && interactive ? TVS.accent300 : TVS.n300, maxWidth: 230, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      ) : null}
      {glyph ? <span aria-hidden style={{ fontSize: 18, color: TVS.n500, flex: 'none' }}>{glyph}</span> : caret ? <span aria-hidden style={{ fontSize: 22, lineHeight: 1, color: TVS.n500, flex: 'none' }}>›</span> : null}
    </div>
  )
}

export interface TvButtonSpec {
  label: string
  style?: 'ghost' | 'accent' | 'danger'
  onOk: () => void
  init?: boolean
  testId?: string
}

/** Knappraden (`btns`): 50 px-piller med ram, fokus = accent-800. */
export function TvBtns({ buttons }: { buttons: TvButtonSpec[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 0 6px' }}>
      {buttons.map((b) => {
        const tone = b.style ?? 'ghost'
        return (
          <button
            key={b.label}
            type="button"
            data-f=""
            data-lt-tv-btn=""
            data-init={b.init ? '' : undefined}
            data-testid={b.testId}
            onClick={b.onOk}
            style={{
              height: 50,
              padding: '0 22px',
              borderRadius: 999,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: tone === 'danger' ? TVS.danger : tone === 'accent' ? TVS.accent : TVS.n700,
              color: tone === 'danger' ? TVS.danger : tone === 'accent' ? TVS.accent200 : TVS.n300,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1,
              fontFamily: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {b.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Detaljpanelen (staplad vy): 648 px till höger över ett överdrag, crumb
 * tillbaka till vyn under, titel 24/500, hint 13. En egen `data-panel-root`
 * (fokusfälla) med Bakåt-lagret från settings-ui: Bakåt stänger BARA den
 * översta panelen och lämnar fokus på raden som öppnade den. Portalas till
 * body så att den läggs sist i DOM — det är så motorn vet vilken som är överst.
 */
export function TvPanel({ title, hint, crumb, onBack, children, testId }: {
  title: string
  hint?: string
  crumb?: string
  onBack: () => void
  children: ReactNode
  testId?: string
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useBackLayer(true, onBack, rootRef)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const root = rootRef.current
      if (!root) return
      const target = root.querySelector<HTMLElement>('[data-init]') ?? root.querySelector<HTMLElement>('[data-f]')
      target?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(id)
  }, [])
  const node = (
    <div ref={rootRef} role="dialog" aria-label={title} data-panel-root="" data-testid={testId} style={{ position: 'fixed', inset: 0, zIndex: 1000, color: TVS.text }}>
      <TvFocusStyle />
      <div aria-hidden onClick={onBack} style={{ position: 'absolute', inset: 0, background: TVS.scrim }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 648, maxWidth: '100%', background: TVS.bg, boxShadow: '0 0 60px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', padding: '24px 26px 20px' }}>
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {crumb ? (
            <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 500, lineHeight: 1, color: TVS.n500, cursor: 'pointer', paddingBottom: 2 }}>
              <span aria-hidden>←</span>{crumb}
            </div>
          ) : null}
          <div data-tv-title="" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-.02em' }}>{title}</div>
          {hint ? <div style={{ fontSize: 13, lineHeight: 1.45, color: TVS.n500 }}>{hint}</div> : null}
        </div>
        <div data-scroll="" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

/** Bekräftelsevyn (`c:`): titel, brödtext som note, Cancel + destruktiv knapp. */
export function TvConfirmPanel({ title, body, confirmLabel, cancelLabel, crumb, onCancel, onConfirm, testId = 'tv-confirm-panel' }: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  crumb?: string
  onCancel: () => void
  onConfirm: () => void
  testId?: string
}) {
  return (
    <TvPanel title={title} crumb={crumb} onBack={onCancel} testId={testId}>
      <TvNote size="panel">{body}</TvNote>
      <TvBtns buttons={[
        { label: cancelLabel, style: 'ghost', onOk: onCancel, init: true },
        { label: confirmLabel, style: 'danger', onOk: onConfirm },
      ]} />
    </TvPanel>
  )
}
