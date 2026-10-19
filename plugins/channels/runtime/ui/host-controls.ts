/**
 * Värdspelarens kontrollrad, sedd utifrån.
 *
 * VideoPlayerModal har ingen prop för "kontrollerna syns" — den tonar sin
 * bottenrad (`.vp-controls`) med inline-opacity efter sin egen vilotimer
 * (och håller den framme under paus). Kanal-OSD:n ska tona i samma takt, så
 * vi läser raden i stället för att gissa med en egen timer, och lägger OSD:ns
 * knapprad precis ovanför seekraden i radens egen gradient.
 *
 * Saknas raden (äldre värd, TV-kromet) blir svaret null och spelaren faller
 * tillbaka på sin egen vilotimer.
 */
import { useEffect, useState, type RefObject } from 'react'

export const HOST_CONTROLS_SELECTOR = '.vp-controls'

/**
 * Döljer värdspelarens topprad och kontrollrad. Läggs som <style> bara medan
 * det ska gälla (zappläget, inställningskortet), så regeln aldrig blir kvar.
 * Spelarroten bär data-lumio-player-open; inga :has()/:where() (WebView 83).
 */
export const HIDE_HOST_CHROME_CSS = '[data-lumio-player-open] .vp-topbar, [data-lumio-player-open] .vp-controls { opacity: 0 !important; pointer-events: none !important; }'

export interface HostControls {
  visible: boolean
  /** Px från spelarens nederkant till ovankanten av radens innehåll; null när den inte gått att mäta. */
  lift: number | null
}

/** Närmaste förfader till `from` som innehåller värdens kontrollrad. */
export function findHostControls(from: Element | null): HTMLElement | null {
  for (let node = from?.parentElement ?? null; node; node = node.parentElement) {
    const hit = node.querySelector<HTMLElement>(HOST_CONTROLS_SELECTOR)
    if (hit) return hit
  }
  return null
}

export function readHostControls(el: HTMLElement): HostControls {
  const visible = el.style.opacity !== '0'
  const height = el.offsetHeight
  let lift: number | null = null
  if (height > 0) {
    const padTop = Number.parseFloat(window.getComputedStyle(el).paddingTop || '0')
    lift = Math.max(0, height - (Number.isFinite(padTop) ? padTop : 0))
  }
  return { visible, lift }
}

const same = (a: HostControls | null, b: HostControls | null) =>
  a === b || (!!a && !!b && a.visible === b.visible && a.lift === b.lift)

/**
 * Följer värdens kontrollrad medan `session` (spelarens nyckel) gäller. Ny
 * nyckel = ny modal = ny rad; en rad som lämnat dokumentet letas upp igen.
 */
export function useHostControls(anchorRef: RefObject<HTMLElement | null>, session: string | null): HostControls | null {
  const [state, setState] = useState<HostControls | null>(null)
  useEffect(() => {
    if (!session) {
      setState(null)
      return
    }
    let el: HTMLElement | null = null
    let observer: MutationObserver | null = null
    let resize: ResizeObserver | null = null
    const read = () => {
      if (!el) return
      const next = readHostControls(el)
      setState((prev) => (same(prev, next) ? prev : next))
    }
    const detach = () => {
      observer?.disconnect()
      resize?.disconnect()
      observer = null
      resize = null
      el = null
    }
    const attach = () => {
      if (el?.isConnected) return
      detach()
      el = findHostControls(anchorRef.current)
      if (!el) {
        setState(null)
        return
      }
      read()
      observer = new MutationObserver(read)
      observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] })
      if (typeof ResizeObserver !== 'undefined') {
        resize = new ResizeObserver(read)
        resize.observe(el)
      }
    }
    attach()
    // Raden monteras efter overlayn (och byts om värden ritar om den): leta tills den finns.
    const timer = window.setInterval(attach, 500)
    return () => {
      window.clearInterval(timer)
      detach()
      setState(null)
    }
  }, [anchorRef, session])
  return state
}

export const HOST_TOPBAR_SELECTOR = '.vp-topbar'

/**
 * Var värdens topprad (titel, chips, Stäng) slutar, i px från `anchor`s
 * överkant (anchor = kanal-OSD:ns rot, som täcker spelaren). Mäts i stället
 * för att gissa 52 px: raden kan ligga lägre (macOS-titelraden, insets) och
 * då hamnade kanalpillen ovanpå titeln. Skalan räknas bort (TV-scenen).
 */
export function hostTopbarBottom(anchor: HTMLElement, bar: HTMLElement): number | null {
  const a = anchor.getBoundingClientRect()
  const b = bar.getBoundingClientRect()
  if (b.width <= 0 && b.height <= 0) return null
  const k = anchor.offsetWidth > 0 && a.width > 0 ? a.width / anchor.offsetWidth : 1
  // Radens innehåll (titel, chips, Stäng) kan sticka ut nedanför själva raden
  // (telefonen, 2026-10-19: kanalpillen låg över Stäng). Lägsta synliga barnet räknas.
  let bottom = b.bottom
  for (const child of Array.from(bar.querySelectorAll<HTMLElement>('button, a, h1, h2, h3, [role="button"]'))) {
    const c = child.getBoundingClientRect()
    if (c.width > 0 && c.height > 0) bottom = Math.max(bottom, c.bottom)
  }
  return Math.max(0, Math.round((bottom - a.top) / k))
}

/**
 * Telefonens spelare ritar sin topprad (titel, Stäng) utan `.vp-topbar`: en
 * absolut rad överst i spelaren med knappar. Kanalpillen föll då tillbaka på
 * fasta 52 px och låg över Stäng (2026-10-19). Raden = spelarens översta
 * barn med en knapp, som inte är kanalens egen OSD.
 */
function findMobileTopbar(anchor: HTMLElement): HTMLElement | null {
  const root = anchor.closest<HTMLElement>('[data-lumio-player-open]') ?? document.querySelector<HTMLElement>('[data-lumio-player-open]')
  if (!root) return null
  const rootTop = root.getBoundingClientRect().top
  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (child.contains(anchor) || child.querySelector('[data-channels-osd]')) continue
    const r = child.getBoundingClientRect()
    if (r.height <= 0 || r.top - rootTop > 8 || r.height > 160) continue
    if (child.querySelector('button')) return child
  }
  return null
}

/** Följer värdens topprad medan `session` gäller (null: ingen rad, eller omätt). */
export function useHostTopbarBottom(anchorRef: RefObject<HTMLElement | null>, session: string | null): number | null {
  const [bottom, setBottom] = useState<number | null>(null)
  useEffect(() => {
    if (!session) { setBottom(null); return }
    let bar: HTMLElement | null = null
    let resize: ResizeObserver | null = null
    const read = () => {
      const anchor = anchorRef.current
      if (!anchor || !bar) return
      const next = hostTopbarBottom(anchor, bar)
      setBottom((prev) => (prev === next ? prev : next))
    }
    const attach = () => {
      if (bar?.isConnected) { read(); return }
      resize?.disconnect()
      resize = null
      bar = null
      for (let node = anchorRef.current?.parentElement ?? null; node && !bar; node = node.parentElement) bar = node.querySelector<HTMLElement>(HOST_TOPBAR_SELECTOR)
      if (!bar && anchorRef.current) bar = findMobileTopbar(anchorRef.current)
      if (!bar) return
      read()
      if (typeof ResizeObserver !== 'undefined') { resize = new ResizeObserver(read); resize.observe(bar) }
    }
    attach()
    // Raden byter höjd (52 → 0) och läge (fönsterstorlek, helskärm): läs om med jämna mellanrum.
    const timer = window.setInterval(attach, 500)
    window.addEventListener('resize', read)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', read)
      resize?.disconnect()
      setBottom(null)
    }
  }, [anchorRef, session])
  return bottom
}

/** Appens menyknapp (rund ikonknapp/menypill, fast placerad uppe i ett hörn). */
export const HOST_MENU_SELECTOR = '.mc-chip'
/** Luft mellan menyknappen och kanalpillen under den (px). */
export const MENU_BELOW_GAP_PX = 14
/** Menyknappar längre ner än så här under OSD:ns överkant krockar inte med pillen (px). */
const MENU_TOP_BAND_PX = 160

interface Box { left: number; right: number; top: number; bottom: number; width: number; height: number }

/**
 * Var kanalpillen ska ligga (px i OSD:ns egna mått) för att inte krocka med
 * appens toppkrom, eller null = ingen knapp i vägen (pillens vanliga plats).
 * Utan appens spelare ligger kanalsidans skärmar (Ingen signal, Programmet är
 * slut, vila) under appens toppkrom. Bredvid menyknappen krockade pillen med
 * toppmenyns flikar (2026-10-17): den läggs UNDER knappen, i linje med dess
 * vänsterkant. Bara en knapp i vänstra halvan, uppe vid pillen, flyttar den.
 */
export function menuClearSpot(anchor: Box, menu: Box | null, scale = 1, defaultLeftPx = 16): { left: number; top: number } | null {
  if (!menu || (menu.width <= 0 && menu.height <= 0)) return null
  const k = scale > 0 ? scale : 1
  if ((menu.left + menu.right) / 2 > anchor.left + anchor.width / 2) return null
  if (menu.bottom <= anchor.top || (menu.top - anchor.top) / k > MENU_TOP_BAND_PX) return null
  return {
    left: Math.max(defaultLeftPx, Math.round((menu.left - anchor.left) / k)),
    top: Math.round((menu.bottom - anchor.top) / k) + MENU_BELOW_GAP_PX,
  }
}

/** Följer appens menyknapp medan `active` (ingen värdspelare monterad). */
export function useHostMenuClearSpot(anchorRef: RefObject<HTMLElement | null>, active: boolean): { left: number; top: number } | null {
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null)
  useEffect(() => {
    if (!active) { setSpot(null); return }
    const read = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const menu = document.querySelector<HTMLElement>(HOST_MENU_SELECTOR)
      const a = anchor.getBoundingClientRect()
      const scale = anchor.offsetWidth > 0 && a.width > 0 ? a.width / anchor.offsetWidth : 1
      const next = menuClearSpot(a, menu ? menu.getBoundingClientRect() : null, scale)
      setSpot((prev) => (prev?.left === next?.left && prev?.top === next?.top ? prev : next))
    }
    read()
    // Knappen kan flyttas (dras till ett annat hörn), monteras sent eller döljas.
    const timer = window.setInterval(read, 500)
    window.addEventListener('resize', read)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', read)
      setSpot(null)
    }
  }, [anchorRef, active])
  return spot
}
