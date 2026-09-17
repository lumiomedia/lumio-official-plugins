'use client'

import { useEffect, useMemo, useRef, useState, type JSX, type MouseEvent } from 'react'
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
import { PX_PER_MIN_GRID } from './guide-grid-view'
import { ROWS_STEP, ellipsis, gp, initAttr } from './guide-view-shared'
import type { GuideSelection, GuideViewProps } from './guide-types'

/**
 * Timeline — dagsöversikten (spec §4, handoffen §3). Vyn äger sitt EGET
 * fönster och struntar i skalets `windowStart` — Grids halvtimmesfönster är
 * för smalt för en överblick. Typerna kommer ur `guide-types.ts`, aldrig ur
 * `guide-shell.tsx` som importerar hit.
 *
 * Layout (samma mönster som Grid efter Jerrys omarbetning): EN scrollyta
 * (`data-scroll`, `overflow: auto`) med tidsaxeln sticky i överkant och
 * kanalkolumnen sticky i vänsterkant, rader 40 px (kanalcell `timeline` +
 * spår med block i PX), tomma rader sist som EN cell över spårbredden, och
 * under ytan en fotrad 48 px med hjälptext och Visa fler.
 *
 * Zoomen är TÄTHET, inte fönster: fönstret börjar där `timelineWindow`
 * säger (halvtimmen före nu vid `2h`, timmen före vid `6h`, 06:00 vid
 * `day`) men slutar ALLTID i morgon 06:00, så resten av dagen nås genom att
 * scrolla i sidled bakom kanalkolumnen. Zoomen sätter bara px/min ur Grids
 * `PX_PER_MIN_GRID` (×1,5 / ×0,5 / ×0,2 → 2 h, 6 h resp. 18 h ≈ en skärm).
 * Spalterna följer zoomen (30 min / 1 h / 2 h) och etikettbredden är
 * steg × px/min. Blocken saknar tidstext; block under 20 min i vald zoom
 * ritas som staplar utan text (`{ marker: 20·pxPerMin, title: samma }` — en
 * enda tröskel, aldrig ett "bara titel"-läge), och vid `day` slås
 * angränsande korta block ihop till `Titel · Titel` (`mergeShortBlocks`).
 * Nu-linjen landar intill kanalkolumnen när innehållet kommit, vid
 * zoombyte och på Nu-knappen (`nowTick` från skalet), som Grid.
 *
 * Interaktion: HELA raden är en station (blocken är inte egna stationer —
 * ett block i ett block hade splittrat fjärrens fokusordning). Klick på
 * skrivbord räknar tidpunkten ur klickets x i spåret (`[data-track]`), OK
 * på TV tar nu om nu ligger i fönstret, annars fönstrets start. Skalet
 * byter till Grid med fönstret på den halvtimmen (`onOpenGrid`).
 */

const ROW_H_PX = gp(40)
const AXIS_H_PX = gp(30)
const FOOTER_H_PX = gp(48)
/** Under 20 minuter i vald zoom = stapel utan text (handoffen §3). */
const SHORT_BLOCK_MIN = 20
/** Spaltsteg per zoom (handoffen §3: 2-timmarsspalter vid `day`). */
const AXIS_STEP_MS: Record<TimelineZoom, number> = { '2h': 30 * 60_000, '6h': 3_600_000, day: 2 * 3_600_000 }
/** Täthet per zoom, relativt Grids skala: 2 h, 6 h resp. 18 h ryms på ungefär en skärm. */
const ZOOM_FACTOR: Record<TimelineZoom, number> = { '2h': 1.5, '6h': 0.5, day: 0.2 }
/** Scen-px per minut i vald zoom. */
export function timelinePxPerMin(zoom: TimelineZoom): number {
  return PX_PER_MIN_GRID * ZOOM_FACTOR[zoom]
}
/** Hur långt före nu-linjen scrollen landar: det som nyss började syns intill kolumnen. */
const NOW_LEAD_PX = gp(40)
const CHANNEL_COL_PX = guideCellStyle('timeline').width as number

type TimelineEntry = { box: EpgBlockBox; programme: EpgProgramme; mergedTitle?: string }

export function GuideTimelineView({ model, nav, category, dayOffset, nowTick, selection, onSelect, isTv, zoom, onOpenGrid }: GuideViewProps & { zoom: TimelineZoom; onOpenGrid(atMs: number): void }): JSX.Element {
  const { tt, locale } = useTvText()
  const { nowMs } = model
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [visibleRows, setVisibleRows] = useState(ROWS_STEP)
  useEffect(() => { setVisibleRows(ROWS_STEP) }, [category, dayOffset, zoom])

  // Fönstret: start ur zoomen, slut ALLTID i morgon 06:00 (zoomen är
  // täthet, användaren scrollar vidare). Imorgon flyttar det med DAGENS
  // längd (inte 24 h — sommartidsbyten gör dygnet 23/25 h) så `day` blir
  // 06→06 nästa dag och 2h/6h samma klockslag imorgon.
  const pxPerMin = timelinePxPerMin(zoom)
  const win = useMemo(() => {
    const base = { start: timelineWindow(nowMs, zoom).start, end: startOfLocalDay(nowMs, 1) + 6 * 3_600_000 }
    if (dayOffset === 0) return base
    const shift = startOfLocalDay(nowMs, 1) - startOfLocalDay(nowMs)
    return { start: base.start + shift, end: base.end + shift }
  }, [nowMs, zoom, dayOffset])
  const { start: windowStart, end: windowEnd } = win

  const { rows, withoutEpg, hasMore, schedulesLoading } = useGridRows(model, category, visibleRows, windowStart, windowEnd)

  const labels = useMemo(() => {
    const marks: number[] = []
    for (let t = windowStart; t < windowEnd; t += AXIS_STEP_MS[zoom]) marks.push(t)
    return marks
  }, [windowStart, windowEnd, zoom])
  const labelWidth = (AXIS_STEP_MS[zoom] / 60_000) * pxPerMin
  const trackWidth = ((windowEnd - windowStart) / 60_000) * pxPerMin
  const nowLeft = nowLinePx(nowMs, windowStart, pxPerMin)
  const nowVisible = nowLeft >= 0 && nowLeft <= trackWidth

  // Geometrin räknas EN gång per rad och fönster: trösklarna i SAMMA enhet
  // som bredden (px), och sammanslagningen bara vid `day` med samma
  // trösklar så det ihopslagna blockets form bedöms rätt.
  const thresholds = useMemo<ShapeThresholds>(() => ({ marker: SHORT_BLOCK_MIN * pxPerMin, title: SHORT_BLOCK_MIN * pxPerMin }), [pxPerMin])
  const entriesByChannel = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>()
    for (const row of rows) {
      const entries = epgRowBoxes(row.programmes, windowStart, windowEnd, pxPerMin, thresholds)
      map.set(channelKey(row.channel), zoom === 'day' ? mergeShortBlocks(entries, SHORT_BLOCK_MIN * pxPerMin, thresholds) : entries)
    }
    return map
  }, [rows, windowStart, windowEnd, pxPerMin, thresholds, zoom])

  // Tomläge som Grid: inga rader, ELLER tablåerna hämtas fortfarande och inga
  // rader har kommit (annars flimrar varje kanal förbi som "Ingen tablå").
  const nothing = rows.length === 0 && (withoutEpg.length === 0 || schedulesLoading)

  /**
   * Scrollmålet intill kanalkolumnen: nu-linjen, `NOW_LEAD_PX` före. Körs
   * när innehållet kommit (rader eller tomrader), när fönstret/tätheten
   * byts (zoom, dag) och på varje Nu-tryck (`nowTick`), som Grid. Imorgon
   * ligger nu före fönstret → 0.
   */
  useEffect(() => {
    const el = scrollRef.current
    if (!el || nothing) return
    el.scrollLeft = Math.max(0, nowLinePx(nowMs, windowStart, pxPerMin) - NOW_LEAD_PX)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart, pxPerMin, nowTick, nothing])

  // Pågående = nu-linjen ligger i blocket. Geometriskt i stället för på
  // programtider, så ett SAMMANSLAGET block (som bara bär första programmet)
  // också blir pågående när nu ligger i något av dess program.
  const isLive = (box: EpgBlockBox) => nowVisible && nowLeft >= box.left && nowLeft < box.left + box.width

  /**
   * Tidpunkten ur ett klick: x relativt spåret (`[data-track]` i raden —
   * eller raden själv, om den bär attributet). Rektangeln är redan
   * scrolljusterad, så `clientX − rect.left` är px in i spåret och
   * px/min ger tiden direkt. Utan mätbar geometri (fjärr, tangentbord,
   * happy-dom) → `null`, och OK-vägen tar över: nu om nu ligger i fönstret,
   * annars fönstrets start.
   */
  const timeFromClick = (event: MouseEvent<HTMLElement>): number | null => {
    const host = event.currentTarget
    const track = host.matches('[data-track]') ? host : host.querySelector<HTMLElement>('[data-track]')
    if (!track || typeof event.clientX !== 'number') return null
    const rect = track.getBoundingClientRect()
    if (!(rect.width > 0)) return null
    const atMs = windowStart + ((event.clientX - rect.left) / pxPerMin) * 60_000
    return Math.min(windowEnd - 1, Math.max(windowStart, atMs))
  }
  const okTime = () => (nowMs >= windowStart && nowMs < windowEnd ? nowMs : windowStart)
  const open = (sel: GuideSelection, atMs: number) => {
    onSelect(sel)
    onOpenGrid(atMs)
  }
  /**
   * Radens station: OK = `okTime`, klick = klickets tid (faller tillbaka på
   * OK-tiden), håll = glasmenyn för kanalen (som Grid och Now / Next — utan
   * den saknade Timeline lås/fäst/favorit på TV). Klick-handlaren skrivs
   * över för x-mätningen, så `defaultPrevented`-vakten mot ett fyrat håll
   * upprepas här.
   */
  const rowStation = (sel: GuideSelection, init: boolean) => ({
    ...station(() => open(sel, okTime()), (el) => nav.channelMenu(sel.channel, el), initAttr(init)),
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented) return
      open(sel, timeFromClick(event) ?? okTime())
    },
    onFocus: isTv ? () => onSelect(sel) : undefined,
  })

  const selectedKey = selection ? channelKey(selection.channel) : null
  const liveProgramme = (channel: M3uChannel) =>
    (entriesByChannel.get(channelKey(channel)) ?? []).find((entry) => isLive(entry.box))?.programme ?? null

  // Kanalcellen är sticky i vänsterkant (zIndex 2, egen bakgrund) så
  // spåret scrollar bakom den. Raden är stationen, cellen bara layout.
  const channelCell = (channel: M3uChannel) => {
    const key = channelKey(channel)
    return (
      <div data-testid="timeline-channel" style={{ ...guideCellStyle('timeline'), position: 'sticky', left: 0, zIndex: 2, background: TV.bg, display: 'flex', alignItems: 'stretch' }}>
        <GuideChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} variant="timeline" />
      </div>
    )
  }

  return (
    <div data-testid="guide-timeline-view" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* EN scrollyta i båda leden. Listan bär `data-scroll` så fokusmotorn
          scrollar fokus i sikte. Innerbredden = kanalkolumn + spår, så
          tidsaxeln (sticky i överkant) scrollar i x tillsammans med raderna. */}
      <div ref={scrollRef} data-scroll="" data-testid="timeline-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* Tomrutan är alltid monterad (dold när innehåll finns) och bär i
            tomläget en passiv station med `data-init` — vyn måste ha en
            startstation, annars låser sig fjärren. */}
        <div
          data-testid="timeline-empty"
          {...(nothing ? station(() => {}, undefined, initAttr(true)) : {})}
          style={{ display: nothing ? 'block' : 'none', margin: gp(20), padding: gp(20), borderRadius: gp(12), background: TV.s05, fontSize: gp(13), color: TV.faint, lineHeight: 1.5 }}
        >
          {model.channelsLoading ? tt('loadingChannels') : schedulesLoading ? tt('loadingGuide') : tt('guideEmpty')}
        </div>
        {nothing ? null : (
          <div style={{ minWidth: CHANNEL_COL_PX + trackWidth }}>
            {/* Tidsaxel 30 px, sticky i överkant. Hörnet är sticky i
                vänsterkant (kanalcellens EXAKTA layoutkontext) så
                etiketterna aldrig glider in över kanalkolumnen. Etikett-
                bredden = spaltsteg × px/min (11 px, 40 %, padding-left 6). */}
            <div data-testid="timeline-time-axis" style={{ position: 'sticky', top: 0, zIndex: 3, height: AXIS_H_PX, minHeight: AXIS_H_PX, display: 'flex', background: TV.bg, borderBottom: `1px solid ${TV.line}`, boxSizing: 'border-box' }}>
              <div style={{ ...guideCellStyle('timeline'), position: 'sticky', left: 0, zIndex: 1, background: TV.bg }} />
              {labels.map((mark) => (
                <div key={mark} data-testid="timeline-time-label" data-ms={String(mark)} style={{ width: labelWidth, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: gp(6), boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontSize: gp(11), color: 'rgba(243,244,248,0.4)', letterSpacing: '0.06em', ...ellipsis }}>
                  {formatClock(mark, locale)}
                </div>
              ))}
            </div>
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
                    {channelCell(channel)}
                    <div data-track="" data-testid="timeline-track" style={{ width: trackWidth, flexShrink: 0, position: 'relative' }}>
                      {entries.map(({ box, programme, mergedTitle }) => (
                        <TimelineBlock key={programme.start} box={box} programme={programme} title={mergedTitle} locale={locale} live={isLive(box)} />
                      ))}
                    </div>
                  </div>
                )
              })}
              {/* Tomma rader kollapsar (handoffen): kanaler utan tablå i
                  fönstret sorteras SIST och får EN cell över spårbredden
                  (inte sticky). Cellen är spåret, så ett klick i den ger
                  också en tidpunkt. */}
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
                    {channelCell(channel)}
                    <div data-track="" data-testid="timeline-empty-cell" style={{ width: trackWidth, flexShrink: 0, display: 'flex', alignItems: 'center', padding: `0 ${gp(12)}px`, boxSizing: 'border-box', fontSize: gp(12), color: 'rgba(243,244,248,0.4)', ...ellipsis }}>
                      {tt('noEpgRow')}
                    </div>
                  </div>
                )
              })}
              {/* Spaltlinjer och nu-linje över hela radhöjden, bara i
                  spårbredden (efter kanalkolumnen). `left` i px, samma
                  skala som blocken; zIndex under kanalkolumnen (2) så
                  linjen försvinner bakom den när man scrollat förbi. */}
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: CHANNEL_COL_PX, width: trackWidth, display: 'flex', pointerEvents: 'none' }}>
                {labels.map((mark) => <div key={mark} style={{ width: labelWidth, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box' }} />)}
                {nowVisible ? (
                  <div data-testid="timeline-now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: nowLeft, width: gp(2), background: TV.acc, boxShadow: `0 0 ${gp(14)}px ${TV.accMix(55)}`, zIndex: 1 }} />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fotrad 48 px: hjälptexten + Visa fler — en vanlig rad under
          scrollytan, aldrig en flytande pill över sista raden. */}
      {nothing ? null : (
        <div data-testid="timeline-footer" style={{ height: FOOTER_H_PX, minHeight: FOOTER_H_PX, padding: `0 ${gp(20)}px`, display: 'flex', alignItems: 'center', gap: gp(14), borderTop: `1px solid ${TV.line}`, boxSizing: 'border-box' }}>
          <span style={{ fontSize: gp(13), color: 'rgba(243,244,248,0.35)', ...ellipsis }}>{tt('timelineHint')}</span>
          {hasMore ? (
            <div data-testid="timeline-show-more" {...station(() => setVisibleRows((count) => count + ROWS_STEP))} style={{ marginLeft: 'auto', height: gp(32), minHeight: gp(32), padding: `0 ${gp(14)}px`, borderRadius: 999, background: TV.s10, display: 'inline-flex', alignItems: 'center', fontSize: gp(13), cursor: 'pointer', flexShrink: 0 }}>
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
 * bubblar dit och ger tidpunkten ur x). `left`/`width` i px, samma skala
 * som spåret. `marker` = ren stapel utan text — `title`-attributet är enda
 * vägen till namnet. `title` (prop) är den sammanslagna `A · B`-titeln vid
 * `day`, annars programmets.
 */
function TimelineBlock({ box, programme, title, locale, live }: { box: EpgBlockBox; programme: EpgProgramme; title?: string; locale: string; live: boolean }) {
  const marker = box.shape === 'marker'
  const label = title ?? programme.title
  const times = title ? '' : ` ${box.clippedStart ? '…' : formatClock(programme.start, locale)}–${box.clippedEnd ? '…' : formatClock(programme.stop, locale)}`
  return (
    <div
      data-testid="timeline-block"
      data-guide-block=""
      data-shape={box.shape}
      data-live={live ? '' : undefined}
      title={`${label}${times}`}
      style={{ position: 'absolute', top: gp(5), bottom: gp(5), left: box.left, width: box.width, paddingRight: gp(2), boxSizing: 'border-box' }}
    >
      <div
        style={{
          height: '100%',
          boxSizing: 'border-box',
          borderRadius: marker ? 0 : gp(6),
          padding: marker ? 0 : `0 ${gp(8)}px`,
          display: 'flex',
          alignItems: 'center',
          background: marker ? TV.acc : live ? 'rgba(59,130,246,0.22)' : TV.s08,
          border: live ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
          overflow: 'hidden',
        }}
      >
        {marker ? null : <span style={{ minWidth: 0, fontSize: gp(12), fontWeight: live ? 600 : 400, color: live ? TV.text : 'rgba(243,244,248,0.65)', ...ellipsis }}>{label}</span>}
      </div>
    </div>
  )
}
