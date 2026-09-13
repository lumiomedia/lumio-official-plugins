'use client'

import { createElement, useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { tvHoldHandlers } from '@/lib/plugin-sdk'
import { channelKey, getLiveTvLogoSrc, type M3uChannel } from '../live-tv-data'
import { LiveTvLogoImage } from '../live-tv-logo-image'
import { initialsOf } from '../live-tv-ui'

/** Designpx (1920-scen) → pluginpx. Pluginet skalas redan med --tv-base-scale 1.54. */
export function dp(n: number): number {
  return Math.round(n / 1.54)
}

export const TV = {
  bg: '#000',
  text: '#f3f4f8',
  muted: 'rgba(243,244,248,0.7)',
  dim: 'rgba(243,244,248,0.55)',
  faint: 'rgba(243,244,248,0.4)',
  s05: 'rgba(252,252,255,0.05)',
  s06: 'rgba(252,252,255,0.06)',
  s07: 'rgba(252,252,255,0.07)',
  s08: 'rgba(252,252,255,0.08)',
  s10: 'rgba(252,252,255,0.10)',
  s12: 'rgba(252,252,255,0.12)',
  s14: 'rgba(252,252,255,0.14)',
  s16: 'rgba(252,252,255,0.16)',
  s18: 'rgba(252,252,255,0.18)',
  line: 'rgba(255,255,255,0.08)',
  lineCard: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.22)',
  acc: 'rgb(var(--accent-500))',
  accMix: (pct: number) => `color-mix(in srgb, rgb(var(--accent-500)) ${pct}%, transparent)`,
  accText: '#ffd9c9',
  onAcc: '#fff',
  live: '#fb7185',
  liveSoft: 'rgba(251,113,133,0.22)',
  liveText: '#fecdd3',
  glass: 'rgba(58,59,66,0.96)',
  panel: 'rgba(20,22,30,0.98)',
  scrim: 'rgba(0,0,0,0.6)',
  font: "'Avenir Next', 'Trebuchet MS', sans-serif",
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const

export const cardStyle: CSSProperties = {
  background: TV.s07,
  border: `1px solid ${TV.lineCard}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
  borderRadius: dp(14),
  overflow: 'hidden',
}

/**
 * Fokusring 2 px accent + glöd inom Live TV (handoffen), ovanpå värdens
 * 1 px-regel för pluginsidor. Scopad till pluginroten så inget annat påverkas.
 * Egen keyframe: pluginets buntar får inga klasser ur appens Tailwind.
 *
 * Ligger också till för `.lumio-tv-logo-img`: LiveTvLogoImage (delad med
 * skrivbordsvyerna) tar bara `className`, ingen `style`-prop, så
 * logotypens storlek sätts här i stället för inline på ChannelArt.
 */
export function TvFocusStyle() {
  return (
    <style>{`
[data-live-tv-tv-root] [data-f]:focus,
[data-live-tv-tv-root] [data-f][data-fcur="1"] {
  outline: 2px solid rgb(var(--accent-500)) !important;
  outline-offset: 3px;
  box-shadow: 0 0 28px color-mix(in srgb, rgb(var(--accent-500)) 45%, transparent) !important;
}
[data-live-tv-tv-root] [data-f] { outline: none; }
[data-live-tv-tv-root] [data-live-tv-menu-item][data-f]:focus,
[data-live-tv-tv-root] [data-live-tv-menu-item][data-f][data-fcur="1"] { outline-offset: -4px; border-radius: ${dp(12)}px; }
[data-live-tv-tv-root] [data-scroll]::-webkit-scrollbar, [data-live-tv-tv-root] [data-row]::-webkit-scrollbar { display: none; }
[data-live-tv-tv-root] .lumio-tv-logo-img { max-width: 60%; max-height: 60%; object-fit: contain; }
@keyframes lumio-livetv-fade { from { opacity: 0; transform: translateY(${dp(6)}px); } to { opacity: 1; transform: none; } }
[data-live-tv-tv-root] [data-live-tv-layer] { animation: lumio-livetv-fade 160ms ease-out; }
`}</style>
  )
}

export type StationProps = Record<string, unknown>

/** EN station: OK = onOk, håll OK = onHold (glasmeny). Klick med mus = onOk. */
export function station(onOk: () => void, onHold?: (element: HTMLElement) => void, extra?: Record<string, string>): StationProps {
  const hold = onHold ? tvHoldHandlers(onOk, onHold) : null
  return {
    'data-f': '',
    tabIndex: 0,
    role: 'button',
    onClick: onOk,
    ...(hold
      ? { onKeyDown: hold.onKeyDown, onKeyUp: hold.onKeyUp }
      : {
          onKeyDown: (event: { key: string; preventDefault(): void }) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOk()
            }
          },
        }),
    ...(extra ?? {}),
  }
}

export function Tag({ variant, children, style }: { variant: 'live' | 'neutral' | 'replay' | 'reason' | 'audio' | 'quality'; children: ReactNode; style?: CSSProperties }) {
  const base: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: dp(8), whiteSpace: 'nowrap', lineHeight: 1.2 }
  const look: Record<typeof variant, CSSProperties> = {
    live: { fontSize: dp(13), fontWeight: 600, letterSpacing: '0.14em', padding: `${dp(5)}px ${dp(12)}px`, borderRadius: dp(8), background: TV.liveSoft, color: TV.liveText, textTransform: 'uppercase' },
    neutral: { fontSize: dp(15), padding: `${dp(3)}px ${dp(12)}px`, borderRadius: dp(8), background: TV.s12, color: TV.text },
    quality: { fontSize: dp(15), padding: `${dp(3)}px ${dp(12)}px`, borderRadius: dp(8), background: 'rgba(0,0,0,0.45)', color: TV.text },
    replay: { fontSize: dp(13), letterSpacing: '0.08em', padding: `${dp(4)}px ${dp(10)}px`, borderRadius: dp(6), background: TV.accMix(22), color: TV.accText },
    reason: { fontSize: dp(13), letterSpacing: '0.08em', padding: `${dp(4)}px ${dp(10)}px`, borderRadius: dp(6), background: 'rgba(0,0,0,0.45)', color: TV.text },
    audio: { fontSize: dp(13), fontWeight: 600, letterSpacing: '0.12em', padding: `${dp(4)}px ${dp(10)}px`, borderRadius: dp(6), background: TV.acc, color: TV.onAcc, textTransform: 'uppercase' },
  }
  return (
    <span style={{ ...base, ...look[variant], ...style }}>
      {variant === 'live' ? <span style={{ width: dp(8), height: dp(8), borderRadius: 999, background: TV.live }} /> : null}
      {children}
    </span>
  )
}

export function Progress({ value, height = dp(5), track = TV.s14, style }: { value: number; height?: number; track?: string; style?: CSSProperties }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div style={{ height, borderRadius: height, background: track, overflow: 'hidden', ...style }}>
      <div data-fill="" style={{ width: `${pct}%`, height: '100%', background: TV.acc }} />
    </div>
  )
}

/**
 * Kanalbild: sparad bildruta (playerFrameUrl) → logotyp → initialer. Barnen
 * ritas ovanpå (taggar, text, gradient).
 */
export function ChannelArt({ channel, frameVersion, height, aspect, radius, children, style }: {
  channel: Pick<M3uChannel, 'name' | 'logo' | 'url'> | Pick<M3uChannel, 'name' | 'logo'>
  frameVersion?: number | string | null
  height?: number
  aspect?: string
  radius?: number
  children?: ReactNode
  style?: CSSProperties
}) {
  const [frameFailed, setFrameFailed] = useState(false)
  // Bildrutan är cachad under channelKey (namn + url). Utan url kan vi inte
  // forma en tillförlitlig nyckel, så vi hoppar rakt till logotyp/initialer
  // i stället för att chansa med en ostabil nyckel.
  const frameSrc = !frameFailed && 'url' in channel ? sdk.playerFrameUrl(channelKey(channel), frameVersion ?? null) : null
  const logo = getLiveTvLogoSrc(channel.logo)
  return (
    <div style={{ position: 'relative', height, aspectRatio: aspect, background: 'rgba(252,252,255,0.06)', borderRadius: radius, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {frameSrc ? (
        <img src={frameSrc} alt="" onError={() => setFrameFailed(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : logo ? (
        <LiveTvLogoImage src={logo} alt="" className="lumio-tv-logo-img" />
      ) : (
        <span style={{ fontSize: dp(22), fontWeight: 600, color: TV.dim, letterSpacing: '0.04em' }}>{initialsOf(channel.name)}</span>
      )}
      {children}
    </div>
  )
}

export function Chip({ active, children, style, ...rest }: { active: boolean; children: ReactNode; style?: CSSProperties } & StationProps) {
  return (
    <div
      {...rest}
      style={{ height: dp(46), padding: `0 ${dp(22)}px`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: dp(19), whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, background: active ? TV.s16 : TV.s05, color: active ? TV.text : TV.muted, fontWeight: active ? 600 : 400, border: `1px solid ${active ? TV.lineStrong : 'transparent'}`, ...style }}
    >
      {children}
    </div>
  )
}

export function Segment<K extends string>({ options, value, onChange, style }: { options: { key: K; label: string }[]; value: K; onChange: (key: K) => void; style?: CSSProperties }) {
  return (
    <div style={{ display: 'inline-flex', padding: dp(4), borderRadius: 999, background: TV.s08, gap: dp(2), ...style }}>
      {options.map((option) => (
        <div
          key={option.key}
          {...station(() => onChange(option.key))}
          style={{ height: dp(38), padding: `0 ${dp(18)}px`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', fontSize: dp(16), cursor: 'pointer', background: option.key === value ? TV.s16 : 'transparent', color: option.key === value ? TV.text : TV.muted }}
        >
          {option.label}
        </div>
      ))}
    </div>
  )
}

export function RoundBtn({ size = dp(52), children, background = TV.s12, ...rest }: { size?: number; children: ReactNode; background?: string } & StationProps) {
  return (
    <div {...rest} style={{ width: size, height: size, borderRadius: 999, background, border: `1px solid ${TV.lineCard}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: TV.text, cursor: 'pointer', flexShrink: 0 }}>
      {children}
    </div>
  )
}

export function Toggle({ on }: { on: boolean }) {
  return (
    <span style={{ width: dp(52), height: dp(30), borderRadius: 999, background: on ? TV.acc : TV.s18, position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: dp(3), left: on ? dp(25) : dp(3), width: dp(24), height: dp(24), borderRadius: 999, background: '#fff', transition: 'left 120ms' }} />
    </span>
  )
}

/* Phosphor-liknande ikoner, 24-rutnät, stroke 1.8 */
type IconProps = { size?: number; filled?: boolean }
const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const svg = (size: number, children: ReactNode, fill?: boolean) => createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', ...sw, fill: fill ? 'currentColor' : 'none' }, children)
export const Icons = {
  Search: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  Home: ({ size = dp(26) }: IconProps) => svg(size, <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>),
  Tv: ({ size = dp(26) }: IconProps) => svg(size, <><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M8 21h8" /></>),
  SquaresFour: ({ size = dp(26) }: IconProps) => svg(size, <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
  Heart: ({ size = dp(26), filled = false }: IconProps) => svg(size, <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />, filled),
  Gear: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  ChevronLeft: ({ size = dp(24) }: IconProps) => svg(size, <path d="M15 18l-6-6 6-6" />),
  ChevronDown: ({ size = dp(20) }: IconProps) => svg(size, <path d="m6 9 6 6 6-6" />),
  Play: ({ size = dp(24) }: IconProps) => svg(size, <path d="M8 5v14l11-7z" />, true),
  Pause: ({ size = dp(24) }: IconProps) => svg(size, <path d="M7 5h4v14H7zM13 5h4v14h-4z" />, true),
  Bell: ({ size = dp(20), filled = false }: IconProps) => svg(size, <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>, filled),
  Lock: ({ size = dp(18) }: IconProps) => svg(size, <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  Plus: ({ size = dp(40) }: IconProps) => svg(size, <path d="M12 5v14M5 12h14" />),
  Dots: ({ size = dp(24) }: IconProps) => svg(size, <><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>, true),
  Calendar: ({ size = dp(20) }: IconProps) => svg(size, <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>),
}

/** Värdens klocka när SDK:t har den, annars enkel lokal klocka. */
export function useTvClockNode(locale: string): ReactNode {
  const HostClock = (sdk as unknown as { getTvClock?: () => ComponentType<{ variant?: 'tv' | 'desktop' }> | null }).getTvClock?.() ?? null
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (HostClock) return
    let timer = 0
    const tick = () => {
      const next = new Date()
      setNow(next)
      timer = window.setTimeout(tick, 60_000 - (next.getSeconds() * 1000 + next.getMilliseconds()))
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [HostClock])
  if (HostClock) return <HostClock variant="desktop" />
  const time = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase()
  const day = now.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').toUpperCase()
  return <span style={{ fontSize: dp(17), letterSpacing: '0.1em', color: 'rgba(243,244,248,0.65)', whiteSpace: 'nowrap' }}>{`${time} | ${date} | ${day}`}</span>
}

/** Alltid appens accentfärg (token). Egen hook för framtida per-tema-behov. */
export function useAccent(): { acc: string } {
  return { acc: TV.acc }
}
