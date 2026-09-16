import { createElement, type ReactNode } from 'react'

/**
 * Telefonens ikonuppsättning: samma `svg()`-mönster som `Icons` i
 * `tv-ui.tsx` (Phosphor-regular, 24-rutnät, stroke 1.8) men en egen tabell —
 * telefongrenen behöver fler former (List, Gear, CaretRight/Down …) än
 * TV-scenens `Icons` exporterar, och formerna nedan är förenklade tecknade
 * varianter, inte pixelexakta Phosphor-spår (inga bildtester finns).
 */
type IconProps = { size?: number; filled?: boolean }
const svg = (size: number, children: ReactNode, filled?: boolean) =>
  createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const },
    children,
  )

export const MIcons = {
  House: ({ size = 22, filled = false }: IconProps) => svg(size, <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>, filled),
  List: ({ size = 22 }: IconProps) => svg(size, <path d="M4 6h16M4 12h16M4 18h16" />),
  Heart: ({ size = 22, filled = false }: IconProps) => svg(size, <path d="M12 21s-7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21.3 12C19 16.4 12 21 12 21z" />, filled),
  MagnifyingGlass: ({ size = 22 }: IconProps) => svg(size, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  Gear: ({ size = 22 }: IconProps) => svg(size, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  CaretLeft: ({ size = 22 }: IconProps) => svg(size, <path d="M15 6l-6 6 6 6" />),
  CaretRight: ({ size = 22 }: IconProps) => svg(size, <path d="M9 6l6 6-6 6" />),
  CaretDown: ({ size = 22 }: IconProps) => svg(size, <path d="M6 9l6 6 6-6" />),
  Play: ({ size = 22 }: IconProps) => svg(size, <path d="M8 5v14l11-7z" />, true),
  SpeakerHigh: ({ size = 22 }: IconProps) => svg(size, <><path d="M4 9v6h4l6 5V4l-6 5H4z" /><path d="M17.5 8.5a5 5 0 0 1 0 7" /><path d="M20 6a8.5 8.5 0 0 1 0 12" /></>),
  SpeakerSlash: ({ size = 22 }: IconProps) => svg(size, <><path d="M4 9v6h4l6 5V4l-6 5H4z" /><path d="m16 9 5 6M21 9l-5 6" /></>),
  Bell: ({ size = 22, filled = false }: IconProps) => svg(size, <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>, filled),
  Lock: ({ size = 22, filled = false }: IconProps) => svg(size, <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, filled),
  SquaresFour: ({ size = 22 }: IconProps) => svg(size, <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>),
  ArrowsOut: ({ size = 22 }: IconProps) => svg(size, <><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></>),
  DotsThree: ({ size = 22 }: IconProps) => svg(size, <><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>, true),
  /** Handtaget för dragbara listor: tre korta horisontella streck. */
  ListHandle: ({ size = 22 }: IconProps) => svg(size, <><path d="M7 7h10M7 12h10M7 17h10" /></>),
  Plus: ({ size = 22 }: IconProps) => svg(size, <path d="M12 5v14M5 12h14" />),
  X: ({ size = 22 }: IconProps) => svg(size, <path d="M6 6l12 12M18 6 6 18" />),
}
