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
        padding: `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 32px' : isTv ? '2.5rem 2.5rem' : '32px 40px'}`,
      }}
    >
      <div data-channels-topbar="" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Btn isTv={isTv} pill onClick={onBack}>{t('manageBack')}</Btn>
        <Btn isTv={isTv} pill onClick={onCreate}>{t('pageNewChannel')}</Btn>
      </div>
      <h1 style={{ margin: isMobile ? '28px 0 16px' : '40px 0 20px', fontFamily: FONT.title, fontWeight: 400, fontSize: fs(isMobile ? 28 : 36) }}>
        {t('manageTitle')}
      </h1>
      {sorted.length === 0 ? (
        <p style={{ margin: 0, color: C.textDim, fontSize: fs(14) }}>{t('settingsEmpty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 760 }}>
          {sorted.map((channel, i) => {
            const count = counts[channel.id]
            return (
              <div
                key={channel.id}
                data-manage-row={channel.id}
                style={{ ...glass(isTv, { blur: 0 }), borderRadius: RADIUS.card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: isTv ? '0.75rem 1rem' : '12px 14px' }}
              >
                <span style={{ width: 28, textAlign: 'right', fontFamily: FONT.mono, fontSize: fs(13), color: C.textDim }}>{channel.number}</span>
                <ChannelBadge channel={channel} size={30} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div data-channel-name="" style={{ fontSize: fs(15), fontWeight: 600 }}>{channel.name}</div>
                  {count != null ? <div style={{ marginTop: 2, fontSize: fs(12.5), color: C.textDim }}>{t('settingsTitles', { n: count })}</div> : null}
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
        display: 'inline-flex', alignItems: 'center', minHeight: isTv ? '2.25rem' : 30, padding: isTv ? '0 1rem' : '0 14px',
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
