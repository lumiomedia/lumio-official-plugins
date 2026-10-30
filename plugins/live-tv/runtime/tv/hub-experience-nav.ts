/**
 * ZONNAVIGERINGEN I KANALER, LAYOUT UPPLEVELSE (handoff v2 "Hem navigation").
 *
 * Zonerna uppifrån: heronas knappar → kategorichippen → raderna. Ren reducer
 * utan DOM — komponenten flyttar fokus till stationen som tillståndet pekar
 * på. Ett oförändrat tillstånd (samma objekt) betyder "inget att göra här":
 * då får komponenten släppa tangenten vidare (◂ mot rälsen, ▲ mot topraden).
 */

export type XpZone = 'hero' | 'chips' | 'rows'
export interface XpNavState { zone: XpZone; heroBtn: number; chipIdx: number; row: number; cols: number[] }
export type XpKey = 'up' | 'down' | 'left' | 'right' | 'back'
export interface XpDims { heroBtns: number; chips: number; rowLens: number[] }

export function xpInitial(rows: number): XpNavState {
  return { zone: 'hero', heroBtn: 0, chipIdx: 0, row: 0, cols: Array.from({ length: rows }, () => 0) }
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n))

/** Raderna kan krympa (chipfiltret tömmer Sänds nu): rad och kolumner klampas mot dagens mått. */
export function xpNormalise(s: XpNavState, d: XpDims): XpNavState {
  const cols = d.rowLens.map((len, i) => clamp(s.cols[i] ?? 0, Math.max(0, len - 1)))
  const row = clamp(s.row, Math.max(0, d.rowLens.length - 1))
  const zone: XpZone = s.zone === 'rows' && d.rowLens.length === 0 ? (d.chips > 0 ? 'chips' : 'hero') : s.zone
  return { zone, heroBtn: clamp(s.heroBtn, Math.max(0, d.heroBtns - 1)), chipIdx: clamp(s.chipIdx, Math.max(0, d.chips - 1)), row, cols }
}

function same(a: XpNavState, b: XpNavState): boolean {
  return a.zone === b.zone && a.heroBtn === b.heroBtn && a.chipIdx === b.chipIdx && a.row === b.row && a.cols.length === b.cols.length && a.cols.every((c, i) => c === b.cols[i])
}

export function xpNavReduce(s: XpNavState, key: XpKey, dims: XpDims): XpNavState {
  const n = xpNormalise(s, dims)
  const next = step(n, key, dims)
  return same(next, s) ? s : next
}

function step(s: XpNavState, key: XpKey, d: XpDims): XpNavState {
  const hasRows = d.rowLens.length > 0
  if (key === 'back') return s.zone === 'hero' ? s : { ...s, zone: 'hero', heroBtn: 0, row: 0 }
  if (s.zone === 'hero') {
    if (key === 'left' || key === 'right') return { ...s, heroBtn: clamp(s.heroBtn + (key === 'right' ? 1 : -1), Math.max(0, d.heroBtns - 1)) }
    if (key === 'down') return d.chips > 0 ? { ...s, zone: 'chips' } : hasRows ? { ...s, zone: 'rows', row: 0 } : s
    return s
  }
  if (s.zone === 'chips') {
    if (key === 'left' || key === 'right') return { ...s, chipIdx: clamp(s.chipIdx + (key === 'right' ? 1 : -1), Math.max(0, d.chips - 1)) }
    if (key === 'up') return { ...s, zone: 'hero' }
    return hasRows ? { ...s, zone: 'rows', row: 0 } : s
  }
  if (key === 'up') return s.row === 0 ? { ...s, zone: d.chips > 0 ? 'chips' : 'hero' } : { ...s, row: s.row - 1 }
  if (key === 'down') return { ...s, row: clamp(s.row + 1, d.rowLens.length - 1) }
  const cols = s.cols.slice()
  cols[s.row] = clamp((cols[s.row] ?? 0) + (key === 'right' ? 1 : -1), Math.max(0, (d.rowLens[s.row] ?? 1) - 1))
  return { ...s, cols }
}
