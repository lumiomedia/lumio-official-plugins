import { useMemo } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { catchUpAcross, type CatchUpItem } from '../catch-up'
import type { EpgProgramme, NowNextLater } from '../epg/types'
import { pickReplayChannels } from '../view-helpers'
import { startOfLocalDay, type LiveTvModel } from '../live-tv-model'
import { useSchedules } from '../hooks/useSchedules'
import { groupCounts } from './group-chips'
import { FAVS_GROUP } from './tv-guide-shared'

/**
 * RADERNA I KANALER, LAYOUT UPPLEVELSE (handoff v2 "Rows").
 *
 * Toppkortet + fem rader. Ingen tittarstatistik finns, så "Sänds nu" är
 * senast sedda + favoriter först och sedan spellistans ordning. Varje rad är
 * kapad (tusentals Xtream-kanaler ska inte ge tusentals kort), och en tom rad
 * utelämnas helt.
 */

export type XpItem = {
  kind: 'live' | 'continue' | 'replay' | 'upcoming' | 'category'
  key: string
  channel?: M3uChannel
  programme?: EpgProgramme | null
  category?: string
  count?: number
  catchUp?: CatchUpItem
}
export type XpRowId = 'continue' | 'onNow' | 'yours' | 'soon' | 'explore'
export interface XpRow { id: XpRowId; items: XpItem[] }

const CONTINUE_MAX = 12
const ON_NOW_MAX = 24
const YOURS_MAX = 30
const SOON_MAX = 20
const SOON_WINDOW_MS = 2 * 3_600_000
/** Börjar snart hämtar tablå för högst så här många kanaler (favoriter + senast sedda). */
const SOON_CHANNELS = 20
const EXPLORE_MAX = 24
const REPLAY_DAYS = 3

export interface XpInput {
  channels: readonly M3uChannel[]
  favourites: readonly M3uChannel[]
  recent: readonly M3uChannel[]
  nowFor: (channel: M3uChannel) => NowNextLater
  replays: readonly CatchUpItem[]
  /** Kandidaterna till Börjar snart (alla program i det hämtade fönstret). */
  soon: readonly { channel: M3uChannel; programme: EpgProgramme }[]
  groups: readonly string[]
  counts: ReadonlyMap<string, number>
  chip: string | null
  nowMs: number
}

const liveItem = (prefix: string, channel: M3uChannel, nowFor: XpInput['nowFor']): XpItem =>
  ({ kind: 'live', key: `${prefix}:${channelKey(channel)}`, channel, programme: nowFor(channel).now })
const replayItem = (r: CatchUpItem): XpItem =>
  ({ kind: 'replay', key: `replay:${channelKey(r.channel)}:${r.programme.start}`, channel: r.channel, programme: r.programme, catchUp: r })
const continueItem = (channel: M3uChannel, nowFor: XpInput['nowFor']): XpItem =>
  ({ kind: 'continue', key: `continue:${channelKey(channel)}`, channel, programme: nowFor(channel).now })

/** Unika kanaler ur källorna i ordning, filtrerade, kapade — slutar läsa vid taket. */
function take(sources: readonly (readonly M3uChannel[])[], keep: (c: M3uChannel) => boolean, max: number): M3uChannel[] {
  const seen = new Set<string>()
  const out: M3uChannel[] = []
  for (const source of sources) {
    for (const channel of source) {
      if (out.length >= max) return out
      const key = channelKey(channel)
      if (seen.has(key) || !keep(channel)) continue
      seen.add(key)
      out.push(channel)
    }
  }
  return out
}

export function buildExperienceRows(input: XpInput): { featured: XpItem | null; rows: XpRow[] } {
  const { channels, favourites, recent, nowFor, replays, soon, groups, counts, chip, nowMs } = input
  const favKeys = new Set(favourites.map(channelKey))
  const inChip = (c: M3uChannel) => (chip === null ? true : chip === FAVS_GROUP ? favKeys.has(channelKey(c)) : c.group === chip)

  const onNow = take([recent, favourites, channels], inChip, ON_NOW_MAX).map((c) => liveItem('now', c, nowFor))
  // Toppkortet = första kortet i Sänds nu (Jerry 2026-10-30): heron förladdar
  // och spelar det, så förhandsvisningen redan är igång när man går ner i raden.
  // Utan något som sänds: senaste reprisen, sedan första kanalen.
  const featured: XpItem | null = onNow[0]
    ?? (replays[0] ? replayItem(replays[0]) : channels[0] ? liveItem('live', channels[0], nowFor) : null)

  const continueItems = [...recent.map((c) => continueItem(c, nowFor)), ...replays.map(replayItem)].slice(0, CONTINUE_MAX)
  const yours = take([favourites, channels], inChip, YOURS_MAX).map((c) => liveItem('yours', c, nowFor))
  const upcoming = soon
    .filter(({ programme }) => programme.start > nowMs && programme.start <= nowMs + SOON_WINDOW_MS)
    .slice()
    .sort((a, b) => a.programme.start - b.programme.start)
    .slice(0, SOON_MAX)
    .map(({ channel, programme }): XpItem => ({ kind: 'upcoming', key: `soon:${channelKey(channel)}:${programme.start}`, channel, programme }))
  const explore = groups
    .filter((g) => (counts.get(g) ?? 0) > 0)
    .slice(0, EXPLORE_MAX)
    .map((g): XpItem => ({ kind: 'category', key: `cat:${g}`, category: g, count: counts.get(g) ?? 0 }))

  const rows: XpRow[] = [
    { id: 'onNow', items: onNow },
    { id: 'continue', items: continueItems },
    { id: 'yours', items: yours },
    { id: 'soon', items: upcoming },
    { id: 'explore', items: explore },
  ]
  return { featured, rows: rows.filter((r) => r.items.length > 0) }
}

/** Halvtimmesjusterat fönster så att minuttick inte ger ett nytt tablåanrop. */
const HALF_HOUR = 30 * 60_000

export function useExperienceRows(model: LiveTvModel, chip: string | null): { featured: XpItem | null; rows: XpRow[] } {
  const favourites = model.favouriteChannels
  const recent = useMemo(() => model.history.map((h) => model.byUrl.get(h.url)).filter((c): c is M3uChannel => Boolean(c)), [model.history, model.byUrl])

  // Repriser som hubben: favoriter + senast sedda med arkiv, tre dygn bakåt.
  const replayChannels = useMemo(() => pickReplayChannels(favourites, recent), [favourites, recent])
  const replayTo = startOfLocalDay(model.nowMs, 1)
  const { schedules: replaySchedules } = useSchedules(replayChannels, replayTo - REPLAY_DAYS * 86_400_000, replayTo)
  const replays = useMemo(() => catchUpAcross(replayChannels, replaySchedules, model.nowMs, 8), [replayChannels, replaySchedules, model.nowMs])

  // Börjar snart: bara favoriter + senast sedda (≤ 20 kanaler) — aldrig hela spellistan.
  const soonChannels = useMemo(() => take([favourites, recent], () => true, SOON_CHANNELS), [favourites, recent])
  const soonFrom = Math.floor(model.nowMs / HALF_HOUR) * HALF_HOUR
  const { schedules: soonSchedules } = useSchedules(soonChannels, soonFrom, soonFrom + SOON_WINDOW_MS + HALF_HOUR)
  const soon = useMemo(() => soonChannels.flatMap((channel) => (soonSchedules[channelKey(channel)] ?? []).map((programme) => ({ channel, programme }))), [soonChannels, soonSchedules])

  const counts = useMemo(() => groupCounts(model.channels), [model.channels])
  return useMemo(() => buildExperienceRows({
    channels: model.channels, favourites, recent, nowFor: model.nowFor, replays, soon, groups: model.groups, counts, chip, nowMs: model.nowMs,
  }), [model.channels, favourites, recent, model.nowFor, replays, soon, model.groups, counts, chip, model.nowMs])
}
