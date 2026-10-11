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
  // --sport-drawer-bg: som kortytan, men minst 85 % i TV-läget där oskärpan saknas.
  ...sportSurface(`var(--sport-drawer-bg, ${SPORT_PANEL_BG})`),
  borderLeft: '1px solid rgba(255,255,255,0.16)',
  padding: SPORT_DRAWER_PADDING,
  boxSizing: 'border-box',
}

/**
 * Lådor som öppnas OVANPÅ matchlådan (Fel kanal?): helt täta, på alla
 * plattformar — annars läser matchlådans text igenom (Jerry 2026-10-11).
 */
export const sportStackedStyle: CSSProperties = {
  ...sportDrawerStyle,
  background: '#141519',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

/**
 * EN fokusmarkering i Sport (Jerry 2026-10-11: "ram i ram" på flikarna). Den
 * vanliga ringen (TvFocusStyle: outline) får stå ensam: kontrollens egen kant
 * eller understrykning och glöd-/inset-skuggor (appens generella TV-ring)
 * tas bort medan den har fokus. Bara med fjärr/tangentbord — med pekare syns
 * ingen ring, och då står kontrollens egen kant kvar. Telefonen ritar ingen ring.
 */
const SPORT_FOCUSED = ':root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-sport-stage] [data-f]'
const SPORT_PANEL_FOCUSED = ':root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]):not([data-live-tv-desktop="1"]) [data-sport-stage] [data-panel-root] [data-f]'
/*
  Lådornas listor (Mina lag-väljaren, matchinfo, ligorna) rullar kant i kant
  med sina rader, och ringen ritas 3 px UTANFÖR raden — sidorna klipptes bort
  och bara över- och underkanten syntes (Jerry 2026-10-11: "border syns inte
  på sidorna på TV-mode"). I lådorna ritas ringen därför innanför kanten,
  som skrivbordets tunna ring (TvFocusStyle).
*/
export const SPORT_FOCUS_CSS = `${SPORT_FOCUSED}:focus, ${SPORT_FOCUSED}[data-fcur="1"] { box-shadow: none !important; border-color: transparent !important; }
${SPORT_PANEL_FOCUSED}:focus, ${SPORT_PANEL_FOCUSED}[data-fcur="1"] { outline-offset: -2px !important; }`
