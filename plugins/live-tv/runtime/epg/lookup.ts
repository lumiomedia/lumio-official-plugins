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

export function computeNowNextLater(
  cache: EpgCacheEntry | null,
  tvgId: string | null,
  now: number = Date.now(),
): NowNextLater {
  if (!cache || !tvgId) return EMPTY
  const list = cache.index[tvgId]
  if (!list || list.length === 0) return EMPTY

  const idx = findCurrentIndex(list, now)
  const candidate = idx >= 0 ? list[idx] : null
  const isCurrent = candidate !== null && candidate.stop > now
  const nowProgramme = isCurrent ? candidate : null
  const nextIdx = nowProgramme ? idx + 1 : Math.max(0, idx + 1)
  const next = list[nextIdx] ?? null
  const later = list[nextIdx + 1] ?? null
  return { now: nowProgramme, next, later }
}
