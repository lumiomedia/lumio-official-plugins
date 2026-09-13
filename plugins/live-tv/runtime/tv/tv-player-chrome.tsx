'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getTvGlassMenu, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { formatClock, progressOf } from '../live-tv-ui'
import type { LiveTvPlayerTvProps } from './tv-player-types'
import { Icons, Progress, RoundBtn, Tag, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'

export function TvPlayerChrome({ channel, tv, paused, onTogglePause, onClose }: { channel: M3uChannel; tv: LiveTvPlayerTvProps; paused: boolean; onTogglePause: () => void; onClose: () => void }) {
  const { tt } = useTvText()
  const clock = useTvClockNode(tv.locale)
  const [visible, setVisible] = useState(true)
  const [miniOpen, setMiniOpen] = useState(false)
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const timerRef = useRef<number | null>(null)
  const dotsRef = useRef<HTMLDivElement | null>(null)
  const miniRef = useRef<HTMLDivElement | null>(null)
  const TvGlassMenu = getTvGlassMenu()
  const info = tv.nowFor(channel)
  // 0 = dölj aldrig (LiveTvPlayerTvProps-kommentaren). Ingen egen tröskel
  // ovanpå inställningen — README §9 anger just "4 s (inställning)", inget
  // golv.
  const hideMs = tv.bannerHideMs

  const reveal = useCallback(() => {
    setVisible(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    if (hideMs > 0 && !miniOpen && !menu) timerRef.current = window.setTimeout(() => setVisible(false), hideMs)
  }, [hideMs, miniOpen, menu])
  useEffect(() => { reveal(); return () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current) } }, [reveal, channel])

  const index = tv.neighbours.findIndex((c) => channelKey(c) === channelKey(channel))
  const step = useCallback((delta: 1 | -1) => {
    if (tv.neighbours.length === 0) return
    const next = tv.neighbours[(index + delta + tv.neighbours.length) % tv.neighbours.length]
    if (next) tv.onSwitchChannel(next)
  }, [tv, index])

  // Tangenter: ▲ visar bannern, ▾ öppnar mini-guiden, ChannelUp/Down zappar.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (menu) return
      if (event.key === 'ChannelUp' || event.key === 'PageUp') { event.preventDefault(); event.stopPropagation(); step(1); return }
      if (event.key === 'ChannelDown' || event.key === 'PageDown') { event.preventDefault(); event.stopPropagation(); step(-1); return }
      if (event.key === 'ArrowDown' && !miniOpen) { event.preventDefault(); event.stopPropagation(); setMiniOpen(true); reveal(); return }
      if (event.key === 'ArrowUp' && !miniOpen) { event.preventDefault(); event.stopPropagation(); reveal(); return }
      if ((event.key === 'Escape' || event.key === 'Backspace') && miniOpen) { event.preventDefault(); event.stopPropagation(); setMiniOpen(false); window.setTimeout(() => dotsRef.current?.focus({ preventScroll: true }), 0); return }
      if (event.key.startsWith('Arrow') || event.key === 'Enter') reveal()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, miniOpen, step, reveal])

  useEffect(() => {
    if (!miniOpen) return
    const current = miniRef.current?.querySelector<HTMLElement>('[data-init]')
    current?.focus({ preventScroll: true })
    current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [miniOpen])

  const openMenu = (element: HTMLElement) => {
    setMenu({
      title: `${channel.name}${info.now ? ` · ${info.now.title}` : ''}`,
      element,
      actions: [
        { key: 'guide', label: tt('menuGuide'), run: () => setMiniOpen(true) },
        { key: 'multi', label: tt('menuMultiview'), run: tv.onOpenMultiview },
        { key: 'pause', label: paused ? tt('menuResume') : tt('menuPause'), run: onTogglePause },
        { key: 'fav', label: tv.favourite ? tt('menuRemoveFavourite') : tt('menuAddFavourite'), run: tv.onToggleFavourite },
        { key: 'info', label: tt('menuChannelDetails'), run: tv.onOpenChannelDetails },
      ],
    })
  }

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: `${dp(36)}px ${dp(48)}px`, display: 'flex', alignItems: 'center', gap: dp(16), opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none', zIndex: 30 }}>
        <RoundBtn {...station(onClose)} background="rgba(252,252,255,0.12)"><Icons.ChevronLeft /></RoundBtn>
        <span style={{ fontSize: dp(20), color: 'rgba(243,244,248,0.75)' }}>{tv.channelNumber ? `${tv.channelNumber} · ` : ''}{channel.name}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: dp(14), fontSize: dp(17) }}>
          {info.now ? <Tag variant="live">{tt('live')}</Tag> : null}
          {tv.quality ? <span style={{ color: 'rgba(243,244,248,0.75)' }}>{tv.quality}</span> : null}
          {clock}
        </span>
      </div>
      <div data-testid="banner" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: dp(48), paddingTop: dp(120), background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.92) 55%)', display: 'flex', alignItems: 'flex-end', gap: dp(24), opacity: visible ? 1 : 0, transition: 'opacity 200ms', pointerEvents: visible ? 'auto' : 'none', zIndex: 30 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          <div style={{ fontSize: dp(44), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? channel.name}</div>
          {info.now ? (
            <>
              <div style={{ fontSize: dp(20), color: 'rgba(243,244,248,0.7)' }}>
                {`${formatClock(info.now.start, tv.locale)}–${formatClock(info.now.stop, tv.locale)} · ${tt('minutesLeft', { min: Math.max(0, Math.round((info.now.stop - tv.nowMs) / 60_000)) })}`}
                {info.next ? <> · <span style={{ color: TV.accText }}>{tt('nextLabel')}</span> {info.next.title}</> : null}
              </div>
              <Progress value={progressOf(info.now.start, info.now.stop, tv.nowMs)} height={dp(6)} style={{ maxWidth: dp(900) }} />
            </>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(16), flexShrink: 0 }}>
          <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.45)' }}>{tt('playerHelp')}</span>
          <div ref={dotsRef} {...station(() => dotsRef.current && openMenu(dotsRef.current), (el) => openMenu(el), { 'data-init': '', 'aria-label': tt('moreActions') })} style={{ width: dp(52), height: dp(52), borderRadius: 999, background: 'rgba(252,252,255,0.10)', border: `1px solid ${TV.lineCard}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icons.Dots /></div>
        </div>
      </div>
      {miniOpen ? (
        <div ref={miniRef} data-panel-root="" data-row="" data-live-tv-layer="" style={{ position: 'absolute', left: 0, right: 0, bottom: dp(200), padding: `0 ${dp(48)}px`, display: 'flex', gap: dp(14), overflowX: 'auto', zIndex: 31 }}>
          {tv.neighbours.map((c) => {
            const n = tv.nowFor(c)
            const current = channelKey(c) === channelKey(channel)
            return (
              <div key={channelKey(c)} data-testid="mini-card" {...station(() => { setMiniOpen(false); tv.onSwitchChannel(c) }, (el) => setMenu({ title: c.name, element: el, actions: [{ key: 'multi', label: tt('menuAddMultiview'), run: () => tv.onAddToMultiview(c) }] }), current ? { 'data-init': '' } : undefined)} style={{ width: dp(330), height: dp(118), flexShrink: 0, borderRadius: dp(14), padding: `${dp(14)}px ${dp(16)}px`, background: current ? TV.s16 : 'rgba(20,22,30,0.85)', display: 'flex', flexDirection: 'column', gap: dp(6), cursor: 'pointer', boxSizing: 'border-box' }}>
                <div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.55)' }}>{c.name}</div>
                <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.now?.title ?? tt('noProgramme')}</div>
                {n.next ? <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tt('nextLabel')}: {n.next.title}</div> : null}
                {n.now ? <Progress value={progressOf(n.now.start, n.now.stop, tv.nowMs)} height={dp(4)} /> : null}
              </div>
            )
          })}
        </div>
      ) : null}
      {TvGlassMenu && menu ? <TvGlassMenu target={menu} onClose={() => { setMenu(null); reveal() }} /> : null}
    </>
  )
}
