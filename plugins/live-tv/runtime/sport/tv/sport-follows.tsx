'use client'

import { useEffect, useState } from 'react'
import { Chip, Segment, TV, cardStyle, dp, station } from '../../tv/tv-ui'
import { Check, PickerPanel } from '../../tv/tv-list-picker'
import { SPORT_KINDS, type SportDay, type SportKind } from '../sport-model'
import { followCandidates, nextMatchFor } from '../sport-day-model'
// `getStoredFollows`: väljarens bockar ska visa ett klick direkt, innan skalets `useFollows` hunnit rita om kontexten.
import { getFollows as getStoredFollows, isFollowing, setSportSettings, toggleFollow, type KickoffAlert, type SportFollow } from '../sport-store'
import { alertLabel, followNextLine, type SportCtx } from '../sport-ctx'
import { Crest, ellipsis, primaryBtn, sectionTitle } from './sport-parts'
import { SportIcon, SportIcons } from './sport-icons'

const same = (a: Pick<SportFollow, 'kind' | 'key'>, b: Pick<SportFollow, 'kind' | 'key'>) => a.kind === b.kind && a.key === b.key

export function SportFollows({ ctx, days }: { ctx: SportCtx; days: (SportDay | null)[] }) {
  // Avföljda ligger kvar (dämpade) tills vyn lämnas — ett felklick ska gå att ångra.
  const [shown, setShown] = useState<SportFollow[]>(ctx.follows)
  useEffect(() => {
    setShown((prev) => [...prev, ...ctx.follows.filter((f) => !prev.some((p) => same(p, f)))])
  }, [ctx.follows])
  const alertOptions: { key: KickoffAlert; label: string }[] = [
    { key: 'off', label: ctx.tt('sportAlertOff') },
    { key: '15', label: ctx.tt('sportAlert15') },
    { key: 'kickoff', label: ctx.tt('sportAlertKickoff') },
  ]
  const groups = SPORT_KINDS.map((kind) => [kind, shown.filter((f) => f.sport === kind)] as const).filter(([, list]) => list.length > 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dp(24) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(18), flexWrap: 'wrap' }}>
        <div data-testid="follows-add" {...station(ctx.openFollowPicker)} style={primaryBtn}>
          <SportIcons.Plus size={dp(20)} />
          {ctx.tt('sportFollowAdd')}
        </div>
        <span style={{ fontSize: dp(17), color: TV.muted }}>{ctx.tt('sportFollowSummary', { n: ctx.follows.length, rule: alertLabel(ctx).toLowerCase() })}</span>
        <div data-testid="follows-alert" style={{ ...cardStyle, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(12), padding: `${dp(8)}px ${dp(12)}px` }}>
          <SportIcons.Bell size={dp(20)} />
          <span style={{ fontSize: dp(17), fontWeight: 600 }}>{ctx.tt('sportKickoffAlert')}</span>
          <Segment options={alertOptions} value={ctx.settings.alert} onChange={(alert) => setSportSettings({ alert })} />
        </div>
      </div>
      <span style={{ fontSize: dp(15), color: TV.dim }}>{ctx.tt('sportAlertOnlyRunning')}</span>
      {shown.length === 0 ? <div data-testid="follows-empty" style={{ ...cardStyle, padding: dp(28), fontSize: dp(20), color: TV.muted }}>{ctx.tt('sportFollowEmpty')}</div> : null}
      {groups.map(([kind, list]) => (
        <section key={kind} data-testid={`follow-group-${kind}`} style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
            <SportIcon kind={kind} size={dp(28)} />
            <span style={sectionTitle}>{ctx.kindLabel(kind)}</span>
            <span style={{ fontSize: dp(17), color: TV.dim }}>{list.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: dp(16) }}>
            {list.map((f) => <FollowCard key={`${f.kind}:${f.key}`} ctx={ctx} follow={f} days={days} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function FollowCard({ ctx, follow, days }: { ctx: SportCtx; follow: SportFollow; days: (SportDay | null)[] }) {
  const following = isFollowing(ctx.follows, follow)
  const next = nextMatchFor(follow, days, ctx.now)
  return (
    <div data-testid="follow-card" data-following={following ? '1' : '0'} style={{ ...cardStyle, padding: dp(20), display: 'flex', flexDirection: 'column', gap: dp(10), opacity: following ? 1 : 0.55 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <Crest name={follow.name} colorKey={follow.key} size={dp(66)} />
        <div data-testid="follow-star" {...station(() => toggleFollow(follow))} aria-pressed={following ? 'true' : 'false'} aria-label={following ? ctx.tt('sportFollowingName', { name: follow.name }) : ctx.tt('sportFollowName', { name: follow.name })} style={{ marginLeft: 'auto', color: following ? '#fbbf24' : TV.dim, display: 'inline-flex', cursor: 'pointer' }}>
          <SportIcons.Star size={dp(28)} filled={following} />
        </div>
      </div>
      <span style={{ fontSize: dp(22), fontWeight: 600, ...ellipsis }}>{follow.name}</span>
      <span {...(next ? station(() => ctx.openMatch(next)) : {})} style={{ fontSize: dp(15), color: TV.muted, ...ellipsis }}>{followNextLine(ctx, follow, next)}</span>
    </div>
  )
}

export function FollowPicker({ ctx, days, onClose }: { ctx: SportCtx; days: (SportDay | null)[]; onClose: () => void }) {
  const [sport, setSport] = useState<SportKind | 'all'>('all')
  const all = followCandidates(days)
  const rows = all.filter((c) => sport === 'all' || c.sport === sport)
  const chips: { key: SportKind | 'all'; label: string }[] = [
    { key: 'all', label: ctx.tt('sportAll') },
    ...SPORT_KINDS.filter((k) => all.some((c) => c.sport === k)).map((k) => ({ key: k, label: ctx.kindLabel(k) })),
  ]
  return (
    <PickerPanel
      nav={ctx.nav}
      title={ctx.tt('sportFollowAdd')}
      onClose={onClose}
      testId="follow-picker"
      chips={(
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto' }}>
          {chips.map((chip, index) => (
            <Chip key={chip.key} data-testid={`follow-chip-${chip.key}`} active={sport === chip.key} {...station(() => setSport(chip.key), undefined, rows.length === 0 && index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(40), minHeight: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>
          ))}
        </div>
      )}
      rows={rows.map((c, index) => {
        const on = isFollowing(ctx.follows, c) || isFollowing(getStoredFollows(), c)
        return (
          <div key={`${c.kind}:${c.key}`} data-testid={`follow-row-${c.key}`} {...station(() => toggleFollow({ sport: c.sport, kind: c.kind, key: c.key, name: c.name }), undefined, index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(74), minHeight: dp(74), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
            <Check on={on} label={c.name} />
            <Crest name={c.name} colorKey={c.key} size={dp(46)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{c.name}</div>
              <div style={{ fontSize: dp(15), color: TV.dim, ...ellipsis }}>{ctx.kindLabel(c.sport)}</div>
            </div>
          </div>
        )
      })}
    />
  )
}
