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

/** De tre lägena i den städade guiden (spec "Beslut", Lägen). */
export type DesktopGuideMode = 'grid' | 'nownext' | 'timeline'

/**
 * Normalisering per yta vid LÄSNING (spec "Beslut", Lagring): skrivbord/TV
 * slår ihop det gamla Nu/Sen-läget och tablåraden till ett enda Now/Next-
 * läge, och den gamla Spellistor-sidan till Rutnätet (källväljaren ersätter
 * den). Ingen migrering skrivs — bara hur ett läst värde tolkas.
 */
export function desktopGuideMode(stored: GuideMode): DesktopGuideMode {
  if (stored === 'now' || stored === 'tl') return 'nownext'
  if (stored === 'playlists') return 'grid'
  if (stored === 'grid') return 'grid'
  return stored
}
