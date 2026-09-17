'use client'

import { useEffect, useRef, type CSSProperties, type JSX } from 'react'
import { TV, station, type StationProps } from './tv-ui'
import { useTvText } from './tv-strings'
import type { GuideSelection } from './guide-types'

/**
 * Delat mellan den städade guidens vyer (Grid, Now / Next, Timeline):
 * hovringsmarkeringen, pagineringsraden och små stilbitar. Egen fil så att
 * vyerna slipper importera varandra — och ALDRIG `guide-shell.tsx`, som
 * importerar vyerna (importcykel).
 */

/** Sidstorlek och steg för "Visa 80 fler" (handoffen "Paginering"). */
export const ROWS_STEP = 80
/** Hovringens fördröjning på skrivbord innan markeringen byter. */
export const HOVER_MS = 120

export const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

/** `data-init` som spridbart attribut — bara på EN station per vy. */
export const initAttr = (on: boolean) => (on ? { 'data-init': '' } : undefined)

/**
 * Stationens egen `onPointerLeave` (avbryter ett påbörjat håll) får inte
 * skrivas över av hovringens — båda ska köras. Utan detta hade ett håll som
 * gled ut ur raden fyrat glasmenyn ändå.
 */
export function withPointerLeave(props: StationProps, onLeave?: () => void): StationProps {
  if (!onLeave) return props
  const own = props.onPointerLeave as ((event: unknown) => void) | undefined
  return { ...props, onPointerLeave: (event: unknown) => { own?.(event); onLeave() } }
}

/**
 * Hovring på skrivbord (`!isTv`): `onPointerEnter` → 120 ms → `onSelect`,
 * och en pekare som lämnar raden innan dess avbryter utan att markera —
 * annars fladdrar panelen/bannern när musen sveper över listan. Fokus
 * flyttas aldrig av hovringen. På TV är kroken inert: där styr fokus.
 */
export function useHoverSelect(enabled: boolean, onSelect: (sel: GuideSelection) => void) {
  const timer = useRef<number | null>(null)
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => clear, [])
  if (!enabled) return { enter: undefined, leave: undefined }
  return {
    enter: (sel: GuideSelection) => {
      clear()
      timer.current = window.setTimeout(() => { timer.current = null; onSelect(sel) }, HOVER_MS)
    },
    leave: clear,
  }
}

/**
 * Pagineringsraden (handoffen "Paginering"): en VANLIG rad under listan
 * (52 px, `padding 0 20px`), aldrig en flytande pill över sista raden.
 * `testId` prefixar `-pagination`/`-show-more` per vy; `hint` är Grids
 * hjälptext till höger (Now / Next har ingen).
 */
export function GuidePaginationRow({ testId, shown, total, hasMore, onMore, hint }: {
  testId: string
  shown: number
  total: number
  hasMore: boolean
  onMore: () => void
  hint?: string
}): JSX.Element {
  const { tt } = useTvText()
  return (
    <div data-testid={`${testId}-pagination`} style={{ height: 52, minHeight: 52, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14, borderTop: `1px solid ${TV.line}`, boxSizing: 'border-box' }}>
      <span style={{ fontSize: 13, color: TV.dim, ...ellipsis }}>{tt('paginationRow', { shown, total })}</span>
      {hasMore ? (
        <div data-testid={`${testId}-show-more`} {...station(onMore)} style={{ height: 32, minHeight: 32, padding: '0 14px', borderRadius: 999, background: TV.s10, display: 'inline-flex', alignItems: 'center', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
          {tt('showMoreN', { n: ROWS_STEP })}
        </div>
      ) : null}
      {hint ? <span style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(243,244,248,0.35)', ...ellipsis }}>{hint}</span> : null}
    </div>
  )
}
