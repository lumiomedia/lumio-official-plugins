'use client'

import { LIVE_TV_GLOBAL_EPG_ID } from '../live-tv-data'
import type { Fixture } from './provider'
import { hostTzOffset } from './sport-epg'
import { getEpgShiftMinutes } from '../epg-shift'
import { fixtureMatchKey } from './merge'

/** `fx:källa:id` (merge.ts `fixtureMatchKey`) → EPG-matchens id (fas 1:s gruppering) och om hemma/borta är omvända. */
export type LinkMap = Record<string, { matchId: string; swapped: boolean } | null>

/** Lokalt anrop till den egna värden (`/sport/link`, samma dag och tidszon som `/sport/day`). Kostar ingen kvot. */
export async function linkFixtures(args: { day: string; fixtures: Fixture[] }): Promise<LinkMap> {
  if (args.fixtures.length === 0) return {}
  try {
    const res = await fetch('/api/live-tv/sport/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // Förskjuten tablå: värdens kandidater har tablåns egna (oförskjutna) tider.
        listId: LIVE_TV_GLOBAL_EPG_ID, day: args.day, tzOffset: hostTzOffset(args.day),
        fixtures: args.fixtures.map((f) => ({ id: fixtureMatchKey(f), sport: f.sport, home: f.home.name, away: f.away.name, league: f.league.name, kickoff: f.kickoff - getEpgShiftMinutes() * 60_000 })),
      }),
    })
    if (!res.ok) return {}
    const body = (await res.json()) as { links?: LinkMap }
    return body.links ?? {}
  } catch {
    return {}
  }
}
