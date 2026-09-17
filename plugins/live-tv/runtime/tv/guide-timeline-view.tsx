'use client'

import { useEffect, useMemo, useState, type JSX, type MouseEvent } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import { formatClock } from '../live-tv-ui'
import { startOfLocalDay } from '../live-tv-model'
import { TV, station } from './tv-ui'
import { useTvText } from './tv-strings'
import type { TimelineZoom } from './tv-settings-store'
import { epgRowBoxes, mergeShortBlocks, nowLinePx, timelineWindow, type EpgBlockBox, type ShapeThresholds } from './epg-grid-geometry'
import { useGridRows } from './grid-rows'
import { GuideChannelCell, guideCellStyle } from './tv-guide-shared'
import { ROWS_STEP, ellipsis, initAttr } from './guide-view-shared'
import type { GuideSelection, GuideViewProps } from './guide-types'

/**
 * Timeline — dagsöversikten (spec §4, handoffen §3). Vyn äger sitt EGET
 * fönster ur zoomen (`timelineWindow`: 2 h / 6 h / hela dagen 06–24) och
 * struntar i skalets `windowStart` — Grids halvtimmesfönster är för smalt
 * för en överblick. Typerna kommer ur `guide-types.ts`, aldrig ur
 * `guide-shell.tsx` som importerar hit.
 *
 * Layout: tidsaxel 30 px (spalter: 2 h vid `day`, 1 h vid `6h`, 30 min vid
 * `2h`) → rader 40 px (kanalcell `timeline` + spår med block i PROCENT av
 * spårbredden) → tomma rader sist som EN cell → fotrad 48 px med hjälptext
 * och Visa fler. Blocken saknar tidstext; block under 20 min i vald zoom
 * ritas som staplar utan text (`{ marker: 20·pctPerMin, title: samma }` — en
 * enda tröskel, aldrig ett "bara titel"-läge), och vid `day` slås angränsande
 * korta block ihop till `Titel · Titel` (`mergeShortBlocks`).
 *
 * Interaktion: HELA raden är en station (blocken är inte egna stationer —
 * ett block i ett block hade splittrat fjärrens fokusordning). Klick på
 * skrivbord räknar tidpunkten ur klickets x i spåret (`[data-track]`), OK
 * på TV tar nu om nu ligger i fönstret, annars fönstrets start. Skalet
 * byter till Grid med fönstret på den halvtimmen (`onOpenGrid`).
 */

const ROW_H_PX = 40
const AXIS_H_PX = 30
const FOOTER_H_PX = 48
/** Under 20 minuter i vald zoom = stapel utan text (handoffen §3). */
const SHORT_BLOCK_MIN = 20
/** Spaltsteg per zoom (handoffen §3: 2-timmarsspalter vid `day`). */
const AXIS_STEP_MS: Record<TimelineZoom, number> = { '2h': 30 * 60_000, '6h': 3_600_000, day: 2 * 3_600_000 }

type TimelineEntry = { box: EpgBlockBox; programme: EpgProgramme; mergedTitle?: string }

export function GuideTimelineView({ model, category, dayOffset, selection, onSelect, isTv, zoom, onOpenGrid }: GuideViewProps & { zoom: TimelineZoom; onOpenGrid(atMs: number): void }): JSX.Element {
  const { tt, locale } = useTvText()
  const { nowMs } = model
  const [visibleRows, setVisibleRows] = useState(ROWS_STEP)
  useEffect(() => { setVisibleRows(ROWS_STEP) }, [category, dayOffset, zoom])

  // Fönstret ur zoomen; Imorgon flyttar det med DAGENS längd (inte 24 h —
  // sommartidsbyten gör dygnet 23/25 h) så `day` blir 06–24 nästa dag och
  // 2h/6h samma klockslag imorgon.
  const win = useMemo(() => {
    const base = timelineWindow(nowMs, zoom)
    if (dayOffset === 0) return base
    const shift = startOfLocalDay(nowMs, 1) - startOfLocalDay(nowMs)
    return { ...base, start: base.start + shift, end: base.end + shift }
  }, [nowMs, zoom, dayOffset])
  const { start: windowStart, end: windowEnd, pctPerMin } = win

  const { rows, withoutEpg, hasMore, schedulesLoading } = useGridRows(model, category, visibleRows, windowStart, windowEnd)

  const labels = useMemo(() => {
    const marks: number[] = []
    for (let t = windowStart; t < windowEnd; t += AXIS_STEP_MS[zoom]) marks.push(t)
    return marks
  }, [windowStart, windowEnd, zoom])
  const nowLeft = nowLinePx(nowMs, windowStart, pctPerMin)
  const nowVisible = nowLeft >= 0 && nowLeft <= 100

  // Geometrin räknas EN gång per rad och fönster: trösklarna i SAMMA enhet
  // som bredden (procent), och sammanslagningen bara vid `day` med samma
  // trösklar så det ihopslagna blockets form bedöms rätt.
  const thresholds = useMemo<ShapeThresholds>(() => ({ marker: SHORT_BLOCK_MIN * pctPerMin, title: SHORT_BLOCK_MIN * pctPerMin }), [pctPerMin])
  const entriesByChannel = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>()
    for (const row of rows) {
      const entries = epgRowBoxes(row.programmes, windowStart, windowEnd, pctPerMin, thresholds)
      map.set(channelKey(row.channel), zoom === 'day' ? mergeShortBlocks(entries, SHORT_BLOCK_MIN * pctPerMin, thresholds) : entries)
    }
    return map
  }, [rows, windowStart, windowEnd, pctPerMin, thresholds, zoom])

  // Pågående = nu-linjen ligger i blocket. Geometriskt i stället för på
  // programtider, så ett SAMMANSLAGET block (som bara bär första programmet)
  // också blir pågående när nu ligger i något av dess program.
  const isLive = (box: EpgBlockBox) => nowVisible && nowLeft >= box.left && nowLeft < box.left + box.width

  /**
   * Tidpunkten ur ett klick: x relativt spåret (`[data-track]` i raden —
   * eller raden själv, om den bär attributet). Utan mätbar geometri (fjärr,
   * tangentbord, happy-dom) → `null`, och OK-vägen tar över: nu om nu ligger
   * i fönstret, annars fönstrets start.
   */
  const timeFromClick = (event: MouseEvent<HTMLElement>): number | null => {
    const host = event.currentTarget
    const track = host.matches('[data-track]') ? host : host.querySelector<HTMLElement>('[data-track]')
    if (!track || typeof event.clientX !== 'number') return null
    const rect = track.getBoundingClientRect()
    if (!(rect.width > 0)) return null
    const frac = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    return Math.min(windowEnd - 1, windowStart + frac * (windowEnd - windowStart))
  }
  const okTime = () => (nowMs >= windowStart && nowMs < windowEnd ? nowMs : windowStart)
  const open = (sel: GuideSelection, atMs: number) => {
    onSelect(sel)
    onOpenGrid(atMs)
  }
  /** Radens station: OK = `okTime`, klick = klickets tid (faller tillbaka på OK-tiden). */
  const rowStation = (sel: GuideSelection, init: boolean) => ({
    ...station(() => open(sel, okTime()), undefined, initAttr(init)),
    onClick: (event: MouseEvent<HTMLElement>) => open(sel, timeFromClick(event) ?? okTime()),
    onFocus: isTv ? () => onSelect(sel) : undefined,
  })

  const selectedKey = selection ? channelKey(selection.channel) : null
  const liveProgramme = (channel: M3uChannel) =>
    (entriesByChannel.get(channelKey(channel)) ?? []).find((entry) => isLive(entry.box))?.programme ?? null

  // Tomläge som Grid: inga rader, ELLER tablåerna hämtas fortfarande och inga
  // rader har kommit (annars flimrar varje kanal förbi som "Ingen tablå").
  const nothing = rows.length === 0 && (withoutEpg.length === 0 || schedulesLoading)
  const cellStyle = guideCellStyle('timeline')

  return (
    <div data-testid="guide-timeline-view" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Tidsaxel 30 px: avståndsbit i kanalcellens EXAKTA layoutkontext,
          sedan en etikett per spalt (11 px, 40 %, padding-left 6). */}
      <div data-testid="timeline-time-axis" style={{ height: AXIS_H_PX, minHeight: AXIS_H_PX, display: 'flex', borderBottom: `1px solid ${TV.line}`, boxSizing: 'border-box' }}>
        <div style={cellStyle} />
        {labels.map((mark) => (
          <div key={mark} data-testid="timeline-time-label" style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 6, display: 'flex', alignItems: 'center', fontSize: 11, color: 'rgba(243,244,248,0.4)', letterSpacing: '0.06em', ...ellipsis }}>
            {formatClock(mark, locale)}
          </div>
        ))}
      </div>

      <div data-scroll="" data-testid="timeline-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* Tomrutan är alltid monterad (dold när innehåll finns) och bär i
            tomläget en passiv station med `data-init` — vyn måste ha en
            startstation, annars låser sig fjärren. */}
        <div
          data-testid="timeline-empty"
          {...(nothing ? station(() => {}, undefined, initAttr(true)) : {})}
          style={{ display: nothing ? 'block' : 'none', margin: 20, padding: 20, borderRadius: 12, background: TV.s05, fontSize: 13, color: TV.faint, lineHeight: 1.5 }}
        >
          {model.channelsLoading ? tt('loadingChannels') : schedulesLoading ? tt('loadingGuide') : tt('guideEmpty')}
        </div>
        {nothing ? null : (
          <div style={{ position: 'relative' }}>
            {rows.map(({ channel }, index) => {
              const key = channelKey(channel)
              const entries = entriesByChannel.get(key) ?? []
              const sel: GuideSelection = { channel, programme: liveProgramme(channel) }
              return (
                <div
                  key={key}
                  data-testid="timeline-row"
                  data-selected={selectedKey === key ? '' : undefined}
                  {...rowStation(sel, index === 0)}
                  style={{ display: 'flex', height: ROW_H_PX, minHeight: ROW_H_PX, borderBottom: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <div style={{ ...cellStyle, display: 'flex', alignItems: 'stretch' }}>
                    <GuideChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} variant="timeline" />
                  </div>
                  <div data-track="" data-testid="timeline-track" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    {entries.map(({ box, programme, mergedTitle }) => (
                      <TimelineBlock key={programme.start} box={box} programme={programme} title={mergedTitle} locale={locale} live={isLive(box)} />
                    ))}
                  </div>
                </div>
              )
            })}
            {/* Tomma rader kollapsar (handoffen): kanaler utan tablå i
                fönstret sorteras SIST och får EN cell över spårbredden.
                Cellen är spåret, så ett klick i den ger också en tidpunkt. */}
            {withoutEpg.map((channel, index) => {
              const key = channelKey(channel)
              const sel: GuideSelection = { channel, programme: null }
              return (
                <div
                  key={key}
                  data-testid="timeline-empty-row"
                  data-selected={selectedKey === key ? '' : undefined}
                  {...rowStation(sel, rows.length === 0 && index === 0)}
                  style={{ display: 'flex', height: ROW_H_PX, minHeight: ROW_H_PX, background: 'rgba(252,252,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <div style={{ ...cellStyle, display: 'flex', alignItems: 'stretch' }}>
                    <GuideChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} variant="timeline" />
                  </div>
                  <div data-track="" data-testid="timeline-empty-cell" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, color: 'rgba(243,244,248,0.4)', ...ellipsis }}>
                    {tt('noEpgRow')}
                  </div>
                </div>
              )
            })}
            {/* Spaltlinjer och nu-linje över hela listhöjden, bara i
                spårbredden. `left` i procent av spåret, samma skala som
                blocken. */}
            <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: cellStyle.width, right: 0, display: 'flex', pointerEvents: 'none' }}>
              {labels.map((mark) => <div key={mark} style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.06)' }} />)}
              {nowVisible ? (
                <div data-testid="timeline-now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: `${nowLeft}%`, width: 2, background: TV.acc, boxShadow: `0 0 14px ${TV.accMix(55)}`, zIndex: 2 }} />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Fotrad 48 px: hjälptexten + Visa fler — en vanlig rad under listan. */}
      {nothing ? null : (
        <div data-testid="timeline-footer" style={{ height: FOOTER_H_PX, minHeight: FOOTER_H_PX, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14, borderTop: `1px solid ${TV.line}`, boxSizing: 'border-box' }}>
          <span style={{ fontSize: 13, color: 'rgba(243,244,248,0.35)', ...ellipsis }}>{tt('timelineHint')}</span>
          {hasMore ? (
            <div data-testid="timeline-show-more" {...station(() => setVisibleRows((count) => count + ROWS_STEP))} style={{ marginLeft: 'auto', height: 32, minHeight: 32, padding: '0 14px', borderRadius: 999, background: TV.s10, display: 'inline-flex', alignItems: 'center', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
              {tt('showMoreN', { n: ROWS_STEP })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

/**
 * ETT block, utan tid och utan egen station (raden är stationen; klicket
 * bubblar dit och ger tidpunkten ur x). `marker` = ren stapel utan text —
 * `title`-attributet är enda vägen till namnet. `title` (prop) är den
 * sammanslagna `A · B`-titeln vid `day`, annars programmets.
 */
function TimelineBlock({ box, programme, title, locale, live }: { box: EpgBlockBox; programme: EpgProgramme; title?: string; locale: string; live: boolean }) {
  const marker = box.shape === 'marker'
  const label = title ?? programme.title
  const times = title ? '' : ` ${box.clippedStart ? '…' : formatClock(programme.start, locale)}–${box.clippedEnd ? '…' : formatClock(programme.stop, locale)}`
  return (
    <div
      data-testid="timeline-block"
      data-shape={box.shape}
      data-live={live ? '' : undefined}
      title={`${label}${times}`}
      style={{ position: 'absolute', top: 5, bottom: 5, left: `${box.left}%`, width: `${box.width}%`, paddingRight: 2, boxSizing: 'border-box' }}
    >
      <div
        style={{
          height: '100%',
          boxSizing: 'border-box',
          borderRadius: marker ? 0 : 6,
          padding: marker ? 0 : '0 8px',
          display: 'flex',
          alignItems: 'center',
          background: marker ? TV.acc : live ? 'rgba(59,130,246,0.22)' : TV.s05,
          border: live ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
          overflow: 'hidden',
        }}
      >
        {marker ? null : <span style={{ fontSize: 12, fontWeight: live ? 600 : 400, color: live ? TV.text : 'rgba(243,244,248,0.65)', ...ellipsis }}>{label}</span>}
      </div>
    </div>
  )
}
