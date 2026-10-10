'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../../live-tv-data'
import type { LiveTvModel } from '../../live-tv-model'
import type { PlayRequest } from '../../live-tv-shell'
import { formatClock } from '../../live-tv-ui'
import type { MultiviewLayout, MultiviewState } from '../../tv/tv-multiview-store'
import type { PlayerSportProps } from '../../tv/tv-player-types'
import { useTvText } from '../../tv/tv-strings'
import { TV, dp, station } from '../../tv/tv-ui'
import { crestText, matchTitle, sourceChannel, type SportMatch } from '../sport-model'
import { localDayKey, useSportDay } from '../sport-epg'
import { pickMultiviewKeys, rankedSources, statusAt, visibleMatches } from '../sport-day-model'
import { useOverrides, useSportSettings } from '../sport-store'
import { Crest, ellipsis, overline } from './sport-parts'

const MAX_PICK = 4

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

/** Dagens matcher till spelaren — ett lokalt anrop, och bara medan spelaren är öppen. */
export function usePlayerSport(args: { active: boolean; model: LiveTvModel; play: (request: PlayRequest) => void; openMultiview: (keys: string[]) => void }): PlayerSportProps | undefined {
  const settings = useSportSettings()
  const overrides = useOverrides()
  const { active, model, play, openMultiview } = args
  const { data } = useSportDay(active ? localDayKey(model.nowMs) : null, model.nowMs)
  return useMemo(() => {
    if (!active || !data) return undefined
    return {
      matches: visibleMatches(data, 'all'),
      overrides,
      view: settings.view,
      onSwitchMatch: (m) => {
        const best = rankedSources(m, overrides)[0]
        if (best) play({ channel: sourceChannel(best) })
      },
      onOpenMultiview: openMultiview,
      isKnownChannel: (key) => model.byKey.has(key),
    }
  }, [active, data, overrides, settings.view, play, openMultiview, model.byKey])
}

const shortLabel = (m: SportMatch) => (m.home && m.away ? `${crestText(m.home)} – ${crestText(m.away)}` : m.event ?? m.league)

export function PlayerSportTicker({ sport, channel, nowMs, variant, ps }: { sport: PlayerSportProps; channel: M3uChannel; nowMs: number; variant: 'ticker' | 'column'; ps: (n: number) => number }) {
  const { tt } = useTvText()
  const lists = matchesForPlayer(sport.matches, channelKey(channel), nowMs)
  const items = [...lists.onChannel, ...lists.live].slice(0, variant === 'ticker' ? 6 : 5)
  if (items.length === 0) return null
  if (variant === 'column') {
    return (
      <div data-testid="player-sport-ticker" data-variant="column" style={{ position: 'absolute', top: ps(96), right: ps(20), width: ps(300), display: 'flex', flexDirection: 'column', gap: ps(6), pointerEvents: 'none', zIndex: 31 }}>
        {items.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: ps(8), padding: `${ps(8)}px ${ps(12)}px`, borderRadius: ps(10), background: 'rgba(20,21,25,0.86)', border: `1px solid ${TV.lineCard}`, fontSize: ps(14), fontWeight: 600 }}>
            <span style={{ ...ellipsis, flex: 1 }}>{shortLabel(m)}</span>
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
        <span key={m.id} style={{ padding: `${ps(4)}px ${ps(10)}px`, borderRadius: ps(8), border: `1px solid ${TV.lineCard}`, background: 'rgba(0,0,0,0.5)', fontSize: ps(13), fontWeight: 600, whiteSpace: 'nowrap' }}>{shortLabel(m)}</span>
      ))}
    </div>
  )
}

export function PlayerMatchesDrawer({ sport, channel, nowMs, locale, onClose }: { sport: PlayerSportProps; channel: M3uChannel; nowMs: number; locale: string; onClose: () => void }) {
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
    const index = rowIndex++
    const best = rankedSources(m, sport.overrides)[0]
    const on = picked.includes(m.id)
    const meta = [m.league, statusAt(m, nowMs) === 'live' ? tt('live') : formatClock(m.start, locale), best?.name].filter(Boolean).join(' · ')
    return (
      <div key={m.id} data-testid="pm-row" data-picked={on ? '1' : '0'} {...station(() => (picking ? toggle(m) : sport.onSwitchMatch(m)), undefined, index === 0 ? { 'data-init': '' } : undefined)} style={{ display: 'flex', alignItems: 'center', gap: dp(14), padding: `${dp(12)}px ${dp(14)}px`, borderRadius: dp(12), cursor: 'pointer', background: now ? TV.accMix(16) : TV.s08, border: `1px solid ${now ? TV.accMix(60) : TV.line}` }}>
        {picking ? <span style={{ width: dp(30), height: dp(30), borderRadius: dp(8), border: `2px solid ${on ? TV.acc : TV.lineStrong}`, background: on ? TV.acc : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span> : null}
        <span style={{ display: 'flex', flexShrink: 0 }}>
          {m.home ? <Crest name={m.home} colorKey={m.homeKey ?? m.home} size={dp(44)} /> : null}
          {m.away ? <span style={{ marginLeft: -dp(12) }}><Crest name={m.away} colorKey={m.awayKey ?? m.away} size={dp(44)} /></span> : null}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{matchTitle(m)}</div>
          <div style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{meta}</div>
        </div>
        {now ? <span data-testid="pm-now" style={{ padding: `${dp(3)}px ${dp(10)}px`, borderRadius: 999, border: `1px solid ${TV.accMix(80)}`, color: TV.accText, fontSize: dp(13), fontWeight: 700 }}>{tt('sportNowPill')}</span> : null}
      </div>
    )
  }
  const section = (title: string, list: SportMatch[], now: boolean) => (list.length === 0 ? null : (
    <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: dp(8) }}>
      <span style={overline}>{title}</span>
      {list.map((m) => row(m, now))}
    </div>
  ))
  return (
    <div ref={rootRef} data-testid="player-matches-drawer" data-panel-root="" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `min(${dp(780)}px, 100%)`, zIndex: 40, background: '#141519', borderLeft: '1px solid rgba(255,255,255,0.16)', padding: dp(28), boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: dp(14), color: TV.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
        <span style={{ fontSize: dp(30), fontWeight: 600 }}>{tt('sportMatches')}</span>
        <div data-testid="pm-pick" {...station(() => { setPicking((v) => !v); setPicked([]) })} aria-pressed={picking ? 'true' : 'false'} style={{ marginLeft: 'auto', height: dp(48), minHeight: dp(48), padding: `0 ${dp(16)}px`, borderRadius: dp(12), border: `1px solid ${TV.lineCard}`, background: picking ? TV.s16 : TV.s08, display: 'inline-flex', alignItems: 'center', fontSize: dp(16), fontWeight: 600, cursor: 'pointer' }}>{tt('sportPickSeveral')}</div>
        <div data-testid="pm-close" {...station(onClose)} aria-label={tt('sportClose')} style={{ width: dp(48), height: dp(48), minHeight: dp(48), borderRadius: dp(12), border: `1px solid ${TV.lineCard}`, background: TV.s08, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</div>
      </div>
      <span style={{ fontSize: dp(16), color: TV.muted }}>{tt('sportMatchesHint')}</span>
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: dp(16) }}>
        {section(tt('sportOnThisChannel'), lists.onChannel, true)}
        {section(tt('sportLiveOnChannels'), lists.live, false)}
        {section(tt('sportLaterOnChannels'), lists.later, false)}
      </div>
      {picking ? (
        <div
          data-testid="pm-open-multiview"
          {...station(() => {
            const chosen = all.filter((m) => picked.includes(m.id))
            if (chosen.length > 0) sport.onOpenMultiview(pickMultiviewKeys(chosen, sport.overrides, sport.isKnownChannel))
          })}
          aria-disabled={picked.length === 0 ? 'true' : 'false'}
          style={{ height: dp(60), minHeight: dp(60), borderRadius: dp(14), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: dp(20), fontWeight: 600, cursor: 'pointer', opacity: picked.length === 0 ? 0.5 : 1 }}
        >
          {tt('sportOpenMultiview', { n: picked.length })}
        </div>
      ) : null}
    </div>
  )
}
