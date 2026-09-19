import type { ReactNode } from 'react'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { MT, ellipsis } from './mobile-tokens'
import { MIcons } from './mobile-icons'

/**
 * Sidhuvudet i telefongrenen. `HEADER_LEFT` (60 px) är värdens menychip —
 * `back`-knappen läggs FÖRE titeln men INOM det utrymmet räknas den inte
 * in: den ligger direkt efter (station() flyttar den inte till vänster om
 * menychipet, den delar bara raden med titeln).
 */
export function MobileHeader({ title, right, back, onBack, testId }: { title: ReactNode; right?: ReactNode; back?: boolean; onBack?: () => void; testId?: string }) {
  const { tt } = useTvText()
  return (
    <div
      data-testid={testId}
      style={{
        // Höjden är innehållets 52 px PLUS systemradens inset: `height` ensamt
        // hade lagt rubriken under kamerahålet (se MT.SAFE_TOP_GUARD).
        minHeight: `calc(${MT.HEADER_H}px + ${MT.SAFE_TOP_GUARD})`,
        flexShrink: 0,
        padding: `${MT.SAFE_TOP_GUARD} ${MT.PAD}px 0 ${MT.HEADER_LEFT}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {back ? (
        <div
          {...station(onBack ?? (() => {}), undefined, { 'aria-label': tt('back'), 'data-testid': 'header-back' })}
          style={{ width: 40, height: 40, minHeight: 40, borderRadius: 999, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
        >
          <MIcons.CaretLeft />
        </div>
      ) : null}
      <div style={{ flex: 1, fontSize: 21, fontWeight: 600, ...ellipsis }}>{title}</div>
      {right ? <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div> : null}
    </div>
  )
}
