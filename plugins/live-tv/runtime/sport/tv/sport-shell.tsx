'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import type { TvViewProps } from '../../tv/tv-shell'
import { TvChoicePanel } from '../../tv/tv-list-picker'
import { Chip, Segment, TV, dp, station, useTvClockNode } from '../../tv/tv-ui'
import { SPORT_CHIPS, SPORT_KINDS, type SportFilter, type SportKind, type SportMatch } from '../sport-model'
import { dayStartMs, localDayKey, shiftDay, useSportDay } from '../sport-epg'
import { setSportSettings } from '../sport-store'
import { headerSummary, sportCounts, visibleMatches } from '../sport-day-model'
import { useSportCtx } from '../sport-ctx'
import { useSportResults } from '../results-controller'
import { usePollDemand } from '../live-poller'
import { RateLineView } from './sport-score'
import { Notice } from './sport-parts'
import { SportIcon } from './sport-icons'
import { SportMatchday } from './sport-matchday'
import { SportFeed } from './sport-feed'
import { FollowPicker, SportFollows } from './sport-follows'
import { SportMatchCenter } from './sport-match-center'
import { SportPhone } from '../mobile/sport-phone'

const NO_MATCHES: SportMatch[] = []

type SportTab = 'foryou' | 'follows'
type DayOffset = -1 | 0 | 1
const OFFSETS: readonly DayOffset[] = [-1, 0, 1]

/** Sportvyn. Skrivbordet ritar samma träd i scenlådan (Live TV:s "everywhere"-modell). */
export function TvSport(props: TvViewProps) {
  return props.phone ? <SportPhone {...props} /> : <SportTv {...props} />
}

function SportTv({ model, nav }: TvViewProps) {
  const [tab, setTab] = useState<SportTab>('foryou')
  const [offset, setOffset] = useState<DayOffset>(0)
  const [filter, setFilter] = useState<SportFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [allOpen, setAllOpen] = useState(false)
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

  const { matches: mergedMatches, status } = useSportResults({ day, epg: selected.data?.matches ?? NO_MATCHES })
  const mergedDay = useMemo(() => (selected.data ? { ...selected.data, matches: mergedMatches } : null), [selected.data, mergedMatches])
  const tvMode = useTvMode()
  usePollDemand('sport-view', true)

  const counts = sportCounts(mergedDay)
  const matches = useMemo(() => visibleMatches(mergedDay, filter), [mergedDay, filter])
  const summary = headerSummary(matches, ctx.now)
  const total = SPORT_KINDS.reduce((sum, k) => sum + counts[k], 0)
  const open = useMemo(() => {
    if (!openId) return null
    return [mergedDay, todayDay.data, tomorrowDay.data].flatMap((d) => d?.matches ?? []).find((m) => m.id === openId) ?? null
  }, [openId, mergedDay, todayDay.data, tomorrowDay.data])
  const dayLabel = (o: DayOffset) => (o === -1 ? tt('sportYesterday') : o === 0 ? tt('sportToday') : tt('sportTomorrow'))

  const body = () => {
    if (selected.state === 'missing') return <Notice testId="sport-missing" text={tt('sportNeedsUpdate')} />
    if (selected.state === 'error') return <Notice testId="sport-error" text={tt('sportError')} />
    if (tab === 'follows') return <SportFollows ctx={ctx} days={[todayDay.data, tomorrowDay.data]} />
    if (selected.state === 'loading') return <Notice testId="sport-loading" text={tt('sportLoading')} />
    if (matches.length === 0) return <Notice testId="sport-empty" text={tt('sportEmptyDay')} />
    return ctx.settings.view === 'feed'
      ? <SportFeed ctx={ctx} matches={matches} days={[mergedDay, tomorrowDay.data]} />
      : <SportMatchday ctx={ctx} matches={matches} dayFrom={dayStartMs(day)} />
  }

  return (
    <div data-testid="sport-view" data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `${dp(34)}px ${dp(48)}px ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(22) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(18) }}>
        <span style={{ fontSize: dp(40), fontWeight: 600 }}>{tt('sportTitle')}</span>
        <span data-testid="sport-summary" style={{ fontSize: dp(19), color: TV.muted }}>{tt('sportSummary', { day: dayLabel(offset), count: summary.total, live: summary.live })}</span>
        <span style={{ marginLeft: 'auto' }}>{clock}</span>
      </div>
      <RateLineView status={status} tv={tvMode} />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: dp(28), borderBottom: `1px solid ${TV.s12}` }}>
        {(['foryou', 'follows'] as const).map((key) => (
          <div
            key={key}
            data-testid={`sport-tab-${key}`}
            {...station(() => setTab(key), undefined, key === tab ? { 'data-init': '' } : undefined)}
            aria-selected={key === tab ? 'true' : 'false'}
            style={{ padding: `${dp(8)}px 0 ${dp(12)}px`, fontSize: dp(24), fontWeight: 600, cursor: 'pointer', color: key === tab ? TV.text : TV.muted, borderBottom: `${dp(4)}px solid ${key === tab ? TV.acc : 'transparent'}`, marginBottom: -1 }}
          >
            {key === 'foryou' ? tt('sportTabForYou') : tt('sportTabFollows')}
          </div>
        ))}
        {tab === 'foryou' ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(12), paddingBottom: dp(8) }}>
            <span style={{ fontSize: dp(16), color: TV.dim }}>{tt('sportViewAs')}</span>
            <Segment options={[{ key: 'matchday' as const, label: tt('sportMatchday') }, { key: 'feed' as const, label: tt('sportFeed') }]} value={ctx.settings.view} onChange={(view) => setSportSettings({ view })} />
          </div>
        ) : null}
      </div>

      <div data-row="" style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
        {OFFSETS.map((o) => {
          const active = o === offset
          return (
            <div key={o} data-testid={`sport-day-${o}`} {...station(() => setOffset(o))} aria-pressed={active ? 'true' : 'false'} style={{ minWidth: dp(144), height: dp(68), padding: `0 ${dp(18)}px`, borderRadius: dp(14), display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box', background: active ? TV.text : TV.s10, color: active ? '#12152a' : TV.text, border: `1px solid ${active ? TV.text : TV.lineCard}` }}>
              <span style={{ fontSize: dp(20), fontWeight: 700 }}>{dayLabel(o)}</span>
              <span style={{ fontSize: dp(15), opacity: 0.7 }}>{new Date(dayStartMs(shiftDay(today, o)) + 12 * 3_600_000).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          )
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(10) }}>
          {SPORT_CHIPS.filter((k) => counts[k] > 0).map((k) => {
            const active = filter === k
            return (
              <div key={k} data-testid={`sport-chip-${k}`} {...station(() => setFilter(active ? 'all' : k))} aria-label={ctx.kindLabel(k)} title={ctx.kindLabel(k)} aria-pressed={active ? 'true' : 'false'} style={{ height: dp(68), minWidth: dp(68), padding: active ? `0 ${dp(18)}px` : 0, boxSizing: 'border-box', borderRadius: dp(14), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: dp(8), cursor: 'pointer', background: active ? TV.accMix(22) : TV.s10, color: active ? TV.accText : TV.text, border: `1px solid ${active ? TV.acc : TV.lineCard}`, fontSize: dp(18), fontWeight: 600 }}>
                <SportIcon kind={k} size={dp(26)} />
                {active ? ctx.kindLabel(k) : null}
              </div>
            )
          })}
          <Chip data-testid="sport-all" active={filter === 'all'} {...station(() => setAllOpen(true))}>
            {filter === 'all' ? tt('sportAll') : ctx.kindLabel(filter)} ▾
          </Chip>
        </div>
      </div>

      {body()}

      {allOpen ? (
        <TvChoicePanel
          nav={nav}
          title={tt('sportAll')}
          options={[{ key: null, label: tt('sportAll'), count: total }, ...SPORT_KINDS.filter((k) => counts[k] > 0).map((k) => ({ key: k, label: ctx.kindLabel(k), count: counts[k] }))]}
          value={filter === 'all' ? null : filter}
          onPick={(key) => setFilter((key as SportKind | null) ?? 'all')}
          onClose={() => setAllOpen(false)}
        />
      ) : null}
      {open ? <SportMatchCenter ctx={ctx} match={open} onClose={() => setOpenId(null)} /> : null}
      {pickerOpen ? <FollowPicker ctx={ctx} days={[yesterdayDay.data, todayDay.data, tomorrowDay.data]} onClose={() => setPickerOpen(false)} /> : null}
    </div>
  )
}
