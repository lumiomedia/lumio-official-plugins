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
import { memo, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { tvHoldHandlers } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import { listing, type Slot } from '../model/schedule'
import type { PoolItem } from '../data/pool'
import { useChannelPool } from '../state/store'
import { ChannelBadge } from './badge'
import { bandIndex, bandTransform, blockBox, formatClock, nowLinePct, slotScrollTop, type GuideWindow } from './guide-layout'
import { C, FONT, RADIUS, fontSize } from './tokens'
import { dim, dimS, TV_CONTENT_LEFT, tvu } from './tv'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

const ROW_H = 54
/**
 * TV-radens höjd i TV-enheter. Blocket (raden minus 2 × 6) rymmer titel +
 * starttid i appens typografi (--st-small + --st-micro, radavstånd 1,2) med
 * luft för textstorleken i TV-inställningarna; 54 räckte inte och klippte texten.
 */
export const TV_ROW_H = 72
export const TV_ROW_H_COMPACT = 70
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
  /** Tablån i spelaren: lägre rader, smalare namnkolumn, och klick spelar kanalen direkt. */
  compact?: boolean
  /** TV: raden som får vyns startfokus (sidan: vald kanal; spelaren: aktuell kanal). */
  initId?: string | null
  /** Skrivbord: raden under pekaren (null när pekaren lämnar raderna) — heron följer den. */
  onHover?(id: string | null): void
  /** TV: håll OK på en rad (glasmenyn). Saknas den är OK alltid Titta live. */
  onHold?(id: string, element: HTMLElement): void
  /**
   * Sidans tablå: rubrikraden står still och raderna rullar i en egen
   * behållare som fyller resten av höjden. Raderna tonar ut i överkanten
   * (herons nederkant) när de rullar upp under heron.
   */
  fill?: boolean
}

/** Uttoningens längd i rullbehållarens överkant (designpx; TV i TV-enheter). */
export const GUIDE_FADE = { desktop: 28, tv: 40 } as const

/** Masken som tonar ut raderna upptill i rullbehållaren. */
export function guideFadeMask(isTv: boolean): string {
  const fade = isTv ? tvu(GUIDE_FADE.tv) : `${GUIDE_FADE.desktop}px`
  return `linear-gradient(to bottom, transparent 0, black ${fade})`
}

export function ChannelGuide({ channels, selectedId, window: win, now, isTv, isMobile, t, onSelect, onPlay, onRundown, onShift, compact, initId, onHover, onHold, fill }: ChannelGuideProps) {
  const labelW = isMobile ? 96 : compact ? 180 : 220
  const rowH = isTv ? tvu(compact ? TV_ROW_H_COMPACT : TV_ROW_H) : compact ? 44 : ROW_H
  const columns = `${dimS(labelW, isTv, compact ? 230 : 260)} minmax(${isMobile ? 544 : 0}px, 1fr)`
  const nowPct = now >= win.from && now <= win.to ? nowLinePct(now, win) : null
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const fade = isTv ? tvu(GUIDE_FADE.tv) : `${GUIDE_FADE.desktop}px`
  const selectedIndex = Math.max(0, channels.findIndex((c) => c.id === selectedId))
  // TV: FAST FOKUSBAND (guide-layout.ts). Raden med fokus står på första
  // radplatsen; spåret glider med transform (200 ms), ingen inbyggd rullning.
  const band = fill && isTv
  const [focusIndex, setFocusIndex] = useState(selectedIndex)
  const bandAt = bandIndex(focusIndex, channels.length)
  const rowHCss = typeof rowH === 'number' ? `${rowH}px` : rowH
  // Skrivbord/mobil: vald kanal på bandplatsen när tablån monteras (utan animation).
  useEffect(() => {
    const el = scrollRef.current
    if (!fill || band || !el) return
    el.scrollTop = slotScrollTop(selectedIndex, ROW_H, el.scrollHeight - el.clientHeight)
  }, [fill]) // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * ▲▼ på en rad (TV och skrivbordets tangentbord): nästa rad tar fokus utan
   * webbläsarens egen inrullning, och spåret (TV) eller rullningen
   * (skrivbord, mjukt) ställer den på bandplatsen. Falskt = ingen rad åt det
   * hållet: fokusmotorn får trycket (▲ från första raden → appens toppmeny).
   */
  const onNav = (index: number, dir: -1 | 1): boolean => {
    const next = index + dir
    if (next < 0 || next >= channels.length) return false
    const target = scrollRef.current?.querySelector<HTMLElement>(`[data-channel-row="${channels[next]!.id}"]`)
    if (!target) return false
    target.focus({ preventScroll: true })
    if (!band) {
      const el = scrollRef.current!
      el.scrollTo?.({ top: slotScrollTop(next, ROW_H, el.scrollHeight - el.clientHeight), behavior: 'smooth' })
      onSelect(channels[next]!.id)
    }
    return true
  }
  // Skrivbord: hjul/styrplatta rullar raderna under en stillastående pekare —
  // heron följer raden som hamnar under den.
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const onGuideScroll = (event: { currentTarget: HTMLDivElement }) => {
    const el = event.currentTarget
    // TV: bandet styrs bara av transformen; en inrullning (fokus) nollas.
    if (band) { if (el.scrollTop !== 0) el.scrollTop = 0; return }
    const p = pointer.current
    if (!onHover || !p || typeof document.elementFromPoint !== 'function') return
    const row = document.elementFromPoint(p.x, p.y)?.closest?.('[data-channel-row]')
    const id = row?.getAttribute('data-channel-row') ?? null
    if (id && el.contains(row!)) onHover(id)
  }
  // Ringmarginal i sidled (se padding nedan).
  const ring = fill && !isMobile ? dimS(10, isTv) : '0px'
  const header = (
    <div data-guide-axis="" style={{ display: 'grid', gridTemplateColumns: columns, alignItems: 'end', height: dim(34, isTv, 42), borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, marginInline: ring }}>
      <span style={{ ...stickyLabel(isMobile), paddingLeft: isMobile ? 16 : dim(8, isTv), paddingBottom: dim(8, isTv), fontSize: fontSize(10.5, isTv), lineHeight: 1.2, letterSpacing: '0.18em', color: C.textSoft }}>
        {t('guideHeader')}
      </span>
      <div style={{ position: 'relative', height: '100%' }}>
        {win.ticks.map((tick) => (
          <span
            key={tick}
            style={{
              position: 'absolute', bottom: dim(8, isTv), left: `${((tick - win.from) / (win.to - win.from)) * 100}%`,
              fontFamily: FONT.mono, fontSize: fontSize(11, isTv), lineHeight: 1.2, color: C.textSoft, whiteSpace: 'nowrap',
            }}
          >
            {formatClock(tick)}
          </span>
        ))}
      </div>
    </div>
  )
  const rows = channels.map((channel, i) => (
    <GuideRow
      key={channel.id}
      channel={channel}
      selected={channel.id === selectedId}
      win={win}
      now={now}
      nowPct={nowPct}
      columns={columns}
      rowH={rowH}
      clickPlays={!!compact}
      init={isTv && initId === channel.id}
      // TV-bandet: rader ovanför bandet är inga stationer (de syns bara i uttoningen);
      // ▲ från bandraden går via onNav.
      station={!band || i >= bandAt}
      onNav={fill && !isMobile ? (dir) => onNav(i, dir) : undefined}
      onFocusRow={band ? () => setFocusIndex(i) : undefined}
      isTv={isTv}
      isMobile={isMobile}
      t={t}
      onSelect={onSelect}
      onPlay={onPlay}
      onRundown={onRundown}
      onShift={onShift}
      onHover={onHover}
      onHold={onHold}
    />
  ))
  /*
    Full innehållsbredd. Raderna har en inre marginal (RING) i rullbehållaren
    så den markerade radens ram och glöd aldrig klipps i vänster- eller
    högerkanten (behållaren klipper i sidled); tidsaxeln får samma marginal så
    kolumnerna står rakt. Kanalnamnet ligger kvar på appens innehållslinje
    (TV 100 enheter) och herons vänsterkant (skrivbord 30 px).
  */
  // Lika på båda sidor (Jerry 2026-10-17): tablåns kanter speglar herons 60.
  const padding = compact ? 0 : isMobile ? '0' : isTv ? `0 ${tvu(Math.max(2, TV_CONTENT_LEFT - 8 - 10))}` : '0 2px'
  return (
    <section
      data-channels-guide=""
      style={{
        position: 'relative', color: C.text, fontFamily: FONT.ui, padding,
        ...(fill ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}),
        ...(!fill && !compact ? { paddingBottom: isMobile ? 24 : dim(32, isTv, 40) } : {}),
      }}
    >
      <div
        data-row={isMobile ? '' : undefined}
        style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch', ...(fill ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}) }}
      >
        <div style={{ minWidth: isMobile ? 640 : undefined, ...(fill ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}) }}>
          {header}
          {/* Tidsaxeln ovan står still; bara raderna nedan rör sig. */}
          {fill ? (
            <div
              ref={scrollRef}
              data-channels-guide-scroll=""
              // Tablåns rullning är sidans inre navigering — appens uttoning
              // bakom toppmenyn ska inte tändas av den.
              data-no-chrome-fade=""
              data-guide-band={band ? String(bandAt) : undefined}
              // Skrivbord/mobil: vanlig rullning (fokusmotorn rullar in i data-scroll).
              // TV: ingen rullning alls — bandet flyttar spåret.
              data-scroll={band ? undefined : ''}
              onScroll={onGuideScroll}
              onMouseMove={onHover ? (e) => { pointer.current = { x: e.clientX, y: e.clientY } } : undefined}
              onMouseLeave={onHover ? () => { pointer.current = null } : undefined}
              style={{
                flex: 1, minHeight: 0, overflowY: band ? 'hidden' : 'auto', overflowX: 'hidden', overscrollBehavior: 'contain',
                // Raderna tonar ut upptill (herons nederkant) när de glider upp; luft
                // ovanför bandplatsen så raden där står helt synlig.
                paddingTop: fade, paddingBottom: band ? 0 : dim(24, isTv, 40), paddingInline: ring,
                WebkitMaskImage: guideFadeMask(isTv), maskImage: guideFadeMask(isTv),
                scrollbarWidth: 'none',
              }}
            >
              {band ? (
                <div
                  data-guide-track=""
                  style={{ transform: bandTransform(bandAt, rowHCss), transition: 'transform 200ms ease', willChange: 'transform' }}
                >
                  {rows}
                </div>
              ) : rows}
            </div>
          ) : rows}
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
  rowH: number | string
  /** TV: vyns startfokus. */
  init: boolean
  /** Raden är en fokusstation (TV-bandet: inte raderna ovanför bandet). */
  station: boolean
  /** ▲▼ på raden (sidans tablå); falskt = ingen rad åt det hållet. */
  onNav?(dir: -1 | 1): boolean
  /** TV-bandet: raden fick fokus. */
  onFocusRow?(): void
  /** Klick/OK spelar kanalen (tablån i spelaren); annars väljer klick, och klick på vald rad spelar. */
  clickPlays: boolean
  isTv: boolean
  isMobile: boolean
  t: T
  onSelect(id: string): void
  onPlay(id: string): void
  onRundown(id: string, rundown: PoolItem[], loading: boolean, partial: boolean): void
  onShift(dir: -1 | 1): boolean
  onHover?(id: string | null): void
  onHold?(id: string, element: HTMLElement): void
}

const GuideRow = memo(function GuideRow({ channel, selected, win, now, nowPct, columns, rowH, init, station, onNav, onFocusRow, clickPlays, isTv, isMobile, t, onSelect, onPlay, onRundown, onShift, onHover, onHold }: RowProps) {
  const plays = isTv || clickPlays
  // Klick: spelar på TV och i spelarens tablå; annars väljer klicket, och klick på vald rad spelar.
  const activate = () => (plays || selected ? onPlay(channel.id) : onSelect(channel.id))
  // TV: OK = Titta live, håll OK = glasmenyn (värdens hållmönster, samma 650 ms som appen).
  const hold = isTv && onHold && typeof tvHoldHandlers === 'function'
    ? tvHoldHandlers(() => onPlay(channel.id), (el) => onHold(channel.id, el))
    : null
  // Raden under pekaren eller i fokus: blocken ett steg ljusare.
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const lit = hover || focus
  const { rundown, loading, partial } = useChannelPool(channel)
  useEffect(() => { onRundown(channel.id, rundown, loading, partial) }, [channel.id, rundown, loading, partial, onRundown])
  const slots = rundown.length > 0 ? listing(rundown, channel.airWindow, win.from, win.to) : []

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (hold) { hold.onKeyDown(event); return }
      event.preventDefault()
      activate()
      return
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && onNav && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (onNav(event.key === 'ArrowDown' ? 1 : -1)) {
        event.preventDefault()
        event.stopPropagation()
      }
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
      tabIndex={station ? 0 : -1}
      data-f={station ? '' : undefined}
      data-init={init ? '' : undefined}
      data-channel-row={channel.id}
      aria-pressed={selected}
      onClick={activate}
      onDoubleClick={plays ? undefined : () => onPlay(channel.id)}
      // TV: fokus följer ▲▼, vald kanal (och heron) följer fokus, och raden glider in i bild.
      onFocus={() => {
        setFocus(true)
        if (isTv && !selected) onSelect(channel.id)
        onFocusRow?.()
      }}
      onBlur={() => setFocus(false)}
      onMouseEnter={() => { setHover(true); onHover?.(channel.id) }}
      onMouseLeave={() => { setHover(false); onHover?.(null) }}
      onKeyDown={onKeyDown}
      onKeyUp={hold ? (e) => hold.onKeyUp(e) : undefined}
      style={{
        display: 'grid', gridTemplateColumns: columns, height: rowH, cursor: 'pointer', outline: 'none', boxSizing: 'border-box',
        borderBottom: `1px solid ${selected ? 'transparent' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: selected ? dim(RADIUS.card, isTv) : 0,
        background: selected ? C.glassDenseSoft : 'transparent',
        boxShadow: selected ? `inset 0 0 0 1px ${C.glassBorder}` : 'none',
      }}
    >
      <div style={{ ...stickyLabel(isMobile), display: 'flex', alignItems: 'center', gap: isMobile ? 6 : dim(12, isTv), padding: isMobile ? '0 6px 0 16px' : `0 ${dimS(12, isTv)} 0 ${dimS(8, isTv)}`, minWidth: 0, background: isMobile ? (selected ? C.solidSelected : C.solid) : undefined }}>
        {!isMobile ? (
          <span style={{ width: dim(18, isTv, 24), textAlign: 'right', fontFamily: FONT.mono, fontSize: fontSize(11, isTv), lineHeight: 1.2, color: C.textMute, flexShrink: 0 }}>{channel.number}</span>
        ) : null}
        <ChannelBadge channel={channel} size={22} isTv={isTv} style={{ width: dim(30, isTv), borderRadius: dim(5, isTv) }} />
        <span style={{ fontSize: fontSize(isMobile ? 12 : 13.5, isTv), lineHeight: 1.25, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {isMobile ? channel.number : channel.name}
        </span>
      </div>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {slots.length === 0 ? (
          <span style={{ position: 'absolute', left: dim(10, isTv), top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: fontSize(12, isTv), lineHeight: 1.2, color: C.textMute }}>
            {loading ? t('guideLoading') : t('guideEmpty')}
          </span>
        ) : slots.map((slot) => <Block key={`${slot.kind}:${slot.start}`} slot={slot} win={win} now={now} lit={lit} isTv={isTv} t={t} />)}
        {nowPct != null ? (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, bottom: 0, left: `${nowPct}%`, width: 2, marginLeft: -1, zIndex: 1,
              background: C.accent, boxShadow: `0 0 10px ${C.accentAlpha(0.6)}`, pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
    </div>
  )
})

function Block({ slot, win, now, lit, isTv, t }: { slot: Slot<PoolItem>; win: GuideWindow; now: number; lit: boolean; isTv: boolean; t: T }) {
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
      data-guide-block={isRest ? 'rest' : current ? 'current' : 'idle'}
      style={{
        position: 'absolute', top: dim(6, isTv), bottom: dim(6, isTv), left: `calc(${box.leftPct}% + 2px)`, width: `calc(${box.widthPct}% - 4px)`,
        boxSizing: 'border-box', padding: `${dimS(5, isTv)} ${dimS(9, isTv, 12)}`, borderRadius: dim(8, isTv), overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: dim(1, isTv, 2),
        // Eget radavstånd: TV-lägets <main> ärver 1,4, som sprängde blocket och klippte titeln.
        lineHeight: 1.2,
        // Ljusgrå tät yta (läsbar även över herobilden), ett steg ljusare på raden
        // under pekaren/fokus. Pågående program tydligt orange. Vila = dämpad, streckad.
        background: isRest ? C.glassDenseSoft : current ? (lit ? C.guideCurrentLit : C.guideCurrent) : lit ? C.guideBlockLit : C.guideBlock,
        border: isRest ? `1px dashed ${C.glassBorder}` : `1px solid ${current ? C.guideCurrentBorder : C.guideBlockBorder}`,
        boxShadow: !isRest && current ? (lit ? C.guideCurrentTintLit : C.guideCurrentTint) : undefined,
        transition: 'background 150ms ease',
        color: isRest ? C.textMute : C.text,
      }}
    >
      <span data-guide-block-title="" style={{ fontSize: fontSize(12, isTv), lineHeight: 1.2, fontWeight: current ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{title}</span>
      {showTime ? (
        <span style={{ fontFamily: FONT.mono, fontSize: fontSize(10, isTv), lineHeight: 1.2, color: isRest ? C.textMute : C.textDim, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatClock(slot.start)}</span>
      ) : null}
    </div>
  )
}
