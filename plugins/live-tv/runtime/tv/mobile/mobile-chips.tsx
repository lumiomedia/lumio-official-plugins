import { station } from '../tv-ui'
import { MT } from './mobile-tokens'

/**
 * Sidoscrollande chip-rad (grupper, kategorier …). `data-row` döljer
 * scrollbaren via `TvFocusStyle` i `tv-ui.tsx` — samma krok som scenens rader.
 */
export function MobileChips<K>({ items, value, onChange, testId, emphasisKey, dimKeys }: {
  items: { key: K; label: string; id: string }[]
  value: K
  onChange: (key: K) => void
  testId?: string
  /** Task 8: denna nyckeln ritas alltid som en vit yta (t.ex. "Idag" bland dagchipsen), oavsett vald/ovald. */
  emphasisKey?: K
  /** Task 8: dessa nycklarna dämpas till 65 % opacitet (t.ex. passerade dagar). */
  dimKeys?: K[]
}) {
  return (
    <div data-testid={testId} data-row="" style={{ display: 'flex', gap: 8, overflowX: 'auto', minHeight: 44, padding: '5px 0', alignItems: 'center' }}>
      {items.map(({ key, label, id }) => {
        const active = key === value
        const emphasis = emphasisKey !== undefined && key === emphasisKey
        const dim = dimKeys?.includes(key) ?? false
        return (
          <div
            key={id}
            data-testid={`chip-${id}`}
            {...station(() => onChange(key), undefined, { 'aria-pressed': String(active) })}
            style={{
              minHeight: 34, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0,
              background: emphasis ? '#f3f4f8' : active ? MT.s16 : MT.s05,
              border: active && !emphasis ? `1px solid ${MT.line20}` : '1px solid transparent',
              color: emphasis ? '#111' : active ? MT.text : MT.muted70,
              fontWeight: active ? 600 : 400,
              opacity: dim ? 0.65 : undefined,
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
