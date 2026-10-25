import { readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from './live-tv-data'

/**
 * FÖRSKJUT TABLÅN. Många IPTV-leverantörer märker tablåns tider med fel zon
 * (lokal tid som `+0000`), och då ligger hela guiden jämna timmar fel trots
 * att enhetens klocka står rätt (feedback 2026-10-25: "I want the guide to
 * follow my time"). Andra IPTV-appar har samma inställning (`tvg-shift`).
 *
 * Förskjutningen läggs på i klienten (`index-client.ts`, sportdagen och
 * länkningen): frågefönstret mot värden flyttas bakåt och programmens tider
 * framåt med lika mycket. Värdens butik rörs inte, så ingen ny app behövs och
 * inget behöver hämtas om. Cacherna har förskjutningen i nyckeln.
 *
 * Gäller hela guiden (alla EPG-källor). Minuter, steg om 30, ±12 h.
 */
const KEY = 'live_tv_epg_shift_v1'
export const EPG_SHIFT_LIMIT_MIN = 12 * 60
export const EPG_SHIFT_STEP_MIN = 30

const clamp = (min: number): number => {
  if (!Number.isFinite(min)) return 0
  const stepped = Math.round(min / EPG_SHIFT_STEP_MIN) * EPG_SHIFT_STEP_MIN
  return Math.max(-EPG_SHIFT_LIMIT_MIN, Math.min(EPG_SHIFT_LIMIT_MIN, stepped))
}

export function getEpgShiftMinutes(): number {
  const raw = readPluginJson<number | null>(LIVE_TV_PLUGIN_ID, KEY, null)
  return typeof raw === 'number' ? clamp(raw) : 0
}

export function setEpgShiftMinutes(min: number): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, KEY, clamp(min))
}

export const epgShiftMs = (): number => getEpgShiftMinutes() * 60_000

/** Nästa steg uppåt eller nedåt, inom gränsen. */
export function stepEpgShift(min: number, dir: 1 | -1): number {
  return clamp(min + dir * EPG_SHIFT_STEP_MIN)
}

/** Ett program med tiderna flyttade (`null` passerar). */
export function shiftTimes<T extends { start: number; stop: number }>(p: T, ms: number): T
export function shiftTimes<T extends { start: number; stop: number }>(p: T | null | undefined, ms: number): T | null
export function shiftTimes<T extends { start: number; stop: number }>(p: T | null | undefined, ms: number): T | null {
  if (!p) return null
  return ms === 0 ? p : { ...p, start: p.start + ms, stop: p.stop + ms }
}

/** "+2 h", "−1 h 30 min", "0" — för inställningsraden. */
export function formatEpgShift(min: number): string {
  if (min === 0) return '0'
  const sign = min > 0 ? '+' : '−'
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}`
}
