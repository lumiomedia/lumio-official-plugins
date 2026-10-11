'use client'

import { useCallback, useMemo, useState, type CSSProperties, type FocusEvent } from 'react'
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

/**
 * ▾ från dag- och filterraden: flikens FÖRSTA station (överst till vänster),
 * inte den som råkar ligga närmast under chipet — från Tennis längst till
 * höger hoppade fokus förbi Välj dina lag rakt in i ett lagkort (Jerry
 * 2026-10-11). Hittas ingen faller motorn tillbaka på geometrin.
 */
const BODY_FIRST = '[data-sport-body] [data-f]'

/**
 * Fokus i rubriken (flikar, Visa som, dag- och filterraden) rullar sidan hela
 * vägen upp. Motorn rullar bara fram stationen, så efter en tur ner och upp
 * stod sidan kvar några pixlar ner och rubriken låg under menypillret
 * (Jerry 2026-10-11). Lådor och flikens innehåll rullas som förut.
 */
function revealHeaderFully(event: FocusEvent<HTMLDivElement>) {
  const target = event.target as HTMLElement
  if (target.closest('[data-sport-body], [data-panel-root]')) return
  event.currentTarget.scrollTop = 0
}

const VIEW_AS_FIRST = '[data-testid="sport-view-as"] [data-f]'

const stepBtn = (enabled: boolean) => ({ width: dp(56), height: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: enabled ? 'pointer' : 'default', color: TV.text, opacity: enabled ? 1 : 0.3, borderRadius: dp(14) }) as const

/**
 * Innehållets toppluft. `--tv-scene-chrome-inset` är värdens toppkrom
 * (snabbmeny, pill, klocka) i designpixlar och sätts bara på sportsidan
 * (menyvalet Sport): där står kromet OVANPÅ sportens bakgrund, som går upp
 * till fönstrets överkant, och bara innehållet dras in (Jerry 2026-10-11).
 * I Live TV är variabeln 0.
 */
export function sportViewPaddingTop(): string {
  return `calc(${dp(34)}px + var(--tv-scene-chrome-inset, 0px))`
}

/**
 * Rullytans topp. Skrivbordet: indraget som utfyllnad, och värdens topprad
 * tonar ut det som rullar under kromet. TV-läget har ingen uttoning — där
 * rullade rubriken rakt in under pillret — så rullytan BÖRJAR under kromet
 * (marginal) och klipper innehållet där; bakgrunden ligger utanför och når
 * ändå fönstrets överkant.
 */
export function sportViewTop(tv: boolean): CSSProperties {
  return tv
    ? { marginTop: 'var(--tv-scene-chrome-inset, 0px)', paddingTop: dp(34) }
    : { paddingTop: sportViewPaddingTop() }
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
  /* Sportsidan behåller appens toppkrom, och värdens klocka står då uppe
     till höger som på Hem — en klocka till i rubriken hade dubblerat den
     (Jerry 2026-10-11: "klockan syns inte till höger heller"). Gäller även
     TV-läget sedan värden ritar sin klocka där (app: sportsidan i TV-läget). */
  const ownClock = !standalone
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
    <div data-testid="sport-view" data-scroll="" onFocusCapture={revealHeaderFully} style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: `0 ${dp(48)}px ${dp(48)}px`, ...sportViewTop(tvMode), display: 'flex', flexDirection: 'column', gap: dp(22) }}>
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
            {...station(() => setTab(key), undefined, {
              ...(key === tab ? { 'data-init': '' } : null),
              // Visa som står långt till höger; geometrin tog filterchipsen
              // under i stället, och väljaren gick inte att nå (Jerry 2026-10-11).
              ...(key === 'follows' && tab === 'foryou' ? { 'data-f-right': VIEW_AS_FIRST } : null),
            })}
            aria-selected={key === tab ? 'true' : 'false'}
            style={{ padding: `${dp(8)}px ${dp(4)}px ${dp(12)}px`, fontSize: dp(24), fontWeight: 600, cursor: 'pointer', color: key === tab ? TV.text : TV.muted, borderBottom: `${dp(4)}px solid ${key === tab ? TV.acc : 'transparent'}`, marginBottom: -1 }}
          >
            {key === 'foryou' ? tt('sportTabForYou') : key === 'results' ? tt('sportTabResults') : tt('sportTabFollows')}
          </div>
        ))}
        {tab === 'foryou' ? (
          <div data-testid="sport-view-as" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(12), paddingBottom: dp(8) }}>
            <span style={{ fontSize: dp(18), color: TV.muted }}>{tt('sportViewAs')}</span>
            <Segment
              size="lg"
              options={[{ key: 'matchday' as const, label: tt('sportMatchday') }, { key: 'feed' as const, label: tt('sportFeed') }]}
              value={ctx.settings.view}
              onChange={(view) => setSportSettings({ view })}
              optionAttrs={(index) => (index === 0 ? { 'data-f-left': '[data-testid="sport-tab-follows"]' } : undefined)}
            />
          </div>
        ) : null}
      </div>

      <div data-row="" style={{ display: 'flex', alignItems: 'center', gap: dp(12), flexWrap: 'wrap' }}>
        <div data-testid="sport-day-stepper" style={{ height: dp(64), display: 'inline-flex', alignItems: 'center', ...sportCardStyle, overflow: 'visible', boxSizing: 'border-box', flexShrink: 0 }}>
          {/* Etiketten mellan pilarna är bred, så Tabeller-fliken snett ovanför
              låg närmare än › och höger hoppade ur raden (Jerry 2026-10-11:
              "datum går ej att välja på TV-mode"). Grannarna är uttalade. */}
          <div data-testid="sport-day-prev" {...station(() => setOffset((o) => (o > MIN_OFFSET ? ((o - 1) as DayOffset) : o)), undefined, { 'data-f-right': '[data-testid="sport-day-next"]', 'data-f-down': BODY_FIRST })} aria-label={tt('sportDayPrev')} title={tt('sportDayPrev')} aria-disabled={offset <= MIN_OFFSET ? 'true' : 'false'} style={stepBtn(offset > MIN_OFFSET)}>
            <SportIcons.Back size={dp(22)} />
          </div>
          <span data-testid="sport-day-label" style={{ minWidth: dp(170), display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center', gap: dp(10), padding: `0 ${dp(6)}px` }}>
            <span style={{ fontSize: dp(20), fontWeight: 700 }}>{dayLabel(offset)}</span>
            <span style={{ fontSize: dp(17), color: TV.muted }}>{new Date(dayStartMs(day) + 12 * 3_600_000).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </span>
          <div data-testid="sport-day-next" {...station(() => setOffset((o) => (o < MAX_OFFSET ? ((o + 1) as DayOffset) : o)), undefined, { 'data-f-left': '[data-testid="sport-day-prev"]', 'data-f-down': BODY_FIRST })} aria-label={tt('sportDayNext')} title={tt('sportDayNext')} aria-disabled={offset >= MAX_OFFSET ? 'true' : 'false'} style={stepBtn(offset < MAX_OFFSET)}>
            <SportIcons.Chevron size={dp(22)} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(6), flexWrap: 'wrap' }}>
          {(['all', ...SPORT_CHIPS.filter((k) => counts[k] > 0)] as SportFilter[]).map((k) => {
            const active = filter === k
            return (
              <div key={k} data-testid={`sport-chip-${k}`} {...station(() => setFilter(k), undefined, { 'data-f-down': BODY_FIRST })} aria-pressed={active ? 'true' : 'false'} style={{ height: dp(52), padding: `0 ${dp(18)}px`, boxSizing: 'border-box', borderRadius: dp(12), display: 'inline-flex', alignItems: 'center', gap: dp(8), cursor: 'pointer', background: active ? TV.text : 'transparent', color: active ? '#12152a' : TV.text, fontSize: dp(19), fontWeight: 700 }}>
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

      {/* Fliken innehåll; ▾ från dag- och filterraden landar på dess första station. */}
      <div data-sport-body="" style={{ display: 'contents' }}>{body()}</div>

      {open ? <SportMatchCenter ctx={ctx} match={open} onClose={() => setOpenId(null)} /> : null}
      {pickerOpen ? <FollowPicker ctx={ctx} days={[yesterdayDay.data, todayDay.data, tomorrowDay.data]} onClose={() => setPickerOpen(false)} /> : null}
    </div>
    </div>
  )
}
