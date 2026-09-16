import type { CSSProperties } from 'react'

/**
 * Telefongrenens egna tokens: äkta CSS-px (ingen dp()/scenskalning här, se
 * spec fas 3). Egen tabell i stället för att återanvända `TV` i `tv-ui.tsx`
 * — den tabellen är TV-scenens och delar inte nödvändigtvis samma toner.
 */
export const MT = {
  bg: '#000', text: '#f3f4f8',
  muted: 'rgba(243,244,248,0.62)', muted70: 'rgba(243,244,248,0.7)', // Handoffets 70 % text på chips
  dim: 'rgba(243,244,248,0.45)', faint: 'rgba(243,244,248,0.4)',
  s05: 'rgba(252,252,255,0.05)', s06: 'rgba(252,252,255,0.06)', s07: 'rgba(252,252,255,0.07)', s08: 'rgba(252,252,255,0.08)',
  s10: 'rgba(252,252,255,0.10)', s12: 'rgba(252,252,255,0.12)', s14: 'rgba(252,252,255,0.14)', s16: 'rgba(252,252,255,0.16)',
  line07: 'rgba(255,255,255,0.07)', line08: 'rgba(255,255,255,0.08)', line10: 'rgba(255,255,255,0.10)', line14: 'rgba(255,255,255,0.14)', line20: 'rgba(255,255,255,0.2)',
  sheet: 'rgba(38,39,45,0.98)', scrim: 'rgba(0,0,0,0.6)',
  acc: 'rgb(var(--accent-500))', accMix: (pct: number) => `color-mix(in srgb, rgb(var(--accent-500)) ${pct}%, transparent)`, onAcc: '#fff',
  live: '#fb7185', liveSoft: 'rgba(251,113,133,0.22)', liveText: '#fecdd3',
  warnSoft: 'rgba(244,132,95,0.2)', warnText: '#f9c3ad',
  font: "'Avenir Next', 'Trebuchet MS', sans-serif",
  HIT: 44, PAD: 16, HEADER_H: 52, HEADER_LEFT: 60, TAB_BAR: 52,
  SAFE_BOTTOM: 'env(safe-area-inset-bottom, 18px)', SAFE_TOP: 'env(safe-area-inset-top, 0px)',
  /** Innehållets bottenluft så att sista raden inte hamnar under flik-raden. */
  SCROLL_PAD_BOTTOM: 96,
} as const

/** Ett textblock i en rad: krymper, klipps med ellips, tar aldrig fast bredd. */
export const ellipsis: CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
export const clamp2: CSSProperties = { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }
export const sectionLabel: CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: MT.dim }
