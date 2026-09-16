'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey } from '../../live-tv-data'
import { startOfLocalDay } from '../../live-tv-model'
import type { EpgProgramme } from '../../epg/types'
import { formatClock } from '../../live-tv-ui'
import type { TvViewProps } from '../tv-shell'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { useGuideGroups } from '../tv-guide-shared'
import { useGridRows } from '../tv-guide-grid'
import { PHONE_CHANNEL_COL_PX, PHONE_PX_PER_MIN, PHONE_ROW_H_PX, epgRowBoxes, nowLinePx, type EpgRowEntry } from '../epg-grid-geometry'
import { MT, clamp2, ellipsis } from './mobile-tokens'
import { MobileHeader } from './mobile-header'
import { MobileLogo } from './mobile-logo'
import { MobileChips } from './mobile-chips'
import { PhoneGuideModeBar, type PhoneGuideMode } from './guide-phone'

/** Startantal rader och steget per Visa fler — samma tal som skrivbordet. */
const MAX_ROWS = 80
const ROWS_STEP = 80
const HALF_HOUR = 30 * 60_000
/** Tidsradens höjd (11 px etikett + luft). */
const TIME_ROW_H = 24
/** Blockets läge i 64-radens: 8 över, 48 högt, 8 under. Titel 16 + tid 14 = 30 = 48 − 2 × 8 − 2 × 1 (ram). */
const BLOCK_TOP = 8
const BLOCK_H = 48
/** Hur långt före nu-linjen scrollen landar när man hoppar till nu. */
const NOW_LEAD_PX = 40

/**
 * Guiden · Tablå (Timeline) på telefon (fas 3, handoffen §3).
 *
 * Skrivbordets rutnät i äkta px och utan dess tillbehör: ingen dagväljare,
 * ingen detaljremsa, ingen hovring. Fönstret börjar 30 minuter före nu
 * (nedåt till halvtimme) och räcker till i morgon 06:00 — resten av dygnet
 * nås genom att dra. Kanalkolumnen är sticky i vänsterkanten och tidsraden
 * sticky i överkanten; Nu-knappen i datumraden scrollar tillbaka till
 * nu-linjen. Radpipelinen (`useGridRows`) är exakt skrivbordets.
 */
export function TvGuideGridPhone({ model, nav, mode, onModeChange }: TvViewProps & { mode: PhoneGuideMode; onModeChange: (mode: PhoneGuideMode) => void }) {
  const { tt, locale } = useTvText()
  const groups = useGuideGroups(model, tt)
  const [group, setGroup] = useState<string | null>(null)
  const [visibleRows, setVisibleRows] = useState(MAX_ROWS)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const { nowMs } = model

  // 30 min före nu, avrundat nedåt till halvtimme, så första etiketten är ett
  // klockslag. Slutet är i morgon 06:00: resten av kvällen och natten.
  const windowStart = Math.floor((nowMs - HALF_HOUR) / HALF_HOUR) * HALF_HOUR
  const windowEnd = startOfLocalDay(nowMs, 1) + 6 * 3_600_000
  const marks = useMemo(() => {
    const list: number[] = []
    for (let t = windowStart; t < windowEnd; t += HALF_HOUR) list.push(t)
    return list
  }, [windowStart, windowEnd])
  const gridWidth = ((windowEnd - windowStart) / 60_000) * PHONE_PX_PER_MIN
  const nowLeft = nowLinePx(nowMs, windowStart, PHONE_PX_PER_MIN)

  useEffect(() => { setVisibleRows(MAX_ROWS) }, [group])
  const { rows, hasMore, schedulesLoading } = useGridRows(model, group, visibleRows, windowStart, windowEnd)

  // Geometrin räknas en gång per rad och fönster, inte per rendering — samma
  // skäl som på skrivbordet (minuttick och Visa fler ritar om allt annars).
  const entriesByChannel = useMemo(() => {
    const map = new Map<string, EpgRowEntry<EpgProgramme>[]>()
    for (const row of rows) map.set(channelKey(row.channel), epgRowBoxes(row.programmes, windowStart, windowEnd, PHONE_PX_PER_MIN))
    return map
  }, [rows, windowStart, windowEnd])

  // Landar strax före nu-linjen. Ingen `clientWidth`-andel som på skrivbordet:
  // på en 375 px-skärm är 15 % för lite för att se vad som nyss började.
  const scrollToNow = () => {
    const el = scrollRef.current
    if (el) el.scrollLeft = Math.max(0, nowLeft - NOW_LEAD_PX)
  }
  const hasRows = rows.length > 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (hasRows) scrollToNow() }, [hasRows])

  const isLive = (programme: EpgProgramme) => programme.start <= nowMs && programme.stop > nowMs
  const dateLabel = new Date(nowMs).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div data-testid="grid-phone" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <MobileHeader title={tt('guideTitle')} />
      <div style={{ padding: `0 ${MT.PAD}px`, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        <PhoneGuideModeBar mode={mode} onChange={onModeChange} />
        <MobileChips items={groups} value={group} onChange={setGroup} testId="guide-groups" />
        {/* Datumraden med Nu-knappen. Pillen är 30 px som i handoffen, men
            träffytan är stationen runt den — 44 px hög. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span data-testid="grid-phone-date" style={{ fontSize: 13, color: MT.dim, ...ellipsis }}>{dateLabel}</span>
          <div data-testid="grid-now-btn" {...station(scrollToNow)} style={{ minHeight: MT.HIT, display: 'flex', alignItems: 'center', paddingLeft: 12, flexShrink: 0, cursor: 'pointer' }}>
            <span style={{ minHeight: 30, padding: '0 14px', borderRadius: 999, background: MT.accMix(18), fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>{tt('gridNow')}</span>
          </div>
        </div>
      </div>

      {!hasRows ? (
        // Kanalerna kommer ur appens index och tablån ur fönsteranropet:
        // tomt betyder "hämtar" tills båda landat, annars saknas tablå.
        <div data-testid="grid-phone-empty" style={{ margin: `12px ${MT.PAD}px`, padding: '32px 16px', textAlign: 'center', fontSize: 15, color: MT.muted, borderRadius: 12, background: MT.s05 }}>
          {model.channelsLoading ? tt('loadingChannels') : schedulesLoading ? tt('loadingGuide') : tt('gridEmpty')}
        </div>
      ) : (
        <div ref={scrollRef} data-scroll="" data-testid="grid-phone-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', marginTop: 8, paddingBottom: MT.SCROLL_PAD_BOTTOM }}>
          <div style={{ position: 'relative', minWidth: PHONE_CHANNEL_COL_PX + gridWidth }}>
            {/* Tidsraden: sticky i överkant; hörnet är sticky i vänsterkant så
                etiketterna aldrig glider in över kanalkolumnen. */}
            <div style={{ position: 'sticky', top: 0, zIndex: 3, display: 'flex', minHeight: TIME_ROW_H, background: MT.bg, borderBottom: `1px solid ${MT.line07}` }}>
              <div style={{ position: 'sticky', left: 0, zIndex: 1, width: PHONE_CHANNEL_COL_PX, flexShrink: 0, background: MT.bg }} />
              {marks.map((mark) => (
                <div key={mark} data-testid="grid-time-label" data-ms={String(mark)} style={{ width: 30 * PHONE_PX_PER_MIN, flexShrink: 0, fontSize: 11, color: MT.faint, lineHeight: `${TIME_ROW_H}px`, whiteSpace: 'nowrap' }}>{formatClock(mark, locale)}</div>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              {/* Nu-linjen: under kanalkolumnen (zIndex 2) så den försvinner
                  bakom den när man dragit förbi. Nu är alltid i fönstret —
                  det börjar 30 minuter före. */}
              <div data-testid="grid-now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: PHONE_CHANNEL_COL_PX + nowLeft, width: 2, background: MT.acc, boxShadow: `0 0 12px ${MT.accMix(60)}`, zIndex: 1, pointerEvents: 'none' }} />
              {rows.map(({ channel }) => {
                const key = channelKey(channel)
                const entries = entriesByChannel.get(key) ?? []
                return (
                  <div key={key} style={{ display: 'flex', height: PHONE_ROW_H_PX, borderBottom: `1px solid ${MT.line07}` }}>
                    <div
                      data-testid="grid-phone-channel"
                      {...station(() => nav.openChannel(channel), (element) => nav.channelMenu(channel, element))}
                      style={{ position: 'sticky', left: 0, zIndex: 2, width: PHONE_CHANNEL_COL_PX, flexShrink: 0, background: MT.bg, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', boxSizing: 'border-box', cursor: 'pointer' }}
                    >
                      <MobileLogo channel={channel} width={40} height={28} radius={6} />
                      <span style={{ minWidth: 0, fontSize: 12, fontWeight: 600, ...clamp2 }}>{channel.name}</span>
                    </div>
                    <div style={{ position: 'relative', width: gridWidth, flexShrink: 0 }}>
                      {entries.map(({ box, programme }) => {
                        const live = isLive(programme)
                        return (
                          <div
                            key={programme.start}
                            data-testid="grid-block"
                            data-shape={box.shape}
                            {...(live ? { 'data-live': '1' } : {})}
                            {...station(() => nav.openChannel(channel, programme.start))}
                            style={{
                              position: 'absolute', top: BLOCK_TOP, left: box.left, width: Math.max(box.width - 4, 4), height: BLOCK_H,
                              boxSizing: 'border-box', borderRadius: 10, padding: box.shape === 'marker' ? 0 : '8px 10px',
                              background: live ? MT.accMix(18) : MT.s05, border: `1px solid ${live ? MT.accMix(45) : 'transparent'}`,
                              overflow: 'hidden', cursor: 'pointer',
                            }}
                          >
                            {box.shape !== 'marker' ? (
                              <>
                                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: '16px', ...ellipsis }}>{programme.title}</div>
                                {box.shape === 'full' ? <div style={{ fontSize: 11, lineHeight: '14px', color: MT.dim, ...ellipsis }}>{formatClock(programme.start, locale)}</div> : null}
                              </>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Visa fler ligger i den breda ytan men är sticky i vänsterkant:
                `margin: auto` hade centrerat den i hela tablåbredden, långt
                utanför skärmen. Vänsterställd i kanalkolumnens kant följer den
                med i sidoscrollen. */}
            {hasMore ? (
              <div data-testid="show-more" {...station(() => setVisibleRows((count) => count + ROWS_STEP))} style={{ position: 'sticky', left: 0, margin: `16px 0 0 ${MT.PAD}px`, width: 'fit-content', minHeight: MT.HIT, padding: '0 24px', borderRadius: 999, background: MT.s10, display: 'flex', alignItems: 'center', fontSize: 15, cursor: 'pointer' }}>{tt('showMore')}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
