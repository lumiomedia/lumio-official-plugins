'use client'

import { useCallback, useState } from 'react'
import type { SportCtx } from '../sport-ctx'
import type { SportMatch } from '../sport-model'
import type { LeagueTarget, TeamTarget } from '../team-model'
import { LeaguePage } from './league-page'
import { TeamPage } from './team-page'

/*
  Lag- och ligasidorna som en stapel i skalet (TV, skrivbord, telefon, och
  Sport som egen sida). En sida öppnad ur en annan läggs ovanpå; Bakåt tar
  bort den översta och lämnar resten — man kommer tillbaka dit man var.
*/

export type SportPageEntry = { kind: 'team'; target: TeamTarget } | { kind: 'league'; target: LeagueTarget }
/** Längre kedjor än så blir bara ett sätt att tappa bort sig; den äldsta faller bort. */
const MAX_DEPTH = 6

export function useSportPages(): { pages: SportPageEntry[]; openTeam(t: TeamTarget): void; openLeague(t: LeagueTarget): void; pop(): void } {
  const [pages, setPages] = useState<SportPageEntry[]>([])
  const push = useCallback((p: SportPageEntry) => setPages((list) => [...list, p].slice(-MAX_DEPTH)), [])
  const openTeam = useCallback((target: TeamTarget) => push({ kind: 'team', target }), [push])
  const openLeague = useCallback((target: LeagueTarget) => push({ kind: 'league', target }), [push])
  const pop = useCallback(() => setPages((list) => list.slice(0, -1)), [])
  return { pages, openTeam, openLeague, pop }
}

/** `matches` = det vyn redan har (idag, imorgon, med livestatus): nu/nästa och kanalerna läses ur dem. */
export function SportPages({ ctx, pages, matches, phone, onPop }: { ctx: SportCtx; pages: SportPageEntry[]; matches: SportMatch[]; phone: boolean; onPop(): void }) {
  return (
    <>
      {pages.map((p, i) => {
        const key = `${i}:${p.kind}:${p.target.key}`
        return p.kind === 'team'
          ? <TeamPage key={key} ctx={ctx} target={p.target} matches={matches} depth={i} phone={phone} onClose={onPop} />
          : <LeaguePage key={key} ctx={ctx} target={p.target} depth={i} phone={phone} onClose={onPop} />
      })}
    </>
  )
}
