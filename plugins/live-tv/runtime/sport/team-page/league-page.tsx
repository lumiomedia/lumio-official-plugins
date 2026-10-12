'use client'

import { useTvMode } from '@/lib/plugin-sdk'
import { TV, station } from '../../tv/tv-ui'
import { isFollowing, toggleFollow } from '../sport-store'
import type { SportCtx } from '../sport-ctx'
import { teamTargetFromRow, type LeagueTarget } from '../team-model'
import { IconBtn, Overline, ellipsis, rowCard, scaleFor } from '../match-info/match-info-parts'
import { SportIcon, SportIcons } from '../sport-icons'
import { FixtureRow, NOOP, PageNote, StandingsRows } from './page-parts'
import { SportPageDrawer } from './sport-page-drawer'
import { PageTabs, TabBody, usePageTab, type LeagueTab } from './page-tabs'
import { useLeaguePageData } from './use-team-page'

/*
  LIGASIDAN: hela tabellen (ett lag öppnar sin egen sida), omgångens matcher
  och resultat, och skytteligan när källan har en. Tom sektion = dold.
*/

export function LeaguePage({ ctx, target, depth, phone, onClose }: { ctx: SportCtx; target: LeagueTarget; depth: number; phone: boolean; onClose: () => void }) {
  const u = scaleFor(phone, useTvMode())
  const data = useLeaguePageData(target)
  const me = { sport: target.sport, kind: 'league' as const, key: target.key }
  const following = isFollowing(ctx.follows, me)
  // Ligan sidan till slut hittade (uppslagen när den bara fanns i tablån).
  const ref = data.ref ?? target.ref
  const round = data.round
  const nothing = data.state === 'ready' && !data.standings && !round && !data.scorers
  const available: LeagueTab[] = [...(data.standings ? ['table' as const] : []), ...(round && round.fixtures.length > 0 ? ['round' as const] : []), ...(data.scorers?.length ? ['scorers' as const] : [])]
  const [tab, setTab] = usePageTab<LeagueTab>('league', available.length ? available : ['table'])

  const headPart = (
    <>
        <div data-testid="lp-head" style={{ display: 'flex', alignItems: 'center', gap: u(16) }}>
          <span style={{ width: u(64), height: u(64), borderRadius: u(16), flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: TV.s10, color: TV.text }}><SportIcon kind={target.sport} size={u(34)} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div data-testid="lp-name" style={{ fontSize: u(30), fontWeight: 700, lineHeight: 1.15, ...ellipsis }}>{target.name}</div>
            <div style={{ fontSize: u(17), color: TV.muted, ...ellipsis }}>{ctx.kindLabel(target.sport)}</div>
          </div>
          <IconBtn u={u} testId="lp-heart" on={following} label={following ? ctx.tt('sportFollowingName', { name: target.name }) : ctx.tt('sportFollowName', { name: target.name })} onPress={() => toggleFollow({ ...me, name: target.name })}>
            <SportIcons.Heart size={u(20)} filled={following} />
          </IconBtn>
          {phone ? null : <IconBtn u={u} testId="lp-close" label={ctx.tt('sportClose')} onPress={onClose}><SportIcons.Close size={u(20)} /></IconBtn>}
        </div>
    </>
  )
  const tablePart = (
    <>
        {data.standings && ref ? (
          <section data-testid="lp-table" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <Overline u={u}>{ctx.tt('sportLeagueTable')}</Overline>
            <StandingsRows u={u} ctx={ctx} testId="lp-standings" rows={data.standings} mark={-1} onOpen={(r) => ctx.openTeam(teamTargetFromRow(target.sport, r, ref))} />
          </section>
        ) : null}
    </>
  )
  const roundPart = (
    <>
        {round && round.fixtures.length > 0 ? (
          <section data-testid="lp-round" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <Overline u={u}>{round.round != null ? ctx.tt('sportRound', { n: round.round }) : ctx.tt('sportLeagueThisWeek')}</Overline>
            {round.fixtures.map((f) => <FixtureRow key={f.id} u={u} f={f} ctx={ctx} testId="lp-fixture" title={`${f.home.name} – ${f.away.name}`} sub="" />)}
          </section>
        ) : null}
    </>
  )
  const scorersPart = (
    <>
        {data.scorers && data.scorers.length > 0 ? (
          <section data-testid="lp-scorers" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <Overline u={u}>{ctx.tt('sportLeagueScorers')}</Overline>
            {data.scorers.map((s) => (
              <div key={`${s.rank}-${s.name}`} data-testid="lp-scorer" {...station(NOOP)} style={{ ...rowCard(u), minHeight: u(56), display: 'flex', alignItems: 'center', gap: u(14), padding: `0 ${u(16)}px` }}>
                <span style={{ width: u(28), fontSize: u(16), color: TV.muted, fontVariantNumeric: 'tabular-nums' }}>{s.rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: u(18), fontWeight: 700, ...ellipsis }}>{s.name}</div>
                  <div style={{ fontSize: u(14), color: u.dim, ...ellipsis }}>{s.team}</div>
                </div>
                <span style={{ fontSize: u(17), fontWeight: 800 }}>{ctx.tt('sportLeagueGoals', { n: s.goals })}</span>
              </div>
            ))}
          </section>
        ) : null}
    </>
  )
  const notesPart = (
    <>
        {data.state === 'loading' && !data.standings ? <PageNote u={u} testId="lp-loading" text={ctx.tt('sportLeagueLoading')} /> : null}
        {data.state === 'no-key' ? <PageNote u={u} testId="lp-no-key" text={ctx.tt('sportTeamNoKey')} /> : null}
        {/* Ligan finns hos källan men tabellen saknas (t.ex. planens säsongsgräns): säg det, som Tabeller & resultat. */}
        {data.state === 'ready' && ref && !data.standings && !nothing ? <PageNote u={u} testId="lp-no-table" text={ctx.tt('sportTableEmpty')} /> : null}
        {nothing ? <PageNote u={u} testId="lp-no-data" text={ref ? ctx.tt('sportTableEmpty') : ctx.tt('sportLeagueNoData')} /> : null}
    </>
  )

  // Flikarna: tabell, omgång, skytteliga — bara de som har innehåll (Jerry 2026-10-12).
  const tabLabel: Record<LeagueTab, string> = { table: ctx.tt('sportLeagueTable'), round: round?.round != null ? ctx.tt('sportRound', { n: round.round }) : ctx.tt('sportLeagueThisWeek'), scorers: ctx.tt('sportLeagueScorers') }
  const scope = `[data-page-depth="${depth}"]`
  const head = <div data-page-depth={depth} style={{ display: 'flex', flexDirection: 'column', gap: u(12) }}>{headPart}<PageTabs u={u} scope={scope} tabs={available.map((k) => ({ key: k, label: tabLabel[k] }))} value={tab} onChange={setTab} /></div>
  return (
    <SportPageDrawer nav={ctx.nav} depth={depth} phone={phone} full={u.tv} testId="league-page" label={target.name} onClose={onClose} head={head}>
      <div data-page-depth={depth} style={{ display: 'contents' }}>
        <TabBody scope={scope} gap={u(20)}>
          {tab === 'table' ? tablePart : tab === 'round' ? roundPart : scorersPart}
          {notesPart}
        </TabBody>
      </div>
    </SportPageDrawer>
  )
}
