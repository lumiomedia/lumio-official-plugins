'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'

export const TV_SETTINGS_KEY = 'live_tv_tv_settings_v1'
export const GUIDE_MODE_KEY = 'live_tv_guide_mode_v1'
export const ACTIVE_PLAYLIST_KEY = 'live_tv_active_playlist_v1'

export const BANNER_HIDE_OPTIONS = [2000, 4000, 6000, 0] as const
export type BannerHideMs = (typeof BANNER_HIDE_OPTIONS)[number]

export interface TvSettings {
  previewEnabled: boolean
  startOnLastChannel: boolean
  numericZap: boolean
  bannerHideMs: BannerHideMs
}

const DEFAULTS: TvSettings = { previewEnabled: true, startOnLastChannel: false, numericZap: true, bannerHideMs: 4000 }

function sanitize(raw: unknown): TvSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof TvSettings, unknown>>
  const banner = (BANNER_HIDE_OPTIONS as readonly number[]).includes(r.bannerHideMs as number) ? (r.bannerHideMs as BannerHideMs) : DEFAULTS.bannerHideMs
  return {
    previewEnabled: typeof r.previewEnabled === 'boolean' ? r.previewEnabled : DEFAULTS.previewEnabled,
    startOnLastChannel: typeof r.startOnLastChannel === 'boolean' ? r.startOnLastChannel : DEFAULTS.startOnLastChannel,
    numericZap: typeof r.numericZap === 'boolean' ? r.numericZap : DEFAULTS.numericZap,
    bannerHideMs: banner,
  }
}

export function getTvSettings(): TvSettings {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, DEFAULTS))
}
export function setTvSettings(patch: Partial<TvSettings>): TvSettings {
  const next = sanitize({ ...getTvSettings(), ...patch })
  writePluginJson(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, next)
  return next
}
export function useTvSettings(): TvSettings {
  const [value, setValue] = useState(getTvSettings)
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, TV_SETTINGS_KEY, () => setValue(getTvSettings())), [])
  return value
}

/**
 * Guidens lägen. `'grid'` är skrivbordets tablå porterad till TV-trädet
 * (`tv-guide-grid.tsx`, spec 4.3) och ligger SIST i listan: ordningen här styr
 * inget i gränssnittet, men en sparad nyckel som inte finns i listan faller
 * tillbaka till `'now'` — därför måste varje nytt läge läggas till här, inte
 * bara i segmentväxeln.
 */
export type GuideMode = 'now' | 'tl' | 'playlists' | 'grid'
const GUIDE_MODES: GuideMode[] = ['now', 'tl', 'playlists', 'grid']
export function getGuideMode(): GuideMode {
  const raw = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, 'now')
  return GUIDE_MODES.includes(raw as GuideMode) ? (raw as GuideMode) : 'now'
}
export function setGuideMode(mode: GuideMode): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, mode)
}
export function useGuideMode(): GuideMode {
  const [value, setValue] = useState(getGuideMode)
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, GUIDE_MODE_KEY, () => setValue(getGuideMode())), [])
  return value
}

export function getActivePlaylistId(): string | null {
  const raw = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, null)
  return typeof raw === 'string' && raw ? raw : null
}
export function setActivePlaylistId(id: string | null): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, id)
}
export function onActivePlaylistChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, ACTIVE_PLAYLIST_KEY, listener)
}
