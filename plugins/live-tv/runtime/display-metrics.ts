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
}

export function readDisplayMetrics(): DisplayMetrics | null {
  if (typeof window === 'undefined') return null
  const visual = window.visualViewport
  const sceneScale = typeof document === 'undefined'
    ? ''
    : getComputedStyle(document.documentElement).getPropertyValue('--tv-scene-scale').trim()
  return {
    layoutWidth: window.innerWidth,
    layoutHeight: window.innerHeight,
    visualWidth: visual ? visual.width : null,
    visualHeight: visual ? visual.height : null,
    visualScale: visual ? visual.scale : null,
    dpr: window.devicePixelRatio,
    sceneScale: sceneScale || '1',
  }
}

export function formatDisplayMetrics(m: DisplayMetrics): string {
  const visual = m.visualWidth !== null && m.visualHeight !== null
    ? `synlig ${Math.round(m.visualWidth)}×${Math.round(m.visualHeight)} @${m.visualScale}`
    : 'synlig saknas'
  return `${m.layoutWidth}×${m.layoutHeight} · ${visual} · dpr ${m.dpr} · scen ${m.sceneScale}`
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
