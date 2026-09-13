import type { M3uChannel } from '../live-tv-data'

/** Nummertangent → kanal: favoriter 1–N först, därefter listnummer. */
export function resolveZap(digits: string, favourites: M3uChannel[], channels: M3uChannel[]): M3uChannel | null {
  const n = Number.parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  if (n <= favourites.length) return favourites[n - 1] ?? null
  return channels[n - 1] ?? null
}

export const ZAP_MAX_DIGITS = 4

export function createZapBuffer(opts: { timeoutMs: number; onCommit: (digits: string) => void; onChange: (digits: string) => void }) {
  let digits = ''
  let timer: number | null = null
  const clearTimer = () => {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
  }
  const commit = () => {
    clearTimer()
    if (!digits) return
    const value = digits
    digits = ''
    opts.onChange('')
    opts.onCommit(value)
  }
  return {
    push(digit: string) {
      if (!/^[0-9]$/.test(digit)) return
      if (digits.length >= ZAP_MAX_DIGITS) return
      digits += digit
      opts.onChange(digits)
      clearTimer()
      timer = window.setTimeout(commit, opts.timeoutMs)
    },
    commit,
    clear() {
      clearTimer()
      digits = ''
      opts.onChange('')
    },
    dispose() {
      clearTimer()
    },
  }
}
