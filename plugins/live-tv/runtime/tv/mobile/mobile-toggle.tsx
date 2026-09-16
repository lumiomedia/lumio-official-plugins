import { MT } from './mobile-tokens'

/**
 * Telefonens växel (handoffen §9): 44×26 med 20 px knopp, accent när den är
 * på. TV-scenens `Toggle` i `tv-ui.tsx` är 52×30 — för stor för en 56 px rad.
 * Ingen egen station: raden som bär växeln är tryckytan.
 */
export function MobileToggle({ on }: { on: boolean }) {
  return (
    <span data-on={on ? '1' : '0'} style={{ width: 44, height: 26, borderRadius: 999, background: on ? MT.acc : MT.s16, position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'left 120ms' }} />
    </span>
  )
}
