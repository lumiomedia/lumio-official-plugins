'use client'

import { getSurfaceCutouts } from './surface-cutouts'

/**
 * FELSÖKNING: VAD LIGGER ÖVER EN NATIV YTA?
 *
 * En nativ yta (mpv/media3) syns bara där webbvyn är genomskinlig över den.
 * "Ljud men ingen bild" har haft fyra olika orsaker (bakgrund på html/body,
 * `.bg-mesh`, skalets egen bakgrund, fel rektangel), och ingen av dem syns i
 * appens logg. Den här raden säger vilket element som målar ogenomskinligt
 * över rutans mitt, så nästa felrapport kommer med svaret i loggen
 * (`/api/debug-log`, samma väg som spelarens `[mpv-close]`-rader).
 */
function opaqueAt(x: number, y: number): string {
  if (typeof document === 'undefined' || typeof document.elementsFromPoint !== 'function') return 'okänt'
  for (const el of document.elementsFromPoint(x, y)) {
    const style = window.getComputedStyle(el)
    const bg = style.backgroundColor
    const transparent = bg === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(bg)
    if (!transparent || (style.backgroundImage && style.backgroundImage !== 'none')) {
      const id = el.getAttribute('data-testid') ?? el.getAttribute('data-live-tv-backdrop') ?? ''
      const cls = typeof el.className === 'string' ? el.className.slice(0, 60) : ''
      return `${el.tagName.toLowerCase()}${id ? `[${id}]` : ''}${cls ? `.${cls}` : ''} bg=${bg} img=${style.backgroundImage.slice(0, 40)}`
    }
  }
  return 'inget (genomskinligt hela vägen)'
}

export function describeSurfaceStack(label: string, tiles: HTMLElement[]): string {
  const root = document.documentElement
  const parts = [
    `[surface-diag] ${label}`,
    `html.bg=${window.getComputedStyle(root).backgroundColor}`,
    `body.bg=${window.getComputedStyle(document.body).backgroundColor}`,
    `native-surfaces=${root.getAttribute('data-native-surfaces') ?? '-'}`,
    `mpv-playing=${root.classList.contains('mpv-playing') ? 1 : 0}`,
    `hål=${getSurfaceCutouts().map((c) => `${Math.round(c.left)},${Math.round(c.top)} ${Math.round(c.width)}x${Math.round(c.height)}`).join(' ') || '-'}`,
  ]
  tiles.forEach((tile, index) => {
    const r = tile.getBoundingClientRect()
    parts.push(`ruta${index}=${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} över:${opaqueAt(r.left + r.width / 2, r.top + r.height / 2)}`)
  })
  return parts.join(' | ')
}

export function logSurfaceStack(label: string, tiles: HTMLElement[]): void {
  try {
    const msg = describeSurfaceStack(label, tiles)
    void fetch(`/api/debug-log?msg=${encodeURIComponent(msg)}`).catch(() => {})
  } catch { /* felsökning får aldrig fälla vyn */ }
}
