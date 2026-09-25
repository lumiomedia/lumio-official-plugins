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
  /** Bodys bredd i CSS-px. Scenen sätter den till designbredden (1920). */
  bodyWidth: number
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
  }
}

export function formatDisplayMetrics(m: DisplayMetrics): string {
  const visual = m.visualWidth !== null && m.visualHeight !== null
    ? `synlig ${Math.round(m.visualWidth)}×${Math.round(m.visualHeight)} @${m.visualScale}`
    : 'synlig saknas'
  const scen = `scen ${m.sceneScale}${m.sceneOn ? '' : ' AV'}`
  const kropp = `kropp ${m.bodyWidth} ${m.bodyTransform === 'none' ? 'otransformerad' : 'skalad'}`
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
  if (m.sceneScale === '1') return false
  return m.bodyTransform === 'none'
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
