'use client'

/**
 * Tomvyn — syns bara när alla kanaler tagits bort (standardkanalerna skapas
 * annars första gången sidan öppnas): ett kort besked, "Återställ
 * standardkanaler" och var egna kanaler skapas (pluginets inställningar).
 */
import { belowMenuPill, C, FONT, RADIUS, fontSize } from './tokens'
import { dim, dimS, TV_CONTENT_LEFT, TV_CONTENT_RIGHT, TV_HERO_TITLE, tvHeroButton, tvu } from './tv'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

export function EmptyState({ isTv, isMobile, t, onRestore }: {
  isTv: boolean
  isMobile: boolean
  t: T
  onRestore(): void
}) {
  const fs = (px: number) => fontSize(px, isTv)
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
      <h1 style={{ margin: isMobile ? '24px 0 0' : `${dimS(32, isTv)} 0 0`, fontFamily: FONT.title, fontWeight: 400, fontSize: isTv ? TV_HERO_TITLE : fs(isMobile ? 30 : 44), lineHeight: 1.1 }}>
        {t('emptyTitle')}
      </h1>
      <p style={{ margin: `${dimS(12, isTv)} 0 0`, maxWidth: dim(560, isTv), fontSize: fs(14), lineHeight: 1.5, color: C.textSoft }}>{t('emptyLead')}</p>
      <div data-hero-actions="" style={{ display: 'flex', flexWrap: 'wrap', gap: dim(10, isTv), marginTop: dim(24, isTv) }}>
        <button
          type="button"
          data-f=""
          data-init=""
          data-empty-restore=""
          onClick={onRestore}
          style={{
            padding: '10px 22px', borderRadius: RADIUS.pill, cursor: 'pointer', boxSizing: 'border-box',
            background: C.accent, border: `1px solid ${C.accent}`, color: C.onAccent,
            fontFamily: FONT.ui, fontSize: fs(14), fontWeight: 600,
            ...(isTv ? tvHeroButton() : {}),
          }}
        >
          {t('emptyRestore')}
        </button>
      </div>
      <p data-empty-hint="" style={{ margin: `${dimS(18, isTv)} 0 0`, fontSize: fs(13), color: C.textDim }}>{t('emptySettingsHint')}</p>
    </section>
  )
}
