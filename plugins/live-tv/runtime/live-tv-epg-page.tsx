'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTvMode, type BrowsePageProps } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from './live-tv-data'
import { startOfLocalDay, useLiveTvModel } from './live-tv-model'
import type { EpgProgramme } from './epg/types'
import { useHubText } from './hub-strings'
import { isReminded, toggleReminder } from './reminders'
import { Btn, ChannelBadge, Icon, LT, LiveTvHeader, formatClock, surfaceCard } from './live-tv-ui'
import { ReminderBell, RemindersMenu, encodeChannelParams, useLiveTvChrome, useLiveTvNav } from './live-tv-shell'
import { useIsMobileLayout } from './hooks/useIsMobileLayout'
import { selectEpgRows } from './epg-rows'
import { useSchedules } from './hooks/useSchedules'
import { useSwipeBack } from './hooks/useSwipeBack'
import { useBackToHub } from './hooks/useBackToHub'

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
/**
 * Startantal rader, och hur många varje "Visa fler" lägger till. Taket finns
 * för att tablån slår upp per kanal; se selectEpgRows för varför
 * genomsökningen är lat.
 */
const MAX_ROWS = 80
const EPG_ROWS_STEP = 80
/**
 * Hur många kanaler som frågas efter per synlig rad.
 *
 * Tablån bor i appen sedan lagring v2, så raderna kostar ett fönsteranrop och
 * inte en cachesökning: hela spellistan (17 000 nycklar) hade blivit 85 anrop
 * för 80 rader. Överskottet finns för att kanaler UTAN tablå faller bort i
 * `selectEpgRows` — tre kandidater per rad räcker i praktiken, och "Visa fler"
 * hämtar nästa svep när det inte gör det.
 */
const CANDIDATE_FACTOR = 3

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
  const { play, chrome, overlayOpen } = useLiveTvChrome(model)
  // Tillbaka till hubben med ett kantdrag på mobil; Tillbaka-pilen ligger kvar.
  useSwipeBack(() => go('hub'), !overlayOpen)
  // Samma väg ut med fjärren som med fingret: sidan hade bakåtpil och svep,
  // men ingen tangenthantering — "pressing return does not exit epg"
  // (testfeedback 2026-09-11). Avstår medan ett eget lager är öppet.
  useBackToHub(() => go('hub'), !overlayOpen)
  const [dayOffset, setDayOffset] = useState<0 | 1>(0)
  // Tablån saknade gruppfilter helt: med 1 100 kanaler i en panel gick det
  // inte att komma åt en enda kategori (Jerry/betatestare 2026-09-09).
  const [group, setGroup] = useState<string | null>(null)
  const [visibleRows, setVisibleRows] = useState(MAX_ROWS)
  const [selected, setSelected] = useState<{ channel: M3uChannel; programme: EpgProgramme } | null>(null)
  const [reminderTick, setReminderTick] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const isMobile = useIsMobileLayout()
  // TV (Jerry 2026-09-06): sidan hade INGA fokusstationer, så varje tangent-
  // tryck gick till sidomenyn — den öppnade sig så fort man kom hit.
  const isTv = useTvMode()
  const tvStation = isTv ? { 'data-f': '' } : undefined
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

  const groups = useMemo(() => {
    const seen = new Set<string>()
    for (const channel of model.channels) {
      const name = (channel.group ?? '').trim()
      if (name) seen.add(name)
    }
    return [...seen].sort((a, b) => a.localeCompare(b))
  }, [model.channels])

  useEffect(() => {
    setVisibleRows(MAX_ROWS)
  }, [group, dayOffset])

  // Favoriter först, sedan övriga kanaler. Kanaler utan tablå utelämnas i
  // selectEpgRows — en tom rad säger inget.
  const ordered = useMemo(
    () => [
      ...model.pinnedKeys.map((key) => model.byKey.get(key)).filter((channel): channel is M3uChannel => Boolean(channel)),
      ...model.channels.filter((channel) => !model.pinnedSet.has(channelKey(channel))),
    ],
    [model.pinnedKeys, model.byKey, model.channels, model.pinnedSet],
  )
  /**
   * Tablån hämtas numera från appen per fönster, inte ur en EPG-cache i
   * webviewn. Vi frågar om ett ÖVERSKOTT av kanaler (kanaler utan tablå faller
   * bort i selectEpgRows), men inte om hela spellistan — 17 000 nycklar vore
   * 85 anrop för 80 synliga rader.
   */
  const eligible = useMemo(
    () => ordered.filter((channel) => !group || channel.group === group),
    [ordered, group],
  )
  const candidates = useMemo(() => eligible.slice(0, visibleRows * CANDIDATE_FACTOR), [eligible, visibleRows])
  const { schedules, loading: schedulesLoading } = useSchedules(candidates, windowStart, windowEnd)
  const { rows, hasMore: moreAmongCandidates } = useMemo(
    () => selectEpgRows(candidates, (channel) => schedules[channelKey(channel)] ?? [], group, visibleRows),
    [candidates, schedules, group, visibleRows],
  )
  /**
   * "Visa fler" måste finnas kvar även när KANDIDATERNA tog slut men
   * spellistan inte gjorde det: `selectEpgRows` vet bara om det urval den
   * fick, och skulle annars påstå "alla kanaler med tablå visas" fast
   * överskottsfönstret kapade listan långt före spellistans slut.
   */
  const hasMore = moreAmongCandidates || candidates.length < eligible.length

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
        backTvStation={tvStation}
        right={
          <>
            <RemindersMenu model={model} onOpenChannel={(channel) => go('channel', encodeChannelParams(channel))} tvStation={tvStation} />
          </>
        }
      >
        <Btn variant={dayOffset === 0 ? 'primary' : 'ghost'} small pressed={dayOffset === 0} onClick={() => { setDayOffset(0); setSelected(null) }} tvStation={isTv ? { 'data-f': '', 'data-init': '' } : undefined}>
          {h('guideToday')}
        </Btn>
        <Btn variant={dayOffset === 1 ? 'primary' : 'ghost'} small pressed={dayOffset === 1} onClick={() => { setDayOffset(1); setSelected(null) }} tvStation={tvStation}>
          {h('guideTomorrow')}
        </Btn>
        <Btn variant="secondary" small onClick={() => { setDayOffset(0); window.setTimeout(scrollToNow, 0) }} style={{ marginLeft: 8 }} tvStation={tvStation}>
          {h('guideNow')} <span style={{ width: 8, height: 8, borderRadius: 999, border: `1.5px solid ${LT.accent}` }} />
        </Btn>
      </LiveTvHeader>

      {/*
        Gruppchips. Tablån hade ingen kategoriväg alls, så en panel med 1 100
        kanaler visade bara de första raderna som råkade ha tablå och gav
        ingen möjlighet att leta vidare. Raden scrollar i sidled och ligger
        kvar över tablån, som själv scrollar i båda riktningarna.
      */}
      {groups.length > 1 ? (
        <div
          style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
          className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Btn
            variant={group === null ? 'primary' : 'ghost'}
            small
            pressed={group === null}
            onClick={() => { setGroup(null); setSelected(null) }}
            tvStation={tvStation}
          >
            {h('hubAllGroups')}
          </Btn>
          {groups.map((name) => (
            <Btn
              key={name}
              variant={group === name ? 'primary' : 'ghost'}
              small
              pressed={group === name}
              onClick={() => { setGroup(name); setSelected(null) }}
              tvStation={tvStation}
            >
              {name}
            </Btn>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div style={{ ...surfaceCard, padding: 20, fontSize: 14, color: LT.muted }}>
          {/* Tablån hämtas från appen: tomt betyder "hämtar" tills svaret
              kommit, och först därefter "ingen tablå för de här kanalerna". */}
          {model.channelsLoading ? h('hubLoadingChannels') : schedulesLoading ? h('hubLoadingEpg') : h('epgEmpty')}
        </div>
      ) : (
        <div ref={scrollRef} {...(isTv ? { 'data-scroll': '' } : {})} className="overflow-x-auto [scrollbar-width:thin]" style={{ position: 'relative' }}>
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
                    {...(tvStation ?? {})}
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
                          {...(tvStation ?? {})}
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

      {rows.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/*
            Skiljer "fler finns" från "det är allt med tablå". Utan den
            skillnaden läses ett tomt slut som ett tak, och man letar efter en
            gräns som inte finns — de flesta kanalerna i en stor panel har
            ingen matchad tablå.
          */}
          <span style={{ fontSize: 12.5, color: LT.muted }}>
            {hasMore
              ? h('epgShowingRows', { shown: rows.length })
              : h('epgAllWithGuide', { shown: rows.length })}
          </span>
          {hasMore ? (
            <Btn variant="secondary" small onClick={() => setVisibleRows((count) => count + EPG_ROWS_STEP)} tvStation={tvStation}>
              {h('hubShowMore')}
            </Btn>
          ) : null}
        </div>
      ) : null}

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
          <Btn variant="primary" onClick={() => play({ channel: selected.channel })} tvStation={tvStation}>
            {h('guideWatch')} <Icon.Play size={12} />
          </Btn>
        </div>
      ) : null}

      {chrome}
    </div>
  )
}
