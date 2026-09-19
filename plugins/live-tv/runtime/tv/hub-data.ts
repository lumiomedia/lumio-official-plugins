import { useMemo, useState } from 'react'
import type { M3uChannel } from '../live-tv-data'
import { catchUpAcross } from '../catch-up'
import { pickReplayChannels } from '../view-helpers'
import { startOfLocalDay, type LiveTvModel } from '../live-tv-model'
import { useEpgLoadStatus } from '../hooks/useEpgLoadStatus'
import { useSchedules } from '../hooks/useSchedules'
import { pickSpotlight } from './tv-spotlight'

/** "Alla kanaler" visas i steg om 36 — Visa fler lägger på ett steg till. */
export const ALL_STEP = 36
const MAX_CHIPS = 12
/** Repriser: hur långt bakåt tablån hämtas (urvalet av kanaler görs i view-helpers). */
const REPLAY_DAYS = 3

/**
 * Hubbens data, delad mellan skrivbords-/TV-grenen och telefongrenen (fas 3):
 * samma urval, samma filter och samma steg — bara antalet spotlightkort skiljer.
 */
export function useHubData(model: LiveTvModel, spotlightCount: number) {
  const [group, setGroup] = useState<string | null>(null)
  const [visible, setVisible] = useState(ALL_STEP)
  const epgStatus = useEpgLoadStatus(model.epgListId, model.epgUrls)

  const favourites = model.favouriteChannels
  const recent = useMemo(() => model.history.map((h) => model.byUrl.get(h.url)).filter((c): c is M3uChannel => Boolean(c)), [model.history, model.byUrl])
  // Ett frö per besök: favoriterna blandas när hubben monteras och står
  // sedan stilla (minuttick och lagringsändringar ändrar inte ordningen).
  const [spotlightSeed] = useState(() => Math.floor(Math.random() * 0xffffffff))
  const spotlight = useMemo(() => pickSpotlight({ favourites, recent, channels: model.channels, nowFor: model.nowFor, count: spotlightCount, seed: spotlightSeed }), [favourites, recent, model.channels, model.nowFor, spotlightCount, spotlightSeed])
  /**
   * Repriser: favoriter och nyss sedda kanaler med arkiv (Xtream tv_archive),
   * inte hela spellistan. Tablån bor i appen sedan lagring v2, så varje kanal
   * i urvalet är en nyckel i ett fönsteranrop — 200 kanaler × 3 dygn vid varje
   * montering för ett band med åtta kort var den dyraste frågan i hela vyn.
   */
  const replayChannels = useMemo(() => pickReplayChannels(favourites, recent), [favourites, recent])
  const replayWindow = useMemo(() => {
    const to = startOfLocalDay(model.nowMs, 1)
    return { from: to - REPLAY_DAYS * 86_400_000, to }
  }, [model.nowMs])
  const { schedules: replaySchedules } = useSchedules(replayChannels, replayWindow.from, replayWindow.to)
  const replays = useMemo(() => catchUpAcross(replayChannels, replaySchedules, model.nowMs, 8), [replayChannels, replaySchedules, model.nowMs])
  const chips = useMemo(() => model.groups.slice(0, MAX_CHIPS), [model.groups])
  const filtered = useMemo(() => {
    if (group === '__favs') return favourites
    if (group) return model.channels.filter((c) => c.group === group)
    return model.channels
  }, [group, favourites, model.channels])
  const shown = filtered.slice(0, visible)
  return { favourites, recent, spotlight, replays, chips, filtered, shown, group, setGroup, visible, setVisible, epgStatus }
}
