'use client'

import { useEffect, useState } from 'react'
import { TV, dp, station } from './tv/tv-ui'
import { useTvText } from './tv/tv-strings'
import type { M3uChannel } from './live-tv-data'

export const FALLBACK_COUNTDOWN_S = 5

/**
 * "Strömmen hackar · byter till X om 5 s" — Byt nu (fokus) / Stanna kvar. Gör
 * man inget byts det efter `seconds` (inställningen Byt automatiskt efter).
 * `seconds` 0 = Aldrig: ingen nedräkning, bara frågan "Byt till X?".
 */
export function StreamFallbackPrompt({ target, seconds = FALLBACK_COUNTDOWN_S, onSwitch, onStay }: { target: M3uChannel; seconds?: number; onSwitch(): void; onStay(): void }) {
  const { tt } = useTvText()
  const auto = seconds > 0
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (!auto) return
    if (left <= 0) { onSwitch(); return }
    const t = setTimeout(() => setLeft((n) => n - 1), 1_000)
    return () => clearTimeout(t)
  }, [auto, left, onSwitch])
  const btn = (primary: boolean) => ({ padding: `${dp(8)}px ${dp(14)}px`, borderRadius: dp(10), fontWeight: 600, cursor: 'pointer', background: primary ? TV.text : 'transparent', color: primary ? '#0e0f13' : TV.text, border: primary ? 'none' : `1px solid ${TV.lineStrong}` })
  return (
    <div data-live-tv-stream-fallback="" role="status" style={{ position: 'absolute', bottom: dp(120), left: '50%', transform: 'translateX(-50%)', zIndex: 31, display: 'flex', alignItems: 'center', gap: dp(16), padding: `${dp(14)}px ${dp(20)}px`, borderRadius: dp(16), background: TV.panel, border: `1px solid ${TV.lineStrong}`, color: TV.text }}>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: dp(20), fontWeight: 600 }}>{tt('fallbackStutter')}</span>
        <span style={{ fontSize: dp(16), color: TV.muted }}>{auto ? tt('fallbackSwitchIn', { name: target.name, n: Math.max(0, left) }) : tt('fallbackSwitchAsk', { name: target.name })}</span>
      </span>
      <div {...station(onSwitch, undefined, { 'data-init': '' })} style={btn(true)}>{tt('fallbackSwitchNow')}</div>
      <div {...station(onStay)} style={btn(false)}>{tt('fallbackStay')}</div>
    </div>
  )
}
