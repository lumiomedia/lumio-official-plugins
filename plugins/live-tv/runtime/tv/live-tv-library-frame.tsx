import { useEffect, useRef, useState } from 'react'
import { useTvMode, type LibraryFrameProps } from '@/lib/plugin-sdk'
import { TvRail, type RailKey } from './tv-rail'
import { MobileCloseButton } from './mobile/mobile-header'
import { MT } from './mobile/mobile-tokens'
import { MobileTabBar } from './mobile/mobile-tab-bar'
import { getActivePlaylistId, useTvSettings } from './tv-settings-store'
import { useNarrowSurface } from '../hooks/useNarrowSurface'
import { TV } from './tv-ui'
import { LIVE_TV_BROWSE_PAGE_ID } from '../live-tv-shell'
import { getLiveTvLists } from '../live-tv-data'
import { listVodCategories } from '../vod-client'
import { getVodMode } from '../vod-data'
import { isDesktopTauri } from './guide-surface'

const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])

/**
 * Telefonens flikrad med samma Bibliotek-villkor som tv-shell.tsx (VOD-kategorier
 * finns och läget är inte `off`) — men utan att montera hela modellen: det
 * hade dragit in kanal-/EPG-laddning i en ram som ligger ovanpå uppspelningsstart.
 * Aktiv källa läses ur lagringen precis som modellen gör, ett enda anrop, ingen polling.
 * Monteras bara på telefon.
 */
function PhoneTabBar({ select, onInsetBottom }: { select: (key: RailKey | 'hub' | 'guide' | 'sport' | 'search' | 'library' | 'home') => void; onInsetBottom?: (px: number) => void }) {
  const tvMode = useTvMode()
  const [showLibrary, setShowLibrary] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  /*
    Flikradens höjd (rad + säkerhetsmarginal) till värden, så hemmet och
    detaljsidan slutar ovanför den och raden syns hela tiden. Mäts på själva
    <nav>:en; 0 när ramen avmonteras. Valfri i SDK:t (app före 0.1.624).
  */
  useEffect(() => {
    if (!onInsetBottom) return
    const nav = wrapRef.current?.querySelector<HTMLElement>('[data-testid="mobile-tab-bar"]')
    if (!nav) return
    const report = () => onInsetBottom(nav.getBoundingClientRect().height)
    report()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null
    observer?.observe(nav)
    return () => { observer?.disconnect(); onInsetBottom(0) }
  }, [onInsetBottom])
  useEffect(() => {
    let cancelled = false
    const playlistId = getActivePlaylistId()
    const source = tvMode || isDesktopTauri() ? getLiveTvLists().find((list) => list.id === playlistId)?.source ?? null : null
    if (getVodMode(playlistId) === 'off') return
    listVodCategories(source)
      .then((result) => { if (!cancelled) setShowLibrary(result.total > 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [tvMode])
  // "Mer" går till Multiview-vyn: arket hör till Live TV-sidan.
  return (
    <div ref={wrapRef}>
      <MobileTabBar view="hub" activeOverride="home" showLibrary={showLibrary} onGo={select} onMore={() => select('multi')} />
    </div>
  )
}

/**
 * Live TV:s räls runt appens VOD-hem (spec 2026-10-10). Samma `TvRail` som
 * inne i Live TV, med Hem aktivt; övriga poster går in i Live TV-sidan.
 * Värden ritar oss i en skalad låda (data-tv-scene-box="frame"), så
 * narrow-mätningen och designpixlarna är desamma som i sidans egen låda.
 * Ramen lindar sig inte i någon egen scenlåda.
 */
export function LiveTvLibraryFrame({ platform, onNavigate, onExit, onInset, onInsetBottom }: LibraryFrameProps) {
  const settings = useTvSettings()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const isTv = platform === 'tv'
  const phone = platform === 'phone'
  const narrow = useNarrowSurface(rootRef) && !isTv
  const select = (key: RailKey | 'hub' | 'guide' | 'sport' | 'search' | 'library' | 'home') => {
    if (key === 'back') { onExit(); return }
    if (key === 'home') return
    onNavigate({ pageId: LIVE_TV_BROWSE_PAGE_ID, params: { view: key } })
  }

  useEffect(() => {
    if (phone) { onInset(0); return }
    const el = rootRef.current
    if (!el) return
    // Skalad bredd (skärmpixlar) — det värdens inset vill ha.
    const report = () => onInset(el.getBoundingClientRect().width)
    report()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [phone, onInset])

  // Bakåt på rälsen lämnar Live TV. Värdens fokusmotor tar annars Back för
  // [data-col="side"] och skickar den till bläddringsbakåt (gör inget på VOD-hemmet).
  // Capture-fas på window, som tv-shell.tsx, så vi hinner före motorn. Bara när
  // trycket kommer inifrån ramen — står fokus i hemmets innehåll äger värden Back.
  useEffect(() => {
    if (phone) return
    const onKey = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key)) return
      const el = rootRef.current
      const target = event.target as Node | null
      if (!el || !target || !el.contains(target)) return
      event.preventDefault()
      event.stopPropagation()
      onExit()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [phone, onExit])

  if (phone) {
    // Samma X som på Kanaler, på samma plats (sidluft PAD, 6 px under systemradens inset = mitt i en 52 px hög rad).
    return (
      <>
        <div data-testid="frame-exit" style={{ position: 'fixed', top: `calc(${MT.SAFE_TOP_GUARD} + 6px)`, left: MT.PAD, zIndex: 51 }}>
          <MobileCloseButton onClose={onExit} />
        </div>
        <PhoneTabBar select={select} onInsetBottom={onInsetBottom} />
      </>
    )
  }
  return (
    <div ref={rootRef} style={{ height: '100%', display: 'flex', background: TV.bg, color: TV.text, fontFamily: TV.font }}>
      <TvRail active="home" isTv={isTv} narrow={narrow} labels={settings.railLabels && !narrow} onSelect={select} />
    </div>
  )
}
