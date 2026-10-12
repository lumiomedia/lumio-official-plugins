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
/** Den täta lådytan: matchlådans ton som hel färg (`--sport-drawer-solid`, backdrop.ts), utan bild panelfärgen. */
export const SPORT_SOLID_BG = 'var(--sport-drawer-solid, #141519)'
export const sportStackedStyle: CSSProperties = {
  ...sportDrawerStyle,
  background: SPORT_SOLID_BG,
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

/**
 * SPORTS FOKUSMARKERING (Jerry 2026-10-12, samma spec som appens pass): ingen
 * yttre ring som klipps eller hamnar snett. Fokus = accenttonad bakgrund
 * (accent 18 % ovanpå elementets egen) och en 2 px accentkant INNANFÖR
 * elementet (inset-skugga, följer elementets hörn), 120 ms övergång. Bara
 * med fjärr/tangentbord — med pekare ingenting — och aldrig på telefonen.
 *
 * Sorter (`focusAttr(kind)` på stationen):
 *  - standard (rader, kort, knappar): ton + kant
 *  - `card`: ton + kant + lätt förstoring (1,02)
 *  - `circle`: brickan (cirkel + namn) får INGENTING — bara cirkeln inuti
 *    (`data-focus-circle`) får 3 px accentkant och tonen; namnet blir vitt
 *  - `tab` / chips (`data-live-tv-chip`): ton + kant, texten VIT (inte
 *    accentfärgad, Jerry 2026-10-12); flikens understrykning betyder vald
 *  - `table-row`: bara ton; egen markerad rad (`data-mark="1"`) behåller
 *    sin ton och får kanten
 *  - `on-accent`: accentfyllda knappar (Titta): accent på accent syns inte —
 *    3 px nästan vit kant innanför och en lätt ljusning (Jerry 2026-10-12)
 *  - `none`: ingen egen markering (raden runt omkring, `data-focus-row`,
 *    markeras i stället — "Just nu"-raderna)
 */
export type FocusKind = 'card' | 'circle' | 'tab' | 'table-row' | 'none' | 'on-accent'
export const focusAttr = (kind: FocusKind): Record<string, string> => ({ 'data-focus': kind })

const ACC = 'rgb(var(--accent-500))'
const TINT = `color-mix(in srgb, ${ACC} 18%, transparent)`
const ON = ':root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-sport-stage]'
/** `inner`: ett barn till stationen (t.ex. cirkeln) — läggs på VARJE del av listan, inte bara den sista. */
const F = (extra = '', inner = '') => [`${ON} [data-f]${extra}:focus${inner}`, `${ON} [data-f]${extra}[data-fcur="1"]${inner}`].join(', ')
// Två regler, inte en lista: en WebView utan :has() slänger hela regeln annars (se lumio-has-selector-flags).
const ROW_DECL = `{ box-shadow: inset 0 0 0 2px ${ACC} !important; background-image: linear-gradient(${TINT}, ${TINT}) !important; }`

export const SPORT_FOCUS_CSS = `
${ON} [data-f], ${ON} [data-focus-row], ${ON} [data-focus-circle] { transition: background-color 120ms ease-out, box-shadow 120ms ease-out, transform 120ms ease-out, color 120ms ease-out; }
${F()} { outline: none !important; border-color: transparent !important; box-shadow: inset 0 0 0 2px ${ACC} !important; background-image: linear-gradient(${TINT}, ${TINT}) !important; }
${F('[data-focus="card"]')} { transform: scale(1.02); }
${F('[data-focus="on-accent"]')} { box-shadow: inset 0 0 0 3px rgba(255,255,255,0.92) !important; background-image: linear-gradient(rgba(255,255,255,0.14), rgba(255,255,255,0.14)) !important; }
${F('[data-focus="circle"]')}, ${F('[data-focus="none"]')} { outline: none !important; box-shadow: none !important; background-image: none !important; background-color: transparent !important; transform: none !important; }
${F('[data-focus="circle"]')} { color: #fff !important; }
/* Ringen utanför cirkelns kant (skuggan målas utanför, så märket inuti täcker den aldrig); ersätter live-/idag-ringen medan fokus står där. */
${F('[data-focus="circle"]', ' [data-focus-circle]')} { box-shadow: 0 0 0 3px ${ACC} !important; background-image: linear-gradient(${TINT}, ${TINT}) !important; border-radius: 999px; }
${F('[data-focus="tab"]')}, ${F('[data-live-tv-chip]')} { color: #f3f4f8 !important; }
${F('[data-live-tv-chip][data-chip-on="1"]')} { color: #12152a !important; }
${F('[data-focus="table-row"]')} { box-shadow: none !important; }
${F('[data-focus="table-row"][data-mark="1"]')} { box-shadow: inset 0 0 0 2px ${ACC} !important; }
${ON} [data-focus-row]:focus-within ${ROW_DECL}
${ON} [data-focus-row]:has([data-fcur="1"]) ${ROW_DECL}
`
