import { useEffect, type RefObject } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'

/**
 * RAD-FÖR-RAD-NAVIGERING MED FJÄRRKONTROLL I PLUGINETS INSTÄLLNINGSSEKTION.
 *
 * Appens fokusmotor väljer nästa station geometriskt. I en inställningssida
 * där varje korts knappar ligger högerställda och fälten vänsterställda blir
 * "nedåt" därför ett hopp till närmaste knapp i samma kolumn — flera kort
 * ned, förbi Kategorier, Hämta lista och Bygg bibliotek (Jerry 2026-09-24:
 * "den går inte linjärt neråt").
 *
 * Motorn kan styras per element med `data-f-up/-down` (CSS-väljare, första
 * synliga träffen). Den här kroken räknar ut ordningen själv: varje station i
 * sektionen får ett löpnummer, stationer på samma rad grupperas, "nedåt"
 * pekar på FÖRSTA stationen i nästa rad och "uppåt" på första i föregående.
 * Vänster/höger lämnas åt geometrin, som är rätt inom en rad.
 *
 * Rad = samma föräldraelement, eller samma överkant i layouten när den
 * finns (testmiljön har ingen layout). Öppna paneler (`data-panel-root`,
 * t.ex. tangentbordet) är egna fokusrötter och lämnas utanför. Första radens
 * "uppåt" och sista radens "nedåt" sätts inte, så fokus kan lämna sektionen
 * till appens egna inställningar som förut.
 *
 * Attribut som författaren satt själv (utan `data-tv-auto`) respekteras.
 */
const SEQ_ATTR = 'data-tv-seq'
const AUTO_ATTR = 'data-tv-auto'

function stationsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-f]')).filter((el) => {
    if (el.hasAttribute('disabled')) return false
    const panel = el.closest('[data-panel-root]')
    return !panel || panel === root || !root.contains(panel)
  })
}

function sameRow(a: HTMLElement, b: HTMLElement): boolean {
  if (a.parentElement && a.parentElement === b.parentElement) return true
  const ra = a.getBoundingClientRect()
  const rb = b.getBoundingClientRect()
  if (ra.height === 0 && rb.height === 0) return false
  return Math.abs(ra.top - rb.top) < 8
}

export function applyLinearTvNav(root: HTMLElement, prefix: string): void {
  const stations = stationsOf(root)
  const rows: HTMLElement[][] = []
  for (const el of stations) {
    const last = rows[rows.length - 1]
    if (last && sameRow(last[last.length - 1], el)) last.push(el)
    else rows.push([el])
  }
  stations.forEach((el, index) => el.setAttribute(SEQ_ATTR, `${prefix}:${index}`))
  const selectorFor = (el: HTMLElement) => `[${SEQ_ATTR}="${el.getAttribute(SEQ_ATTR)}"]`
  rows.forEach((row, rowIndex) => {
    const upTarget = rowIndex > 0 ? rows[rowIndex - 1][0] : null
    const downTarget = rowIndex < rows.length - 1 ? rows[rowIndex + 1][0] : null
    for (const el of row) {
      const auto = (el.getAttribute(AUTO_ATTR) ?? '').split(',').filter(Boolean)
      const owned = new Set(auto)
      for (const [dir, target] of [['up', upTarget], ['down', downTarget]] as const) {
        const attr = `data-f-${dir}`
        const authored = el.hasAttribute(attr) && !owned.has(dir)
        if (authored) continue
        if (target) {
          el.setAttribute(attr, selectorFor(target))
          owned.add(dir)
        } else if (owned.has(dir)) {
          el.removeAttribute(attr)
          owned.delete(dir)
        }
      }
      if (owned.size > 0) el.setAttribute(AUTO_ATTR, [...owned].join(','))
      else el.removeAttribute(AUTO_ATTR)
    }
  })
}

export function clearLinearTvNav(root: HTMLElement): void {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(`[${AUTO_ATTR}]`))) {
    for (const dir of (el.getAttribute(AUTO_ATTR) ?? '').split(',')) if (dir) el.removeAttribute(`data-f-${dir}`)
    el.removeAttribute(AUTO_ATTR)
    el.removeAttribute(SEQ_ATTR)
  }
}

export function useLinearTvNav(rootRef: RefObject<HTMLElement | null>, prefix = 'live-tv-settings'): void {
  const isTv = useTvMode()
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!isTv) {
      clearLinearTvNav(root)
      return
    }
    let frame: number | null = null
    const schedule = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        applyLinearTvNav(root, prefix)
      })
    }
    applyLinearTvNav(root, prefix)
    const observer = new MutationObserver((records) => {
      // Våra egna attributskrivningar ska inte trigga en ny omräkning.
      if (records.every((r) => r.type === 'attributes' && (r.attributeName ?? '').startsWith('data-tv-') || (r.type === 'attributes' && (r.attributeName ?? '').startsWith('data-f-')))) return
      schedule()
    })
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-f', 'disabled', 'data-tv-seq', 'data-f-up', 'data-f-down'] })
    window.addEventListener('resize', schedule)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      if (frame !== null) window.cancelAnimationFrame(frame)
      clearLinearTvNav(root)
    }
  }, [rootRef, isTv, prefix])
}
