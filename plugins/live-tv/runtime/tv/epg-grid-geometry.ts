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

import { startOfLocalDay } from '../live-tv-model'
import type { TimelineZoom } from './tv-settings-store'

export const HOUR_PX = 240
export const PX_PER_MIN = HOUR_PX / 60
export const CHANNEL_COL_PX = 160
export const ROW_MIN_H_PX = 56
/**
 * Telefonens tablå (handoffen §3, fas 3): 90 minuter synliga i ~260 px —
 * det som blir kvar av en 375 px-skärm efter 112 px kanalkolumn. Alla tre är
 * äkta CSS-px; skalan skickas in som `pxPerMin` så samma geometri räknar
 * både skrivbordets 4 px/min och telefonens ~2,9.
 */
export const PHONE_PX_PER_MIN = 260 / 90
export const PHONE_CHANNEL_COL_PX = 112
export const PHONE_ROW_H_PX = 64
/** Under så här brett kan ett block inte bära text — det ritas som en markör. */
export const MIN_BLOCK_PX = 18
/** Under så här brett ritas bara titeln, ingen tid. */
export const TITLE_ONLY_PX = 72

export type EpgBlockShape = 'marker' | 'title' | 'full'

export interface EpgBlockBox {
  left: number
  width: number
  shape: EpgBlockShape
  /**
   * `min(8, width/3)` i pluginets px-skala. I PROCENTskalan (`thresholds`
   * angiven) är den alltid 0 — CSS-padding i sanna px läggs på av vyn, en
   * procentandel av spårbredden vore fel enhet.
   */
  paddingX: number
  clippedStart: boolean
  clippedEnd: boolean
}

/** Formtrösklar i SAMMA enhet som `width` (px eller %). Default = pluginets px-konstanter. */
export interface ShapeThresholds {
  marker: number
  title: number
}

const DEFAULT_THRESHOLDS: ShapeThresholds = { marker: MIN_BLOCK_PX, title: TITLE_ONLY_PX }

/**
 * Formtrösklar för PROCENTskalan (Grid/Timeline, `PCT_PER_MIN_GRID` /
 * `timelineWindow(...).pctPerMin`): under 5 min är ett block en markör, under
 * 15 min bara en titel — handoffen §3 säger "block under ~20 min i vald zoom
 * renderas som rena staplar"; Timeline (Task 5) skärper det till sin egen
 * `{ marker: 20 * pctPerMin, title: 20 * pctPerMin }` (staplar UTAN text upp
 * till 20 min, aldrig bara "title"-läge).
 */
export function pctShapeThresholds(pctPerMin: number): ShapeThresholds {
  return { marker: 5 * pctPerMin, title: 15 * pctPerMin }
}

function shapeFor(width: number, thresholds: ShapeThresholds): EpgBlockShape {
  if (width < thresholds.marker) return 'marker'
  if (width < thresholds.title) return 'title'
  return 'full'
}

/**
 * Geometrin för ETT program, klippt mot fönstret. `null` betyder att
 * programmet ligger helt utanför `[windowStart, windowEnd)` och inte ska
 * ritas alls. `pxPerMin` är skalan (skrivbordets `PX_PER_MIN` om inget
 * anges, `PCT_PER_MIN_GRID`/`timelineWindow(...).pctPerMin` för procent).
 *
 * `thresholds` måste vara i SAMMA enhet som `pxPerMin` ger `width` i — annars
 * blir ett 30-minutersblock (16,67 % i Grid) en "marker" trots att det borde
 * fylla nästan hela spåret, eftersom px-konstanterna (18/72) då jämförs mot
 * ett procenttal. Default (`DEFAULT_THRESHOLDS`) gäller px-skalan; procentskalan
 * ger sin egen via `pctShapeThresholds(pctPerMin)`.
 */
export function epgBlockBox(
  programme: { start: number; stop: number },
  windowStart: number,
  windowEnd: number,
  pxPerMin: number = PX_PER_MIN,
  thresholds?: ShapeThresholds,
): EpgBlockBox | null {
  const start = Math.max(programme.start, windowStart)
  const stop = Math.min(programme.stop, windowEnd)
  if (stop <= start) return null
  const width = ((stop - start) / 60_000) * pxPerMin
  const left = ((start - windowStart) / 60_000) * pxPerMin
  const shape = shapeFor(width, thresholds ?? DEFAULT_THRESHOLDS)
  // Procentskalan ger padding i CSS-px från vyn — 0 här, aldrig en andel av bredden.
  const paddingX = thresholds ? 0 : shape === 'marker' ? 0 : Math.min(8, width / 3)
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
  pxPerMin: number = PX_PER_MIN,
  thresholds?: ShapeThresholds,
): EpgRowEntry<P>[] {
  const entries: EpgRowEntry<P>[] = []
  for (const span of resolveOverlaps(programmes)) {
    const box = epgBlockBox(span, windowStart, windowEnd, pxPerMin, thresholds)
    if (box) entries.push({ box, programme: span.programme })
  }
  return entries
}

/** Nu-linjens position i px, räknat från fönstrets vänsterkant. */
export function nowLinePx(nowMs: number, windowStart: number, pxPerMin: number = PX_PER_MIN): number {
  return ((nowMs - windowStart) / 60_000) * pxPerMin
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

const HALF_HOUR_MS = 1_800_000

/**
 * Grids tidsfönster (städad guide, desktop_handoffen §1 "Tidsaxel och
 * fönster"): börjar vid NÄRMAST FÖREGÅENDE halvtimme, inte vid en fast
 * timme. Kl. 08:44 → 08:30, så nu-linjen alltid syns utan att scrolla.
 * Golvet räknas på epoken (UTC), vilket bara ger en LOKAL halvtimme om
 * tidszonens offset själv är hela halvtimmar (sant för alla riktiga
 * tidszoner utom UTC+5:45/+12:45 m.fl. udda kvartsoffset).
 */
export function guideWindowStart(nowMs: number): number {
  return Math.floor(nowMs / HALF_HOUR_MS) * HALF_HOUR_MS
}

/** Grids fönster är 3 timmar i 6 halvtimmesspalter (handoffen §1). */
export const GRID_WINDOW_MS = 3 * 3_600_000

/** Blockbredd i % av spårbredden i Grid: en minut är 100/180 av 3-timmarsfönstret. */
export const PCT_PER_MIN_GRID = 100 / 180

/**
 * Timelines tre zoomlägen (handoffen §3): fönstrets start och längd skiljer
 * sig, men alla tre delar `guideWindowStart`/`startOfLocalDay` med Grid så
 * att en klick i Timeline landar på samma halvtimme som Grid öppnar på.
 * `pctPerMin` är skalfaktorn till `epgBlockBox`/`epgRowBoxes` — samma
 * `100/fönsterminuter`-formel som `PCT_PER_MIN_GRID`, fast för Timelines
 * bredare fönster.
 */
export function timelineWindow(nowMs: number, zoom: TimelineZoom): { start: number; end: number; pctPerMin: number } {
  if (zoom === '2h') {
    const start = guideWindowStart(nowMs) - HALF_HOUR_MS
    const durationMin = 2 * 60
    return { start, end: start + durationMin * 60_000, pctPerMin: 100 / durationMin }
  }
  if (zoom === '6h') {
    const start = guideWindowStart(nowMs) - 3_600_000
    const durationMin = 6 * 60
    return { start, end: start + durationMin * 60_000, pctPerMin: 100 / durationMin }
  }
  const start = startOfLocalDay(nowMs) + 6 * 3_600_000
  const durationMin = 18 * 60
  return { start, end: start + durationMin * 60_000, pctPerMin: 100 / durationMin }
}

/**
 * Slår ihop ANGRÄNSANDE block som är smalare än `minWidthPct` till ett enda
 * block med en sammansatt titel (`Titel · Titel`, handoffen §3 "Timeline").
 * Ett ensamt smalt block utan smal granne rörs inte — det är fortfarande för
 * smalt för text, men det finns inget att slå ihop det MED.
 *
 * Bara kedjor på minst två block slås ihop; boxens nya bredd/shape räknas om
 * från den sammanslagna spannvidden med SAMMA `thresholds` som anroparen
 * använde för `entries` (default pluginets px-konstanter) — annars skulle
 * det sammanslagna blockets form bedömas i fel enhet, precis som i
 * `epgBlockBox`.
 */
export function mergeShortBlocks<P extends EpgSpan & { title: string }>(
  entries: EpgRowEntry<P>[],
  minWidthPct: number,
  thresholds?: ShapeThresholds,
): Array<EpgRowEntry<P> & { mergedTitle?: string }> {
  const result: Array<EpgRowEntry<P> & { mergedTitle?: string }> = []
  let i = 0
  while (i < entries.length) {
    const current = entries[i]
    if (current.box.width >= minWidthPct) {
      result.push(current)
      i += 1
      continue
    }
    let j = i + 1
    while (j < entries.length && entries[j].box.width < minWidthPct) j += 1
    if (j - i >= 2) {
      const group = entries.slice(i, j)
      const first = group[0]
      const last = group[group.length - 1]
      const width = last.box.left + last.box.width - first.box.left
      const shape = shapeFor(width, thresholds ?? DEFAULT_THRESHOLDS)
      const paddingX = thresholds ? 0 : shape === 'marker' ? 0 : Math.min(8, width / 3)
      result.push({
        box: { ...first.box, width, shape, paddingX, clippedEnd: last.box.clippedEnd },
        programme: first.programme,
        mergedTitle: group.map((entry) => entry.programme.title).join(' · '),
      })
      i = j
    } else {
      result.push(current)
      i += 1
    }
  }
  return result
}
