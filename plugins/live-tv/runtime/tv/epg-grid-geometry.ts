/**
 * Tablårutnätets geometri, ren och utan React (spec §4.3 "Rutnät" /
 * "Överlappsfix").
 *
 * Buggen som fixas (Jerrys skärmdump, "Live NFL Football Night" över
 * "NFL Cowboys @ Giants", "Matc…"): `live-tv-epg-page.tsx:258` satte
 * `width = Math.max(4, …)` medan blocket har `padding: '6px 8px'` och
 * `boxSizing: 'border-box'` (:283-299). Ett block kan inte bli smalare än sin
 * egen vågräta padding — 4 px renderades som ≥16 px och lade sig över
 * grannen, som är absolut positionerad och inte reflowar.
 *
 * Här försvinner golvet ur bredden: `width` är den SANNA bredden (kan bli
 * 1–2 px), `shape` säger vad som får plats, och `paddingX` är
 * `Math.min(8, width / 3)` — aldrig bredare än blocket självt.
 */

export const HOUR_PX = 240
export const PX_PER_MIN = HOUR_PX / 60
export const CHANNEL_COL_PX = 160
export const ROW_MIN_H_PX = 56
/** Under så här brett kan ett block inte bära text — det ritas som en markör. */
export const MIN_BLOCK_PX = 18
/** Under så här brett ritas bara titeln, ingen tid. */
export const TITLE_ONLY_PX = 72

export type EpgBlockShape = 'marker' | 'title' | 'full'

export interface EpgBlockBox {
  left: number
  width: number
  shape: EpgBlockShape
  /** min(8, width/3) — padding som aldrig kan vara bredare än blocket. */
  paddingX: number
  clippedStart: boolean
  clippedEnd: boolean
}

function shapeFor(width: number): EpgBlockShape {
  if (width < MIN_BLOCK_PX) return 'marker'
  if (width < TITLE_ONLY_PX) return 'title'
  return 'full'
}

/**
 * Geometrin för ETT program, klippt mot fönstret. `null` betyder att
 * programmet ligger helt utanför `[windowStart, windowEnd)` och inte ska
 * ritas alls.
 */
export function epgBlockBox(
  programme: { start: number; stop: number },
  windowStart: number,
  windowEnd: number,
): EpgBlockBox | null {
  const start = Math.max(programme.start, windowStart)
  const stop = Math.min(programme.stop, windowEnd)
  if (stop <= start) return null
  const width = ((stop - start) / 60_000) * PX_PER_MIN
  const left = ((start - windowStart) / 60_000) * PX_PER_MIN
  const shape = shapeFor(width)
  const paddingX = shape === 'marker' ? 0 : Math.min(8, width / 3)
  return {
    left,
    width,
    shape,
    paddingX,
    clippedStart: programme.start < windowStart,
    clippedEnd: programme.stop > windowEnd,
  }
}

/**
 * Geometrin för en hel rad. Garanterar att intervallen aldrig överlappar:
 * nästa blocks `left` är alltid ≥ föregående `left + width` — blocken klipps
 * mot fönstret och programlistan är sorterad (funktionen sorterar
 * defensivt), så det räcker för att stänga skärmdumpens regression.
 */
export function epgRowBoxes(
  programmes: readonly { start: number; stop: number }[],
  windowStart: number,
  windowEnd: number,
): EpgBlockBox[] {
  const sorted = [...programmes].sort((a, b) => a.start - b.start)
  const boxes: EpgBlockBox[] = []
  for (const programme of sorted) {
    const box = epgBlockBox(programme, windowStart, windowEnd)
    if (box) boxes.push(box)
  }
  return boxes
}

/** Nu-linjens position i px, räknat från fönstrets vänsterkant. */
export function nowLinePx(nowMs: number, windowStart: number): number {
  return ((nowMs - windowStart) / 60_000) * PX_PER_MIN
}

/** En timmarkering per hel timme i fönstret. */
export function hourMarks(windowStart: number, windowEnd: number): number[] {
  const marks: number[] = []
  for (let t = windowStart; t < windowEnd; t += 3_600_000) marks.push(t)
  return marks
}
