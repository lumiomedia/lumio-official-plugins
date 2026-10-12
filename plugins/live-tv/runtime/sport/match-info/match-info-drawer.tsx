'use client'

import { useTvMode } from '@/lib/plugin-sdk'
import { useEffect, useRef, useState } from 'react'
import { channelKey } from '../../live-tv-data'
import { ChannelArt, TV, station } from '../../tv/tv-ui'
import { TvChannelPicker } from '../../tv/tv-channel-picker'
import { matchTitle, sourceChannel, type SportMatch } from '../sport-model'
import { followState, rankedSources, statusAt } from '../sport-day-model'
import { setOverride, toggleFollow } from '../sport-store'
import type { SportCtx } from '../sport-ctx'
import { eventSummary } from '../match-info-model'
import { SportIcons } from '../sport-icons'
import { sportDrawerStyle, sportStackedStyle } from '../surface'
import { SHEET_BG, usePhonePlatform } from '../mobile/phone-sport-sheet'
import { toggleGoalAlert } from './match-info-text'
import { leagueTargetFromMatch, teamTargetFromMatch } from '../team-model'
import { useFixtureDetail } from './use-fixture-detail'
import { BackBar, DrillRow, IconBtn, Overline, StatusPill, TeamsHeader, ellipsis, rowCard, scaleFor } from './match-info-parts'
import { EventsPage, LineupsPage, PlayerPage, VenuePage, type PickedPlayer } from './match-info-pages'

/*
  MATCHINFO (Jerrys skisser 2026-10-11): en låda med toppraden (LIVE · liga ·
  arena, följ liga, klocka, stäng), lagen med följ-pill, SE MATCHEN och
  MATCHEN med tre undersidor. Undersidorna glider in i samma låda med en
  bakåtpil, och varje nivå är ett eget lager i Bakåt-kedjan. Samma träd på
  TV, skrivbord och telefon (telefonen i full bredd med mindre skala).
*/

type Page = { kind: 'events' } | { kind: 'lineups' } | { kind: 'venue' } | { kind: 'player'; picked: PickedPlayer }
const parentOf = (p: Page): Page | null => (p.kind === 'player' ? { kind: 'lineups' } : null)

const SLIDE_CSS = '@keyframes lumio-sport-mi-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }'

export function MatchInfoDrawer({ ctx, match, onClose, phone = false }: { ctx: SportCtx; match: SportMatch; onClose: () => void; phone?: boolean }) {
  const u = scaleFor(phone, useTvMode())
  const platform = usePhonePlatform()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  // Senaste nav/onClose i refar: lagret registreras EN gång per öppning
  // (samma mönster och skäl som PickerPanel i tv-list-picker.tsx).
  const navRef = useRef(ctx.nav)
  const onCloseRef = useRef(onClose)
  useEffect(() => { navRef.current = ctx.nav; onCloseRef.current = onClose })
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState(0)
  const [page, setPage] = useState<Page | null>(null)
  const { detail, state } = useFixtureDetail(match)

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    const close = () => {
      onCloseRef.current()
      window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0)
    }
    return navRef.current.pushLayer(close)
  }, [])

  // Varje undersida är ett lager: Bakåt går en nivå upp, inte ur lådan.
  const pageKey = page ? page.kind : null
  useEffect(() => {
    if (!page) return
    const parent = parentOf(page)
    return navRef.current.pushLayer(() => setPage(parent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey])

  // Fokus till nivåns första stopp (bakåtpilen på en undersida), och upp till toppen.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const root = rootRef.current
      if (!root) return
      root.scrollTop = 0
      root.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(t)
  }, [pageKey])

  const ranked = rankedSources(match, ctx.overrides)
  const override = ctx.overrides[match.id]
  const index = Math.min(selected, Math.max(ranked.length - 1, 0))
  const chosen = ranked[index] ?? null
  const fs = followState(match, ctx.follows)
  const st = statusAt(match, ctx.now)
  const covered = match.coverage === 'full' && !!match.fixture
  const context = [match.league || ctx.kindLabel(match.kind), match.venue].filter(Boolean).join(' · ')
  const venueName = match.venue ?? detail?.fixture.venue ?? null
  const goalAlertOn = !!ctx.settings.goalAlertMatches?.[match.id]
  const summary = detail ? eventSummary(detail.events) : null
  const leagueTarget = leagueTargetFromMatch(match)

  const bell = covered && st === 'live'
    ? <IconBtn u={u} testId="mc-goal-alert" on={goalAlertOn} label={ctx.tt('sportGoalAlert')} onPress={() => toggleGoalAlert(match)}><SportIcons.Bell size={u(20)} /></IconBtn>
    : ranked.length > 0 && st !== 'finished'
      ? <IconBtn u={u} testId="mc-remind" on={ctx.isReminded(match)} label={ctx.isReminded(match) ? ctx.tt('sportReminded') : ctx.tt('sportRemindMe')} onPress={() => ctx.toggleRemind(match)}><SportIcons.Bell size={u(20)} /></IconBtn>
      : null

  const main = (
    <>
      <div data-testid="mc-top" style={{ display: 'flex', alignItems: 'center', gap: u(12) }}>
        <StatusPill u={u} match={match} ctx={ctx} />
        {/* Ligan öppnar ligasidan när källan känner den (annars finns inget att visa där). */}
        {leagueTarget.ref ? (
          <span data-testid="mc-context" {...station(() => ctx.openLeague(leagueTarget))} aria-label={ctx.tt('sportLeagueOpen', { name: match.league })} style={{ flex: 1, minWidth: 0, fontSize: u(17), color: TV.muted, cursor: 'pointer', borderRadius: u(8), ...ellipsis }}>{context}</span>
        ) : <span data-testid="mc-context" style={{ flex: 1, minWidth: 0, fontSize: u(17), color: TV.muted, ...ellipsis }}>{context}</span>}
        {match.leagueKey ? (
          <IconBtn u={u} testId="mc-follow-league" on={fs.league} label={fs.league ? ctx.tt('sportFollowingName', { name: match.league }) : ctx.tt('sportFollowName', { name: match.league })} onPress={() => toggleFollow({ sport: match.kind, kind: 'league', key: match.leagueKey, name: match.league })}>
            <SportIcons.Heart size={u(20)} filled={fs.league} />
          </IconBtn>
        ) : null}
        {bell}
        {/* Telefonens ark stängs med handtaget, scrimmen eller Bakåt (handoffen har inget kryss). */}
        {phone ? null : <IconBtn u={u} testId="mc-close" label={ctx.tt('sportClose')} onPress={onClose}><SportIcons.Close size={u(20)} /></IconBtn>}
      </div>
      <TeamsHeader u={u} match={match} ctx={ctx} onOpenTeam={(side) => { const t = teamTargetFromMatch(match, side); if (t) ctx.openTeam(t) }} />

      <Overline u={u}>{ctx.tt('sportWatchMatch')}</Overline>
      <div style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
        {ranked.map((s, i) => {
          const on = i === index
          return (
            <div key={s.channelKey} data-testid="mc-source" data-selected={on ? '1' : '0'} {...station(() => setSelected(i), undefined, i === 0 ? { 'data-init': '' } : undefined)} style={{ ...rowCard(u), display: 'flex', alignItems: 'center', gap: u(16), padding: `${u(12)}px ${u(18)}px`, cursor: 'pointer', background: on ? TV.text : rowCard(u).background, color: on ? '#12152a' : TV.text, border: `1px solid ${on ? TV.text : TV.lineCard}` }}>
              <ChannelArt channel={sourceChannel(s)} style={{ width: u(64), height: u(42), flexShrink: 0 }} radius={u(8)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: u(19), fontWeight: 700, ...ellipsis }}>{s.name}</div>
                {/* "spellista · X s fördröjning" — fördröjningen mäts inte än, så bara spellistan. */}
                <div style={{ fontSize: u(15), opacity: 0.7, ...ellipsis }}>{ctx.playlistName(s.sourceId)}</div>
              </div>
              {override && i === 0 ? <span style={{ fontSize: u(14), fontWeight: 600 }}>{ctx.tt('sportYourChoice')}</span> : null}
              {s.quality ? <span style={{ fontSize: u(16), fontWeight: 800, minWidth: u(44), textAlign: 'center' }}>{s.quality}</span> : null}
              {i === 0 && ranked.length > 1 ? <span data-testid="mc-best" style={{ fontSize: u(14), fontWeight: 800, letterSpacing: '0.08em', color: on ? '#c2410c' : TV.accText }}>{ctx.tt('sportBest')}</span> : null}
            </div>
          )
        })}
        <div data-testid="mc-pick-channel" {...station(() => setPicking(true), undefined, ranked.length === 0 ? { 'data-init': '' } : undefined)} title={ctx.tt('sportPickChannelSub')} style={{ minHeight: u(64), display: 'flex', alignItems: 'center', gap: u(12), padding: `0 ${u(18)}px`, borderRadius: u(14), border: `1px dashed ${TV.lineStrong}`, color: TV.text, cursor: 'pointer', fontSize: u(17), fontWeight: 600, boxSizing: 'border-box' }}>
          <SportIcons.Plus size={u(20)} />
          {ctx.tt('sportOtherChannel')}
        </div>
        {override ? (
          <span data-testid="mc-clear-override" {...station(() => setOverride(match.id, null))} style={{ alignSelf: 'flex-start', fontSize: u(16), color: TV.accText, cursor: 'pointer', padding: `${u(6)}px ${u(4)}px` }}>{ctx.tt('sportUseAutomatic')}</span>
        ) : null}
      </div>
      {chosen ? (
        <div data-testid="mc-watch" {...station(() => { ctx.watch(match, chosen); onClose() })} style={{ height: u(64), borderRadius: u(14), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(10), fontSize: u(20), fontWeight: 700, cursor: 'pointer' }}>
          <SportIcons.Play size={u(20)} />
          {chosen.quality ? ctx.tt('sportWatchQuality', { quality: chosen.quality }) : ctx.tt('sportWatch')}
        </div>
      ) : null}

      {state !== 'none' || venueName ? <Overline u={u}>{ctx.tt('sportTheMatch')}</Overline> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
        {state !== 'none' ? (
          <DrillRow u={u} testId="mc-row-events" icon={<SportIcons.Stats size={u(22)} />} label={ctx.tt('sportEventsStats')} value={summary ? ctx.tt('sportEventsSummary', summary) : '…'} onOpen={() => setPage({ kind: 'events' })} />
        ) : null}
        {detail && detail.lineups.length > 0 ? (
          <DrillRow u={u} testId="mc-row-lineups" icon={<SportIcons.People size={u(22)} />} label={ctx.tt('sportLineups')} value={ctx.tt('sportStartingXI')} onOpen={() => setPage({ kind: 'lineups' })} />
        ) : null}
        {venueName ? (
          <DrillRow u={u} testId="mc-row-venue" icon={<SportIcons.Pin size={u(22)} />} label={venueName} onOpen={() => setPage({ kind: 'venue' })} />
        ) : null}
      </div>
    </>
  )

  const sub = (p: Page) => {
    const back = () => setPage(parentOf(p))
    const title = p.kind === 'events' ? ctx.tt('sportEventsStats') : p.kind === 'lineups' ? ctx.tt('sportLineups') : p.kind === 'venue' ? venueName ?? '' : p.picked.player.name
    return (
      <>
        <BackBar u={u} title={title} onBack={back} label={ctx.tt('sportBack')} />
        {p.kind === 'events' || p.kind === 'lineups' ? <TeamsHeader u={u} match={match} ctx={ctx} compact /> : null}
        {p.kind === 'events' ? <EventsPage u={u} match={match} ctx={ctx} detail={detail} /> : null}
        {p.kind === 'lineups' ? <LineupsPage u={u} ctx={ctx} detail={detail} onPick={(picked) => setPage({ kind: 'player', picked })} /> : null}
        {p.kind === 'player' ? <PlayerPage u={u} match={match} ctx={ctx} detail={detail} picked={p.picked} /> : null}
        {p.kind === 'venue' ? <VenuePage u={u} ctx={ctx} name={venueName ?? ''} city={detail?.fixture.venueCity ?? null} image={match.venueImage ?? detail?.fixture.venueImage ?? null} /> : null}
      </>
    )
  }

  /*
    TELEFON: ett bottenark (handoffen "Sport på mobil"), högst 92 % av höjden,
    med plattformens hörn och handtag — samma innehåll och undersidor som
    lådan på TV och skrivbord.
  */
  const surface = phone
    ? {
        position: 'fixed', left: 0, right: 0, bottom: 0, width: '100%', maxHeight: '92%', zIndex: 60, boxSizing: 'border-box', overflowY: 'auto',
        background: SHEET_BG, borderTop: '1px solid rgba(255,255,255,0.16)', borderRadius: platform === 'ios' ? '14px 14px 0 0' : '28px 28px 0 0',
        padding: '0 16px calc(max(env(safe-area-inset-bottom, 0px), var(--android-inset-bottom, 0px)) + 24px)',
      } as const
    : { position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${u(760)}px, 100%)`, zIndex: 60, ...sportDrawerStyle, overflowY: 'auto' } as const
  return (
    <>
      <style>{SLIDE_CSS}</style>
      <div data-live-tv-layer="" aria-hidden="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 59, background: TV.scrim }} />
      <div ref={rootRef} data-testid="match-center" data-page={pageKey ?? 'main'} data-panel-root="" data-live-tv-layer="" data-scroll="" role="dialog" aria-label={matchTitle(match)}
        data-platform={phone ? platform : undefined}
        style={surface}>
        {phone ? (
          <div data-testid="mc-grabber" {...station(onClose)} aria-hidden="true" style={{ position: 'sticky', top: 0, zIndex: 1, height: 22, margin: '0 -16px 4px', display: 'grid', placeItems: 'center', background: SHEET_BG, cursor: 'pointer' }}>
            <span style={{ width: platform === 'ios' ? 36 : 32, height: 5, borderRadius: 3, background: 'rgba(243,244,248,0.35)' }} />
          </div>
        ) : null}
        <div key={pageKey ?? 'main'} data-testid="mc-level" style={{ display: 'flex', flexDirection: 'column', gap: u(18), animation: page ? 'lumio-sport-mi-in 220ms ease-out' : undefined }}>
          {page ? sub(page) : main}
        </div>
      </div>
      {picking ? (
        <TvChannelPicker
          model={ctx.model}
          nav={ctx.nav}
          surface={sportStackedStyle}
          title={ctx.tt('sportOtherChannel')}
          onPick={(channel) => {
            setOverride(match.id, { key: channelKey(channel), name: channel.name, url: channel.url, logo: channel.logo ?? null, group: channel.group, tvgId: channel.tvgId })
            setSelected(0)
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </>
  )
}
