'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type JSX, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme, NowNextLater } from '../epg/types'
import { formatClock, progressOf } from '../live-tv-ui'
import { isReminded } from '../reminders'
import type { TvNav } from './tv-shell'
import { Icons, dp, station, type StationProps } from './tv-ui'
import { useTvText } from './tv-strings'
import { holdMenu, okAction } from './programme-actions'
import { filterByGroup } from './tv-guide-shared'
import { GuidePaginationRow, ROWS_STEP, useHoverSelect, withPointerLeave } from './guide-view-shared'
import { V2 } from './v2-tokens'
import { ACCENT, GUIDE_CELL_RADIUS, GUIDE_CHANNEL_W, GUIDE_ROW_GAP, GUIDE_ROW_H, GuideChannelCellV2, accentMix, ellipsis, useAutoSelection, useFocusNowOnTick, useRemindersVersion, withLeftEdge } from './guide-nowsen-view'
import type { GuideSelection, GuideViewProps } from './guide-types'

/** Programkortens kolumn (handoff "Kanallista"). */
const CARDS_W = 560


type Row = { channel: M3uChannel; info: NowNextLater | null }
type Card = { id: 'now' | 'next' | 'later'; programme: EpgProgramme | null }

const onKeys = (props: StationProps, handle: (key: string) => boolean): StationProps => {
  const base = props.onKeyDown as ((event: ReactKeyboardEvent<HTMLElement>) => void) | undefined
  return {
    ...props,
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key.startsWith('Arrow') && handle(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      base?.(event)
    },
  }
}

/**
 * Kanallista (handoff "Modes / Kanallista"): per rad kanalcellen och
 * nu-cellen (titel + "N min kvar" + förlopp i ett 150 px block). Till höger
 * 560 px med tre programkort — Nu (accenttonad yta och kant, 24 px titel,
 * förlopp), Sen, Senare — för den markerade kanalen.
 *
 * Tangenter: ▸ från en rad → Nu-kortet; ▲▼ mellan korten (heron följer,
 * kanten stoppar); ◂ från ett kort → samma rad igen; ◂ från raden →
 * kategorierna. `OK = …`-raderna på korten bara på TV.
 *
 * Data och kapning som Nu/Sen: `filterByGroup` + nu-snapshotet, högst
 * `ROWS_STEP` rader med "Visa fler".
 */
export function GuideListView({ model, nav, category, categoryLabel, selection, onSelect, onFocusProgramme, onLeftEdge, focusChannelKey, nowTick, isTv }: GuideViewProps): JSX.Element {
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

  const focusIndex = focusChannelKey ? ordered.findIndex((row) => channelKey(row.channel) === focusChannelKey) : -1
  const [visibleRows, setVisibleRows] = useState(() => Math.max(ROWS_STEP, Math.ceil((focusIndex + 1) / ROWS_STEP) * ROWS_STEP))
  const firstCategory = useRef(true)
  useEffect(() => {
    if (firstCategory.current) { firstCategory.current = false; return }
    setVisibleRows(ROWS_STEP)
  }, [category])
  const rows = ordered.slice(0, visibleRows)
  const initIndex = focusIndex >= 0 && focusIndex < rows.length ? focusIndex : 0
  const initRow = rows[initIndex]
  useAutoSelection(selection, initRow ? { channel: initRow.channel, programme: initRow.info?.now ?? null } : null, focusProgramme)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const cardsRef = useRef<HTMLDivElement | null>(null)
  const selectedKey = selection ? channelKey(selection.channel) : null
  useFocusNowOnTick(rootRef, nowTick, selectedKey)
  const hover = useHoverSelect(!isTv, focusProgramme)
  const nothing = rows.length === 0 || (model.epgLoading && !rows.some((row) => row.info))

  // Korten gäller den markerade kanalen.
  const cardChannel = selection?.channel ?? null
  const cardInfo = cardChannel ? nowFor(cardChannel) : null
  const cards: Card[] = cardChannel
    ? cardInfo?.now
      ? ([['now', cardInfo.now], ['next', cardInfo.next], ['later', cardInfo.later]] as const).filter(([, p]) => p !== null).map(([id, programme]) => ({ id, programme }))
      : [{ id: 'now', programme: null }]
    : []

  const focusCard = (index: number): boolean => {
    const el = cardsRef.current?.querySelectorAll<HTMLElement>('[data-list-card]')[index]
    if (!el) return false
    el.focus()
    return true
  }
  const focusRow = (key: string | null): boolean => {
    const rowEl = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-guide-v2-row]') ?? []).find((r) => r.dataset.key === key)
    const target = rowEl?.querySelector<HTMLElement>('[data-now-station]')
    if (!target) return false
    target.focus()
    return true
  }

  const nowCellStyle: CSSProperties = { flex: 1, minWidth: 0, borderRadius: dp(GUIDE_CELL_RADIUS), padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', gap: dp(20), boxSizing: 'border-box', cursor: 'pointer' }

  return (
    <div ref={rootRef} data-testid="guide-list-view" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div data-testid="list-header" style={{ height: dp(44), flexShrink: 0, display: 'flex', gap: dp(GUIDE_ROW_GAP), fontSize: dp(15), letterSpacing: '0.1em', textTransform: 'uppercase', color: V2.text3 }}>
        <div style={{ width: dp(GUIDE_CHANNEL_W), flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: dp(16), boxSizing: 'border-box', ...ellipsis }}>
          {`${categoryLabel ?? tt('categoryAll')} · ${tt('channelsCount', { count: channels.length })}`}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', paddingLeft: dp(18) }}>{tt('colOnAir')}</div>
        <div style={{ flex: `0 1 ${dp(CARDS_W)}px`, minWidth: dp(360), display: 'flex', alignItems: 'center', paddingLeft: dp(6), boxSizing: 'border-box', ...ellipsis }}>{`${tt('colNow')} · ${tt('colNext')} · ${tt('colLater')}`}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: dp(GUIDE_ROW_GAP) }}>
        <div data-scroll="" data-testid="list-scroll" style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: dp(GUIDE_ROW_GAP), paddingTop: dp(6), paddingBottom: dp(24), boxSizing: 'border-box' }}>
          {nothing ? (
            <div data-testid="list-empty-state" {...station(() => {}, undefined, { 'data-init': '' })} style={{ margin: dp(12), padding: dp(24), borderRadius: dp(12), background: V2.surface1, fontSize: dp(18), color: V2.text3 }}>
              {model.channelsLoading ? tt('loadingChannels') : model.epgLoading ? tt('loadingGuide') : tt('guideEmpty')}
            </div>
          ) : rows.map(({ channel, info }, index) => {
            const key = channelKey(channel)
            const selected = selectedKey === key
            const sel: GuideSelection = { channel, programme: info?.now ?? null }
            const props = onKeys(
              withLeftEdge(station(
                () => { focusProgramme(sel); okAction({ channel, programme: sel.programme, nav, nowMs })() },
                (element) => holdMenu({ channel, programme: sel.programme, nav, nowMs, element, tt, locale }),
                { 'data-v2f': 'inset', ...(index === initIndex ? { 'data-init': '' } : {}) },
              ), onLeftEdge),
              (k) => (k === 'ArrowRight' ? focusCard(0) : false),
            )
            return (
              <div key={key} data-testid="list-row" data-guide-v2-row="" data-key={key} data-selected={selected ? '' : undefined} style={{ display: 'flex', gap: dp(GUIDE_ROW_GAP), height: dp(GUIDE_ROW_H), flexShrink: 0 }}>
                <GuideChannelCellV2 channel={channel} model={model} selected={selected} />
                <div
                  data-testid="list-now"
                  data-now-station=""
                  {...withPointerLeave(props, hover.leave)}
                  onFocus={() => focusProgramme(sel)}
                  onPointerEnter={hover.enter ? () => hover.enter?.(sel) : undefined}
                  style={{ ...nowCellStyle, background: selected ? V2.surface4 : V2.surface2 }}
                >
                  {info?.now ? (
                    <>
                      <div style={{ minWidth: 0, flex: 1, fontSize: dp(20), fontWeight: 600, ...ellipsis }}>{info.now.title}</div>
                      <div style={{ width: dp(150), flexShrink: 0, display: 'flex', flexDirection: 'column', gap: dp(6), alignItems: 'flex-end' }}>
                        <span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.6)', fontVariantNumeric: 'tabular-nums' }}>{tt('minutesLeft', { min: Math.max(0, Math.ceil((info.now.stop - nowMs) / 60_000)) })}</span>
                        <div style={{ width: '100%', height: dp(4), borderRadius: dp(4), background: 'rgba(252,252,255,0.16)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(progressOf(info.now.start, info.now.stop, nowMs) * 100)}%`, background: ACCENT }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <span style={{ minWidth: 0, fontSize: dp(17), color: 'rgba(243,244,248,0.45)', ...ellipsis }}>{tt('noEpgRow')}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div ref={cardsRef} data-testid="list-cards" style={{ flex: `0 1 ${dp(CARDS_W)}px`, minWidth: dp(360), display: 'flex', flexDirection: 'column', gap: dp(10), paddingTop: dp(6), paddingLeft: dp(6), boxSizing: 'border-box' }}>
          {cardChannel ? cards.map((card, index) => {
            const { programme } = card
            const isNow = card.id === 'now'
            const future = programme !== null && programme.start > nowMs
            const reminded = future && isReminded(cardChannel, programme)
            const focused = selectedKey === channelKey(cardChannel) && !isNow && selection?.programme?.start === programme?.start
            const hint = isNow
              ? (isTv ? tt('cardHintWatch') : '')
              : reminded ? (isTv ? tt('cardHintReminderSet') : tt('reminderSet')) : (isTv ? tt('cardHintRemind') : '')
            const sel: GuideSelection = { channel: cardChannel, programme }
            const props = onKeys(
              station(
                () => { focusProgramme(sel); okAction({ channel: cardChannel, programme, nav, nowMs })() },
                (element) => holdMenu({ channel: cardChannel, programme, nav, nowMs, element, tt, locale }),
                { 'data-v2f': 'inset' },
              ),
              (k) => {
                if (k === 'ArrowLeft') return focusRow(channelKey(cardChannel))
                if (k === 'ArrowDown') { focusCard(Math.min(cards.length - 1, index + 1)); return true }
                if (k === 'ArrowUp') { focusCard(Math.max(0, index - 1)); return true }
                return true
              },
            )
            const label = card.id === 'now' ? tt('colNow') : card.id === 'next' ? tt('colNext') : tt('colLater')
            return (
              <div
                key={card.id}
                data-testid={`list-card-${card.id}`}
                data-list-card=""
                {...withPointerLeave(props, hover.leave)}
                onFocus={() => focusProgramme(sel)}
                style={{ flexShrink: 0, padding: `${dp(14)}px ${dp(18)}px`, borderRadius: dp(14), background: isNow ? accentMix(16) : focused ? V2.surface4 : V2.surface2, border: `1px solid ${isNow ? accentMix(45) : 'rgba(255,255,255,0.10)'}`, display: 'flex', flexDirection: 'column', gap: dp(4), cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(14), letterSpacing: '0.1em', textTransform: 'uppercase', color: isNow ? V2.accText : V2.text3 }}>
                  {label}
                  {reminded ? <span data-testid="list-card-bell" style={{ color: V2.accText, display: 'inline-flex' }}><Icons.Bell size={dp(15)} filled /></span> : null}
                  {programme ? <span style={{ marginLeft: 'auto', letterSpacing: 0, textTransform: 'none', fontSize: dp(15), color: 'rgba(243,244,248,0.55)', fontVariantNumeric: 'tabular-nums' }}>{`${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}`}</span> : null}
                </div>
                <div style={{ fontSize: dp(isNow ? 24 : 20), fontWeight: 600, ...ellipsis }}>{programme?.title ?? cardChannel.name}</div>
                {isNow && programme ? (
                  <div style={{ height: dp(4), borderRadius: dp(4), background: 'rgba(252,252,255,0.16)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(progressOf(programme.start, programme.stop, nowMs) * 100)}%`, background: ACCENT }} />
                  </div>
                ) : null}
                {!programme ? <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{tt('noEpgRow')}</div> : null}
                {hint ? <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{hint}</div> : null}
              </div>
            )
          }) : null}
          {isTv && cards.length > 0 ? <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.45)', padding: `${dp(4)}px ${dp(4)}px 0` }}>{tt('listCardsHint')}</div> : null}
        </div>
      </div>

      {nothing || ordered.length <= ROWS_STEP ? null : (
        <GuidePaginationRow testId="list" shown={rows.length} total={ordered.length} hasMore={ordered.length > visibleRows} onMore={() => setVisibleRows((count) => count + ROWS_STEP)} />
      )}
    </div>
  )
}
