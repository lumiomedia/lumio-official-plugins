'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrowsePageProps } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from './live-tv-data'
import { startOfLocalDay, useLiveTvModel } from './live-tv-model'
import type { EpgProgramme } from './epg/types'
import { useHubText } from './hub-strings'
import { isReminded, toggleReminder } from './reminders'
import { Btn, ChannelBadge, Icon, LT, LiveTvHeader, formatClock, surfaceCard } from './live-tv-ui'
import { ReminderBell, RemindersMenu, encodeChannelParams, useLiveTvChrome, useLiveTvNav } from './live-tv-shell'
import { useIsMobileLayout } from './hooks/useIsMobileLayout'

/**
 * Fullskärms-EPG (handoff §2): kanal × tid med fast kanalkolumn, Nu-linje,
 * Idag/Imorgon och en detaljremsa för valt program. 240 px per timme, 56 px
 * rader, 160 px kanalkolumn — som prototypen.
 */
const HOUR_PX = 240
const PX_PER_MIN = HOUR_PX / 60
const CHANNEL_COL = 160
/**
 * Kanalkolumnen på mobil: smalare, och den FÖLJER MED i sidoscrollen i stället
 * för att ligga fast (Jerry 2026-09-03). Fastlåst åt 160 px av 328 px
 * innehållsbredd, så knappt halva skärmen fanns kvar till själva tablån —
 * mindre än en timme i taget. Skrivbordet har bredd nog och behåller den
 * fasta kolumnen, som är det som gör en tablå läsbar när man scrollat långt.
 */
const CHANNEL_COL_MOBILE = 108
const ROW_MIN_H = 56
const MAX_ROWS = 80

interface Props {
  onNavigate: BrowsePageProps['onNavigate']
}

function alignToHour(ms: number): number {
  const d = new Date(ms)
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

export function LiveTvEpgPage({ onNavigate }: Props) {
  const { h, locale } = useHubText()
  const model = useLiveTvModel()
  const go = useLiveTvNav(onNavigate)
  const { play, chrome } = useLiveTvChrome(model)
  const [dayOffset, setDayOffset] = useState<0 | 1>(0)
  const [selected, setSelected] = useState<{ channel: M3uChannel; programme: EpgProgramme } | null>(null)
  const [reminderTick, setReminderTick] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const isMobile = useIsMobileLayout()
  const channelCol = isMobile ? CHANNEL_COL_MOBILE : CHANNEL_COL
  const { nowMs } = model

  // Idag: från en timme före nu och tolv timmar fram. Imorgon: 06–24.
  const windowStart = dayOffset === 0 ? alignToHour(nowMs - 3_600_000) : startOfLocalDay(nowMs, 1) + 6 * 3_600_000
  const windowEnd = dayOffset === 0 ? windowStart + 12 * 3_600_000 : startOfLocalDay(nowMs, 2)
  const hourMarks = useMemo(() => {
    const marks: number[] = []
    for (let t = windowStart; t < windowEnd; t += 3_600_000) marks.push(t)
    return marks
  }, [windowStart, windowEnd])
  const gridWidth = ((windowEnd - windowStart) / 60_000) * PX_PER_MIN
  const nowLeft = ((nowMs - windowStart) / 60_000) * PX_PER_MIN
  const nowVisible = nowMs >= windowStart && nowMs <= windowEnd

  const rows = useMemo(() => {
    // Favoriter först, sedan övriga kanaler med tablå. Kanaler utan tablå
    // utelämnas — en tom rad säger inget.
    const ordered = [
      ...model.pinnedKeys.map((key) => model.byKey.get(key)).filter((channel): channel is M3uChannel => Boolean(channel)),
      ...model.channels.filter((channel) => !model.pinnedSet.has(channelKey(channel))),
    ]
    const out: Array<{ channel: M3uChannel; programmes: EpgProgramme[] }> = []
    for (const channel of ordered) {
      const programmes = model.scheduleFor(channel, windowStart, windowEnd)
      if (programmes.length === 0) continue
      out.push({ channel, programmes })
      if (out.length >= MAX_ROWS) break
    }
    return out
  }, [model, windowStart, windowEnd])

  const scrollToNow = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = Math.max(0, nowLeft - el.clientWidth * 0.15)
  }
  useEffect(() => {
    if (dayOffset === 0) scrollToNow()
    else if (scrollRef.current) scrollRef.current.scrollLeft = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOffset, rows.length > 0])

  const selectedReminded = selected ? isReminded(selected.channel, selected.programme) : false
  void reminderTick

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: LT.text }}>
      <LiveTvHeader
        title={h('epgTitle')}
        onBack={() => go('hub')}
        backLabel={h('back')}
        right={
          <>
            <RemindersMenu model={model} onOpenChannel={(channel) => go('channel', encodeChannelParams(channel))} />
          </>
        }
      >
        <Btn variant={dayOffset === 0 ? 'primary' : 'ghost'} small pressed={dayOffset === 0} onClick={() => { setDayOffset(0); setSelected(null) }}>
          {h('guideToday')}
        </Btn>
        <Btn variant={dayOffset === 1 ? 'primary' : 'ghost'} small pressed={dayOffset === 1} onClick={() => { setDayOffset(1); setSelected(null) }}>
          {h('guideTomorrow')}
        </Btn>
        <Btn variant="secondary" small onClick={() => { setDayOffset(0); window.setTimeout(scrollToNow, 0) }} style={{ marginLeft: 8 }}>
          {h('guideNow')} <span style={{ width: 8, height: 8, borderRadius: 999, border: `1.5px solid ${LT.accent}` }} />
        </Btn>
      </LiveTvHeader>

      {rows.length === 0 ? (
        <div style={{ ...surfaceCard, padding: 20, fontSize: 14, color: LT.muted }}>{h('epgEmpty')}</div>
      ) : (
        <div ref={scrollRef} className="overflow-x-auto [scrollbar-width:thin]" style={{ position: 'relative' }}>
          <div style={{ minWidth: channelCol + gridWidth, position: 'relative' }}>
            {/* Timlinje */}
            <div style={{ display: 'flex', paddingLeft: channelCol, height: 28, borderBottom: `1px solid ${LT.line}`, marginBottom: 6, position: 'sticky', top: 0, zIndex: 3, background: LT.bg }}>
              {hourMarks.map((mark) => (
                <div key={mark} style={{ width: HOUR_PX, flexShrink: 0, fontSize: 12, color: LT.dim }}>{formatClock(mark, locale)}</div>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              {nowVisible ? (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: channelCol + nowLeft, width: 2, background: LT.accent, zIndex: 2, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', top: -18, left: -14, fontSize: 10, color: LT.accentText, whiteSpace: 'nowrap' }}>{h('nowAt', { time: formatClock(nowMs, locale) })}</div>
                </div>
              ) : null}
              {rows.map(({ channel, programmes }) => (
                <div key={channelKey(channel)} style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${LT.line}`, minHeight: ROW_MIN_H }}>
                  <button
                    type="button"
                    onClick={() => go('channel', encodeChannelParams(channel))}
                    title={channel.name}
                    style={{ width: channelCol, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 8, background: LT.bg, zIndex: 1, border: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', ...(isMobile ? null : { position: 'sticky' as const, left: 0 }) }}
                  >
                    <ChannelBadge channel={channel} size={isMobile ? 22 : 28} />
                    <div className="truncate" style={{ fontSize: 12, fontWeight: 500 }}>{channel.name}</div>
                  </button>
                  <div style={{ display: 'flex', position: 'relative', width: gridWidth }}>
                    {programmes.map((programme) => {
                      const start = Math.max(programme.start, windowStart)
                      const stop = Math.min(programme.stop, windowEnd)
                      const width = Math.max(4, ((stop - start) / 60_000) * PX_PER_MIN)
                      const left = ((start - windowStart) / 60_000) * PX_PER_MIN
                      const isNow = programme.start <= nowMs && programme.stop > nowMs
                      const isSelected = selected?.programme.start === programme.start && selected.channel.url === channel.url
                      const reminded = isReminded(channel, programme)
                      return (
                        <button
                          key={programme.start}
                          type="button"
                          onClick={() => setSelected({ channel, programme })}
                          // Dubbelklick = påminnelse av/på direkt i rutan (Jerry 2026-09-03):
                          // ett klick markerar, men ingenting hände förrän man hittade
                          // klockan i detaljraden. Klockikonen i rutan visar läget.
                          onDoubleClick={() => {
                            setSelected({ channel, programme })
                            // Pågående program: ingen påminnelse att sätta — spela kanalen.
                            if (isNow) {
                              play({ channel })
                              return
                            }
                            toggleReminder(channel, programme)
                            setReminderTick((value) => value + 1)
                          }}
                          title={`${programme.title} ${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}`}
                          style={{
                            position: 'absolute',
                            left,
                            top: 0,
                            bottom: 0,
                            width,
                            boxSizing: 'border-box',
                            borderRight: `1px solid ${LT.line}`,
                            padding: '6px 8px',
                            background: isSelected ? 'rgba(255,255,255,0.12)' : isNow ? LT.accentDeep : 'transparent',
                            border: 0,
                            borderLeft: isSelected ? `2px solid ${LT.accent}` : undefined,
                            color: 'inherit',
                            textAlign: 'left',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            fontFamily: 'inherit',
                          }}
                        >
                          <div className="truncate" style={{ fontSize: 12, fontWeight: 500, paddingRight: reminded ? 16 : 0 }}>{programme.title}</div>
                          <div style={{ fontSize: 10, color: LT.dim }}>
                            {formatClock(programme.start, locale)}–{formatClock(programme.stop, locale)}
                          </div>
                          {reminded ? (
                            <svg aria-label={h('reminderOn')} viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={LT.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 6, top: 6 }}>
                              <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16z" />
                              <path d="M10 20a2 2 0 0 0 4 0" />
                            </svg>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selected ? (
        <div style={{ ...surfaceCard, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <ChannelBadge channel={selected.channel} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>{selected.programme.title}</div>
            <div style={{ fontSize: 12, color: LT.dim }}>
              {selected.channel.name} · {formatClock(selected.programme.start, locale)}–{formatClock(selected.programme.stop, locale)}
            </div>
            {selected.programme.description ? (
              <div className="line-clamp-2" style={{ fontSize: 12, color: LT.muted, marginTop: 2 }}>{selected.programme.description}</div>
            ) : null}
          </div>
          {selected.programme.start > nowMs ? (
            <ReminderBell
              on={selectedReminded}
              label={selectedReminded ? h('reminderOn') : h('reminderOff')}
              onToggle={() => {
                toggleReminder(selected.channel, selected.programme)
                setReminderTick((value) => value + 1)
              }}
            />
          ) : null}
          <Btn variant="primary" onClick={() => play({ channel: selected.channel })}>
            {h('guideWatch')} <Icon.Play size={12} />
          </Btn>
        </div>
      ) : null}

      {chrome}
    </div>
  )
}
