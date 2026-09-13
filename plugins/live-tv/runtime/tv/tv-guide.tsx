'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { qualityFromName } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import type { TvViewProps } from './tv-shell'
import { Chip, Progress, Segment, Tag, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { setGuideMode, useGuideMode, type GuideMode } from './tv-settings-store'
import { blockGeometry, nowLinePct, scheduleWindow, timeTicks } from './tv-schedule-window'
import { ChannelCell, filterByGroup, useDebouncedChannel, useGuideGroups } from './tv-guide-shared'
import { TvPreview } from './tv-preview'
import { TvGuidePlaylists } from './tv-guide-playlists'

const ROW_STEP = 40

export function TvGuide(props: TvViewProps) {
  const storedMode = useGuideMode()
  // Lokalt speglat läge: skrivningen sker via storage (för andra vyer/
  // omstarter) men uppdaterar inte sig själv i samma instans (stubben notifierar
  // inga lyssnare på writePluginJson, bara via emitPluginStorageChanged, som
  // setGuideMode inte anropar). Samma mönster som modellens activePlaylistId.
  const [mode, setMode] = useState<GuideMode>(storedMode)
  useEffect(() => { setMode(storedMode) }, [storedMode])
  const changeMode = (next: GuideMode) => {
    setGuideMode(next)
    setMode(next)
  }
  if (mode === 'playlists') return <TvGuidePlaylists {...props} />
  return <TvGuideStandard {...props} mode={mode} onModeChange={changeMode} />
}

function TvGuideStandard({ model, nav, params, settings, mode, onModeChange }: TvViewProps & { mode: 'now' | 'tl'; onModeChange: (mode: GuideMode) => void }) {
  const { tt, locale } = useTvText()
  const clock = useTvClockNode(locale)
  const groups = useGuideGroups(model, tt)
  const [group, setGroup] = useState<string | null>(params.group === 'all' ? null : params.group ?? null)
  const rows = useMemo(() => filterByGroup(model, group), [model, group])
  const [visible, setVisible] = useState(ROW_STEP)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  // Ingen fallback till rows[0]: i produktionen sätter värdens fokusmotor
  // fokus på data-init-raden vid montering, vilket triggar onFocus och
  // därmed selectedKey. En egen "rows[0]"-fallback hade dubblerat NU/SEN-
  // texten (samma titel i toppbandet och i första radens kolumner).
  const selected = useMemo(() => (selectedKey ? model.byKey.get(selectedKey) ?? null : null), [selectedKey, model.byKey])
  const previewChannel = useDebouncedChannel(selected, 300)
  const listRef = useRef<HTMLDivElement | null>(null)
  const win = useMemo(() => scheduleWindow(model.nowMs), [model.nowMs])
  const nowLeftPct = useMemo(() => nowLinePct(model.nowMs, win), [model.nowMs, win])

  useEffect(() => { setVisible(ROW_STEP) }, [group, mode])

  const info = selected ? model.nowFor(selected) : { now: null, next: null, later: null }
  const previewOn = settings.previewEnabled
  const headlineSize = previewOn ? dp(40) : dp(34)
  const minutesLeft = (stop: number) => tt('minutesLeft', { min: Math.max(0, Math.round((stop - model.nowMs) / 60_000)) })
  const modeOptions: { key: GuideMode; label: string }[] = [{ key: 'now', label: tt('modeNow') }, { key: 'tl', label: tt('modeTimeline') }, { key: 'playlists', label: tt('modePlaylists') }]

  // ◂▸ på en kanalrad byter kategori (handoffen). Värdens fokusmotor tar
  // första synliga [data-live-tv-chip]-träffen om vi förlitar oss på
  // data-f-left/right, vilket alltid blir samma chip — så pilarna hanteras
  // i stället direkt här, och Enter/Space-hållet (glasmenyn) slås ihop in i
  // samma onKeyDown i stället för att skuggas.
  const stepCategory = (delta: 1 | -1) => {
    if (groups.length === 0) return
    const idx = groups.findIndex((g) => g.key === group)
    const nextIdx = (((idx < 0 ? 0 : idx) + delta) + groups.length) % groups.length
    const next = groups[nextIdx]
    if (!next) return
    setGroup(next.key)
    setSelectedKey(null)
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Toppband */}
      <div style={{ height: previewOn ? dp(340) : dp(230), padding: `${dp(34)}px ${dp(48)}px 0`, display: 'flex', gap: dp(32), flexShrink: 0 }}>
        <TvPreview channel={previewChannel} enabled={previewOn} live={Boolean(info.now)} width={dp(480)} height={dp(270)} label={previewOn ? tt('previewLabel') : tt('previewFrame')} onOk={() => selected && nav.play({ channel: selected })} />
        <div data-testid="guide-headline" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), fontSize: dp(18), color: 'rgba(243,244,248,0.65)' }}>
            {selected ? <><span style={{ color: TV.accText, fontWeight: 600 }}>{model.channelNumber(selected) ?? ''}</span><span>{selected.name}</span>{selected.group ? <Tag variant="neutral">{selected.group}</Tag> : null}</> : null}
            <span style={{ marginLeft: 'auto' }}>{clock}</span>
          </div>
          <div style={{ fontSize: headlineSize, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now ? info.now.title : model.cache ? tt('noProgramme') : tt('loadingGuide')}</div>
          {info.now ? (
            <>
              <div style={{ fontSize: dp(19), color: 'rgba(243,244,248,0.65)' }}>{`${formatClock(info.now.start, locale)}–${formatClock(info.now.stop, locale)} · ${minutesLeft(info.now.stop)}`}</div>
              <Progress value={progressOf(info.now.start, info.now.stop, model.nowMs)} height={dp(6)} style={{ maxWidth: dp(720) }} />
              {previewOn && info.now.description ? <div style={{ fontSize: dp(19), color: 'rgba(243,244,248,0.75)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{info.now.description}</div> : null}
            </>
          ) : null}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: dp(12), fontSize: dp(18), color: 'rgba(243,244,248,0.55)' }}>
            {info.next ? <><span style={{ color: TV.accText, fontWeight: 600 }}>{tt('next')}</span><span>{info.next.title} · {formatClock(info.next.start, locale)}</span></> : null}
            <span style={{ marginLeft: 'auto', fontSize: dp(16), color: TV.faint }}>{tt('helpGuide')}</span>
          </div>
        </div>
      </div>

      {/* Kategorirad + segment */}
      <div style={{ padding: `0 ${dp(48)}px ${dp(18)}px`, display: 'flex', alignItems: 'center', gap: dp(16), flexShrink: 0 }}>
        <div data-row="" style={{ display: 'flex', gap: dp(10), overflowX: 'auto', flex: 1, minWidth: 0 }}>
          {groups.map((chip) => (
            <Chip key={chip.id} active={group === chip.key} {...station(() => { setGroup(chip.key); setSelectedKey(null) }, undefined, { 'data-live-tv-chip': chip.id, 'data-testid': `chip-${chip.id}` })}>{chip.label}</Chip>
          ))}
        </div>
        <Segment options={modeOptions} value={mode} onChange={onModeChange} />
      </div>

      {/* Kolumnrubriker */}
      <div style={{ padding: `0 ${dp(48)}px`, display: 'flex', gap: dp(16), fontSize: dp(15), letterSpacing: '0.1em', textTransform: 'uppercase', color: TV.faint, flexShrink: 0 }}>
        <div style={{ width: dp(520), flexShrink: 0, padding: `0 ${dp(12)}px` }}>{tt('colChannel')}</div>
        {mode === 'now' ? (
          <><div style={{ flex: 1.2 }}>{tt('colNow')}</div><div style={{ flex: 1 }}>{tt('colNext')}</div><div style={{ flex: 1 }}>{tt('colLater')}</div></>
        ) : (
          <div style={{ flex: 1, position: 'relative', height: dp(20) }}>
            {timeTicks(win).map((tick, i) => <span key={tick} style={{ position: 'absolute', left: `${i * 25}%` }}>{formatClock(tick, locale)}</span>)}
            <div data-testid="now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: `${nowLeftPct}%`, width: 2, background: TV.acc, boxShadow: `0 0 12px ${TV.accMix(60)}`, pointerEvents: 'none' }} />
          </div>
        )}
      </div>

      {/* Rader */}
      <div ref={listRef} data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `0 ${dp(48)}px ${dp(24)}px` }}>
        {rows.length === 0 ? <div style={{ padding: dp(24), color: TV.dim, fontSize: dp(19) }}>{tt('guideEmpty')}</div> : null}
        {rows.slice(0, visible).map((channel, index) => {
          const rowInfo = model.nowFor(channel)
          const key = channelKey(channel)
          const focused = selected ? channelKey(selected) === key : false
          const isInit = selected ? focused : index === 0
          const rowStation = station(() => nav.play({ channel }), (el) => nav.channelMenu(channel, el), {
            ...(isInit ? { 'data-init': '' } : {}),
          })
          const baseOnKeyDown = rowStation.onKeyDown as ((event: ReactKeyboardEvent<HTMLDivElement>) => void) | undefined
          const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              event.stopPropagation()
              stepCategory(event.key === 'ArrowLeft' ? -1 : 1)
              return
            }
            baseOnKeyDown?.(event)
          }
          return (
            <div key={key} style={{ height: dp(86), borderBottom: `1px solid rgba(255,255,255,0.07)`, display: 'flex', alignItems: 'center', gap: dp(16) }}>
              <div
                data-testid="guide-row"
                {...rowStation}
                onKeyDown={onKeyDown}
                onFocus={() => setSelectedKey(key)}
                style={{ cursor: 'pointer', borderRadius: dp(12) }}
              >
                <ChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} quality={qualityFromName(channel.name)} focused={focused} />
              </div>
              {mode === 'now' ? (
                <>
                  <div style={{ flex: 1.2, minWidth: 0 }}>
                    <div style={{ fontSize: dp(20), fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: rowInfo.now ? TV.text : TV.dim }}>{rowInfo.now?.title ?? tt('noProgramme')}</div>
                    {rowInfo.now ? <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), marginTop: dp(8) }}><Progress value={progressOf(rowInfo.now.start, rowInfo.now.stop, model.nowMs)} height={dp(4)} style={{ flex: 1 }} /><span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)', whiteSpace: 'nowrap' }}>{Math.max(0, Math.round((rowInfo.now.stop - model.nowMs) / 60_000))} min</span></div> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {rowInfo.next ? <><div style={{ fontSize: dp(19), color: 'rgba(243,244,248,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rowInfo.next.title}</div><div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)' }}>{formatClock(rowInfo.next.start, locale)}</div></> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {rowInfo.later ? <><div style={{ fontSize: dp(19), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rowInfo.later.title}</div><div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.4)' }}>{formatClock(rowInfo.later.start, locale)}</div></> : null}
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, position: 'relative', height: dp(72), minWidth: 0 }}>
                  {model.scheduleFor(channel, win.start, win.end).map((p) => {
                    const g = blockGeometry(p, win)
                    if (!g) return null
                    const onNow = p.start <= model.nowMs && p.stop > model.nowMs
                    return (
                      <div key={p.start} style={{ position: 'absolute', top: 0, bottom: 0, left: `${g.leftPct}%`, width: `calc(${g.widthPct}% - ${dp(6)}px)`, borderRadius: dp(10), padding: `${dp(14)}px ${dp(16)}px`, background: onNow ? TV.accMix(16) : TV.s05, color: onNow ? TV.text : 'rgba(243,244,248,0.7)', overflow: 'hidden' }}>
                        <div style={{ fontSize: dp(18), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                        <div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.45)' }}>{formatClock(p.start, locale)}–{formatClock(p.stop, locale)}</div>
                      </div>
                    )
                  })}
                  {model.scheduleFor(channel, win.start, win.end).length === 0 ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: dp(16), color: TV.dim, fontSize: dp(18) }}>{tt('noProgramme')}</div> : null}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${nowLeftPct}%`, width: 2, background: TV.acc, boxShadow: `0 0 12px ${TV.accMix(60)}`, pointerEvents: 'none' }} />
                </div>
              )}
            </div>
          )
        })}
        {rows.length > visible ? (
          <div {...station(() => setVisible((v) => v + ROW_STEP))} style={{ margin: `${dp(20)}px auto 0`, width: 'fit-content', height: dp(48), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.s10, display: 'flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('showMore')}</div>
        ) : null}
      </div>
    </div>
  )
}
