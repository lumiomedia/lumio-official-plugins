'use client'

/**
 * Skärmens verkliga mått, lästa i webviewn.
 *
 * En TV-box kan lägga ut sidan mot en STÖRRE yta än den som visas. Då ser
 * användaren bara en del av sidan, förstorad, och resten blir omålad — det som
 * rapporterades som "channels are zoomed in and there is a white box issue"
 * från en Fire TV Cube (2026-09-25).
 *
 * Felet går inte att se i skrivbordets TV-läge och inte i Television_4K-
 * emulatorn (mätt: layout 960×540, synlig 960×540 @1 — friskt). Det måste
 * alltså mätas på den enhet som visar det.
 *
 * Raden ritas i inställningarna i stället för att loggas, därför att den som
 * kan reproducera felet inte nödvändigtvis når `<ip>:3011/api/debug-log` — men
 * kan fotografera en skärm.
 */

export interface DisplayMetrics {
  layoutWidth: number
  layoutHeight: number
  visualWidth: number | null
  visualHeight: number | null
  visualScale: number | null
  dpr: number
  sceneScale: string
  /** `data-tv-scene` på <html>. Attributet är det som slår på scenen i CSS. */
  sceneOn: boolean
  /** Bodys BERÄKNADE transform. 'none' betyder att scenen inte tillämpas. */
  bodyTransform: string
  /**
   * Bodys bredd ur `getBoundingClientRect()`, alltså EFTER transform.
   *
   * Duger inte ensam, och det var felet i 0.11.4: på en 960 px skärm ger BÅDE
   * det friska läget (1920 designpixlar × 0,5) och det trasiga (960 px utan
   * nedskalning) talet 960. Läs `bodyLayoutWidth` bredvid.
   */
  bodyWidth: number
  /**
   * Bodys bredd FÖRE transform (`offsetWidth`). Det här är talet som skiljer
   * de två lägena åt: 1920 betyder att scenen lagts ut i designbredd och
   * krympts, 960 att sidan lagts ut direkt mot skärmen och att varje mått i
   * appen därmed är dubbelt för stort.
   */
  bodyLayoutWidth: number
  /**
   * Skalan ur bodys transformmatris, inte ur variabeln.
   *
   * `matrix(a, …)` där a är den vågräta skalan. 1 betyder att transformen
   * finns men inte gör någonting — och `matrix(1, 0, 0, 1, 0, 0)` är INTE
   * 'none', så 0.11.4 kallade det "skalad" och friskt.
   */
  bodyScale: number | null
}

export function readDisplayMetrics(): DisplayMetrics | null {
  if (typeof window === 'undefined') return null
  const visual = window.visualViewport
  const sceneScale = typeof document === 'undefined'
    ? ''
    : getComputedStyle(document.documentElement).getPropertyValue('--tv-scene-scale').trim()
  const body = typeof document === 'undefined' ? null : document.body
  return {
    layoutWidth: window.innerWidth,
    layoutHeight: window.innerHeight,
    visualWidth: visual ? visual.width : null,
    visualHeight: visual ? visual.height : null,
    visualScale: visual ? visual.scale : null,
    dpr: window.devicePixelRatio,
    sceneScale: sceneScale || '1',
    sceneOn: typeof document !== 'undefined'
      && document.documentElement.getAttribute('data-tv-scene') === '1',
    bodyTransform: body ? (getComputedStyle(body).transform || 'none') : 'none',
    bodyWidth: body ? Math.round(body.getBoundingClientRect().width) : 0,
    bodyLayoutWidth: body ? body.offsetWidth : 0,
    bodyScale: body ? matrixScale(getComputedStyle(body).transform) : null,
  }
}

/**
 * Den vågräta skalan ur en beräknad transform.
 *
 * `matrix(a, b, c, d, e, f)` — `a` är x-skalan när ingen rotation är inblandad,
 * och scenen roterar aldrig. `none` och allt oläsbart ger null: att gissa 1
 * hade sagt "oskalad" om ett värde vi inte förstod.
 */
function matrixScale(transform: string): number | null {
  const match = /matrix\(([^,]+),/.exec(transform)
  if (!match) return null
  const value = parseFloat(match[1])
  return Number.isFinite(value) ? value : null
}

export function formatDisplayMetrics(m: DisplayMetrics): string {
  const visual = m.visualWidth !== null && m.visualHeight !== null
    ? `synlig ${Math.round(m.visualWidth)}×${Math.round(m.visualHeight)} @${m.visualScale}`
    : 'synlig saknas'
  const scen = `scen ${m.sceneScale}${m.sceneOn ? '' : ' AV'}`
  // Layoutbredden FÖRE transform står först: den är den som avgör, och den
  // skalade bredden ensam kunde inte skilja friskt från trasigt.
  const kropp = `kropp ${m.bodyLayoutWidth}→${m.bodyWidth} ×${m.bodyScale ?? 'otransformerad'}`
  return `${m.layoutWidth}×${m.layoutHeight} · ${visual} · dpr ${m.dpr} · ${scen} · ${kropp}`
}

/**
 * Scenen är påslagen men krymper inte sidan.
 *
 * Både nedskalningen och den svarta bakgrunden hänger på
 * `:root[data-tv-scene="1"]` i appens index.css. Tillämpas regeln inte ritas
 * sidan i designstorlek (1920) inuti en mindre ruta — allt blir dubbelt så
 * stort och ytan utanför blir omålad. Det är exakt vad en Fire TV Cube
 * rapporterade som "zoomed in and there is a white box" (2026-09-25), medan
 * viewporten mätte friskt.
 */
export function isSceneNotApplied(m: DisplayMetrics): boolean {
  if (!m.sceneOn) return false
  const expected = parseFloat(m.sceneScale)
  if (!Number.isFinite(expected) || expected === 1) return false
  // Ingen transform alls är det uppenbara felet …
  if (m.bodyTransform === 'none' || m.bodyScale === null) return true
  // … men `matrix(1, 0, 0, 1, 0, 0)` är också fel, och 0.11.4 släppte igenom
  // det som "skalad". Det som gäller är om transformen faktiskt bär den skala
  // som räknats ut. En tusendel tål avrundningen mellan motorer.
  if (Math.abs(m.bodyScale - expected) > 0.001) return true
  // Sista kontrollen: lades sidan ut i designbredd? Krymps en sida som redan
  // lagts ut mot skärmen blir den för LITEN i stället för för stor, och det
  // är ett annat fel än det här — men det är fortfarande inte en frisk scen.
  return m.bodyLayoutWidth > 0 && m.bodyWidth > 0
    && Math.abs(m.bodyLayoutWidth * expected - m.bodyWidth) > 2
}

/**
 * Ritas sidan mot en annan yta än den som visas?
 *
 * En pixels tolerans: de två måtten avrundas olika i olika webviews, och ett
 * larm på en pixel hade gjort raden värdelös. Saknas `visualViewport` vet vi
 * ingenting, och då påstår vi ingenting.
 */
export function isViewportMismatch(m: DisplayMetrics): boolean {
  if (m.visualWidth === null || m.visualHeight === null) return false
  return Math.abs(m.layoutWidth - m.visualWidth) > 1 || Math.abs(m.layoutHeight - m.visualHeight) > 1
}
