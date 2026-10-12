'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { TV, dp, station } from '../../tv/tv-ui'
import type { TvNav } from '../../tv/tv-shell'
import { sportDrawerStyle } from '../surface'
import { SHEET_BG, usePhonePlatform } from '../mobile/phone-sport-sheet'

/*
  LAG- OCH LIGASIDANS YTA. Samma låda som matchinfon: högerlåda på TV och
  skrivbord, bottenark (92 %) på telefon. Varje sida är ett eget lager i
  Bakåt-kedjan och läggs OVANPÅ det som var öppet (matchinfon, en annan
  sida) — Bakåt stänger bara den översta och fokus går tillbaka till det
  man tryckte på.
*/

const SLIDE_CSS = '@keyframes lumio-sport-page-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }'

export function SportPageDrawer({ nav, depth, phone, testId, label, onClose, children }: { nav: TvNav; depth: number; phone: boolean; testId: string; label: string; onClose: () => void; children: ReactNode }) {
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

  // Över matchinfon (59/60) och över sidan under.
  const z = 61 + depth * 2
  const surface = phone
    ? {
        position: 'fixed', left: 0, right: 0, bottom: 0, width: '100%', maxHeight: '92%', zIndex: z + 1, boxSizing: 'border-box', overflowY: 'auto',
        background: SHEET_BG, borderTop: '1px solid rgba(255,255,255,0.16)', borderRadius: platform === 'ios' ? '14px 14px 0 0' : '28px 28px 0 0',
        padding: '0 16px calc(max(env(safe-area-inset-bottom, 0px), var(--android-inset-bottom, 0px)) + 24px)',
      } as const
    : { position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(760)}px, 100%)`, zIndex: z + 1, ...sportDrawerStyle, overflowY: 'auto', animation: 'lumio-sport-page-in 220ms ease-out' } as const
  return (
    <>
      <style>{SLIDE_CSS}</style>
      <div data-live-tv-layer="" aria-hidden="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: z, background: TV.scrim }} />
      <div ref={rootRef} data-testid={testId} data-panel-root="" data-live-tv-layer="" data-scroll="" role="dialog" aria-label={label} data-platform={phone ? platform : undefined} style={surface}>
        {phone ? (
          <div data-testid="page-grabber" {...station(onClose)} aria-hidden="true" style={{ position: 'sticky', top: 0, zIndex: 1, height: 22, margin: '0 -16px 4px', display: 'grid', placeItems: 'center', background: SHEET_BG, cursor: 'pointer' }}>
            <span style={{ width: platform === 'ios' ? 36 : 32, height: 5, borderRadius: 3, background: 'rgba(243,244,248,0.35)' }} />
          </div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: phone ? 16 : 20 }}>{children}</div>
      </div>
    </>
  )
}
