'use client'

import { useTvMode } from '@/lib/plugin-sdk'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
  bottom,
  backTvStation,
}: {
  title: string
  onBack?: () => void
  backLabel: string
  children?: ReactNode
  right?: ReactNode
  /** TV: Tillbaka-knappen som fokusstation. */
  backTvStation?: Record<string, string>
  /**
   * EGEN RAD under resten av rubriken, vänster- och högerställd innehåll i
   * samma linje (`space-between`).
   *
   * Behövs för att rubriken är en radbrytande flexrad: sökfältet (minst
   * 220 px) fyller mobilens bredd, så allt efter det hamnar på nya rader i
   * den ordning webbläsaren råkar få plats med dem — knapparna gick inte att
   * placera. Den här platsen tar `width: 100%` och får därför ALLTID en egen
   * rad, längst ned (Jerry 2026-09-03).
   */
  bottom?: ReactNode
}) {
  // TV: rubrikraden ligger på SAMMA rad som värdens menychip uppe till vänster
  // (Jerry 2026-09-06, "en lång rad"): knapparna i chipens höjd (chipen står
  // 20 px från kanten, 42 px hög) och linjen under chipen. Raden börjar till
  // höger om chipens fotavtryck (150 + 20 px luft). Läget MÄTS — sidans
  // toppavstånd skiljer mellan värdar, så ett fast negativt avstånd hamnade
  // fel (Jerry 2026-09-06, "raden måste ner").
  const isTv = useTvMode()
  // Värdens menypill även utanför TV (data-menu-chip på roten): rubriken
  // lägger sig då på pillrets rad, titeln till höger om pillret och EPG/klockan
  // längst till höger, i stället för att ta en egen rad (Jerry 2026-09-07).
  const [menuChip, setMenuChip] = useState(() => typeof document !== 'undefined' && document.documentElement.getAttribute('data-menu-chip') === '1')
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const read = () => setMenuChip(root.getAttribute('data-menu-chip') === '1')
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['data-menu-chip'] })
    return () => observer.disconnect()
  }, [])
  const chipRow = isTv || menuChip
  // Skrivbord (mus, inte TV): ingen Tillbaka-knapp — sidomenyn/Hem är vägen ut
  // — och filterchipsen på egen rad under rubriken, i linje med högersidan
  // (Jerry 2026-09-06). Mobil behåller knappen.
  // Med värdens menypill-läge är sidomenyn borta: då behålls Tillbaka även på
  // skrivbordet (Jerry 2026-09-07). Läget läses från roten (data-menu-chip-mode).
  const chipMode = typeof document !== 'undefined' && document.documentElement.getAttribute('data-menu-chip-mode') === '1'
  const desktopPointer = !isTv && !chipMode && typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine) and (min-width: 640px)').matches
  const headerRef = useRef<HTMLDivElement | null>(null)
  const [tvShift, setTvShift] = useState(0)
  const [chipClear, setChipClear] = useState(0)
  // Utanför TV utan pill på sidan (värden döljer det på Live TV): raden ligger
  // på hörnlinjen och Tillbaka ska stå exakt där pillret annars står — 3 px ner
  // (36 mot 42 px hög) och på mobilen 4 px in (sidans px-4 mot pillrets 20)
  // (Jerry 2026-09-07, "fortfarande för lågt").
  const [edgeFit, setEdgeFit] = useState(false)
  const tvShiftRef = useRef(0)
  useLayoutEffect(() => {
    // Mäts alltid utanför TV (även utan pill: kantläget), på TV bara i chipraden.
    if (isTv && !chipRow) return
    const el = headerRef.current
    if (!el) return
    // Värdens chip flyttas ner på macOS (överlagrad titelrad): --tv-top-inset.
    const ROW_PADDING = 8
    const measure = () => {
      // Pillrets faktiska läge när det finns i DOM (skrivbord/mobil har en
      // annan hörnlinje än TV); annars TV:ns konstanter.
      const chip = document.querySelector('.mc-chip')
      const chipRect = chip ? chip.getBoundingClientRect() : null
      const hasChip = Boolean(chipRect && chipRect.width > 0 && chipRect.height > 0)
      // Utan chip på sidan (värden döljer det på Live TV): ingen flytt, ingen
      // vänsterluft — Tillbaka står längst till vänster (Jerry 2026-09-07).
      if (!hasChip) {
        if (chipClear !== 0) setChipClear(0)
        if (tvShiftRef.current !== 0) { tvShiftRef.current = 0; setTvShift(0) }
        setEdgeFit(!isTv)
        return
      }
      setEdgeFit(false)
      const chipTop = chipRect!.top
      const natural = el.getBoundingClientRect().top - tvShiftRef.current
      const next = Math.round(chipTop - ROW_PADDING - natural)
      const clear = Math.round(chipRect!.right + 12 - el.getBoundingClientRect().left)
      if (Math.abs(clear - chipClear) >= 1) setChipClear(clear)
      if (Math.abs(next - tvShiftRef.current) < 1) return
      tvShiftRef.current = next
      setTvShift(next)
    }
    measure()
    const settle = window.setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    return () => { window.clearTimeout(settle); window.removeEventListener('resize', measure) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipRow, isTv])
  const mobileEdge = edgeFit && typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches
  return (
    <div
      ref={headerRef}
      data-live-tv-header=""
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: chipRow || edgeFit ? 42 : 64,
        padding: edgeFit ? `3px 0 8px ${mobileEdge ? 4 : 0}px` : '8px 0',
        borderBottom: `1px solid ${LT.line}`,
        flexWrap: 'wrap',
        ...(chipRow ? { marginTop: tvShift, paddingLeft: chipClear } : null),
      }}
    >
      {/* Tillbaka på alla enheter, även skrivbord med mus: pillret är dolt på
          Live TV, och i sidomenyläget saknades knappen helt (Jerry 2026-09-07,
          "Tillbaka knapp saknas före Live TV-titeln"). */}
      {onBack ? (
        <Btn
          variant={backTvStation ? 'secondary' : 'ghost'}
          icon
          onClick={onBack}
          ariaLabel={backLabel}
          title={backLabel}
          tvStation={backTvStation}
          // TV: chipbakgrund på pilen (Jerry 2026-09-06), som gruppväljaren.
          style={backTvStation ? { background: LT.neutral, borderColor: 'transparent', color: LT.text } : undefined}
        >
          <Icon.Back />
        </Btn>
      ) : null}
      <div style={{ fontSize: 18, fontWeight: 600, color: LT.text }}>{title}</div>
      {children && !desktopPointer ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 12, alignItems: 'center' }}>{children}</div> : null}
      {right ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>{right}</div> : null}
      {children && desktopPointer ? <div style={{ width: '100%', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4 }}>{children}</div> : null}
      {bottom ? <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>{bottom}</div> : null}
    </div>
  )
}

/** Horisontell kortrad med snäpp; `peek` låter nästa kort kika in. */
export function ScrollRow({ children, gap = 12, tvRow = false }: { children: ReactNode; gap?: number; tvRow?: boolean }) {
  return (
    <div
      className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      // TV: data-row + data-scroll så värdens fokusmotor rullar in det
      // fokuserade kortet i raden (Jerry 2026-09-06).
      {...(tvRow ? { 'data-row': '', 'data-scroll': '' } : {})}
      // TV: luft runt raden så fokusramen (outline 2 px utanför kortet) inte
      // klipps av rullbehållaren i kanterna (Jerry 2026-09-06).
      // scroll-padding: snappningen (scroll-snap-align: start på korten) drog
      // annars kortets kant till rullportens kant FÖRBI luften, och ringens
      // vänstra sida klipptes (Jerry 2026-09-06, "syns inte hela borden").
      style={tvRow ? { gap, padding: 6, margin: -6, scrollSnapType: 'x proximity', scrollPaddingInline: 6 } : { gap, paddingBottom: 6, scrollSnapType: 'x proximity' }}
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
