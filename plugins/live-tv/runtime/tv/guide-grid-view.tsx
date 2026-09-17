'use client'

import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import { formatClock } from '../live-tv-ui'
import { isReminded, toggleReminder } from '../reminders'
import { Icons, TV, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { epgRowBoxes, guideWindowStart, nowLinePx, type EpgBlockBox, type EpgRowEntry, type ShapeThresholds } from './epg-grid-geometry'
import { startOfLocalDay } from '../live-tv-model'
import { useGridRows } from './grid-rows'
import { GuideChannelCell, filterByGroup, guideCellStyle } from './tv-guide-shared'
import { GuideDetailPanel } from './guide-detail-panel'
import { GuidePaginationRow, ROWS_STEP, ellipsis, gp, initAttr, useHoverSelect, withPointerLeave } from './guide-view-shared'
import type { GuideSelection, GuideViewProps } from './guide-types'

/**
 * Grid — den städade guidens standardläge (spec §4, handoffen §1). Vyn äger
 * bara sidstorleken; läge, kategori, dag, fönsterstart och markering kommer
 * från skalet som props (`GuideViewProps`), och typerna hämtas ur
 * `guide-types.ts` — aldrig ur `guide-shell.tsx`, som importerar hit.
 *
 * Layout: vänster kolumn (`flex: 1; minWidth: 0`) = EN scrollyta
 * (`data-scroll`, `overflow: auto`) med tidsaxeln sticky i överkant och
 * kanalkolumnen sticky i vänsterkant, sedan pagineringsrad 52 px under
 * ytan; till höger den permanenta detaljpanelen (320 px).
 *
 * Fönstret är HELA dagen (Jerrys feedback: 3-timmarsfönstret i procent var
 * "svårt att se nåt"): i dag från halvtimmen före nu till i morgon 06:00,
 * i morgon 06:00–06:00. Geometrin är i px — `PX_PER_MIN_GRID` (≈ 7 scen-px
 * per minut, ett 30-minutersblock ≈ 200 px) — så hela program ryms och
 * resten av dagen nås genom att scrolla i sidled bakom kanalkolumnen.
 * Trösklarna för blockformen är px skalade med `gp`, samma enhet som
 * bredden. Nu-linjen landar intill kanalkolumnen vid mount, när raderna
 * kommer och på Nu-knappen (skalet nollar `windowStart` + `nowTick`).
 * Mönstret (sticky kolumn + x-scroll) är telefonens `guide-grid-phone.tsx`.
 */

const ROW_H_PX = gp(60)
const HALF_HOUR_MS = 30 * 60_000
/** Scen-px per minut i Grid: 30 min ≈ 200 px, så titel + tid ryms i ett normalt block. */
export const PX_PER_MIN_GRID = gp(4.7)
/** Formtrösklar i samma px-skala som blocken (`MIN_BLOCK_PX`/`TITLE_ONLY_PX` skalade med `gp`). */
const GRID_THRESHOLDS: ShapeThresholds = { marker: gp(18), title: gp(72) }
/** Hur långt före nu-linjen scrollen landar: det som nyss började syns intill kolumnen. */
const NOW_LEAD_PX = gp(40)
const CHANNEL_COL_PX = guideCellStyle('grid').width as number

/**
 * Dagens fönster ur dagvalet: i dag = halvtimmen före nu → i morgon 06:00,
 * i morgon = 06:00 → 06:00 dagen därpå. `windowStart` från skalet är
 * scrollmålet (Nu, Imorgon, klickad halvtimme i Timeline), inte axelns start.
 */
function gridWindow(nowMs: number, dayOffset: 0 | 1): { start: number; end: number } {
  if (dayOffset === 1) return { start: startOfLocalDay(nowMs, 1) + 6 * 3_600_000, end: startOfLocalDay(nowMs, 2) + 6 * 3_600_000 }
  return { start: guideWindowStart(nowMs) - HALF_HOUR_MS, end: startOfLocalDay(nowMs, 1) + 6 * 3_600_000 }
}

export function GuideGridView({ model, nav, category, dayOffset, windowStart, nowTick, selection, onSelect, isTv, detailPanel = true }: GuideViewProps & { detailPanel?: boolean }): JSX.Element {
  const { tt, locale } = useTvText()
  const { nowMs } = model
  const { start: gridStart, end: gridEnd } = gridWindow(nowMs, dayOffset)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [visibleRows, setVisibleRows] = useState(ROWS_STEP)
  // Påminnelser bor i lagringen, inte i modellen: en räknare tvingar fram
  // omritningen när klockikonen/panelknappen ska byta läge.
  const [reminderTick, setReminderTick] = useState(0)
  void reminderTick
  useEffect(() => { setVisibleRows(ROWS_STEP) }, [category, dayOffset, windowStart])

  const { rows, withoutEpg, hasMore, schedulesLoading } = useGridRows(model, category, visibleRows, gridStart, gridEnd)
  const total = filterByGroup(model, category).length
  const hover = useHoverSelect(!isTv, onSelect)

  // Etiketter var 30:e minut över hela fönstret; spårbredden följer dem.
  const labels = useMemo(() => {
    const list: number[] = []
    for (let t = gridStart; t < gridEnd; t += HALF_HOUR_MS) list.push(t)
    return list
  }, [gridStart, gridEnd])
  const trackWidth = ((gridEnd - gridStart) / 60_000) * PX_PER_MIN_GRID
  const nowLeft = nowLinePx(nowMs, gridStart, PX_PER_MIN_GRID)
  const nowVisible = nowLeft >= 0 && nowLeft <= trackWidth

  // Geometrin räknas EN gång per rad och fönster, inte per rendering (samma
  // skäl som i det gamla rutnätet: minuttick, fokusflytt och påminnelser
  // ritar om, men flyttar inga block).
  const entriesByChannel = useMemo(() => {
    const map = new Map<string, EpgRowEntry<EpgProgramme>[]>()
    for (const row of rows) map.set(channelKey(row.channel), epgRowBoxes(row.programmes, gridStart, gridEnd, PX_PER_MIN_GRID, GRID_THRESHOLDS))
    return map
  }, [rows, gridStart, gridEnd])

  /**
   * Scrollmålet intill kanalkolumnen: nu-linjen när skalets `windowStart` är
   * dagens halvtimme (mount, Nu), annars den begärda tiden (Imorgon → 0,
   * klickad halvtimme från Timeline). Körs när innehållet kommit (rader
   * eller tomrader — en dag utan tablå ska ändå landa på begärd tid), när
   * `windowStart` byts och på varje Nu-tryck (`nowTick`), som telefonen.
   */
  const nothing = rows.length === 0 && (withoutEpg.length === 0 || schedulesLoading)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || nothing) return
    const targetMs = windowStart === guideWindowStart(nowMs) ? nowMs : windowStart
    el.scrollLeft = Math.max(0, nowLinePx(targetMs, gridStart, PX_PER_MIN_GRID) - NOW_LEAD_PX)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart, nowTick, nothing])

  const isLive = (programme: EpgProgramme) => programme.start <= nowMs && programme.stop > nowMs
  const toggle = (channel: M3uChannel, programme: EpgProgramme) => {
    toggleReminder(channel, programme, nowMs)
    setReminderTick((value) => value + 1)
  }
  const remindAction = (channel: M3uChannel, programme: EpgProgramme) => ({
    key: 'remind',
    label: isReminded(channel, programme) ? tt('removeReminder') : tt('remindMe'),
    run: () => toggle(channel, programme),
  })

  /**
   * Precis EN `data-init` i vyn: det pågående blocket i första raden (ur de
   * ENTRIES som ritas — ett pågående program kan ha svalts av överlapps-
   * lösningen), annars den radens kanalcell, annars första tomma radens cell,
   * annars tomtexten. Utan startstation låser sig fjärren.
   */
  const initKey = useMemo(() => {
    const first = rows[0]
    if (!first) return withoutEpg[0] ? { channel: channelKey(withoutEpg[0]), start: null as number | null, empty: true } : null
    const key = channelKey(first.channel)
    const live = (entriesByChannel.get(key) ?? []).find((entry) => isLive(entry.programme))
    return { channel: key, start: live ? live.programme.start : null, empty: false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, withoutEpg, entriesByChannel, nowMs])
  const selectedKey = selection ? channelKey(selection.channel) : null
  const isSelected = (channel: M3uChannel, programme: EpgProgramme | null) =>
    selectedKey === channelKey(channel) && (selection?.programme?.start ?? null) === (programme?.start ?? null)

  const channelCell = (channel: M3uChannel, init: boolean) => {
    const key = channelKey(channel)
    return (
      <div
        data-testid="grid-channel"
        title={channel.name}
        {...station(() => nav.openChannel(channel), (element) => nav.channelMenu(channel, element), initAttr(init))}
        style={{ ...guideCellStyle('grid'), position: 'sticky', left: 0, zIndex: 2, background: TV.bg, display: 'flex', alignItems: 'stretch', cursor: 'pointer' }}
      >
        <GuideChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} variant="grid" />
      </div>
    )
  }

  // Tomläge (`nothing`, ovan): inga rader alls, ELLER tablåerna hämtas
  // fortfarande och inga rader har kommit — utan det andra villkoret hade
  // varje kanal flimrat förbi som "Ingen tablå" innan hämtningen sorterade om dem.

  return (
    <div data-testid="guide-grid-view" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* EN scrollyta i båda leden. Listan bär `data-scroll` så fokusmotorn
            scrollar fokus i sikte; spåren bär MEDVETET inget `data-row` (en
            sluten ◂▸-grupp hade hoppat från radens sista block till nästa
            rads första). Innerbredden = kanalkolumn + spår, så tidsaxeln
            (sticky i överkant) scrollar i x tillsammans med raderna. */}
        <div ref={scrollRef} data-scroll="" data-testid="grid-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {/* Tomrutan är ALLTID monterad (dold när innehåll finns) så noden
              inte avmonteras i ögonblicket raderna kommer. I tomläget bär
              den en passiv station med `data-init`: ingen knapp, men vyn
              måste ha en startstation, annars låser sig fjärren. */}
          <div
            data-testid="grid-empty"
            {...(nothing ? station(() => {}, undefined, initAttr(true)) : {})}
            style={{ display: nothing ? 'block' : 'none', margin: gp(20), padding: gp(20), borderRadius: gp(12), background: TV.s05, fontSize: gp(13), color: TV.faint, lineHeight: 1.5 }}
          >
            {model.channelsLoading ? tt('loadingChannels') : schedulesLoading ? tt('loadingGuide') : tt('guideEmpty')}
          </div>
          {nothing ? null : (
            <div style={{ minWidth: CHANNEL_COL_PX + trackWidth }}>
              {/* Tidsaxel 30 px, sticky i överkant. Hörnet är sticky i
                  vänsterkant (kanalcellens EXAKTA layoutkontext) så
                  etiketterna aldrig glider in över kanalkolumnen. */}
              <div data-testid="grid-time-axis" style={{ position: 'sticky', top: 0, zIndex: 3, height: gp(30), minHeight: gp(30), display: 'flex', background: TV.bg, borderBottom: `1px solid ${TV.line}`, boxSizing: 'border-box' }}>
                <div style={{ ...guideCellStyle('grid'), position: 'sticky', left: 0, zIndex: 1, background: TV.bg }} />
                {labels.map((mark) => (
                  <div key={mark} data-testid="grid-time-label" data-ms={String(mark)} style={{ width: 30 * PX_PER_MIN_GRID, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: gp(8), boxSizing: 'border-box', display: 'flex', alignItems: 'center', fontSize: gp(11), color: 'rgba(243,244,248,0.4)', letterSpacing: '0.06em', ...ellipsis }}>
                    {formatClock(mark, locale)}
                  </div>
                ))}
              </div>
              <div style={{ position: 'relative' }}>
                {rows.map(({ channel }) => {
                  const key = channelKey(channel)
                  const entries = entriesByChannel.get(key) ?? []
                  const rowInit = initKey !== null && initKey.channel === key && !initKey.empty
                  return (
                    <div key={key} data-testid="grid-row" style={{ display: 'flex', height: ROW_H_PX, minHeight: ROW_H_PX, borderBottom: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box' }}>
                      {channelCell(channel, rowInit && initKey.start === null)}
                      <div data-testid="grid-track" style={{ width: trackWidth, flexShrink: 0, position: 'relative' }}>
                        {entries.map(({ box, programme }) => {
                          const live = isLive(programme)
                          const sel: GuideSelection = { channel, programme }
                          return (
                            <GridBlock
                              key={programme.start}
                              box={box}
                              programme={programme}
                              locale={locale}
                              live={live}
                              init={rowInit && initKey.start === programme.start}
                              selected={isSelected(channel, programme)}
                              reminded={isReminded(channel, programme)}
                              onFocus={isTv ? () => onSelect(sel) : undefined}
                              onEnter={hover.enter ? () => hover.enter?.(sel) : undefined}
                              onLeave={hover.leave}
                              onOk={() => {
                                onSelect(sel)
                                if (live) nav.play({ channel })
                              }}
                              onHold={(element) => nav.channelMenu(channel, element, live ? undefined : [remindAction(channel, programme)])}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {/* Tomma rader kollapsar (handoffen): kanaler utan tablå i
                    fönstret sorteras SIST och får EN cell över spårbredden
                    (inte sticky). Kanalen sänder live, så OK spelar. */}
                {withoutEpg.map((channel, index) => {
                  const key = channelKey(channel)
                  const sel: GuideSelection = { channel, programme: null }
                  return (
                    <div key={key} data-testid="grid-empty-row" style={{ display: 'flex', height: ROW_H_PX, minHeight: ROW_H_PX, background: 'rgba(252,252,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box' }}>
                      {channelCell(channel, false)}
                      <div
                        data-testid="grid-empty-cell"
                        data-selected={isSelected(channel, null) ? '' : undefined}
                        {...withPointerLeave(station(() => { onSelect(sel); nav.play({ channel }) }, (element) => nav.channelMenu(channel, element), initAttr(initKey !== null && initKey.empty && index === 0)), hover.leave)}
                        onFocus={isTv ? () => onSelect(sel) : undefined}
                        onPointerEnter={hover.enter ? () => hover.enter?.(sel) : undefined}
                        style={{ width: trackWidth, flexShrink: 0, display: 'flex', alignItems: 'center', padding: `0 ${gp(12)}px`, boxSizing: 'border-box', fontSize: gp(13), color: 'rgba(243,244,248,0.4)', cursor: 'pointer', ...ellipsis }}
                      >
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
                  {labels.map((mark) => <div key={mark} style={{ width: 30 * PX_PER_MIN_GRID, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box' }} />)}
                  {nowVisible ? (
                    <div data-testid="grid-now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: nowLeft, width: gp(2), background: TV.acc, boxShadow: `0 0 ${gp(14)}px ${TV.accMix(55)}`, zIndex: 1 }} />
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pagineringsraden: en VANLIG rad under listan, aldrig en flytande
            pill över sista raden. */}
        {nothing ? null : (
          <GuidePaginationRow testId="grid" shown={rows.length} total={total} hasMore={hasMore} onMore={() => setVisibleRows((count) => count + ROWS_STEP)} hint={tt('noEpgLast')} />
        )}
      </div>

      {/* Tablå-läget (Jerry 2026-09-17) = Grid utan detaljpanelen: samma
          täthet, rader och nu-position, hela bredden åt spåret. */}
      {detailPanel ? (
        <GuideDetailPanel
          selection={selection}
          nowMs={nowMs}
          locale={locale}
          channelNumber={selection ? model.channelNumber(selection.channel) : null}
          favourite={selection ? model.pinnedSet.has(channelKey(selection.channel)) : false}
          reminded={selection?.programme ? isReminded(selection.channel, selection.programme) : false}
          onWatch={() => { if (selection) nav.play({ channel: selection.channel }) }}
          onRemind={() => { if (selection?.programme) toggle(selection.channel, selection.programme) }}
          onToggleFavourite={() => { if (selection) model.togglePin(selection.channel) }}
        />
      ) : null}
    </div>
  )
}

/**
 * ETT block. Yttre lådan bär stationen och geometrin (`left`/`width` i px,
 * `paddingRight: 2` = handoffens gap 2 px, `top/bottom: 6` = spårets
 * `padding: 6px 0`); den inre ritar utseendet. Tre former ur geometrin:
 * `marker` (ren stapel, ingen text — `title` är enda vägen till namnet),
 * `title` (bara titeln) och `full` (titel + tid). Klippta kanter skrivs
 * som "…" i stället för en falsk start-/sluttid.
 */
function GridBlock({ box, programme, locale, live, init, selected, reminded, onFocus, onEnter, onLeave, onOk, onHold }: {
  box: EpgBlockBox
  programme: EpgProgramme
  locale: string
  live: boolean
  init: boolean
  selected: boolean
  reminded: boolean
  /** TV: fokus styr markeringen. Skrivbord: hovring (`onEnter`) + klick. */
  onFocus?: () => void
  onEnter?: () => void
  onLeave?: () => void
  onOk: () => void
  onHold: (element: HTMLElement) => void
}) {
  const times = `${box.clippedStart ? '…' : formatClock(programme.start, locale)}–${box.clippedEnd ? '…' : formatClock(programme.stop, locale)}`
  const marker = box.shape === 'marker'
  return (
    <div
      data-testid="grid-block"
      data-shape={box.shape}
      data-live={live ? '' : undefined}
      data-guide-block=""
      data-selected={selected ? '' : undefined}
      title={`${programme.title} ${times}`}
      {...withPointerLeave(station(onOk, onHold, init ? { 'data-init': '' } : undefined), onLeave)}
      onFocus={onFocus}
      onPointerEnter={onEnter}
      style={{ position: 'absolute', top: gp(6), bottom: gp(6), left: box.left, width: box.width, paddingRight: gp(2), boxSizing: 'border-box', cursor: 'pointer' }}
    >
      <div
        style={{
          height: '100%',
          boxSizing: 'border-box',
          borderRadius: marker ? 0 : gp(8),
          padding: marker ? 0 : `${gp(8)}px ${gp(10)}px`,
          background: marker ? TV.acc : live ? 'rgba(59,130,246,0.18)' : TV.s08,
          border: live ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {marker ? null : (
          <>
            <div style={{ fontSize: gp(13), fontWeight: live ? 600 : 400, color: live ? TV.text : TV.muted, paddingRight: reminded ? gp(14) : 0, ...ellipsis }}>{programme.title}</div>
            {box.shape === 'full' ? <div style={{ fontSize: gp(11), color: live ? 'rgba(243,244,248,0.6)' : TV.faint, ...ellipsis }}>{times}</div> : null}
            {reminded ? <span style={{ position: 'absolute', right: gp(4), top: gp(4), color: TV.acc }}><Icons.Bell size={gp(11)} filled /></span> : null}
          </>
        )}
      </div>
    </div>
  )
}
