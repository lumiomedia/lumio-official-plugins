'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'

export const TV_SETTINGS_KEY = 'live_tv_tv_settings_v1'
export const GUIDE_MODE_KEY = 'live_tv_guide_mode_v1'
export const ACTIVE_PLAYLIST_KEY = 'live_tv_active_playlist_v1'

export const BANNER_HIDE_OPTIONS = [2000, 4000, 6000, 0] as const
export type BannerHideMs = (typeof BANNER_HIDE_OPTIONS)[number]

/** Zoomsteg i Timeline-vyn (den städade guiden, skrivbord/TV). */
export type TimelineZoom = '2h' | '6h' | 'day'
const TIMELINE_ZOOMS: TimelineZoom[] = ['2h', '6h', 'day']

export interface TvSettings {
  previewEnabled: boolean
  startOnLastChannel: boolean
  numericZap: boolean
  bannerHideMs: BannerHideMs
  /** Telefon (fas 3): håll skärmen vaken medan spelaren är öppen. */
  keepAwake: boolean
  /** Telefon (fas 3): rotation till liggande öppnar fullskärm. */
  fullscreenOnRotate: boolean
  /** Den städade guiden (skrivbord/TV): senast valda kategori i kontrollraden. */
  guideCategory: string | null
  /** Den städade guiden: zoomsteget i Timeline-vyn. */
  timelineZoom: TimelineZoom
  /** Den städade guiden: infobannern i Now/Next-vyn av/på. */
  nowNextDetails: boolean
}

const DEFAULTS: TvSettings = {
  previewEnabled: true,
  startOnLastChannel: false,
  numericZap: true,
  bannerHideMs: 4000,
  keepAwake: true,
  fullscreenOnRotate: true,
  guideCategory: null,
  timelineZoom: 'day',
  nowNextDetails: true,
}

function sanitize(raw: unknown): TvSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof TvSettings, unknown>>
  const banner = (BANNER_HIDE_OPTIONS as readonly number[]).includes(r.bannerHideMs as number) ? (r.bannerHideMs as BannerHideMs) : DEFAULTS.bannerHideMs
  const timelineZoom = TIMELINE_ZOOMS.includes(r.timelineZoom as TimelineZoom) ? (r.timelineZoom as TimelineZoom) : DEFAULTS.timelineZoom
  return {
    previewEnabled: typeof r.previewEnabled === 'boolean' ? r.previewEnabled : DEFAULTS.previewEnabled,
    startOnLastChannel: typeof r.startOnLastChannel === 'boolean' ? r.startOnLastChannel : DEFAULTS.startOnLastChannel,
    numericZap: typeof r.numericZap === 'boolean' ? r.numericZap : DEFAULTS.numericZap,
    bannerHideMs: banner,
    keepAwake: typeof r.keepAwake === 'boolean' ? r.keepAwake : DEFAULTS.keepAwake,
    fullscreenOnRotate: typeof r.fullscreenOnRotate === 'boolean' ? r.fullscreenOnRotate : DEFAULTS.fullscreenOnRotate,
    guideCategory: typeof r.guideCategory === 'string' && r.guideCategory ? r.guideCategory : DEFAULTS.guideCategory,
    timelineZoom,
    nowNextDetails: typeof r.nowNextDetails === 'boolean' ? r.nowNextDetails : DEFAULTS.nowNextDetails,
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
 *
 * `'nownext'` och `'timeline'` är den städade guidens (skrivbord/TV) egna
 * lägen (spec "Beslut", Lägen). De gamla `'now'`/`'tl'`/`'playlists'` lever
 * kvar eftersom LAN/fjärr och telefonen fortsätter skriva dem — normalisering
 * mellan uppsättningarna sker vid LÄSNING i `guide-surface.ts` (skrivbord/TV)
 * respektive `mobile/guide-phone.ts` (telefon), inte här.
 */
export type GuideMode = 'now' | 'tl' | 'playlists' | 'grid' | 'nownext' | 'timeline'
const GUIDE_MODES: GuideMode[] = ['now', 'tl', 'playlists', 'grid', 'nownext', 'timeline']
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
