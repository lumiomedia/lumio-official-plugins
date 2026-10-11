'use client'

import { useState } from 'react'
import { station } from '../../tv/tv-ui'
import { useTvText } from '../../tv/tv-strings'
import { MT, ellipsis } from '../../tv/mobile/mobile-tokens'
import { searchProviderTeams } from '../follow-search'
import { foldTeamKey } from '../merge'
import { isFollowing, toggleFollow, useFollows, useSportSettings } from '../sport-store'
import type { TeamHit } from '../provider'
import type { SportKind } from '../sport-model'
import { PhoneCrest } from './sport-results-phone'

/**
 * Följer på telefon: fritext mot källan, som FollowPicker på TV (Task 15 punkt 5).
 * Frågan SKICKAS (Sök eller Enter), aldrig per tecken: varje sökning är ett
 * anrop av typen `search` och skyddas av reserven i budget.ts.
 */
export function PhoneFollowSearch({ sport }: { sport: SportKind }) {
  const { tt } = useTvText()
  const settings = useSportSettings()
  const follows = useFollows()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<TeamHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  if (!settings.apiKey) return null
  const tooShort = q.trim().length < 3
  const submit = async () => {
    if (busy || tooShort) return
    setBusy(true)
    try {
      setHits(await searchProviderTeams(sport, q))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div data-testid="phone-follow-search" style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: `1px solid ${MT.line08}` }}>
      <form onSubmit={(e) => { e.preventDefault(); void submit() }} style={{ display: 'flex', gap: 8 }}>
        {/* 16 px: mindre text zoomar in sidan på iOS när fältet får fokus. */}
        <input data-testid="phone-follow-search-input" type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tt('sportFollowSearch')} style={{ flex: 1, minWidth: 0, height: MT.HIT, borderRadius: 12, border: `1px solid ${MT.line14}`, background: MT.s07, color: MT.text, padding: '0 12px', fontSize: 16, fontFamily: MT.font }} />
        <button type="submit" data-testid="phone-follow-search-go" disabled={busy || tooShort} style={{ height: MT.HIT, padding: '0 16px', borderRadius: 12, border: 'none', background: MT.acc, color: MT.onAcc, fontSize: 15, fontWeight: 600, fontFamily: MT.font, opacity: busy || tooShort ? 0.5 : 1 }}>{tt('sportSearchSubmit')}</button>
      </form>
      {hits?.map((hit) => {
        const follow = { sport, kind: 'team' as const, key: foldTeamKey(hit.name), name: hit.name, providerIds: { [settings.provider]: hit.id } }
        const on = isFollowing(follows, follow)
        return (
          <div key={hit.id} data-testid={`phone-follow-hit-${hit.id}`} {...station(() => toggleFollow(follow))} style={{ minHeight: 48, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <PhoneCrest name={hit.name} src={hit.crest} size={26} />
            <span style={{ flex: 1, fontSize: 15, ...ellipsis }}>{hit.name}</span>
            {hit.country ? <span style={{ fontSize: 13, color: MT.muted, flexShrink: 0 }}>{hit.country}</span> : null}
            <span style={{ color: on ? '#fbbf24' : MT.dim, flexShrink: 0 }}>{on ? '★' : '☆'}</span>
          </div>
        )
      })}
      {hits && hits.length === 0 ? <div style={{ fontSize: 14, color: MT.muted }}>{tt('sportFollowSearchEmpty')}</div> : null}
    </div>
  )
}
