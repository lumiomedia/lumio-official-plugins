'use client'

import { useTvMode } from '@/lib/plugin-sdk'
import { useMemo, useState } from 'react'
import { Chip, TV, station } from '../../tv/tv-ui'
import { matchTitle, type SportMatch } from '../sport-model'
import { foldTeamKey } from '../merge'
import { rankedSources, statusAt } from '../sport-day-model'
import { followAlert, isFollowing, setFollowAlert, teamKeysMatch, toggleFollow, type KickoffAlert } from '../sport-store'
import { fixtureScoreHidden, showsScore } from '../score-model'
import { useSpoilerVersion } from '../couch/spoiler'
import { formLetters } from '../results-model'
import { sourceLine, type SportCtx } from '../sport-ctx'
import { competitionsOf, epgMatchFor, flagEmoji, formOf, liveFixture, ordinal, playedFixtures, squadGroups, standingsSlice, teamRowIndex, teamTargetFromRow, trophyGroups, upcomingFixtures, type TeamTarget } from '../team-model'
import type { TeamFixture } from '../team-providers'
import { nextAlert } from '../mobile/phone-sport-model'
import { positionLabel } from '../match-info/match-info-text'
import { IconBtn, Overline, PlayerAvatar, ellipsis, rowCard, scaleFor, type U } from '../match-info/match-info-parts'
import { Crest } from '../crest'
import { SportIcons } from '../sport-icons'
import { FixtureRow, FormLetter, NOOP, PageNote, StandingsRows, fixtureWhen } from './page-parts'
import { SportPageDrawer } from './sport-page-drawer'
import { focusAttr } from '../surface'
import { PlayerDrawer, hasPlayerDetails } from './player-drawer'
import type { SquadPlayer } from '../team-providers'
import { PageTabs, TabBody, usePageTab, type TeamTab } from './page-tabs'
import { useEpgMatches, useTeamPageData } from './use-team-page'

/*
  LAGSIDAN (Jerry 2026-10-12, "kör på ditt förslag"): rubrik med märke,
  serie och placering, följ och klocka; nu/nästa; formen; tabellen runt
  laget; kommande matcher; truppen. Varje sektion döljs när källan inte har
  något — inget felmeddelande för det som bara saknas. Samma träd på TV,
  skrivbord och telefon (mindre skala, bottenark).
*/

export function TeamPage({ ctx, target, matches, depth, phone, onClose }: { ctx: SportCtx; target: TeamTarget; matches: SportMatch[]; depth: number; phone: boolean; onClose: () => void }) {
  const u = scaleFor(phone, useTvMode())
  // Ordningstalet följer sidans språk (samma som texterna).
  const lang = ctx.locale.slice(0, 2)
  const data = useTeamPageData(target)
  const [fullTable, setFullTable] = useState(false)
  const [competition, setCompetition] = useState<string | null>(null)
  const [allMatches, setAllMatches] = useState(false)
  const [player, setPlayer] = useState<SquadPlayer | null>(null)
  /*
    Hela tabellen: fokus till lagets egen rad efter utfällningen, och sidan
    rullar dit (Jerry 2026-10-12: med fjärren gick det inte att komma ner i
    den utfällda tabellen). Raderna är fokusstopp; rullningen följer fokus.
  */
  const toggleTable = () => {
    const opening = !fullTable
    setFullTable(opening)
    if (!opening) return
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`${scope} [data-testid="tp-standings"] [data-mark="1"]`) ?? document.querySelector<HTMLElement>(`${scope} [data-testid="tp-standings"] [data-f]`)
      el?.focus({ preventScroll: true })
      el?.scrollIntoView?.({ block: 'center' })
    }, 0)
  }
  const me = { sport: target.sport, kind: 'team' as const, key: target.key }
  const following = isFollowing(ctx.follows, me)
  const follow = ctx.follows.find((f) => isFollowing([f], me)) ?? null
  const scope = `[data-page-depth="${depth}"]`

  // Lagets id hos tabellens källa (kan vara en annan källa än matchernas).
  const league = data.league ?? target.league
  const tableId = league ? (league.provider === data.provider ? data.teamId : target.ids[league.provider] ?? null) : null
  const rows = data.standings ?? []
  const rowIndex = teamRowIndex(rows, target, tableId)
  const row = rowIndex >= 0 ? rows[rowIndex] : null
  const slice = standingsSlice(rows, rowIndex)
  const leagueName = league?.name || row?.group || ''
  const position = row
    ? leagueName ? ctx.tt('sportTeamPosition', { pos: ordinal(row.rank, lang), league: leagueName, pts: row.points }) : ctx.tt('sportTeamPositionShort', { pos: ordinal(row.rank, lang), pts: row.points })
    : leagueName || ctx.kindLabel(target.sport)
  // "24 pts" hålls ihop: raden bryts före poängen, aldrig mellan talet och enheten.
  const positionText = row ? position.replace(/(\d+) (\S+)$/, '$1\u00a0$2') : position

  const upcoming = useMemo(() => upcomingFixtures(data.fixtures, ctx.now), [data.fixtures, ctx.now])
  const comps = useMemo(() => competitionsOf(data.fixtures), [data.fixtures])
  const played = useMemo(() => playedFixtures(data.fixtures), [data.fixtures])
  const allUpcoming = useMemo(() => upcomingFixtures(data.fixtures, ctx.now, 60), [data.fixtures, ctx.now])
  // Flikarna: bara de som har något att visa (Jerry 2026-10-12).
  const hasMatches = played.length + allUpcoming.length > 0
  const available: TeamTab[] = ['overview', ...(hasMatches ? ['matches' as const] : []), ...(data.squad?.length ? ['squad' as const] : []), ...(data.trophies?.length ? ['trophies' as const] : [])]
  const [tab, setTab] = usePageTab<TeamTab>('team', available)
  const epg = useEpgMatches(allUpcoming, matches, ctx.now)
  // Spoilerskyddet: en dold match står inte i formen (bokstaven avslöjar resultatet).
  const spoilers = useSpoilerVersion()
  const form = useMemo(() => formOf(data.fixtures.filter((f) => !fixtureScoreHidden(f)), target, data.teamId), [data.fixtures, target, data.teamId, spoilers])
  const letters = new Map(formLetters('WDL', ctx.tt).map((l) => [l.kind, l.letter]))

  // Nu: tablåns pågående match (bär ställningen från livepollen och kanalerna), annars källans.
  const mine = (m: SportMatch) => !m.rerun && (teamKeysMatch(target.key, m.homeKey) || teamKeysMatch(target.key, m.awayKey))
  const liveEpg = matches.find((m) => mine(m) && statusAt(m, ctx.now) === 'live') ?? null
  const liveFx = liveEpg ? null : liveFixture(data.fixtures)
  const next = upcoming[0] ?? null
  const nextEpg = next ? epgMatchFor(next, epg) : (matches.filter((m) => mine(m) && statusAt(m, ctx.now) === 'upcoming').sort((a, b) => a.start - b.start)[0] ?? null)

  const alert = follow ? followAlert(follow, ctx.settings.alert) : ctx.settings.alert
  const alertText = (a: KickoffAlert) => (a === 'off' ? ctx.tt('sportAlertOff') : a === '15' ? ctx.tt('sportAlert15') : ctx.tt('sportAlertKickoff'))
  const cycleAlert = () => {
    if (!follow) return
    const n = nextAlert(alert)
    setFollowAlert(follow, n)
    ctx.nav.toast(ctx.tt('sportAlertFor', { name: target.name, rule: alertText(n).toLocaleLowerCase(ctx.locale) }))
  }
  const toggle = () => toggleFollow({ ...me, name: target.name, ...(target.ids && Object.keys(target.ids).length ? { providerIds: target.ids as Record<string, string> } : {}), ...(target.crest ?? data.crest ? { crest: (target.crest ?? data.crest)! } : {}) })
  // Tablåns liganyckel när ligan finns i dagens matcher (samma post som Följer känner), annars källans.
  const leagueKey = league ? matches.find((m) => m.fixture?.provider === league.provider && m.fixture.leagueId === league.id && m.leagueKey)?.leagueKey ?? `fx:${league.provider}:${league.id}` : ''
  const openLeague = league ? () => ctx.openLeague({ sport: target.sport, name: leagueName || league.name, key: leagueKey, ref: { ...league, name: leagueName || league.name } }) : null

  const watch = (m: SportMatch) => { ctx.watch(m); onClose() }
  // "mot AIK", som Mina lag skriver nästa match.
  const vs = (f: TeamFixture) => {
    const home = (data.teamId && f.home.id === data.teamId) || teamKeysMatch(target.key, foldTeamKey(f.home.name))
    return ctx.tt('sportVs', { opponent: home ? f.away.name : f.home.name })
  }

  const headerIds = { heart: 'tp-heart', bell: 'tp-bell', close: 'tp-close', league: 'tp-league' }
  const sel = (id: string) => `${scope} [data-testid="${id}"]`
  const nothing = data.state === 'ready' && data.fixtures.length === 0 && !data.standings && !data.squad

  const headPart = (
    <>
        <div data-testid="tp-head" style={{ display: 'flex', alignItems: 'center', gap: u(16) }}>
          <Crest name={target.name} colorKey={target.key} src={target.crest ?? data.crest} size={u(76)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div data-testid="tp-name" style={{ fontSize: u(30), fontWeight: 700, lineHeight: 1.15, ...ellipsis }}>{target.name}</div>
            {openLeague ? (
              <div data-testid={headerIds.league} {...station(openLeague, undefined, { 'data-f-right': sel(headerIds.heart) })} aria-label={ctx.tt('sportLeagueOpen', { name: leagueName })}
                style={{ display: 'block', maxWidth: '100%', fontSize: u(17), color: TV.muted, cursor: 'pointer', borderRadius: u(8), padding: `${u(2)}px ${u(4)}px`, margin: `0 -${u(4)}px`, ...(phone || u.tv ? null : ellipsis) }}>
                {/* Hela bredden åt raden; pilen står i texten. Telefonen och TV:n bryter hellre än att klippa. */}
                <span data-testid="tp-position">{positionText}</span>
                <span aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: u(6) }}><SportIcons.Chevron size={u(16)} /></span>
              </div>
            ) : <div data-testid="tp-position" style={{ fontSize: u(17), color: TV.muted, ...(phone || u.tv ? null : ellipsis) }}>{positionText}</div>}
          </div>
          <IconBtn u={u} testId={headerIds.heart} on={following} label={following ? ctx.tt('sportFollowingName', { name: target.name }) : ctx.tt('sportFollowName', { name: target.name })} onPress={toggle}>
            <SportIcons.Heart size={u(20)} filled={following} />
          </IconBtn>
          {follow ? (
            <IconBtn u={u} testId={headerIds.bell} on={alert !== 'off'} label={`${ctx.tt('sportTeamAlert', { name: target.name })}: ${alertText(alert)}`} onPress={cycleAlert}>
              <SportIcons.Bell size={u(20)} />
            </IconBtn>
          ) : null}
          {phone ? null : <IconBtn u={u} testId={headerIds.close} label={ctx.tt('sportClose')} onPress={onClose}><SportIcons.Close size={u(20)} /></IconBtn>}
        </div>
        {follow && alert !== 'off' ? <div data-testid="tp-alert-rule" style={{ fontSize: u(15), color: u.dim, marginTop: -u(8) }}>{`${ctx.tt('sportKickoffAlert')}: ${alertText(alert)}`}</div> : null}
    </>
  )
  const infoPart = (
    <>
        {/* Klubbens fakta när källan har dem (land med flagga, stad, tränare, arena, grundad). */}
        {data.info && (data.info.country || data.info.city || data.info.coach || data.info.stadium || data.info.founded) ? (
          <div data-testid="tp-info" {...station(NOOP)} style={{ ...rowCard(u), display: 'grid', gridTemplateColumns: phone ? 'minmax(0,1fr) minmax(0,1fr)' : `repeat(auto-fit, minmax(${u(150)}px, 1fr))`, gap: `${u(10)}px ${u(16)}px`, padding: `${u(12)}px ${u(16)}px` }}>
            {([
              data.info.country ? [null, `${flagEmoji(data.info.geo)} ${data.info.country}`.trim()] : null,
              data.info.city ? [ctx.tt('sportTeamCity'), data.info.city] : null,
              data.info.coach ? [ctx.tt('sportTeamCoach'), data.info.coach] : null,
              data.info.stadium ? [ctx.tt('sportTeamStadium'), data.info.stadium] : null,
              data.info.founded ? [ctx.tt('sportTeamFounded'), String(data.info.founded)] : null,
            ].filter(Boolean) as Array<[string | null, string]>).map(([label, value]) => (
              <div key={`${label}-${value}`} data-testid="tp-fact" style={{ minWidth: 0 }}>
                {label ? <div style={{ fontSize: u(13), fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: u.dim }}>{label}</div> : null}
                <div style={{ fontSize: u(17), fontWeight: 600, ...ellipsis }}>{value}</div>
              </div>
            ))}
          </div>
        ) : null}
    </>
  )
  const nowNextPart = (
    <>
        {/* 2. Nu / nästa */}
        {liveEpg || liveFx ? (
          <section data-testid="tp-now" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <Overline u={u}>{ctx.tt('sportTeamNow')}</Overline>
            <NowCard u={u} ctx={ctx} match={liveEpg} fixture={liveFx} title={liveEpg ? matchTitle(liveEpg) : `${liveFx!.home.name} – ${liveFx!.away.name}`} onWatch={liveEpg && rankedSources(liveEpg, ctx.overrides).length > 0 ? () => watch(liveEpg) : null} />
          </section>
        ) : next || nextEpg ? (
          <section data-testid="tp-next" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <Overline u={u}>{ctx.tt('sportTeamNext')}</Overline>
            <NextCard u={u} ctx={ctx} fixture={next} match={nextEpg} title={next ? vs(next) : matchTitle(nextEpg!)} competition={next?.league.name ?? nextEpg?.league ?? ''} />
          </section>
        ) : null}
    </>
  )
  const formPart = (
    <>
        {/* 3. Formen */}
        {form.length > 0 ? (
          <section data-testid="tp-form" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: u(12) }}>
              <Overline u={u}>{ctx.tt('sportTeamForm')}</Overline>
              <span aria-hidden="true" style={{ display: 'inline-flex', gap: u(4) }}>{[...form].reverse().map((f, i) => <FormLetter key={i} u={u} kind={f.result} letter={letters.get(f.result) ?? f.result} size={22} />)}</span>
            </div>
            {form.map((f) => (
              <div key={f.fixture.id} data-testid="tp-form-row" data-result={f.result} {...station(NOOP)} style={{ ...rowCard(u), minHeight: u(60), display: 'flex', alignItems: 'center', gap: u(14), padding: `${u(8)}px ${u(16)}px` }}>
                <FormLetter u={u} kind={f.result} letter={letters.get(f.result) ?? f.result} />
                <Crest name={f.opponent} colorKey={f.opponent} src={f.opponentCrest} size={u(30)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: u(18), fontWeight: 700, ...ellipsis }}>{f.opponent}</div>
                  <div style={{ fontSize: u(14), color: u.dim, ...ellipsis }}>{[f.home ? ctx.tt('sportTeamHome') : ctx.tt('sportTeamAway'), f.fixture.league.name, fixtureWhen({ kickoff: f.fixture.kickoff, dateOnly: true }, ctx)].filter(Boolean).join(' · ')}</div>
                </div>
                <span style={{ fontSize: u(20), fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{f.score}</span>
              </div>
            ))}
          </section>
        ) : null}
    </>
  )
  const tablePart = (
    <>
        {/* 4. Tabellen runt laget */}
        {slice.rows.length > 0 && league ? (
          <section data-testid="tp-table" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <Overline u={u}>{leagueName ? `${ctx.tt('sportTeamTable')} · ${leagueName}` : ctx.tt('sportTeamTable')}</Overline>
            <StandingsRows u={u} ctx={ctx} testId="tp-standings" rows={fullTable ? slice.group : slice.rows} mark={fullTable ? slice.group.indexOf(row!) : slice.teamIndex}
              onOpen={(r) => { if (r !== row) ctx.openTeam(teamTargetFromRow(target.sport, r, league)) }} />
            {slice.group.length > slice.rows.length ? (
              <div data-testid="tp-table-toggle" {...station(toggleTable)} aria-expanded={fullTable ? 'true' : 'false'} style={{ alignSelf: 'flex-start', fontSize: u(16), fontWeight: 600, color: TV.accText, cursor: 'pointer', padding: `${u(6)}px ${u(4)}px` }}>
                {fullTable ? ctx.tt('sportTeamShortTable') : ctx.tt('sportTeamFullTable')}
              </div>
            ) : null}
          </section>
        ) : null}
    </>
  )
  const matchesPart = (
    <>
        {/* 5. Matcher: kommande och spelade i alla turneringar, filtrerbara per turnering. */}
        {(() => {
          const inComp = (f: TeamFixture) => !competition || f.league.name === competition
          const skipNext = !(liveEpg || liveFx) && next ? next.id : null
          const coming = allUpcoming.filter((f) => f.id !== skipNext && inComp(f))
          const done = played.filter(inComp)
          if (coming.length + done.length === 0 && !competition) return null
          const LIMIT = 6
          const shownComing = allMatches ? coming : coming.slice(0, LIMIT)
          const shownDone = allMatches ? done : done.slice(0, LIMIT)
          const hidden = coming.length + done.length - shownComing.length - shownDone.length
          return (
            <section data-testid="tp-matches" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
              <Overline u={u}>{ctx.tt('sportTeamMatches')}</Overline>
              {comps.length > 1 ? (
                <div data-testid="tp-comp-chips" data-row="" style={{ display: 'flex', gap: u(8), flexWrap: phone ? 'nowrap' : 'wrap', overflowX: phone ? 'auto' : undefined }}>
                  {[null, ...comps].map((c) => (
                    <Chip key={c ?? '__all'} data-testid={`tp-comp-${c ?? 'all'}`} active={competition === c} aria-pressed={competition === c ? 'true' : 'false'} {...station(() => setCompetition(c))} style={{ height: u(44), minHeight: u(44), fontSize: u(16), padding: `0 ${u(16)}px`, flexShrink: 0 }}>{c ?? ctx.tt('sportAllShort')}</Chip>
                  ))}
                </div>
              ) : null}
              {shownComing.length > 0 ? <span style={{ fontSize: u(15), fontWeight: 600, color: TV.muted }}>{ctx.tt('sportTeamUpcoming')}</span> : null}
              {shownComing.map((f) => {
                const m = epgMatchFor(f, epg)
                const has = !!m && rankedSources(m, ctx.overrides).length > 0
                const channel = has ? sourceLine(m!, ctx) : ctx.tt('sportTeamNotOnChannels')
                // Bara datum från källan: tablåns avspark ger klockslaget när matchen finns där.
                const shown = f.dateOnly && m ? { ...f, kickoff: m.start, dateOnly: false } : f
                return <FixtureRow key={f.id} u={u} f={shown} ctx={ctx} testId="tp-upcoming-row" title={vs(f)} sub={[f.league.name, channel].filter(Boolean).join(' · ')} reminded={has ? ctx.isReminded(m!) : null} onPress={has ? () => ctx.toggleRemind(m!) : undefined} />
              })}
              {shownDone.length > 0 ? <span style={{ fontSize: u(15), fontWeight: 600, color: TV.muted }}>{ctx.tt('sportTeamPlayed')}</span> : null}
              {shownDone.map((f) => <FixtureRow key={f.id} u={u} f={{ ...f, dateOnly: true }} ctx={ctx} testId="tp-played-row" title={`${f.home.name} – ${f.away.name}`} sub={f.league.name} />)}
              {hidden > 0 ? (
                <div data-testid="tp-matches-all" {...station(() => setAllMatches(true))} style={{ alignSelf: 'flex-start', fontSize: u(16), fontWeight: 600, color: TV.accText, cursor: 'pointer', padding: `${u(6)}px ${u(4)}px` }}>{ctx.tt('sportTeamShowAll', { n: coming.length + done.length })}</div>
              ) : null}
            </section>
          )
        })()}
    </>
  )
  const squadPart = (
    <>
        {/* 6. Truppen */}
        {data.squad && data.squad.length > 0 ? (
          <section data-testid="tp-squad" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <Overline u={u}>{ctx.tt('sportTeamSquad')}</Overline>
            {squadGroups(data.squad).map((g) => (
              <div key={g.group} data-testid={`tp-squad-${g.group}`} style={{ display: 'flex', flexDirection: 'column', gap: u(8) }}>
                <span style={{ fontSize: u(15), fontWeight: 600, color: TV.muted }}>{positionLabel(g.group, ctx.tt)}</span>
                <div data-grid="" style={{ display: 'grid', gridTemplateColumns: phone ? 'minmax(0,1fr)' : u.tv ? 'repeat(3, minmax(0,1fr))' : 'minmax(0,1fr) minmax(0,1fr)', gap: u(8) }}>
                  {g.players.map((p) => (
                    <div key={`${p.number ?? ''}-${p.name}`} data-testid="tp-player" data-injured={p.injury ? '1' : '0'} data-details={hasPlayerDetails(p) ? '1' : '0'}
                      // Bara spelare med något mer att visa öppnar ett kort; de andra är inga fokusstopp (inga återvändsgränder på TV).
                      {...(hasPlayerDetails(p) ? { ...station(() => setPlayer(p)), 'aria-label': ctx.tt('sportPlayerOpen', { name: p.name }) } : {})}
                      style={{ ...rowCard(u), display: 'flex', alignItems: 'center', gap: u(12), padding: `${u(8)}px ${u(12)}px`, minWidth: 0, cursor: hasPlayerDetails(p) ? 'pointer' : 'default' }}>
                      <PlayerAvatar u={u} name={p.name} photo={p.photo} />
                      <span style={{ width: u(30), flexShrink: 0, fontSize: u(17), fontWeight: 800, color: TV.muted, fontVariantNumeric: 'tabular-nums' }}>{p.number ?? ''}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: u(17), fontWeight: 700, ...ellipsis }}>{p.name}</div>
                        {p.injury ? <div data-testid="tp-injury" style={{ fontSize: u(14), color: '#f87171', ...ellipsis }}>{`${ctx.tt('sportTeamInjured')} · ${p.injury}`}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : null}
    </>
  )
  const trophiesPart = (
    <>
        {/* 7. Titlar */}
        {data.trophies && data.trophies.length > 0 ? (
          <section data-testid="tp-trophies" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
            <Overline u={u}>{ctx.tt('sportTeamTrophies')}</Overline>
            {trophyGroups(data.trophies).map((g) => (
              <div key={g.name} data-testid="tp-trophy" {...station(NOOP)} style={{ ...rowCard(u), minHeight: u(56), display: 'flex', alignItems: 'center', gap: u(14), padding: `${u(8)}px ${u(16)}px` }}>
                <span style={{ fontSize: u(20), fontWeight: 800, color: TV.accText, minWidth: u(44), fontVariantNumeric: 'tabular-nums' }}>{`×${g.count}`}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: u(17), fontWeight: 700, ...ellipsis }}>{g.name}</div>
                  {/* De åtta senaste åren och "+N" för resten — aldrig en klippt lista. */}
                  {g.years.length > 0 ? <div data-testid="tp-trophy-years" style={{ fontSize: u(14), color: u.dim }}>{g.years.length > 8 ? `${g.years.slice(0, 8).join(', ')} +${g.years.length - 8}` : g.years.join(', ')}</div> : null}
                </div>
              </div>
            ))}
          </section>
        ) : null}
    </>
  )
  const notesPart = (
    <>
        {data.state === 'loading' && data.fixtures.length === 0 ? <PageNote u={u} testId="tp-loading" text={ctx.tt('sportTeamLoading')} /> : null}
        {data.state === 'no-key' ? <PageNote u={u} testId="tp-no-key" text={ctx.tt('sportTeamNoKey')} /> : null}
        {nothing ? <PageNote u={u} testId="tp-no-data" text={ctx.tt('sportTeamNoData')} /> : null}
    </>
  )

  const tabLabel: Record<TeamTab, string> = { overview: ctx.tt('sportTabForYou'), matches: ctx.tt('sportTeamMatches'), squad: ctx.tt('sportTeamSquad'), trophies: ctx.tt('sportTeamTrophies') }
  const tabsNode = <PageTabs u={u} scope={scope} tabs={available.map((k) => ({ key: k, label: tabLabel[k] }))} value={tab} onChange={setTab} />
  // TV: Översikten i två kolumner (fakta, nästa match, form | tabellen).
  const overview = u.tv
    ? (
      <div data-testid="tp-columns" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: u(32), alignItems: 'start' }}>
        <div data-col="left" style={{ display: 'flex', flexDirection: 'column', gap: u(20), minWidth: 0 }}>{infoPart}{nowNextPart}{formPart}</div>
        <div data-col="right" style={{ display: 'flex', flexDirection: 'column', gap: u(20), minWidth: 0 }}>{tablePart}</div>
      </div>
    )
    : <>{infoPart}{nowNextPart}{formPart}{tablePart}</>
  const body = (
    <TabBody scope={scope} gap={u(20)}>
      {tab === 'overview' ? overview : tab === 'matches' ? matchesPart : tab === 'squad' ? squadPart : trophiesPart}
      {notesPart}
    </TabBody>
  )
  const head = <div data-page-depth={depth} style={{ display: 'flex', flexDirection: 'column', gap: u(12) }}>{headPart}{tabsNode}</div>
  return (
    <SportPageDrawer nav={ctx.nav} depth={depth} phone={phone} full={u.tv} testId="team-page" label={target.name} onClose={onClose} head={head}>
      <div data-page-depth={depth} style={{ display: 'contents' }}>{body}</div>
      {player ? <PlayerDrawer u={u} ctx={ctx} player={player} teamName={target.name} depth={depth + 1} phone={phone} onClose={() => setPlayer(null)} /> : null}
    </SportPageDrawer>
  )
}

/** Pågående match: ställning och minut, och Titta (bästa kanalen, som i matchinfon). Titta är sidans första fokus. */
function NowCard({ u, ctx, match, fixture, title, onWatch }: { u: U; ctx: SportCtx; match: SportMatch | null; fixture: TeamFixture | null; title: string; onWatch: (() => void) | null }) {
  const score = match ? (showsScore(match) && match.score ? `${match.score.home}–${match.score.away}` : null) : fixture?.score && !fixtureScoreHidden(fixture) ? `${fixture.score.home}–${fixture.score.away}` : null
  const minute = match?.minute ?? fixture?.minute ?? null
  return (
    <div data-testid="tp-now-card" style={{ ...rowCard(u), display: 'flex', flexDirection: 'column', gap: u(12), padding: `${u(14)}px ${u(18)}px`, border: `1px solid ${TV.live}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: u(14) }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: u(6), height: u(28), padding: `0 ${u(10)}px`, borderRadius: u(8), background: TV.live, fontSize: u(14), fontWeight: 800, letterSpacing: '0.06em' }}>
          {ctx.tt('sportLiveShort')}{minute != null ? ` ${minute}'` : ''}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: u(20), fontWeight: 700, ...ellipsis }}>{title}</span>
        {score ? <span data-testid="tp-now-score" style={{ fontSize: u(30), fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{score}</span> : null}
      </div>
      {onWatch && match ? (
        <div data-testid="tp-watch" {...station(onWatch, undefined, { 'data-init': '', ...focusAttr('on-accent') })} style={{ height: u(60), borderRadius: u(14), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(10), fontSize: u(19), fontWeight: 700, cursor: 'pointer' }}>
          <SportIcons.Play size={u(20)} />
          {`${ctx.tt('sportWatch')} · ${sourceLine(match, ctx)}`}
        </div>
      ) : null}
    </div>
  )
}

/** Nästa match: när, mot vem, turneringen; kanalen och Påminn mig när den går på användarens kanaler. */
function NextCard({ u, ctx, fixture, match, title, competition }: { u: U; ctx: SportCtx; fixture: TeamFixture | null; match: SportMatch | null; title: string; competition: string }) {
  const has = !!match && rankedSources(match, ctx.overrides).length > 0
  const reminded = has ? ctx.isReminded(match!) : false
  const when = fixture ? fixtureWhen(fixture, ctx) : match ? fixtureWhen({ kickoff: match.start }, ctx) : ''
  return (
    <div data-testid="tp-next-card" style={{ ...rowCard(u), display: 'flex', flexDirection: 'column', gap: u(12), padding: `${u(14)}px ${u(18)}px` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: u(12) }}>
        <span data-testid="tp-next-when" style={{ fontSize: u(20), fontWeight: 800, color: TV.accText, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{when}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: u(20), fontWeight: 700, ...ellipsis }}>{title}</span>
      </div>
      <div style={{ fontSize: u(16), color: TV.muted, ...ellipsis }}>{[competition, has ? sourceLine(match!, ctx) : ctx.tt('sportTeamNotOnChannels')].filter(Boolean).join(' · ')}</div>
      {has ? (
        <div data-testid="tp-remind" {...station(() => ctx.toggleRemind(match!), undefined, { 'data-init': '' })} aria-pressed={reminded ? 'true' : 'false'}
          style={{ height: u(56), borderRadius: u(14), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(10), fontSize: u(18), fontWeight: 700, cursor: 'pointer', background: reminded ? TV.accMix(20) : TV.s10, color: reminded ? TV.accText : TV.text, border: `1px solid ${reminded ? TV.accMix(50) : TV.lineCard}` }}>
          <SportIcons.Bell size={u(20)} />
          {reminded ? ctx.tt('sportReminded') : ctx.tt('sportRemindMe')}
        </div>
      ) : null}
    </div>
  )
}
