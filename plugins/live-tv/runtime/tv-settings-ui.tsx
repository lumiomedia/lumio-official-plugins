'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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

/**
 * Appens TV-mått (lib/tv-metrics.ts + components/settings/redesigned/primitives):
 * text skalas med `--ui-scale` och `--tv-font-scale`, lådor med `--ui-scale`,
 * och eyebrow/hjälptext följer typskalan `--st-*` som byter värde i TV-läge.
 * SDK:n exponerar inte hjälparna, så formlerna står här — samma som appens.
 */
export const tvFont = (px: number) => `calc(${px}px * var(--ui-scale, 1) * var(--tv-font-scale, 1))`
export const tvBox = (px: number) => `calc(${px}px * var(--ui-scale, 1))`
export const ST = { label: 'var(--st-label)', small: 'var(--st-small)' } as const
const TV_FONT = 'var(--font-sans, sans-serif)'
/** Reservbredd när innehållskolumnen inte går att mäta: appens breda sidopanel (960). */
export const TV_PANEL_W = 960

/** Fokusläget kan inte skrivas inline: rad → accent-900-grund, knapp → accent-800 + accent-100-text. */
export function TvFocusStyle() {
  return <style>{'[data-lt-tv-row]:focus{outline:none;background:var(--color-accent-900)!important}[data-lt-tv-btn]:focus{outline:none;background:var(--color-accent-800)!important;color:var(--color-accent-100)!important}'}</style>
}

export function TvEyebrow({ children, size = 'page' }: { children: ReactNode; size?: TvSize }) {
  return (
    <div data-tv-size={size} style={{ flex: 'none', font: `500 ${ST.label}/1 ${TV_FONT}`, letterSpacing: '.2em', textTransform: 'uppercase', color: TVS.n600, padding: '12px 0 2px' }}>
      {children}
    </div>
  )
}

export function TvNote({ children, size = 'page', tone = 'muted' }: { children: ReactNode; size?: TvSize; tone?: 'muted' | 'danger' }) {
  return (
    <div data-tv-size={size} style={{ flex: 'none', font: `400 ${ST.small}/1.5 ${TV_FONT}`, color: tone === 'danger' ? TVS.danger : TVS.n500, padding: 2, maxWidth: '78ch', overflowWrap: 'anywhere' }}>
      {children}
    </div>
  )
}

function Switch({ on, size }: { on: boolean; size: TvSize }) {
  // Appens Switch på sidan: 84×44, knopp 36. Samma i panelerna — en standard.
  void size
  const w = 84
  const h = 44
  const knob = 36
  return (
    <span aria-hidden style={{ display: 'block', width: w, height: h, borderRadius: 999, background: on ? TVS.accent : TVS.n800, flex: 'none', position: 'relative', transition: 'background .16s ease' }}>
      <span style={{ position: 'absolute', top: 4, left: on ? w - 4 - knob : 4, width: knob, height: knob, borderRadius: 999, background: '#f4f4f6', boxShadow: '0 1px 3px rgba(0,0,0,.4)', transition: 'left .16s ease' }} />
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
  // `size` finns kvar i API:t men ändrar inga mått: sidan och de staplade
  // vyerna följer SAMMA standard (Jerry 2026-09-24: "allt måste följa samma
  // standard"). Appens ROW_STYLE (tv-settings-rows.tsx): padding 22/30,
  // minHeight 84, radie 10, kant i neutral800 — läsbart på tre meters håll.
  // `flex: none`: i panelens rullande kolumn får raden annars krympas under
  // sin text, och texten spiller ut ur rutan.
  void size
  const base: CSSProperties = {
    display: 'flex',
    flex: 'none',
    alignItems: 'center',
    gap: 18,
    padding: `${tvBox(22)} ${tvBox(30)}`,
    minHeight: tvBox(84),
    borderRadius: 10,
    background: TVS.n900,
    border: `1px solid ${TVS.n800}`,
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
  if (disabled) extra['aria-disabled'] = 'true'
  if (toggle !== undefined) {
    extra.role = 'switch'
    extra['aria-checked'] = toggle ? 'true' : 'false'
    extra['aria-label'] = typeof label === 'string' ? label : ''
  }
  const props = interactive ? { ...station(act, undefined, extra), style: { ...base, cursor: disabled ? 'default' : 'pointer' } } : { style: base }
  return (
    <div data-testid={testId} {...props}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ font: `500 ${tvFont(25)}/1.2 ${TV_FONT}`, minWidth: 0, overflowWrap: 'anywhere' }}>{label}</div>
        {hint ? (
          // Hjälptexten klipps efter två rader (appens §13) — en lång adress får inte göra raden tre gånger så hög.
          <div style={{ font: `400 ${tvFont(24)}/1.45 ${TV_FONT}`, color: TVS.n300, minWidth: 0, maxWidth: '62ch', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hint}</div>
        ) : null}
      </div>
      {toggle !== undefined ? <Switch on={toggle} size={size} /> : null}
      {value !== undefined && value !== null && value !== '' ? (
        <div style={{ flex: 'none', font: `500 ${tvFont(22)}/1 ${TV_FONT}`, color: valueTone === 'accent' && interactive ? TVS.accent300 : TVS.n300, maxWidth: tvBox(340), textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      ) : null}
      {glyph ? <span aria-hidden style={{ fontSize: 26, lineHeight: 1, color: TVS.n400, flex: 'none' }}>{glyph}</span> : caret ? <span aria-hidden style={{ fontSize: 26, lineHeight: 1, color: TVS.n400, flex: 'none' }}>›</span> : null}
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
    <div style={{ flex: 'none', display: 'flex', flexWrap: 'wrap', gap: 12, padding: '14px 0 6px' }}>
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
              height: tvBox(56),
              padding: `0 ${tvBox(26)}`,
              borderRadius: 999,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: tone === 'danger' ? TVS.danger : tone === 'accent' ? TVS.accent : TVS.n700,
              color: tone === 'danger' ? TVS.danger : tone === 'accent' ? TVS.accent200 : TVS.n300,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              font: `500 ${tvFont(24)}/1 ${TV_FONT}`,
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
 * Detaljpanelen (staplad vy): från innehållskolumnens kant till höger kant, över ett överdrag, crumb
 * tillbaka till vyn under, titel 24/500, hint 13. En egen `data-panel-root`
 * (fokusfälla) med Bakåt-lagret från settings-ui: Bakåt stänger BARA den
 * översta panelen och lämnar fokus på raden som öppnade den.
 *
 * INGEN portal till body: appens TV-scen läggs ut i 1080 designpixlar och
 * skalas med en transform till den riktiga viewporten. Ett `position: fixed`
 * INNE i den transformerade scenen blir "absolut mot scenen" och skalas med
 * — utanför den (i body) hade panelen ritats i råa viewport-pixlar, dubbelt
 * så stor på en skärm med skala 0,5. Samma val som pluginets PickerPanel.
 * Ordningen bland `[data-panel-root]` håller ändå: en staplad vy ritas som
 * barn eller senare syskon till den under, alltså efter den i DOM.
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
  /**
   * Panelen går hela vägen ut till sidlistens kant (Jerry 2026-09-24: "bredda
   * båda hela vägen ut till sidobarens bredd") — alltså från appens
   * innehållskolumn (`[data-col="content"]` i TV-inställningarna) till höger
   * kant. Kolumnens vänsterkant mäts i skärmpixlar och räknas om till
   * scenens pixlar med överdragets egen skala. Utan kolumn (annan värd): 960.
   */
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const measure = () => {
      const overlay = rootRef.current
      const column = overlay?.closest<HTMLElement>('[data-col="content"]') ?? null
      if (!overlay || !column) { setLeft(null); return }
      const o = overlay.getBoundingClientRect()
      const c = column.getBoundingClientRect()
      if (o.width === 0 || overlay.offsetWidth === 0) { setLeft(null); return }
      const scale = o.width / overlay.offsetWidth
      setLeft(Math.max(0, Math.round((c.left - o.left) / scale)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  useEffect(() => {
    const id = window.setTimeout(() => {
      const root = rootRef.current
      if (!root) return
      const target = root.querySelector<HTMLElement>('[data-init]') ?? root.querySelector<HTMLElement>('[data-f]')
      target?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div ref={rootRef} role="dialog" aria-label={title} data-panel-root="" data-testid={testId} style={{ position: 'fixed', inset: 0, zIndex: 1000, color: TVS.text }}>
      <TvFocusStyle />
      <div aria-hidden onClick={onBack} style={{ position: 'absolute', inset: 0, background: TVS.scrim }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, ...(left !== null ? { left } : { width: TV_PANEL_W, maxWidth: '100%' }), background: TVS.bg, boxShadow: '0 0 60px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', padding: '24px 26px 20px' }}>
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {crumb ? (
            <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, font: `500 ${ST.small}/1 ${TV_FONT}`, color: TVS.n500, cursor: 'pointer', paddingBottom: 2 }}>
              <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>←</span>{crumb}
            </div>
          ) : null}
          <div data-tv-title="" style={{ font: `500 ${tvFont(32)}/1.15 ${TV_FONT}`, letterSpacing: '-.02em', overflowWrap: 'anywhere' }}>{title}</div>
          {hint ? <div style={{ marginTop: 4, font: `400 ${ST.small}/1.45 ${TV_FONT}`, color: TVS.n500, overflowWrap: 'anywhere' }}>{hint}</div> : null}
        </div>
        <div data-scroll="" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
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
