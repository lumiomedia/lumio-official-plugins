'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { BROWSE_BACK_EVENT, useTvMode } from '@/lib/plugin-sdk'

/**
 * UI-SATSEN FÖR LIVE TV:S INSTÄLLNINGSSIDA PÅ SKRIVBORD OCH TELEFON.
 *
 * Måtten och färgerna är wireframens (`handoff-live-tv/wireframes/Lumio
 * Desktop Settings v2 minimal.dc.html`, 2026-09-24), inte appens
 * primitiver: handoffen är facit och skrivs 1:1. Telefonen är samma markup i
 * en 420 px-ram, så det finns ingen egen telefonvariant. TV-läget ritar en
 * annan sida (rader, se `tv-settings-views.tsx`) och använder bara
 * Bakåt-lagret och toasten härifrån.
 *
 * Accenten kommer ALLTID ur appens variabler (`--color-accent`, `-700`,
 * `-900`) — aldrig en hårdkodad accentfärg (handoff §6).
 */
export const UI = {
  text: '#e8e8ec',
  muted: '#8b8e99',
  soft: '#c3c6d0',
  danger: '#e0776a',
  dangerLine: 'rgba(224,119,106,0.3)',
  green: '#3cd6a3',
  greenSoft: 'rgba(60,214,163,0.12)',
  line: 'rgba(255,255,255,0.12)',
  lineDialog: 'rgba(255,255,255,0.14)',
  lineSoft: 'rgba(255,255,255,0.055)',
  lineBox: 'rgba(255,255,255,0.2)',
  card: 'rgba(255,255,255,0.04)',
  inset: 'rgba(255,255,255,0.035)',
  field: 'rgba(255,255,255,0.055)',
  fieldDark: 'rgba(0,0,0,0.3)',
  dark: 'rgba(0,0,0,0.25)',
  dialog: '#1b1c23',
  overlay: 'rgba(6,7,10,0.72)',
  check: '#0e0f13',
  accent: 'var(--color-accent)',
  accent700: 'var(--color-accent-700)',
  accent900: 'var(--color-accent-900)',
  mono: 'ui-monospace, Menlo, monospace',
} as const

/** Kortet (§6): grund 0.04, radie 10, padding 16/18, gap 14. */
export function LtCard({ children, style, testId, gap = 14 }: { children: ReactNode; style?: CSSProperties; testId?: string; gap?: number }) {
  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap, borderRadius: 10, background: UI.card, padding: '16px 18px', ...style }}>
      {children}
    </div>
  )
}

/** Blockrubrik: eyebrow (11/500/.16em versaler) + valfri titel (15/500) + hjälptext (13, max 560). */
export function LtSection({ eyebrow, title, hint, dot = false }: { eyebrow?: string; title?: string; hint?: string; dot?: boolean }) {
  return (
    <div style={{ marginBottom: 6 }}>
      {eyebrow ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          {dot ? <span style={{ height: 5, width: 5, borderRadius: 999, background: UI.green }} /> : null}
          <div style={eyebrowText}>{eyebrow}</div>
        </div>
      ) : null}
      {title ? <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: UI.text }}>{title}</h3> : null}
      {hint ? <p style={{ margin: '5px 0 0', fontSize: 13, lineHeight: 1.5, color: UI.muted, maxWidth: 560 }}>{hint}</p> : null}
    </div>
  )
}

const eyebrowText: CSSProperties = { fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: UI.text }

/** Eyebrow inne i ett kort ("EPG sources", "Merged"). */
export function LtEyebrow({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, ...eyebrowText }}>{children}</p>
}

export function LtNote({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: UI.muted, ...style }}>{children}</p>
}

export function LtMono({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <code style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontFamily: UI.mono, color: UI.soft, ...style }}>
      {children}
    </code>
  )
}

export function LtAutoBadge() {
  return (
    <span style={{ flex: 'none', borderRadius: 999, background: UI.greenSoft, padding: '2px 8px', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', color: UI.green }}>
      AUTO
    </span>
  )
}

type BtnVariant = 'default' | 'accent' | 'danger'
type BtnSize = 'sm' | 'md'

/**
 * Knappen (§6): radie 7, ram 1 px. `sm` är kortens (6/12, 12 px), `md`
 * dialogfotens (8/15, 13 px). Accent = accentram + vit text, destruktiv =
 * `#e0776a` med sin egen ram. Markerad (Mark → Marked) får accent-900-grund.
 */
export function LtBtn({ children, onClick, variant = 'default', size = 'sm', disabled, testId, style, active = false, title }: {
  children: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  size?: BtnSize
  disabled?: boolean
  testId?: string
  style?: CSSProperties
  /** Ifyllt läge (Marked): accent-900-grund + accentram. */
  active?: boolean
  title?: string
}) {
  // Ramen som tre egenskaper, inte som `border`-kortform: en `var(--…)` i
  // kortformen tolkas fel av testmiljöns CSS-parser, och separat är lika rätt i
  // webbläsaren.
  const colors: CSSProperties = active
    ? { background: UI.accent900, borderColor: UI.accent, color: UI.text }
    : variant === 'accent'
      ? { background: 'transparent', borderColor: UI.accent, color: UI.text }
      : variant === 'danger'
        ? { background: 'transparent', borderColor: UI.dangerLine, color: UI.danger }
        : { background: 'transparent', borderColor: size === 'md' ? UI.lineDialog : UI.line, color: UI.soft }
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active ? true : undefined}
      style={{
        flex: 'none',
        borderRadius: 7,
        borderWidth: 1,
        borderStyle: 'solid',
        padding: size === 'md' ? '8px 15px' : '6px 12px',
        fontSize: size === 'md' ? 13 : 12,
        fontFamily: 'inherit',
        fontWeight: 400,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        // Aldrig bredare än raden den står i: en lång etikett kortas i stället
        // för att trycka ut kortet på en telefon.
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...colors,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/** 17×17-bocken (§6). */
export function LtCheckMark({ on }: { on: boolean }) {
  return on ? (
    <span data-lt-box="" style={{ display: 'inline-flex', height: 17, width: 17, flex: 'none', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: UI.accent, border: `1px solid ${UI.accent}` }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={UI.check} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
    </span>
  ) : (
    <span data-lt-box="" style={{ display: 'inline-flex', height: 17, width: 17, flex: 'none', borderRadius: 4, background: 'transparent', border: `1px solid ${UI.lineBox}` }} />
  )
}

/** Kryssrutan med etikett + hjälptext; hela raden är klickbar. */
export function LtCheck({ checked, onChange, label, hint, disabled, testId }: {
  checked: boolean
  onChange: (value: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-testid={testId}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked) }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: disabled ? 'default' : 'pointer', background: 'transparent', border: 0, padding: 0, textAlign: 'left', fontFamily: 'inherit', color: UI.text, opacity: disabled ? 0.55 : 1 }}
    >
      <span style={{ marginTop: 2, display: 'inline-flex' }}><LtCheckMark on={checked} /></span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13.5, color: UI.text }}>{label}</span>
        {hint ? <span style={{ fontSize: 12.5, lineHeight: 1.5, color: UI.muted }}>{hint}</span> : null}
      </span>
    </button>
  )
}

/** Radboxen (`rows`-blocket): radie 10, grund 0.04, padding 0 18. Raderna skiljs med en linje från rad 2. */
export function LtRows({ children }: { children: ReactNode }) {
  return <div data-lt-rows="" style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, background: UI.card, padding: '0 18px' }}>{children}</div>
}

function rowSeparator(first: boolean): string {
  return `1px solid ${first ? 'transparent' : UI.lineSoft}`
}

/** Växelraden (38×22-switch till höger). */
export function LtToggleRow({ label, desc, checked, onChange, first = true, testId, error }: {
  label: string
  desc?: string
  checked: boolean
  onChange: (value: boolean) => void
  first?: boolean
  testId?: string
  error?: string | null
}) {
  return (
    <div data-testid={testId} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px', borderTop: rowSeparator(first), padding: '17px 0' }}>
      <div style={{ display: 'flex', minWidth: 0, flex: '1 1 16rem', alignItems: 'center' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.35, color: UI.text }}>{label}</p>
          {desc ? <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5, color: UI.muted, maxWidth: '56ch' }}>{desc}</p> : null}
          {error ? <p role="alert" style={{ margin: '4px 0 0', fontSize: 12.5, color: UI.danger }}>{error}</p> : null}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={{ marginLeft: 'auto', position: 'relative', display: 'inline-flex', height: 22, width: 38, flex: 'none', borderRadius: 999, border: 0, padding: 0, background: checked ? UI.accent : 'rgba(255,255,255,0.11)', cursor: 'pointer' }}
      >
        <span style={{ position: 'absolute', left: checked ? 19 : 3, top: 3, height: 16, width: 16, borderRadius: 999, background: checked ? '#fff' : '#9a9daa' }} />
      </button>
    </div>
  )
}

/**
 * Valraden: etikett + beskrivning till vänster, valen som knappar till höger
 * (det markerade fyllt, som Mark → Marked). Radbryts under texten när raden
 * är smal.
 */
export function LtChoiceRow<K extends string>({ label, desc, options, value, onChange, first = false, testId }: {
  label: string
  desc?: string
  options: { key: K; label: string }[]
  value: K
  onChange: (value: K) => void
  first?: boolean
  testId?: string
}) {
  return (
    <div data-testid={testId} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px', borderTop: rowSeparator(first), padding: '17px 0' }}>
      <div style={{ minWidth: 0, flex: '1 1 16rem' }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.35, color: UI.text }}>{label}</p>
        {desc ? <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5, color: UI.muted, maxWidth: '56ch' }}>{desc}</p> : null}
      </div>
      <div role="group" aria-label={label} style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((option) => (
          <LtBtn key={option.key} testId={testId ? `${testId}-${option.key}` : undefined} active={option.key === value} onClick={() => onChange(option.key)}>{option.label}</LtBtn>
        ))}
      </div>
    </div>
  )
}

/** Textfältet: radie 7, ingen ram, grund 0.055 (dialogens namnfält använder `dark`). */
export function LtInput({ value, onChange, placeholder, title, onEnter, mono = false, dark = false, secret = false, testId, style, autoFocus }: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title: string
  onEnter?: () => void
  mono?: boolean
  dark?: boolean
  secret?: boolean
  testId?: string
  style?: CSSProperties
  autoFocus?: boolean
}) {
  return (
    <input
      type={secret ? 'password' : 'text'}
      aria-label={title}
      data-testid={testId}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && onEnter) {
          event.preventDefault()
          onEnter()
        }
      }}
      style={{
        minWidth: 0,
        borderRadius: 7,
        border: 0,
        background: dark ? UI.fieldDark : UI.field,
        padding: '8px 11px',
        fontSize: 13,
        fontFamily: mono ? UI.mono : 'inherit',
        color: UI.text,
        outline: 'none',
        ...style,
      }}
    />
  )
}

/**
 * Textraden i radboxen (M3U-adressen, Xtream-fälten): etikett till vänster,
 * högerställt fält med fast bredd och en valfri knapp efter.
 */
export function LtTextRow({ label, desc, value, onChange, placeholder, fieldWidth = 240, secret = false, button, onButton, buttonDisabled, buttonVariant = 'default', first = false, onEnter, testId }: {
  label: string
  desc?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  fieldWidth?: number
  secret?: boolean
  button?: string
  onButton?: () => void
  buttonDisabled?: boolean
  buttonVariant?: BtnVariant
  first?: boolean
  onEnter?: () => void
  testId?: string
}) {
  return (
    <div data-testid={testId} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px', borderTop: rowSeparator(first), padding: '17px 0' }}>
      <div style={{ display: 'flex', minWidth: 0, flex: '1 1 10rem', alignItems: 'center' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.35, color: UI.text }}>{label}</p>
          {desc ? <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5, color: UI.muted, maxWidth: '56ch' }}>{desc}</p> : null}
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', minWidth: 0, maxWidth: '100%', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <LtInput title={label} value={value} onChange={onChange} placeholder={placeholder} secret={secret} onEnter={onEnter ?? onButton} style={{ width: fieldWidth, maxWidth: '100%', textAlign: 'right', padding: '7px 10px' }} />
        {button ? <LtBtn onClick={onButton} disabled={buttonDisabled} variant={buttonVariant} style={{ padding: '6px 11px' }}>{button}</LtBtn> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ hopfällbart */

/**
 * Telefonbredd för inställningssidan. Under 640 px (samma gräns som dialogen)
 * får bara EN sektion vara öppen åt gången, och spellistekortens
 * sekundärhandlingar flyttar in i en ⋯-meny. Läses via `matchMedia` och
 * följer fönstret.
 */
export const LT_NARROW_QUERY = '(max-width: 639px)'

export function useLtNarrow(): boolean {
  const read = () => {
    try { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(LT_NARROW_QUERY).matches } catch { return false }
  }
  const [narrow, setNarrow] = useState(read)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    let mql: MediaQueryList
    try { mql = window.matchMedia(LT_NARROW_QUERY) } catch { return }
    const sync = () => setNarrow(mql.matches)
    sync()
    mql.addEventListener?.('change', sync)
    window.addEventListener('resize', sync)
    return () => { mql.removeEventListener?.('change', sync); window.removeEventListener('resize', sync) }
  }, [])
  return narrow
}

const OPEN_SECTIONS_KEY = 'lumio.liveTv.settingsOpen'

function readOpenSections(): string[] | null {
  try {
    const raw = window.sessionStorage.getItem(OPEN_SECTIONS_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null
  } catch {
    return null
  }
}

function writeOpenSections(ids: string[]): void {
  try { window.sessionStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(ids)) } catch { /* privat läge/blockerad lagring: bara minnet gäller */ }
}

/**
 * Vilka sektioner som är öppna. `single` (telefonen) = dragspel, en i taget;
 * annars får flera vara öppna. Valet minns för sessionen (sessionStorage,
 * try/catch) så att den som går ut ur inställningarna och tillbaka hamnar där
 * den var. Listan hålls i öppningsordning — byter fönstret till telefonbredd
 * gäller den senast öppnade.
 */
export function useLtAccordion(single: boolean, fallback: string[] = []): { isOpen: (id: string) => boolean; toggle: (id: string) => void } {
  const [open, setOpen] = useState<string[]>(() => readOpenSections() ?? fallback)
  const visible = single ? open.slice(-1) : open
  const toggle = useCallback((id: string) => {
    setOpen((prev) => {
      const current = single ? prev.slice(-1) : prev
      const next = current.includes(id) ? current.filter((v) => v !== id) : single ? [id] : [...current, id]
      writeOpenSections(next)
      return next
    })
  }, [single])
  return { isOpen: (id: string) => visible.includes(id), toggle }
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={UI.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ flex: 'none', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

/**
 * Hopfällbar sektion: rubriken är ett kort (titel + en rad sammanfattning,
 * chevron till höger) och innehållet — kortstapeln — ritas under det när
 * sektionen är öppen. Ingen yttre box runt innehållet: korten är redan kort.
 */
export function LtCollapsible({ id, title, summary, open, onToggle, children, testId }: {
  id: string
  title: string
  summary?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
  testId?: string
}) {
  const bodyId = `lt-section-${id}`
  return (
    <section data-testid={testId} data-lt-collapsible={id} style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', minWidth: 0, boxSizing: 'border-box',
          borderRadius: 10, border: 0, background: open ? 'rgba(255,255,255,0.065)' : UI.card,
          padding: '14px 18px', textAlign: 'left', fontFamily: 'inherit', color: UI.text, cursor: 'pointer',
        }}
      >
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 500, lineHeight: 1.3 }}>{title}</span>
          {summary ? (
            <span style={{ display: 'block', marginTop: 3, fontSize: 12.5, color: UI.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
          ) : null}
        </span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div id={bodyId} style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {children}
        </div>
      ) : null}
    </section>
  )
}

/**
 * ⋯-menyn för sekundärhandlingar på smal skärm. Rutan förankras i knappens
 * HÖGRA kant och växer åt vänster, så den aldrig går utanför rutan; stängs av
 * ett val, ett klick utanför eller Escape.
 */
export function LtOverflowMenu({ label, items, testId }: {
  label: string
  items: { key: string; label: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean }[]
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (event: Event) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) } }
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])
  if (items.length === 0) return null
  return (
    <div ref={rootRef} style={{ position: 'relative', flex: 'none' }}>
      <LtBtn testId={testId} title={label} onClick={() => setOpen((v) => !v)} style={{ padding: '6px 10px', letterSpacing: '0.12em' }}>
        <span aria-hidden>⋯</span>
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{label}</span>
      </LtBtn>
      {open ? (
        <div role="menu" data-testid={testId ? `${testId}-menu` : undefined}
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20, minWidth: 180, maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', padding: 6, borderRadius: 10, background: UI.dialog, border: `1px solid ${UI.lineDialog}`, boxShadow: '0 18px 40px rgba(0,0,0,0.55)' }}>
          {items.map((item) => (
            <button key={item.key} type="button" role="menuitem" disabled={item.disabled}
              onClick={() => { setOpen(false); item.onSelect() }}
              style={{ display: 'block', width: '100%', border: 0, borderRadius: 7, background: 'transparent', padding: '9px 11px', textAlign: 'left', fontFamily: 'inherit', fontSize: 13, color: item.danger ? UI.danger : UI.text, cursor: item.disabled ? 'default' : 'pointer', opacity: item.disabled ? 0.5 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Tangenterna som betyder Bakåt. Backspace bara på TV — på skrivbordet är det en redigeringstangent. */
const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])

function isTopPanel(root: HTMLElement | null): boolean {
  if (!root) return false
  const panels = document.querySelectorAll<HTMLElement>('[data-panel-root]')
  return panels.length > 0 && panels[panels.length - 1] === root
}

function inTextField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.tagName !== 'string') return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true
}

/**
 * BAKÅT-LAGRET.
 *
 * Appens fokusmotor tar Escape/Backspace på window (bubblande) som "till
 * sidlistan", inställningspanelen stänger sig själv på Escape (bubblande),
 * och appens tangentbordspanel stänger sig på sitt eget element. Lagret här
 * lyssnar i CAPTURE-fasen på window och agerar BARA när `rootRef` är den
 * sista `[data-panel-root]` i dokumentet — ligger tangentbordet (eller en
 * senare staplad vy) ovanpå, är det dennes tur. När lagret agerar stoppas
 * händelsen så att varken motorn eller inställningspanelen tar den också.
 *
 * `lumio-browse-back` är appens egen Bakåt-signal (Android-knappen, fjärrens
 * bakåt via värden) och behandlas likadant.
 *
 * När lagret tas ned återförs fokus till det element som hade det när lagret
 * öppnades — det är så "Bakåt lämnar fokus på raden man kom ifrån" (§4.2)
 * uppfylls, både för dialogen och för TV-vyerna.
 */
export function useBackLayer(active: boolean, onBack: () => void, rootRef: RefObject<HTMLElement | null>): void {
  const isTv = useTvMode()
  const onBackRef = useRef(onBack)
  useEffect(() => { onBackRef.current = onBack })
  useEffect(() => {
    if (!active) return
    const opener = document.activeElement as HTMLElement | null
    const onKey = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key)) return
      if (!isTopPanel(rootRef.current)) return
      if (event.key === 'Backspace' && (!isTv || inTextField(event.target))) return
      event.preventDefault()
      event.stopImmediatePropagation()
      onBackRef.current()
    }
    const onBrowse = (event: Event) => {
      if (!isTopPanel(rootRef.current)) return
      event.stopImmediatePropagation()
      onBackRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener(BROWSE_BACK_EVENT, onBrowse, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener(BROWSE_BACK_EVENT, onBrowse, true)
      window.setTimeout(() => {
        if (opener && opener.isConnected && opener !== document.body) opener.focus({ preventScroll: true })
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isTv])
}

/**
 * Dialogen (§4.1, §6): överdrag `rgba(6,7,10,0.72)`, ruta `#1b1c23`, radie
 * 14, padding 26/26/22, max 620 px (kategorierna) eller 400 (bekräftelser).
 * Under 640 px (telefonen) fyller rutan ramen. Portalas till body så att en
 * transformerad förälder inte flyttar det fasta lagret.
 */
export function LtDialog({ title, body, width = 400, onClose, children, testId }: {
  title: string
  body?: string
  width?: number
  onClose: () => void
  children: ReactNode
  testId?: string
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useBackLayer(true, onClose, rootRef)
  const node = (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={title}
      data-panel-root=""
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: UI.overlay, padding: 24 }}
    >
      <style>{'@media (max-width:639px){.lt-dialog-box{max-width:100%!important;padding:22px 18px 18px!important}}'}</style>
      <div
        className="lt-dialog-box"
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
        style={{ width: '100%', maxWidth: width, maxHeight: '100%', overflowY: 'auto', borderRadius: 14, background: UI.dialog, padding: '26px 26px 22px', boxShadow: '0 30px 70px rgba(0,0,0,0.6)', color: UI.text }}
      >
        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: UI.text }}>{title}</p>
        {body ? <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.6, color: UI.muted }}>{body}</p> : null}
        {children}
      </div>
    </div>
  )
  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

/** Bekräftelsedialogen (Remove): brödtext + Cancel / destruktiv knapp. */
export function LtConfirm({ title, body, confirmLabel, cancelLabel, onCancel, onConfirm, testId }: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onCancel: () => void
  onConfirm: () => void
  testId?: string
}) {
  return (
    <LtDialog title={title} body={body} width={400} onClose={onCancel} testId={testId}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <LtBtn size="md" onClick={onCancel}>{cancelLabel}</LtBtn>
        <LtBtn size="md" variant="danger" onClick={onConfirm} testId={testId ? `${testId}-confirm` : undefined}>{confirmLabel}</LtBtn>
      </div>
    </LtDialog>
  )
}

/* ------------------------------------------------------------------ toast */

const noToast = (_text: string): void => {}
const ToastContext = createContext<(text: string) => void>(noToast)

/**
 * Toasten: en i taget, 2,4 s, fast nedtill (wireframen: `#1b1c23`-pill med
 * grön punkt). En ToastHost inne i en annan återanvänder den yttre, så en
 * dialog kan bära sin egen värd (rutnätets tomma läge) utan att en toast
 * som skickas precis före stängning dör med dialogen på inställningssidan.
 */
export function ToastHost({ children }: { children: ReactNode }) {
  const outer = useContext(ToastContext)
  if (outer !== noToast) return <>{children}</>
  return <ToastRoot>{children}</ToastRoot>
}

function ToastRoot({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const toast = useCallback((next: string) => {
    setText(next)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { timer.current = null; setText(null) }, 2400)
  }, [])
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current) }, [])
  const node = useMemo(() => text ? (
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 32, transform: 'translateX(-50%)', zIndex: 1100, display: 'flex', alignItems: 'center', gap: 9, borderRadius: 999, background: UI.dialog, padding: '11px 20px', boxShadow: '0 18px 40px rgba(0,0,0,0.55)', pointerEvents: 'none' }}>
      <span style={{ height: 5, width: 5, borderRadius: 999, background: UI.green }} />
      <span style={{ fontSize: 12.5, color: UI.text }}>{text}</span>
    </div>
  ) : null, [text])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      {node && typeof document !== 'undefined' ? createPortal(node, document.body) : node}
    </ToastContext.Provider>
  )
}

export function useToast(): (text: string) => void {
  return useContext(ToastContext)
}

/** Värdnamnet ur en adress — kortets rubrik (§3.1). */
export function hostOf(url: string): string {
  try { return new URL(url).host || url } catch { return url }
}

/** Ett tal med tusentalsavgränsare i sidans språk ("2,037" / "2 037"). */
export function fmtInt(value: number, locale: string): string {
  return value.toLocaleString(locale)
}
