'use client'

import { useEffect } from 'react'
import { writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../live-tv-data'
import { crestForFollow } from './score-model'
import type { SportMatch } from './sport-model'
import { SPORT_FOLLOWS_KEY, getFollows } from './sport-store'

/**
 * Fyller i märket på följda lag som saknar ett, ur matcher som bär det (alla inlästa dagar).
 * Läser och skriver lagringen färskt; ingen skrivning om inget ändras. Ligor har ingen logga i matchmodellen.
 */
export function backfillFollowCrests(matches: SportMatch[]): boolean {
  const current = getFollows()
  let changed = false
  const next = current.map((f) => {
    if (f.crest || f.kind !== 'team') return f
    const crest = crestForFollow(f, matches)
    if (!crest) return f
    changed = true
    return { ...f, crest }
  })
  if (changed) writePluginJson(LIVE_TV_PLUGIN_ID, SPORT_FOLLOWS_KEY, next)
  return changed
}

/** Backfill i en effekt (aldrig under render); körs om när matcherna ändras. */
export function useBackfillFollowCrests(matches: SportMatch[]): void {
  useEffect(() => { backfillFollowCrests(matches) }, [matches])
}
