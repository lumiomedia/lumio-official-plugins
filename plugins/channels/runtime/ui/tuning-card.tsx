'use client'

/**
 * "Byter kanal": helskärmskort som ligger över spelaren från det ögonblick
 * ett byte begärs (CH, lista, tablå, siffror, programbyte) tills den nya
 * strömmen visat sin första bild — då tonar det ut. Täcker uppslaget och den
 * nya spelarens tomma ruta, så ett byte aldrig blir en svart skärm.
 *
 * Under kanal-OSD:n och zappläget (de ligger ovanpå och visar redan målet),
 * över värdspelarens egen startruta (z 50). Tar aldrig emot input.
 */
import type { CSSProperties } from 'react'
import type { ChannelDef } from '../model/channel'
import { ChannelBadge } from './badge'
import { C, FONT } from './tokens'
import type { useText } from './use-text'

const FADE_MS = 220

const KEYFRAMES = `
@keyframes chtune-sweep { 0% { transform: translateX(-100%) } 100% { transform: translateX(250%) } }
@media (prefers-reduced-motion: reduce) { [data-tuning-sweep] { animation: none !important } }
`

export interface TuningCardProps {
  channel: ChannelDef
  /** Programmet som ställs in; null medan tablån för kanalen hämtas. */
  title: string | null
  imageUrl: string | null
  visible: boolean
  isTv: boolean
  t: ReturnType<typeof useText>
}

export function TuningCard({ channel, title, imageUrl, visible, isTv, t }: TuningCardProps) {
  const fade: CSSProperties = {
    opacity: visible ? 1 : 0,
    // In direkt, ut snabbt: kortet ska synas samma bildruta som trycket.
    transition: visible ? 'none' : `opacity ${FADE_MS}ms ease-out`,
  }
  return (
    <div
      data-channels-tuning=""
      data-visible={visible ? '1' : '0'}
      aria-hidden={!visible}
      role={visible ? 'status' : undefined}
      style={{
        ...fade, position: 'absolute', inset: 0, zIndex: 54, pointerEvents: 'none', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.base, color: C.text, fontFamily: FONT.ui,
      }}
    >
      <style>{KEYFRAMES}</style>
      {imageUrl ? (
        // Programmets bild, suddig och mörkad: känns som kanalen, konkurrerar inte med texten.
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', inset: '-4%', background: `url("${imageUrl}") center / cover no-repeat`,
            filter: isTv ? 'none' : 'blur(22px)', WebkitFilter: isTv ? 'none' : 'blur(22px)', opacity: isTv ? 0.35 : 0.55,
          }}
        />
      ) : null}
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem', padding: '0 1.5rem', maxWidth: '40rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span data-tuning-number="" style={{ fontFamily: FONT.title, fontSize: '4rem', lineHeight: 1, textShadow: '0 4px 24px rgba(0,0,0,0.7)' }}>{channel.number}</span>
          <ChannelBadge channel={channel} size={56} isTv={isTv} />
        </div>
        <div style={{ fontSize: '0.8rem', letterSpacing: '0.22em', fontWeight: 700, color: C.accentLight, textTransform: 'uppercase' }}>
          {channel.name}
        </div>
        {title ? (
          <div style={{ fontFamily: FONT.title, fontSize: '1.9rem', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {title}
          </div>
        ) : null}
        {/* Diskret laddning: ett ljust segment som sveper över en hårfin linje. */}
        <div style={{ position: 'relative', width: '8rem', height: 2, marginTop: '0.4rem', borderRadius: 1, overflow: 'hidden', background: 'rgba(255,255,255,0.14)' }}>
          <span data-tuning-sweep="" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: C.accent, animation: 'chtune-sweep 1.1s ease-in-out infinite' }} />
        </div>
        <div style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textDim }}>{t('playerTuning')}</div>
      </div>
    </div>
  )
}
