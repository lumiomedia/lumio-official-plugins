import { station } from '../tv-ui'
import { MT } from './mobile-tokens'

/**
 * Sidoscrollande chip-rad (grupper, kategorier …). `data-row` döljer
 * scrollbaren via `TvFocusStyle` i `tv-ui.tsx` — samma krok som scenens rader.
 */
export function MobileChips<K>({ items, value, onChange, testId }: {
  items: { key: K; label: string; id: string }[]
  value: K
  onChange: (key: K) => void
  testId?: string
}) {
  return (
    <div data-testid={testId} data-row="" style={{ display: 'flex', gap: 8, overflowX: 'auto', minHeight: 44, padding: '5px 0', alignItems: 'center' }}>
      {items.map(({ key, label, id }) => {
        const active = key === value
        return (
          <div
            key={id}
            data-testid={`chip-${id}`}
            {...station(() => onChange(key), undefined, { 'aria-pressed': String(active) })}
            style={{
              minHeight: 34, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0,
              background: active ? MT.s16 : MT.s05,
              border: active ? `1px solid ${MT.line20}` : '1px solid transparent',
              color: active ? MT.text : MT.muted,
              opacity: active ? 1 : 0.7,
              fontWeight: active ? 600 : 400,
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
