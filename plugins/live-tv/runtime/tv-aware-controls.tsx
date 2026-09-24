import { useState, type CSSProperties, type ReactNode } from 'react'
import { Checkbox, PillBtn, TOKENS, getTvKeyboardPanel, inputStyle, useTvMode } from '@/lib/plugin-sdk'

/**
 * TV-MEDVETNA KONTROLLER FÖR PLUGINETS INSTÄLLNINGSSEKTION.
 *
 * Appens inställningsprimitiver (PillBtn, Checkbox, <input>) är rätt på
 * skrivbord och telefon, men på TV är de inte fokusstationer: fokusmotorn
 * (lib/tv-focus i appen) tar BARA element med `data-f`, och primitiverna
 * släpper inte igenom attributet. Följden var att fjärrkontrollen hoppade
 * över Kategorier, Ta bort och kryssrutorna i Live TV-inställningarna, och
 * att texten stod i skrivbordets pixelstorlekar (Jerry 2026-09-24).
 *
 * Här: på skrivbordet renderas exakt appens primitiv. På TV renderas en
 * riktig <button data-f> med samma färger (TOKENS) och appens TV-typografi
 * (`--st-*`-tokens som byter värde under [data-tv="1"]), och textfält går
 * via appens tangentbordspanel (getTvKeyboardPanel), precis som
 * Xtream-inloggningen redan gör.
 *
 * Importeras med alias (`import { Pill as PillBtn }`) så att de befintliga
 * anropen står orörda.
 */

type PillVariant = 'ghost' | 'primary' | 'accent' | 'danger'
type PillSize = 'sm' | 'md' | 'lg'
/** Riktningsstyrning för fokusmotorn: CSS-väljare per riktning (`data-f-up/-down/-left/-right`). */
export type TvNav = Partial<Record<'up' | 'down' | 'left' | 'right', string>>

/**
 * Attribut fokusmotorn läser: `data-tv-id` gör kontrollen adresserbar från en
 * annan kontrolls `tvNav`, och `data-f-<riktning>` överstyr geometrin. Bara
 * när layouten ger ett svar som är riktigt men fel — t.ex. vänsterställda
 * fält över högerställda knappar, där "nedåt" annars hoppar förbi hela kortet.
 */
function tvAttrs(tvId?: string, tvNav?: TvNav): Record<string, string> {
  const out: Record<string, string> = {}
  if (tvId) out['data-tv-id'] = tvId
  for (const dir of ['up', 'down', 'left', 'right'] as const) {
    const selector = tvNav?.[dir]
    if (selector) out[`data-f-${dir}`] = selector
  }
  return out
}

const TV_FONT = { small: 'var(--st-small)', body: 'var(--st-body)', label: 'var(--st-label)' } as const

const pillVariants: Record<PillVariant, CSSProperties> = {
  ghost: { background: 'transparent', border: `1px solid ${TOKENS.borderStrong}`, color: TOKENS.text },
  primary: { background: TOKENS.orange, border: `1px solid ${TOKENS.orange}`, color: '#1A0E07', fontWeight: 600 },
  accent: { background: TOKENS.accentSoft, border: `1px solid ${TOKENS.accent}`, color: '#fff' },
  danger: { background: 'transparent', border: '1px solid rgba(255,90,106,.4)', color: TOKENS.red },
}
const pillSizes: Record<PillSize, CSSProperties> = {
  sm: { padding: '8px 14px', fontSize: TV_FONT.small },
  md: { padding: '11px 18px', fontSize: TV_FONT.body },
  lg: { padding: '13px 22px', fontSize: TV_FONT.body },
}

export function Pill({ children, onClick, variant = 'ghost', size = 'md', disabled, type, style, title, tvId, tvNav }: {
  children: ReactNode
  onClick?: () => void
  variant?: PillVariant
  size?: PillSize
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
  title?: string
  tvId?: string
  tvNav?: TvNav
}) {
  const isTv = useTvMode()
  if (!isTv) {
    return <PillBtn onClick={onClick} variant={variant} size={size} disabled={disabled} type={type} style={style} title={title}>{children}</PillBtn>
  }
  return (
    <button
      type={type ?? 'button'}
      data-f=""
      {...tvAttrs(tvId, tvNav)}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...pillSizes[size],
        ...pillVariants[variant],
        borderRadius: 10,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: pillVariants[variant].fontWeight ?? 500,
        letterSpacing: 0.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function TvCheck({ checked, onChange, disabled, label, hint, right, tvId, tvNav }: {
  checked: boolean
  onChange?: (value: boolean) => void
  disabled?: boolean
  label?: ReactNode
  hint?: ReactNode
  right?: ReactNode
  tvId?: string
  tvNav?: TvNav
}) {
  const isTv = useTvMode()
  if (!isTv) return <Checkbox checked={checked} onChange={onChange} disabled={disabled} label={label} hint={hint} right={right} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        data-f=""
        {...tvAttrs(tvId, tvNav)}
        disabled={disabled}
        onClick={() => { if (!disabled) onChange?.(!checked) }}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: hint ? 'flex-start' : 'center',
          gap: 14,
          padding: '8px 10px',
          borderRadius: 10,
          border: '1px solid transparent',
          background: 'transparent',
          color: TOKENS.text,
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 'calc(var(--st-body) * 1.5)',
            height: 'calc(var(--st-body) * 1.5)',
            borderRadius: 7,
            background: checked ? TOKENS.accent : TOKENS.surface2,
            border: `1.5px solid ${checked ? TOKENS.accent : TOKENS.borderStrong}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: TOKENS.surface0,
            fontSize: TV_FONT.small,
            marginTop: hint ? 2 : 0,
          }}
        >
          {checked ? '✓' : ''}
        </span>
        {label ? (
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: TV_FONT.body, fontWeight: 500 }}>{label}</span>
            {hint ? <span style={{ fontSize: TV_FONT.small, color: TOKENS.textMute, lineHeight: 1.4 }}>{hint}</span> : null}
          </span>
        ) : null}
      </button>
      {right}
    </div>
  )
}

/**
 * Textfält: <input> på skrivbord/telefon; på TV en station som öppnar
 * tangentbordspanelen. `title` är panelens rubrik och fältets aria-label.
 */
export function TextField({ value, onChange, placeholder, title, style, testId, tvId, tvNav }: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title: string
  style?: CSSProperties
  testId?: string
  tvId?: string
  tvNav?: TvNav
}) {
  const isTv = useTvMode()
  const TvKeyboardPanel = isTv ? getTvKeyboardPanel() : null
  const [open, setOpen] = useState(false)
  if (!isTv || !TvKeyboardPanel) {
    return (
      <input
        aria-label={title}
        data-testid={testId}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ ...inputStyle, padding: '0 12px', background: 'transparent', color: TOKENS.text, ...style }}
      />
    )
  }
  return (
    <>
      <button
        type="button"
        data-f=""
        {...tvAttrs(tvId, tvNav)}
        data-testid={testId}
        aria-label={title}
        onClick={() => setOpen(true)}
        style={{
          ...inputStyle,
          ...style,
          padding: '0 14px',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: TV_FONT.body,
          background: 'transparent',
          color: value ? TOKENS.text : TOKENS.textMute,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value || placeholder || title}
      </button>
      {open ? (
        <TvKeyboardPanel
          title={title}
          placeholder={placeholder ?? ''}
          initial={value}
          onDone={(next) => { onChange(next); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
