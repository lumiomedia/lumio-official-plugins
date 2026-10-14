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

/** Posterna med verklig längd där den är känd (minuter, uppåt). */
export function applyRuntimeFixes(items: PoolItem[], fixes: RuntimeFixes): PoolItem[] {
  if (Object.keys(fixes).length === 0) return items
  return items.map((item) => {
    const s = fixes[item.ref]
    if (s == null) return item
    const runtimeMin = Math.max(1, Math.ceil(s / 60))
    return runtimeMin === item.runtimeMin && item.runtimeKnown ? item : { ...item, runtimeMin, runtimeKnown: true }
  })
}
