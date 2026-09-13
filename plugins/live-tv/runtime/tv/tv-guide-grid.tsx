'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import type { EpgProgramme } from '../epg/types'
import { formatClock } from '../live-tv-ui'
import { isReminded, toggleReminder } from '../reminders'
import { selectEpgRows } from '../epg-rows'
import { useSchedules } from '../hooks/useSchedules'
import { useIsMobileLayout } from '../hooks/useIsMobileLayout'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Chip, Icons, Segment, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import type { GuideMode } from './tv-settings-store'
import { FAVS_GROUP, useGuideGroups } from './tv-guide-shared'
import {
  CHANNEL_COL_PX,
  HOUR_PX,
  PX_PER_MIN,
  ROW_MIN_H_PX,
  epgBlockBox,
  epgRowBoxes,
  hourMarks,
  nowLinePx,
  type EpgBlockBox,
} from './epg-grid-geometry'

/**
 * Guideläget **Rutnät** (spec 4.3): skrivbordets EPG-tablå
 * (`live-tv-epg-page.tsx`) porterad till TV-trädet, med samma delar —
 * Idag/Imorgon, Nu-knapp, kategorichips, 240 px per timme, 160 px kanalkolumn,
 * Nu-linje, detaljremsa och "Visa fler".
 *
 * Två saker skiljer den från originalet, och båda är avsiktliga:
 *
 * 1. **Geometrin ligger i `epg-grid-geometry.ts`** (P5). Skrivbordets
 *    `width = Math.max(4, …)` mot `padding: '6px 8px'` + `boxSizing:
 *    'border-box'` gjorde att ett block aldrig kunde bli smalare än sin egen
 *    vågräta padding: 4 px renderades som ≥16 px och lade sig över grannen
 *    (Jerrys skärmdump, "Live NFL Football Night" över "NFL Cowboys @
 *    Giants"). Här är `width` den SANNA bredden, `shape` säger vad som får
 *    plats och `paddingX` är `min(8, bredd/3)`.
 * 2. **Varje block är en `station()`**, inte en `<button>`. Fjärren flyttar
 *    ◂▸ i tid inom raden och ▴▾ mellan kanaler helt på motorns geometri —
 *    blocken är absolut positionerade i rad, så inga egna piltangenter
 *    behövs (till skillnad från `tv-guide.tsx`, där ◂▸ byter kategori).
 *
 * Alla mått är designpixlar inne i värdens scen, alltså `dp()` — se `dp` i
 * `tv-ui.tsx` för varför den är identitet.
 */

/** Startantal rader, och steget per "Visa fler" — samma tal som skrivbordet. */
const MAX_ROWS = 80
const EPG_ROWS_STEP = 80
/**
 * Hur många kanaler som frågas efter per synlig rad. Tablån bor i appen sedan
 * lagring v2, så raderna kostar ett fönsteranrop och inte en cachesökning:
 * hela spellistan (17 000 nycklar) hade blivit 85 anrop för 80 rader.
 * Överskottet finns för att kanaler UTAN tablå faller bort i `selectEpgRows`.
 */
const CANDIDATE_FACTOR = 3

function alignToHour(ms: number): number {
  const d = new Date(ms)
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

type Selection = { channel: M3uChannel; programme: EpgProgramme }

/**
 * Parar ihop geometrins boxar med sina program.
 *
 * `epgRowBoxes` tar hand om överlapp — den sorterar, kastar program utan eget
 * utrymme och klipper föregående blocks högerkant — och returnerar DÄRFÖR
 * färre boxar än det kom program in. `programmes[i]` hör alltså inte till
 * `boxes[i]`, och en naiv indexparning hade satt fel titel på fel block så
 * fort en källa har överlappande tider (vilket är precis den datan buggen
 * kom ifrån).
 *
 * Paret hittas på vänsterkanten: `resolveOverlaps` rör aldrig ett programs
 * `start`, bara föregåendes `stop`, så en box `left` är alltid den vänsterkant
 * programmet självt skulle fått. Båda listorna är sorterade på start, så en
 * enda markör genom programlistan räcker.
 */
function rowEntries(
  programmes: readonly EpgProgramme[],
  windowStart: number,
  windowEnd: number,
): { box: EpgBlockBox; programme: EpgProgramme }[] {
  const sorted = [...programmes].sort((a, b) => a.start - b.start)
  const boxes = epgRowBoxes(sorted, windowStart, windowEnd)
  const entries: { box: EpgBlockBox; programme: EpgProgramme }[] = []
  let cursor = 0
  for (const box of boxes) {
    while (cursor < sorted.length) {
      const programme = sorted[cursor]
      cursor += 1
      const own = epgBlockBox(programme, windowStart, windowEnd)
      if (own && Math.abs(own.left - box.left) < 0.001) {
        entries.push({ box, programme })
        break
      }
    }
  }
  return entries
}

export function TvGuideGrid({ model, nav, mode, onModeChange }: TvViewProps & { mode: GuideMode; onModeChange: (mode: GuideMode) => void }) {
  const { tt, locale } = useTvText()
  const groups = useGuideGroups(model, tt)
  const [group, setGroup] = useState<string | null>(null)
  const [dayOffset, setDayOffset] = useState<0 | 1>(0)
  const [visibleRows, setVisibleRows] = useState(MAX_ROWS)
  const [selected, setSelected] = useState<Selection | null>(null)
  // Påminnelser bor i lagringen, inte i modellen: en räknare tvingar fram
  // omritningen när klockikonen i ett block ska byta läge.
  const [reminderTick, setReminderTick] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  /**
   * Fast kanalkolumn utanför en smal yta. `useIsMobileLayout()` är dagens
   * mått; när P1:s `useNarrowSurface()` finns är DEN villkoret (den läser
   * värdens `data-tv-scene-narrow` på scenlådan, alltså den MÄTTA bredden).
   * Villkoret står på EN plats just för att bytet ska bli en rad.
   */
  const narrow = useIsMobileLayout()
  const { nowMs } = model

  // Idag: från en timme före nu och tolv timmar fram. Imorgon: 06–24.
  const windowStart = dayOffset === 0 ? alignToHour(nowMs - 3_600_000) : startOfLocalDay(nowMs, 1) + 6 * 3_600_000
  const windowEnd = dayOffset === 0 ? windowStart + 12 * 3_600_000 : startOfLocalDay(nowMs, 2)
  const marks = useMemo(() => hourMarks(windowStart, windowEnd), [windowStart, windowEnd])
  const gridWidth = ((windowEnd - windowStart) / 60_000) * PX_PER_MIN
  const nowLeft = nowLinePx(nowMs, windowStart)
  const nowVisible = nowMs >= windowStart && nowMs <= windowEnd

  useEffect(() => { setVisibleRows(MAX_ROWS); setSelected(null) }, [group, dayOffset])

  // Favoriter först, sedan övriga kanaler — kanaler utan tablå faller bort i
  // `selectEpgRows`, en tom rad säger inget.
  const ordered = useMemo(
    () => [
      ...model.pinnedKeys.map((key) => model.byKey.get(key)).filter((channel): channel is M3uChannel => Boolean(channel)),
      ...model.channels.filter((channel) => !model.pinnedSet.has(channelKey(channel))),
    ],
    [model.pinnedKeys, model.byKey, model.channels, model.pinnedSet],
  )
  /**
   * Kategorin filtreras HÄR och inte i `selectEpgRows`.
   *
   * TV-chipsen har två poster som inte är gruppnamn ("Alla" och "Favoriter"),
   * och `selectEpgRows` jämför rakt mot `channel.group` — `__favs` hade
   * filtrerat bort varenda kanal. Urvalet görs alltså före, och funktionen får
   * `null` som grupp.
   */
  const eligible = useMemo(() => {
    if (group === FAVS_GROUP) return model.favouriteChannels
    if (group) return ordered.filter((channel) => channel.group === group)
    return ordered
  }, [ordered, group, model.favouriteChannels])
  const candidates = useMemo(() => eligible.slice(0, visibleRows * CANDIDATE_FACTOR), [eligible, visibleRows])
  const { schedules, loading: schedulesLoading } = useSchedules(candidates, windowStart, windowEnd)
  const { rows, hasMore: moreAmongCandidates } = useMemo(
    () => selectEpgRows(candidates, (channel) => schedules[channelKey(channel)] ?? [], null, visibleRows),
    [candidates, schedules, visibleRows],
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

  const isLive = (programme: EpgProgramme) => programme.start <= nowMs && programme.stop > nowMs
  const toggle = (channel: M3uChannel, programme: EpgProgramme) => {
    toggleReminder(channel, programme, nowMs)
    setReminderTick((value) => value + 1)
  }
  void reminderTick

  /**
   * Precis EN `data-init` i vyn: det pågående programmet i första raden, annars
   * första kanalkolumnen. Utan rader bär tomläget den (se nedan).
   */
  const initKey = useMemo(() => {
    const first = rows[0]
    if (!first) return null
    const live = first.programmes.find((programme) => isLive(programme))
    return { channel: channelKey(first.channel), start: live ? live.start : null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, nowMs])

  const modeOptions: { key: GuideMode; label: string }[] = [
    { key: 'now', label: tt('modeNow') },
    { key: 'tl', label: tt('modeTimeline') },
    { key: 'grid', label: tt('modeGrid') },
    { key: 'playlists', label: tt('modePlaylists') },
  ]

  const dayChip = (offset: 0 | 1, label: string) => (
    <Chip active={dayOffset === offset} {...station(() => setDayOffset(offset), undefined, { 'data-testid': `grid-day-${offset}` })}>{label}</Chip>
  )

  const selectedReminded = selected ? isReminded(selected.channel, selected.programme) : false

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Topprad: Idag/Imorgon, Nu och lägesväxeln */}
      <div style={{ padding: `${dp(28)}px ${dp(48)}px ${dp(16)}px`, display: 'flex', alignItems: 'center', gap: dp(12), flexShrink: 0 }}>
        {dayChip(0, tt('gridToday'))}
        {dayChip(1, tt('gridTomorrow'))}
        <Chip active={false} {...station(() => { setDayOffset(0); window.setTimeout(scrollToNow, 0) }, undefined, { 'data-testid': 'grid-jump-now' })}>
          {tt('gridNow')}
          <span style={{ marginLeft: dp(8), width: dp(8), height: dp(8), borderRadius: 999, border: `1.5px solid ${TV.acc}` }} />
        </Chip>
        <Segment options={modeOptions} value={mode} onChange={onModeChange} style={{ marginLeft: 'auto' }} />
      </div>

      {/* Kategorichips — samma rad som i standardguiden, `data-row` så motorns
          ◂▸ stannar i den i stället för att hoppa ner i rutnätet. */}
      <div data-row="" style={{ padding: `0 ${dp(48)}px ${dp(16)}px`, display: 'flex', gap: dp(10), overflowX: 'auto', flexShrink: 0 }}>
        {groups.map((chip) => (
          <Chip key={chip.id} active={group === chip.key} title={chip.label} {...station(() => setGroup(chip.key), undefined, { 'data-testid': `grid-chip-${chip.id}` })}>{chip.label}</Chip>
        ))}
      </div>

      {/* Tomläget MONTERAS ALLTID (samma skäl som i `tv-guide.tsx`): under
          laddningen är det vyns enda station och bär `data-init`; när raderna
          kommit döljs noden i stället för att avmonteras, så fokusmotorn
          aldrig står utan startstation en bildruta. */}
      <div
        data-testid="grid-empty"
        {...(rows.length === 0
          ? station(() => setGroup(null), undefined, { 'data-init': '' })
          : { 'aria-hidden': true })}
        style={{ margin: `0 ${dp(48)}px`, padding: dp(24), color: TV.dim, fontSize: dp(19), borderRadius: dp(12), background: TV.s05, cursor: 'pointer', display: rows.length === 0 ? 'block' : 'none' }}
      >
        {model.channelsLoading ? tt('loadingChannels') : schedulesLoading ? tt('loadingGuide') : tt('gridEmpty')}
      </div>

      {rows.length > 0 ? (
        <div
          ref={scrollRef}
          data-scroll=""
          data-testid="grid-scroll"
          style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: `0 ${dp(48)}px ${dp(16)}px` }}
        >
          <div style={{ minWidth: dp(CHANNEL_COL_PX) + gridWidth, position: 'relative' }}>
            {/* Timlinjen */}
            <div style={{ display: 'flex', paddingLeft: dp(CHANNEL_COL_PX), height: dp(30), borderBottom: `1px solid ${TV.line}`, marginBottom: dp(6), position: 'sticky', top: 0, zIndex: 3, background: TV.bg }}>
              {marks.map((mark) => (
                <div key={mark} style={{ width: dp(HOUR_PX), flexShrink: 0, fontSize: dp(15), color: TV.dim }}>{formatClock(mark, locale)}</div>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              {nowVisible ? (
                <div data-testid="grid-now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: dp(CHANNEL_COL_PX) + nowLeft, width: 2, background: TV.acc, boxShadow: `0 0 12px ${TV.accMix(60)}`, zIndex: 2, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', top: dp(-22), left: dp(-16), fontSize: dp(13), color: TV.accText, whiteSpace: 'nowrap' }}>{tt('gridNowAt', { time: formatClock(nowMs, locale) })}</div>
                </div>
              ) : null}
              {rows.map(({ channel, programmes }) => {
                const key = channelKey(channel)
                const entries = rowEntries(programmes, windowStart, windowEnd)
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${TV.line}`, minHeight: dp(ROW_MIN_H_PX) }}>
                    <div
                      data-testid="grid-channel"
                      title={channel.name}
                      {...station(
                        () => nav.openChannel(channel),
                        (element) => nav.channelMenu(channel, element),
                        initKey && initKey.channel === key && initKey.start === null ? { 'data-init': '' } : undefined,
                      )}
                      style={{ width: dp(CHANNEL_COL_PX), flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(10), paddingRight: dp(10), background: TV.bg, zIndex: 1, cursor: 'pointer', ...(narrow ? null : { position: 'sticky' as const, left: 0 }) }}
                    >
                      <ChannelArt channel={channel} style={{ width: dp(48), height: dp(30), flexShrink: 0 }} radius={dp(6)} />
                      <div style={{ minWidth: 0, fontSize: dp(15), fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                    </div>
                    {/* Tidsspåret: `data-row` håller ◂▸ i raden, blocken är
                        absolut positionerade så motorns geometri räcker. */}
                    <div data-row="" data-testid="grid-track" style={{ display: 'flex', position: 'relative', width: gridWidth }}>
                      {entries.map(({ box, programme }) => (
                          <GridBlock
                            key={programme.start}
                            box={box}
                            programme={programme}
                            locale={locale}
                            live={isLive(programme)}
                            init={Boolean(initKey && initKey.channel === key && initKey.start === programme.start)}
                            selected={selected?.channel.url === channel.url && selected.programme.start === programme.start}
                            reminded={isReminded(channel, programme)}
                            remindLabel={isReminded(channel, programme) ? tt('removeReminder') : tt('remindMe')}
                            onSelect={() => setSelected({ channel, programme })}
                            onOk={() => {
                              setSelected({ channel, programme })
                              if (isLive(programme)) nav.play({ channel })
                              else nav.openChannel(channel, programme.start)
                            }}
                            onHold={(element) => nav.channelMenu(channel, element, [
                              { key: 'remind', label: isReminded(channel, programme) ? tt('removeReminder') : tt('remindMe'), run: () => toggle(channel, programme) },
                            ])}
                            onDoubleAct={() => {
                              setSelected({ channel, programme })
                              // Skrivbordets musgenväg (`live-tv-epg-page.tsx:270-283`):
                              // pågående program spelas, annars växlas påminnelsen.
                              if (isLive(programme)) nav.play({ channel })
                              else toggle(channel, programme)
                            }}
                          />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: dp(16), padding: `0 ${dp(48)}px`, flexShrink: 0 }}>
          {/* Skiljer "fler finns" från "det är allt med tablå". Utan den
              skillnaden läses ett tomt slut som ett tak, och man letar efter en
              gräns som inte finns — de flesta kanalerna i en stor panel har
              ingen matchad tablå. */}
          <span style={{ fontSize: dp(15), color: TV.dim }}>
            {hasMore ? tt('gridShowing', { shown: rows.length }) : tt('gridAllWithGuide', { shown: rows.length })}
          </span>
          {hasMore ? (
            <div {...station(() => setVisibleRows((count) => count + EPG_ROWS_STEP), undefined, { 'data-testid': 'grid-show-more' })} style={{ height: dp(44), padding: `0 ${dp(22)}px`, borderRadius: 999, background: TV.s10, display: 'flex', alignItems: 'center', fontSize: dp(17), cursor: 'pointer' }}>{tt('showMore')}</div>
          ) : null}
        </div>
      ) : null}

      {/* Detaljremsan för det valda (fokuserade) programmet. */}
      <div data-testid="grid-detail" style={{ margin: `${dp(12)}px ${dp(48)}px ${dp(20)}px`, padding: `${dp(12)}px ${dp(16)}px`, borderRadius: dp(14), background: TV.s06, border: `1px solid ${TV.line}`, display: 'flex', alignItems: 'center', gap: dp(16), minHeight: dp(72), flexShrink: 0 }}>
        {selected ? (
          <>
            <ChannelArt channel={selected.channel} style={{ width: dp(64), height: dp(40), flexShrink: 0 }} radius={dp(8)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.programme.title}</div>
              <div style={{ fontSize: dp(15), color: TV.dim }}>
                {selected.channel.name} · {formatClock(selected.programme.start, locale)}–{formatClock(selected.programme.stop, locale)}
              </div>
              {/* `data-selectable-text` är P2:s undantag från `user-select:
                  none` — beskrivningar är text man vill kunna markera. Noden
                  ritas alltid så undantaget finns även utan beskrivning. */}
              <div data-selectable-text="" style={{ fontSize: dp(15), color: TV.muted, marginTop: dp(2), overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {selected.programme.description ?? ''}
              </div>
            </div>
            {selected.programme.start > nowMs ? (
              <div {...station(() => toggle(selected.channel, selected.programme), undefined, { 'data-testid': 'grid-remind' })} style={{ height: dp(44), padding: `0 ${dp(18)}px`, borderRadius: 999, background: selectedReminded ? TV.accMix(22) : TV.s10, color: selectedReminded ? TV.accText : TV.text, display: 'inline-flex', alignItems: 'center', gap: dp(8), fontSize: dp(16), cursor: 'pointer' }}>
                <Icons.Bell size={dp(18)} filled={selectedReminded} />
                {selectedReminded ? tt('reminderSet') : tt('remindMe')}
              </div>
            ) : null}
            <div {...station(() => nav.play({ channel: selected.channel }), undefined, { 'data-testid': 'grid-watch' })} style={{ height: dp(44), padding: `0 ${dp(20)}px`, borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', gap: dp(8), fontSize: dp(16), fontWeight: 600, cursor: 'pointer' }}>
              <Icons.Play size={dp(16)} /> {tt('watchNow')}
            </div>
          </>
        ) : (
          <span style={{ fontSize: dp(16), color: TV.faint }}>{tt('gridHelp')}</span>
        )}
      </div>
    </div>
  )
}

/**
 * ETT block. Tre former ur geometrin (spec 4.3):
 *
 * - `marker` — smalare än `MIN_BLOCK_PX`: bara ett accentstreck, ingen
 *   padding, ingen text. `title` är enda vägen till programnamnet, och därför
 *   sätts attributet även här.
 * - `title` — bara titeln, ingen tid.
 * - `full` — titel och tid.
 *
 * Klippta kanter (`clippedStart`/`clippedEnd`) skrivs som "…" i stället för en
 * falsk start- eller sluttid: programmet fortsätter utanför fönstret.
 */
function GridBlock({ box, programme, locale, live, init, selected, reminded, remindLabel, onSelect, onOk, onHold, onDoubleAct }: {
  box: EpgBlockBox
  programme: EpgProgramme
  locale: string
  live: boolean
  init: boolean
  selected: boolean
  reminded: boolean
  remindLabel: string
  onSelect: () => void
  onOk: () => void
  onHold: (element: HTMLElement) => void
  onDoubleAct: () => void
}) {
  const times = `${box.clippedStart ? '…' : formatClock(programme.start, locale)}–${box.clippedEnd ? '…' : formatClock(programme.stop, locale)}`
  const tip = `${programme.title} ${times}${reminded ? ` · ${remindLabel}` : ''}`
  return (
    <div
      data-testid="grid-block"
      data-shape={box.shape}
      title={tip}
      {...station(onOk, onHold, { ...(init ? { 'data-init': '' } : {}) })}
      onFocus={onSelect}
      onDoubleClick={onDoubleAct}
      style={{
        position: 'absolute',
        left: box.left,
        top: 0,
        bottom: 0,
        width: box.width,
        boxSizing: 'border-box',
        // Padding ur geometrin — aldrig bredare än en tredjedel av blocket, så
        // ett smalt block inte trycks upp i minst 2 × 8 px och lägger sig över
        // grannen (regressionen ur skärmdumpen).
        padding: `${dp(6)}px ${box.paddingX}px`,
        borderRight: `1px solid ${TV.line}`,
        borderLeft: selected ? `2px solid ${TV.acc}` : undefined,
        borderRadius: box.shape === 'marker' ? 0 : dp(8),
        background: box.shape === 'marker' ? TV.acc : selected ? TV.s12 : live ? TV.accMix(16) : TV.s05,
        color: live ? TV.text : TV.muted,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {box.shape === 'marker' ? null : (
        <>
          <div style={{ fontSize: dp(15), fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: reminded ? dp(14) : 0 }}>{programme.title}</div>
          {box.shape === 'full' ? (
            <div style={{ fontSize: dp(13), color: TV.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{times}</div>
          ) : null}
          {reminded ? (
            <span style={{ position: 'absolute', right: dp(4), top: dp(4), color: TV.acc }}><Icons.Bell size={dp(12)} filled /></span>
          ) : null}
        </>
      )}
    </div>
  )
}
