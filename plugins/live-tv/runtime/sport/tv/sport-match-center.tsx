'use client'

import type { SportMatch } from '../sport-model'
import type { SportCtx } from '../sport-ctx'
import { MatchInfoDrawer } from '../match-info/match-info-drawer'

/** TV och skrivbord: matchinfon som högerlåda (själva trädet delas med telefonen). */
export function SportMatchCenter({ ctx, match, onClose }: { ctx: SportCtx; match: SportMatch; onClose: () => void }) {
  return <MatchInfoDrawer ctx={ctx} match={match} onClose={onClose} />
}
