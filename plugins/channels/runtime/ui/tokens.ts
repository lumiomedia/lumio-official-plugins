/**
 * Handoffens färger som konstanter. Bara hsl()/rgba() — aldrig oklch(), som
 * WebView 83 (Shield, Fire TV) inte förstår.
 */
export const C = {
  base: 'hsl(229 63% 5%)', // #050816
  base2: 'hsl(218 55% 8%)', // #09111f
  base3: 'hsl(219 49% 10%)', // #0d1526
  text: 'hsl(210 40% 98%)', // #f8fafc
  textSoft: 'hsl(213 27% 84%)', // #cbd5e1
  textDim: 'hsl(215 20% 65%)', // #94a3b8
  textMute: 'hsl(215 16% 47%)', // #64748b
  accent: 'hsl(15 87% 66%)', // #f4845f
  accentLight: 'hsl(33 89% 69%)', // #f7b267
  pillBorder: 'rgba(255,255,255,0.14)',
  pillBg: 'rgba(255,255,255,0.04)',
  osdBg: 'rgba(5,8,22,0.7)',
  scrim: 'rgba(5,8,22,0.55)',
  shadow: '0 18px 70px rgba(0,0,0,0.45)',
} as const

export const FONT = {
  ui: '"Avenir Next", system-ui, -apple-system, "Segoe UI", sans-serif',
  title: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const

export const RADIUS = { chip: 8, card: 10, osd: 18, pill: 999 } as const

/** Fontstorlek: px på skrivbord/mobil, rem på TV (TV-scenen skalar rem, inte px). */
export const fontSize = (px: number, tv: boolean): string => (tv ? `${px / 16}rem` : `${px}px`)
