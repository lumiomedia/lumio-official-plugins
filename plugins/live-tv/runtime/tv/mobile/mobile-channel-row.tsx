import type { M3uChannel } from '../../live-tv-data'
import { progressOf, formatClock } from '../../live-tv-ui'
import { qualityFromName } from '../../live-tv-model'
import type { NowNextLater } from '../../epg/types'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { MT, ellipsis } from './mobile-tokens'
import { MIcons } from './mobile-icons'
import { MobileLogo } from './mobile-logo'

export type MobileRowVariant = 'guide' | 'zap' | 'search' | 'sheet'

export interface MobileChannelRowProps {
  channel: M3uChannel
  number: number | null
  now: NowNextLater
  nowMs: number
  locale: string
  pinned?: boolean
  locked?: boolean
  variant?: MobileRowVariant
  /** tt('noProgramme') eller tt('loadingGuide') — anroparen väljer texten. */
  noProgrammeLabel: string
  onPress: () => void
  onLongPress?: (element: HTMLElement) => void
  /** data-init: skalets "hoppa hit vid mount"-krok. */
  init?: boolean
  testId?: string
}

/**
 * En kanalrad, delad av guide/zap/sök/bottenark — bara mått och nu-raden
 * skiljer per variant (handoffen §2, §7, §10). Textstacken och varje textrad
 * krymper med `flex: 1; minWidth: 0` så ellipsen faktiskt klipper i stället
 * för att trycka ut raden.
 */
export function MobileChannelRow({ channel, number, now, nowMs, locale, pinned = false, locked = false, variant = 'guide', noProgrammeLabel, onPress, onLongPress, init, testId = 'mobile-channel-row' }: MobileChannelRowProps) {
  const { tt } = useTvText()
  const logo = variant === 'zap' ? { w: 48, h: 32 } : { w: 56, h: 38 }
  const minHeight = variant === 'zap' ? 56 : 68
  const minutes = now.now ? Math.max(0, Math.round((now.now.stop - nowMs) / 60_000)) : 0
  return (
    <div
      data-testid={testId}
      {...station(onPress, onLongPress, init ? { 'data-init': '' } : undefined)}
      style={{ minHeight, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${MT.line07}`, cursor: 'pointer' }}
    >
      <span style={{ width: variant === 'zap' ? 22 : 26, flexShrink: 0, textAlign: 'right', fontSize: 14, color: MT.dim, fontVariantNumeric: 'tabular-nums' }}>{number ?? ''}</span>
      <MobileLogo channel={channel} width={logo.w} height={logo.h} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: '0px' }}>
          <span style={{ fontSize: variant === 'zap' ? 14 : 15, fontWeight: 600, ...ellipsis, minWidth: '0px' }}>{channel.name}</span>
          {pinned ? <span data-pinned="" style={{ color: MT.acc, flexShrink: 0, display: 'inline-flex' }}><MIcons.Heart size={14} filled /></span> : null}
          {locked ? <span data-locked="" style={{ color: MT.dim, flexShrink: 0, display: 'inline-flex' }}><MIcons.Lock size={14} /></span> : null}
        </div>
        {now.now ? (
          <>
            <div style={{ fontSize: variant === 'zap' ? 12 : 14, color: 'rgba(243,244,248,0.85)', ...ellipsis }}>
              {variant === 'search' ? `${tt('nowPrefix')}: ${now.now.title}` : now.now.title}
            </div>
            {variant === 'guide' || variant === 'sheet' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 4, background: MT.s14, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(progressOf(now.now.start, now.now.stop, nowMs) * 100)}%`, height: '100%', background: MT.acc }} />
                </div>
                <span style={{ fontSize: 12, color: MT.dim, flexShrink: 0 }}>{tt('minutesShort', { min: minutes })}</span>
              </div>
            ) : null}
            {variant === 'guide' && now.next ? (
              <div style={{ fontSize: 13, color: MT.dim, ...ellipsis }}>{tt('nextLabel')} {formatClock(now.next.start, locale)} {now.next.title}</div>
            ) : null}
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: MT.dim, ...ellipsis }}>{noProgrammeLabel}</div>
            <div style={{ fontSize: 13, color: MT.faint, ...ellipsis }}>{[channel.group, qualityFromName(channel.name)].filter(Boolean).join(' · ')}</div>
          </>
        )}
      </div>
    </div>
  )
}
