'use client'

import { useEffect, useLayoutEffect, type RefObject } from 'react'

/*
  RADORDNINGEN PÅ TV (Jerry 2026-10-12): ▾ går ALLTID till NÄSTA rad och dess
  FÖRSTA stopp från vänster — inte till det som råkar stå rakt under (från
  "Visa som" längst till höger hoppade geometrin förbi dagstegaren, sport-
  chipsen och Dina lag). ▴ speglar det: föregående rad, första stoppet.
  Undantag: rutnät (`data-grid`: Matcher-rutnätet, truppen, Mina lag-korten)
  där ▴▾ går rakt upp/ner — där får motorns geometri styra. ◂▸ rörs inte.

  Raderna räknas efter varje ritning: stopp vars lodräta mitt ligger inom
  samma band är en rad. Varje kolumn (`data-col`) och varje lager
  (`data-panel-root`) är ett eget rum — en rad i högerkolumnen leder aldrig
  ner i vänsterkolumnen. Grannar som någon annan satt står kvar; de som sätts
  här märks `data-f-down-auto="row"`/`data-f-up-auto="row"` och räknas om.
*/

const AUTO = 'row'
let seq = 0

function scopeOf(el: HTMLElement, root: HTMLElement): HTMLElement {
  return el.parentElement?.closest<HTMLElement>('[data-col], [data-panel-root]') ?? root
}

function idOf(el: HTMLElement): string {
  let id = el.getAttribute('data-row-id')
  if (!id) { id = `r${++seq}`; el.setAttribute('data-row-id', id) }
  return `[data-row-id="${id}"]`
}

function setLink(el: HTMLElement, attr: 'data-f-down' | 'data-f-up', target: HTMLElement | null) {
  const flag = `${attr}-auto`
  const mine = el.getAttribute(flag) === AUTO
  if (el.hasAttribute(attr) && !mine) return
  if (target) { el.setAttribute(attr, idOf(target)); el.setAttribute(flag, AUTO) }
  else if (mine) { el.removeAttribute(attr); el.removeAttribute(flag) }
}

export function markRowNeighbours(root: HTMLElement): void {
  const scopes = new Map<HTMLElement, Array<{ el: HTMLElement; top: number; bottom: number; mid: number; left: number }>>()
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-f]'))) {
    // Rutnät: rakt upp och ner, motorns geometri.
    if (el.closest('[data-grid]')) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    const scope = scopeOf(el, root)
    const list = scopes.get(scope) ?? []
    list.push({ el, top: r.top, bottom: r.bottom, mid: r.top + r.height / 2, left: r.left })
    scopes.set(scope, list)
  }
  for (const list of scopes.values()) {
    list.sort((a, b) => a.mid - b.mid || a.left - b.left)
    const rows: Array<{ top: number; bottom: number; items: typeof list }> = []
    for (const s of list) {
      const row = rows[rows.length - 1]
      if (row && s.mid >= row.top && s.mid <= row.bottom) { row.items.push(s); row.top = Math.min(row.top, s.top); row.bottom = Math.max(row.bottom, s.bottom) }
      else rows.push({ top: s.top, bottom: s.bottom, items: [s] })
    }
    const first = (i: number) => (rows[i] ? rows[i].items.reduce((a, b) => (b.left < a.left ? b : a)).el : null)
    rows.forEach((row, i) => {
      for (const s of row.items) {
        setLink(s.el, 'data-f-down', first(i + 1))
        setLink(s.el, 'data-f-up', first(i - 1))
      }
    })
  }
}

/** Räknar om raderna efter varje ritning, när innehållet byts och när fönstret ändrar storlek (bara TV). */
export function useRowNeighbours(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useLayoutEffect(() => { if (enabled && ref.current) markRowNeighbours(ref.current) })
  useEffect(() => {
    const root = ref.current
    if (!enabled || !root) return
    let frame = 0
    const run = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => markRowNeighbours(root)) }
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(run) : null
    mo?.observe(root, { childList: true, subtree: true })
    window.addEventListener('resize', run)
    return () => { cancelAnimationFrame(frame); mo?.disconnect(); window.removeEventListener('resize', run) }
  }, [ref, enabled])
}
