'use client'

/**
 * Tomvyn när inga kanaler finns: tre färdiga förslag och "Skapa egen".
 * Ett förslag sparas direkt som kanal; poolen laddas först när tablån ritas.
 */
import { requestBrowseBack } from '@/lib/plugin-sdk'
import { hueGradient, PRESETS } from '../model/channel'
import { C, FONT, RADIUS, fontSize } from './tokens'
import type { TextKey, useText } from './use-text'

type T = ReturnType<typeof useText>
type PresetId = (typeof PRESETS)[number]['id']

export const PRESET_TEXT: Record<PresetId, { name: TextKey; desc: TextKey; hue: number }> = {
  'evening-film': { name: 'presetEveningFilm', desc: 'presetEveningFilmDesc', hue: 15 },
  'comfort-series': { name: 'presetComfortSeries', desc: 'presetComfortSeriesDesc', hue: 200 },
  'late-shorts': { name: 'presetLateShorts', desc: 'presetLateShortsDesc', hue: 270 },
}

export function EmptyState({ isTv, isMobile, t, onPreset, onCustom }: {
  isTv: boolean
  isMobile: boolean
  t: T
  onPreset(id: PresetId): void
  onCustom(): void
}) {
  const fs = (px: number) => fontSize(px, isTv)
  return (
    <section
      data-channels-empty=""
      style={{
        minHeight: 420, padding: isMobile ? '16px 16px 32px' : isTv ? '1.75rem 2.5rem 2.5rem' : '24px 32px 40px',
        color: C.text, fontFamily: FONT.ui,
        background: `linear-gradient(180deg, rgba(5,8,22,0.2), ${C.base} 85%), ${hueGradient(225)}`,
      }}
    >
      <button
        type="button"
        data-f=""
        onClick={() => requestBrowseBack()}
        style={{
          display: 'inline-flex', alignItems: 'center', minHeight: isTv ? '2.25rem' : 30, padding: isTv ? '0 1rem' : '0 14px',
          borderRadius: RADIUS.pill, border: `1px solid ${C.pillBorder}`, background: C.pillBg, color: C.text,
          fontFamily: FONT.ui, fontSize: fs(10.5), fontWeight: 600, letterSpacing: '0.18em', cursor: 'pointer',
        }}
      >
        {t('pageHome')}
      </button>
      <h1 style={{ margin: isMobile ? '40px 0 0' : '64px 0 0', fontFamily: FONT.title, fontWeight: 400, fontSize: fs(isMobile ? 30 : 44), lineHeight: 1.05 }}>
        {t('emptyTitle')}
      </h1>
      <p style={{ margin: '12px 0 0', maxWidth: 560, fontSize: fs(14), lineHeight: 1.5, color: C.textSoft }}>{t('emptyLead')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 28, maxWidth: 900 }}>
        {PRESETS.map((preset, i) => {
          const text = PRESET_TEXT[preset.id]
          return (
            <button
              key={preset.id}
              type="button"
              data-f=""
              data-init={i === 0 ? '' : undefined}
              data-preset={preset.id}
              onClick={() => onPreset(preset.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 6,
                minHeight: isMobile ? 96 : 150, padding: isTv ? '1rem 1.125rem' : '16px 18px', textAlign: 'left', cursor: 'pointer',
                borderRadius: RADIUS.card, border: '1px solid rgba(255,255,255,0.08)', color: C.text, fontFamily: FONT.ui,
                background: `linear-gradient(180deg, rgba(5,8,22,0) 0%, rgba(5,8,22,0.75) 100%), ${hueGradient(text.hue)}`,
                boxShadow: C.shadow,
              }}
            >
              <span style={{ fontFamily: FONT.title, fontSize: fs(20) }}>{t(text.name)}</span>
              <span style={{ fontSize: fs(12.5), color: C.textSoft }}>{t(text.desc)}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        data-f=""
        onClick={onCustom}
        style={{
          marginTop: 20, padding: isTv ? '0.625rem 1.375rem' : '10px 22px', borderRadius: RADIUS.pill, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: C.text,
          fontFamily: FONT.ui, fontSize: fs(14), fontWeight: 600,
        }}
      >
        {t('emptyCustom')}
      </button>
    </section>
  )
}
