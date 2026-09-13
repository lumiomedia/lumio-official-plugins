const MINUTE = 60_000
export const WINDOW_MS = 2 * 60 * MINUTE

export interface ScheduleWindow { start: number; end: number }

/** Föregående hela halvtimme minus 30 min; 2 h brett. */
export function scheduleWindow(nowMs: number): ScheduleWindow {
  const d = new Date(nowMs)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30)
  const start = d.getTime() - 30 * MINUTE
  return { start, end: start + WINDOW_MS }
}

export function timeTicks(win: ScheduleWindow): number[] {
  return [0, 1, 2, 3].map((i) => win.start + i * 30 * MINUTE)
}

export function blockGeometry(p: { start: number; stop: number }, win: ScheduleWindow): { leftPct: number; widthPct: number } | null {
  const start = Math.max(p.start, win.start)
  const stop = Math.min(p.stop, win.end)
  if (stop <= start) return null
  const leftPct = ((start - win.start) / WINDOW_MS) * 100
  const widthPct = ((stop - start) / WINDOW_MS) * 100
  return { leftPct, widthPct }
}

export function nowLinePct(nowMs: number, win: ScheduleWindow): number {
  return Math.min(100, Math.max(0, ((nowMs - win.start) / WINDOW_MS) * 100))
}
