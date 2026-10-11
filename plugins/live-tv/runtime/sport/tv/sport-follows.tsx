'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { Chip, Segment, TV, dp, station } from '../../tv/tv-ui'
import { PickerPanel } from '../../tv/tv-list-picker'
import { useTextPrompt } from '../../tv/tv-text-entry'
import { MIN_PROVIDER_QUERY, PROVIDER_SEARCH_DEBOUNCE_MS, matchesQuery, searchFollowTargets, type FollowHit } from '../follow-search'
import { foldTeamKey } from '../merge'
import { SPORT_KINDS, type SportDay, type SportKind } from '../sport-model'
import { followCandidates, nextMatchFor } from '../sport-day-model'
// `getStoredFollows`: väljarens bockar ska visa ett klick direkt, innan skalets `useFollows` hunnit rita om kontexten.
import { getFollows as getStoredFollows, isFollowing, setSportSettings, toggleFollow, type KickoffAlert, type SportFollow } from '../sport-store'
import { alertLabel, followNext, type SportCtx } from '../sport-ctx'
import { useBackfillFollowCrests } from '../follow-crest'
import { crestForFollow } from '../score-model'
import { Crest, ellipsis, primaryBtn, sectionTitle } from './sport-parts'
import { SportIcon, SportIcons } from './sport-icons'
import { sportCardStyle, sportDrawerStyle } from '../surface'

const same = (a: Pick<SportFollow, 'kind' | 'key'>, b: Pick<SportFollow, 'kind' | 'key'>) => a.kind === b.kind && a.key === b.key

export function SportFollows({ ctx, days }: { ctx: SportCtx; days: (SportDay | null)[] }) {
  // Avföljda ligger kvar (dämpade) tills vyn lämnas — ett felklick ska gå att ångra.
  const [shown, setShown] = useState<SportFollow[]>(ctx.follows)
  const allMatches = useMemo(() => days.flatMap((d) => d?.matches ?? []), [days])
  useBackfillFollowCrests(allMatches)
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
        {/* Påminnelsen står längst till höger; geometrin tog dagstegaren snett
            ovanför i stället (Jerry 2026-10-11: "gå över saker och kolla så
            allt syns bra på TV-mode"). Grannarna är uttalade åt båda hållen. */}
        <div data-testid="follows-add" {...station(ctx.openFollowPicker, undefined, { 'data-f-right': '[data-testid="follows-alert"] [data-f]' })} style={primaryBtn}>
          <SportIcons.Plus size={dp(20)} />
          {ctx.tt('sportFollowAdd')}
        </div>
        <span style={{ fontSize: dp(17), color: TV.muted }}>{ctx.tt('sportFollowSummary', { n: ctx.follows.length, rule: alertLabel(ctx).toLowerCase() })}</span>
        <div data-testid="follows-alert" style={{ ...sportCardStyle, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(12), padding: `${dp(8)}px ${dp(12)}px` }}>
          <SportIcons.Bell size={dp(20)} />
          <span style={{ fontSize: dp(17), fontWeight: 600 }}>{ctx.tt('sportKickoffAlert')}</span>
          <Segment size="lg" options={alertOptions} value={ctx.settings.alert} onChange={(alert) => setSportSettings({ alert })} optionAttrs={(index) => (index === 0 ? { 'data-f-left': '[data-testid="follows-add"]' } : undefined)} />
        </div>
      </div>
      <span style={{ fontSize: dp(17), color: TV.muted }}>{ctx.tt('sportAlertOnlyRunning')}</span>
      {shown.length === 0 ? <div data-testid="follows-empty" style={{ ...sportCardStyle, padding: dp(28), fontSize: dp(20), color: TV.muted }}>{ctx.tt('sportFollowEmpty')}</div> : null}
      {groups.map(([kind, list]) => (
        <section key={kind} data-testid={`follow-group-${kind}`} style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(12) }}>
            <SportIcon kind={kind} size={dp(28)} />
            <span style={sectionTitle}>{ctx.kindLabel(kind)}</span>
            <span style={{ fontSize: dp(17), color: TV.dim }}>{list.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${dp(620)}px, 1fr))`, gap: dp(10) }}>
            {list.map((f) => <FollowRow key={`${f.kind}:${f.key}`} ctx={ctx} follow={f} days={days} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

/**
 * En favorit som liggande rad i kanalradernas stil (Guiden): märket till vänster,
 * namnet med sporten som liten etikett, nästa match som huvudinfo och hjärtat
 * till höger. Hjärtat är samma som Live TV:s favoritkanaler.
 */
function FollowRow({ ctx, follow, days }: { ctx: SportCtx; follow: SportFollow; days: (SportDay | null)[] }) {
  const following = isFollowing(ctx.follows, follow)
  const next = nextMatchFor(follow, days, ctx.now)
  const info = followNext(ctx, follow, next)
  const crest = crestForFollow(follow, days.flatMap((d) => d?.matches ?? []))
  return (
    <div data-testid="follow-row" data-following={following ? '1' : '0'} style={{ ...sportCardStyle, minHeight: dp(88), display: 'flex', alignItems: 'center', gap: dp(16), padding: `${dp(10)}px ${dp(12)}px ${dp(10)}px ${dp(16)}px`, opacity: following ? 1 : 0.55, boxSizing: 'border-box' }}>
      <div {...(next ? station(() => ctx.openMatch(next)) : {})} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: dp(16), cursor: next ? 'pointer' : 'default', borderRadius: dp(10) }}>
        <Crest name={follow.name} colorKey={follow.key} size={dp(56)} src={crest} />
        <div style={{ width: dp(210), flexShrink: 0, minWidth: 0 }}>
          <div style={{ fontSize: dp(21), fontWeight: 600, ...ellipsis }}>{follow.name}</div>
          <div style={{ fontSize: dp(14), color: TV.dim, ...ellipsis }}>{ctx.kindLabel(follow.sport)}</div>
        </div>
        <div data-testid="follow-next" data-live={info?.live ? '1' : '0'} style={{ flex: 1, minWidth: 0 }}>
          {info ? (
            <>
              <div style={{ fontSize: dp(20), fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: info.live ? TV.liveText : TV.text, ...ellipsis }}>{info.when}</div>
              <div style={{ fontSize: dp(16), color: TV.muted, ...ellipsis }}>{info.what}</div>
            </>
          ) : <div style={{ fontSize: dp(16), color: TV.dim, ...ellipsis }}>{ctx.tt('sportNoUpcoming')}</div>}
        </div>
      </div>
      <div data-testid="follow-heart" {...station(() => toggleFollow(follow))} aria-pressed={following ? 'true' : 'false'} aria-label={following ? ctx.tt('sportFollowingName', { name: follow.name }) : ctx.tt('sportFollowName', { name: follow.name })} style={{ width: dp(56), height: dp(56), minHeight: dp(56), borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: following ? TV.accMix(22) : TV.s12, color: following ? TV.acc : TV.text, cursor: 'pointer' }}>
        <SportIcons.Heart size={dp(24)} filled={following} />
      </div>
    </div>
  )
}

/** Väljarens markering: hjärtat (fyllt orange = favorit), samma plats på varje rad. */
function HeartMark({ on }: { on: boolean }) {
  return (
    <span data-testid="follow-row-heart" data-on={on ? '1' : '0'} style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', color: on ? TV.acc : TV.dim }}>
      <SportIcons.Heart size={dp(24)} filled={on} />
    </span>
  )
}

export function FollowPicker({ ctx, days, onClose }: { ctx: SportCtx; days: (SportDay | null)[]; onClose: () => void }) {
  const [sport, setSport] = useState<SportKind | 'all'>('all')
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<FollowHit[]>([])
  const tv = useTvMode()
  const prompt = useTextPrompt({ pushLayer: ctx.nav.pushLayer })
  const hasKey = !!ctx.settings.apiKey
  const searchSport: SportKind = sport === 'all' ? 'football' : sport
  // Listan filtreras per tecken (lokalt, gratis). Källan frågas först efter en paus i skrivandet
  // och med minst tre tecken: varje sökning är ett anrop mot kvoten.
  useEffect(() => {
    const q = query.trim()
    if (!hasKey || q.length < MIN_PROVIDER_QUERY) { setHits([]); return }
    let live = true
    const timer = setTimeout(() => {
      void searchFollowTargets(searchSport, q).then((res) => { if (live) setHits(res) }, () => { if (live) setHits([]) })
    }, PROVIDER_SEARCH_DEBOUNCE_MS)
    return () => { live = false; clearTimeout(timer) }
  }, [query, searchSport, hasKey])
  const all = followCandidates(days)
  const rows = all.filter((c) => (sport === 'all' || c.sport === sport) && matchesQuery(c, query))
  const hitFollow = (hit: FollowHit): SportFollow => ({
    sport: hit.sport,
    kind: hit.kind,
    // Id:t är källans som svarade (sportens källa kan vara en annan än den primära).
    key: hit.kind === 'league' ? `fx:${hit.provider ?? ctx.settings.provider}:${hit.id}` : foldTeamKey(hit.name),
    name: hit.name,
    providerIds: { [hit.provider ?? ctx.settings.provider]: hit.id },
    ...(hit.crest ? { crest: hit.crest } : {}),
  })
  const extra = hits.map((hit) => [hit, hitFollow(hit)] as const).filter(([, f]) => !rows.some((c) => c.kind === f.kind && c.key === f.key))
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
      surface={sportDrawerStyle}
      chips={(
        <div style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
        {tv ? (
            <div data-testid="follow-search" {...station(() => prompt.ask(ctx.tt('sportFollowSearch'), query, setQuery))} style={{ height: dp(48), minHeight: dp(48), padding: `0 ${dp(16)}px`, borderRadius: dp(10), background: TV.s08, border: `1px solid ${TV.lineCard}`, display: 'flex', alignItems: 'center', fontSize: dp(17), color: query ? TV.text : TV.dim, cursor: 'pointer' }}>{query || ctx.tt('sportFollowSearch')}</div>
          ) : (
            <input data-testid="follow-search" type="search" value={query} placeholder={ctx.tt('sportFollowSearch')} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false}
              style={{ height: dp(48), borderRadius: dp(10), border: `1px solid ${TV.lineStrong}`, background: 'rgba(0,0,0,0.25)', color: TV.text, padding: `0 ${dp(14)}px`, fontSize: dp(17) }} />
          )}
        {prompt.node}
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto' }}>
          {chips.map((chip, index) => (
            <Chip key={chip.key} data-testid={`follow-chip-${chip.key}`} active={sport === chip.key} {...station(() => setSport(chip.key), undefined, rows.length === 0 && index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(44), minHeight: dp(44), fontSize: dp(17), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>
          ))}
        </div>
        </div>
      )}
      rows={[...rows.map((c, index) => {
        const on = isFollowing(ctx.follows, c) || isFollowing(getStoredFollows(), c)
        return (
          <div key={`${c.kind}:${c.key}`} data-testid={`follow-row-${c.key}`} {...station(() => toggleFollow({ sport: c.sport, kind: c.kind, key: c.key, name: c.name, ...(c.crest ? { crest: c.crest } : {}) }), undefined, index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(74), minHeight: dp(74), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
            <Crest name={c.name} colorKey={c.key} size={dp(46)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{c.name}</div>
              <div style={{ fontSize: dp(15), color: TV.dim, ...ellipsis }}>{ctx.kindLabel(c.sport)}</div>
            </div>
            <HeartMark on={on} />
          </div>
        )
      }), ...extra.map(([hit, follow]) => {
        const on = isFollowing(ctx.follows, follow) || isFollowing(getStoredFollows(), follow)
        return (
          <div key={`hit-${hit.kind}-${hit.id}`} data-testid={`follow-hit-${hit.kind}-${hit.id}`} {...station(() => toggleFollow(follow))} style={{ height: dp(74), minHeight: dp(74), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
            <Crest name={hit.name} colorKey={follow.key} src={hit.crest} size={dp(46)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: dp(19), fontWeight: 600, ...ellipsis }}>{hit.name}</div>
              <div style={{ fontSize: dp(15), color: TV.dim, ...ellipsis }}>{[ctx.kindLabel(hit.sport), hit.country].filter(Boolean).join(' · ')}</div>
            </div>
            <HeartMark on={on} />
          </div>
        )
      })]}
    />
  )
}
