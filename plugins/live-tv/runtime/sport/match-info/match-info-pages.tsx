'use client'

import { getPluginHttpAssetUrl } from '@/lib/plugin-sdk'
import { TV, station } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import type { FixtureDetail, LineupEntry } from '../provider'
import type { SportMatch } from '../sport-model'
import type { SportCtx } from '../sport-ctx'
import { eventRows, lineupGroups, playerMatchFacts, positionGroup, statBars, type EventRow, type PositionGroup } from '../match-info-model'
import { rateLine } from '../rate-line'
import { useResultsController } from '../results-controller'
import { SportIcons } from '../sport-icons'
import { eventLabel, positionLabel, statLabel } from './match-info-text'
import { Overline, PlayerAvatar, ellipsis, rowCard, type U } from './match-info-parts'

/*
  Matchinfons undersidor. Allt läses ur EN fixtur (`detail`) som lådan redan
  hämtat — undersidorna gör inga egna anrop.
*/

// Raderna är fokusstopp även när OK inte gör något: annars når fjärrkontrollen aldrig ner i listan.
const NOOP = () => {}
const sideName = (match: SportMatch, side: 'home' | 'away' | null) => (side === 'home' ? match.home ?? '' : side === 'away' ? match.away ?? '' : '')

function EventIcon({ u, row }: { u: U; row: EventRow }) {
  if (row.marker === 'yellow' || row.marker === 'red') return <span style={{ color: row.marker === 'red' ? '#ef4444' : '#facc15', display: 'inline-flex' }}><SportIcons.Card size={u(20)} /></span>
  return <span style={{ color: TV.text, display: 'inline-flex' }}><SportIcons.Ball size={u(22)} /></span>
}

function EventCard({ u, row, match, ctx }: { u: U; row: EventRow; match: SportMatch; ctx: SportCtx }) {
  const end = row.align === 'end'
  const detail = [eventLabel(row.event, ctx.tt), row.assist ? ctx.tt('sportAssist', { name: row.assist }) : null, sideName(match, row.event.side) || null].filter(Boolean).join(' · ')
  return (
    <div data-testid="mc-event" data-align={row.align} {...station(NOOP)} style={{ ...rowCard(u), display: 'flex', flexDirection: end ? 'row-reverse' : 'row', alignItems: 'center', gap: u(16), padding: `${u(14)}px ${u(22)}px`, textAlign: end ? 'right' : 'left' }}>
      <span style={{ width: u(44), flexShrink: 0, fontSize: u(19), fontWeight: 700, color: TV.accText, fontVariantNumeric: 'tabular-nums', textAlign: end ? 'right' : 'left' }}>{row.minute}</span>
      <EventIcon u={u} row={row} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: u(19), fontWeight: 700, ...ellipsis }}>{row.player ?? eventLabel(row.event, ctx.tt)}</div>
        <div style={{ fontSize: u(15), color: TV.muted, ...ellipsis }}>{detail}</div>
      </div>
    </div>
  )
}

export function EventsPage({ u, match, ctx, detail }: { u: U; match: SportMatch; ctx: SportCtx; detail: FixtureDetail | null }) {
  const { lang, locale } = useTvText()
  const controller = useResultsController()
  const rows = detail ? eventRows(detail.events) : []
  const bars = detail ? statBars(detail.stats) : []
  // Takraden för MATCHENS sport: källan den sporten faktiskt använder just nu.
  const rate = controller ? rateLine(controller.status(match.kind), ctx.tt, { lang, locale }) : null
  return (
    <>
      <Overline u={u}>{ctx.tt('sportEvents')}</Overline>
      {rows.length === 0 ? <div data-testid="mc-no-events" style={{ fontSize: u(17), color: u.dim }}>{detail ? ctx.tt('sportNoEvents') : ctx.tt('sportDetailLoading')}</div> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
        {rows.map((r) => <EventCard key={r.index} u={u} row={r} match={match} ctx={ctx} />)}
      </div>
      {bars.length > 0 ? (
        <>
          <Overline u={u}>{ctx.tt('sportStats')}</Overline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: u(14) }}>
            {bars.map((b) => (
              <div key={b.label} data-testid="mc-stat" {...station(NOOP)} style={{ display: 'flex', flexDirection: 'column', gap: u(6) }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: u(10), fontSize: u(17) }}>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{b.home}</span>
                  <span style={{ flex: 1, textAlign: 'center', color: TV.muted }}>{statLabel(b.label, ctx.tt)}</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{b.away}</span>
                </div>
                <div aria-hidden="true" style={{ display: 'flex', gap: u(6), height: u(6) }}>
                  <span data-bar="home" style={{ flex: `${b.homeShare} 1 0`, borderRadius: u(3), background: TV.acc }} />
                  <span data-bar="away" style={{ flex: `${1 - b.homeShare} 1 0`, borderRadius: u(3), background: 'rgba(243,244,248,0.45)' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {rate ? <div data-testid="sport-rate-line" style={{ fontSize: u(14), color: u.dim }}>{rate.text}</div> : null}
    </>
  )
}

export interface PickedPlayer { side: 'home' | 'away'; player: LineupEntry; sub: boolean }

function PlayerCard({ u, side, player, onPick }: { u: U; side: 'home' | 'away'; player: LineupEntry; onPick: () => void }) {
  const end = side === 'away'
  return (
    <div data-testid="mc-player" data-side={side} {...station(onPick)} style={{ ...rowCard(u), display: 'flex', flexDirection: end ? 'row-reverse' : 'row', alignItems: 'center', gap: u(12), padding: `${u(12)}px ${u(14)}px`, cursor: 'pointer', textAlign: end ? 'right' : 'left', minWidth: 0 }}>
      <PlayerAvatar u={u} name={player.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: u(18), fontWeight: 700, ...ellipsis }}>{player.name}</div>
        <div style={{ fontSize: u(15), color: TV.muted }}>{player.number ?? ''}</div>
      </div>
    </div>
  )
}

function PairGrid({ u, home, away, onPick, sub }: { u: U; home: LineupEntry[]; away: LineupEntry[]; onPick: (p: PickedPlayer) => void; sub: boolean }) {
  const n = Math.max(home.length, away.length)
  const cells = []
  for (let i = 0; i < n; i += 1) {
    const h = home[i]
    const a = away[i]
    cells.push(h ? <PlayerCard key={`h${i}`} u={u} side="home" player={h} onPick={() => onPick({ side: 'home', player: h, sub })} /> : <span key={`h${i}`} />)
    cells.push(a ? <PlayerCard key={`a${i}`} u={u} side="away" player={a} onPick={() => onPick({ side: 'away', player: a, sub })} /> : <span key={`a${i}`} />)
  }
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: u(10) }}>{cells}</div>
}

export function LineupsPage({ u, ctx, detail, onPick }: { u: U; ctx: SportCtx; detail: FixtureDetail | null; onPick: (p: PickedPlayer) => void }) {
  const groups = detail ? lineupGroups(detail.lineups) : []
  const subs = (side: 'home' | 'away') => detail?.lineups.find((l) => l.side === side)?.subs ?? []
  const hasSubs = subs('home').length > 0 || subs('away').length > 0
  return (
    <>
      <Overline u={u}>{ctx.tt('sportPickPlayer')}</Overline>
      {groups.map((g) => (
        <section key={g.group} data-testid={`mc-lineup-${g.group}`} style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
          <Overline u={u} center>{positionLabel(g.group, ctx.tt)}</Overline>
          <PairGrid u={u} home={g.home} away={g.away} onPick={onPick} sub={false} />
        </section>
      ))}
      {hasSubs ? (
        <section data-testid="mc-lineup-subs" style={{ display: 'flex', flexDirection: 'column', gap: u(10) }}>
          <Overline u={u} center>{ctx.tt('sportSubs')}</Overline>
          <PairGrid u={u} home={subs('home')} away={subs('away')} onPick={onPick} sub />
        </section>
      ) : null}
    </>
  )
}

function FactRow({ u, label, value }: { u: U; label: string; value: string | number }) {
  return (
    <div {...station(NOOP)} style={{ ...rowCard(u), display: 'flex', alignItems: 'center', gap: u(12), minHeight: u(60), padding: `0 ${u(20)}px` }}>
      <span style={{ flex: 1, fontSize: u(17), color: TV.muted }}>{label}</span>
      <span style={{ fontSize: u(18), fontWeight: 700 }}>{value}</span>
    </div>
  )
}

/** Spelarkortet: bara det fixturen redan har (namn, nummer, position, lag, matchens mål och kort). */
export function PlayerPage({ u, match, ctx, detail, picked }: { u: U; match: SportMatch; ctx: SportCtx; detail: FixtureDetail | null; picked: PickedPlayer }) {
  const p = picked.player
  const facts = playerMatchFacts(p.name, detail?.events ?? [])
  const group: PositionGroup = positionGroup(p.pos)
  return (
    <div data-testid="mc-player-profile" style={{ display: 'flex', flexDirection: 'column', gap: u(12) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: u(18) }}>
        <PlayerAvatar u={u} name={p.name} photo={p.photo} size={u(96)} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: u(28), fontWeight: 700, ...ellipsis }}>{p.name}</div>
          <div style={{ fontSize: u(17), color: TV.muted }}>{[p.number != null ? `#${p.number}` : null, sideName(match, picked.side)].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      {p.number != null ? <FactRow u={u} label={ctx.tt('sportPlayerNumber')} value={p.number} /> : null}
      <FactRow u={u} label={ctx.tt('sportPlayerPosition')} value={picked.sub ? `${positionLabel(group, ctx.tt)} · ${ctx.tt('sportPlayerSub')}` : positionLabel(group, ctx.tt)} />
      <FactRow u={u} label={ctx.tt('sportPlayerTeam')} value={sideName(match, picked.side)} />
      {facts.goals + facts.assists + facts.yellow + facts.red > 0 ? (
        <>
          <Overline u={u}>{ctx.tt('sportPlayerThisMatch')}</Overline>
          {facts.goals > 0 ? <FactRow u={u} label={ctx.tt('sportPlayerGoals')} value={facts.goals} /> : null}
          {facts.assists > 0 ? <FactRow u={u} label={ctx.tt('sportPlayerAssists')} value={facts.assists} /> : null}
          {facts.yellow > 0 ? <FactRow u={u} label={ctx.tt('sportPlayerYellow')} value={facts.yellow} /> : null}
          {facts.red > 0 ? <FactRow u={u} label={ctx.tt('sportPlayerRed')} value={facts.red} /> : null}
        </>
      ) : null}
    </div>
  )
}

/** Arenan: namn, stad och bild när källan skickat dem i fixturen — annars bara namnet. */
export function VenuePage({ u, ctx, name, city, image }: { u: U; ctx: SportCtx; name: string; city: string | null; image: string | null }) {
  const url = image ? getPluginHttpAssetUrl('/api/m3u-logo', image) : null
  return (
    <div data-testid="mc-venue" style={{ display: 'flex', flexDirection: 'column', gap: u(12) }}>
      {url ? <img data-testid="mc-venue-image" src={url} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: u(14) }} /> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: u(12) }}>
        <span style={{ color: TV.muted, display: 'inline-flex' }}><SportIcons.Pin size={u(26)} /></span>
        <span style={{ fontSize: u(26), fontWeight: 700 }}>{name}</span>
      </div>
      {city ? <FactRow u={u} label={ctx.tt('sportVenueCity')} value={city} /> : null}
      {!city && !url ? <div {...station(NOOP)} style={{ fontSize: u(16), color: u.dim }}>{ctx.tt('sportVenueOnly')}</div> : null}
    </div>
  )
}
