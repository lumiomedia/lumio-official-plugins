'use client'

import { useEffect, useLayoutEffect, useRef, type FocusEvent, type ReactNode } from 'react'
import { SCENE_TOP_INSET, TV, dp, station } from '../../tv/tv-ui'
import type { TvNav } from '../../tv/tv-shell'
import { sportDrawerStyle } from '../surface'
import { SHEET_BG, usePhonePlatform } from '../mobile/phone-sport-sheet'

/*
  LAG- OCH LIGASIDANS YTA. Samma låda som matchinfon: högerlåda på
  skrivbordet, bottenark (92 %) på telefon — och i TV-läget en HELSIDA i två
  kolumner (Jerry 2026-10-12: lådan var för smal och texten för liten på en
  riktig TV). Varje sida är ett eget lager i Bakåt-kedjan och läggs OVANPÅ
  det som var öppet (matchinfon, en annan sida) — Bakåt stänger bara den
  översta och fokus går tillbaka till det man tryckte på.
*/

const SLIDE_CSS = '@keyframes lumio-sport-page-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }'

/**
 * Helsidans grannar mellan kolumnerna. Stationerna längst till höger i sin
 * rad i vänsterkolumnen pekar ▸ på stationen i högerkolumnen vars mitt ligger
 * närmast i höjd, och tvärtom för ◂. Chipsrader och rader inne i en kolumn
 * lämnas åt motorn (bara radens yttersta station får ett uttalat granne).
 */
export function markColumnNeighbours(root: HTMLElement, scope: string): void {
  const cols = { left: root.querySelector<HTMLElement>('[data-col="left"]'), right: root.querySelector<HTMLElement>('[data-col="right"]') }
  if (!cols.left || !cols.right) return
  const list = (col: HTMLElement) => Array.from(col.querySelectorAll<HTMLElement>('[data-f]'))
  const left = list(cols.left)
  const right = list(cols.right)
  ;[...left, ...right].forEach((el, i) => el.setAttribute('data-pid', `${el.closest('[data-col="left"]') ? 'L' : 'R'}${i}`))
  const mid = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { y: r.top + r.height / 2, x: r.left, x2: r.right, top: r.top } }
  const nearest = (from: HTMLElement, pool: HTMLElement[]) => {
    const y = mid(from).y
    return pool.reduce<HTMLElement | null>((best, el) => (!best || Math.abs(mid(el).y - y) < Math.abs(mid(best).y - y) ? el : best), null)
  }
  // Yttersta i raden: ingen annan station i samma kolumn står på samma höjd längre ut åt det hållet.
  const outermost = (el: HTMLElement, pool: HTMLElement[], side: 'right' | 'left') => {
    const m = mid(el)
    return !pool.some((o) => o !== el && Math.abs(mid(o).y - m.y) < 8 && (side === 'right' ? mid(o).x > m.x : mid(o).x < m.x))
  }
  // Grannar som sidan själv satt (t.ex. rubrikens serie ▸ hjärtat) står kvar; bara de satta här räknas om.
  const set = (el: HTMLElement, attr: 'data-f-right' | 'data-f-left', to: HTMLElement | null) => {
    const own = el.getAttribute(`${attr}-auto`) === '1'
    if (el.hasAttribute(attr) && !own) return
    if (to) { el.setAttribute(attr, `${scope} [data-pid="${to.getAttribute('data-pid')}"]`); el.setAttribute(`${attr}-auto`, '1') }
    else if (own) { el.removeAttribute(attr); el.removeAttribute(`${attr}-auto`) }
  }
  for (const el of left) set(el, 'data-f-right', outermost(el, left, 'right') ? nearest(el, right) : null)
  for (const el of right) set(el, 'data-f-left', outermost(el, right, 'left') ? nearest(el, left) : null)
}

/**
 * Helsidans yta. TÄT bakgrund: kortvariabeln (`--sport-card-bg`) är
 * genomskinlig medan en bakgrundsbild visas, och då lyste sportsidans rubrik
 * igenom upptill (Jerry 2026-10-12). Toppen börjar under värdens toppkrom
 * (menypillret; snabbmenyn och klockan viker när ett sportlager är öppet)
 * via `--tv-scene-chrome-inset`, samma indrag som sportsidans innehåll, plus
 * mac-titelraden. Luften runt innehållet gör att fokusringarna aldrig klipps.
 * Ingen intoning: under den lyste sidan bakom igenom.
 */
export const FULL_PAGE_BG = TV.panel
export const FULL_PAGE_PADDING = `calc(${dp(40)}px + var(--tv-scene-chrome-inset, 0px) + ${SCENE_TOP_INSET}) ${dp(72)}px 0`
/**
 * Helsidans rullyta BÖRJAR under rubriken och flikarna, som Sports egen
 * TV-rullyta: innehållet rullar aldrig in under menypillret (Jerry
 * 2026-10-12, raden "Racing de Santander" under pillret). Luft runt om så
 * att fokusringarna inte klipps mot rullytans kanter.
 */
export const FULL_PAGE_BODY_PADDING = `${dp(16)}px ${dp(12)}px ${dp(72)}px`

/** `head`: rubrik och flikar. På helsidan står de still ovanför rullytan; i lådan och arket rullar de med. */
export function SportPageDrawer({ nav, depth, phone, full = false, testId, label, onClose, head, children }: { nav: TvNav; depth: number; phone: boolean; full?: boolean; testId: string; label: string; onClose: () => void; head?: ReactNode; children: ReactNode }) {
  const platform = usePhonePlatform()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  // Lagret registreras EN gång per öppning (samma skäl som matchinfon och PickerPanel).
  const navRef = useRef(nav)
  const onCloseRef = useRef(onClose)
  useEffect(() => { navRef.current = nav; onCloseRef.current = onClose })

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    const close = () => {
      onCloseRef.current()
      window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0)
    }
    const off = navRef.current.pushLayer(close)
    // Sidans första fokus: det sidan märkt (Titta, Påminn mig), annars första stoppet.
    const t = window.setTimeout(() => {
      const root = rootRef.current
      ;(root?.querySelector<HTMLElement>('[data-init]') ?? root?.querySelector<HTMLElement>('[data-f]:not([aria-hidden="true"])'))?.focus({ preventScroll: true })
    }, 0)
    return () => { window.clearTimeout(t); off() }
  }, [])

  // Helsidan: grannarna mellan kolumnerna mäts efter varje ritning (sektionerna kommer allt eftersom).
  // Rubrikens stopp (serie, hjärta, klocka, stäng) går ▾ till den valda fliken, inte förbi flikraden.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const scope = `[data-page-depth="${depth}"]`
    if (full) markColumnNeighbours(root, scope)
    const tabs = root.querySelector('[data-tab-active]')
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-testid$="-head"] [data-f]'))) {
      if (tabs && (!el.hasAttribute('data-f-down') || el.hasAttribute('data-f-down-auto'))) { el.setAttribute('data-f-down', `${scope} [data-tab-active]`); el.setAttribute('data-f-down-auto', '1') }
      else if (!tabs && el.getAttribute('data-f-down-auto') === '1') { el.removeAttribute('data-f-down'); el.removeAttribute('data-f-down-auto') }
    }
  })

  // Fokus i rubriken eller flikarna rullar sidans innehåll hela vägen upp (som Sports egen rubrik).
  const onFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (!(event.target as HTMLElement).closest('[data-page-head], [data-testid="page-tabs"]')) return
    const scroller = full ? event.currentTarget.querySelector<HTMLElement>('[data-testid="page-scroll"]') : event.currentTarget
    if (scroller) scroller.scrollTop = 0
  }

  // Över matchinfon (59/60) och över sidan under.
  const z = 61 + depth * 2
  const surface = phone
    ? {
        position: 'fixed', left: 0, right: 0, bottom: 0, width: '100%', maxHeight: '92%', zIndex: z + 1, boxSizing: 'border-box', overflowY: 'auto',
        background: SHEET_BG, borderTop: '1px solid rgba(255,255,255,0.16)', borderRadius: platform === 'ios' ? '14px 14px 0 0' : '28px 28px 0 0',
        padding: '0 16px calc(max(env(safe-area-inset-bottom, 0px), var(--android-inset-bottom, 0px)) + 24px)',
      } as const
    : full
      ? { position: 'fixed', inset: 0, zIndex: z + 1, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: FULL_PAGE_BG, color: TV.text, padding: FULL_PAGE_PADDING } as const
      : { position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(760)}px, 100%)`, zIndex: z + 1, ...sportDrawerStyle, overflowY: 'auto', animation: 'lumio-sport-page-in 220ms ease-out' } as const
  return (
    <>
      <style>{SLIDE_CSS}</style>
      <div data-live-tv-layer="" aria-hidden="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: z, background: TV.scrim }} />
      <div ref={rootRef} data-testid={testId} data-layout={full ? 'page' : phone ? 'sheet' : 'drawer'} data-panel-root="" data-live-tv-layer="" {...(full ? {} : { 'data-scroll': '' })} role="dialog" aria-label={label} data-platform={phone ? platform : undefined} onFocusCapture={onFocusCapture} style={surface}>
        {phone ? (
          <div data-testid="page-grabber" {...station(onClose)} aria-hidden="true" style={{ position: 'sticky', top: 0, zIndex: 1, height: 22, margin: '0 -16px 4px', display: 'grid', placeItems: 'center', background: SHEET_BG, cursor: 'pointer' }}>
            <span style={{ width: platform === 'ios' ? 36 : 32, height: 5, borderRadius: 3, background: 'rgba(243,244,248,0.35)' }} />
          </div>
        ) : null}
        {full ? (
          <>
            {head ? <div data-page-head="" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: dp(20), padding: `0 ${dp(12)}px` }}>{head}</div> : null}
            <div data-testid="page-scroll" data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: FULL_PAGE_BODY_PADDING, display: 'flex', flexDirection: 'column', gap: dp(28) }}>{children}</div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: phone ? 16 : 20 }}>{head}{children}</div>
        )}
      </div>
    </>
  )
}
