'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { channelKey } from '../../live-tv-data'
import { ChannelArt, RoundBtn, TV, belowTitleBar, dp, station } from '../../tv/tv-ui'
import { TvChannelPicker } from '../../tv/tv-channel-picker'
import { matchTitle, sourceChannel, type SportMatch } from '../sport-model'
import { followState, rankedSources, statusAt } from '../sport-day-model'
import { setOverride, toggleFollow } from '../sport-store'
import { timeLine, type SportCtx } from '../sport-ctx'
import { heroStatusLine, showsScore } from '../score-model'
import { Crest, StatusTag, ellipsis, overline, primaryBtn } from './sport-parts'
import { MatchScore } from './sport-score'
import { MatchCenterData } from './sport-match-center-data'
import { SportIcons } from './sport-icons'
import { SPORT_PANEL_BG, sportSurface } from '../surface'

const iconBtn = (on: boolean): CSSProperties => ({
  height: dp(44), minHeight: dp(44), minWidth: dp(44), padding: `0 ${dp(10)}px`, boxSizing: 'border-box', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: dp(6),
  cursor: 'pointer', flexShrink: 0, background: on ? TV.accMix(18) : TV.s08, color: on ? TV.acc : TV.muted, border: `1px solid ${on ? TV.accMix(60) : TV.lineCard}`,
})

/**
  Favoritknappen: en liten ikonknapp — lagets märke (när det finns) och Live
  TV:s hjärta. Namnet står i etiketten (skärmläsare) och verktygstipset.
*/
function FavIcon({ testId, on, name, crest, ctx, onToggle }: { testId: string; on: boolean; name: string; crest?: { colorKey: string; src?: string | null }; ctx: SportCtx; onToggle: () => void }) {
  const label = on ? ctx.tt('sportFollowingName', { name }) : ctx.tt('sportFollowName', { name })
  return (
    <div data-testid={testId} {...station(onToggle)} aria-pressed={on ? 'true' : 'false'} aria-label={label} title={label} style={iconBtn(on)}>
      {crest ? <Crest name={name} colorKey={crest.colorKey} size={dp(26)} src={crest.src} /> : null}
      <SportIcons.Heart size={dp(20)} filled={on} />
    </div>
  )
}

export function SportMatchCenter({ ctx, match, onClose }: { ctx: SportCtx; match: SportMatch; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  // Senaste nav/onClose i refar: lagret registreras EN gång per öppning
  // (samma mönster och skäl som PickerPanel i tv-list-picker.tsx).
  const navRef = useRef(ctx.nav)
  const onCloseRef = useRef(onClose)
  useEffect(() => { navRef.current = ctx.nav; onCloseRef.current = onClose })
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    const close = () => {
      onCloseRef.current()
      window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0)
    }
    const off = navRef.current.pushLayer(close)
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [])

  const ranked = rankedSources(match, ctx.overrides)
  const override = ctx.overrides[match.id]
  const index = Math.min(selected, Math.max(ranked.length - 1, 0))
  const chosen = ranked[index] ?? null
  const fs = followState(match, ctx.follows)
  const st = statusAt(match, ctx.now)
  const context = [match.league || ctx.kindLabel(match.kind), match.venue, match.round ? ctx.tt('sportRound', { n: match.round }) : null].filter(Boolean).join(' · ')
  const follow = (kind: 'team' | 'league', key: string | null, name: string | null) => {
    if (key && name) toggleFollow({ sport: match.kind, kind, key, name })
  }

  return (
    <>
      <div data-live-tv-layer="" aria-hidden="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 59, background: TV.scrim }} />
      <div ref={rootRef} data-testid="match-center" data-panel-root="" data-live-tv-layer="" data-scroll="" role="dialog" aria-label={matchTitle(match)} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(840)}px, 100%)`, zIndex: 60, ...sportSurface(SPORT_PANEL_BG), borderLeft: '1px solid rgba(255,255,255,0.16)', padding: `${belowTitleBar(dp(28))} ${dp(32)}px ${dp(28)}px`, display: 'flex', flexDirection: 'column', gap: dp(20), overflowY: 'auto', boxSizing: 'border-box' }}>
        {/* Titelraden i Guidens kanalinfo-stil: märkena bredvid varandra, titeln, ställning och minut i samma rad. */}
        <div data-testid="mc-head" style={{ display: 'flex', alignItems: 'flex-start', gap: dp(16) }}>
          {match.home && match.away ? (
            <span style={{ display: 'flex', gap: dp(6), flexShrink: 0 }}>
              <Crest name={match.home} colorKey={match.homeKey ?? match.home} size={dp(56)} src={match.homeCrest} />
              <Crest name={match.away} colorKey={match.awayKey ?? match.away} size={dp(56)} src={match.awayCrest} />
            </span>
          ) : null}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(8) }}>
            <div data-testid="mc-title" style={{ fontSize: dp(30), fontWeight: 600, lineHeight: 1.15, ...ellipsis }}>{matchTitle(match)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
              <StatusTag match={match} ctx={ctx} />
              <span style={{ fontSize: dp(17), color: TV.muted, ...ellipsis }}>{context}</span>
            </div>
            <div data-row="" data-testid="mc-actions" style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
              {match.home && match.homeKey ? (
                <FavIcon testId="mc-follow-home" on={fs.home} name={match.home} crest={{ colorKey: match.homeKey, src: match.homeCrest }} ctx={ctx} onToggle={() => follow('team', match.homeKey, match.home)} />
              ) : null}
              {match.away && match.awayKey ? (
                <FavIcon testId="mc-follow-away" on={fs.away} name={match.away} crest={{ colorKey: match.awayKey, src: match.awayCrest }} ctx={ctx} onToggle={() => follow('team', match.awayKey, match.away)} />
              ) : null}
              {match.leagueKey ? (
                <FavIcon testId="mc-follow-league" on={fs.league} name={match.league} ctx={ctx} onToggle={() => follow('league', match.leagueKey, match.league)} />
              ) : null}
              {ranked.length > 0 && st !== 'finished' ? (
                <div data-testid="mc-remind" {...station(() => ctx.toggleRemind(match))} aria-pressed={ctx.isReminded(match) ? 'true' : 'false'} aria-label={ctx.isReminded(match) ? ctx.tt('sportReminded') : ctx.tt('sportRemindMe')} title={ctx.isReminded(match) ? ctx.tt('sportReminded') : ctx.tt('sportRemindMe')} style={iconBtn(ctx.isReminded(match))}>
                  <SportIcons.Bell size={dp(20)} />
                </div>
              ) : null}
            </div>
          </div>
          <span data-testid="mc-scoreline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: dp(4), flexShrink: 0 }}>
            {showsScore(match) ? (
              <span data-testid="mc-score" style={{ padding: `${dp(2)}px ${dp(14)}px`, borderRadius: dp(10), background: st === 'live' ? TV.accMix(22) : TV.s12, display: 'inline-flex' }}><MatchScore match={match} size="card" /></span>
            ) : null}
            <span style={{ fontSize: dp(17), fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: st === 'live' ? TV.acc : TV.muted, whiteSpace: 'nowrap' }}>{heroStatusLine(match, ctx.tt) ?? timeLine(match, ctx)}</span>
          </span>
          <RoundBtn data-testid="mc-close" {...station(onClose)} aria-label={ctx.tt('sportClose')}>✕</RoundBtn>
        </div>

        <span style={overline}>{ctx.tt('sportWhereToWatch')}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          {ranked.map((s, i) => {
            const on = i === index
            return (
              <div key={s.channelKey} data-testid="mc-source" data-selected={on ? '1' : '0'} {...station(() => setSelected(i), undefined, i === 0 ? { 'data-init': '' } : undefined)} style={{ display: 'flex', alignItems: 'center', gap: dp(16), padding: `${dp(12)}px ${dp(16)}px`, borderRadius: dp(12), cursor: 'pointer', background: on ? TV.text : TV.s08, color: on ? '#12152a' : TV.text, border: `1px solid ${on ? TV.text : TV.lineCard}` }}>
                <ChannelArt channel={sourceChannel(s)} style={{ width: dp(72), height: dp(46), flexShrink: 0 }} radius={dp(8)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{s.name}</div>
                  <div style={{ fontSize: dp(15), opacity: 0.7, ...ellipsis }}>{`${ctx.playlistName(s.sourceId)} · ${ctx.tt('sportLatencyUnknown')}`}</div>
                </div>
                {override && i === 0 ? <span style={{ fontSize: dp(14), fontWeight: 600 }}>{ctx.tt('sportYourChoice')}</span> : null}
                {s.quality ? <span style={{ fontSize: dp(16), fontWeight: 700 }}>{s.quality}</span> : null}
                {i === 0 && ranked.length > 1 ? <span data-testid="mc-best" style={{ fontSize: dp(14), fontWeight: 700, letterSpacing: '0.1em', color: on ? '#c2410c' : TV.accText }}>{ctx.tt('sportBest')}</span> : null}
              </div>
            )
          })}
        </div>
        {chosen ? (
          <div data-testid="mc-watch" {...station(() => { ctx.watch(match, chosen); onClose() })} style={{ ...primaryBtn, justifyContent: 'center' }}>
            <SportIcons.Play size={dp(20)} />
            {chosen.quality ? ctx.tt('sportWatchQuality', { quality: chosen.quality }) : ctx.tt('sportWatch')}
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(20), flexWrap: 'wrap' }}>
          <span data-testid="mc-pick-channel" {...station(() => setPicking(true))} title={ctx.tt('sportPickChannelSub')} style={{ fontSize: dp(17), color: TV.accText, cursor: 'pointer', padding: `${dp(8)}px ${dp(4)}px` }}>{ctx.tt('sportPickChannel')}</span>
          {override ? (
            <span data-testid="mc-clear-override" {...station(() => setOverride(match.id, null))} style={{ fontSize: dp(17), color: TV.accText, cursor: 'pointer', padding: `${dp(8)}px ${dp(4)}px` }}>{ctx.tt('sportUseAutomatic')}</span>
          ) : null}
        </div>
        <MatchCenterData match={match} />
      </div>
      {picking ? (
        <TvChannelPicker
          model={ctx.model}
          nav={ctx.nav}
          title={ctx.tt('sportPickChannel')}
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
