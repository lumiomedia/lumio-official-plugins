'use client'

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type JSX, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'
import { startOfLocalDay } from '../live-tv-model'
import { formatClock } from '../live-tv-ui'
import { isReminded } from '../reminders'
import type { TvNav } from './tv-shell'
import { Icons, dp, station, type StationProps } from './tv-ui'
import { useTvText } from './tv-strings'
import { holdMenu, okAction } from './programme-actions'
import { epgRowBoxes, pctShapeThresholds, type EpgRowEntry } from './epg-grid-geometry'
import { useGridRows } from './grid-rows'
import { filterByGroup } from './tv-guide-shared'
import { GuidePaginationRow, ROWS_STEP, useHoverSelect, withPointerLeave } from './guide-view-shared'
import { V2 } from './v2-tokens'
import { ACCENT, GUIDE_CELL_RADIUS, GUIDE_CHANNEL_W, GUIDE_ROW_GAP, GUIDE_ROW_H, ChannelCellV2, accentMix, ellipsis, useAutoSelection, useFocusNowOnTick, useLatest, useRemindersVersion, withLeftEdge } from './guide-nowsen-view'
import type { GuideSelection, GuideViewProps } from './guide-types'
import { displayTitle } from '../display-title'

const MIN = 60_000
/** Fönstret är två timmar (handoff "Tablå"), tick var 30:e minut. */
export const TL_SPAN_MS = 120 * MIN
const TICK_MS = 30 * MIN
/** Procent per minut i fönstret — blockens `left`/`width` är procent av spåret. */
const PCT_PER_MIN = 100 / (TL_SPAN_MS / MIN)
const THRESHOLDS = pctShapeThresholds(PCT_PER_MIN)
/** Luft mellan två block i samma rad. */
const BLOCK_GAP = 6
/** Ticketiketten döljs inom så här många minuter från nu (klockbrickan står där). */
const TICK_HIDE_MS = 12 * MIN

/**
 * Hämtfönstret: i dag 00:00 → i övermorgon 00:00, ETT intervall oavsett var
 * visningsfönstret står. ◂▸ stegar program för program utan nya anrop, och
 * raderna blinkar aldrig bort vid dygnsgränsen — förut bytte intervallet när
 * fönstret passerade morgondagens 06:00, tablån blev tom medan det nya
 * hämtades och fokus föll till body. Täcker hela `clampWindow`.
 */
export function timelineFetchRange(nowMs: number): { from: number; to: number } {
  return { from: startOfLocalDay(nowMs), to: startOfLocalDay(nowMs, 2) }
}

/** Fönstrets gränser: från dagens början till och med morgondagens kväll. */
function clampWindow(ms: number, nowMs: number): number {
  return Math.max(startOfLocalDay(nowMs), Math.min(startOfLocalDay(nowMs, 2) - TL_SPAN_MS, ms))
}


type Pending = { key: string; start: number }

/**
 * Tablå (handoff "Modes / Tablå"): 2-timmarsfönster, block placerade i
 * procent av spåret ur `epg-grid-geometry`, nu-linje 2 px i accenten med
 * glöd och klockbricka i rubriken, "◂ tidigare" när fönstret inte står vid
 * dagens början, klocka på block med påminnelse.
 *
 * Tangenter (egna, inte appens geometriska motor — blocken är olika breda
 * och motorn hade hoppat till närmaste kant i stället för samma tid):
 * ◂▸ stegar program för program över hela dygnet och fönstret följer 30
 * min i taget; ▲▼ landar på blocket som täcker föregående blocks mitt.
 * ◂ från dygnets första program → skalets `onLeftEdge` (kategorierna).
 *
 * Raderna kommer ur `useGridRows` (favoriter först, kategorifilter, högst
 * `ROWS_STEP` rader, tablålösa sist) — samma kapning som förut.
 */
export function GuideTimelineView({ model, nav, category, categoryLabel, windowStart, nowTick, selection, onSelect, onFocusProgramme, onLeftEdge, onWindowStart, focusChannelKey, isTv }: GuideViewProps): JSX.Element {
  const { tt, locale } = useTvText()
  const { nowMs } = model
  const focusProgramme = onFocusProgramme ?? onSelect
  const remindersVersion = useRemindersVersion()
  const windowEnd = windowStart + TL_SPAN_MS
  const { from, to } = timelineFetchRange(nowMs)

  const [visibleRows, setVisibleRows] = useState(ROWS_STEP)
  const firstCategory = useRef(true)
  useEffect(() => {
    if (firstCategory.current) { firstCategory.current = false; return }
    setVisibleRows(ROWS_STEP)
  }, [category])
  const { rows, withoutEpg, hasMore, schedulesLoading } = useGridRows(model, category, visibleRows, from, to)
  const total = useMemo(() => filterByGroup(model, category).length, [model, category])

  // Per rad: hela dygnets program utan överlapp (för ◂▸) och fönstrets
  // block (för ritningen). En gång per rad och fönster, inte per rendering.
  const lanes = useMemo(() => {
    const map = new Map<string, { all: EpgProgramme[]; entries: EpgRowEntry<EpgProgramme>[] }>()
    for (const row of rows) {
      map.set(channelKey(row.channel), {
        all: epgRowBoxes(row.programmes, from, to, 1).map((entry) => entry.programme),
        entries: epgRowBoxes(row.programmes, windowStart, windowEnd, PCT_PER_MIN, THRESHOLDS),
      })
    }
    return map
  }, [rows, from, to, windowStart, windowEnd])

  const nothing = rows.length === 0 && (withoutEpg.length === 0 || schedulesLoading)
  const allRows = useMemo(() => [...rows.map((r) => r.channel), ...withoutEpg], [rows, withoutEpg])
  const focusIndex = focusChannelKey ? allRows.findIndex((c) => channelKey(c) === focusChannelKey) : -1
  const initIndex = focusIndex >= 0 ? focusIndex : 0

  // Startblocket i startraden: det pågående, annars fönstrets första.
  const initChannel = allRows[initIndex] ?? null
  const initKey = initChannel ? channelKey(initChannel) : null
  const initEntries = initKey ? lanes.get(initKey)?.entries ?? [] : []
  const initProgramme = (initEntries.find((e) => e.programme.start <= nowMs && e.programme.stop > nowMs) ?? initEntries[0])?.programme ?? null
  useAutoSelection(selection, nothing || !initChannel ? null : { channel: initChannel, programme: initProgramme }, focusProgramme)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectedKey = selection ? channelKey(selection.channel) : null
  useFocusNowOnTick(rootRef, nowTick, selectedKey)
  const hover = useHoverSelect(!isTv, focusProgramme)

  // Fokus som väntar på att ett flyttat fönster ritats.
  const pending = useRef<Pending | null>(null)
  const focusBlock = (target: Pending): boolean => {
    const el = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-tl-block]') ?? [])
      .find((b) => b.dataset.key === target.key && Number(b.dataset.start) === target.start)
    if (!el) return false
    el.focus()
    return true
  }
  useEffect(() => {
    if (pending.current && focusBlock(pending.current)) pending.current = null
  })

  /** ◂▸: nästa/föregående program i raden; fönstret flyttas 30 min i taget tills det syns. */
  const step = (channel: M3uChannel, programme: EpgProgramme, dir: 1 | -1): boolean => {
    const key = channelKey(channel)
    const all = lanes.get(key)?.all ?? []
    const index = all.findIndex((p) => p.start === programme.start)
    const target = all[index + dir]
    if (!target) return dir === -1 ? Boolean(onLeftEdge?.()) : true
    let ws = windowStart
    if (dir === 1) while (target.start >= ws + TL_SPAN_MS) ws += TICK_MS
    // Bakåt som prototypen: programmets start i bild, men högst en timme
    // före dess slut (ett långt program drar inte fönstret timmar bakåt).
    else if (target.start < ws) ws = Math.floor(Math.max(target.start, target.stop - 60 * MIN) / TICK_MS) * TICK_MS
    ws = clampWindow(ws, nowMs)
    const next = { key, start: target.start }
    if (ws === windowStart) return focusBlock(next) || true
    pending.current = next
    onWindowStart?.(ws)
    return true
  }

  /** ▲▼: grannraden, blocket som täcker `anchor` (annars närmast), annars radens enda cell. */
  const vertical = (origin: HTMLElement, anchor: number, dir: 1 | -1): boolean => {
    const rowEls = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-guide-v2-row]') ?? [])
    const index = rowEls.indexOf(origin.closest<HTMLElement>('[data-guide-v2-row]')!)
    const row = rowEls[index + dir]
    if (!row) return false
    const blocks = Array.from(row.querySelectorAll<HTMLElement>('[data-tl-block]'))
    const distance = (b: HTMLElement) => {
      const s = Number(b.dataset.start)
      const e = Number(b.dataset.stop)
      return anchor < s ? s - anchor : anchor >= e ? anchor - e + 1 : 0
    }
    const best = blocks.sort((a, b) => distance(a) - distance(b))[0] ?? row.querySelector<HTMLElement>('[data-now-station]')
    if (!best) return false
    best.focus()
    return true
  }

  const api = useLatest<TlApi>({ focusProgramme, nav, nowMs, tt, locale, step, vertical, onLeftEdge, hover })

  const nowIn = nowMs >= windowStart && nowMs < windowEnd
  const nowFrac = (nowMs - windowStart) / TL_SPAN_MS
  const ticks = [0, 1, 2, 3].map((i) => windowStart + i * TICK_MS)
  const earlier = windowStart > startOfLocalDay(nowMs)

  return (
    <div ref={rootRef} data-testid="guide-timeline-view" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div data-testid="tl-header" style={{ height: dp(44), flexShrink: 0, display: 'flex', gap: dp(GUIDE_ROW_GAP), fontSize: dp(15), letterSpacing: '0.1em', textTransform: 'uppercase', color: V2.text3 }}>
        {/* "◂ tidigare" bor i kanalkolumnens rubrik, efter etiketten (som kortas) — förut låg den absolut och skrev över "N KANALER". */}
        <div data-testid="tl-channel-head" style={{ width: dp(GUIDE_CHANNEL_W), flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(10), padding: `0 ${dp(10)}px 0 ${dp(16)}px`, boxSizing: 'border-box', minWidth: 0 }}>
          <span style={{ flex: 1, minWidth: 0, ...ellipsis }}>{`${categoryLabel ?? tt('categoryAll')} · ${tt('channelsCount', { count: total })}`}</span>
          {earlier ? (
            <span data-testid="tl-earlier" style={{ flexShrink: 0, fontSize: dp(14), color: V2.accText, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{`◂ ${tt('guideEarlier')}`}</span>
          ) : null}
        </div>
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {ticks.map((t, i) => (
            <span key={t} data-testid="tl-tick" style={{ position: 'absolute', left: `${i * 25}%`, top: 0, bottom: 0, display: 'flex', alignItems: 'center', paddingLeft: dp(10), borderLeft: '1px solid rgba(255,255,255,0.14)', fontVariantNumeric: 'tabular-nums' }}>
              {nowIn && Math.abs(t - nowMs) < TICK_HIDE_MS ? '' : formatClock(t, locale)}
            </span>
          ))}
          {nowIn ? (
            <span data-testid="tl-now-badge" style={{ position: 'absolute', left: `${nowFrac * 100}%`, top: '50%', transform: 'translate(-50%,-50%)', background: ACCENT, color: '#fff', fontWeight: 600, padding: `${dp(3)}px ${dp(10)}px`, borderRadius: dp(6), letterSpacing: '0.04em', zIndex: 2, fontVariantNumeric: 'tabular-nums' }}>{formatClock(nowMs, locale)}</span>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {nowIn && !nothing ? (
          <div data-testid="tl-now-line" aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${dp(GUIDE_CHANNEL_W + GUIDE_ROW_GAP)}px + (100% - ${dp(GUIDE_CHANNEL_W + GUIDE_ROW_GAP)}px) * ${nowFrac.toFixed(4)})`, width: dp(2), background: ACCENT, boxShadow: `0 0 12px ${accentMix(60)}`, zIndex: 3, pointerEvents: 'none' }} />
        ) : null}
        <div data-scroll="" data-testid="tl-scroll" style={{ position: 'absolute', inset: 0, overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: dp(GUIDE_ROW_GAP), paddingTop: dp(6), paddingBottom: dp(24), boxSizing: 'border-box' }}>
          {nothing ? (
            <div data-testid="tl-empty-state" {...station(() => {}, undefined, { 'data-init': '' })} style={{ margin: dp(12), padding: dp(24), borderRadius: dp(12), background: V2.surface1, fontSize: dp(18), color: V2.text3 }}>
              {model.channelsLoading ? tt('loadingChannels') : schedulesLoading ? tt('loadingGuide') : tt('guideEmpty')}
            </div>
          ) : allRows.map((channel, rowIndex) => {
            const key = channelKey(channel)
            const selected = selectedKey === key
            const rowInit = rowIndex === initIndex
            return (
              <TimelineRow
                key={key}
                channel={channel}
                rowKey={key}
                entries={lanes.get(key)?.entries ?? null}
                selected={selected}
                focusedStart={selected ? selection?.programme?.start ?? null : null}
                init={rowInit}
                initStart={rowInit ? initProgramme?.start ?? null : null}
                number={model.channelNumber(channel)}
                pinned={model.pinnedSet.has(key)}
                locked={model.locked.has(key)}
                nowMs={nowMs}
                windowStart={windowStart}
                locale={locale}
                remindersVersion={remindersVersion}
                hoverEnabled={hover.enter !== undefined}
                api={api}
              />
            )
          })}
        </div>
      </div>

      {nothing || !hasMore ? null : (
        <GuidePaginationRow testId="tl" shown={allRows.length} total={total} hasMore={hasMore} onMore={() => setVisibleRows((count) => count + ROWS_STEP)} />
      )}
    </div>
  )
}

interface TlApi {
  focusProgramme(sel: GuideSelection): void
  nav: TvNav
  nowMs: number
  tt: ReturnType<typeof useTvText>['tt']
  locale: string
  step(channel: M3uChannel, programme: EpgProgramme, dir: 1 | -1): boolean
  vertical(origin: HTMLElement, anchor: number, dir: 1 | -1): boolean
  onLeftEdge?(): boolean
  hover: { enter?: (sel: GuideSelection) => void; leave?: () => void }
}

/** Pilar till `onArrow`; tar den tangenten stoppas den, annars får stationen den. */
function withArrows(props: StationProps, onArrow: (key: string, el: HTMLElement) => boolean): StationProps {
  const base = props.onKeyDown as ((event: ReactKeyboardEvent<HTMLElement>) => void) | undefined
  return {
    ...props,
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key.startsWith('Arrow') && onArrow(event.key, event.currentTarget)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      base?.(event)
    },
  }
}

/**
 * EN rad i Tablån, memoiserad: props är primitiva eller stabila (raden,
 * fönstrets block, `api`-refen), så en fokusflytt ritar bara om raden
 * markeringen lämnar och raden den landar på. På en Mi Box S ritade varje
 * pil-tryck förut om alla 80 rader och 238 block (~2 s huvudtråd).
 */
const TimelineRow = memo(function TimelineRow({ channel, rowKey: key, entries, selected, focusedStart, init, initStart, number, pinned, locked, nowMs, windowStart, locale, hoverEnabled, api }: {
  channel: M3uChannel
  rowKey: string
  entries: EpgRowEntry<EpgProgramme>[] | null
  selected: boolean
  focusedStart: number | null
  init: boolean
  initStart: number | null
  number: number | null
  pinned: boolean
  locked: boolean
  nowMs: number
  windowStart: number
  locale: string
  /** Bara för att rita om när påminnelser ändras (klockan i blocken). */
  remindersVersion: number
  hoverEnabled: boolean
  api: { readonly current: TlApi }
}): JSX.Element {
  const { tt } = useTvText()
  const windowEnd = windowStart + TL_SPAN_MS
  const nowIn = nowMs >= windowStart && nowMs < windowEnd
  const visibleMid = (p: EpgProgramme) => (Math.max(p.start, windowStart) + Math.min(p.stop, windowEnd)) / 2
  const leave = hoverEnabled ? () => api.current.hover.leave?.() : undefined
  const enter = (sel: GuideSelection) => (hoverEnabled ? () => api.current.hover.enter?.(sel) : undefined)
  return (
    <div data-testid="tl-row" data-guide-v2-row="" data-key={key} data-selected={selected ? '' : undefined} style={{ display: 'flex', gap: dp(GUIDE_ROW_GAP), height: dp(GUIDE_ROW_H), flexShrink: 0 }}>
      <ChannelCellV2 channel={channel} number={number} pinned={pinned} locked={locked} selected={selected} />
      {entries && entries.length > 0 ? (
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {entries.map(({ box, programme }) => {
            const sel: GuideSelection = { channel, programme }
            const live = programme.start <= nowMs && programme.stop > nowMs
            const past = programme.stop <= nowMs
            const focused = selected && focusedStart === programme.start
            const reminded = !live && !past && isReminded(channel, programme)
            const props = withArrows(
              station(
                () => { const a = api.current; a.focusProgramme(sel); okAction({ channel, programme, nav: a.nav, nowMs: a.nowMs })() },
                (element) => { const a = api.current; holdMenu({ channel, programme, nav: a.nav, nowMs: a.nowMs, element, tt: a.tt, locale: a.locale }) },
                { 'data-v2f': 'inset', ...(init && programme.start === initStart ? { 'data-init': '' } : {}) },
              ),
              (k, el) => (k === 'ArrowRight' ? api.current.step(channel, programme, 1)
                : k === 'ArrowLeft' ? api.current.step(channel, programme, -1)
                  : api.current.vertical(el, visibleMid(programme), k === 'ArrowDown' ? 1 : -1)),
            )
            const background = live ? (focused ? accentMix(34) : 'rgba(252,252,255,0.13)') : focused ? V2.surface5 : V2.surface2
            const style: CSSProperties = { position: 'absolute', top: 0, bottom: 0, left: `${box.left}%`, width: `calc(${box.width}% - ${BLOCK_GAP}px)`, minWidth: dp(4), boxSizing: 'border-box', borderRadius: dp(10), padding: box.shape === 'marker' ? 0 : `${dp(12)}px ${dp(16)}px`, background, overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer' }
            const span = `${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}`
            return (
              <div
                key={programme.start}
                data-testid="tl-block"
                data-tl-block=""
                data-key={key}
                data-start={String(programme.start)}
                data-stop={String(programme.stop)}
                data-left={String(Math.round(box.left * 100) / 100)}
                data-width={String(Math.round(box.width * 100) / 100)}
                data-past={past ? '' : undefined}
                {...(live ? { 'data-now-station': '' } : {})}
                title={`${displayTitle(programme.title)} ${span}`}
                {...withPointerLeave(props, leave)}
                onFocus={() => api.current.focusProgramme(sel)}
                onPointerEnter={enter(sel)}
                style={style}
              >
                {box.shape === 'marker' ? <span /> : (
                  <div style={{ opacity: past ? 0.6 : undefined }}>
                    <div style={{ fontSize: dp(19), fontWeight: live ? 600 : 400, ...ellipsis }}>{displayTitle(programme.title)}</div>
                    {box.shape === 'full' ? (
                      <div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.55)', display: 'flex', alignItems: 'center', gap: dp(8), fontVariantNumeric: 'tabular-nums' }}>
                        {span}
                        {reminded ? <span data-testid="tl-bell" style={{ color: V2.accText, display: 'inline-flex' }}><Icons.Bell size={dp(14)} filled /></span> : null}
                      </div>
                    ) : reminded ? <span data-testid="tl-bell" style={{ color: V2.accText, display: 'inline-flex' }}><Icons.Bell size={dp(14)} filled /></span> : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div
          data-testid="tl-empty"
          data-now-station=""
          {...withPointerLeave(withArrows(
            withLeftEdge(station(
              () => { const a = api.current; a.focusProgramme({ channel, programme: null }); a.nav.play({ channel }) },
              (element) => { const a = api.current; holdMenu({ channel, programme: null, nav: a.nav, nowMs: a.nowMs, element, tt: a.tt, locale: a.locale }) },
              { 'data-v2f': 'inset', ...(init ? { 'data-init': '' } : {}) },
            ), () => api.current.onLeftEdge?.() ?? false),
            (k, el) => (k === 'ArrowUp' || k === 'ArrowDown' ? api.current.vertical(el, nowIn ? nowMs : windowStart + TL_SPAN_MS / 2, k === 'ArrowDown' ? 1 : -1) : false),
          ), leave)}
          onFocus={() => api.current.focusProgramme({ channel, programme: null })}
          onPointerEnter={enter({ channel, programme: null })}
          style={{ flex: 1, minWidth: 0, borderRadius: dp(GUIDE_CELL_RADIUS), padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', background: V2.surface1, fontSize: dp(17), color: 'rgba(243,244,248,0.45)', cursor: 'pointer', boxSizing: 'border-box' }}
        >
          <span style={ellipsis}>{tt('noEpgRow')}</span>
        </div>
      )}
    </div>
  )
})
