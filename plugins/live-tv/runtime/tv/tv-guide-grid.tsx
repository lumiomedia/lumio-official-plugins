'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { startOfLocalDay } from '../live-tv-model'
import type { EpgProgramme } from '../epg/types'
import { useTvMode } from '@/lib/plugin-sdk'
import { formatClock } from '../live-tv-ui'
import { isReminded, toggleReminder } from '../reminders'
import { selectEpgRows } from '../epg-rows'
import { useSchedules } from '../hooks/useSchedules'
import { useNarrowSurface } from '../hooks/useNarrowSurface'
import { usePhoneSurface } from '../hooks/usePhoneSurface'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Chip, Icons, Segment, TV, dp, phoneHitFloor, phoneTextFloor, station } from './tv-ui'
import { useTvText } from './tv-strings'
import type { GuideMode } from './tv-settings-store'
import { FAVS_GROUP, useGuideGroups } from './tv-guide-shared'
import {
  CHANNEL_COL_PX,
  HOUR_PX,
  PX_PER_MIN,
  ROW_MIN_H_PX,
  epgRowBoxes,
  hourMarks,
  nowLinePx,
  type EpgBlockBox,
  type EpgRowEntry,
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
 * Hovring med mus fyller detaljremsan, precis som fokus gör med fjärren — men
 * BARA på en riktig pekare. `@media (hover: hover) and (pointer: fine)` är
 * samma grind som P2:s hovringsregler i `TvFocusStyle()`; en pekskärm
 * syntetiserar `pointerenter` vid tryck, och på en TV med fjärr finns ingen
 * pekare alls. Hovringen flyttar aldrig FOKUS — den skriver bara `selected`,
 * så fjärrens markör står kvar där användaren lämnade den.
 */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    setFine(query.matches)
    const onChange = () => setFine(query.matches)
    query.addEventListener?.('change', onChange)
    return () => query.removeEventListener?.('change', onChange)
  }, [])
  return fine
}

export function TvGuideGrid({ model, nav, mode, onModeChange }: TvViewProps & { mode: GuideMode; onModeChange: (mode: GuideMode) => void }) {
  const { tt, locale } = useTvText()
  const isTv = useTvMode()
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
   * Fast kanalkolumn — men bara när ytan är bred nog att ha råd med 160 px.
   *
   * Måttet är värdens, inte vårt: `tvScene()` håller golvet 1280 designpixlar
   * och gör scenen HÖGRE i stället för smalare, så en fönsterbredd säger
   * ingenting om hur trångt det faktiskt är. Värden mäter lådans verkliga
   * innehållsyta och skriver `data-tv-scene-narrow="1"` under 1024 css-px;
   * `useNarrowSurface()` läser den flaggan. På en smal yta FÖLJER kolumnen
   * med i sidoscrollen i stället för att ligga fast — annars äter den halva
   * skärmen och mindre än en timme av tablån blir kvar (samma beslut som
   * skrivbordets `CHANNEL_COL_MOBILE`, Jerry 2026-09-03).
   *
   * Ingen ref skickas in: hooken frågar dokumentet efter lådan, och
   * pluginsidan är den enda som ber om en.
   */
  const narrow = useNarrowSurface()
  const phone = usePhoneSurface()
  const finePointer = useFinePointer()
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
   * Geometrin räknas EN gång per rad och fönster, inte en gång per rendering.
   *
   * `epgRowBoxes` sorterar, löser överlapp och klipper varje program mot
   * fönstret. Anropad inne i `rows.map` hade den körts om vid varje minuttick,
   * varje fokusflytt och varje påminnelseväxling — för alla rader, inte bara
   * den som ändrades. Kartan byggs om bara när raderna eller fönstret byts.
   *
   * UPPFÖLJNING: raderna är inte fönstrade (80 åt gången, hela fönstrets
   * bredd ritas). Det är nästa steg om stora paneler känns tröga.
   */
  const entriesByChannel = useMemo(() => {
    const map = new Map<string, EpgRowEntry<EpgProgramme>[]>()
    for (const row of rows) map.set(channelKey(row.channel), epgRowBoxes(row.programmes, windowStart, windowEnd))
    return map
  }, [rows, windowStart, windowEnd])

  /**
   * Precis EN `data-init` i vyn: det pågående programmet i första raden, annars
   * den radens kanalcell. Utan rader bär kategoriraden den (se nedan).
   *
   * Kandidaterna hämtas ur radens ENTRIES och inte ur `row.programmes`: ett
   * pågående program kan ha svalts av överlappslösningen (helt inneslutet i
   * ett annat), och då pekade `data-init` på ett block som inte ritas — vyn
   * hade ingen startstation alls och fjärrkontrollen låste sig.
   */
  const initKey = useMemo(() => {
    const first = rows[0]
    if (!first) return null
    const key = channelKey(first.channel)
    const live = (entriesByChannel.get(key) ?? []).find((entry) => entry.programme.start <= nowMs && entry.programme.stop > nowMs)
    return { channel: key, start: live ? live.programme.start : null }
  }, [rows, entriesByChannel, nowMs])

  const modeOptions: { key: GuideMode; label: string }[] = [
    { key: 'now', label: tt('modeNow') },
    { key: 'tl', label: tt('modeTimeline') },
    { key: 'grid', label: tt('modeGrid') },
    { key: 'playlists', label: tt('modePlaylists') },
  ]

  const dayChip = (offset: 0 | 1, label: string) => (
    <Chip active={dayOffset === offset} {...station(() => setDayOffset(offset), undefined, { 'data-testid': `grid-day-${offset}` })} phone={phone}>{label}</Chip>
  )

  const selectedReminded = selected ? isReminded(selected.channel, selected.programme) : false

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Topprad: Idag/Imorgon, Nu och lägesväxeln */}
      <div style={{ padding: `${dp(28)}px ${dp(48)}px ${dp(16)}px`, display: 'flex', alignItems: 'center', gap: dp(12), flexShrink: 0 }}>
        {dayChip(0, tt('gridToday'))}
        {dayChip(1, tt('gridTomorrow'))}
        <Chip active={false} {...station(() => { setDayOffset(0); window.setTimeout(scrollToNow, 0) }, undefined, { 'data-testid': 'grid-jump-now' })} phone={phone}>
          {tt('gridNow')}
          <span style={{ marginLeft: dp(8), width: dp(8), height: dp(8), borderRadius: 999, border: `1.5px solid ${TV.acc}` }} />
        </Chip>
        <Segment options={modeOptions} value={mode} onChange={onModeChange} style={{ marginLeft: 'auto' }} phone={phone} />
      </div>

      {/* Kategorichips — samma rad som i standardguiden, `data-row` så motorns
          ◂▸ stannar i den i stället för att hoppa ner i rutnätet.

          Utan rader bär FÖRSTA chipet `data-init`. Tomrutan under är ren text
          och inte en station: den såg ut som en knapp (ram, `cursor:
          pointer`) men var bara ett fokusmål, och en knapp som inte ser ut att
          göra något är värre än ingen knapp. Chipsraden är alltid monterad, så
          startstationen finns i varje läge — det är den invarianten
          `tv-guide.tsx`:s "montera alltid tomnoden" egentligen skyddar. */}
      <div data-row="" style={{ padding: `0 ${dp(48)}px ${dp(16)}px`, display: 'flex', gap: dp(10), overflowX: 'auto', flexShrink: 0 }}>
        {groups.map((chip, index) => (
          <Chip
            key={chip.id}
            active={group === chip.key}
            title={chip.label}
            {...station(() => setGroup(chip.key), undefined, {
              'data-testid': `grid-chip-${chip.id}`,
              ...(rows.length === 0 && index === 0 ? { 'data-init': '' } : {}),
            })}
            phone={phone}
          >
            {chip.label}
          </Chip>
        ))}
      </div>

      <div
        data-testid="grid-empty"
        aria-hidden={rows.length > 0 ? true : undefined}
        style={{ margin: `0 ${dp(48)}px`, padding: dp(24), color: TV.dim, fontSize: dp(phoneTextFloor(19, phone)), borderRadius: dp(12), background: TV.s05, display: rows.length === 0 ? 'block' : 'none' }}
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
                <div key={mark} style={{ width: dp(HOUR_PX), flexShrink: 0, fontSize: dp(phoneTextFloor(15, phone)), color: TV.dim }}>{formatClock(mark, locale)}</div>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              {nowVisible ? (
                <div data-testid="grid-now-line" style={{ position: 'absolute', top: 0, bottom: 0, left: dp(CHANNEL_COL_PX) + nowLeft, width: 2, background: TV.acc, boxShadow: `0 0 12px ${TV.accMix(60)}`, zIndex: 2, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', top: dp(-22), left: dp(-16), fontSize: dp(phoneTextFloor(13, phone)), color: TV.accText, whiteSpace: 'nowrap' }}>{tt('gridNowAt', { time: formatClock(nowMs, locale) })}</div>
                </div>
              ) : null}
              {rows.map(({ channel }) => {
                const key = channelKey(channel)
                const entries = entriesByChannel.get(key) ?? []
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${TV.line}`, minHeight: dp(phoneHitFloor(ROW_MIN_H_PX, phone)) }}>
                    <div
                      data-testid="grid-channel"
                      title={channel.name}
                      {...station(
                        () => nav.openChannel(channel),
                        (element) => nav.channelMenu(channel, element),
                        initKey && initKey.channel === key && initKey.start === null ? { 'data-init': '' } : undefined,
                      )}
                      style={{ width: dp(CHANNEL_COL_PX), minHeight: dp(phoneHitFloor(ROW_MIN_H_PX, phone)), flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(10), paddingRight: dp(10), background: TV.bg, zIndex: 1, cursor: 'pointer', ...(narrow ? null : { position: 'sticky' as const, left: 0 }) }}
                    >
                      <ChannelArt channel={channel} style={{ width: dp(48), height: dp(30), flexShrink: 0 }} radius={dp(6)} />
                      <div style={{ minWidth: 0, fontSize: dp(phoneTextFloor(15, phone)), fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                    </div>
                    {/* Tidsspåret bär MEDVETET inget `data-row`.
                        `data-row` gör raden till en sluten ◂▸-grupp, och ▸ på
                        radens SISTA block hade då hoppat vidare till nästa
                        rads första block — tolv timmar bakåt i tid, en rad ner.
                        Utan attributet stannar markören vid radens slut, vilket
                        är vad en tablå ska göra. Listan behåller `data-scroll`
                        så motorn scrollar fokus i sikte. */}
                    <div data-testid="grid-track" style={{ display: 'flex', position: 'relative', width: gridWidth }}>
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
                            hover={finePointer}
                            phone={phone}
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
          <span style={{ fontSize: dp(phoneTextFloor(15, phone)), color: TV.dim }}>
            {hasMore ? tt('gridShowing', { shown: rows.length }) : tt('gridAllWithGuide', { shown: rows.length })}
          </span>
          {hasMore ? (
            <div {...station(() => setVisibleRows((count) => count + EPG_ROWS_STEP), undefined, { 'data-testid': 'grid-show-more' })} style={{ height: dp(phoneHitFloor(44, phone)), minHeight: dp(phoneHitFloor(44, phone)), padding: `0 ${dp(22)}px`, borderRadius: 999, background: TV.s10, display: 'flex', alignItems: 'center', fontSize: dp(phoneTextFloor(17, phone)), cursor: 'pointer' }}>{tt('showMore')}</div>
          ) : null}
        </div>
      ) : null}

      {/* Detaljremsan för det valda (fokuserade) programmet. */}
      <div data-testid="grid-detail" style={{ margin: `${dp(12)}px ${dp(48)}px ${dp(20)}px`, padding: `${dp(12)}px ${dp(16)}px`, borderRadius: dp(14), background: TV.s06, border: `1px solid ${TV.line}`, display: 'flex', alignItems: 'center', gap: dp(16), minHeight: dp(72), flexShrink: 0 }}>
        {selected ? (
          <>
            <ChannelArt channel={selected.channel} style={{ width: dp(64), height: dp(40), flexShrink: 0 }} radius={dp(8)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: dp(phoneTextFloor(19, phone)), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.programme.title}</div>
              <div style={{ fontSize: dp(phoneTextFloor(15, phone)), color: TV.dim }}>
                {selected.channel.name} · {formatClock(selected.programme.start, locale)}–{formatClock(selected.programme.stop, locale)}
              </div>
              {/* `data-selectable-text` är P2:s undantag från `user-select:
                  none` — beskrivningar är text man vill kunna markera. Noden
                  ritas alltid så undantaget finns även utan beskrivning. */}
              <div data-selectable-text="" style={{ fontSize: dp(phoneTextFloor(15, phone)), color: TV.muted, marginTop: dp(2), overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {selected.programme.description ?? ''}
              </div>
            </div>
            {selected.programme.start > nowMs ? (
              <div {...station(() => toggle(selected.channel, selected.programme), undefined, { 'data-testid': 'grid-remind' })} style={{ height: dp(phoneHitFloor(44, phone)), minHeight: dp(phoneHitFloor(44, phone)), padding: `0 ${dp(18)}px`, borderRadius: 999, background: selectedReminded ? TV.accMix(22) : TV.s10, color: selectedReminded ? TV.accText : TV.text, display: 'inline-flex', alignItems: 'center', gap: dp(8), fontSize: dp(phoneTextFloor(16, phone)), cursor: 'pointer' }}>
                <Icons.Bell size={dp(18)} filled={selectedReminded} />
                {selectedReminded ? tt('reminderSet') : tt('remindMe')}
              </div>
            ) : null}
            <div {...station(() => nav.play({ channel: selected.channel }), undefined, { 'data-testid': 'grid-watch' })} style={{ height: dp(phoneHitFloor(44, phone)), minHeight: dp(phoneHitFloor(44, phone)), padding: `0 ${dp(20)}px`, borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', gap: dp(8), fontSize: dp(phoneTextFloor(16, phone)), fontWeight: 600, cursor: 'pointer' }}>
              <Icons.Play size={dp(16)} /> {tt('watchNow')}
            </div>
          </>
        ) : isTv ? (
          // Fjärrhjälpen beskriver fjärrkontrollen — bort utanför TV-läget
          // (Jerrys återkoppling 2026-09-14), ingen ersättningstext.
          <span style={{ fontSize: dp(phoneTextFloor(16, phone)), color: TV.faint }}>{tt('gridHelp')}</span>
        ) : null}
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
function GridBlock({ box, programme, locale, live, init, selected, reminded, remindLabel, hover, phone, onSelect, onOk, onHold }: {
  box: EpgBlockBox
  programme: EpgProgramme
  locale: string
  live: boolean
  init: boolean
  selected: boolean
  reminded: boolean
  remindLabel: string
  /** Sant bara på en riktig pekare — se `useFinePointer`. */
  hover: boolean
  phone: boolean
  onSelect: () => void
  onOk: () => void
  onHold: (element: HTMLElement) => void
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
      // Musen ska fylla detaljremsan utan att klicka, precis som fjärrens
      // fokus gör. FOKUS flyttas inte — markören står kvar där fjärren
      // lämnade den. Grinden sitter i `useFinePointer`, inte här.
      onPointerEnter={hover ? onSelect : undefined}
      style={{
        position: 'absolute',
        left: box.left,
        top: 0,
        bottom: 0,
        width: box.width,
        minHeight: dp(phoneHitFloor(ROW_MIN_H_PX, phone)),
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
          <div style={{ fontSize: dp(phoneTextFloor(15, phone)), fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: reminded ? dp(14) : 0 }}>{programme.title}</div>
          {box.shape === 'full' ? (
            <div style={{ fontSize: dp(phoneTextFloor(13, phone)), color: TV.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{times}</div>
          ) : null}
          {reminded ? (
            <span style={{ position: 'absolute', right: dp(4), top: dp(4), color: TV.acc }}><Icons.Bell size={dp(12)} filled /></span>
          ) : null}
        </>
      )}
    </div>
  )
}
