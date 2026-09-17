'use client'

import { useEffect, useMemo, useState, type JSX } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import { formatClock } from '../live-tv-ui'
import { isReminded, toggleReminder } from '../reminders'
import { Icons, TV, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { GRID_WINDOW_MS, PCT_PER_MIN_GRID, epgRowBoxes, nowLinePx, pctShapeThresholds, type EpgBlockBox, type EpgRowEntry } from './epg-grid-geometry'
import { useGridRows } from './grid-rows'
import { GuideChannelCell, filterByGroup, guideCellStyle } from './tv-guide-shared'
import { GuideDetailPanel } from './guide-detail-panel'
import { GuidePaginationRow, ROWS_STEP, ellipsis, initAttr, useHoverSelect, withPointerLeave } from './guide-view-shared'
import type { GuideSelection, GuideViewProps } from './guide-types'

/**
 * Grid — den städade guidens standardläge (spec §4, handoffen §1). Vyn äger
 * bara sidstorleken; läge, kategori, dag, fönsterstart och markering kommer
 * från skalet som props (`GuideViewProps`), och typerna hämtas ur
 * `guide-types.ts` — aldrig ur `guide-shell.tsx`, som importerar hit.
 *
 * Layout: vänster kolumn (`flex: 1; minWidth: 0`) = tidsaxel 30 px → rutnät
 * (`data-scroll`) → pagineringsrad 52 px; till höger den permanenta
 * detaljpanelen (320 px). Måtten är handoffens designpixlar rakt av.
 *
 * Fönstret är 3 h i 6 halvtimmesspalter från `windowStart`. Spåret är
 * `flex: 1`, så blocken skrivs i PROCENT av spårbredden:
 * `epgRowBoxes(…, PCT_PER_MIN_GRID, pctShapeThresholds(PCT_PER_MIN_GRID))`
 * — trösklarna i samma enhet som bredden, annars blir ett 30-minutersblock
 * en "marker". Blockets padding är CSS-px (8px 10px), aldrig en andel.
 */

const ROW_H_PX = 60
const HALF_HOUR_MS = 30 * 60_000

export function GuideGridView({ model, nav, category, dayOffset, windowStart, selection, onSelect, isTv }: GuideViewProps): JSX.Element {
  const { tt, locale } = useTvText()
  const { nowMs } = model
  const windowEnd = windowStart + GRID_WINDOW_MS
  const [visibleRows, setVisibleRows] = useState(ROWS_STEP)
  // Påminnelser bor i lagringen, inte i modellen: en räknare tvingar fram
  // omritningen när klockikonen/panelknappen ska byta läge.
  const [reminderTick, setReminderTick] = useState(0)
  void reminderTick
  useEffect(() => { setVisibleRows(ROWS_STEP) }, [category, dayOffset, windowStart])

  const { rows, withoutEpg, hasMore, schedulesLoading } = useGridRows(model, category, visibleRows, windowStart, windowEnd)
  const total = filterByGroup(model, category).length
  const hover = useHoverSelect(!isTv, onSelect)

  const labels = useMemo(() => Array.from({ length: 6 }, (_, i) => windowStart + i * HALF_HOUR_MS), [windowStart])
  const nowLeft = nowLinePx(nowMs, windowStart, PCT_PER_MIN_GRID)
  const nowVisible = nowLeft >= 0 && nowLeft <= 100

  // Geometrin räknas EN gång per rad och fönster, inte per rendering (samma
  // skäl som i det gamla rutnätet: minuttick, fokusflytt och påminnelser
  // ritar om, men flyttar inga block).
  const thresholds = useMemo(() => pctShapeThresholds(PCT_PER_MIN_GRID), [])
  const entriesByChannel = useMemo(() => {
    const map = new Map<string, EpgRowEntry<EpgProgramme>[]>()
    for (const row of rows) map.set(channelKey(row.channel), epgRowBoxes(row.programmes, windowStart, windowEnd, PCT_PER_MIN_GRID, thresholds))
    return map
  }, [rows, windowStart, windowEnd, thresholds])

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
        style={{ ...guideCellStyle('grid'), display: 'flex', alignItems: 'stretch', cursor: 'pointer' }}
      >
        <GuideChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} variant="grid" />
      </div>
    )
  }

  /**
   * Tomläge: inga rader alls, ELLER tablåerna hämtas fortfarande och inga
   * rader har kommit — utan det andra villkoret hade varje kanal flimrat
   * förbi som "Ingen tablå" innan hämtningen sorterade om dem.
   */
  const nothing = rows.length === 0 && (withoutEpg.length === 0 || schedulesLoading)

  return (
    <div data-testid="guide-grid-view" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Tidsaxel 30 px: avståndsbit i kanalcellens EXAKTA layoutkontext
            (`guideCellStyle('grid')`, samma som raderna), sedan sex etiketter
            med spaltlinje. */}
        <div data-testid="grid-time-axis" style={{ height: 30, minHeight: 30, display: 'flex', borderBottom: `1px solid ${TV.line}`, boxSizing: 'border-box' }}>
          <div style={guideCellStyle('grid')} />
          {labels.map((mark) => (
            <div key={mark} data-testid="grid-time-label" style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 8, display: 'flex', alignItems: 'center', fontSize: 11, color: 'rgba(243,244,248,0.4)', letterSpacing: '0.06em', ...ellipsis }}>
              {formatClock(mark, locale)}
            </div>
          ))}
        </div>

        {/* Rutnätet. Listan bär `data-scroll` så fokusmotorn scrollar fokus i
            sikte; spåren bär MEDVETET inget `data-row` (en sluten ◂▸-grupp
            hade hoppat från radens sista block till nästa rads första). */}
        <div data-scroll="" data-testid="grid-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {/* Tomrutan är ALLTID monterad (dold när innehåll finns) så noden
              inte avmonteras i ögonblicket raderna kommer. I tomläget bär
              den en passiv station med `data-init`: ingen knapp, men vyn
              måste ha en startstation, annars låser sig fjärren. */}
          <div
            data-testid="grid-empty"
            {...(nothing ? station(() => {}, undefined, initAttr(true)) : {})}
            style={{ display: nothing ? 'block' : 'none', margin: 20, padding: 20, borderRadius: 12, background: TV.s05, fontSize: 13, color: TV.faint, lineHeight: 1.5 }}
          >
            {model.channelsLoading ? tt('loadingChannels') : schedulesLoading ? tt('loadingGuide') : tt('guideEmpty')}
          </div>
          {nothing ? null : (
            <div style={{ position: 'relative' }}>
              {rows.map(({ channel }) => {
                const key = channelKey(channel)
                const entries = entriesByChannel.get(key) ?? []
                const rowInit = initKey !== null && initKey.channel === key && !initKey.empty
                return (
                  <div key={key} data-testid="grid-row" style={{ display: 'flex', height: ROW_H_PX, minHeight: ROW_H_PX, borderBottom: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box' }}>
                    {channelCell(channel, rowInit && initKey.start === null)}
                    <div data-testid="grid-track" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
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
                  fönstret sorteras SIST och får EN cell över databredden.
                  Kanalen sänder live, så OK spelar. */}
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
                      style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 13, color: 'rgba(243,244,248,0.4)', cursor: 'pointer', ...ellipsis }}
                    >
                      {tt('noEpgRow')}
                    </div>
                  </div>
                )
              })}
              {/* Spaltlinjer och nu-linje över hela rutnätshöjden, bara i
                  spårbredden (efter kanalkolumnen). `left` i procent av
                  spåret, samma skala som blocken. */}
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: guideCellStyle('grid').width, right: 0, display: 'flex', pointerEvents: 'none' }}>
                {labels.map((mark) => <div key={mark} style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.06)' }} />)}
                {nowVisible ? (
                  <div data-testid="grid-now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: `${nowLeft}%`, width: 2, background: TV.acc, boxShadow: `0 0 14px ${TV.accMix(55)}`, zIndex: 2 }} />
                ) : null}
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
    </div>
  )
}

/**
 * ETT block. Yttre lådan bär stationen och geometrin (`left`/`width` i %,
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
      data-selected={selected ? '' : undefined}
      title={`${programme.title} ${times}`}
      {...withPointerLeave(station(onOk, onHold, init ? { 'data-init': '' } : undefined), onLeave)}
      onFocus={onFocus}
      onPointerEnter={onEnter}
      style={{ position: 'absolute', top: 6, bottom: 6, left: `${box.left}%`, width: `${box.width}%`, paddingRight: 2, boxSizing: 'border-box', cursor: 'pointer' }}
    >
      <div
        style={{
          height: '100%',
          boxSizing: 'border-box',
          borderRadius: marker ? 0 : 8,
          padding: marker ? 0 : '8px 10px',
          background: marker ? TV.acc : live ? 'rgba(59,130,246,0.18)' : TV.s05,
          border: live ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
          outline: selected ? `2px solid ${TV.accMix(60)}` : undefined,
          outlineOffset: -2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {marker ? null : (
          <>
            <div style={{ fontSize: 13, fontWeight: live ? 600 : 400, color: live ? TV.text : TV.muted, paddingRight: reminded ? 14 : 0, ...ellipsis }}>{programme.title}</div>
            {box.shape === 'full' ? <div style={{ fontSize: 11, color: live ? 'rgba(243,244,248,0.6)' : TV.faint, ...ellipsis }}>{times}</div> : null}
            {reminded ? <span style={{ position: 'absolute', right: 4, top: 4, color: TV.acc }}><Icons.Bell size={11} filled /></span> : null}
          </>
        )}
      </div>
    </div>
  )
}
