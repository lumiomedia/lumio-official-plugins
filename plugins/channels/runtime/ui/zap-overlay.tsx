'use client'

/**
 * Zappläget ("gamla TV:n", handoff 1b) ovanpå kanalspelaren: ingen meny, bara
 * bild + kort OSD. "LUMIO TV" uppe vänster, stort kanalnummer uppe höger, brus
 * med scanlines vid varje byte, OSD nere som tonar efter 4 s, knappraden
 * (CH ▼ CH ▲ KANALLISTA ↩ FÖRRA) och kanallistan. Värdspelarens egna
 * kontroller (toppraden, seekraden) döljs så länge läget är på. Rent visuellt
 * lager; spelaren, bruset och tangenterna ägs av ChannelPlayer.
 * Bara hsl()/rgba(), rem för TV-text.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'
import { programmeAt } from '../model/schedule'
import { NOISE_MS } from '../play/zap-logic'
import { ChannelBadge } from './badge'
import { HIDE_HOST_CHROME_CSS } from './host-controls'
import { C, FONT, glass, RADIUS } from './tokens'
import { tvType, tvu } from './tv'
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
  /** Brus just nu (ägs av spelaren, så det överlever att värdspelaren monteras om vid bytet). */
  noise: boolean
  /** Inställningskortet visas: bara bruset, ingen krom (märke, nummer, OSD, lista). */
  chromeHidden?: boolean
  /** Kanallistans tablåer ur sparad poolcache (null = kall cache), räknade en gång per öppning. */
  listRundowns: Map<string, PoolItem[] | null> | null
  isTv: boolean
  t: T
  onSelect(id: string): void
  onChUp(): void
  onChDown(): void
  onPrevious(): void
  onToggleList(): void
  onCloseList(): void
  onExit(): void
  onActivity(): void
}

const clock = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Mobil (< 640 px): kanallistan blir ett bottenark. Aldrig på TV (en TV-box kan rapportera ett smalt fönster). */
function useNarrow(isTv: boolean): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow && !isTv
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
        padding: isTv ? '0 1.1rem' : '0 0.9rem', borderRadius: RADIUS.pill,
        ...glass(isTv, { fill: C.pillBg, blur: 20 }), color: C.text, fontFamily: FONT.ui, fontSize: isTv ? tvType('body') : '0.75rem',
        fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

export function ZapOverlay(p: ZapOverlayProps) {
  const { channel, programme, now, isTv, t } = p
  const noise = p.noise
  const narrow = useNarrow(isTv)
  const fade: CSSProperties = { opacity: p.osdVisible ? 1 : 0, transition: 'opacity 240ms ease', pointerEvents: p.osdVisible ? 'auto' : 'none' }
  const pct = programme ? Math.min(100, Math.max(0, ((now - programme.start) / Math.max(1, programme.stop - programme.start)) * 100)) : 0
  const bigNumber = p.pendingDigits || String(channel.number)
  const times = programme ? `${clock(programme.start)}–${clock(programme.stop)}${p.nextTitle ? ` · ${t('homeCardNext', { title: p.nextTitle })}` : ''}` : ''

  return (
    <div
      data-channels-zap=""
      onFocus={p.onActivity}
      style={{ position: 'absolute', inset: 0, zIndex: 56, pointerEvents: 'none', fontFamily: FONT.ui, color: C.text }}
    >
      <style>{KEYFRAMES}</style>
      {/* Värdens kontroller döljs så länge zappläget är på (regeln följer elementet). */}
      <style>{HIDE_HOST_CHROME_CSS}</style>

      {p.chromeHidden ? null : (<>
      {/* Topp: märke uppe vänster, kanalnummer uppe höger */}
      <div data-zap-brand="" style={{ position: 'absolute', top: 'calc(var(--android-inset-top, 0px) + 1.4rem)', left: '1.75rem', fontSize: '0.625rem', letterSpacing: '0.22em', fontWeight: 700, color: C.textSoft, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
        {t('zapBrand')}
      </div>
      <div
        data-zap-number=""
        style={{
          position: 'absolute', top: 'calc(var(--android-inset-top, 0px) + 0.75rem)', right: '1.5rem',
          fontFamily: FONT.title, fontSize: '2.875rem', lineHeight: 1, color: C.text,
          textShadow: '0 2px 12px rgba(0,0,0,0.8)',
        }}
      >
        {bigNumber}
      </div>

      {p.notice ? (
        <div role="status" style={{ position: 'absolute', top: '5.5rem', left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100vw - 2rem)', padding: '0.6rem 1.1rem', borderRadius: RADIUS.osd, ...glass(isTv, { fill: C.osdBg, blur: 14 }), fontSize: isTv ? tvType('body') : '0.85rem', textAlign: 'center' }}>
          {p.notice}
        </div>
      ) : null}

      {/* Nedre OSD: programkortet och knappraden under, tonar tillsammans. */}
      <div
        data-zap-osd=""
        style={{
          ...fade, position: 'absolute', left: '1.5rem', right: '1.5rem', bottom: 'calc(var(--android-inset-bottom, 0px) + 1.25rem)',
          display: 'flex', flexDirection: 'column', gap: '0.9rem',
        }}
      >
        <div
          style={{
            padding: '0.95rem 1.15rem', borderRadius: RADIUS.osd,
            ...glass(isTv, { fill: 'rgba(5,8,22,0.72)', blur: 14 }),
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}
        >
          <ChannelBadge channel={channel} size={58} isTv={isTv} />
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ fontSize: isTv ? tvType('small') : '0.65rem', letterSpacing: '0.18em', fontWeight: 700, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('zapChannelLine', { n: channel.number, name: channel.name.toUpperCase() })}
            </div>
            <div style={{ fontFamily: FONT.title, fontSize: '1.5rem', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {programme?.title ?? t('zapNothingOn')}
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: C.accent }} />
            </div>
            <div style={{ fontSize: isTv ? tvType('body') : '0.8rem', color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{times}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <ZapButton onClick={p.onChDown} isTv={isTv} label={t('playerChDown')}>CH ▼</ZapButton>
          <ZapButton onClick={p.onChUp} isTv={isTv} label={t('playerChUp')}>CH ▲</ZapButton>
          <ZapButton onClick={p.onToggleList} isTv={isTv} init={!p.listOpen}>{t('zapList')}</ZapButton>
          {p.hasPrevious ? <ZapButton onClick={p.onPrevious} isTv={isTv}>{t('zapPrev')}</ZapButton> : null}
          <div style={{ flex: 1 }} />
          {!narrow ? <span style={{ fontFamily: FONT.mono, fontSize: isTv ? tvType('small') : '0.7rem', color: C.textDim, whiteSpace: 'nowrap' }}>{t('zapHint')}</span> : null}
          <ZapButton onClick={p.onExit} isTv={isTv}>{t('zapExit')}</ZapButton>
        </div>
      </div>

      {p.listOpen ? <ZapList {...p} /> : null}
      </>)}

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
  const narrow = useNarrow(p.isTv)
  const sorted = useMemo(() => [...p.channels].sort((a, b) => a.number - b.number), [p.channels])
  // Tablåerna räknas i spelaren, en gång per öppning (inte vid varje ommontering av värdspelaren).
  const rundowns = p.listRundowns
  const panel: CSSProperties = narrow
    ? { left: 0, right: 0, bottom: 0, maxHeight: '60vh', borderRadius: `${RADIUS.osd}px ${RADIUS.osd}px 0 0` }
    : { left: 0, top: 0, bottom: 0, width: p.isTv ? tvu(440) : 290 }
  return (
    <>
      {/* Tryck utanför stänger listan. */}
      <div data-zap-list-backdrop="" aria-hidden="true" onClick={p.onCloseList} style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', background: narrow ? 'rgba(0,0,0,0.4)' : 'transparent' }} />
      <div
        data-zap-list=""
        // TV: fokusfälla medan listan är öppen; Bakåt stänger (ägs av spelaren).
        data-panel-root={p.isTv ? '' : undefined}
        data-scroll={p.isTv ? '' : undefined}
        role="listbox"
        style={{
          ...panel, position: 'absolute', pointerEvents: 'auto', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          padding: 'calc(var(--android-inset-top, 0px) + 1rem) 0.6rem 1rem', gap: '0.25rem',
          ...glass(p.isTv, { fill: 'rgba(18,18,22,0.85)', blur: 14 }),
          border: 'none', ...(narrow ? { borderTop: `1px solid ${C.glassBorder}` } : { borderRight: `1px solid ${C.glassBorder}` }),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem 0.4rem' }}>
          <span style={{ flex: 1, fontSize: '0.7rem', letterSpacing: '0.22em', fontWeight: 700, color: C.textDim }}>{p.t('zapListTitle').toUpperCase()}</span>
          <ZapButton onClick={p.onCloseList} isTv={p.isTv}>{p.t('playerClose')}</ZapButton>
        </div>
        {sorted.map((c) => {
          const rundown = rundowns?.get(c.id)
          const slot = rundown && rundown.length > 0 ? programmeAt(rundown, c.airWindow, p.now) : null
          return (
            <ZapListRow key={c.id} channel={c} active={c.id === p.channel.id} title={slot && slot.kind === 'programme' ? slot.item.title : null} isTv={p.isTv} onSelect={p.onSelect} />
          )
        })}
      </div>
    </>
  )
}

/** En rad: nummer, namn och vad som sänds nu (— när poolen inte är cachad). */
function ZapListRow({ channel, active, title, isTv, onSelect }: { channel: ChannelDef; active: boolean; title: string | null; isTv: boolean; onSelect(id: string): void }) {
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
      <span style={{ fontFamily: FONT.mono, fontSize: isTv ? tvType('body') : '0.8rem', color: active ? C.accent : C.textDim, minWidth: '1.8rem' }}>{channel.number}</span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: isTv ? tvType('h3') : '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</span>
        <span style={{ display: 'block', fontSize: isTv ? tvType('small') : '0.7rem', color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title ?? '—'}</span>
      </span>
    </button>
  )
}
