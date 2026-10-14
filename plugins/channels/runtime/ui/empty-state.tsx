'use client'

/**
 * Tomvyn — syns bara när alla kanaler tagits bort (standardkanalerna skapas
 * annars första gången sidan öppnas): "Återställ standardkanaler" och
 * "Skapa egen".
 */
import { requestBrowseBack } from '@/lib/plugin-sdk'
import { belowMenuPill, C, FONT, glass, RADIUS, fontSize } from './tokens'
import { dim, dimS, TV_CONTENT_LEFT, TV_CONTENT_RIGHT, TV_HERO_TITLE, tvHeroButton, tvu } from './tv'
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
    padding: '10px 22px', borderRadius: RADIUS.pill, cursor: 'pointer', boxSizing: 'border-box' as const,
    ...(primary ? { background: C.accent, border: `1px solid ${C.accent}`, color: C.onAccent } : { ...glass(isTv, { fill: C.pillBg, blur: 20 }), color: C.text }),
    fontFamily: FONT.ui, fontSize: fs(14), fontWeight: 600,
    ...(isTv ? tvHeroButton() : {}),
  })
  return (
    <section
      data-channels-empty=""
      style={{
        minHeight: dim(420, isTv),
        padding: isTv
          ? `${belowMenuPill(true, false)} ${tvu(TV_CONTENT_RIGHT)} ${tvu(40)} ${tvu(TV_CONTENT_LEFT)}`
          : `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 32px' : '32px 40px'}`,
        color: C.text, fontFamily: FONT.ui, background: C.base,
      }}
    >
      <button
        type="button"
        data-f=""
        onClick={() => requestBrowseBack()}
        style={{
          display: 'inline-flex', alignItems: 'center', minHeight: dim(30, isTv, 40), padding: isTv ? `0 ${tvu(18)}` : '0 14px', boxSizing: 'border-box',
          ...glass(isTv, { fill: C.pillBg, blur: 20 }), borderRadius: RADIUS.pill, color: C.text,
          fontFamily: FONT.ui, fontSize: fs(10.5), fontWeight: 600, letterSpacing: '0.18em', cursor: 'pointer',
        }}
      >
        {t('pageHome')}
      </button>
      <h1 style={{ margin: isMobile ? '32px 0 0' : `${dimS(48, isTv)} 0 0`, fontFamily: FONT.title, fontWeight: 400, fontSize: isTv ? TV_HERO_TITLE : fs(isMobile ? 30 : 44), lineHeight: 1.1 }}>
        {t('emptyTitle')}
      </h1>
      <p style={{ margin: `${dimS(12, isTv)} 0 0`, maxWidth: dim(560, isTv), fontSize: fs(14), lineHeight: 1.5, color: C.textSoft }}>{t('emptyLead')}</p>
      <div data-hero-actions="" style={{ display: 'flex', flexWrap: 'wrap', gap: dim(10, isTv), marginTop: dim(24, isTv) }}>
        <button type="button" data-f="" data-init="" data-empty-restore="" onClick={onRestore} style={button(true)}>{t('emptyRestore')}</button>
        <button type="button" data-f="" onClick={onCustom} style={button(false)}>{t('emptyCustom')}</button>
      </div>
    </section>
  )
}
