'use client'

import { useEffect, useMemo, useState, type CSSProperties, type JSX, type ReactNode } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme, NowNextLater } from '../epg/types'
import { formatClock, progressOf } from '../live-tv-ui'
import { qualityFromName } from '../live-tv-model'
import { isReminded, toggleReminder } from '../reminders'
import { ChannelArt, Icons, Progress, TV, Tag, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { GuideChannelCell, filterByGroup, guideCellStyle } from './tv-guide-shared'
import { GuidePaginationRow, ROWS_STEP, ellipsis, gp, initAttr, useHoverSelect, withPointerLeave } from './guide-view-shared'
import type { GuideSelection, GuideViewProps } from './guide-types'

/**
 * Now / Next — den städade guidens listläge (spec §4, handoffen §2). Vyn
 * äger bara sidstorleken och påminnelsetickern; läge, kategori, markering
 * och Detaljer-flaggan kommer från skalet som props. Typerna hämtas ur
 * `guide-types.ts` — aldrig ur `guide-shell.tsx`, som importerar hit.
 *
 * Layout: (infobanner om `details`) → kolumnhuvud 30 px → rader 56 px i en
 * `data-scroll`-lista → pagineringsrad 52 px. Måtten är handoffens
 * designpixlar rakt av.
 *
 * Data: `filterByGroup(model, category)` + `model.nowFor(channel)` per rad
 * (nu-snapshotet, uppdaterat varje minut) — ingen `useSchedules`, det här
 * läget är alltid "nu". Kanaler MED pågående program först, kanaler utan
 * sist som kollapsade rader; pagineringen går över den sammanslagna listan.
 */

const ROW_H_PX = gp(56)
/** Kanalcellens bredd i det här läget (handoffen: `KANAL` 340). */
const CELL = guideCellStyle('nownext')
/** Kolumnvikter 2 / 1,2 / 1 — NU får mest plats eftersom det är det man läser. */
const COL_WEIGHTS = [2, 1.2, 1] as const
const COL_LINE = '1px solid rgba(255,255,255,0.06)'
const colStyle = (weight: number): CSSProperties => ({ flex: `${weight} 1 0%`, minWidth: 0, borderRight: COL_LINE, boxSizing: 'border-box', padding: `0 ${gp(12)}px`, display: 'flex', alignItems: 'center', gap: gp(10) })

type Row = { channel: M3uChannel; info: NowNextLater }

export function GuideNowNextView({ model, nav, category, selection, onSelect, isTv, details }: GuideViewProps & { details: boolean }): JSX.Element {
  const { tt, locale } = useTvText()
  const { nowMs } = model
  const [visibleRows, setVisibleRows] = useState(ROWS_STEP)
  // Påminnelser bor i lagringen, inte i modellen: en räknare tvingar fram
  // omritningen när bannerknappen ska byta läge.
  const [reminderTick, setReminderTick] = useState(0)
  void reminderTick
  useEffect(() => { setVisibleRows(ROWS_STEP) }, [category])

  // Sorteringen (med tablå först) räknas en gång per kanallista/kategori/
  // snapshot, inte per rendering: `model` byter identitet varje minut, men
  // `channels`/`favouriteChannels`/`nowFor` är memoiserade i modellen.
  const { channels: modelChannels, favouriteChannels, nowFor } = model
  const channels = useMemo(() => filterByGroup({ channels: modelChannels, favouriteChannels }, category), [modelChannels, favouriteChannels, category])
  const { withEpg, withoutEpg } = useMemo(() => {
    const withEpg: Row[] = []
    const withoutEpg: M3uChannel[] = []
    for (const channel of channels) {
      const info = nowFor(channel)
      if (info.now) withEpg.push({ channel, info })
      else withoutEpg.push(channel)
    }
    return { withEpg, withoutEpg }
  }, [channels, nowFor])
  const rows = withEpg.slice(0, visibleRows)
  const emptyRows = withoutEpg.slice(0, Math.max(0, visibleRows - withEpg.length))
  const hasMore = withEpg.length + withoutEpg.length > visibleRows
  const hover = useHoverSelect(!isTv, onSelect)

  const toggle = (channel: M3uChannel, programme: EpgProgramme) => {
    toggleReminder(channel, programme, nowMs)
    setReminderTick((value) => value + 1)
  }

  /**
   * Tomläge: inga kanaler alls, ELLER snapshotet hämtas fortfarande och inga
   * rader har kommit — utan det andra villkoret hade varje kanal flimrat
   * förbi som "Ingen tablå" innan snapshotet sorterade om dem.
   */
  const nothing = rows.length === 0 && (emptyRows.length === 0 || model.epgLoading)

  const selectedKey = selection ? channelKey(selection.channel) : null
  const isSelected = (channel: M3uChannel) => selectedKey === channelKey(channel)

  // Bannern visar markeringen, annars första raden. Ingen rad och ingen
  // markering → ingen banner (det finns inget att visa).
  const firstRow: GuideSelection | null = rows[0]
    ? { channel: rows[0].channel, programme: rows[0].info.now }
    : emptyRows[0] ? { channel: emptyRows[0], programme: null } : null
  const subject = selection ?? firstRow
  const showBanner = details && subject !== null

  /**
   * Precis EN `data-init` i vyn, i FAST ordning: tomläget (även medan
   * snapshotet laddar — då finns raderna, men de ritas inte) → första raden
   * → bannerns Titta nu. Utan startstation låser sig fjärren; att låta
   * placeringen bero på flera villkor var för sig gav noll stationer under
   * kallstart (rader fanns, tomrutan visades, ingen fick attributet).
   */
  const initTarget: 'empty' | 'row' | 'banner' = nothing ? 'empty' : rows.length > 0 || emptyRows.length > 0 ? 'row' : 'banner'

  const rowProps = (channel: M3uChannel, programme: EpgProgramme | null, init: boolean) => {
    const sel: GuideSelection = { channel, programme }
    return {
      'data-guide-row': '',
      'data-selected': isSelected(channel) ? '' : undefined,
      ...withPointerLeave(station(() => { onSelect(sel); nav.play({ channel }) }, (element) => nav.channelMenu(channel, element), initAttr(init)), hover.leave),
      onFocus: isTv ? () => onSelect(sel) : undefined,
      onPointerEnter: hover.enter ? () => hover.enter?.(sel) : undefined,
    }
  }
  const rowStyle = (channel: M3uChannel, empty: boolean): CSSProperties => ({
    display: 'flex',
    height: ROW_H_PX,
    minHeight: ROW_H_PX,
    boxSizing: 'border-box',
    borderBottom: COL_LINE,
    background: isSelected(channel) ? TV.s05 : empty ? 'rgba(252,252,255,0.04)' : undefined,
    cursor: 'pointer',
  })
  const cell = (channel: M3uChannel) => (
    <GuideChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(channelKey(channel))} locked={model.locked.has(channelKey(channel))} variant="nownext" />
  )

  return (
    <div data-testid="guide-nownext-view" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {showBanner && subject ? (
        <NowNextBanner
          selection={subject}
          info={model.nowFor(subject.channel)}
          nowMs={nowMs}
          locale={locale}
          channelNumber={model.channelNumber(subject.channel)}
          init={initTarget === 'banner'}
          onWatch={() => nav.play({ channel: subject.channel })}
          onRemind={(programme) => toggle(subject.channel, programme)}
        />
      ) : null}

      {/* Kolumnhuvud 30 px: kanalcellen i EXAKT samma layoutkontext som
          raderna (`guideCellStyle('nownext')`), sedan de tre viktade
          kolumnerna med kolumnlinjer. */}
      <div data-testid="nownext-header" style={{ height: gp(30), minHeight: gp(30), display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${TV.line}`, boxSizing: 'border-box', fontSize: gp(11), color: 'rgba(243,244,248,0.4)', letterSpacing: '0.12em' }}>
        <div data-testid="nownext-header-channel" style={{ ...CELL, display: 'flex', alignItems: 'center', padding: `0 ${gp(10)}px`, borderRight: COL_LINE }}>{tt('colChannel')}</div>
        {(['colNow', 'colNext', 'colLater'] as const).map((key, index) => (
          <div key={key} data-testid="nownext-header-col" style={colStyle(COL_WEIGHTS[index])}>{tt(key)}</div>
        ))}
      </div>

      {/* Listan bär `data-scroll` så fokusmotorn scrollar fokus i sikte. */}
      <div data-scroll="" data-testid="nownext-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* Tomrutan är ALLTID monterad (dold när innehåll finns) så noden inte
            avmonteras i ögonblicket raderna kommer. I tomläget bär den en
            passiv station med `data-init` (se `initTarget`). */}
        <div
          data-testid="nownext-empty"
          {...(initTarget === 'empty' ? station(() => {}, undefined, initAttr(true)) : {})}
          style={{ display: nothing ? 'block' : 'none', margin: gp(20), padding: gp(20), borderRadius: gp(12), background: TV.s05, fontSize: gp(13), color: TV.faint, lineHeight: 1.5 }}
        >
          {model.channelsLoading ? tt('loadingChannels') : model.epgLoading ? tt('loadingGuide') : tt('guideEmpty')}
        </div>
        {nothing ? null : (
          <>
            {rows.map(({ channel, info }, index) => {
              const now = info.now as EpgProgramme
              const minutesLeft = Math.max(0, Math.ceil((now.stop - nowMs) / 60_000))
              return (
                <div key={channelKey(channel)} data-testid="nownext-row" {...rowProps(channel, now, initTarget === 'row' && index === 0)} style={rowStyle(channel, false)}>
                  {cell(channel)}
                  {/* NU: titel + 90 px block med förlopp och `N m`. */}
                  <div data-testid="nownext-now" style={colStyle(COL_WEIGHTS[0])}>
                    <div title={now.title} style={{ flex: 1, minWidth: 0, fontSize: gp(14), ...ellipsis }}>{now.title}</div>
                    <div style={{ width: gp(90), flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: gp(4) }}>
                      <Progress value={progressOf(now.start, now.stop, nowMs)} height={gp(4)} style={{ width: '100%' }} />
                      <span style={{ fontSize: gp(11), color: 'rgba(243,244,248,0.5)', fontVariantNumeric: 'tabular-nums' }}>{tt('minShort', { min: minutesLeft })}</span>
                    </div>
                  </div>
                  <UpcomingCell testId="nownext-next" programme={info.next} locale={locale} titleColor="rgba(243,244,248,0.75)" timeColor="rgba(243,244,248,0.45)" weight={COL_WEIGHTS[1]} />
                  <UpcomingCell testId="nownext-later" programme={info.later} locale={locale} titleColor="rgba(243,244,248,0.55)" timeColor="rgba(243,244,248,0.35)" weight={COL_WEIGHTS[2]} />
                </div>
              )
            })}
            {/* Tomma rader kollapsar (handoffen): kanaler utan tablå sorteras
                SIST och får EN cell över databredden med en Titta nu-pill.
                Hela raden är stationen — pillen är dess etikett, OK spelar. */}
            {emptyRows.map((channel, index) => (
              <div key={channelKey(channel)} data-testid="nownext-empty-row" {...rowProps(channel, null, initTarget === 'row' && rows.length === 0 && index === 0)} style={rowStyle(channel, true)}>
                {cell(channel)}
                <div data-testid="nownext-empty-cell" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: gp(14), padding: `0 ${gp(12)}px` }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: gp(13), color: 'rgba(243,244,248,0.4)', ...ellipsis }}>{tt('noEpgRow')}</span>
                  <span data-testid="nownext-watch-pill" style={{ height: gp(26), padding: `0 ${gp(12)}px`, borderRadius: 999, background: TV.s08, display: 'inline-flex', alignItems: 'center', gap: gp(6), fontSize: gp(12), flexShrink: 0 }}>
                    <Icons.Play size={gp(10)} /> {tt('watchNowShort')}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {nothing ? null : (
        <GuidePaginationRow testId="nownext" shown={rows.length} total={channels.length} hasMore={hasMore} onMore={() => setVisibleRows((count) => count + ROWS_STEP)} />
      )}
    </div>
  )
}

/** SEN/SENARE-cellen: titel + starttid högerställd; tom när programmet saknas. */
function UpcomingCell({ testId, programme, locale, titleColor, timeColor, weight }: {
  testId: string
  programme: EpgProgramme | null
  locale: string
  titleColor: string
  timeColor: string
  weight: number
}): JSX.Element {
  return (
    <div data-testid={testId} style={colStyle(weight)}>
      {programme ? (
        <>
          <div title={programme.title} style={{ flex: 1, minWidth: 0, fontSize: gp(13), color: titleColor, ...ellipsis }}>{programme.title}</div>
          <span style={{ fontSize: gp(12), color: timeColor, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{formatClock(programme.start, locale)}</span>
        </>
      ) : null}
    </div>
  )
}

/**
 * Infobannern (handoffen §2) — den enda platsen där något ligger "ovanpå"
 * listan, och bara bakom Detaljer. Sparad bildruta 200×112 via `ChannelArt`
 * (`playerFrameUrl` → logotyp → initialer): INGEN `TvPreview`, ingen ström,
 * ingen `OK = …`-text — det är en stillbild. Påminn mig gäller SEN-programmet
 * och göms när det saknas.
 */
function NowNextBanner({ selection, info, nowMs, locale, channelNumber, init, onWatch, onRemind }: {
  selection: GuideSelection
  info: NowNextLater
  nowMs: number
  locale: string
  channelNumber: number | null
  init: boolean
  onWatch: () => void
  onRemind: (programme: EpgProgramme) => void
}): JSX.Element {
  const { tt } = useTvText()
  const { channel } = selection
  const programme = selection.programme ?? info.now
  const next = info.next
  const live = programme !== null && programme.start <= nowMs && programme.stop > nowMs
  const minutesLeft = programme ? Math.max(0, Math.ceil((programme.stop - nowMs) / 60_000)) : 0
  const meta = [channel.group, qualityFromName(channel.name)].filter(Boolean).join(' · ')
  const reminded = next ? isReminded(channel, next) : false
  const button = (testId: string, height: number, accent: boolean, onOk: () => void, children: ReactNode, extra?: Record<string, string>) => (
    <div
      data-testid={testId}
      {...station(onOk, undefined, extra)}
      style={{ height, minHeight: height, padding: `0 ${gp(16)}px`, borderRadius: gp(10), background: accent ? TV.acc : TV.s08, color: accent ? TV.onAcc : TV.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: gp(8), fontSize: accent ? gp(14) : gp(13), fontWeight: accent ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      {children}
    </div>
  )
  return (
    <div data-testid="nownext-banner" style={{ display: 'flex', gap: gp(20), padding: `${gp(18)}px ${gp(20)}px`, borderBottom: `1px solid ${TV.line}`, background: 'rgba(252,252,255,0.03)', alignItems: 'center' }}>
      <ChannelArt channel={channel} height={gp(112)} radius={gp(10)} style={{ width: gp(200), flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)', boxSizing: 'border-box' }}>
        {live ? (
          <span style={{ position: 'absolute', left: gp(10), bottom: gp(10) }}>
            <Tag variant="live" style={{ height: gp(22), padding: `0 ${gp(9)}px`, fontSize: gp(11) }}>{tt('live')}</Tag>
          </span>
        ) : null}
      </ChannelArt>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: gp(6) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: gp(8), minWidth: 0 }}>
          {channelNumber !== null ? <span style={{ fontSize: gp(13), color: 'rgba(243,244,248,0.45)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{channelNumber}</span> : null}
          <span data-testid="nownext-banner-channel" style={{ fontSize: gp(13), color: TV.muted, minWidth: 0, ...ellipsis }}>{channel.name}</span>
          {meta ? <Tag variant="neutral" style={{ height: gp(22), padding: `0 ${gp(9)}px`, fontSize: gp(11), borderRadius: gp(7), background: TV.s08, flexShrink: 0 }}>{meta}</Tag> : null}
        </div>
        <div data-testid="nownext-banner-title" style={{ fontSize: gp(22), fontWeight: 600, lineHeight: 1.2, ...ellipsis }}>{programme ? programme.title : tt('noProgramme')}</div>
        {programme ? (
          <div data-testid="nownext-banner-time" style={{ fontSize: gp(13), color: 'rgba(243,244,248,0.6)', ...ellipsis }}>
            {`${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}${live ? ` · ${tt('minutesLeft', { min: minutesLeft })}` : ''}`}
          </div>
        ) : null}
        {live && programme ? <Progress value={progressOf(programme.start, programme.stop, nowMs)} height={gp(4)} style={{ maxWidth: gp(520) }} /> : null}
        {next ? (
          <div data-testid="nownext-banner-next" style={{ fontSize: gp(13), ...ellipsis }}>
            <span style={{ color: 'rgba(243,244,248,0.45)', marginRight: gp(8) }}>{tt('nextLabel')}</span>
            {`${next.title} · ${formatClock(next.start, locale)}`}
          </div>
        ) : null}
      </div>
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: gp(8) }}>
        {button('nownext-banner-watch', gp(38), true, onWatch, <><Icons.Play size={gp(14)} /> {tt('watchNowShort')}</>, initAttr(init))}
        {next ? button('nownext-banner-remind', gp(34), false, () => onRemind(next), <><Icons.Bell size={gp(14)} filled={reminded} /> {reminded ? tt('reminderSet') : tt('remindMe')}</>) : null}
      </div>
    </div>
  )
}
