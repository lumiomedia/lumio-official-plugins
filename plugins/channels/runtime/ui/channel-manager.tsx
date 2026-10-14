'use client'

/**
 * Hantera kanaler (KANALER-pillret på Kanaler-sidan): samma lista som
 * inställningssektionen — nummer, namn, ≈ titlar, Redigera, Ta bort i två
 * steg och Ny kanal — men med sidans egna glasknappar så TV-fokus (data-f)
 * når dem. Bakåt (knappen eller fjärrens Bakåt) går tillbaka till tablån.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { ChannelBadge } from './badge'
import { useChannelList } from './settings-section'
import { belowMenuPill, C, FONT, glass, RADIUS, fontSize } from './tokens'
import { dim, dimS, TV_CONTENT_LEFT, TV_CONTENT_RIGHT, TV_HERO_TITLE, tvu } from './tv'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])

export function ChannelManager({ isTv, isMobile, t, onBack, onEdit, onCreate }: {
  isTv: boolean
  isMobile: boolean
  t: T
  onBack(): void
  onEdit(id: string): void
  onCreate(): void
}) {
  const { sorted, counts, confirmId, requestDelete } = useChannelList()
  const fs = (px: number) => fontSize(px, isTv)
  const backRef = useRef(onBack)
  backRef.current = onBack

  // TV: Bakåt stänger vyn i stället för att lämna sidan.
  useEffect(() => {
    if (!isTv) return
    const handler = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      backRef.current()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isTv])

  return (
    <section
      data-channels-manage=""
      style={{
        minHeight: '100%', background: C.base, color: C.text, fontFamily: FONT.ui,
        padding: isTv
          ? `${belowMenuPill(true, false)} ${tvu(TV_CONTENT_RIGHT)} ${tvu(40)} ${tvu(TV_CONTENT_LEFT)}`
          : `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 32px' : '32px 40px'}`,
      }}
    >
      <div data-channels-topbar="" style={{ display: 'flex', alignItems: 'center', gap: dim(8, isTv), flexWrap: 'wrap' }}>
        <Btn isTv={isTv} pill onClick={onBack}>{t('manageBack')}</Btn>
        <Btn isTv={isTv} pill onClick={onCreate}>{t('pageNewChannel')}</Btn>
      </div>
      <h1 style={{ margin: isMobile ? '28px 0 16px' : `${dimS(40, isTv)} 0 ${dimS(20, isTv)}`, fontFamily: FONT.title, fontWeight: 400, lineHeight: 1.15, fontSize: isTv ? TV_HERO_TITLE : fs(isMobile ? 28 : 36) }}>
        {t('manageTitle')}
      </h1>
      {sorted.length === 0 ? (
        <p style={{ margin: 0, color: C.textDim, fontSize: fs(14) }}>{t('settingsEmpty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: dim(8, isTv), maxWidth: dim(760, isTv, 900) }}>
          {sorted.map((channel, i) => {
            const count = counts[channel.id]
            return (
              <div
                key={channel.id}
                data-manage-row={channel.id}
                style={{ ...glass(isTv, { blur: 0 }), borderRadius: dim(RADIUS.card, isTv), display: 'flex', alignItems: 'center', gap: dim(14, isTv), flexWrap: 'wrap', padding: `${dimS(12, isTv)} ${dimS(14, isTv, 18)}` }}
              >
                <span style={{ width: dim(28, isTv), textAlign: 'right', fontFamily: FONT.mono, fontSize: fs(13), color: C.textDim }}>{channel.number}</span>
                <ChannelBadge channel={channel} size={30} isTv={isTv} />
                <div style={{ flex: 1, minWidth: dim(140, isTv), lineHeight: 1.3 }}>
                  <div data-channel-name="" style={{ fontSize: fs(15), fontWeight: 600 }}>{channel.name}</div>
                  {count != null ? <div style={{ marginTop: dim(2, isTv), fontSize: fs(12.5), color: C.textDim }}>{t('settingsTitles', { n: count })}</div> : null}
                </div>
                <Btn isTv={isTv} init={i === 0} onClick={() => onEdit(channel.id)}>{t('settingsEdit')}</Btn>
                <Btn isTv={isTv} danger onClick={() => requestDelete(channel.id)}>
                  {t(confirmId === channel.id ? 'settingsDeleteConfirm' : 'settingsDelete')}
                </Btn>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Btn({ children, onClick, isTv, pill, danger, init }: { children: ReactNode; onClick(): void; isTv: boolean; pill?: boolean; danger?: boolean; init?: boolean }) {
  return (
    <button
      type="button"
      data-f=""
      data-init={init ? '' : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', minHeight: dim(30, isTv, 40), padding: isTv ? `0 ${tvu(18)}` : '0 14px', boxSizing: 'border-box',
        ...glass(isTv, { fill: C.pillBg, blur: 0 }), borderRadius: RADIUS.pill, cursor: 'pointer', whiteSpace: 'nowrap',
        ...(danger ? { border: '1px solid rgba(255,90,106,0.45)', color: 'hsl(354 100% 72%)' } : { color: C.text }),
        fontFamily: FONT.ui, fontSize: fontSize(pill ? 10.5 : 13, isTv), fontWeight: 600,
        letterSpacing: pill ? '0.18em' : undefined,
      }}
    >
      {children}
    </button>
  )
}
