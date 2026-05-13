import type { NowNextLater } from './types'

export function scheduleNextBoundary(data: NowNextLater, onBoundary: () => void): () => void {
  const target = data.now?.stop ?? data.next?.start ?? null
  if (target === null) return () => {}
  const delay = Math.max(0, target - Date.now())
  const timer = setTimeout(onBoundary, delay)
  return () => clearTimeout(timer)
}
