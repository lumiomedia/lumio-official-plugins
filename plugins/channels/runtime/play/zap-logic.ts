/**
 * Zappläget, ren logik: sifferval från fjärren och kanal på nummer.
 * Ingen React, inget SDK.
 */
import type { ChannelDef } from '../model/channel'

/** Brusets längd vid varje kanalbyte. Rent visuellt: blockerar aldrig input. */
export const NOISE_MS = 320
/** Så länge ligger zapp-OSD:n kvar utan input. */
export const OSD_IDLE_MS = 4000
const MAX_DIGITS = 3

export interface DigitBuffer {
  /** Ny siffra. `commit` sätts när tre siffror matats in; annars väntar bufferten. */
  push(digit: number, now: number): { pending: string; commit: number | null }
  /** Levererar det inmatade när `timeoutMs` gått sedan sista siffran. */
  flush(now: number): number | null
}

export function createDigitBuffer(timeoutMs = 1500): DigitBuffer {
  let digits = ''
  let last = 0
  const take = (): number => {
    const n = Number(digits)
    digits = ''
    return n
  }
  return {
    push(digit, now) {
      // Gammalt val som aldrig flushades räknas som övergivet.
      if (digits && now - last >= timeoutMs) digits = ''
      digits += String(Math.trunc(Math.abs(digit)) % 10)
      last = now
      if (digits.length >= MAX_DIGITS) return { pending: digits, commit: take() }
      return { pending: digits, commit: null }
    },
    flush(now) {
      if (!digits || now - last < timeoutMs) return null
      return take()
    },
  }
}

export function channelByNumber(channels: ChannelDef[], n: number): ChannelDef | null {
  return channels.find((c) => c.number === n) ?? null
}
