'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { TvNav } from './tv-shell'
import { TV, belowTitleBar, dp, station } from './tv-ui'

/**
 * FLERVALSVÄLJAREN — `tv-channel-picker.tsx` med bock i stället för "välj och
 * stäng". Samma panelmönster: högerpanel, `data-panel-root` (motorns pilar
 * stannar i den), kategorichips i `data-row`, rader i `data-scroll`, öppnaren
 * fångad EN gång och `nav.pushLayer(close)` som enda Back-väg.
 *
 * Skillnaden mot enkelvalet är avsiktlig: man bockar i tio kanaler i rad, så
 * panelen får INTE stänga sig på varje OK.
 */
export function PickerPanel({
  nav,
  title,
  chips,
  rows,
  onClose,
  testId = 'list-picker',
  opener,
  surface,
  backButton,
}: {
  nav: TvNav
  title: string
  chips: ReactNode
  /**
   * Rader, eller en funktion som får panelens `close` — DEN stängning som
   * lagret registrerade (ropar `onClose` OCH lämnar tillbaka fokus till
   * öppnaren). Ett val i envalspanelen ska gå den vägen: ropar man `onClose`
   * själv rivs panelen med fokus kvar på en borttagen rad → body, och
   * fjärren står stilla tills man klickar med mus.
   */
  rows: ReactNode | ((close: () => void) => ReactNode)
  onClose: () => void
  testId?: string
  /**
   * Stationen som fokus ska tillbaka till. Utan den är det den som hade fokus
   * vid öppningen — men öppnas panelen ur en ANNAN panel (guidens
   * kategoriväljare → "Alla grupper") är den raden redan riven, och fokus
   * hade landat på body.
   */
  opener?: HTMLElement | null
  /** Sport: samma ytvariabler/kant/padding som matchlådan (`sportDrawerStyle`). Utan den: oförändrat utseende. */
  surface?: CSSProperties
  /**
   * En synlig ‹ före rubriken som stänger panelen (samma väg som Bakåt).
   * För paneler som öppnas ur en annan panel: med mus eller finger fanns
   * annars ingen synlig väg tillbaka (Jerry 2026-10-23).
   */
  backButton?: string
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<(() => void) | null>(null)
  // Senaste `nav`/`onClose` i refar. Effekten nedan får BARA köra en gång per
  // öppning: `nav` bytte identitet vid varje omrender av skalet (minuttick,
  // lagringsändring), och då kördes effekten om — den läste om "vem öppnade
  // mig" från det fokus som råkade gälla just då (ett kort inne i väljaren)
  // och flyttade tillbaka fokus till [data-init]. Resultatet var att markören
  // hoppade hem varje minut och att Back landade i väljaren i stället för hos
  // den station som öppnade den.
  const navRef = useRef(nav)
  const onCloseRef = useRef(onClose)
  useEffect(() => { navRef.current = nav; onCloseRef.current = onClose })

  const openerPropRef = useRef(opener)
  useEffect(() => {
    openerRef.current = openerPropRef.current ?? (document.activeElement as HTMLElement | null)
    const close = () => { onCloseRef.current(); window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0) }
    closeRef.current = close
    const off = navRef.current.pushLayer(close)
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [])

  return (
    <div
      ref={rootRef}
      data-testid={testId}
      data-panel-root=""
      data-live-tv-layer=""
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(640)}px, 100%)`, zIndex: 60, background: TV.panel, borderLeft: `1px solid ${TV.line}`, padding: `${belowTitleBar(dp(34))} ${dp(32)}px ${dp(34)}px`, display: 'flex', flexDirection: 'column', gap: dp(18), boxSizing: 'border-box', ...surface }}
    >
      {backButton ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
          <div
            {...station(() => closeRef.current?.())}
            data-testid={`${testId}-back`}
            aria-label={backButton}
            style={{ width: dp(44), height: dp(44), flexShrink: 0, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: TV.s06, cursor: 'pointer' }}
          >
            <svg width={dp(22)} height={dp(22)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
          </div>
          <div style={{ fontSize: dp(28), fontWeight: 600, minWidth: 0 }}>{title}</div>
        </div>
      ) : (
        <div style={{ fontSize: dp(28), fontWeight: 600 }}>{title}</div>
      )}
      {chips}
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{typeof rows === 'function' ? rows(() => closeRef.current?.()) : rows}</div>
    </div>
  )
}

/** Bocken. Enda återkopplingen i flervalsläget — raden ligger kvar. */
export function Check({ on, label }: { on: boolean; label: string }) {
  if (!on) return <span style={{ width: dp(28), flexShrink: 0 }} />
  return (
    <span data-testid={`picker-check-${label}`} style={{ width: dp(28), flexShrink: 0, color: TV.acc, fontSize: dp(22), textAlign: 'center' }}>✓</span>
  )
}
