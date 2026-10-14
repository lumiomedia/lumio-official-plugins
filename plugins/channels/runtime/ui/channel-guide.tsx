'use client'

/**
 * Tablån: en rad per kanal med programblock över ett 210-minutersfönster.
 *
 * Varje rad laddar sin kanals pool (cachad i pluginets lagring) och räknar
 * fram tablån lokalt; inga strömuppslag. Raden rapporterar sin rundown uppåt
 * så att heron och klockan delar samma data utan en andra laddning.
 *
 * Mobil (< 640 px): smal namnkolumn som står kvar medan tidsdelen rullar i
 * sidled (min-bredd 640 px). TV: raderna är stationer — ▲▼ byter vald kanal
 * (fokus följer), OK = Titta live, ◀▶ rullar tidsaxeln en halvtimme.
 */
import { memo, useEffect, type CSSProperties, type KeyboardEvent } from 'react'
import type { ChannelDef } from '../model/channel'
import { listing, type Slot } from '../model/schedule'
import type { PoolItem } from '../data/pool'
import { useChannelPool } from '../state/store'
import { ChannelBadge } from './badge'
import { blockBox, formatClock, nowLinePct, type GuideWindow } from './guide-layout'
import { C, FONT, RADIUS, fontSize } from './tokens'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

const ROW_H = 54
const MIN = 60_000

export interface ChannelGuideProps {
  channels: ChannelDef[]
  selectedId: string | null
  window: GuideWindow
  now: number
  isTv: boolean
  isMobile: boolean
  t: T
  onSelect(id: string): void
  onPlay(id: string): void
  onRundown(id: string, rundown: PoolItem[], loading: boolean, partial: boolean): void
  /** TV: ◀▶ på en rad. Returnerar falskt om fönstret inte kan flyttas åt det hållet. */
  onShift(dir: -1 | 1): boolean
}

export function ChannelGuide({ channels, selectedId, window: win, now, isTv, isMobile, t, onSelect, onPlay, onRundown, onShift }: ChannelGuideProps) {
  const labelW = isMobile ? 96 : 220
  const columns = `${labelW}px minmax(${isMobile ? 544 : 0}px, 1fr)`
  const nowPct = now >= win.from && now <= win.to ? nowLinePct(now, win) : null
  return (
    <section data-channels-guide="" style={{ position: 'relative', color: C.text, fontFamily: FONT.ui, padding: isMobile ? '0 0 24px' : isTv ? '0 2.5rem 2rem' : '0 32px 32px' }}>
      <div data-row={isMobile ? '' : undefined} style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: isMobile ? 640 : undefined }}>
          <div style={{ display: 'grid', gridTemplateColumns: columns, alignItems: 'end', height: 34, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ ...stickyLabel(isMobile), paddingLeft: isMobile ? 16 : 8, paddingBottom: 8, fontSize: fontSize(10.5, isTv), letterSpacing: '0.18em', color: C.textDim }}>
              {t('guideHeader')}
            </span>
            <div style={{ position: 'relative', height: '100%' }}>
              {win.ticks.map((tick) => (
                <span
                  key={tick}
                  style={{
                    position: 'absolute', bottom: 8, left: `${((tick - win.from) / (win.to - win.from)) * 100}%`,
                    fontFamily: FONT.mono, fontSize: fontSize(11, isTv), color: C.textDim, whiteSpace: 'nowrap',
                  }}
                >
                  {formatClock(tick)}
                </span>
              ))}
            </div>
          </div>
          {channels.map((channel) => (
            <GuideRow
              key={channel.id}
              channel={channel}
              selected={channel.id === selectedId}
              win={win}
              now={now}
              nowPct={nowPct}
              columns={columns}
              isTv={isTv}
              isMobile={isMobile}
              t={t}
              onSelect={onSelect}
              onPlay={onPlay}
              onRundown={onRundown}
              onShift={onShift}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/** Namnkolumnen står kvar när tidsdelen rullar på mobil. */
const stickyLabel = (isMobile: boolean): CSSProperties =>
  isMobile ? { position: 'sticky', left: 0, zIndex: 2, background: C.solid } : {}

interface RowProps {
  channel: ChannelDef
  selected: boolean
  win: GuideWindow
  now: number
  nowPct: number | null
  columns: string
  isTv: boolean
  isMobile: boolean
  t: T
  onSelect(id: string): void
  onPlay(id: string): void
  onRundown(id: string, rundown: PoolItem[], loading: boolean, partial: boolean): void
  onShift(dir: -1 | 1): boolean
}

const GuideRow = memo(function GuideRow({ channel, selected, win, now, nowPct, columns, isTv, isMobile, t, onSelect, onPlay, onRundown, onShift }: RowProps) {
  const { rundown, loading, partial } = useChannelPool(channel)
  useEffect(() => { onRundown(channel.id, rundown, loading, partial) }, [channel.id, rundown, loading, partial, onRundown])
  const slots = rundown.length > 0 ? listing(rundown, channel.airWindow, win.from, win.to) : []

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isTv) onPlay(channel.id)
      else onSelect(channel.id)
      return
    }
    if (!isTv) return
    // ◀▶ rullar tidsaxeln. Går det inte (vänster vid nu) får fokusmotorn trycket.
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      if (onShift(event.key === 'ArrowRight' ? 1 : -1)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-f=""
      data-init={isTv && selected ? '' : undefined}
      data-channel-row={channel.id}
      aria-pressed={selected}
      onClick={() => (isTv ? onPlay(channel.id) : onSelect(channel.id))}
      // TV: fokus följer ▲▼, och vald kanal följer fokus.
      onFocus={isTv ? () => { if (!selected) onSelect(channel.id) } : undefined}
      onKeyDown={onKeyDown}
      style={{
        display: 'grid', gridTemplateColumns: columns, height: ROW_H, cursor: 'pointer', outline: 'none',
        borderBottom: `1px solid ${selected ? 'transparent' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: selected ? RADIUS.card : 0,
        background: selected ? C.glass : 'transparent',
        boxShadow: selected ? `inset 0 0 0 1px ${C.glassBorder}` : 'none',
      }}
    >
      <div style={{ ...stickyLabel(isMobile), display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, padding: isMobile ? '0 6px 0 16px' : '0 12px 0 8px', minWidth: 0, background: isMobile ? (selected ? C.solidSelected : C.solid) : undefined }}>
        {!isMobile ? (
          <span style={{ width: 18, textAlign: 'right', fontFamily: FONT.mono, fontSize: fontSize(11, isTv), color: C.textMute, flexShrink: 0 }}>{channel.number}</span>
        ) : null}
        <ChannelBadge channel={channel} size={22} style={{ width: 30, borderRadius: 5 }} />
        <span style={{ fontSize: fontSize(isMobile ? 12 : 13.5, isTv), fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {isMobile ? channel.number : channel.name}
        </span>
      </div>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {slots.length === 0 ? (
          <span style={{ position: 'absolute', left: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: fontSize(12, isTv), color: C.textMute }}>
            {loading ? t('guideLoading') : t('guideEmpty')}
          </span>
        ) : slots.map((slot) => <Block key={`${slot.kind}:${slot.start}`} slot={slot} win={win} now={now} isTv={isTv} t={t} />)}
        {nowPct != null ? (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, bottom: 0, left: `${nowPct}%`, width: 2, marginLeft: -1, zIndex: 1,
              background: C.accent, boxShadow: '0 0 10px rgba(244,132,95,0.6)', pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
    </div>
  )
})

function Block({ slot, win, now, isTv, t }: { slot: Slot<PoolItem>; win: GuideWindow; now: number; isTv: boolean; t: T }) {
  const box = blockBox(slot, win)
  if (!box) return null
  const visibleMin = (Math.min(slot.stop, win.to) - Math.max(slot.start, win.from)) / MIN
  const showTime = visibleMin >= 30
  const isRest = slot.kind === 'rest'
  const current = !isRest && slot.start <= now && now < slot.stop
  const title = isRest
    ? t('guideRest', { time: formatClock(slot.nextAir) })
    : slot.item.kind === 'episode' && slot.item.seriesTitle ? slot.item.seriesTitle : slot.item.title
  return (
    // Ingen title-attribut: webbvyns tooltip hamnade förskjuten över kanalkolumnen.
    <div
      style={{
        position: 'absolute', top: 6, bottom: 6, left: `calc(${box.leftPct}% + 2px)`, width: `calc(${box.widthPct}% - 4px)`,
        boxSizing: 'border-box', padding: '5px 9px', borderRadius: 8, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1,
        // Glas på svart grund (ingen blur: inget syns bakom). Vila = streckad kontur.
        background: isRest ? 'transparent' : current ? 'rgba(244,132,95,0.16)' : C.glass,
        border: isRest ? `1px dashed ${C.glassBorder}` : `1px solid ${current ? 'rgba(244,132,95,0.45)' : C.glassBorder}`,
        color: isRest ? C.textMute : C.text,
      }}
    >
      <span style={{ fontSize: fontSize(12, isTv), fontWeight: current ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      {showTime ? (
        <span style={{ fontFamily: FONT.mono, fontSize: fontSize(10, isTv), color: isRest ? C.textMute : C.textDim, whiteSpace: 'nowrap' }}>{formatClock(slot.start)}</span>
      ) : null}
    </div>
  )
}
