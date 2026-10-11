import type { CSSProperties } from 'react'
import { cardStyle, belowTitleBar, dp } from '../tv/tv-ui'

/*
  Ytorna i Sport läser EN uppsättning variabler som Sport-roten sätter medan
  en bakgrundsbild visas (`cardSurfaceVars` i backdrop.ts): `--sport-card-bg`
  och `--sport-card-blur`. Utan bild saknas de och varje yta faller tillbaka
  på sin vanliga färg — samma utseende som innan bakgrunden fanns.
*/

export const sportBg = (fallback: string): string => `var(--sport-card-bg, ${fallback})`
export const SPORT_CARD_BG = sportBg('rgba(252,252,255,0.07)')
export const SPORT_PANEL_BG = sportBg('#141519')

/** Grund + oskärpa för kort och paneler (raderna tar bara grunden: oskärpa per rad kostar). */
export const sportSurface = (fallback: string = SPORT_CARD_BG): CSSProperties => ({
  background: fallback,
  backdropFilter: 'var(--sport-card-blur, none)',
  WebkitBackdropFilter: 'var(--sport-card-blur, none)',
})

export const sportCardStyle: CSSProperties = { ...cardStyle, ...sportSurface() }

/**
 * EN lådyta för allt som öppnas ur Sport (matchinfo, Fel kanal?, Mina lag,
 * ligor, Alla sporter): samma bakgrund (Sport-kortvariabeln med bild, annars
 * TV.panel-färgen), kant och padding. Delade pickers tar den som `surface`.
 */
export const SPORT_DRAWER_PADDING = `${belowTitleBar(dp(28))} ${dp(32)}px ${dp(28)}px`
export const sportDrawerStyle: CSSProperties = {
  ...sportSurface(SPORT_PANEL_BG),
  borderLeft: '1px solid rgba(255,255,255,0.16)',
  padding: SPORT_DRAWER_PADDING,
  boxSizing: 'border-box',
}
