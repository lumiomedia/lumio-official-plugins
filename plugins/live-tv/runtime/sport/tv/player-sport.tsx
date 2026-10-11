'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../../live-tv-data'
import type { LiveTvModel } from '../../live-tv-model'
import type { PlayRequest } from '../../live-tv-shell'
import { formatClock } from '../../live-tv-ui'
import type { MultiviewLayout, MultiviewState } from '../../tv/tv-multiview-store'
import type { PlayerSportProps } from '../../tv/tv-player-types'
import { useTvText } from '../../tv/tv-strings'
import { TV, station } from '../../tv/tv-ui'
import { crestText, matchTitle, sourceChannel, type MatchSource, type SportDay, type SportMatch } from '../sport-model'
import { localDayKey, useSportDay } from '../sport-epg'
import { pickMultiviewKeys, rankedSources, statusAt, visibleMatches } from '../sport-day-model'
import { useOverrides, useSportSettings } from '../sport-store'
import { useSportResults } from '../results-controller'
import { matchStatusLabel, scoreText } from '../score-model'
import { Crest, ellipsis, overline } from './sport-parts'
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

/** Lådan ligger i spelarportalen utanför scenlådan — alla mått via spelarens `ps()` (1,4× på TV). */
export function PlayerMatchesDrawer({ sport, channel, nowMs, locale, onClose, ps }: { sport: PlayerSportProps; channel: M3uChannel; nowMs: number; locale: string; onClose: () => void; ps: (n: number) => number }) {
  const { tt } = useTvText()
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
  }, [])
  const lists = matchesForPlayer(sport.matches, channelKey(channel), nowMs)
  const all = [...lists.onChannel, ...lists.live, ...lists.later]
  const toggle = (m: SportMatch) => setPicked((prev) => (prev.includes(m.id) ? prev.filter((id) => id !== m.id) : prev.length >= MAX_PICK ? prev : [...prev, m.id]))
  let rowIndex = 0
  const row = (m: SportMatch, now: boolean) => {
    const index = m.resultOnly ? -1 : rowIndex++
    const best = rankedSources(m, sport.overrides)[0]
    const on = picked.includes(m.id)
    const meta = [m.league, matchStatusLabel(m, tt) ?? (statusAt(m, nowMs) === 'live' ? tt('live') : formatClock(m.start, locale)), best?.name].filter(Boolean).join(' · ')
    // "Bara resultat" har ingen källa: ingen station, så fjärren hoppar över raden och Multiview kan inte välja den.
    const stationProps = m.resultOnly ? {} : station(() => (picking ? toggle(m) : sport.onSwitchMatch(m)), undefined, index === 0 ? { 'data-init': '' } : undefined)
    return (
      <div key={m.id} data-testid="pm-row" data-picked={on ? '1' : '0'} {...stationProps} style={{ display: 'flex', alignItems: 'center', gap: ps(14), padding: `${ps(12)}px ${ps(14)}px`, borderRadius: ps(12), cursor: m.resultOnly ? 'default' : 'pointer', background: now ? TV.accMix(16) : TV.s08, border: `1px solid ${now ? TV.accMix(60) : TV.line}` }}>
        {picking && !m.resultOnly ? <span style={{ width: ps(30), height: ps(30), borderRadius: ps(8), border: `2px solid ${on ? TV.acc : TV.lineStrong}`, background: on ? TV.acc : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span> : null}
        <span style={{ display: 'flex', flexShrink: 0 }}>
          {m.home ? <Crest name={m.home} colorKey={m.homeKey ?? m.home} size={ps(44)} /> : null}
          {m.away ? <span style={{ marginLeft: -ps(12) }}><Crest name={m.away} colorKey={m.awayKey ?? m.away} size={ps(44)} /></span> : null}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: ps(19), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
          <div style={{ fontSize: ps(15), color: TV.muted, ...ellipsis }}>{meta}</div>
        </div>
        <MatchScore match={m} size="row" />
        {now ? <span data-testid="pm-now" role="img" aria-label={tt('sportNowPill')} title={tt('sportNowPill')} style={{ display: 'inline-flex', color: TV.acc, flexShrink: 0 }}><SportIcons.Play size={ps(20)} /></span> : null}
      </div>
    )
  }
  const section = (title: string, list: SportMatch[], now: boolean) => (list.length === 0 ? null : (
    <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: ps(8) }}>
      <span style={{ ...overline, fontSize: ps(15) }}>{title}</span>
      {list.map((m) => row(m, now))}
    </div>
  ))
  return (
    <div ref={rootRef} data-testid="player-matches-drawer" data-panel-root="" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `min(${ps(780)}px, 100%)`, zIndex: 40, background: TV.panel, borderLeft: '1px solid rgba(255,255,255,0.16)', padding: ps(28), boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: ps(14), color: TV.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: ps(12) }}>
        <span style={{ fontSize: ps(30), fontWeight: 600 }}>{tt('sportMatches')}</span>
        <div data-testid="pm-pick" {...station(() => { setPicking((v) => !v); setPicked([]) })} aria-pressed={picking ? 'true' : 'false'} style={{ marginLeft: 'auto', height: ps(48), minHeight: ps(48), padding: `0 ${ps(16)}px`, borderRadius: ps(12), border: `1px solid ${TV.lineCard}`, background: picking ? TV.s16 : TV.s08, display: 'inline-flex', alignItems: 'center', fontSize: ps(16), fontWeight: 600, cursor: 'pointer' }}>{tt('sportPickSeveral')}</div>
        <div data-testid="pm-close" {...station(onClose)} aria-label={tt('sportClose')} style={{ width: ps(48), height: ps(48), minHeight: ps(48), borderRadius: ps(12), border: `1px solid ${TV.lineCard}`, background: TV.s08, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</div>
      </div>
      <span style={{ fontSize: ps(16), color: TV.muted }}>{tt('sportMatchesHint')}</span>
      <PlayerSourceSwitcher sport={sport} channel={channel} nowMs={nowMs} ps={(n) => ps(n * 1.3)} testId="pm-sources" />
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: ps(16) }}>
        {section(tt('sportOnThisChannel'), lists.onChannel, true)}
        {section(tt('sportLiveOnChannels'), lists.live, false)}
        {section(tt('sportLaterOnChannels'), lists.later, false)}
        {section(tt('sportResultOnly'), sport.matches.filter((m) => m.resultOnly), false)}
      </div>
      {picking ? (
        <div
          data-testid="pm-open-multiview"
          {...station(() => {
            const chosen = all.filter((m) => picked.includes(m.id))
            if (chosen.length > 0) sport.onOpenMultiview(pickMultiviewKeys(chosen, sport.overrides, sport.isKnownChannel))
          })}
          aria-disabled={picked.length === 0 ? 'true' : 'false'}
          style={{ height: ps(60), minHeight: ps(60), borderRadius: ps(14), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: ps(20), fontWeight: 600, cursor: 'pointer', opacity: picked.length === 0 ? 0.5 : 1 }}
        >
          {tt('sportOpenMultiview', { n: picked.length })}
        </div>
      ) : null}
    </div>
  )
}
