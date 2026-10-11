'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../../live-tv-data'
import type { LiveTvModel } from '../../live-tv-model'
import type { PlayRequest } from '../../live-tv-shell'
import { formatClock, progressOf } from '../../live-tv-ui'
import type { MultiviewLayout, MultiviewState } from '../../tv/tv-multiview-store'
import type { PlayerSportProps } from '../../tv/tv-player-types'
import { useTvText } from '../../tv/tv-strings'
import { Icons, TV, station } from '../../tv/tv-ui'
import { crestText, matchTitle, sourceChannel, type MatchSource, type SportDay, type SportMatch } from '../sport-model'
import { localDayKey, useSportDay } from '../sport-epg'
import { pickMultiviewKeys, playerMatchGroups, rankedSources, statusAt, visibleMatches } from '../sport-day-model'
import { useOverrides, useSportSettings } from '../sport-store'
import { useSportResults } from '../results-controller'
import { matchStatusLabel, scoreText } from '../score-model'
import { Crest, ellipsis } from './sport-parts'
import { MatchScore } from './sport-score'
import { SportIcons } from './sport-icons'

const MAX_PICK = 4
const NO_MATCHES: SportMatch[] = []

export function multiviewFor(keys: string[]): MultiviewState {
  const picked = keys.slice(0, MAX_PICK)
  const layout: MultiviewLayout = picked.length <= 2 ? 2 : picked.length === 3 ? 3 : 4
  return { layout, tiles: Array.from({ length: layout }, (_, i) => picked[i] ?? null), audioIndex: 0 }
}

export function matchesForPlayer(matches: SportMatch[], currentKey: string, now: number): { onChannel: SportMatch[]; live: SportMatch[]; later: SportMatch[] } {
  const withSource = matches.filter((m) => m.sources.length > 0)
  const onChannel = withSource.filter((m) => statusAt(m, now) === 'live' && m.sources.some((s) => s.channelKey === currentKey))
  return {
    onChannel,
    live: withSource.filter((m) => statusAt(m, now) === 'live' && !onChannel.includes(m)),
    later: withSource.filter((m) => statusAt(m, now) === 'upcoming'),
  }
}

/**
  Källorna för matchen som spelar just nu — rankade som i matchcentret, och
  bara när det finns fler än en att välja mellan. Ren funktion över dagens
  redan hämtade matcher: källväljaren kostar inga anrop.
*/
export function currentMatchSources(sport: Pick<PlayerSportProps, 'matches' | 'overrides'>, currentKey: string, now: number): { match: SportMatch; sources: MatchSource[] } | null {
  for (const match of matchesForPlayer(sport.matches, currentKey, now).onChannel) {
    const sources = rankedSources(match, sport.overrides)
    if (sources.length > 1) return { match, sources }
  }
  return null
}

/** Hur länge en kanal ska ha spelat innan spelaren frågar efter dagens matcher. */
export const PLAYER_SPORT_DELAY_MS = 4000

/**
  Dagens matcher till spelaren — ett lokalt anrop, bara medan spelaren är
  öppen och först när kanalen spelat en stund: `/sport/day` kan läsa in hela
  EPG-lagret, och det får inte dela tid med uppspelningsstarten. Byts kanalen
  innan dess börjar väntan om. `playingKey` är null när spelaren är stängd.
*/
export function usePlayerSport(args: { playingKey: string | null; model: LiveTvModel; play: (request: PlayRequest) => void; openMultiview: (keys: string[]) => void }): PlayerSportProps | undefined {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const overrides = useOverrides()
  const { playingKey, model, play, openMultiview } = args
  const active = playingKey !== null
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    setArmed(false)
    if (playingKey === null) return
    const timer = window.setTimeout(() => setArmed(true), PLAYER_SPORT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [playingKey])
  const { data: fresh } = useSportDay(active && armed ? localDayKey(model.nowMs) : null, model.nowMs)
  // Vid kanalbyte ligger förra svaret kvar medan väntan pågår — tickern blinkar inte bort.
  const last = useRef<SportDay | null>(null)
  if (!active) last.current = null
  else if (fresh) last.current = fresh
  const data = active ? fresh ?? last.current : null
  // Sammanslagning på samma dag som spelaren hämtar. `day: null` (spelaren stängd eller väntar) = inga anrop.
  const { matches: mergedMatches } = useSportResults({ day: active && armed ? localDayKey(model.nowMs) : null, epg: data?.matches ?? NO_MATCHES })
  const mergedData = useMemo(() => (data ? { ...data, matches: mergedMatches } : null), [data, mergedMatches])
  return useMemo(() => {
    if (!active || !mergedData) return undefined
    return {
      matches: visibleMatches(mergedData, 'all'),
      overrides,
      view: settings.view,
      onSwitchMatch: (m) => {
        const best = rankedSources(m, overrides)[0]
        if (best) play({ channel: sourceChannel(best) })
      },
      onSwitchSource: (source) => play({ channel: sourceChannel(source) }),
      onOpenMultiview: openMultiview,
      isKnownChannel: (key) => model.byKey.has(key),
      playlistName: (sourceId) => model.lists.find((list) => list.source === sourceId)?.name ?? tt('sportPlaylistUnknown'),
    }
  }, [active, mergedData, overrides, settings.view, play, openMultiview, model.byKey, model.lists, tt])
}

const shortLabel = (m: SportMatch) => (m.home && m.away ? `${crestText(m.home)} – ${crestText(m.away)}` : m.event ?? m.league)

export function PlayerSportTicker({ sport, channel, nowMs, variant, ps }: { sport: PlayerSportProps; channel: M3uChannel; nowMs: number; variant: 'ticker' | 'column'; ps: (n: number) => number }) {
  const { tt } = useTvText()
  const lists = matchesForPlayer(sport.matches, channelKey(channel), nowMs)
  const items = [...lists.onChannel, ...lists.live].slice(0, variant === 'ticker' ? 6 : 5)
  if (items.length === 0) return null
  // Matchen på kanalen spelar redan — ett OK där ska inte starta om strömmen.
  const pick = (m: SportMatch) => () => { if (!lists.onChannel.includes(m)) sport.onSwitchMatch(m) }
  if (variant === 'column') {
    return (
      <div data-testid="player-sport-ticker" data-variant="column" style={{ position: 'absolute', top: ps(96), right: ps(20), width: ps(300), display: 'flex', flexDirection: 'column', gap: ps(6), pointerEvents: 'none', zIndex: 31 }}>
        {items.map((m) => (
          <div key={m.id} data-testid="pst-item" {...station(pick(m))} style={{ display: 'flex', alignItems: 'center', gap: ps(8), padding: `${ps(8)}px ${ps(12)}px`, borderRadius: ps(10), background: 'rgba(20,21,25,0.86)', border: `1px solid ${TV.lineCard}`, fontSize: ps(14), fontWeight: 600, pointerEvents: 'auto', cursor: 'pointer' }}>
            <span style={{ ...ellipsis, flex: 1 }}>{shortLabel(m)}{scoreText(m) ? ` ${scoreText(m)}` : ''}</span>
            <span style={{ color: TV.live, fontSize: ps(12) }}>{tt('live')}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div data-testid="player-sport-ticker" data-variant="ticker" style={{ display: 'flex', alignItems: 'center', gap: ps(8), marginBottom: ps(8), overflow: 'hidden' }}>
      <span style={{ fontSize: ps(11), fontWeight: 700, letterSpacing: '0.14em', color: TV.dim }}>{tt('live')}</span>
      {items.map((m) => (
        <span key={m.id} data-testid="pst-item" {...station(pick(m))} style={{ padding: `${ps(4)}px ${ps(10)}px`, borderRadius: ps(8), border: `1px solid ${TV.lineCard}`, background: 'rgba(0,0,0,0.5)', fontSize: ps(13), fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'auto', cursor: 'pointer' }}>{shortLabel(m)}{scoreText(m) ? ` ${scoreText(m)}` : ''}</span>
      ))}
    </div>
  )
}

/**
  Källväljaren för matchen som spelar: ett chip per källa (kanal, spellista,
  kvalitet), den som spelar markerad. Stationer — nås med fjärren på TV.
*/
export function PlayerSourceSwitcher({ sport, channel, nowMs, ps, testId = 'player-sources' }: { sport: PlayerSportProps; channel: M3uChannel; nowMs: number; ps: (n: number) => number; testId?: string }) {
  const { tt } = useTvText()
  const currentKey = channelKey(channel)
  const found = currentMatchSources(sport, currentKey, nowMs)
  if (!found) return null
  return (
    <div data-testid={testId} data-row="" style={{ display: 'flex', alignItems: 'center', gap: ps(8), marginBottom: ps(8), overflowX: 'auto', pointerEvents: 'auto' }}>
      <span style={{ fontSize: ps(11), fontWeight: 700, letterSpacing: '0.14em', color: TV.dim, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{tt('sportSourcesShort', { n: found.sources.length })}</span>
      {found.sources.map((s) => {
        const on = s.channelKey === currentKey
        return (
          <div key={s.channelKey} data-testid="player-source" data-current={on ? '1' : '0'} aria-pressed={on ? 'true' : 'false'} {...station(() => { if (!on) sport.onSwitchSource(s) })} style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, maxWidth: ps(240), padding: `${ps(5)}px ${ps(12)}px`, borderRadius: ps(10), cursor: 'pointer', background: on ? TV.accMix(18) : 'rgba(0,0,0,0.5)', border: `1px solid ${on ? TV.accMix(70) : TV.lineCard}` }}>
            <span style={{ fontSize: ps(13), fontWeight: 600, ...ellipsis }}>{on ? '● ' : ''}{s.name}</span>
            <span style={{ fontSize: ps(11), color: TV.muted, ...ellipsis }}>{[sport.playlistName(s.sourceId), s.quality].filter(Boolean).join(' · ')}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
  Matcher-lådan: spelarens egen glasyta (samma som Guide-överlägget), raderna
  grupperade på tid som i Guiden — "Pågår nu" och sedan en grupp per
  avsparkstid. Lagmärkena står bredvid varandra, kanalen är underrad, och
  varje rad har en egen Multiview-ikon: markera två till fyra och öppna dem
  samtidigt. Ligger i spelarportalen utanför scenlådan — alla mått via
  spelarens `ps()` (1,4× på TV).
*/
export function PlayerMatchesDrawer({ sport, channel, nowMs, locale, onClose, ps }: { sport: PlayerSportProps; channel: M3uChannel; nowMs: number; locale: string; onClose: () => void; ps: (n: number) => number }) {
  const { tt } = useTvText()
  const [picked, setPicked] = useState<string[]>([])
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
  }, [])
  const currentKey = channelKey(channel)
  const groups = playerMatchGroups(sport.matches, currentKey, nowMs)
  const all = groups.flatMap((g) => g.matches)
  const toggle = (m: SportMatch) => setPicked((prev) => (prev.includes(m.id) ? prev.filter((id) => id !== m.id) : prev.length >= MAX_PICK ? prev : [...prev, m.id]))
  let rowIndex = 0
  const row = (m: SportMatch) => {
    const first = rowIndex++ === 0
    const st = statusAt(m, nowMs)
    const best = rankedSources(m, sport.overrides)[0]
    const here = st === 'live' && m.sources.some((s) => s.channelKey === currentKey)
    const on = picked.includes(m.id)
    const title = matchTitle(m)
    const status = st === 'live' ? matchStatusLabel(m, tt) ?? tt('live') : formatClock(m.start, locale)
    return (
      <div key={m.id} data-testid="pm-item" data-row="" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: ps(8), padding: `${ps(4)}px ${ps(12)}px`, borderBottom: `1px solid ${TV.s05}`, background: here ? TV.accMix(12) : 'transparent' }}>
        <div data-testid="pm-row" data-picked={on ? '1' : '0'} {...station(() => sport.onSwitchMatch(m), undefined, first ? { 'data-init': '', 'aria-label': title } : { 'aria-label': title })} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: ps(14), padding: `${ps(8)}px ${ps(8)}px`, borderRadius: ps(12), cursor: 'pointer' }}>
          <span style={{ display: 'flex', gap: ps(4), flexShrink: 0 }}>
            {m.home ? <Crest name={m.home} colorKey={m.homeKey ?? m.home} size={ps(36)} src={m.homeCrest} /> : null}
            {m.away ? <Crest name={m.away} colorKey={m.awayKey ?? m.away} size={ps(36)} src={m.awayCrest} /> : null}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: ps(18), fontWeight: 600, ...ellipsis }}>{title}</div>
            <div style={{ fontSize: ps(14), color: TV.muted, ...ellipsis }}>{[best?.name, m.league].filter(Boolean).join(' · ')}</div>
          </div>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
            <MatchScore match={m} size="row" />
            <span style={{ fontSize: ps(14), fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: st === 'live' ? TV.acc : TV.muted }}>{status}</span>
          </span>
          {here ? <span data-testid="pm-now" role="img" aria-label={tt('sportNowPill')} title={tt('sportNowPill')} style={{ display: 'inline-flex', color: TV.acc, flexShrink: 0 }}><SportIcons.Play size={ps(20)} /></span> : null}
        </div>
        <div
          data-testid="pm-mv"
          {...station(() => toggle(m), undefined, { 'aria-label': on ? tt('sportMultiviewRemove', { name: title }) : tt('sportMultiviewAdd', { name: title }) })}
          aria-pressed={on ? 'true' : 'false'}
          title={on ? tt('sportMultiviewRemove', { name: title }) : tt('sportMultiviewAdd', { name: title })}
          style={{ width: ps(44), height: ps(44), minHeight: ps(44), flexShrink: 0, borderRadius: ps(12), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: on ? TV.onAcc : TV.muted, background: on ? TV.acc : 'rgba(252,252,255,0.06)' }}
        >
          <Icons.SquaresFour size={ps(20)} />
        </div>
        {st === 'live' ? <div aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 0, height: ps(2), width: `${Math.round(progressOf(m.start, m.stop, nowMs) * 100)}%`, background: TV.acc }} /> : null}
      </div>
    )
  }
  return (
    <div ref={rootRef} data-testid="player-matches-drawer" data-panel-root="" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `min(${ps(700)}px, 100%)`, zIndex: 40, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${TV.lineCard}`, borderRadius: `${ps(24)}px 0 0 ${ps(24)}px`, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)', boxSizing: 'border-box', fontFamily: TV.font, color: TV.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: ps(12), padding: `${ps(20)}px ${ps(20)}px ${ps(12)}px`, borderBottom: `1px solid ${TV.line}`, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: ps(26), fontWeight: 600 }}>{tt('sportMatches')}</div>
          <div style={{ fontSize: ps(14), color: TV.dim }}>{tt('sportMatchesHint')}</div>
        </div>
        <div data-testid="pm-close" {...station(onClose)} aria-label={tt('sportClose')} style={{ width: ps(44), height: ps(44), minHeight: ps(44), borderRadius: 999, background: 'rgba(252,252,255,0.06)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>✕</div>
      </div>
      <div style={{ padding: `${ps(12)}px ${ps(20)}px 0`, flexShrink: 0 }}>
        <PlayerSourceSwitcher sport={sport} channel={channel} nowMs={nowMs} ps={(n) => ps(n * 1.3)} testId="pm-sources" />
      </div>
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {groups.map((g) => (
          <div key={g.start ?? 'now'} data-testid="pm-group" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ padding: `${ps(14)}px ${ps(20)}px ${ps(6)}px`, fontSize: ps(12), fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums', color: g.start === null ? TV.acc : TV.dim }}>
              {g.start === null ? tt('sportLiveOnChannels') : formatClock(g.start, locale)}
            </span>
            {g.matches.map(row)}
          </div>
        ))}
      </div>
      {picked.length > 0 ? (
        <div style={{ padding: ps(16), borderTop: `1px solid ${TV.line}`, flexShrink: 0 }}>
          <div
            data-testid="pm-open-multiview"
            {...station(() => {
              const chosen = all.filter((m) => picked.includes(m.id))
              if (chosen.length > 0) sport.onOpenMultiview(pickMultiviewKeys(chosen, sport.overrides, sport.isKnownChannel))
            })}
            style={{ height: ps(56), minHeight: ps(56), borderRadius: ps(14), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: ps(10), fontSize: ps(18), fontWeight: 600, cursor: 'pointer' }}
          >
            <Icons.SquaresFour size={ps(20)} />
            {tt('sportOpenMultiview', { n: picked.length })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
