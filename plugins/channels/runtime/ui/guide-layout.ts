/**
 * Tablåns geometri: tidsaxel, blockpositioner och nu-linje. Ren logik i
 * lokal tid; procent av fönstrets bredd så samma värden fungerar på alla ytor.
 */
const MIN = 60_000
const HALF_HOUR = 30 * MIN
export const GUIDE_SPAN_MIN = 210

export const CHANNELS_PAGE_ID = 'channels'

export interface GuideWindow { from: number; to: number; ticks: number[] }

/** Fönstret börjar på föregående halvtimme (lokal tid) och är 210 min långt. */
export function guideWindow(now: number): GuideWindow {
  const d = new Date(now)
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0)
  const from = d.getTime()
  const to = from + GUIDE_SPAN_MIN * MIN
  const ticks: number[] = []
  for (let t = from; t < to; t += HALF_HOUR) ticks.push(t)
  return { from, to, ticks }
}

/** Blockets läge i procent, klippt till fönstret; null om det ligger helt utanför. */
export function blockBox(slot: { start: number; stop: number }, window: { from: number; to: number }): { leftPct: number; widthPct: number } | null {
  const start = Math.max(slot.start, window.from)
  const stop = Math.min(slot.stop, window.to)
  if (stop <= start) return null
  const span = window.to - window.from
  return { leftPct: ((start - window.from) / span) * 100, widthPct: ((stop - start) / span) * 100 }
}

/** Nu-linjens läge i procent, låst till fönstret. */
export function nowLinePct(now: number, window: { from: number; to: number }): number {
  const pct = ((now - window.from) / (window.to - window.from)) * 100
  return Math.min(100, Math.max(0, pct))
}

export function formatClock(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * FAST FOKUSBAND (TV/tangentbord): raden med fokus står alltid på första
 * radplatsen under tidsaxeln, och raderna glider under den. Bandets index
 * är fokusraden, låst till listan. Vid slutet står bandet kvar och tom yta
 * följer efter (inga hopp där bandet plötsligt vandrar nedåt) — det jämnaste
 * för ögat när man håller ▼.
 */
export function bandIndex(focusIndex: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(focusIndex)))
}

/** Radspårets förskjutning för bandet: CSS-transform (radhöjden som CSS-längd: "54px" eller TV-enheter). */
export function bandTransform(index: number, rowH: string): string {
  return index === 0 ? 'translateY(0px)' : `translateY(calc(${-index} * ${rowH}))`
}

/**
 * Skrivbordets tangentbord: rullningen som ställer raden på bandplatsen,
 * låst till behållarens maxrullning (mus och styrplatta rullar fritt; där
 * ger sista raderna efter i stället för att lämna tom yta under listan).
 */
export function slotScrollTop(index: number, rowH: number, maxScroll: number): number {
  return Math.max(0, Math.min(Math.max(0, maxScroll), index * rowH))
}
