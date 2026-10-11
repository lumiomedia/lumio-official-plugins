'use client'

import { useCallback, useMemo, useState } from 'react'
import type { TvViewProps } from '../../tv/tv-shell'
import { station } from '../../tv/tv-ui'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { MobileHeader } from '../../tv/mobile/mobile-header'
import { MobileSegment } from '../../tv/mobile/mobile-segment'
import { MobileChips } from '../../tv/mobile/mobile-chips'
import { MobileSheet } from '../../tv/mobile/mobile-sheet'
import { SPORT_KINDS, matchTitle, type SportFilter, type SportMatch } from '../sport-model'
import { localDayKey, shiftDay, useSportDay } from '../sport-epg'
import { featuredMatch, followCandidates, followState, nextMatchFor, rankedSources, sportCounts, splitSections, statusAt, visibleMatches } from '../sport-day-model'
import { isFollowing, setSportSettings, toggleFollow, type KickoffAlert } from '../sport-store'
import { SportResultsPhone } from './sport-results-phone'
import { PhoneFollowSearch } from './sport-follow-search-phone'
import { useSportBackdrop } from '../backdrop'
import { SportBackdropLayer } from '../sport-backdrop'
import { useSportResults } from '../results-controller'
import { usePollDemand } from '../live-poller'
import { matchStatusLabel, scoreText, showsScore } from '../score-model'
import { alertLabel, followNextLine, sourceLine, timeLine, useSportCtx, type SportCtx } from '../sport-ctx'
import { sportBg } from '../surface'

type DayOffset = -1 | 0 | 1
const NO_MATCHES: SportMatch[] = []

export function SportPhone({ model, nav }: TvViewProps) {
  const [tab, setTab] = useState<'foryou' | 'results' | 'follows'>('foryou')
  const [offset, setOffset] = useState<DayOffset>(0)
  const [filter, setFilter] = useState<SportFilter>('all')
  const [sheet, setSheet] = useState<SportMatch | null>(null)
  const [adding, setAdding] = useState(false)
  const openMatch = useCallback((m: SportMatch) => setSheet(m), [])
  const openFollowPicker = useCallback(() => setAdding(true), [])
  const ctx = useSportCtx({ model, nav, openMatch, openFollowPicker })
  const { tt } = ctx
  const today = localDayKey(model.nowMs)
  const day = shiftDay(today, offset)
  const selected = useSportDay(day, model.nowMs)
  const { matches: mergedMatches, allMatches, controller } = useSportResults({ day, epg: selected.data?.matches ?? NO_MATCHES })
  const mergedDay = useMemo(() => (selected.data ? { ...selected.data, matches: mergedMatches } : null), [selected.data, mergedMatches])
  usePollDemand('sport-view', true)
  const wantsFollow = tab === 'follows' || adding
  const todayDay = useSportDay(wantsFollow ? today : null, model.nowMs)
  const tomorrowDay = useSportDay(wantsFollow ? shiftDay(today, 1) : null, model.nowMs)
  const phoneHero = useMemo(() => featuredMatch(visibleMatches(mergedDay, filter), ctx.follows, ctx.now), [mergedDay, filter, ctx.follows, ctx.now])
  const backdrop = useSportBackdrop(phoneHero, filter, model.nowMs)
  const counts = sportCounts(mergedDay)
  const { live, later, finished } = splitSections(visibleMatches(mergedDay, filter), ctx.now)
  const dayLabel = (o: DayOffset) => (o === -1 ? tt('sportYesterday') : o === 0 ? tt('sportToday') : tt('sportTomorrow'))

  const sheetItems = (m: SportMatch) => {
    const fs = followState(m, ctx.follows)
    const follow = (kind: 'team' | 'league', key: string | null, name: string | null, on: boolean) =>
      key && name ? [{ key: `follow-${kind}-${key}`, label: on ? tt('sportFollowingName', { name }) : tt('sportFollowName', { name }), run: () => toggleFollow({ sport: m.kind, kind, key, name }) }] : []
    const ranked = rankedSources(m, ctx.overrides)
    return [
      ...ranked.slice(0, 4).map((s, i) => ({ key: `watch-${i}`, label: `${tt('sportWatchOn', { channel: s.name })}${s.quality ? ` · ${s.quality}` : ''}`, run: () => ctx.watch(m, s) })),
      ...follow('team', m.homeKey, m.home, fs.home),
      ...follow('team', m.awayKey, m.away, fs.away),
      ...follow('league', m.leagueKey || null, m.league || null, fs.league),
      ...(ranked.length > 0 && statusAt(m, ctx.now) !== 'finished' ? [{ key: 'remind', label: ctx.isReminded(m) ? tt('sportReminded') : tt('sportRemindMe'), run: () => ctx.toggleRemind(m) }] : []),
    ]
  }

  const notice = selected.state === 'missing' ? tt('sportNeedsUpdate') : selected.state === 'error' ? tt('sportError') : selected.state === 'loading' ? tt('sportLoading') : live.length + later.length + finished.length === 0 ? tt('sportEmptyDay') : null

  return (
    <div data-testid="sport-stage" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...backdrop.surface }}>
    <SportBackdropLayer choice={backdrop.choice} phone onBroken={backdrop.onBroken} />
    <div data-testid="sport-phone" data-scroll="" style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={tt('sportTitle')} /></div>
      <MobileSegment testId="sport-phone-tabs" options={[{ key: 'foryou', label: tt('sportTabForYou') }, { key: 'results', label: tt('sportTabResults') }, { key: 'follows', label: tt('sportTabFollows') }]} value={tab} onChange={setTab} />
      {tab !== 'follows' ? (
        <MobileChips<DayOffset> testId="sport-phone-days" items={([-1, 0, 1] as const).map((o) => ({ key: o, label: dayLabel(o), id: `day-${o}` }))} value={offset} onChange={setOffset} emphasisKey={0} />
      ) : null}
      {tab !== 'follows' ? (
        <MobileChips<SportFilter> testId="sport-phone-sports" items={[{ key: 'all', label: tt('sportAll'), id: 'all' }, ...SPORT_KINDS.filter((k) => counts[k] > 0).map((k) => ({ key: k as SportFilter, label: `${ctx.kindLabel(k)} ${counts[k]}`, id: k }))]} value={filter} onChange={setFilter} />
      ) : null}
      {tab === 'foryou' ? (
        <>
          {notice ? <div style={{ padding: '24px 4px', fontSize: 15, color: MT.muted }}>{notice}</div> : null}
          <PhoneSection ctx={ctx} title={tt('sportLiveNow')} matches={live} />
          <PhoneSection ctx={ctx} title={tt('sportLater')} matches={later} />
          <PhoneSection ctx={ctx} title={tt('sportFinished')} matches={finished} />
        </>
      ) : tab === 'results' ? (
        <SportResultsPhone matches={allMatches} controller={controller} onOpenMatch={openMatch} pushLayer={nav.pushLayer} sport={filter} kindLabel={ctx.kindLabel} />
      ) : (
        <PhoneFollows ctx={ctx} days={[todayDay.data, tomorrowDay.data]} />
      )}
      {sheet ? <MobileSheet testId="sport-phone-sheet" title={matchTitle(sheet)} subtitle={[sheet.league || ctx.kindLabel(sheet.kind), timeLine(sheet, ctx)].join(' · ')} items={sheetItems(sheet)} onClose={() => setSheet(null)} pushLayer={nav.pushLayer} /> : null}
      {adding ? (
        <MobileSheet
          testId="sport-phone-follow-sheet"
          title={tt('sportFollowAdd')}
          body={<PhoneFollowSearch sport={filter === 'all' ? 'football' : filter} />}
          items={followCandidates([todayDay.data, tomorrowDay.data]).slice(0, 60).map((c) => ({
            key: `${c.kind}:${c.key}`,
            label: `${isFollowing(ctx.follows, c) ? '★ ' : ''}${c.name} · ${ctx.kindLabel(c.sport)}`,
            run: () => toggleFollow({ sport: c.sport, kind: c.kind, key: c.key, name: c.name }),
          }))}
          onClose={() => setAdding(false)}
          pushLayer={nav.pushLayer}
        />
      ) : null}
    </div>
    </div>
  )
}

function PhoneSection({ ctx, title, matches }: { ctx: SportCtx; title: string; matches: SportMatch[] }) {
  if (matches.length === 0) return null
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
      <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
      {matches.map((m) => {
        const st = statusAt(m, ctx.now)
        return (
          <div key={m.id} data-testid="sport-phone-row" {...station(() => ctx.openMatch(m))} style={{ minHeight: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: sportBg(MT.s07), border: `1px solid ${MT.line08}`, cursor: 'pointer' }}>
            <span style={{ width: 54, flexShrink: 0, display: 'flex', flexDirection: 'column', fontSize: 13, fontWeight: 700, color: st === 'live' ? MT.live : MT.text }}>
              {showsScore(m) ? <><span style={{ fontVariantNumeric: 'tabular-nums' }}>{scoreText(m)}</span><span style={{ fontSize: 11, fontWeight: 600, color: MT.muted }}>{matchStatusLabel(m, ctx.tt) ?? ''}</span></> : st === 'live' ? ctx.tt('live') : st === 'finished' ? ctx.tt('sportEnded') : timeLine(m, ctx)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
              <div style={{ fontSize: 12.5, color: MT.muted, ...ellipsis }}>{[m.league || ctx.kindLabel(m.kind), sourceLine(m, ctx)].filter(Boolean).join(' · ')}</div>
            </div>
            {followState(m, ctx.follows).any ? <span style={{ color: '#fbbf24' }}>★</span> : null}
          </div>
        )
      })}
    </section>
  )
}

function PhoneFollows({ ctx, days }: { ctx: SportCtx; days: Parameters<typeof nextMatchFor>[1] }) {
  const alertOptions: { key: KickoffAlert; label: string }[] = [
    { key: 'off', label: ctx.tt('sportAlertOff') },
    { key: '15', label: ctx.tt('sportAlert15') },
    { key: 'kickoff', label: ctx.tt('sportAlertKickoff') },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div data-testid="sport-phone-add" {...station(ctx.openFollowPicker)} style={{ minHeight: 48, borderRadius: 14, background: MT.acc, color: MT.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{ctx.tt('sportFollowAdd')}</div>
      <div data-testid="sport-phone-alert" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, color: MT.muted }}>{`${ctx.tt('sportKickoffAlert')} · ${alertLabel(ctx)}`}</span>
        <MobileSegment options={alertOptions} value={ctx.settings.alert} onChange={(alert) => setSportSettings({ alert })} />
        <span style={{ fontSize: 12.5, color: MT.dim }}>{ctx.tt('sportAlertOnlyRunning')}</span>
      </div>
      {ctx.follows.length === 0 ? <div style={{ fontSize: 15, color: MT.muted, padding: '16px 4px' }}>{ctx.tt('sportFollowEmpty')}</div> : null}
      {ctx.follows.map((f) => {
        const next = nextMatchFor(f, days, ctx.now)
        return (
          <div key={`${f.kind}:${f.key}`} data-testid="sport-phone-follow" {...station(() => { if (next) ctx.openMatch(next) })} style={{ minHeight: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: sportBg(MT.s07), cursor: 'pointer' }}>
            <span style={{ color: '#fbbf24' }}>★</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{f.name}</div>
              <div style={{ fontSize: 12.5, color: MT.muted, ...ellipsis }}>{followNextLine(ctx, f, next)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
