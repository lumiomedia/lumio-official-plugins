'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import type { TvNav } from './tv-shell'
import { TV, belowTitleBar, dp } from './tv-ui'

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
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(640)}px, 100%)`, zIndex: 60, background: TV.panel, borderLeft: `1px solid ${TV.line}`, padding: `${belowTitleBar(dp(34))} ${dp(32)}px ${dp(34)}px`, display: 'flex', flexDirection: 'column', gap: dp(18) }}
    >
      <div style={{ fontSize: dp(28), fontWeight: 600 }}>{title}</div>
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
