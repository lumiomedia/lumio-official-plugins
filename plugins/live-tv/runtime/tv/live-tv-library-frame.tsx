import { useEffect, useRef } from 'react'
import type { LibraryFrameProps } from '@/lib/plugin-sdk'
import { TvRail, type RailKey } from './tv-rail'
import { MobileTabBar } from './mobile/mobile-tab-bar'
import { useTvSettings } from './tv-settings-store'
import { useNarrowSurface } from '../hooks/useNarrowSurface'
import { TV } from './tv-ui'
import { LIVE_TV_BROWSE_PAGE_ID } from '../live-tv-shell'
import { useLiveTvModel } from '../live-tv-model'
import { useVodCategories } from '../hooks/useVodLibrary'
import { getVodMode } from '../vod-data'

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
  // Samma villkor som tv-shell.tsx: flikraden ska vara identisk med den inne i Live TV.
  const model = useLiveTvModel()
  const vodCats = useVodCategories(phone ? model.activeSource : null)
  const showLibraryTab = phone && vodCats.total > 0 && getVodMode(model.activePlaylistId) !== 'off'
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

  if (phone) {
    // "Mer" går till Multiview-vyn: arket hör till Live TV-sidan.
    return <MobileTabBar view="hub" activeOverride="home" showLibrary={showLibraryTab} onGo={select} onMore={() => select('multi')} />
  }
  return (
    <div ref={rootRef} style={{ height: '100%', display: 'flex', background: TV.bg, color: TV.text, fontFamily: TV.font }}>
      <TvRail active="home" isTv={isTv} narrow={narrow} labels={settings.railLabels && !narrow} onSelect={select} />
    </div>
  )
}
