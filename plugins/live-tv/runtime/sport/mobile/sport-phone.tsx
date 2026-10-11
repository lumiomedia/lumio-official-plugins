'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { TvViewProps } from '../../tv/tv-shell'
import { station } from '../../tv/tv-ui'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { MIcons } from '../../tv/mobile/mobile-icons'
import { SPORT_CHIPS, type SportFilter, type SportKind, type SportMatch } from '../sport-model'
import { dayStartMs, localDayKey, shiftDay, useSportDay } from '../sport-epg'
import { featuredMatch, followCandidates, sportCounts, visibleMatches } from '../sport-day-model'
import { isFollowing, setSportSettings, toggleFollow } from '../sport-store'
import { MatchInfoDrawer } from '../match-info/match-info-drawer'
import { useSportBackdrop } from '../backdrop'
import { SportBackdropLayer } from '../sport-backdrop'
import { useSportResults } from '../results-controller'
import { usePollDemand } from '../live-poller'
import { useSportCtx } from '../sport-ctx'
import { SportIcons } from '../sport-icons'
import { SportResultsPhone } from './sport-results-phone'
import { PhoneFollowSearch } from './sport-follow-search-phone'
import { PhoneFeed, PhoneMatchday } from './sport-overview-phone'
import { PhoneFollows } from './sport-follows-phone'
import { PHONE_SECTIONS, sectionTarget, type PhoneSection } from './phone-sport-model'
import { PhoneSportSheet, SheetRow, overline, usePhonePlatform } from './phone-sport-sheet'
import { P, PIcons, PhoneTeamCrest } from './phone-sport-parts'

/*
  SPORT PÅ TELEFON (handoffen "Live TV – Sport på mobil", 390×844).

  Sport bor i Live TV-pluginet och lägger INTE till egna bottenflikar: raden
  längst ned är skalets (MobileTabBar). Live TV-sektionerna byts från rubriken
  "Sport ▾" via ett ark; Sports undersidor är toppflikar, och Översikt har två
  vyer (Matchdag/Flöde) som sparas i Sports inställningar.
*/

type Tab = 'foryou' | 'results' | 'follows'
type DayOffset = -1 | 0 | 1
const NO_MATCHES: SportMatch[] = []

const SECTION_ICONS: Record<PhoneSection, () => ReactNode> = {
  hub: () => <PIcons.Tv size={20} />,
  guide: () => <PIcons.Calendar size={20} />,
  sport: () => <SportIcons.Ball size={20} />,
  favs: () => <MIcons.Heart size={20} />,
  multi: () => <PIcons.Grid size={20} />,
}

export function SportPhone({ model, nav, standalone = false }: TvViewProps) {
  const [tab, setTab] = useState<Tab>('foryou')
  const [offset, setOffset] = useState<DayOffset>(0)
  const [filter, setFilter] = useState<SportFilter>('all')
  const [sheet, setSheet] = useState<SportMatch | null>(null)
  const [adding, setAdding] = useState<SportKind | null>(null)
  const [sections, setSections] = useState(false)
  const platform = usePhonePlatform()
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const openMatch = useCallback((m: SportMatch) => setSheet(m), [])
  const openFollowPicker = useCallback(() => setAdding('football'), [])
  const ctx = useSportCtx({ model, nav, openMatch, openFollowPicker })
  const { tt } = ctx
  const today = localDayKey(model.nowMs)
  const day = shiftDay(today, offset)
  const selected = useSportDay(day, model.nowMs)
  const { matches: mergedMatches, allMatches, controller } = useSportResults({ day, epg: selected.data?.matches ?? NO_MATCHES })
  const mergedDay = useMemo(() => (selected.data ? { ...selected.data, matches: mergedMatches } : null), [selected.data, mergedMatches])
  usePollDemand('sport-view', true)
  const view = ctx.settings.phoneView ?? 'matchday'
  // Ny flik, vy eller dag börjar överst (rullytan delas mellan dem).
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0 }, [tab, view, offset])
  const wantsFollow = tab === 'follows' || adding !== null
  const todayDay = useSportDay(wantsFollow ? today : null, model.nowMs)
  const tomorrowDay = useSportDay(wantsFollow || (tab === 'foryou' && view === 'feed') ? shiftDay(today, 1) : null, model.nowMs)
  const counts = sportCounts(mergedDay)
  const dayMatches = useMemo(() => visibleMatches(mergedDay, filter), [mergedDay, filter])
  // Bakgrunden följer toppmatchen (den med kanal först), annars vald sport.
  const phoneHero = useMemo(() => featuredMatch(dayMatches.filter((m) => m.sources.length > 0), ctx.follows, ctx.now) ?? featuredMatch(dayMatches, ctx.follows, ctx.now), [dayMatches, ctx.follows, ctx.now])
  const backdrop = useSportBackdrop(phoneHero, filter, model.nowMs)
  // Den öppna matchen följer livedata (ställning, minut) medan arket står öppet.
  const liveSheet = sheet ? [mergedMatches, todayDay.data?.matches ?? [], tomorrowDay.data?.matches ?? []].flat().find((m) => m.id === sheet.id) ?? null : null
  const dayLabel = offset === -1 ? tt('sportYesterday') : offset === 0 ? tt('sportToday') : tt('sportTomorrow')

  const notice = selected.state === 'missing' ? tt('sportNeedsUpdate') : selected.state === 'error' ? tt('sportError') : selected.state === 'loading' ? tt('sportLoading') : dayMatches.length === 0 ? tt('sportEmptyDay') : null
  const goSection = (key: PhoneSection) => {
    setSections(false)
    const target = sectionTarget(key)
    if (target) nav.go(target)
  }

  const chips: { key: SportFilter; label: string; count: number | null }[] = [
    { key: 'all', label: tt('sportAllShort'), count: null },
    ...SPORT_CHIPS.filter((k) => counts[k] > 0).map((k) => ({ key: k as SportFilter, label: ctx.kindLabel(k), count: counts[k] })),
  ]

  return (
    <div data-testid="sport-stage" data-platform={platform} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#000', ...backdrop.surface }}>
      <SportBackdropLayer choice={backdrop.choice} phone onBroken={backdrop.onBroken} />
      <div data-testid="sport-phone" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Rubrik, flikar och filterraden står still; bara innehållet under rullar (handoffen). */}
        <div data-testid="sport-phone-head" style={{ flexShrink: 0, padding: `calc(${MT.SAFE_TOP_GUARD} + 8px) 16px 0`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Som egen sida (menyvalet Sport) är Sport ingen Live TV-sektion: bara
                rubriken, utan överrad, pil och sektionsark. */}
            {standalone ? (
              <div data-testid="sport-phone-title" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: platform === 'ios' ? 32 : 26, fontWeight: 700, lineHeight: 1.1 }}>{tt('sportTitle')}</span>
              </div>
            ) : (
              <div data-testid="sport-phone-title" {...station(() => setSections(true))} aria-label={tt('sportSwitchSection')} aria-haspopup="dialog" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.muted60 }}>{tt('liveTv')}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: platform === 'ios' ? 32 : 26, fontWeight: 700, lineHeight: 1.1 }}>
                  {tt('sportTitle')}
                  <span style={{ color: P.muted70, display: 'inline-flex' }}><MIcons.CaretDown size={18} /></span>
                </span>
              </div>
            )}
            <span style={{ flex: 1 }} />
            {tab === 'foryou' ? (
              <div data-testid="sport-phone-view" style={{ display: 'flex', padding: 3, borderRadius: 12, background: 'rgba(252,252,255,0.10)', border: `1px solid ${P.line14}` }}>
                {([['matchday', tt('sportMatchday'), <PIcons.Calendar key="c" />], ['feed', tt('sportFeed'), <PIcons.Rows key="r" />]] as const).map(([key, label, icon]) => {
                  const on = view === key
                  return (
                    <div key={key} data-testid={`sport-phone-view-${key}`} {...station(() => setSportSettings({ phoneView: key }))} aria-pressed={on ? 'true' : 'false'} aria-label={label} title={label}
                      style={{ width: 40, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', cursor: 'pointer', background: on ? P.text : 'transparent', color: on ? P.ink : P.muted80 }}>
                      {icon}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
          <div data-testid="sport-phone-tabs" data-row="" role="tablist" style={{ display: 'flex', gap: 20, borderBottom: `1px solid ${P.line12}`, overflowX: 'auto' }}>
            {(['foryou', 'results', 'follows'] as const).map((key) => (
              <div key={key} data-testid={`sport-phone-tab-${key}`} {...station(() => setTab(key))} role="tab" aria-selected={key === tab ? 'true' : 'false'}
                style={{ position: 'relative', height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', color: key === tab ? P.text : P.muted60 }}>
                {key === 'foryou' ? tt('sportTabForYou') : key === 'results' ? tt('sportTabResults') : tt('sportTabFollows')}
                {/* Understrykningen som eget element: telefonens fokusregler nollar box-shadow på stationer. */}
                {key === tab ? <span data-testid="sport-phone-tab-underline" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderRadius: 2, background: P.coral }} /> : null}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
            <div data-testid="sport-phone-days" style={{ height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', borderRadius: 10, background: 'rgba(252,252,255,0.08)', border: `1px solid ${P.line14}`, boxSizing: 'border-box' }}>
              <div data-testid="sport-day-prev" {...station(() => setOffset((o) => (o > -1 ? ((o - 1) as DayOffset) : o)))} aria-label={tt('sportDayPrev')} aria-disabled={offset <= -1 ? 'true' : 'false'} style={{ width: 32, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: offset > -1 ? 1 : 0.3 }}><MIcons.CaretLeft size={16} /></div>
              <span data-testid="sport-day-label" style={{ minWidth: 62, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{dayLabel}</span>
              <div data-testid="sport-day-next" {...station(() => setOffset((o) => (o < 1 ? ((o + 1) as DayOffset) : o)))} aria-label={tt('sportDayNext')} aria-disabled={offset >= 1 ? 'true' : 'false'} style={{ width: 32, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: offset < 1 ? 1 : 0.3 }}><MIcons.CaretRight size={16} /></div>
            </div>
            <div data-testid="sport-phone-sports" data-row="" style={{ flex: 1, minWidth: 0, display: 'flex', gap: 2, overflowX: 'auto' }}>
              {chips.map((c) => {
                const on = filter === c.key
                return (
                  <div key={c.key} data-testid={`chip-${c.key}`} {...station(() => setFilter(c.key))} aria-pressed={on ? 'true' : 'false'}
                    style={{ height: 34, flexShrink: 0, padding: '0 10px', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', background: on ? P.text : 'transparent', color: on ? P.ink : 'rgba(243,244,248,0.75)' }}>
                    {c.label}
                    {c.count != null ? <span style={{ fontSize: 11, opacity: 0.6 }}>{c.count}</span> : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div ref={bodyRef} data-testid="sport-phone-body" data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `6px 16px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {tab === 'foryou' ? (
            <>
              {notice ? <div data-testid="sport-phone-notice" style={{ borderRadius: 14, border: '1px dashed rgba(255,255,255,0.24)', padding: '28px 16px', textAlign: 'center', fontSize: 15, color: 'rgba(243,244,248,0.75)' }}>{notice}</div> : null}
              {dayMatches.length > 0
                ? view === 'feed'
                  ? <PhoneFeed ctx={ctx} matches={dayMatches} days={[mergedDay, tomorrowDay.data]} onAddTeam={() => setTab('follows')} />
                  : <PhoneMatchday ctx={ctx} matches={dayMatches} dayFrom={dayStartMs(day)} offset={offset} />
                : null}
            </>
          ) : tab === 'results' ? (
            <SportResultsPhone matches={allMatches} controller={controller} onOpenMatch={openMatch} onWatch={(m) => ctx.watch(m)} pushLayer={nav.pushLayer} sport={filter} kindLabel={ctx.kindLabel} />
          ) : (
            <PhoneFollows ctx={ctx} days={[todayDay.data, tomorrowDay.data]} onAdd={(k) => setAdding(k)} />
          )}
        </div>
      </div>

      {sheet ? <MatchInfoDrawer ctx={ctx} match={liveSheet ?? sheet} onClose={() => setSheet(null)} phone /> : null}
      {sections && !standalone ? (
        <PhoneSportSheet testId="sport-phone-sections" label={tt('sportSwitchSection')} onClose={() => setSections(false)} pushLayer={nav.pushLayer}>
          <span style={overline}>{tt('liveTv')}</span>
          {PHONE_SECTIONS.map((s) => {
            const on = s.key === 'sport'
            const Icon = SECTION_ICONS[s.key]
            return (
              <SheetRow key={s.key} testId={`sport-phone-section-${s.key}`} on={on} onPress={() => goSection(s.key)}>
                <span style={{ display: 'inline-flex' }}><Icon /></span>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{tt(s.label)}</span>
                {on ? <PIcons.Check /> : null}
              </SheetRow>
            )
          })}
        </PhoneSportSheet>
      ) : null}
      {adding ? (
        <PhoneSportSheet testId="sport-phone-follow-sheet" label={tt('sportFollowAdd')} onClose={() => setAdding(null)} pushLayer={nav.pushLayer}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>{`${tt('sportFollowAdd')} · ${ctx.kindLabel(adding)}`}</span>
          <PhoneFollowSearch sport={adding} />
          {followCandidates([todayDay.data, tomorrowDay.data]).filter((c) => c.sport === adding).slice(0, 60).map((c) => {
            const on = isFollowing(ctx.follows, c)
            return (
              <SheetRow key={`${c.kind}:${c.key}`} testId={`sport-phone-candidate-${c.key}`} on={false} height={56} onPress={() => toggleFollow({ sport: c.sport, kind: c.kind, key: c.key, name: c.name, ...(c.crest ? { crest: c.crest } : {}) })}>
                <PhoneTeamCrest name={c.name} colorKey={c.key} size={32} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, ...ellipsis }}>{c.name}</span>
                <span style={{ color: on ? P.coral : P.muted60, display: 'inline-flex' }}><MIcons.Heart size={20} filled={on} /></span>
              </SheetRow>
            )
          })}
        </PhoneSportSheet>
      ) : null}
    </div>
  )
}
