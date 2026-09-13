'use client'

import { useState } from 'react'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'

const LETTERS = ['1234567890', 'qwertyuiopå', 'asdfghjklöä', 'zxcvbnm,.-']
const SYMBOLS = ['1234567890', '!?@#%&/()=', '+-*_:;"\'<>', '[]{}~^|\\€£']

export function TvKeyboard({ value, onChange, onDone, initFocus }: { value: string; onChange: (v: string) => void; onDone: () => void; initFocus: boolean }) {
  const { tt } = useTvText()
  const [symbols, setSymbols] = useState(false)
  const rows = symbols ? SYMBOLS : LETTERS
  const key = (label: string, onOk: () => void, opts?: { width?: number; accent?: boolean; init?: boolean; aria?: string; flex?: boolean }) => (
    <div
      key={label}
      {...station(onOk, undefined, { ...(opts?.init ? { 'data-init': '' } : {}), ...(opts?.aria ? { 'aria-label': opts.aria } : {}) })}
      style={{ height: dp(58), borderRadius: dp(10), background: opts?.accent ? TV.acc : TV.s10, color: opts?.accent ? TV.onAcc : TV.text, fontWeight: opts?.accent ? 600 : 400, fontSize: dp(24), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: opts?.width, flex: opts?.flex ? 1 : undefined }}
    >
      {label}
    </div>
  )
  return (
    <div data-live-tv-keyboard="" style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
      {rows.map((row, rowIndex) => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`, gap: dp(8) }}>
          {row.split('').map((c, i) => key(c, () => onChange(value + c), { init: initFocus && rowIndex === 0 && i === 0 }))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: dp(8) }}>
        {key('␣', () => onChange(value + ' '), { flex: true, aria: 'Space' })}
        {key('⌫', () => onChange(value.slice(0, -1)), { width: dp(120), aria: 'Backspace' })}
        {key(symbols ? tt('keyLetters') : tt('keySymbols'), () => setSymbols((s) => !s), { width: dp(120) })}
        {key(tt('keyDone'), onDone, { width: dp(140), accent: true })}
      </div>
    </div>
  )
}
