/**
 * Verkliga fillängder per post. Tablåns längd kommer från TMDb och kan vara
 * längre än filen (Simpsons S11E14: filen 1354 s, tablån sa längre — liveläget
 * hamnade efter filens slut). Spelaren minns längden värden rapporterar; vid
 * nästa poolbygge får posten den verkliga längden. Den sparade poolen (och
 * därmed tablån som visas nu) rörs inte. Ren logik.
 */
import type { PoolItem } from './pool'

export type RuntimeFixes = Record<string, number>

/** Högst så många poster sparas (äldsta släpps). */
const MAX_FIXES = 600

/**
 * Ny karta med `ref`:s längd i sekunder, eller null om inget ändrats
 * (orimlig längd, eller samma som redan sparad inom 30 s).
 */
export function noteDuration(fixes: RuntimeFixes, ref: string, seconds: number): RuntimeFixes | null {
  if (!Number.isFinite(seconds) || seconds < 60 || seconds > 12 * 3600) return null
  const prev = fixes[ref]
  if (prev != null && Math.abs(prev - seconds) < 30) return null
  const next: RuntimeFixes = { ...fixes }
  delete next[ref]
  next[ref] = Math.round(seconds)
  const keys = Object.keys(next)
  for (let i = 0; i < keys.length - MAX_FIXES; i += 1) delete next[keys[i]!]
  return next
}

const toMin = (seconds: number) => Math.max(1, Math.ceil(seconds / 60))

/**
 * Posterna med verklig längd där den är känd (minuter, uppåt). Ett avsnitt
 * utan egen känd längd får seriens: medianen av de avsnitt av samma serie
 * som spelats — samma serie har samma avsnittslängd, och en enda spelning
 * räcker för att resten av serien slutar få standardlängden (45 min).
 */
export function applyRuntimeFixes(items: PoolItem[], fixes: RuntimeFixes): PoolItem[] {
  if (Object.keys(fixes).length === 0) return items
  const bySeries = new Map<string, number[]>()
  for (const item of items) {
    const s = fixes[item.ref]
    if (s == null || !item.seriesKey) continue
    const list = bySeries.get(item.seriesKey) ?? []
    list.push(s)
    bySeries.set(item.seriesKey, list)
  }
  const seriesMin = new Map([...bySeries].map(([k, list]) => [k, toMin(median(list))] as const))
  return items.map((item) => {
    const s = fixes[item.ref]
    const runtimeMin = s != null ? toMin(s) : !item.runtimeKnown && item.seriesKey ? seriesMin.get(item.seriesKey) : undefined
    if (runtimeMin == null) return item
    return runtimeMin === item.runtimeMin && item.runtimeKnown ? item : { ...item, runtimeMin, runtimeKnown: true }
  })
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}
