import type { CSSProperties } from 'react'
import { TV, dp } from './tv-ui'
import { MT } from './mobile/mobile-tokens'

/**
 * SKALETS KORTA BESKED ("Film och serier förbereds …", "Tillagd i multiview").
 *
 * Telefonen fick en stor mörk CIRKEL över flik-raden (Jerry 2026-10-14): lagret
 * låg på `left: 50%` + `translateX(-50%)` UTAN egen bredd, så krymp-till-
 * innehåll-bredden begränsades till halva skärmen. Den långa texten bröts på
 * fyra–fem rader, och `borderRadius: 999` gjorde det höga blocket rundt. Det
 * låg dessutom `bottom: 40` — rakt över flik-raden.
 *
 * Nu: bredden följer texten (`max-content`) men aldrig bredare än skärmen
 * minus marginal, och radien är fast så ett radbrutet besked blir en rundad
 * ruta, aldrig en cirkel. Telefonen ritas i äkta px ovanför flik-raden.
 */
export function shellToastStyle(opts: { phone: boolean; tabBar: boolean }): CSSProperties {
  const base: CSSProperties = {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 80,
    boxSizing: 'border-box', width: 'max-content', textAlign: 'center',
    background: TV.glass, color: TV.text, pointerEvents: 'none',
  }
  if (opts.phone) {
    const bottomInset = `max(${MT.SAFE_BOTTOM}, var(--android-inset-bottom, 0px))`
    return {
      ...base,
      bottom: opts.tabBar ? `calc(${MT.TAB_BAR}px + ${bottomInset} + 12px)` : `calc(${bottomInset} + 16px)`,
      maxWidth: 'calc(100vw - 32px)',
      padding: '10px 16px', borderRadius: 14,
      fontSize: 14, lineHeight: 1.35, fontWeight: 500,
      background: MT.sheet, border: `1px solid ${MT.line10}`, boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
    }
  }
  return {
    ...base,
    bottom: dp(40),
    maxWidth: `calc(100% - ${dp(96)}px)`,
    padding: `${dp(12)}px ${dp(24)}px`,
    // Halva höjden av en rad (19 × 1.3 + 24): samma piller som förut när
    // beskedet ryms på en rad, en rundad ruta när det bryts.
    borderRadius: dp(24),
    fontSize: dp(19), lineHeight: 1.3,
  }
}
