import { station } from '../tv-ui'
import { MT } from './mobile-tokens'

/** Segmenterad kontroll (t.ex. Nu/Sen ↔ Tablå). Piller-yta, aktivt segment lyfts med `MT.s16`. */
export function MobileSegment<K extends string>({ options, value, onChange, height = 36, testId }: {
  options: { key: K; label: string }[]
  value: K
  onChange: (key: K) => void
  height?: number
  testId?: string
}) {
  return (
    <div data-testid={testId} style={{ display: 'flex', padding: 3, borderRadius: 999, background: MT.s08 }}>
      {options.map(({ key, label }) => {
        const active = key === value
        return (
          <div
            key={key}
            data-testid={`segment-${key}`}
            {...station(() => onChange(key), undefined, { 'aria-pressed': String(active) })}
            style={{
              flex: 1, minHeight: height, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: active ? 600 : 400,
              background: active ? MT.s16 : 'transparent', color: active ? MT.text : MT.muted,
              cursor: 'pointer',
            }}
          >
            {label}
          </div>
        )
      })}
    </div>
  )
}
