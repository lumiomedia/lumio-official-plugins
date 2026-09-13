'use client'

import { useEffect, useState } from 'react'

/**
 * HÅL I GRÄNSSNITTET ÅT NATIVA VIDEOYTOR.
 *
 * mpv (macOS) och media3 (Android) ritar sina extraytor i en vy som sätts in
 * UNDER webbvyn (`src-tauri/src/mpv_surfaces.rs`: "Ovanför spelarens vy men
 * under WKWebView"). Bilden finns alltså — den syns bara där DOM:en är
 * genomskinlig över ytans rektangel. Värden gör `html`/`body` genomskinliga
 * medan en sådan yta lever, men TV-skalet målar sin egen `TV.bg` över hela
 * skärmen och varje multivyruta sin `#05070d`. Resultatet var uppmätt på
 * riktig maskin: ljud men svart bild i alla rutor utom den som spelaren äger.
 *
 * Registret här är bryggan mellan de två sidorna: `useVideoSurface` skriver in
 * skärmrektangeln för varje LEVANDE nativ yta, och skalet läser dem för att
 * klippa hål i sin bakgrund. En HTML-yta registrerar inget — där är videon ett
 * vanligt DOM-element som målas i rätt lager av sig självt.
 *
 * Koordinaterna är SKÄRMPIXLAR (`getBoundingClientRect`), samma rymd som ytan
 * själv får via `setBounds`. Skalet räknar om dem till sitt eget lokala rum
 * (TV-scenen har en `transform`, se `tv-shell.tsx`).
 */
export interface SurfaceCutout {
  left: number
  top: number
  width: number
  height: number
  /** Rutans hörnradie i skärmpixlar. 0 = fyrkantigt hål. */
  radius: number
}

const cutouts = new Map<symbol, SurfaceCutout>()
const listeners = new Set<() => void>()
/**
 * Cachad ögonblicksbild. `getSurfaceCutouts()` måste ge SAMMA array så länge
 * inget ändrats: hålen uppdateras från en ResizeObserver, och en ny array per
 * läsning hade gett en oändlig render→mät→render-slinga i skalet.
 */
let snapshot: SurfaceCutout[] = []

function same(a: SurfaceCutout, b: SurfaceCutout): boolean {
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height && a.radius === b.radius
}

function publish(): void {
  snapshot = [...cutouts.values()]
  for (const listener of [...listeners]) listener()
}

/** Lägg till eller flytta hålet för en yta. Oförändrad rektangel = ingen händelse. */
export function registerSurfaceCutout(key: symbol, cutout: SurfaceCutout): void {
  const previous = cutouts.get(key)
  if (previous && same(previous, cutout)) return
  cutouts.set(key, cutout)
  publish()
}

/** Ytan är borta (stängd, misslyckad, avmonterad) — hålet ska stängas igen. */
export function unregisterSurfaceCutout(key: symbol): void {
  if (!cutouts.delete(key)) return
  publish()
}

export function getSurfaceCutouts(): SurfaceCutout[] {
  return snapshot
}

export function subscribeSurfaceCutouts(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Bara för tester: töm registret mellan fall. */
export function __resetSurfaceCutouts(): void {
  cutouts.clear()
  publish()
}

export function useSurfaceCutouts(): SurfaceCutout[] {
  const [value, setValue] = useState(getSurfaceCutouts)
  useEffect(() => {
    // Ytor kan ha registrerats mellan första renderingen och effekten.
    setValue(getSurfaceCutouts())
    return subscribeSurfaceCutouts(() => setValue(getSurfaceCutouts()))
  }, [])
  return value
}

/**
 * `clip-path` för en bakgrund som ska ha hål.
 *
 * `path()` i stället för `polygon()` av två skäl: flera separata delbanor kan
 * skrivas rakt av (ingen självskärande omvägspolygon), och hörnen kan rundas
 * så att hålet följer rutans radie i stället för att visa videons fyrkantiga
 * hörn utanför ramen. `evenodd` gör de inre banorna till hål i den yttre.
 *
 * Koordinaterna är LOKALA för elementet (px från dess border-box-hörn) —
 * anroparen räknar om från skärmpixlar, se `tv-shell.tsx`. Den yttre banan
 * ritas medvetet mycket större än elementet: allt utanför klipps ändå bort,
 * och då behöver elementets egen storlek inte mätas.
 */
export function cutoutClipPath(holes: Array<{ left: number; top: number; width: number; height: number; radius: number }>): string {
  const OUTER = 100000
  const parts = [`M0 0H${OUTER}V${OUTER}H0Z`]
  for (const hole of holes) {
    if (hole.width <= 0 || hole.height <= 0) continue
    const x = round(hole.left)
    const y = round(hole.top)
    const w = round(hole.width)
    const h = round(hole.height)
    const r = round(Math.max(0, Math.min(hole.radius, w / 2, h / 2)))
    if (r === 0) {
      parts.push(`M${x} ${y}H${x + w}V${y + h}H${x}Z`)
      continue
    }
    // A med radie 0 vore en rät linje enligt SVG-spec, men skrivs inte ut här
    // alls när r saknas — en bana utan bågar är både kortare och lättare att
    // läsa i ett felsöknings-DOM.
    parts.push(
      `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
      `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
      `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
      `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
    )
  }
  return `path(evenodd, "${parts.join(' ')}")`
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
