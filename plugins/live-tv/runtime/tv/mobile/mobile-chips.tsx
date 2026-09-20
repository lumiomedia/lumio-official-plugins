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
              /*
                OVALD CHIP LÅG PÅ 5 % VITT — på en helsvart sida är det
                nästan ingenting, och raden lästes som tom (Jerry 2026-09-20:
                "dessa filter på live tv, svår att se, skulle behöva standard
                grå/glass"). 12 % är appens vanliga glasyta för ett
                ovalt piller och syns utan att konkurrera med det valda, som
                ligger kvar på 16 % med sin ljusare kant.

                Kanten sitter kvar på BÅDA lägena nu: en osynlig kant på det
                ovalda gjorde att chippen bytte storlek när man valde dem.
              */
              background: emphasis ? '#f3f4f8' : active ? MT.s16 : MT.s12,
              border: emphasis ? '1px solid transparent' : `1px solid ${active ? MT.line20 : MT.line10}`,
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
