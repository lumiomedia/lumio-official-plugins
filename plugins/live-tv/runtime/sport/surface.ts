import type { CSSProperties } from 'react'
import { cardStyle } from '../tv/tv-ui'

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
