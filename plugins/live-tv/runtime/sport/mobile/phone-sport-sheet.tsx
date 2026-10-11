'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { isAndroidTauriEnv } from '@/lib/plugin-sdk'
import { station } from '../../tv/tv-ui'
import { MT } from '../../tv/mobile/mobile-tokens'
import { phonePlatform } from './phone-sport-model'

/*
  Sports bottenark på telefon (handoffen): fäst mot underkanten, handtag
  överst, plattformens hörn (iOS 14 / Android 28) och scrim .55. Ett lager i
  skalets Bakåt-kedja, som MobileSheet.
*/

export type PhonePlatform = 'ios' | 'android'

export function usePhonePlatform(): PhonePlatform {
  return phonePlatform(typeof navigator === 'undefined' ? '' : navigator.userAgent || '', isAndroidTauriEnv)
}

export const SHEET_BG = '#17181d'

export function PhoneSportSheet({ onClose, pushLayer, testId, max = '70%', children, label }: {
  onClose: () => void
  pushLayer: (close: () => void) => () => void
  testId: string
  /** Matchinfon får 92 %, övriga ark 70 % (handoffen). */
  max?: string
  label?: string
  children: ReactNode
}) {
  const platform = usePhonePlatform()
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  useEffect(() => pushLayer(() => onCloseRef.current()), [pushLayer])
  const ios = platform === 'ios'
  return (
    <>
      <div data-testid="sheet-scrim" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.55)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-testid={testId}
        data-platform={platform}
        data-live-tv-layer=""
        data-panel-root=""
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 71, maxHeight: max, boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: SHEET_BG, borderTop: '1px solid rgba(255,255,255,0.16)', borderRadius: ios ? '14px 14px 0 0' : '28px 28px 0 0',
          color: MT.text, fontFamily: MT.font, boxShadow: '0 -18px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div data-testid="sheet-grabber" {...station(onClose)} aria-hidden="true" style={{ height: 22, minHeight: 22, flexShrink: 0, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <span style={{ width: ios ? 36 : 32, height: 5, borderRadius: 3, background: 'rgba(243,244,248,0.35)' }} />
        </div>
        <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `0 16px calc(${MT.SAFE_BOTTOM_GUARD} + 28px)`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      </div>
    </>
  )
}

/** En valbar rad i ett ark: vald = vit yta och mörk text (handoffen). */
export function SheetRow({ on, onPress, testId, height = 52, children }: { on: boolean; onPress: () => void; testId?: string; height?: number; children: ReactNode }) {
  return (
    <div data-testid={testId} {...station(onPress)} aria-pressed={on ? 'true' : 'false'}
      style={{ minHeight: height, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', cursor: 'pointer', background: on ? MT.text : 'rgba(252,252,255,0.06)', color: on ? '#12152a' : MT.text }}>
      {children}
    </div>
  )
}

export const sheetTitle = { fontSize: 17, fontWeight: 600, flexShrink: 0 } as const
export const overline = { fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,244,248,0.6)' } as const
