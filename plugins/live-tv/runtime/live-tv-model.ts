'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { useLiveTvEpgCache } from './hooks/useLiveTvEpgCache'
import { computeNowNextLater, getChannelSchedule } from './epg/lookup'
import { buildNameToTvgIdIndex, resolveTvgId } from './epg/name-match'
import type { EpgCacheEntry, EpgProgramme, NowNextLater } from './epg/types'
import { getChannelHistory, onChannelHistoryChanged, type ChannelHistoryEntry } from './channel-history'
import { useReminders, type Reminder } from './reminders'
import { useLockedChannelKeys } from './channel-locks'
import {
  LIVE_TV_GLOBAL_EPG_ID,
  channelKey,
  getAllLiveTvEpgUrls,
  getLiveTvLists,
  getPinnedLiveTvKeys,
  onLiveTvListsChanged,
  onPinnedLiveTvKeysChanged,
  togglePinnedLiveTvChannel,
  type LiveTvList,
  type M3uChannel,
} from './live-tv-data'
import { getActivePlaylistId, onActivePlaylistChanged, setActivePlaylistId } from './tv/tv-settings-store'

/**
 * Delad datamodell för Live TV-sidorna. Allt underlag är lokalt: kanallistor,
 * favoriter, historik, påminnelser, lås och den EPG-cache som redan hämtas.
 * Ett namnindex byggs för hela vyn i stället för ett per kort.
 */

const EMPTY: NowNextLater = { now: null, next: null, later: null }
const PLACEHOLDER_NAME_RE = /^[\s=\-_*•·]+|=+/
export const MAX_GROUP_CHIPS = 8

export function isPlayableChannel(channel: M3uChannel): boolean {
  if (!channel.url) return false
  const trimmedName = channel.name.trim()
  if (!trimmedName) return false
  if (PLACEHOLDER_NAME_RE.test(trimmedName) && !channel.tvgId) return false
  return true
}

export function flattenChannels(lists: LiveTvList[]): M3uChannel[] {
  const seen = new Set<string>()
  const out: M3uChannel[] = []
  for (const list of lists) {
    for (const channel of list.channels) {
      if (!isPlayableChannel(channel)) continue
      const key = channelKey(channel)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(channel)
    }
  }
  return out
}

export function topGroups(channels: M3uChannel[], limit = MAX_GROUP_CHIPS): string[] {
  const counts = new Map<string, number>()
  for (const channel of channels) {
    const group = channel.group?.trim()
    if (!group) continue
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([group]) => group)
}

export interface LiveTvModel {
  lists: LiveTvList[]
  /** Alla kanaler oavsett aktiv spellista. */
  allChannels: M3uChannel[]
  channels: M3uChannel[]
  byKey: Map<string, M3uChannel>
  byUrl: Map<string, M3uChannel>
  groups: string[]
  pinnedKeys: string[]
  pinnedSet: Set<string>
  togglePin: (channel: M3uChannel) => void
  playlists: { id: string; name: string; count: number }[]
  activePlaylistId: string | null
  activePlaylistName: string | null
  setActivePlaylist: (id: string | null) => void
  /** 1-baserat nummer i den filtrerade listan, null om kanalen inte ingår. */
  channelNumber: (channel: M3uChannel) => number | null
  /** Favoriter i sparad ordning, ur allChannels. */
  favouriteChannels: M3uChannel[]
  history: ChannelHistoryEntry[]
  nowMs: number
  epgListId: string | null
  epgUrls: string[]
  cache: EpgCacheEntry | null
  hasEpg: boolean
  nameIndex: Map<string, string>
  tvgIdFor: (channel: M3uChannel) => string | null
  nowFor: (channel: M3uChannel) => NowNextLater
  scheduleFor: (channel: M3uChannel, fromMs: number, toMs: number) => EpgProgramme[]
  reminders: Reminder[]
  locked: Set<string>
  listFor: (channel: M3uChannel) => LiveTvList | null
}

export function useLiveTvModel(tickMs = 60_000): LiveTvModel {
  const [lists, setLists] = useState<LiveTvList[]>(() => getLiveTvLists())
  const [activePlaylistId, setActivePlaylistIdState] = useState<string | null>(() => getActivePlaylistId())
  useEffect(() => onActivePlaylistChanged(() => setActivePlaylistIdState(getActivePlaylistId())), [])
  const [pinnedKeys, setPinnedKeys] = useState<string[]>(() => getPinnedLiveTvKeys())
  const [history, setHistory] = useState<ChannelHistoryEntry[]>(() => getChannelHistory())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const reminders = useReminders()
  const locked = useLockedChannelKeys()

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])
  useEffect(() => onPinnedLiveTvKeysChanged(() => setPinnedKeys(getPinnedLiveTvKeys())), [])
  useEffect(() => onChannelHistoryChanged(() => setHistory(getChannelHistory())), [])
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), tickMs)
    return () => window.clearInterval(timer)
  }, [tickMs])

  /**
   * Den aktiva spellistan är ett TV-BEGREPP.
   *
   * Filtret sätts bara från TV-hubbens spellistmeny, men modellen är delad med
   * skrivbordet och mobilen — de har ingen ratt som visar eller ändrar det. Ett
   * val som blev kvar i lagringen (någon provade TV-läget, eller läget byttes
   * på samma enhet) klippte därför skrivbordets kanallista till en enda
   * spellista UTAN att något i gränssnittet förklarade varför, och utan någon
   * väg tillbaka. Utanför TV-läget gäller alltid alla listor.
   *
   * Hooken kallas ovillkorligt (hooks-reglerna) — det är bara dess RESULTAT
   * som grindar filtret.
   */
  const tvMode = useTvMode()
  const allChannels = useMemo(() => flattenChannels(lists), [lists])
  // Vald spellista som inte längre finns → tillbaka till alla.
  const activeList = useMemo(() => (tvMode ? lists.find((list) => list.id === activePlaylistId) ?? null : null), [tvMode, lists, activePlaylistId])
  const channels = useMemo(() => (activeList ? flattenChannels([activeList]) : allChannels), [activeList, allChannels])
  const playlists = useMemo(() => lists.map((list) => ({ id: list.id, name: list.name, count: flattenChannels([list]).length })), [lists])
  const numberByKey = useMemo(() => new Map(channels.map((channel, index) => [channelKey(channel), index + 1])), [channels])
  const allByKey = useMemo(() => new Map(allChannels.map((channel) => [channelKey(channel), channel])), [allChannels])
  const byKey = useMemo(() => new Map(channels.map((channel) => [channelKey(channel), channel])), [channels])
  const byUrl = useMemo(() => new Map(allChannels.map((channel) => [channel.url, channel])), [allChannels])
  const groups = useMemo(() => topGroups(channels), [channels])
  const listByUrl = useMemo(() => {
    const map = new Map<string, LiveTvList>()
    for (const list of lists) for (const channel of list.channels) if (!map.has(channel.url)) map.set(channel.url, list)
    return map
  }, [lists])

  const epgUrls = useMemo(() => getAllLiveTvEpgUrls(lists), [lists])
  const epgListId = epgUrls.length > 0 ? LIVE_TV_GLOBAL_EPG_ID : null
  /**
   * Cachen LÄSES under den konstanta nyckeln, inte under epgListId
   * (Jerry 2026-09-03).
   *
   * epgListId är null tills kanallistorna hunnit laddas, och med null läste
   * hooken ingenting. En VARM cache på disk låg därför oanvänd i flera
   * sekunder vid varje omladdning — live-status och förloppsraden dök upp
   * långt efter att sidan ritats, fast datan fanns hela tiden.
   *
   * Hämtningen är fortfarande grindad: ensureFresh avstår när urls är tom,
   * så ingenting hämtas innan listorna vet vilka EPG-källor som gäller.
   * epgListId lämnas orörd — live-tv-shell.tsx använder dess null-läge för
   * att veta att EPG saknas.
   */
  const cache = useLiveTvEpgCache(LIVE_TV_GLOBAL_EPG_ID, epgUrls)
  const nameIndex = useMemo(() => (cache ? buildNameToTvgIdIndex(cache) : new Map<string, string>()), [cache])
  const tvgIdFor = useMemo(() => {
    const memo = new Map<string, string | null>()
    return (channel: M3uChannel): string | null => {
      if (!cache) return null
      const key = channelKey(channel)
      if (memo.has(key)) return memo.get(key) ?? null
      const resolved = resolveTvgId(channel.tvgId, channel.name, nameIndex)
      memo.set(key, resolved)
      return resolved
    }
  }, [cache, nameIndex])
  const nowFor = useMemo(() => {
    const memo = new Map<string, NowNextLater>()
    return (channel: M3uChannel): NowNextLater => {
      if (!cache) return EMPTY
      const key = channelKey(channel)
      const hit = memo.get(key)
      if (hit) return hit
      const tvgId = tvgIdFor(channel)
      const value = tvgId ? computeNowNextLater(cache, tvgId, nowMs) : EMPTY
      memo.set(key, value)
      return value
    }
  }, [cache, tvgIdFor, nowMs])
  const scheduleFor = useMemo(
    () => (channel: M3uChannel, fromMs: number, toMs: number): EpgProgramme[] =>
      cache ? getChannelSchedule(cache, tvgIdFor(channel), fromMs, toMs) : [],
    [cache, tvgIdFor],
  )
  const favouriteChannels = useMemo(
    () => pinnedKeys.map((key) => allByKey.get(key)).filter((c): c is M3uChannel => Boolean(c)),
    [pinnedKeys, allByKey],
  )

  return {
    lists,
    allChannels,
    channels,
    byKey,
    byUrl,
    groups,
    pinnedKeys,
    pinnedSet: useMemo(() => new Set(pinnedKeys), [pinnedKeys]),
    togglePin: (channel) => setPinnedKeys(togglePinnedLiveTvChannel(channel)),
    playlists,
    activePlaylistId: activeList ? activeList.id : null,
    activePlaylistName: activeList ? activeList.name : null,
    setActivePlaylist: (id) => {
      setActivePlaylistId(id)
      setActivePlaylistIdState(id)
    },
    channelNumber: (channel) => numberByKey.get(channelKey(channel)) ?? null,
    favouriteChannels,
    history,
    nowMs,
    epgListId,
    epgUrls,
    cache,
    hasEpg: Boolean(cache && Object.keys(cache.index).length > 0),
    nameIndex,
    tvgIdFor,
    nowFor,
    scheduleFor,
    reminders,
    locked,
    listFor: (channel) => listByUrl.get(channel.url) ?? null,
  }
}

/** Startsekund för lokal midnatt `dayOffset` dagar från `nowMs`. */
export function startOfLocalDay(nowMs: number, dayOffset = 0): number {
  const d = new Date(nowMs)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + dayOffset)
  return d.getTime()
}

/** Heuristik ur kanalnamnet — M3U/Xtream bär ingen kvalitetsmetadata. */
export function qualityFromName(name: string): '4K' | 'FHD' | 'HD' | 'SD' | null {
  const n = name.toUpperCase()
  if (/\b(4K|UHD|2160)/.test(n)) return '4K'
  if (/\b(FHD|1080)/.test(n)) return 'FHD'
  if (/\b(HD|720)\b/.test(n)) return 'HD'
  if (/\b(SD|576|480)\b/.test(n)) return 'SD'
  return null
}
