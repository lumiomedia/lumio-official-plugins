import type { EpgCacheEntry, EpgProgramme, NowNextLater } from './types'

function findCurrentIndex(programmes: EpgProgramme[], now: number): number {
  let lo = 0
  let hi = programmes.length - 1
  let result = -1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (programmes[mid].start <= now) { result = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return result
}

const EMPTY: NowNextLater = { now: null, next: null, later: null }

/**
 * Nu/Härnäst/Senare ur en FÄRDIG programlista (stigande starttid).
 *
 * Sedan lagring v2 kommer tablån från appens `/api/live-tv/epg/*` som en ren
 * lista per kanalnyckel — det finns ingen `EpgCacheEntry` att slå i. Räknandet
 * är detsamma, så det bor här och `computeNowNextLater` (kvar för den äldre
 * cachevägen i `epg-sources-section.tsx`) anropar det.
 */
export function nowNextLaterFrom(
  programmes: readonly EpgProgramme[] | null | undefined,
  now: number = Date.now(),
): NowNextLater {
  if (!programmes || programmes.length === 0) return EMPTY
  const idx = findCurrentIndex(programmes as EpgProgramme[], now)
  const candidate = idx >= 0 ? programmes[idx] : null
  const isCurrent = candidate != null && candidate.stop > now
  const nowProgramme = isCurrent ? candidate : null
  const nextIdx = nowProgramme ? idx + 1 : Math.max(0, idx + 1)
  return { now: nowProgramme, next: programmes[nextIdx] ?? null, later: programmes[nextIdx + 1] ?? null }
}

/** Programmen som överlappar det halvöppna fönstret [fromMs, toMs). */
export function sliceSchedule(
  programmes: readonly EpgProgramme[] | null | undefined,
  fromMs: number,
  toMs: number,
): EpgProgramme[] {
  if (!programmes || programmes.length === 0) return []
  return programmes.filter((p) => p.stop > fromMs && p.start < toMs)
}

export function computeNowNextLater(
  cache: EpgCacheEntry | null,
  tvgId: string | null,
  now: number = Date.now(),
): NowNextLater {
  if (!cache || !tvgId) return EMPTY
  return nowNextLaterFrom(cache.index[tvgId], now)
}

