'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type JSX, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme, NowNextLater } from '../epg/types'
import type { LiveTvModel } from '../live-tv-model'
import { qualityFromName } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import { isReminded, onRemindersChanged } from '../reminders'
import type { TvNav } from './tv-shell'
import { Icons, dp, station, type StationProps } from './tv-ui'
import { useTvText } from './tv-strings'
import { holdMenu, okAction } from './programme-actions'
import { filterByGroup } from './tv-guide-shared'
import { GuidePaginationRow, ROWS_STEP, useHoverSelect, withPointerLeave } from './guide-view-shared'
import { V2 } from './v2-tokens'
import { LogoPlate } from './v2-ui'
import type { GuideSelection, GuideViewProps } from './guide-types'

/** Guide v2:s mått (handoff "Screen 2 / Layout"): rader 76, gap 6, kanalcell 380, celler radius 12. */
export const GUIDE_ROW_H = 76
export const GUIDE_ROW_GAP = 6
export const GUIDE_CHANNEL_W = 380
export const GUIDE_CELL_RADIUS = 12
export const ACCENT = 'rgb(var(--accent-500))'
/** Accenten blandad med genomskinligt (appens accent, inte handoffens fasta korall). */
export const accentMix = (pct: number) => `color-mix(in srgb, rgb(var(--accent-500)) ${pct}%, transparent)`

export const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

/**
 * Kanalcellen 380 px (handoff "Channel cell"), delad av Nu/Sen, Tablå och
 * Kanallista: logoplatta 76×48 med numret i plattans hörn (ingen egen
 * nummerkolumn), namn 20/600, "Kategori · HD" 15 px och hjärta. Ingen
 * station — fokus står på programcellerna bredvid.
 */
export function GuideChannelCellV2({ channel, model, selected }: { channel: M3uChannel; model: LiveTvModel; selected: boolean }): JSX.Element {
  const key = channelKey(channel)
  const meta = [channel.group, qualityFromName(channel.name)].filter(Boolean).join(' · ')
  return (
    <div data-testid="guide-channel-v2" style={{ width: dp(GUIDE_CHANNEL_W), flexShrink: 0, borderRadius: dp(GUIDE_CELL_RADIUS), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(14)}px`, boxSizing: 'border-box', background: selected ? V2.surface4 : V2.surface2 }}>
      <LogoPlate channel={channel} width={76} height={48} number={model.channelNumber(channel)} radius={8} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{channel.name}</div>
        {meta ? <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)', ...ellipsis }}>{meta}</div> : null}
      </div>
      {model.pinnedSet.has(key) ? <span data-testid="guide-channel-fav" style={{ color: ACCENT, flexShrink: 0 }}><Icons.Heart size={dp(18)} filled /></span> : null}
      {model.locked.has(key) ? <span style={{ color: 'rgba(243,244,248,0.45)', flexShrink: 0 }}><Icons.Lock size={dp(18)} /></span> : null}
    </div>
  )
}

/** Påminnelser bor i lagringen: en räknare ritar om när de ändras (även från andra vyer). */
export function useRemindersVersion(): number {
  const [version, setVersion] = useState(0)
  useEffect(() => onRemindersChanged(() => setVersion((v) => v + 1)), [])
  return version
}

/**
 * N / Bakåt steg 1 (skalet räknar upp `nowTick`): står fokus i vyn flyttas
 * det till den markerade radens pågående program (`[data-now-station]`),
 * annars till första radens. Står fokus utanför vyn (kategorier, hero) rörs
 * det inte.
 */
export function useFocusNowOnTick(rootRef: RefObject<HTMLElement | null>, nowTick: number | undefined, selectedKey: string | null): void {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const root = rootRef.current
    // Fokus kan ha fallit till body: blocket det stod på försvann när
    // fönstret flyttades tillbaka (Tablå). Då hör fokus också hemma här.
    const active = document.activeElement
    if (!root || !(root.contains(active) || active === document.body || active === null)) return
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-guide-v2-row]'))
    const row = rows.find((r) => r.dataset.key === selectedKey) ?? rows[0]
    row?.querySelector<HTMLElement>('[data-now-station]')?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTick])
}

/**
 * Startmarkeringen: heron ska visa startraden innan något fokuserats. Den
 * automatiska markeringen följer startraden (tablån kan landa efter
 * kanalerna och sortera om dem) tills användaren själv markerar något —
 * en markering vyn inte satt själv skrivs aldrig över.
 */
export function useAutoSelection(selection: GuideSelection | null, initial: GuideSelection | null, select: (sel: GuideSelection) => void): void {
  const auto = useRef<string | null>(null)
  const id = (sel: GuideSelection | null) => (sel ? `${channelKey(sel.channel)}|${sel.programme?.start ?? ''}` : null)
  const initialId = id(initial)
  useEffect(() => {
    if (!initial) return
    const current = id(selection)
    if (current !== null && current !== auto.current) return
    if (current === initialId) return
    auto.current = initialId
    select(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId, id(selection)])
}

/**
 * ◂ från vyns första kolumn → skalets `onLeftEdge` (kategorikolumnen). Tog
 * skalet fokus stoppas tangenten, annars får appens motor den.
 */
export function withLeftEdge(props: StationProps, onLeftEdge: (() => boolean) | undefined): StationProps {
  const base = props.onKeyDown as ((event: ReactKeyboardEvent<HTMLElement>) => void) | undefined
  return {
    ...props,
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowLeft' && onLeftEdge?.()) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      base?.(event)
    },
  }
}


type Row = { channel: M3uChannel; info: NowNextLater | null }

/** Kolumnvikterna Nu 1.3 · Sen 1 · Senare 1. */
const WEIGHTS = [1.3, 1, 1] as const
const cellBase: CSSProperties = { minWidth: 0, borderRadius: dp(GUIDE_CELL_RADIUS), padding: `0 ${dp(18)}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box', cursor: 'pointer' }
const headCell = (weight: number, extra?: CSSProperties): CSSProperties => ({ flex: `${weight} 1 0%`, minWidth: 0, display: 'flex', alignItems: 'center', paddingLeft: dp(18), ...extra })

/**
 * Nu / Sen (handoff "Modes"): tre celler per rad — Nu (1.3: titel, 4 px
 * förlopp, "N min kvar"), Sen (titel + starttid), Senare (dämpad). Markerad
 * rad: Nu i accenttonen .18, övriga .10; fokuserad cell får ringen.
 *
 * Data som den gamla Now / Next-vyn: `filterByGroup` + `model.nowFor` (nu-
 * snapshotet), kanaler MED pågående program först, tablålösa sist. Högst
 * `ROWS_STEP` rader monteras; "Visa fler" lägger till nästa sida.
 */
export function GuideNowSenView({ model, nav, category, categoryLabel, selection, onSelect, onFocusProgramme, onLeftEdge, focusChannelKey, nowTick, isTv }: GuideViewProps): JSX.Element {
  const { tt, locale } = useTvText()
  const { nowMs } = model
  const focusProgramme = onFocusProgramme ?? onSelect
  void useRemindersVersion()

  const { channels: modelChannels, favouriteChannels, nowFor } = model
  const channels = useMemo(() => filterByGroup({ channels: modelChannels, favouriteChannels }, category), [modelChannels, favouriteChannels, category])
  const ordered = useMemo(() => {
    const withEpg: Row[] = []
    const withoutEpg: Row[] = []
    for (const channel of channels) {
      const info = nowFor(channel)
      if (info.now) withEpg.push({ channel, info })
      else withoutEpg.push({ channel, info: null })
    }
    return [...withEpg, ...withoutEpg]
  }, [channels, nowFor])

  // Startkanalen (hubbens favorit) kan ligga bortom första sidan: då visas
  // så många sidor att den kommer med.
  const focusIndex = focusChannelKey ? ordered.findIndex((row) => channelKey(row.channel) === focusChannelKey) : -1
  const [visibleRows, setVisibleRows] = useState(() => Math.max(ROWS_STEP, Math.ceil((focusIndex + 1) / ROWS_STEP) * ROWS_STEP))
  const firstCategory = useRef(true)
  useEffect(() => {
    if (firstCategory.current) { firstCategory.current = false; return }
    setVisibleRows(ROWS_STEP)
  }, [category])
  const rows = ordered.slice(0, visibleRows)
  const initIndex = focusIndex >= 0 && focusIndex < rows.length ? focusIndex : 0

  // Utan markering (skrivbordet, eller innan fokus landat) visar heron
  // startraden — aldrig ett tomt band.
  const initRow = rows[initIndex]
  useAutoSelection(selection, initRow ? { channel: initRow.channel, programme: initRow.info?.now ?? null } : null, focusProgramme)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectedKey = selection ? channelKey(selection.channel) : null
  useFocusNowOnTick(rootRef, nowTick, selectedKey)
  const hover = useHoverSelect(!isTv, focusProgramme)

  const nothing = rows.length === 0 || (model.epgLoading && !rows.some((row) => row.info))

  const cellProps = (sel: GuideSelection, init: boolean, leftEdge: boolean, extra: Record<string, string> = {}) => {
    const props = station(
      () => { focusProgramme(sel); okAction({ channel: sel.channel, programme: sel.programme, nav, nowMs })() },
      (element) => holdMenu({ channel: sel.channel, programme: sel.programme, nav, nowMs, element, tt, locale }),
      { 'data-v2f': 'inset', ...extra, ...(init ? { 'data-init': '' } : {}) },
    )
    return {
      ...withPointerLeave(leftEdge ? withLeftEdge(props, onLeftEdge) : props, hover.leave),
      onFocus: () => focusProgramme(sel),
      onPointerEnter: hover.enter ? () => hover.enter?.(sel) : undefined,
    }
  }

  const bell = (channel: M3uChannel, programme: EpgProgramme) => (isReminded(channel, programme)
    ? <span data-testid="nowsen-bell" style={{ color: V2.accText, display: 'inline-flex' }}><Icons.Bell size={dp(14)} filled /></span>
    : null)

  return (
    <div ref={rootRef} data-testid="guide-nowsen-view" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div data-testid="nowsen-header" style={{ height: dp(44), flexShrink: 0, display: 'flex', gap: dp(GUIDE_ROW_GAP), fontSize: dp(15), letterSpacing: '0.1em', textTransform: 'uppercase', color: V2.text3 }}>
        <div style={{ width: dp(GUIDE_CHANNEL_W), flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: dp(16), boxSizing: 'border-box', ...ellipsis }}>
          {`${categoryLabel ?? tt('categoryAll')} · ${tt('channelsCount', { count: channels.length })}`}
        </div>
        <div style={headCell(WEIGHTS[0], { color: V2.accText, fontWeight: 600 })}>{tt('colNow')}</div>
        <div style={headCell(WEIGHTS[1])}>{tt('colNext')}</div>
        <div style={headCell(WEIGHTS[2])}>{tt('colLater')}</div>
      </div>

      <div data-scroll="" data-testid="nowsen-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: dp(GUIDE_ROW_GAP), paddingTop: dp(6), paddingBottom: dp(24), boxSizing: 'border-box' }}>
        {nothing ? (
          <div data-testid="nowsen-empty-state" {...station(() => {}, undefined, { 'data-init': '' })} style={{ margin: dp(12), padding: dp(24), borderRadius: dp(12), background: V2.surface1, fontSize: dp(18), color: V2.text3 }}>
            {model.channelsLoading ? tt('loadingChannels') : model.epgLoading ? tt('loadingGuide') : tt('guideEmpty')}
          </div>
        ) : rows.map(({ channel, info }, index) => {
          const key = channelKey(channel)
          const selected = selectedKey === key
          const init = index === initIndex
          return (
            <div key={key} data-testid="nowsen-row" data-guide-v2-row="" data-key={key} data-selected={selected ? '' : undefined} style={{ display: 'flex', gap: dp(GUIDE_ROW_GAP), height: dp(GUIDE_ROW_H), flexShrink: 0 }}>
              <GuideChannelCellV2 channel={channel} model={model} selected={selected} />
              {info?.now ? (
                <>
                  <div data-testid="nowsen-now" data-now-station="" {...cellProps({ channel, programme: info.now }, init, true)} style={{ ...cellBase, flex: `${WEIGHTS[0]} 1 0%`, gap: dp(8), background: selected ? accentMix(18) : V2.surface3 }}>
                    <div style={{ fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{info.now.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
                      <div style={{ flex: 1, height: dp(4), borderRadius: dp(4), background: 'rgba(252,252,255,0.16)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(progressOf(info.now.start, info.now.stop, nowMs) * 100)}%`, background: ACCENT }} />
                      </div>
                      <span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.6)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{tt('minutesLeft', { min: Math.max(0, Math.ceil((info.now.stop - nowMs) / 60_000)) })}</span>
                    </div>
                  </div>
                  {[info.next, info.later].map((programme, i) => {
                    const testId = i === 0 ? 'nowsen-next' : 'nowsen-later'
                    const style: CSSProperties = { ...cellBase, flex: `${WEIGHTS[i + 1]} 1 0%`, background: selected ? V2.surface3 : V2.surface1 }
                    if (!programme) return <div key={testId} data-testid={testId} style={{ ...style, cursor: 'default' }} />
                    return (
                      <div key={testId} data-testid={testId} {...cellProps({ channel, programme }, false, false)} style={style}>
                        <div style={{ fontSize: dp(19), color: i === 0 ? V2.text : V2.text2, ...ellipsis }}>{programme.title}</div>
                        <div style={{ fontSize: dp(15), color: i === 0 ? 'rgba(243,244,248,0.55)' : 'rgba(243,244,248,0.5)', display: 'flex', alignItems: 'center', gap: dp(8), fontVariantNumeric: 'tabular-nums' }}>
                          {formatClock(programme.start, locale)}{bell(channel, programme)}
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <div data-testid="nowsen-empty" data-now-station="" {...cellProps({ channel, programme: null }, init, true)} style={{ ...cellBase, flex: `${WEIGHTS[0] + WEIGHTS[1] + WEIGHTS[2]} 1 0%`, background: V2.surface1, fontSize: dp(17), color: 'rgba(243,244,248,0.45)' }}>
                  <span style={ellipsis}>{tt('noEpgRow')}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {nothing || ordered.length <= ROWS_STEP ? null : (
        <GuidePaginationRow testId="nowsen" shown={rows.length} total={ordered.length} hasMore={ordered.length > visibleRows} onMore={() => setVisibleRows((count) => count + ROWS_STEP)} />
      )}
    </div>
  )
}
