'use client'

/**
 * Tomvyn — syns bara när alla kanaler tagits bort (standardkanalerna skapas
 * annars första gången sidan öppnas): "Återställ standardkanaler" och
 * "Skapa egen".
 */
import { requestBrowseBack } from '@/lib/plugin-sdk'
import { belowMenuPill, C, FONT, glass, RADIUS, fontSize } from './tokens'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

export function EmptyState({ isTv, isMobile, t, onRestore, onCustom }: {
  isTv: boolean
  isMobile: boolean
  t: T
  onRestore(): void
  onCustom(): void
}) {
  const fs = (px: number) => fontSize(px, isTv)
  const button = (primary: boolean) => ({
    padding: isTv ? '0.625rem 1.375rem' : '10px 22px', borderRadius: RADIUS.pill, cursor: 'pointer',
    ...(primary ? { background: C.accent, border: `1px solid ${C.accent}`, color: C.onAccent } : { ...glass(isTv, { fill: C.pillBg, blur: 20 }), color: C.text }),
    fontFamily: FONT.ui, fontSize: fs(14), fontWeight: 600,
  })
  return (
    <section
      data-channels-empty=""
      style={{
        minHeight: 420,
        padding: `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 32px' : isTv ? '2.5rem 2.5rem' : '32px 40px'}`,
        color: C.text, fontFamily: FONT.ui, background: C.base,
      }}
    >
      <button
        type="button"
        data-f=""
        onClick={() => requestBrowseBack()}
        style={{
          display: 'inline-flex', alignItems: 'center', minHeight: isTv ? '2.25rem' : 30, padding: isTv ? '0 1rem' : '0 14px',
          ...glass(isTv, { fill: C.pillBg, blur: 20 }), borderRadius: RADIUS.pill, color: C.text,
          fontFamily: FONT.ui, fontSize: fs(10.5), fontWeight: 600, letterSpacing: '0.18em', cursor: 'pointer',
        }}
      >
        {t('pageHome')}
      </button>
      <h1 style={{ margin: isMobile ? '32px 0 0' : '48px 0 0', fontFamily: FONT.title, fontWeight: 400, fontSize: fs(isMobile ? 30 : 44), lineHeight: 1.05 }}>
        {t('emptyTitle')}
      </h1>
      <p style={{ margin: '12px 0 0', maxWidth: 560, fontSize: fs(14), lineHeight: 1.5, color: C.textSoft }}>{t('emptyLead')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
        <button type="button" data-f="" data-init="" data-empty-restore="" onClick={onRestore} style={button(true)}>{t('emptyRestore')}</button>
        <button type="button" data-f="" onClick={onCustom} style={button(false)}>{t('emptyCustom')}</button>
      </div>
    </section>
  )
}
