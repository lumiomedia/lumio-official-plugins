'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TvViewProps } from '../../tv/tv-shell'
import { station } from '../../tv/tv-ui'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { MobileHeader } from '../../tv/mobile/mobile-header'
import { MobileSegment } from '../../tv/mobile/mobile-segment'
import { MobileChips } from '../../tv/mobile/mobile-chips'
import { MobileSheet } from '../../tv/mobile/mobile-sheet'
import { SPORT_KINDS, matchTitle, sourceChannel, type SportFilter, type SportMatch } from '../sport-model'
import { formatClock, progressOf } from '../../live-tv-ui'
import { MobileLogo } from '../../tv/mobile/mobile-logo'
import { SportIcon } from '../sport-icons'
import { localDayKey, shiftDay, useSportDay } from '../sport-epg'
import { featuredMatch, followCandidates, followState, matchdayStrip, nextMatchFor, rankedSources, sportCounts, statusAt, visibleMatches } from '../sport-day-model'
import { isFollowing, setSportSettings, toggleFollow, type KickoffAlert, type SportFollow } from '../sport-store'
import { PhoneCrest, SportResultsPhone } from './sport-results-phone'
import { MIcons } from '../../tv/mobile/mobile-icons'
import { PhoneFollowSearch } from './sport-follow-search-phone'
import { useSportBackdrop } from '../backdrop'
import { SportBackdropLayer } from '../sport-backdrop'
import { useSportResults } from '../results-controller'
import { usePollDemand } from '../live-poller'
import { crestForFollow, matchStatusLabel, scoreText, showsScore } from '../score-model'
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
  const dayMatches = useMemo(() => visibleMatches(mergedDay, filter), [mergedDay, filter])
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

  const notice = selected.state === 'missing' ? tt('sportNeedsUpdate') : selected.state === 'error' ? tt('sportError') : selected.state === 'loading' ? tt('sportLoading') : dayMatches.length === 0 ? tt('sportEmptyDay') : null

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
          <PhoneMatchday ctx={ctx} matches={dayMatches} />
        </>
      ) : tab === 'results' ? (
        <SportResultsPhone matches={allMatches} controller={controller} onOpenMatch={openMatch} pushLayer={nav.pushLayer} sport={filter} kindLabel={ctx.kindLabel} />
      ) : (
        <PhoneFollows ctx={ctx} days={[todayDay.data, tomorrowDay.data]} />
      )}
      {sheet ? <MobileSheet testId="sport-phone-sheet" title={matchTitle(sheet)} subtitle={[scoreText(sheet), matchStatusLabel(sheet, ctx.tt) ?? timeLine(sheet, ctx), sheet.league || ctx.kindLabel(sheet.kind)].filter(Boolean).join(' · ')} items={sheetItems(sheet)} onClose={() => setSheet(null)} pushLayer={nav.pushLayer} /> : null}
      {adding ? (
        <MobileSheet
          testId="sport-phone-follow-sheet"
          title={tt('sportFollowAdd')}
          body={<PhoneFollowSearch sport={filter === 'all' ? 'football' : filter} />}
          items={followCandidates([todayDay.data, tomorrowDay.data]).slice(0, 60).map((c) => ({
            key: `${c.kind}:${c.key}`,
            label: `${isFollowing(ctx.follows, c) ? '\u2665\uFE0E ' : ''}${c.name} · ${ctx.kindLabel(c.sport)}`,
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

/**
  Matchdagen på telefon: EN tidsordnad lista med en nu-linje (som TV:ns
  remsa) i stället för Live nu / Senare / Avslutade. Raderna är Guide-
  brickor: kanalens logga eller sportens ikon som ankare, lagmärkena
  bredvid varandra, status · liga · kanal och förloppet som underkant.
*/
function PhoneMatchday({ ctx, matches }: { ctx: SportCtx; matches: SportMatch[] }) {
  if (matches.length === 0) return null
  const strip = matchdayStrip(matches, ctx.now)
  const nowLine = (
    <div key="now-line" data-testid="sport-phone-now" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT.acc, whiteSpace: 'nowrap' }}>{ctx.tt('gridNowAt', { time: formatClock(ctx.now, ctx.locale) })}</span>
      <span style={{ flex: 1, height: 2, borderRadius: 2, background: MT.acc }} />
    </div>
  )
  const rows = strip.items.map((m) => <PhoneMatchRow key={m.id} ctx={ctx} match={m} />)
  rows.splice(strip.nowIndex, 0, nowLine)
  return (
    <section data-testid="sport-phone-day" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
      <div style={{ fontSize: 17, fontWeight: 600 }}>{ctx.tt('sportMatches')}</div>
      {rows}
    </section>
  )
}

function PhoneMatchRow({ ctx, match: m }: { ctx: SportCtx; match: SportMatch }) {
  const st = statusAt(m, ctx.now)
  const best = rankedSources(m, ctx.overrides)[0] ?? null
  const label = matchStatusLabel(m, ctx.tt)
  const status = st === 'live' ? label ?? ctx.tt('live') : st === 'finished' ? label ?? ctx.tt('sportEnded') : label ?? formatClock(m.start, ctx.locale)
  const progress = st === 'live' ? progressOf(m.start, m.stop, ctx.now) : st === 'finished' ? 1 : 0
  return (
    <div data-testid="sport-phone-row" data-status={st} {...station(() => ctx.openMatch(m))} style={{ position: 'relative', overflow: 'hidden', minHeight: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: sportBg(MT.s07), border: `1px solid ${MT.line08}`, cursor: 'pointer' }}>
      <span data-testid="sport-phone-anchor" style={{ width: 52, height: 36, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: MT.s08, color: MT.muted }}>
        {best ? <MobileLogo channel={sourceChannel(best)} width={52} height={36} /> : <SportIcon kind={m.kind} size={22} />}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {m.home && m.away ? (
            <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              <PhoneCrest name={m.home} src={m.homeCrest} size={20} />
              <PhoneCrest name={m.away} src={m.awayCrest} size={20} />
            </span>
          ) : null}
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</span>
          {showsScore(m) ? <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{scoreText(m)}</span> : null}
        </div>
        <div style={{ fontSize: 12.5, color: MT.muted, ...ellipsis }}>
          <span data-testid="sport-phone-status" style={{ fontWeight: 600, color: st === 'live' ? MT.acc : MT.text }}>{status}</span>
          {[m.league || ctx.kindLabel(m.kind), m.resultOnly ? ctx.tt('sportResultOnly') : sourceLine(m, ctx)].filter(Boolean).map((x) => ` · ${x}`).join('')}
        </div>
      </div>
      {followState(m, ctx.follows).any ? <span data-testid="sport-phone-row-fav" style={{ color: MT.acc, display: 'inline-flex', flexShrink: 0 }}><MIcons.Heart size={16} filled /></span> : null}
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: MT.s08 }}>
        <span style={{ display: 'block', width: `${Math.round(progress * 100)}%`, height: '100%', background: st === 'finished' ? MT.s12 : MT.acc }} />
      </span>
    </div>
  )
}

function PhoneFollows({ ctx, days }: { ctx: SportCtx; days: Parameters<typeof nextMatchFor>[1] }) {
  // Som på TV: en borttagen favorit ligger kvar (dämpad) tills vyn lämnas, så ett feltryck går att ångra.
  const [shown, setShown] = useState<SportFollow[]>(ctx.follows)
  useEffect(() => {
    setShown((prev) => [...prev, ...ctx.follows.filter((f) => !prev.some((p) => p.kind === f.kind && p.key === f.key))])
  }, [ctx.follows])
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
      {shown.map((f) => {
        const on = isFollowing(ctx.follows, f)
        const next = nextMatchFor(f, days, ctx.now)
        const crest = crestForFollow(f, days.flatMap((d) => d?.matches ?? []))
        return (
          <div key={`${f.kind}:${f.key}`} data-testid="sport-phone-follow" data-following={on ? '1' : '0'} style={{ minHeight: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 6px 8px 12px', borderRadius: 14, background: sportBg(MT.s07), opacity: on ? 1 : 0.55 }}>
            <div {...station(() => { if (next) ctx.openMatch(next) })} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <PhoneCrest name={f.name} src={crest} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{f.name}</div>
                <div style={{ fontSize: 12.5, color: MT.muted, ...ellipsis }}>{followNextLine(ctx, f, next)}</div>
              </div>
            </div>
            {/* Samma hjärta som kanalernas favoriter. */}
            <div data-testid="sport-phone-follow-heart" {...station(() => toggleFollow(f))} aria-pressed={on ? 'true' : 'false'} aria-label={on ? ctx.tt('sportFollowingName', { name: f.name }) : ctx.tt('sportFollowName', { name: f.name })} style={{ width: MT.HIT, height: MT.HIT, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: on ? MT.acc : MT.text, cursor: 'pointer' }}>
              <MIcons.Heart size={20} filled={on} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
