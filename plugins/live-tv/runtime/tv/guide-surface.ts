'use client'

import * as sdk from '@/lib/plugin-sdk'
import type { GuideMode } from './tv-settings-store'

/**
 * Skrivbordsappen (Tauri). Läses defensivt: äldre värdar saknar exportet
 * helt, och stubben i test byter ut den bakomliggande flaggan dynamiskt
 * (`__setDesktopTauriEnvForTests`) — ett direkt destrukturerat import hade
 * fryst det ursprungliga värdet vid modulladdning.
 */
export function isDesktopTauri(): boolean {
  // Dev-genväg: `?desktopguide=1` i en webbläsare (Vite :5173) låtsas vara
  // skrivbordsappen så den nya guiden kan granskas live utan DMG-bygge.
  // Läses defensivt — ingen `location` i SSR/test.
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('desktopguide')) return true
  return (sdk as { isDesktopTauriEnv?: boolean }).isDesktopTauriEnv === true
}

/**
 * Ytgrinden (spec "Beslut", Var): den städade guiden gäller TV-läget OCH
 * skrivbordsappen — INTE telefonen (fas 3 rörs inte) och inte LAN/fjärr-
 * webbklienter, som saknar `isDesktopTauriEnv`.
 */
export function useNewGuideSurface(phone: boolean): boolean {
  return sdk.useTvMode() || (isDesktopTauri() && !phone)
}

/** Guide v2:s tre lägen (handoff `design_handoff_live_tv 2`): Nu/Sen · Tablå · Kanallista. */
export type DesktopGuideMode = 'now' | 'tl' | 'list'

/**
 * Normalisering per yta vid LÄSNING: lagringen delas med telefonen och LAN,
 * och äldre versioner skrev Grid / Now/Next / Timeline / Spellistor. Ingen
 * migrering skrivs — bara hur ett läst värde tolkas.
 */
export function desktopGuideMode(stored: GuideMode): DesktopGuideMode {
  if (stored === 'now' || stored === 'nownext') return 'now'
  if (stored === 'playlists' || stored === 'list') return 'list'
  return 'tl'
}
