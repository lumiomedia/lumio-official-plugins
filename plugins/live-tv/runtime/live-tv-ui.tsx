'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { getLiveTvLogoSrc, type M3uChannel } from './live-tv-data'

/**
 * Gemensamma byggstenar för Live TV-vyerna, ritade efter handoffens mått men
 * i appens färger (korall-accent, mörkblå ytor). Mått och färger sätts som
 * inline-stilar: pluginets klasser byggs inte av appens Tailwind, så bara
 * verktygsklasser appen själv använder finns att lita på.
 */
export const LT = {
  bg: '#050816',
  /* Glas utan blur (Jerry 2026-09-02): samma yta som strömraderna på
     detaljsidan. Ljusare än de solida panelerna och utan backdrop-filter,
     som är dyrt på telefon och TV. */
  surface: 'rgba(252,252,255,0.09)',
  surfaceRaised: 'rgba(252,252,255,0.14)',
  neutral: 'rgba(252,252,255,0.12)',
  line: 'rgba(255,255,255,0.10)',
  text: '#f3f4f8',
  muted: 'rgba(243,244,248,0.7)',
  dim: 'rgba(243,244,248,0.55)',
  faint: 'rgba(243,244,248,0.4)',
  accent: '#f4845f',
  accentText: '#ffd9c9',
  accentSoft: 'rgba(244,132,95,0.16)',
  accentLine: 'rgba(244,132,95,0.55)',
  accentDeep: 'rgba(244,132,95,0.12)',
  live: '#fb7185',
  liveSoft: 'rgba(251,113,133,0.18)',
  radiusLg: 14,
  radiusMd: 8,
  radiusSm: 4,
} as const

export const heroGradient: CSSProperties = {
  background: 'linear-gradient(120deg, rgba(252,252,255,0.14), rgba(252,252,255,0.05))',
  border: `1px solid ${LT.line}`,
  borderRadius: LT.radiusLg,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
}

export const surfaceCard: CSSProperties = {
  background: LT.surface,
  borderRadius: LT.radiusMd,
  border: `1px solid ${LT.line}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '')
  return letters.join('') || '•'
}

export function progressOf(start: number, stop: number, nowMs: number): number {
  if (stop <= start) return 0
  return Math.min(1, Math.max(0, (nowMs - start) / (stop - start)))
}

export function formatClock(ms: number, locale: string): string {
  return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/* ---------- Ikoner (Phosphor-liknande, 24-rutnät) ---------- */

type IconProps = { size?: number; className?: string }
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const Icon = {
  Back: ({ size = 18, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}><path d="M15 18l-6-6 6-6" /></svg>
  ),
  Search: ({ size = 18, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  Bell: ({ size = 18, className, filled = false }: IconProps & { filled?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  ),
  Heart: ({ size = 18, className, filled = false }: IconProps & { filled?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />
    </svg>
  ),
  Play: ({ size = 14, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  ),
  ArrowRight: ({ size = 14, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
  ),
  Calendar: ({ size = 14, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
  ),
  Close: ({ size = 18, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  Lock: ({ size = 12, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
  ),
  Info: ({ size = 16, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  ),
  ChevronDown: ({ size = 14, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Grid: ({ size = 18, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
  ),
}

/* ---------- Taggar och knappar ---------- */

export function Tag({ variant = 'neutral', children, style }: { variant?: 'accent' | 'neutral' | 'outline' | 'live'; children: ReactNode; style?: CSSProperties }) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    letterSpacing: '0.04em',
    padding: '3px 10px',
    borderRadius: 6,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
  }
  const look: CSSProperties =
    variant === 'accent'
      ? { background: LT.accentSoft, color: LT.accentText }
      : variant === 'live'
        ? { background: LT.liveSoft, color: '#fecdd3', fontWeight: 600, letterSpacing: '0.12em', fontSize: 10, textTransform: 'uppercase' }
        : variant === 'outline'
          ? { border: `1px solid ${LT.accentLine}`, color: LT.accentText, padding: '2px 9px' }
          : { background: LT.neutral, color: LT.muted }
  return <span style={{ ...base, ...look, ...style }}>{children}</span>
}

export function LiveTag({ label }: { label: string }) {
  return (
    <Tag variant="live">
      <span style={{ width: 6, height: 6, borderRadius: 999, background: LT.live }} />
      {label}
    </Tag>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'solid'
export function Btn({
  variant = 'secondary',
  children,
  onClick,
  title,
  ariaLabel,
  pressed,
  block = false,
  small = false,
  icon = false,
  style,
  tvStation,
}: {
  variant?: ButtonVariant
  children?: ReactNode
  onClick?: () => void
  title?: string
  ariaLabel?: string
  pressed?: boolean
  block?: boolean
  small?: boolean
  icon?: boolean
  style?: CSSProperties
  tvStation?: Record<string, string>
}) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: small ? 13 : 14,
    lineHeight: 1.2,
    padding: icon ? 0 : small ? '6px 14px' : '8px 16px',
    width: icon ? 36 : block ? '100%' : undefined,
    height: icon ? 36 : undefined,
    borderRadius: 999,
    border: '1px solid transparent',
    background: 'transparent',
    color: LT.text,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  }
  const look: CSSProperties =
    variant === 'primary'
      ? { color: LT.accentText, borderColor: LT.accentLine, background: pressed ? LT.accentSoft : LT.accentDeep }
      : variant === 'solid'
        ? { color: '#1b0d08', background: LT.accent, fontWeight: 700, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }
        : variant === 'ghost'
          ? { color: pressed ? LT.text : LT.muted, background: pressed ? 'rgba(255,255,255,0.12)' : 'transparent' }
          : { borderColor: pressed ? 'rgba(255,255,255,0.5)' : LT.line, background: pressed ? 'rgba(255,255,255,0.12)' : 'rgba(252,252,255,0.06)' }
  return (
    <button
      type="button"
      {...(tvStation ?? {})}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      className="transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      style={{ ...base, ...look, ...style }}
    >
      {children}
    </button>
  )
}

/* ---------- Kanal, förlopp, rubriker ---------- */

export function ChannelBadge({ channel, size = 40, radius = LT.radiusSm }: { channel: Pick<M3uChannel, 'name' | 'logo'>; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false)
  const src = getLiveTvLogoSrc(channel.logo)
  const box: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    background: LT.neutral,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  }
  if (src && !failed) {
    return (
      <div style={box}>
        <LiveTvLogoImage src={src} alt="" className="h-full w-full object-contain p-1" onError={() => setFailed(true)} />
      </div>
    )
  }
  return (
    <div style={{ ...box, fontSize: Math.max(9, Math.round(size * 0.28)), fontWeight: 600, color: LT.muted }} aria-hidden="true">
      {initialsOf(channel.name)}
    </div>
  )
}

export function ProgressBar({ value, width, height = 4 }: { value: number; width?: number | string; height?: number }) {
  return (
    <div style={{ height, width: width ?? '100%', maxWidth: '100%', background: LT.neutral, borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.round(value * 100)}%`, background: LT.accent }} />
    </div>
  )
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
      <h3 style={{ fontSize: 17, margin: 0, fontWeight: 600, color: LT.text }}>{title}</h3>
      {sub ? <span style={{ fontSize: 12, color: LT.dim }}>{sub}</span> : null}
      {action ? <div style={{ marginLeft: 'auto' }}>{action}</div> : null}
    </div>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: LT.accent }}>{children}</div>
}

/** 64 px toppbar: tillbaka, titel, valfria filter i mitten, ikoner till höger. */
export function LiveTvHeader({
  title,
  onBack,
  backLabel,
  children,
  right,
}: {
  title: string
  onBack?: () => void
  backLabel: string
  children?: ReactNode
  right?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        padding: '8px 0',
        borderBottom: `1px solid ${LT.line}`,
        flexWrap: 'wrap',
      }}
    >
      {onBack ? (
        <Btn variant="ghost" icon onClick={onBack} ariaLabel={backLabel} title={backLabel}>
          <Icon.Back />
        </Btn>
      ) : null}
      <div style={{ fontSize: 18, fontWeight: 600, color: LT.text }}>{title}</div>
      {children ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 12, alignItems: 'center' }}>{children}</div> : null}
      {right ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>{right}</div> : null}
    </div>
  )
}

/** Horisontell kortrad med snäpp; `peek` låter nästa kort kika in. */
export function ScrollRow({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  return (
    <div
      className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gap, paddingBottom: 6, scrollSnapType: 'x proximity' }}
    >
      {children}
    </div>
  )
}

/* ---------- PIN-grind ---------- */

export function PinGate({
  open,
  title,
  wrongText,
  unlockLabel,
  cancelLabel,
  onVerify,
  onClose,
  onUnlocked,
}: {
  open: boolean
  title: string
  wrongText: string
  unlockLabel: string
  cancelLabel: string
  onVerify: (pin: string) => Promise<boolean>
  onClose: () => void
  onUnlocked: () => void
}) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (!open) return
    setPin('')
    setWrong(false)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [open])
  if (!open) return null
  const submit = async () => {
    if (pin.length < 4 || busy) return
    setBusy(true)
    const ok = await onVerify(pin)
    setBusy(false)
    if (ok) {
      onUnlocked()
      return
    }
    setWrong(true)
    setPin('')
    inputRef.current?.focus()
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div style={{ ...surfaceCard, background: '#111b2f', padding: 20, width: 300, display: 'flex', flexDirection: 'column', gap: 12 }} onClick={(event) => event.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, color: LT.text }}>{title}</div>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit()
            if (event.key === 'Escape') onClose()
          }}
          aria-invalid={wrong}
          style={{
            fontSize: 24,
            letterSpacing: '0.5em',
            textAlign: 'center',
            padding: '10px 12px',
            borderRadius: LT.radiusMd,
            border: `1px solid ${wrong ? LT.live : LT.line}`,
            background: LT.surfaceRaised,
            color: LT.text,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        {wrong ? <div style={{ fontSize: 12, color: '#fecdd3' }}>{wrongText}</div> : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" small onClick={onClose}>{cancelLabel}</Btn>
          <Btn variant="primary" small onClick={() => void submit()}>{unlockLabel}</Btn>
        </div>
      </div>
    </div>
  )
}
