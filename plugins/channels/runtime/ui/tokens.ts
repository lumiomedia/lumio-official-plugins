import type { CSSProperties } from 'react'

/**
 * Färger som konstanter. Bara hsl()/rgba() — aldrig oklch(), som WebView 83
 * (Shield, Fire TV) inte förstår. Inga gradienter: appens svarta grund och
 * glasytor ovanpå (samma värden som appens menypill och kort).
 */
export const C = {
  /** Appens grund (--base-950, följer temat; svart som standard). */
  base: 'rgb(var(--base-950, 5 5 7))',
  /** Ogenomskinlig yta för klistrade kolumner på mobil (måste täcka det som rullar under). */
  solid: 'hsl(240 6% 8%)',
  solidSelected: 'hsl(240 5% 12%)',
  text: 'hsl(210 40% 98%)', // #f8fafc
  textSoft: 'hsl(213 27% 84%)', // #cbd5e1
  textDim: 'hsl(215 20% 65%)', // #94a3b8
  textMute: 'hsl(215 16% 47%)', // #64748b
  accent: 'hsl(15 87% 66%)', // #f4845f
  accentLight: 'hsl(33 89% 69%)', // #f7b267
  /** Text på accentfärgad yta. */
  onAccent: 'hsl(15 60% 8%)',
  /** Pillren och knapparna: menypillrets glas (--mc-surface i appen). */
  pillBorder: 'rgba(255,255,255,0.1)',
  pillBg: 'rgba(235,235,240,0.14)',
  /** Kort, block och rader: svag vit fyllnad + hårfin kant. */
  glass: 'rgba(255,255,255,0.06)',
  glassHover: 'rgba(255,255,255,0.1)',
  glassBorder: 'rgba(255,255,255,0.1)',
  /** OSD och paneler över bild/video. */
  osdBg: 'rgba(18,18,22,0.72)',
  /** Platt mörkning över en bakgrundsbild (ingen gradient). */
  scrim: 'rgba(0,0,0,0.58)',
} as const

/**
 * Appens glasyta: fyllnad, hårfin kant och blur. TV-läget får ingen blur
 * (appen stänger av den där; svaga TV-GPU:er ritar om den varje bildruta).
 * `blur: 0` för ytor som ligger på svart grund där inget syns bakom.
 */
export function glass(isTv: boolean, opts: { fill?: string; blur?: number } = {}): CSSProperties {
  const px = isTv ? 0 : opts.blur ?? 16
  const filter = px > 0 ? `blur(${px}px)` : 'none'
  return {
    background: opts.fill ?? C.glass,
    border: `1px solid ${C.glassBorder}`,
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
  }
}

/**
 * Hur långt ned sidans översta rad ska börja: under appens menypill
 * (hörnlinjen + pillrets 42 px + luft). Högra hörnet lämnas tomt — där ritar
 * appen klocka och hälsning.
 */
export function belowMenuPill(isTv: boolean, isMobile: boolean): string {
  if (isTv) return 'calc(5.25rem + var(--tv-scene-top-inset, 0px))'
  return `calc(var(--page-top-line, 1rem) + ${isMobile ? 66 : 58}px)`
}

export const FONT = {
  ui: '"Avenir Next", system-ui, -apple-system, "Segoe UI", sans-serif',
  title: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const

export const RADIUS = { chip: 8, card: 10, osd: 18, pill: 999 } as const

/** Fontstorlek: px på skrivbord/mobil, rem på TV (TV-scenen skalar rem, inte px). */
export const fontSize = (px: number, tv: boolean): string => (tv ? `${px / 16}rem` : `${px}px`)
