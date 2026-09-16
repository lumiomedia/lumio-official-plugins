import { useEffect, useRef, type ReactNode } from 'react'
import type { TvGlassMenuAction } from '@/lib/plugin-sdk'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { MT, ellipsis } from './mobile-tokens'

export interface MobileSheetProps {
  title: ReactNode
  subtitle?: ReactNode
  /** t.ex. <MobileLogo …/> 56×38 */
  art?: ReactNode
  /** Fri text/beskrivning under huvudet (Task 8: programark, kanalinfo-ark). */
  body?: ReactNode
  /** SAMMA typ som värdens glasmeny */
  items: TvGlassMenuAction[]
  onClose: () => void
  pushLayer: (close: () => void) => () => void
  testId?: string
}

/**
 * Telefonens bottenark: ersätter TV-scenens glasmeny på telefonbredd.
 * Registrerar sig som ETT lager hos skalet (`pushLayer`) så maskinvarans/
 * appens Bakåt stänger arket i stället för att lämna skärmen — samma mönster
 * som skalets övriga lager (kanalväljare, spellistmeny).
 */
export function MobileSheet({ title, subtitle, art, body, items, onClose, pushLayer, testId }: MobileSheetProps) {
  const { tt } = useTvText()
  // Alltid senaste onClose i lagrets stängningsfunktion, utan att effekten
  // (och därmed pushLayer/off-paret) körs om varje gång föräldern skickar en
  // ny inline-funktion.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  // Ingen egen Escape-lyssnare: skalet (`tv-shell.tsx`) äger REDAN en enda
  // capture-fas-lyssnare för Bakåt/Escape och ropar toppens `pushLayer`-close
  // (registreringen ovan). En andra lyssnare här hade kört `onClose` två
  // gånger så fort arket satt monterat i skalet.
  useEffect(() => pushLayer(() => onCloseRef.current()), [pushLayer])
  return (
    <>
      <div data-testid="sheet-scrim" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: MT.scrim }} />
      <div
        role="dialog"
        aria-modal="true"
        data-testid={testId ?? 'mobile-sheet'}
        data-live-tv-layer=""
        data-panel-root=""
        style={{
          position: 'fixed', left: 8, right: 8, bottom: 8, zIndex: 71, borderRadius: 26,
          background: MT.sheet, border: `1px solid ${MT.line10}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.6)',
          color: MT.text, fontFamily: MT.font, overflow: 'hidden', paddingBottom: MT.SAFE_BOTTOM,
        }}
      >
        <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${MT.line08}` }}>
          {art ? <div style={{ flexShrink: 0 }}>{art}</div> : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, ...ellipsis }}>{title}</div>
            {subtitle ? <div style={{ fontSize: 13, color: MT.muted, ...ellipsis }}>{subtitle}</div> : null}
          </div>
        </div>
        {body ? <div data-testid="sheet-body" style={{ padding: '12px 20px', fontSize: 14, color: MT.muted, maxHeight: '30vh', overflow: 'auto' }}>{body}</div> : null}
        <div data-scroll="" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {items.map((item, index) => (
            <div
              key={item.key}
              data-sheet-item=""
              {...station(() => { item.run(); onClose() }, undefined, index === 0 ? { 'data-init': '' } : undefined)}
              style={{
                minHeight: 56, padding: '0 20px', display: 'flex', alignItems: 'center', fontSize: 16,
                fontWeight: index === 0 ? 600 : 400, borderBottom: `1px solid ${MT.line07}`, cursor: 'pointer',
              }}
            >
              <span style={{ flex: 1, ...ellipsis }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 8 }}>
          <div {...station(onClose)} style={{ minHeight: 50, borderRadius: 16, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            {tt('cancel')}
          </div>
        </div>
      </div>
    </>
  )
}
