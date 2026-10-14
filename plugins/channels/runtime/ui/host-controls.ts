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
