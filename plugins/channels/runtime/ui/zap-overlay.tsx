'use client'

/**
 * Zappläget ("gamla TV:n") ovanpå kanalspelaren: brus vid varje byte, stort
 * kanalnummer, tonande OSD och kanallista. Rent visuellt lager; spelaren och
 * dess tangenter ägs av ChannelPlayer. Bara hsl()/rgba(), rem för TV-text.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { ChannelDef } from '../model/channel'
import { programmeAt } from '../model/schedule'
import { NOISE_MS } from '../play/zap-logic'
import { useChannelPool } from '../state/store'
import { ChannelBadge } from './badge'
import { C, FONT, RADIUS } from './tokens'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

/** Liten gråskalebrus-SVG som data-URI; CSS flyttar bakgrunden för rörelsen. */
const NOISE_SVG = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")"

const KEYFRAMES = `
@keyframes chz-noise { 0% { background-position: 0 0 } 25% { background-position: -37px 23px } 50% { background-position: 41px -29px } 75% { background-position: -19px -43px } 100% { background-position: 29px 31px } }
@media (prefers-reduced-motion: reduce) { [data-zap-noise] { animation: none !important } }
`

export interface ZapShownProgramme {
  title: string
  start: number
  stop: number
}

export interface ZapOverlayProps {
  channel: ChannelDef
  channels: ChannelDef[]
  programme: ZapShownProgramme | null
  nextTitle: string | null
  now: number
  /** Siffror som matas in just nu (stort uppe höger). */
  pendingDigits: string
  osdVisible: boolean
  listOpen: boolean
  notice: string | null
  hasPrevious: boolean
  isTv: boolean
  t: T
  onSelect(id: string): void
  onPrevious(): void
  onOpenList(): void
  onCloseList(): void
  onExit(): void
  onActivity(): void
}

const clock = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Mobil (< 640 px): kanallistan blir ett bottenark. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow
}

/** Brus i NOISE_MS varje gång kanalen byts (inte vid första monteringen). */
function useNoise(channelId: string): boolean {
  const [on, setOn] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setOn(true)
    const id = window.setTimeout(() => setOn(false), NOISE_MS)
    return () => window.clearTimeout(id)
  }, [channelId])
  return on
}

function ZapButton({ children, onClick, isTv, init, label }: { children: ReactNode; onClick(): void; isTv: boolean; init?: boolean; label?: string }) {
  return (
    <button
      type="button"
      data-f=""
      data-init={init ? '' : undefined}
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem', minHeight: isTv ? '2.75rem' : '2.25rem',
        padding: isTv ? '0 1.1rem' : '0 0.9rem', borderRadius: RADIUS.pill, border: `1px solid ${C.pillBorder}`,
        background: C.pillBg, color: C.text, fontFamily: FONT.ui, fontSize: isTv ? '1rem' : '0.75rem',
        fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

export function ZapOverlay(p: ZapOverlayProps) {
  const { channel, programme, now, isTv, t } = p
  const noise = useNoise(channel.id)
  const fade: CSSProperties = { opacity: p.osdVisible ? 1 : 0, transition: 'opacity 240ms ease', pointerEvents: p.osdVisible ? 'auto' : 'none' }
  const pct = programme ? Math.min(100, Math.max(0, ((now - programme.start) / Math.max(1, programme.stop - programme.start)) * 100)) : 0
  const bigNumber = p.pendingDigits || String(channel.number)
  const times = programme ? `${clock(programme.start)}–${clock(programme.stop)}${p.nextTitle ? ` · ${t('playerThen', { title: p.nextTitle })}` : ''}` : ''

  return (
    <div
      data-channels-zap=""
      onFocus={p.onActivity}
      style={{ position: 'absolute', inset: 0, zIndex: 56, pointerEvents: 'none', fontFamily: FONT.ui, color: C.text }}
    >
      <style>{KEYFRAMES}</style>

      {/* Topp: märke uppe vänster, kanalnummer uppe höger */}
      <div style={{ position: 'absolute', top: 'calc(var(--android-inset-top, 0px) + 1.25rem)', left: '1.5rem', fontSize: '0.625rem', letterSpacing: '0.22em', fontWeight: 700, color: C.textSoft, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
        {t('zapBrand')}
      </div>
      <div
        data-zap-number=""
        style={{
          position: 'absolute', top: 'calc(var(--android-inset-top, 0px) + 0.75rem)', right: '1.5rem',
          fontFamily: FONT.title, fontSize: '2.875rem', lineHeight: 1, color: C.text,
          textShadow: '0 2px 12px rgba(0,0,0,0.8)', opacity: p.pendingDigits || p.osdVisible || noise ? 1 : 0, transition: 'opacity 240ms ease',
        }}
      >
        {bigNumber}
      </div>

      {p.notice ? (
        <div role="status" style={{ position: 'absolute', top: '5.5rem', left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100vw - 2rem)', padding: '0.6rem 1.1rem', borderRadius: RADIUS.osd, background: C.osdBg, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', fontSize: isTv ? '1rem' : '0.85rem', textAlign: 'center' }}>
          {p.notice}
        </div>
      ) : null}

      {/* Nedre OSD */}
      <div
        data-zap-osd=""
        style={{
          ...fade, position: 'absolute', left: '1.5rem', right: '1.5rem', bottom: 'calc(var(--android-inset-bottom, 0px) + 6.5rem)',
          padding: '0.9rem 1.1rem', borderRadius: RADIUS.osd, border: '1px solid rgba(255,255,255,0.08)',
          background: C.osdBg, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <ChannelBadge channel={channel} size={58} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isTv ? '0.9rem' : '0.7rem', letterSpacing: '0.18em', fontWeight: 700, color: C.accentLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('zapChannelLine', { n: channel.number, name: channel.name.toUpperCase() })}
            </div>
            <div style={{ fontFamily: FONT.title, fontSize: '1.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {programme?.title ?? t('zapNothingOn')}
            </div>
          </div>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: C.accent }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: isTv ? '0.95rem' : '0.8rem', color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{times}</span>
          {p.hasPrevious ? <ZapButton onClick={p.onPrevious} isTv={isTv}>{t('zapPrev')}</ZapButton> : null}
          <ZapButton onClick={p.onOpenList} isTv={isTv} init={!p.listOpen}>{t('zapList')}</ZapButton>
          <ZapButton onClick={p.onExit} isTv={isTv}>{t('zapExit')}</ZapButton>
        </div>
      </div>

      {p.listOpen ? <ZapList {...p} /> : null}

      {/* Brus: ligger sist så det täcker allt, men tar aldrig emot input. */}
      {noise ? (
        <div data-zap-noise-layer="" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
          <div
            data-zap-noise=""
            style={{ position: 'absolute', inset: 0, backgroundImage: NOISE_SVG, backgroundSize: '160px 160px', opacity: 0.55, animation: `chz-noise ${NOISE_MS}ms steps(5) infinite` }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 3px)' }} />
          <div style={{ position: 'relative', fontFamily: FONT.title, fontSize: '7rem', color: C.text, textShadow: '0 4px 24px rgba(0,0,0,0.85)' }}>{channel.number}</div>
        </div>
      ) : null}
    </div>
  )
}

function ZapList(p: ZapOverlayProps) {
  const narrow = useNarrow()
  const sorted = [...p.channels].sort((a, b) => a.number - b.number)
  const panel: CSSProperties = narrow
    ? { left: 0, right: 0, bottom: 0, maxHeight: '60vh', borderRadius: `${RADIUS.osd}px ${RADIUS.osd}px 0 0` }
    : { left: 0, top: 0, bottom: 0, width: 290 }
  return (
    <div
      data-zap-list=""
      role="listbox"
      style={{
        ...panel, position: 'absolute', pointerEvents: 'auto', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        padding: 'calc(var(--android-inset-top, 0px) + 1rem) 0.6rem 1rem', gap: '0.25rem',
        background: 'rgba(5,8,22,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderRight: narrow ? undefined : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontSize: '0.7rem', letterSpacing: '0.22em', fontWeight: 700, color: C.textDim, padding: '0 0.5rem 0.4rem' }}>{p.t('zapListTitle').toUpperCase()}</div>
      {sorted.map((c) => (
        <ZapListRow key={c.id} channel={c} active={c.id === p.channel.id} now={p.now} isTv={p.isTv} t={p.t} onSelect={p.onSelect} />
      ))}
    </div>
  )
}

/** En rad: nummer, namn och vad som sänds nu. Titeln ur kanalens pool, inga strömuppslag. */
function ZapListRow({ channel, active, now, isTv, t, onSelect }: { channel: ChannelDef; active: boolean; now: number; isTv: boolean; t: T; onSelect(id: string): void }) {
  const { rundown } = useChannelPool(channel)
  const slot = rundown.length > 0 ? programmeAt(rundown, channel.airWindow, now) : null
  const title = slot && slot.kind === 'programme' ? slot.item.title : null
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-f=""
      data-init={active ? '' : undefined}
      onClick={() => onSelect(channel.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '0.55rem 0.5rem', borderRadius: RADIUS.card, border: '1px solid transparent',
        background: active ? 'rgba(244,132,95,.16)' : 'transparent', color: C.text, fontFamily: FONT.ui,
      }}
    >
      <span style={{ fontFamily: FONT.mono, fontSize: isTv ? '1rem' : '0.8rem', color: active ? C.accent : C.textDim, minWidth: '1.8rem' }}>{channel.number}</span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: isTv ? '1.05rem' : '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</span>
        <span style={{ display: 'block', fontSize: isTv ? '0.85rem' : '0.7rem', color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title ?? t('zapNothingOn')}</span>
      </span>
    </button>
  )
}
