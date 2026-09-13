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

/** Det minsta ett program behöver vara för att geometrin ska kunna räkna på det. */
export interface EpgSpan {
  start: number
  stop: number
}

/**
 * En box OCH programmet den hör till.
 *
 * Paret byggs HÄR och inte hos anroparen. `epgRowBoxes` sorterar, kastar och
 * klipper, så listan den lämnar ifrån sig är varken lika lång som eller i
 * samma ordning som den den fick — och två program kan dessutom ha IDENTISK
 * starttid (riktiga XMLTV-källor har det). En anropare som försöker härleda
 * "vilket program är det här?" ur `left` eller ur ett index kan alltså sätta
 * fel titel, fel tid, fel OK-mål och fel påminnelse på ett block. Därför bär
 * varje box sitt eget program, som samma objektreferens som kom in.
 */
export interface EpgRowEntry<P extends EpgSpan = EpgSpan> {
  box: EpgBlockBox
  programme: P
}

/**
 * Slår ihop en programlista med EVENTUELLT ÖVERLAPPANDE tider (riktiga
 * XMLTV-källor har det) till en icke-överlappande lista, sorterad på start.
 * Varje post behåller en referens till SITT program, så parningen aldrig
 * behöver härledas i efterhand. Reglerna, i ordning:
 *  - Noll/negativ varaktighet kastas (samma regel som `epgBlockBox`).
 *  - Ett program helt täckt av föregående (start ≥ föregåendes start OCH
 *    slut ≤ föregåendes slut, vilket sorteringen garanterar) kastas — det
 *    finns inget eget utrymme att rita det i.
 *  - Ett program som delvis överlappar föregående klipper föregåendes
 *    HÖGERKANT till sin egen start; det nya programmet behåller sin fulla
 *    starttid. Klippningen kan i sin tur äta upp föregående helt (två
 *    program med samma start), så listan filtreras igen på slutet.
 */
function resolveOverlaps<P extends EpgSpan>(
  programmes: readonly P[],
): { start: number; stop: number; programme: P }[] {
  const sorted = [...programmes].sort((a, b) => a.start - b.start)
  const kept: { start: number; stop: number; programme: P }[] = []
  for (const programme of sorted) {
    if (programme.stop <= programme.start) continue
    const prev = kept[kept.length - 1]
    if (prev) {
      if (programme.stop <= prev.stop) continue // helt täckt av föregående
      if (programme.start < prev.stop) prev.stop = programme.start // klipp föregåendes högerkant
    }
    kept.push({ start: programme.start, stop: programme.stop, programme })
  }
  return kept.filter((span) => span.stop > span.start)
}

/**
 * Geometrin för en hel rad, som par av box och program. Garanterar att
 * intervallen aldrig överlappar, ÄVEN när källdatan gör det:
 * `resolveOverlaps` klipper och kastar innan blocken klipps mot fönstret, så
 * nästa boxs `left` är alltid ≥ föregående `left + width` oavsett hur
 * programmen såg ut i källan.
 */
export function epgRowBoxes<P extends EpgSpan>(
  programmes: readonly P[],
  windowStart: number,
  windowEnd: number,
): EpgRowEntry<P>[] {
  const entries: EpgRowEntry<P>[] = []
  for (const span of resolveOverlaps(programmes)) {
    const box = epgBlockBox(span, windowStart, windowEnd)
    if (box) entries.push({ box, programme: span.programme })
  }
  return entries
}

/** Nu-linjens position i px, räknat från fönstrets vänsterkant. */
export function nowLinePx(nowMs: number, windowStart: number): number {
  return ((nowMs - windowStart) / 60_000) * PX_PER_MIN
}

/**
 * En markering per timme i fönstret: `windowStart`, `windowStart + 1h`, …
 * så länge de är `< windowEnd`. Kontrakt: detta är INTE klockjusterat — om
 * `windowStart` inte redan ligger på en hel timme (anroparens ansvar, se
 * `alignToHour` i `live-tv-epg-page.tsx`) hamnar markeringarna på samma
 * minut/sekund som `windowStart`, inte på klockslag.
 */
export function hourMarks(windowStart: number, windowEnd: number): number[] {
  const marks: number[] = []
  for (let t = windowStart; t < windowEnd; t += 3_600_000) marks.push(t)
  return marks
}
