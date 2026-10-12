'use client'

import { useEffect, useMemo, useState } from 'react'
import { useResultsController } from '../results-controller'
import { fetchSportDay, localDayKey } from '../sport-epg'
import { setFollowProviderId } from '../sport-store'
import { EMPTY_LEAGUE, EMPTY_TEAM, loadLeaguePage, loadTeamPage, standingsVia, type LeaguePageData, type TeamPageData } from '../team-data'
import type { LeagueTarget, TeamTarget } from '../team-model'
import type { TeamFixture } from '../team-providers'
import type { SportMatch } from '../sport-model'

/*
  Sidornas data: hämtas när sidan öppnas (en gång per öppning, och samma
  öppning igen inom några minuter kostar inget — se team-data.ts). Ingen
  klocka, ingen pollning. Utan nyckel visar sidan bara det tablån vet.
*/

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export function useTeamPageData(target: TeamTarget): TeamPageData {
  const controller = useResultsController()
  const router = controller?.router ?? null
  const [data, setData] = useState<TeamPageData>(EMPTY_TEAM)
  const ids = JSON.stringify(target.ids)
  useEffect(() => {
    if (!router || !controller) { setData({ ...EMPTY_TEAM, state: 'no-key', crest: target.crest }); return }
    let live = true
    setData({ ...EMPTY_TEAM, crest: target.crest })
    const now = Date.now()
    void loadTeamPage(router, target, {
      now,
      standings: standingsVia(controller, now),
      tz: tz(),
      onUpdate: (d) => { if (live) setData(d) },
      // Uppslaget görs en gång: id:t sparas på den följda posten (oföljda lag minns det bara i sessionen).
      onResolved: (provider, id) => { setFollowProviderId({ sport: target.sport, kind: 'team', key: target.key }, provider, id) },
    })
    return () => { live = false }
    // Målet byts bara när sidan öppnas för ett annat lag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, target.sport, target.key, ids])
  return data
}

export function useLeaguePageData(target: LeagueTarget): LeaguePageData {
  const controller = useResultsController()
  const router = controller?.router ?? null
  const [data, setData] = useState<LeaguePageData>(EMPTY_LEAGUE)
  const ref = target.ref ? `${target.ref.provider}|${target.ref.id}|${target.ref.season ?? ''}` : ''
  useEffect(() => {
    if (!router || !controller || !target.ref) { setData({ ...EMPTY_LEAGUE, state: 'no-key' }); return }
    let live = true
    setData(EMPTY_LEAGUE)
    const now = Date.now()
    void loadLeaguePage(router, target, { now, tz: tz(), standings: standingsVia(controller, now), onUpdate: (d) => { if (live) setData(d) } })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, target.sport, ref])
  return data
}

const EPG_DAYS = 7

/**
 * Tablåns matcher för de kommande matchernas dagar (högst en vecka fram):
 * lokala anrop mot värden, aldrig mot en källa. Kanalen för en kommande
 * match hittas i dem; `known` är det vyn redan har (idag, imorgon, live).
 */
export function useEpgMatches(fixtures: TeamFixture[], known: SportMatch[], now: number): SportMatch[] {
  const days = useMemo(() => {
    const until = now + EPG_DAYS * 86_400_000
    return [...new Set(fixtures.filter((f) => f.kickoff > now - 3 * 3_600_000 && f.kickoff < until).map((f) => localDayKey(f.kickoff)))].sort()
  }, [fixtures, now])
  const [loaded, setLoaded] = useState<SportMatch[]>([])
  const key = days.join(',')
  useEffect(() => {
    if (days.length === 0) { setLoaded([]); return }
    let live = true
    void Promise.all(days.map((d) => fetchSportDay(d).then((day) => day.matches, () => [] as SportMatch[]))).then((lists) => { if (live) setLoaded(lists.flat()) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  // Vyns egna matcher först: de bär källans ställning och minut.
  return useMemo(() => [...known, ...loaded.filter((m) => !known.some((k) => k.id === m.id))], [known, loaded])
}
