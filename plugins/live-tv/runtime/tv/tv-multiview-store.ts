'use client'

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'

export const MULTIVIEW_KEY = 'live_tv_multiview_v1'
export type MultiviewLayout = 2 | 3 | 4
export interface MultiviewState {
  layout: MultiviewLayout
  /** channelKey per ruta, null = tom. Längd = tileCount(layout). */
  tiles: (string | null)[]
  audioIndex: number
}

export function tileCount(layout: MultiviewLayout): number {
  return layout
}

const DEFAULT_STATE: MultiviewState = { layout: 4, tiles: [null, null, null, null], audioIndex: 0 }

function normalize(state: MultiviewState): MultiviewState {
  const count = tileCount(state.layout)
  const tiles = Array.from({ length: count }, (_, i) => state.tiles[i] ?? null)
  let audioIndex = state.audioIndex
  if (audioIndex < 0 || audioIndex >= count || tiles[audioIndex] === null) {
    const first = tiles.findIndex((t) => t !== null)
    audioIndex = first === -1 ? 0 : first
  }
  return { layout: state.layout, tiles, audioIndex }
}

function sanitize(raw: unknown): MultiviewState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<MultiviewState>
  const layout: MultiviewLayout = r.layout === 2 || r.layout === 3 || r.layout === 4 ? r.layout : 4
  const tiles = Array.isArray(r.tiles) ? r.tiles.map((t) => (typeof t === 'string' && t ? t : null)) : []
  return normalize({ layout, tiles, audioIndex: typeof r.audioIndex === 'number' ? r.audioIndex : 0 })
}

export function getMultiviewState(): MultiviewState {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, DEFAULT_STATE))
}
export function setMultiviewState(next: MultiviewState): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, normalize(next))
}
export function useMultiviewState(): MultiviewState {
  const [value, setValue] = useState(getMultiviewState)
  useEffect(() => onPluginStorageChanged(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, () => setValue(getMultiviewState())), [])
  return value
}

export function assignTile(state: MultiviewState, index: number, key: string): MultiviewState {
  const tiles = [...state.tiles]
  tiles[index] = key
  const hadAny = state.tiles.some((t) => t !== null)
  return normalize({ ...state, tiles, audioIndex: hadAny ? state.audioIndex : index })
}
export function removeTile(state: MultiviewState, index: number): MultiviewState {
  const tiles = [...state.tiles]
  tiles[index] = null
  return normalize({ ...state, tiles })
}
export function setLayout(state: MultiviewState, layout: MultiviewLayout): MultiviewState {
  const filled = state.tiles.filter((t): t is string => t !== null)
  const audioKey = state.tiles[state.audioIndex]
  const tiles = filled.slice(0, tileCount(layout))
  const audioIndex = audioKey ? Math.max(0, tiles.indexOf(audioKey)) : 0
  return normalize({ layout, tiles, audioIndex })
}
/** Förstora: layout 1+2 med rutan först; övriga tilldelade följer i ordning. */
export function enlargeTile(state: MultiviewState, index: number): MultiviewState {
  const key = state.tiles[index]
  const rest = state.tiles.filter((t, i): t is string => t !== null && i !== index)
  const tiles = key ? [key, ...rest] : rest
  return normalize({ layout: 3, tiles, audioIndex: key ? 0 : state.audioIndex })
}
export function addToFirstFree(state: MultiviewState, key: string): MultiviewState {
  const free = state.tiles.findIndex((t) => t === null)
  return assignTile(state, free === -1 ? state.tiles.length - 1 : free, key)
}
