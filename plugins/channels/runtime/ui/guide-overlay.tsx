'use client'

/**
 * Tablån INNE i spelaren (TABLÅ-knappen): kompakt rutnät ovanpå videon som
 * fortsätter spela. Aktuell kanal markerad, nu-linje, klick/OK på en rad =
 * den kanalen live. Bakåt/Esc/TABLÅ stänger (tangenterna ägs av ChannelPlayer).
 * TV: panelen är en fokusfälla (data-panel-root), raderna stationer (data-f),
 * startfokus på aktuell kanal (data-init); ◀▶ rullar tidsaxeln.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChannelDef } from '../model/channel'
import { ChannelGuide } from './channel-guide'
import { formatClock, guideWindow } from './guide-layout'
import { C, FONT, glass, RADIUS, fontSize } from './tokens'
import { tvType } from './tv'
import type { useText } from './use-text'

const HALF_HOUR = 30 * 60_000
/** Hur långt fram tidsaxeln kan rullas (halvtimmar), som på Kanaler-sidan. */
const MAX_SHIFT = 46

export interface GuideOverlayProps {
  channels: ChannelDef[]
  currentId: string
  now: number
  isTv: boolean
  t: ReturnType<typeof useText>
  onPlay(id: string): void
  onClose(): void
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow
}

const noop = () => {}

export function GuideOverlay({ channels, currentId, now, isTv, t, onPlay, onClose }: GuideOverlayProps) {
  const narrow = useNarrow() && !isTv
  const [selectedId, setSelectedId] = useState(currentId)
  const [shift, setShift] = useState(0)
  const shiftRef = useRef(0)
  const win = useMemo(() => guideWindow(now + shift * HALF_HOUR), [now, shift])
  const onShift = useCallback((dir: -1 | 1) => {
    const next = Math.min(MAX_SHIFT, Math.max(0, shiftRef.current + dir))
    if (next === shiftRef.current) return dir === 1
    shiftRef.current = next
    setShift(next)
    return true
  }, [])
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Aktuell kanal i bild (och i fokus på TV) när tablån öppnas.
  useEffect(() => {
    const rows = rootRef.current ? Array.from(rootRef.current.querySelectorAll<HTMLElement>('[data-channel-row]')) : []
    const row = rows.find((r) => r.getAttribute('data-channel-row') === currentId)
    if (!row) return
    row.scrollIntoView?.({ block: 'center' })
    if (isTv) row.focus({ preventScroll: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={rootRef}
      data-channels-guide-overlay=""
      data-panel-root={isTv ? '1' : undefined}
      style={{ position: 'absolute', inset: 0, zIndex: 58, pointerEvents: 'auto', fontFamily: FONT.ui, color: C.text }}
    >
      {/* Tryck utanför panelen stänger; videon syns igenom. */}
      <div aria-hidden="true" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      <div
        role="dialog"
        aria-label={t('playerGuide')}
        style={{
          // Hela vägen ner och kant i kant (Jerry 2026-10-17): tablån täcker
          // spelarens kontroller i stället för att sväva ovanför dem.
          position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingBottom: 'var(--android-inset-bottom, 0px)',
          // TV: scenens höjd, inte fönstrets (vh i TV-scenen är den riktiga viewporten).
          maxHeight: narrow ? '75vh' : isTv ? 'calc(var(--tv-vp-h, 100vh) * 0.72)' : '72vh', display: 'flex', flexDirection: 'column',
          borderRadius: `${RADIUS.osd}px ${RADIUS.osd}px 0 0`,
          // Tät nog att spelarens tidslinje inte lyser igenom.
          ...glass(isTv, { fill: 'rgba(12,12,16,0.97)', blur: 16 }),
          borderBottom: 'none', borderLeft: 'none', borderRight: 'none',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: narrow ? '0.75rem 1rem' : '0.85rem 1.1rem' }}>
          <span style={{ fontSize: fontSize(11, isTv), letterSpacing: '0.22em', fontWeight: 700, color: C.textSoft }}>{t('playerGuide')}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: fontSize(12, isTv), color: C.accent }}>{formatClock(now)}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: fontSize(12, isTv), color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {narrow ? null : t('guideOverlayHint')}
          </span>
          <button
            type="button"
            data-f=""
            onClick={onClose}
            style={{
              minHeight: isTv ? '2.5rem' : '2rem', padding: isTv ? '0 1rem' : '0 0.85rem', borderRadius: RADIUS.pill,
              ...glass(isTv, { fill: C.pillBg, blur: 0 }), color: C.text, fontFamily: FONT.ui,
              fontSize: isTv ? tvType('body') : '0.75rem', fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer',
            }}
          >
            {t('playerClose')}
          </button>
        </div>
        <div style={{ overflowY: 'auto', overflowX: narrow ? 'hidden' : 'visible', padding: narrow ? '0 0 1rem' : '0 0.6rem 0.8rem' }}>
          <ChannelGuide
            channels={channels}
            selectedId={selectedId}
            window={win}
            now={now}
            isTv={isTv}
            isMobile={narrow}
            t={t}
            compact
            initId={currentId}
            onSelect={setSelectedId}
            onPlay={onPlay}
            onRundown={noop}
            onShift={onShift}
          />
        </div>
      </div>
    </div>
  )
}
