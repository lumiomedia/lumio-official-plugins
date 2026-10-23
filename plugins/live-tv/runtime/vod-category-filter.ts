'use client'

/**
 * VILKA FILM- OCH SERIEKATEGORIER SOM TAS MED — per källa (spellista).
 *
 * Testare 2026-10-23: "välja vilka VOD-kategorier som ska tas med — eller
 * uteslutas — innan skanningen börjar". Värden hämtar fortfarande hela
 * katalogen (fyra anrop, se xtream_vod.rs); det som styrs härifrån är allt
 * pluginet äger: bibliotekssvepet, Bibliotek-vyn, sökningen och om svepet
 * får börja alls.
 *
 * Lagras som UTESLUTNA kategorinycklar (id + namn, se `vodCategoryKey`): en kategori som panelen lägger till
 * senare är med tills man väljer bort den, samma som "alla" betyder i dag.
 *
 * `decided` skiljer "valt att ta med allt" från "inte valt än". En ny källa
 * väntar på valet innan det automatiska svepet startar. Källor som fanns före
 * den här versionen räknas som valda (migreringen nedan) — för dem ändras
 * ingenting.
 */

import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'
import type { VodItem } from './vod-client'

const FILTER_KEY = 'vod_category_filter_v1'
const MIGRATED_KEY = 'vod_category_filter_migrated_v1'

export interface VodCategoryChoice {
  excluded: string[]
  decided: boolean
}

type ChoiceMap = Record<string, VodCategoryChoice>

function readMap(): ChoiceMap {
  const parsed = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, FILTER_KEY, {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out: ChoiceMap = {}
  for (const [source, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const entry = value as { excluded?: unknown; decided?: unknown }
    out[source] = {
      excluded: Array.isArray(entry.excluded) ? entry.excluded.filter((id): id is string => typeof id === 'string' && id !== '') : [],
      decided: entry.decided === true,
    }
  }
  return out
}

function writeMap(map: ChoiceMap): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, FILTER_KEY, map)
}

export function getVodCategoryChoice(source: string): VodCategoryChoice {
  return readMap()[source] ?? { excluded: [], decided: false }
}

/** Har användaren valt för källan (eller fanns den före funktionen)? */
export function isVodChoiceMade(source: string): boolean {
  return getVodCategoryChoice(source).decided
}

/**
 * Uteslutna kategori-id:n. `null` = alla källor: unionen av allas val —
 * Bibliotek-vyn utan aktiv spellista visar hela indexet, och en kategori som
 * valts bort ska inte dyka upp där heller.
 */
export function getVodExcluded(source: string | null): Set<string> {
  const map = readMap()
  if (source) return new Set(map[source]?.excluded ?? [])
  return new Set(Object.values(map).flatMap((entry) => entry.excluded))
}

export function setVodCategoryChoice(source: string, excluded: readonly string[]): void {
  const map = readMap()
  map[source] = { excluded: [...new Set(excluded)], decided: true }
  writeMap(map)
}

export function onVodCategoryChoiceChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, FILTER_KEY, listener)
}

/** Omrenderas när valet ändras. */
export function useVodExcluded(source: string | null): Set<string> {
  const [excluded, setExcluded] = useState(() => getVodExcluded(source))
  useEffect(() => {
    setExcluded(getVodExcluded(source))
    return onVodCategoryChoiceChanged(() => setExcluded(getVodExcluded(source)))
  }, [source])
  return excluded
}

/**
 * Väntar källan på ett val? Aldrig före migreringen — då vet vi inte om
 * källan är ny eller fanns före funktionen.
 */
export function useVodChoiceMade(source: string | null): boolean {
  const read = () => (source ? !isVodChoiceMigrated() || isVodChoiceMade(source) : true)
  const [made, setMade] = useState(read)
  useEffect(() => {
    setMade(read())
    return onVodCategoryChoiceChanged(() => setMade(read()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])
  return made
}

/**
 * En kategori identifieras av id OCH namn. Xtreams id:n är små tal per panel:
 * utan namnet hade "12" som valts bort i en spellista (Vuxen) dolt en annan
 * spellistas "12" (Action) i vyn som spänner alla spellistor — titlarna bär
 * ingen källa att skilja dem på.
 */
export function vodCategoryKey(id: string, name: string): string {
  return `${id}\u0001${name}`
}

export function isVodItemIncluded(item: Pick<VodItem, 'categoryId' | 'categoryName'>, excluded: ReadonlySet<string>): boolean {
  return excluded.size === 0 || !excluded.has(vodCategoryKey(item.categoryId, item.categoryName))
}

/**
 * Engångsmigrering: varje källa som redan finns i VOD-indexet räknas som
 * vald med allt medtaget. Utan den hade alla befintliga användare plötsligt
 * fått frågan och ett pausat svep. Flaggan sätts bara när statusfrågan gick
 * igenom — ett fel provas igen nästa gång.
 */
export async function ensureVodChoiceMigrated(listSources: () => Promise<{ id: string }[]>): Promise<void> {
  if (readPluginJson<boolean>(LIVE_TV_PLUGIN_ID, MIGRATED_KEY, false)) return
  const sources = await listSources()
  const map = readMap()
  for (const source of sources) {
    if (!map[source.id]) map[source.id] = { excluded: [], decided: true }
  }
  writeMap(map)
  writePluginJson(LIVE_TV_PLUGIN_ID, MIGRATED_KEY, true)
}

export function isVodChoiceMigrated(): boolean {
  return readPluginJson<boolean>(LIVE_TV_PLUGIN_ID, MIGRATED_KEY, false)
}

/** Bara för tester. */
export function resetVodCategoryChoiceForTests(): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, FILTER_KEY, {}, { emitChange: false })
  writePluginJson(LIVE_TV_PLUGIN_ID, MIGRATED_KEY, false, { emitChange: false })
}
