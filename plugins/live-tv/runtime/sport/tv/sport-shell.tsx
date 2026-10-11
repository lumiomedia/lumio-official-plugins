'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import type { TvViewProps } from '../../tv/tv-shell'
import { Segment, TV, dp, station, useTvClockNode } from '../../tv/tv-ui'
import { SPORT_CHIPS, type SportFilter, type SportMatch } from '../sport-model'
import { dayStartMs, localDayKey, shiftDay, useSportDay } from '../sport-epg'
import { setSportSettings } from '../sport-store'
import { featuredMatch, sportCounts, visibleMatches } from '../sport-day-model'
import { dayHeaderCounts } from '../match-info-model'
import { useSportBackdrop } from '../backdrop'
import { SportBackdropLayer } from '../sport-backdrop'
import { useSportCtx } from '../sport-ctx'
import { useSportResults } from '../results-controller'
import { usePollDemand } from '../live-poller'
import { RateLineView } from './sport-score'
import { SportResults } from './sport-results'
import { Notice } from './sport-parts'
import { SportIcons } from '../sport-icons'
import { SportMatchday } from './sport-matchday'
import { SportFeed } from './sport-feed'
import { FollowPicker, SportFollows } from './sport-follows'
import { SportMatchCenter } from './sport-match-center'
import { SportPhone } from '../mobile/sport-phone'
import { SPORT_FOCUS_CSS, sportCardStyle } from '../surface'

const NO_MATCHES: SportMatch[] = []

type SportTab = 'foryou' | 'results' | 'follows'
type DayOffset = -1 | 0 | 1
/** Dagstegaren går lika långt som dagens data räcker: igår, idag, imorgon. */
const MIN_OFFSET: DayOffset = -1
const MAX_OFFSET: DayOffset = 1

const stepBtn = (enabled: boolean) => ({ width: dp(56), height: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: enabled ? 'pointer' : 'default', color: TV.text, opacity: enabled ? 1 : 0.3, borderRadius: dp(14) }) as const

/**
 * Innehållets toppluft. `--tv-scene-chrome-inset` är värdens toppkrom
 * (snabbmeny, pill, klocka) i designpixlar och sätts bara på sportsidan
 * (menyvalet Sport) på skrivbordet: där står kromet OVANPÅ sportens
 * bakgrund, som går upp till fönstrets överkant, och bara innehållet dras in
 * (Jerry 2026-10-11). I Live TV och på TV är variabeln 0.
 */
export function sportViewPaddingTop(): string {
  return `calc(${dp(34)}px + var(--tv-scene-chrome-inset, 0px))`
}

/** Sportvyn. Skrivbordet ritar samma träd i scenlådan (Live TV:s "everywhere"-modell). */
export function TvSport(props: TvViewProps) {
  return props.phone ? <SportPhone {...props} /> : <SportTv {...props} />
}

function SportTv({ model, nav, standalone = false }: TvViewProps) {
  const [tab, setTab] = useState<SportTab>('foryou')
  const [offset, setOffset] = useState<DayOffset>(0)
  const [filter, setFilter] = useState<SportFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const openMatch = useCallback((m: SportMatch) => setOpenId(m.id), [])
  const openFollowPicker = useCallback(() => setPickerOpen(true), [])
  const ctx = useSportCtx({ model, nav, openMatch, openFollowPicker })
  const { tt, locale } = ctx
  const clock = useTvClockNode(locale)

  const today = localDayKey(model.nowMs)
  const day = shiftDay(today, offset)
  const selected = useSportDay(day, model.nowMs)
  // Fler dagar bara när en vy faktiskt behöver dem — alla är lokala och cachade.
  const wantsToday = tab === 'follows' || pickerOpen
  const todayDay = useSportDay(wantsToday ? today : null, model.nowMs)
  const tomorrowDay = useSportDay(wantsToday || ctx.settings.view === 'feed' ? shiftDay(today, 1) : null, model.nowMs)
  const yesterdayDay = useSportDay(pickerOpen ? shiftDay(today, -1) : null, model.nowMs)

  const { matches: mergedMatches, allMatches, status, controller } = useSportResults({ day, epg: selected.data?.matches ?? NO_MATCHES })
  const mergedDay = useMemo(() => (selected.data ? { ...selected.data, matches: mergedMatches } : null), [selected.data, mergedMatches])
  const tvMode = useTvMode()
  /* Sportsidan på skrivbordet behåller appens toppkrom, och värdens klocka
     står då uppe till höger som på Hem — en klocka till i rubriken hade
     dubblerat den (Jerry 2026-10-11: "klockan syns inte till höger heller"). */
  const ownClock = !standalone || tvMode
  usePollDemand('sport-view', true)

  const counts = sportCounts(mergedDay)
  const matches = useMemo(() => visibleMatches(mergedDay, filter), [mergedDay, filter])
  const hero = useMemo(() => featuredMatch(matches, ctx.follows, ctx.now), [matches, ctx.follows, ctx.now])
  const backdrop = useSportBackdrop(hero, filter, model.nowMs)
  const summary = dayHeaderCounts(matches, ctx.now)
  const open = useMemo(() => {
    if (!openId) return null
    return [mergedDay, todayDay.data, tomorrowDay.data].flatMap((d) => d?.matches ?? []).find((m) => m.id === openId) ?? null
  }, [openId, mergedDay, todayDay.data, tomorrowDay.data])
  const dayLabel = (o: DayOffset) => (o === -1 ? tt('sportYesterday') : o === 0 ? tt('sportToday') : tt('sportTomorrow'))

  const body = () => {
    if (selected.state === 'missing') return <Notice testId="sport-missing" text={tt('sportNeedsUpdate')} />
    if (selected.state === 'error') return <Notice testId="sport-error" text={tt('sportError')} />
    if (tab === 'results') return <SportResults matches={allMatches} controller={controller} onOpenMatch={ctx.openMatch} tv={tvMode} sport={filter} nav={nav} />
    if (tab === 'follows') return <SportFollows ctx={ctx} days={[todayDay.data, tomorrowDay.data]} />
    if (selected.state === 'loading') return <Notice testId="sport-loading" text={tt('sportLoading')} />
    if (matches.length === 0) return <Notice testId="sport-empty" text={tt('sportEmptyDay')} />
    return ctx.settings.view === 'feed'
      ? <SportFeed ctx={ctx} matches={matches} days={[mergedDay, tomorrowDay.data]} />
      : <SportMatchday ctx={ctx} matches={matches} dayFrom={dayStartMs(day)} />
  }

  return (
    <div data-testid="sport-stage" data-sport-stage="" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...backdrop.surface }}>
    <style>{SPORT_FOCUS_CSS}</style>
    <SportBackdropLayer choice={backdrop.choice} phone={false} onBroken={backdrop.onBroken} />
    <div data-testid="sport-view" data-scroll="" style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: `0 ${dp(48)}px ${dp(48)}px`, paddingTop: sportViewPaddingTop(), display: 'flex', flexDirection: 'column', gap: dp(22) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(18) }}>
        <span style={{ fontSize: dp(40), fontWeight: 600 }}>{tt('sportTitle')}</span>
        <span data-testid="sport-summary" style={{ fontSize: dp(19), color: TV.muted }}>{tt('sportHeaderSummary', { day: dayLabel(offset), count: summary.total, live: summary.live, mine: summary.onChannels })}</span>
        {ownClock ? <span data-testid="sport-clock" style={{ marginLeft: 'auto' }}>{clock}</span> : null}
      </div>
      <RateLineView status={status} tv={tvMode} />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: dp(28), borderBottom: `1px solid ${TV.s12}` }}>
        {(['foryou', 'results', 'follows'] as const).map((key) => (
          <div
            key={key}
            data-testid={`sport-tab-${key}`}
            {...station(() => setTab(key), undefined, key === tab ? { 'data-init': '' } : undefined)}
            aria-selected={key === tab ? 'true' : 'false'}
            style={{ padding: `${dp(8)}px ${dp(4)}px ${dp(12)}px`, fontSize: dp(24), fontWeight: 600, cursor: 'pointer', color: key === tab ? TV.text : TV.muted, borderBottom: `${dp(4)}px solid ${key === tab ? TV.acc : 'transparent'}`, marginBottom: -1 }}
          >
            {key === 'foryou' ? tt('sportTabForYou') : key === 'results' ? tt('sportTabResults') : tt('sportTabFollows')}
          </div>
        ))}
        {tab === 'foryou' ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(12), paddingBottom: dp(8) }}>
            <span style={{ fontSize: dp(16), color: TV.dim }}>{tt('sportViewAs')}</span>
            <Segment options={[{ key: 'matchday' as const, label: tt('sportMatchday') }, { key: 'feed' as const, label: tt('sportFeed') }]} value={ctx.settings.view} onChange={(view) => setSportSettings({ view })} />
          </div>
        ) : null}
      </div>

      <div data-row="" style={{ display: 'flex', alignItems: 'center', gap: dp(12), flexWrap: 'wrap' }}>
        <div data-testid="sport-day-stepper" style={{ height: dp(64), display: 'inline-flex', alignItems: 'center', ...sportCardStyle, overflow: 'visible', boxSizing: 'border-box', flexShrink: 0 }}>
          <div data-testid="sport-day-prev" {...station(() => setOffset((o) => (o > MIN_OFFSET ? ((o - 1) as DayOffset) : o)))} aria-label={tt('sportDayPrev')} title={tt('sportDayPrev')} aria-disabled={offset <= MIN_OFFSET ? 'true' : 'false'} style={stepBtn(offset > MIN_OFFSET)}>
            <SportIcons.Back size={dp(22)} />
          </div>
          <span data-testid="sport-day-label" style={{ minWidth: dp(170), display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center', gap: dp(10), padding: `0 ${dp(6)}px` }}>
            <span style={{ fontSize: dp(20), fontWeight: 700 }}>{dayLabel(offset)}</span>
            <span style={{ fontSize: dp(17), color: TV.muted }}>{new Date(dayStartMs(day) + 12 * 3_600_000).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </span>
          <div data-testid="sport-day-next" {...station(() => setOffset((o) => (o < MAX_OFFSET ? ((o + 1) as DayOffset) : o)))} aria-label={tt('sportDayNext')} title={tt('sportDayNext')} aria-disabled={offset >= MAX_OFFSET ? 'true' : 'false'} style={stepBtn(offset < MAX_OFFSET)}>
            <SportIcons.Chevron size={dp(22)} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(6), flexWrap: 'wrap' }}>
          {(['all', ...SPORT_CHIPS.filter((k) => counts[k] > 0)] as SportFilter[]).map((k) => {
            const active = filter === k
            return (
              <div key={k} data-testid={`sport-chip-${k}`} {...station(() => setFilter(k))} aria-pressed={active ? 'true' : 'false'} style={{ height: dp(52), padding: `0 ${dp(18)}px`, boxSizing: 'border-box', borderRadius: dp(12), display: 'inline-flex', alignItems: 'center', gap: dp(8), cursor: 'pointer', background: active ? TV.text : 'transparent', color: active ? '#12152a' : TV.text, fontSize: dp(19), fontWeight: 700 }}>
                {k === 'all' ? tt('sportAllShort') : ctx.kindLabel(k)}
                {k !== 'all' ? <span style={{ fontSize: dp(15), fontWeight: 600, opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>{counts[k]}</span> : null}
              </div>
            )
          })}
        </div>
      </div>
      {tab === 'follows' ? (
        <div data-testid="sport-follows-meta" style={{ display: 'flex', alignItems: 'center', gap: dp(16), fontSize: dp(18), color: TV.muted }}>
          <span>{tt('sportFollowCount', { n: ctx.follows.length })}</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: dp(8), fontSize: dp(16), color: TV.dim }}><SportIcons.Bell size={dp(18)} />{tt('sportFollowBellHint')}</span>
        </div>
      ) : null}

      {body()}

      {open ? <SportMatchCenter ctx={ctx} match={open} onClose={() => setOpenId(null)} /> : null}
      {pickerOpen ? <FollowPicker ctx={ctx} days={[yesterdayDay.data, todayDay.data, tomorrowDay.data]} onClose={() => setPickerOpen(false)} /> : null}
    </div>
    </div>
  )
}
