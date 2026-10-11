import { createElement, type ReactNode } from 'react'
import { dp } from '../../tv/tv-ui'
import type { SportKind } from '../sport-model'

/* Samma ritregler som `Icons` i tv-ui.tsx: 24-rutnät, stroke 1.8, rundade ändar. */
type IconProps = { size?: number; filled?: boolean }
const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const svg = (size: number, children: ReactNode, fill = false) =>
  createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', ...sw, fill: fill ? 'currentColor' : 'none' }, children)

export const SportIcons = {
  Ball: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 4.5h-5L8 10z" /><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5 17 19M9.5 14.5 7 19M8 10 3.5 8.5" /></>),
  Hockey: ({ size = dp(26) }: IconProps) => svg(size, <><path d="M4 4l8 12h6a2 2 0 0 0 0-4h-3" /><path d="M20 4 12 16" /><ellipse cx="7" cy="19" rx="3" ry="1.2" /></>),
  Basket: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8" /></>),
  Handball: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M7 5.5c2 3 2 10 0 13M17 5.5c-2 3-2 10 0 13M3.5 10h17M3.5 14h17" /></>),
  Flag: ({ size = dp(26) }: IconProps) => svg(size, <><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>),
  Tennis: ({ size = dp(26) }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M5 6c3 2 3 10 0 12M19 6c-3 2-3 10 0 12" /></>),
  Calendar: ({ size = dp(22) }: IconProps) => svg(size, <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>),
  Rows: ({ size = dp(22) }: IconProps) => svg(size, <path d="M4 7h16M4 12h16M4 17h16" />),
  /** Samma hjärta som Live TV:s favoriter (`Icons.Heart` i tv-ui.tsx): favoritlag och -ligor i Sport. */
  Heart: ({ size = dp(22), filled = false }: IconProps) => svg(size, <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />, filled),
  Bell: ({ size = dp(22) }: IconProps) => svg(size, <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  Plus: ({ size = dp(22) }: IconProps) => svg(size, <path d="M12 5v14M5 12h14" />),
  Play: ({ size = dp(22) }: IconProps) => svg(size, <path d="M8 5v14l11-7z" />, true),
}

export function SportIcon({ kind, size }: { kind: SportKind; size?: number }) {
  switch (kind) {
    case 'football': return <SportIcons.Ball size={size} />
    case 'hockey': return <SportIcons.Hockey size={size} />
    case 'basketball': return <SportIcons.Basket size={size} />
    case 'handball': return <SportIcons.Handball size={size} />
    case 'motorsport': return <SportIcons.Flag size={size} />
    case 'tennis': return <SportIcons.Tennis size={size} />
    default: return <SportIcons.Calendar size={size} />
  }
}
