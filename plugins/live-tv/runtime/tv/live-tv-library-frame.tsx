import { useEffect, useRef, useState } from 'react'
import { useTvMode, type LibraryFrameProps } from '@/lib/plugin-sdk'
import { TvRail, type RailKey } from './tv-rail'
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
function PhoneTabBar({ select }: { select: (key: RailKey | 'hub' | 'guide' | 'favs' | 'search' | 'library' | 'home') => void }) {
  const tvMode = useTvMode()
  const [showLibrary, setShowLibrary] = useState(false)
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
  return <MobileTabBar view="hub" activeOverride="home" showLibrary={showLibrary} onGo={select} onMore={() => select('multi')} />
}

/**
 * Live TV:s räls runt appens VOD-hem (spec 2026-10-10). Samma `TvRail` som
 * inne i Live TV, med Hem aktivt; övriga poster går in i Live TV-sidan.
 * Värden ritar oss i en skalad låda (data-tv-scene-box="frame"), så
 * narrow-mätningen och designpixlarna är desamma som i sidans egen låda.
 * Ramen lindar sig inte i någon egen scenlåda.
 */
export function LiveTvLibraryFrame({ platform, onNavigate, onExit, onInset }: LibraryFrameProps) {
  const settings = useTvSettings()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const isTv = platform === 'tv'
  const phone = platform === 'phone'
  const narrow = useNarrowSurface(rootRef) && !isTv
  const select = (key: RailKey | 'hub' | 'guide' | 'favs' | 'search' | 'library' | 'home') => {
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
    return <PhoneTabBar select={select} />
  }
  return (
    <div ref={rootRef} style={{ height: '100%', display: 'flex', background: TV.bg, color: TV.text, fontFamily: TV.font }}>
      <TvRail active="home" isTv={isTv} narrow={narrow} labels={settings.railLabels && !narrow} onSelect={select} />
    </div>
  )
}
