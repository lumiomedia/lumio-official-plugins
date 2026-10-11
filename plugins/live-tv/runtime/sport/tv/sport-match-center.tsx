'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { channelKey } from '../../live-tv-data'
import { ChannelArt, RoundBtn, TV, dp, station } from '../../tv/tv-ui'
import { TvChannelPicker } from '../../tv/tv-channel-picker'
import { matchTitle, sourceChannel, type SportMatch } from '../sport-model'
import { followState, rankedSources, statusAt } from '../sport-day-model'
import { setOverride, toggleFollow } from '../sport-store'
import { timeLine, type SportCtx } from '../sport-ctx'
import { Crest, StatusTag, ellipsis, overline, primaryBtn } from './sport-parts'
import { SportIcons } from './sport-icons'

const pill = (on: boolean): CSSProperties => ({
  height: dp(52), minHeight: dp(52), padding: `0 ${dp(20)}px`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: dp(8),
  fontSize: dp(17), fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  background: on ? 'rgba(251,191,36,0.16)' : TV.s10, color: on ? '#fde68a' : TV.text, border: `1px solid ${on ? 'rgba(251,191,36,0.45)' : TV.lineCard}`,
})

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
      <div ref={rootRef} data-testid="match-center" data-panel-root="" data-live-tv-layer="" data-scroll="" role="dialog" aria-label={matchTitle(match)} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(840)}px, 100%)`, zIndex: 60, background: TV.panel, borderLeft: '1px solid rgba(255,255,255,0.16)', padding: `${dp(28)}px ${dp(32)}px`, display: 'flex', flexDirection: 'column', gap: dp(20), overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
          <StatusTag match={match} ctx={ctx} />
          <span style={{ fontSize: dp(17), color: TV.muted, ...ellipsis }}>{context}</span>
          <RoundBtn data-testid="mc-close" {...station(onClose)} aria-label={ctx.tt('sportClose')} style={{ marginLeft: 'auto' }}>✕</RoundBtn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: dp(20) }}>
          {match.home && match.away ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
                <Crest name={match.home} colorKey={match.homeKey ?? match.home} size={dp(99)} />
                <span style={{ fontSize: dp(22), fontWeight: 600, ...ellipsis }}>{match.home}</span>
              </div>
              <span style={{ fontSize: dp(24), fontWeight: 600, color: st === 'live' ? TV.liveText : TV.muted, whiteSpace: 'nowrap' }}>{timeLine(match, ctx)}</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
                <Crest name={match.away} colorKey={match.awayKey ?? match.away} size={dp(99)} />
                <span style={{ fontSize: dp(22), fontWeight: 600, ...ellipsis }}>{match.away}</span>
              </div>
            </>
          ) : (
            <div style={{ gridColumn: '1 / 4', textAlign: 'center' }}>
              <div style={{ fontSize: dp(30), fontWeight: 600 }}>{matchTitle(match)}</div>
              <div style={{ fontSize: dp(20), color: TV.muted }}>{timeLine(match, ctx)}</div>
            </div>
          )}
        </div>

        <div data-row="" style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap' }}>
          {match.home && match.homeKey ? (
            <div data-testid="mc-follow-home" {...station(() => follow('team', match.homeKey, match.home))} aria-pressed={fs.home ? 'true' : 'false'} style={pill(fs.home)}>
              <SportIcons.Star size={dp(18)} filled={fs.home} />
              {fs.home ? ctx.tt('sportFollowingName', { name: match.home }) : ctx.tt('sportFollowName', { name: match.home })}
            </div>
          ) : null}
          {match.away && match.awayKey ? (
            <div data-testid="mc-follow-away" {...station(() => follow('team', match.awayKey, match.away))} aria-pressed={fs.away ? 'true' : 'false'} style={pill(fs.away)}>
              <SportIcons.Star size={dp(18)} filled={fs.away} />
              {fs.away ? ctx.tt('sportFollowingName', { name: match.away }) : ctx.tt('sportFollowName', { name: match.away })}
            </div>
          ) : null}
          {match.leagueKey ? (
            <div data-testid="mc-follow-league" {...station(() => follow('league', match.leagueKey, match.league))} aria-pressed={fs.league ? 'true' : 'false'} style={pill(fs.league)}>
              <SportIcons.Star size={dp(18)} filled={fs.league} />
              {fs.league ? ctx.tt('sportFollowingName', { name: match.league }) : ctx.tt('sportFollowName', { name: match.league })}
            </div>
          ) : null}
          {ranked.length > 0 && st !== 'finished' ? (
            <div data-testid="mc-remind" {...station(() => ctx.toggleRemind(match))} aria-pressed={ctx.isReminded(match) ? 'true' : 'false'} style={pill(false)}>
              <SportIcons.Bell size={dp(18)} />
              {ctx.isReminded(match) ? ctx.tt('sportReminded') : ctx.tt('sportRemindMe')}
            </div>
          ) : null}
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
        <div data-testid="mc-pick-channel" {...station(() => setPicking(true))} style={{ display: 'flex', alignItems: 'center', gap: dp(14), padding: `${dp(14)}px ${dp(16)}px`, borderRadius: dp(12), background: TV.s08, border: `1px solid ${TV.lineCard}`, cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: dp(19), fontWeight: 600 }}>{ctx.tt('sportPickChannel')}</div>
            <div style={{ fontSize: dp(15), color: TV.muted }}>{ctx.tt('sportPickChannelSub')}</div>
          </div>
          <span aria-hidden="true">›</span>
        </div>
        {override ? (
          <div data-testid="mc-clear-override" {...station(() => setOverride(match.id, null))} style={{ fontSize: dp(17), color: TV.accText, cursor: 'pointer', padding: `${dp(8)}px ${dp(4)}px` }}>{ctx.tt('sportUseAutomatic')}</div>
        ) : null}
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
