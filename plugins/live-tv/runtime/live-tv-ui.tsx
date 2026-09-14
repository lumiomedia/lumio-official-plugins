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

const surfaceCard: CSSProperties = {
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

/* ---------- Taggar och knappar ---------- */

function Tag({ variant = 'neutral', children, style }: { variant?: 'accent' | 'neutral' | 'outline' | 'live'; children: ReactNode; style?: CSSProperties }) {
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
    /*
      IKONKNAPPEN ÄR RUND, oavsett vilket höjdgolv värden sätter.

      36×36 plus `borderRadius: 999` är en cirkel i pluginets egen stil — men
      appens TV-CSS lägger `min-height: calc(52 * var(--tv-u))` på TV-knappar,
      vilket vid grundskalan 1,54 är 80 px. Höjden växte alltså till 80 medan
      bredden stod kvar på 36, och Tillbaka-pilen blev en STÅENDE kapsel
      (Jerry 2026-09-08: "gör pilen rund sen").

      `aspect-ratio: 1` gör formen till en egenskap i stället för ett par tal
      som måste hållas i takt: växer höjden av en regel utanför pluginet följer
      bredden med, och knappen kan inte bli oval igen. Att i stället hårdkoda
      80 px hade fungerat tills någon ändrade `--tv-base-scale`.
    */
    aspectRatio: icon ? '1 / 1' : undefined,
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

export function Kicker({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: LT.accent }}>{children}</div>
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
