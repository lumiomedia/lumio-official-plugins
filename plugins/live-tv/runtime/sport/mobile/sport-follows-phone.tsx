'use client'

import { useEffect, useMemo, useState } from 'react'
import { station } from '../../tv/tv-ui'
import { ellipsis } from '../../tv/mobile/mobile-tokens'
import { MIcons } from '../../tv/mobile/mobile-icons'
import { SPORT_KINDS, type SportDay, type SportKind } from '../sport-model'
import { nextMatchFor } from '../sport-day-model'
import { followAlert, isFollowing, setFollowAlert, toggleFollow, type KickoffAlert, type SportFollow } from '../sport-store'
import { followNextLine, type SportCtx } from '../sport-ctx'
import { useBackfillFollowCrests } from '../follow-crest'
import { crestForFollow } from '../score-model'
import { SportIcon } from '../sport-icons'
import { nextAlert } from './phone-sport-model'
import { P, PIcons, PhoneTeamCrest, cardStyle } from './phone-sport-parts'

/*
  Mina lag på telefon (handoffen): per sport, rader med märke, nästa match,
  klockpillen (Av / 15 min / Avspark, per lag) och hjärtat. Handoffen ritar en
  gul stjärna — Lumio följer med det orange hjärtat. Avföljda ligger kvar
  dämpade tills vyn lämnas, så ett feltryck går att ångra.
*/

const same = (a: Pick<SportFollow, 'kind' | 'key'>, b: Pick<SportFollow, 'kind' | 'key'>) => a.kind === b.kind && a.key === b.key

export function PhoneFollows({ ctx, days, onAdd }: { ctx: SportCtx; days: (SportDay | null)[]; onAdd: (sport: SportKind) => void }) {
  const [shown, setShown] = useState<SportFollow[]>(ctx.follows)
  const allMatches = useMemo(() => days.flatMap((d) => d?.matches ?? []), [days])
  useBackfillFollowCrests(allMatches)
  useEffect(() => {
    // Nya följda läggs till; klockans ändring skrivs över på de som redan står kvar.
    setShown((prev) => [...prev.map((p) => ctx.follows.find((f) => same(f, p)) ?? p), ...ctx.follows.filter((f) => !prev.some((p) => same(p, f)))])
  }, [ctx.follows])
  const groups = SPORT_KINDS.map((kind) => [kind, shown.filter((f) => f.sport === kind)] as const).filter(([, list]) => list.length > 0)
  return (
    <>
      <span data-testid="sport-follows-meta" style={{ fontSize: 13, color: P.muted70, flexShrink: 0 }}>{`${ctx.tt('sportFollowCount', { n: ctx.follows.length })} · ${ctx.tt('sportFollowBellHint').toLocaleLowerCase(ctx.locale)}`}</span>
      {groups.length === 0 ? (
        <div data-testid="sport-phone-follow-empty" style={{ borderRadius: 14, border: '1px dashed rgba(255,255,255,0.24)', padding: '28px 16px', textAlign: 'center', fontSize: 15, color: 'rgba(243,244,248,0.75)', flexShrink: 0 }}>{ctx.tt('sportFollowEmpty')}</div>
      ) : null}
      {groups.map(([kind, list]) => (
        <section key={kind} data-testid={`sport-phone-follow-group-${kind}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SportIcon kind={kind} size={18} />
            <span style={{ fontSize: 17, fontWeight: 600 }}>{ctx.kindLabel(kind)}</span>
          </div>
          {list.map((f) => <FollowRow key={`${f.kind}:${f.key}`} ctx={ctx} follow={f} days={days} />)}
          <div data-testid={`sport-phone-follow-add-${kind}`} {...station(() => onAdd(kind))} style={{ height: 48, flexShrink: 0, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.26)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 14, fontWeight: 600, color: P.muted80, cursor: 'pointer' }}>
            <MIcons.Plus size={16} />{ctx.tt('sportAddTeams')}
          </div>
        </section>
      ))}
      {groups.length === 0 ? (
        <div data-testid="sport-phone-follow-add" {...station(() => onAdd('football'))} style={{ height: 48, flexShrink: 0, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.26)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 14, fontWeight: 600, color: P.muted80, cursor: 'pointer' }}>
          <MIcons.Plus size={16} />{ctx.tt('sportFollowAdd')}
        </div>
      ) : null}
      <span style={{ fontSize: 12, color: P.muted60, flexShrink: 0 }}>{ctx.tt('sportAlertOnlyRunning')}</span>
    </>
  )
}

function FollowRow({ ctx, follow, days }: { ctx: SportCtx; follow: SportFollow; days: (SportDay | null)[] }) {
  const on = isFollowing(ctx.follows, follow)
  const next = nextMatchFor(follow, days, ctx.now)
  const crest = crestForFollow(follow, days.flatMap((d) => d?.matches ?? []))
  const alert = followAlert(follow, ctx.settings.alert)
  const alertText = (a: KickoffAlert) => (a === 'off' ? ctx.tt('sportAlertOff') : a === '15' ? ctx.tt('sportAlertShort15') : ctx.tt('sportAlertShortKickoff'))
  const ruleText = (a: KickoffAlert) => (a === 'off' ? ctx.tt('sportAlertOff') : a === '15' ? ctx.tt('sportAlert15') : ctx.tt('sportAlertKickoff'))
  const cycle = () => {
    const n = nextAlert(alert)
    setFollowAlert(follow, n)
    ctx.nav.toast(ctx.tt('sportAlertFor', { name: follow.name, rule: ruleText(n).toLocaleLowerCase(ctx.locale) }))
  }
  return (
    <div data-testid="sport-phone-follow" data-following={on ? '1' : '0'} {...station(() => { if (next) ctx.openMatch(next) })}
      style={{ ...cardStyle, minHeight: 64, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px 8px 12px', opacity: on ? 1 : 0.55, cursor: next ? 'pointer' : 'default', flexShrink: 0 }}>
      <PhoneTeamCrest name={follow.name} colorKey={follow.key} src={crest} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{follow.name}</div>
        <div style={{ fontSize: 12, color: P.muted70, ...ellipsis }}>{followNextLine(ctx, follow, next)}</div>
      </div>
      {on ? (
        <div data-testid="sport-phone-follow-bell" data-alert={alert} {...station(cycle)} onClick={(e) => { e.stopPropagation(); cycle() }} aria-label={ctx.tt('sportAlertFor', { name: follow.name, rule: ruleText(alert) })}
          style={{ height: 30, padding: '0 8px', borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: alert !== 'off' ? 'rgba(244,132,95,0.2)' : 'rgba(252,252,255,0.10)', color: alert !== 'off' ? P.coralLight : P.muted70 }}>
          {alert !== 'off' ? <PIcons.BellOn /> : <PIcons.BellOff />}{alertText(alert)}
        </div>
      ) : null}
      <div data-testid="sport-phone-follow-heart" {...station(() => toggleFollow(follow))} onClick={(e) => { e.stopPropagation(); toggleFollow(follow) }} aria-pressed={on ? 'true' : 'false'} aria-label={on ? ctx.tt('sportFollowingName', { name: follow.name }) : ctx.tt('sportFollowName', { name: follow.name })}
        style={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', color: on ? P.coral : P.text, cursor: 'pointer' }}>
        <MIcons.Heart size={20} filled={on} />
      </div>
    </div>
  )
}
