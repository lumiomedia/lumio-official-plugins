import { useMemo } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { catchUpAcross, type CatchUpItem } from '../catch-up'
import type { EpgProgramme, NowNextLater } from '../epg/types'
import { pickReplayChannels } from '../view-helpers'
import { startOfLocalDay, type LiveTvModel } from '../live-tv-model'
import { useSchedules } from '../hooks/useSchedules'
import { groupCounts } from './group-chips'
import { FAVS_GROUP } from './tv-guide-shared'
import { matchTitle, type SportMatch } from '../sport/sport-model'
import { statusAt } from '../sport/sport-day-model'
import { titleKey } from '../display-title'
import { localDayKey, useSportDay } from '../sport/sport-epg'

/**
 * RADERNA I KANALER, LAYOUT UPPLEVELSE (handoff v2 "Rows").
 *
 * Toppkortet + raderna. Ingen tittarstatistik finns, så "Sänds nu" är
 * favoriter först och sedan spellistans ordning. I hemläget står kanalerna
 * som redan ligger i Fortsätt titta INTE i Sänds nu (Jerry 2026-10-30: "dumt
 * att de är likadana"); i kategoriläget är senast sedda kvar först. Varje rad
 * är kapad (tusentals Xtream-kanaler ska inte ge tusentals kort), och en tom
 * rad utelämnas helt.
 *
 * LIVE SPORT (Jerry 2026-10-30: "lägg till en rad för livesport här också"):
 * direkt efter Sänds nu i hemläget. Källan är sportlägets dag
 * (`useSportDay`, värdens lokala `/sport/day` — samma femminuterscache som
 * sportpåminnelserna redan läser), så raden kostar inga nya leverantörsanrop
 * och ingen tablåhämtning per kanal. Ett kort per pågående match, på den
 * bästa kanalen bland matchens källor (favorit, senast sedd, annars första
 * kända); en kanal visar bara en match.
 *
 * KATEGORILÄGET (Jerry 2026-10-30: "Alla ska inte vara aktiv … Alla ska visa
 * alla kanaler"): ingen chip vald = hemraderna, ofiltrerade. En vald chip
 * (Alla, Favoriter, en grupp) byter raderna mot Sänds nu i kategorin + ett
 * rutnät med kategorins alla kanaler. Rutnätet är en rad per sex kort (så
 * att zonreducern bara ser vanliga rader) och kapas vid `limit`; finns fler
 * står ett Visa fler-kort sist.
 */

export type XpItem = {
  kind: 'live' | 'continue' | 'replay' | 'upcoming' | 'category' | 'more'
  key: string
  channel?: M3uChannel
  programme?: EpgProgramme | null
  category?: string
  /** Kategori: antal kanaler. Visa fler: antal kanaler som ännu inte visas. */
  count?: number
  catchUp?: CatchUpItem
  /** Live sport: matchens titel ("AIK - Hammarby") och liga. */
  sport?: { title: string; league: string }
}
export type XpRowId = 'continue' | 'onNow' | 'sport' | 'yours' | 'soon' | 'explore' | 'grid'
/** `total` = rutnätets kanaler i kategorin (bara på dess första rad, till rubriken). */
export interface XpRow { id: XpRowId; items: XpItem[]; total?: number }

/** Chipvärdet för "Alla" i kategoriläget (`null` = ingen chip vald, hemraderna). */
export const XP_ALL = '__xp_all'
/**
 * Rutnätets kolumner och sidstorlek (första sidan, och vad Visa fler lägger till).
 * Fem per rad (Jerry 2026-10-30: "för många per rad" med sex) — samma tal för
 * det synliga CSS-rutnätet och reducerns rader, på TV och skrivbord.
 */
export const XP_GRID_COLUMNS = 5
export const XP_GRID_STEP = 60

const CONTINUE_MAX = 12
const ON_NOW_MAX = 24
const SPORT_MAX = 24
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
  /** `null` = hemraderna; `XP_ALL`, `FAVS_GROUP` eller en grupp = kategoriläget. */
  chip: string | null
  nowMs: number
  /** Rutnätets tak i kategoriläget (default `XP_GRID_STEP`). */
  limit?: number
  /** Sportlägets matcher i dag (Live sport); utan dem ingen rad. */
  sport?: readonly SportMatch[]
  /** Källans kanalnyckel → kanalen i modellen (okända källor hoppas över). */
  channelFor?: (key: string) => M3uChannel | undefined
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

/**
 * Som `take`, men kanaler som sänder SAMMA program samtidigt (samma visade
 * titel, oavsett leverantörsmarkörer/versaler, och samma start) blir en —
 * regionala SVT1-varianter med samma sändning gav annars fem likadana kort
 * (Jerry 2026-10-31). Favoriten vinner gruppen, annars den som kom först;
 * kortet står kvar på gruppens första plats. Kanaler utan pågående program
 * slås aldrig ihop.
 */
function takeLive(sources: readonly (readonly M3uChannel[])[], keep: (c: M3uChannel) => boolean, max: number, nowFor: XpInput['nowFor'], favKeys: ReadonlySet<string>): M3uChannel[] {
  const seen = new Set<string>()
  const out: M3uChannel[] = []
  const slotOf = new Map<string, number>()
  for (const source of sources) {
    for (const channel of source) {
      if (out.length >= max) return out
      const key = channelKey(channel)
      if (seen.has(key) || !keep(channel)) continue
      seen.add(key)
      const now = nowFor(channel).now
      const same = now ? `${titleKey(now.title)}|${now.start}` : null
      const slot = same === null ? undefined : slotOf.get(same)
      if (slot !== undefined) {
        if (favKeys.has(key) && !favKeys.has(channelKey(out[slot]!))) out[slot] = channel
        continue
      }
      if (same !== null) slotOf.set(same, out.length)
      out.push(channel)
    }
  }
  return out
}

export function buildExperienceRows(input: XpInput): { featured: XpItem | null; rows: XpRow[] } {
  const { channels, favourites, recent, nowFor, replays, chip } = input
  const favKeys = new Set(favourites.map(channelKey))
  const inChip = (c: M3uChannel) => (chip === null || chip === XP_ALL ? true : chip === FAVS_GROUP ? favKeys.has(channelKey(c)) : c.group === chip)

  // Hemläget: Fortsätt titta tar de senast sedda, så Sänds nu hoppar över dem.
  const continueItems = chip === null ? [...recent.map((c) => continueItem(c, nowFor)), ...replays.map(replayItem)].slice(0, CONTINUE_MAX) : []
  const inContinue = new Set(continueItems.filter((i) => i.kind === 'continue').map((i) => channelKey(i.channel!)))
  const onNow = chip === null
    ? takeLive([favourites, channels], (c) => !inContinue.has(channelKey(c)), ON_NOW_MAX, nowFor, favKeys).map((c) => liveItem('now', c, nowFor))
    : takeLive([recent, favourites, channels], inChip, ON_NOW_MAX, nowFor, favKeys).map((c) => liveItem('now', c, nowFor))
  const rows = chip === null ? homeRows(input, onNow, continueItems) : categoryRows(input, onNow)
  // Toppkortet = första kortet i Sänds nu (Jerry 2026-10-30): heron förladdar
  // och spelar det, så förhandsvisningen redan är igång när man går ner i raden.
  // Utan något som sänds: senaste reprisen, sedan första kanalen.
  const featured: XpItem | null = onNow[0]
    ?? (replays[0] ? replayItem(replays[0]) : channels[0] ? liveItem('live', channels[0], nowFor) : null)
  return { featured, rows: rows.filter((r) => r.items.length > 0) }
}

function homeRows(input: XpInput, onNow: XpItem[], continueItems: XpItem[]): XpRow[] {
  const { favourites, recent, nowFor, soon, groups, counts, nowMs } = input
  // Dina kanaler = favoriterna, ingen utfyllnad ur spellistan (Jerry 2026-10-31).
  // Utan favoriter: de senast sedda; utan båda blir raden tom och utelämnas.
  const yours = take([favourites.length > 0 ? favourites : recent], () => true, YOURS_MAX).map((c) => liveItem('yours', c, nowFor))
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
  return [
    { id: 'onNow', items: onNow },
    { id: 'sport', items: liveSportItems(input) },
    { id: 'continue', items: continueItems },
    { id: 'yours', items: yours },
    { id: 'soon', items: upcoming },
    { id: 'explore', items: explore },
  ]
}

/**
 * Pågående matcher (sportlägets egen statusregel, `statusAt`: repriser är
 * aldrig live). Favoritkanalernas matcher först, sedan matcher med fler
 * källor (större matcher sänds på fler kanaler), sedan avspark.
 */
function liveSportItems(input: XpInput): XpItem[] {
  const { sport, channelFor, favourites, recent, nowFor, nowMs } = input
  if (!sport?.length || !channelFor) return []
  const favKeys = new Set(favourites.map(channelKey))
  const recentKeys = new Set(recent.map(channelKey))
  const rank = (c: M3uChannel) => (favKeys.has(channelKey(c)) ? 0 : recentKeys.has(channelKey(c)) ? 1 : 2)
  const candidates: { match: SportMatch; channels: M3uChannel[]; best: number }[] = []
  for (const match of sport) {
    if (statusAt(match, nowMs) !== 'live') continue
    const channels: M3uChannel[] = []
    for (const source of match.sources) {
      const channel = channelFor(source.channelKey)
      if (channel) channels.push(channel)
    }
    if (channels.length === 0) continue
    channels.sort((a, b) => rank(a) - rank(b))
    candidates.push({ match, channels, best: rank(channels[0]!) })
  }
  candidates.sort((a, b) => a.best - b.best || b.match.sources.length - a.match.sources.length || a.match.start - b.match.start)
  const used = new Set<string>()
  // Samma match under flera id (olika källor/kanaler): samma titel + avspark = ett kort.
  // Kandidaterna är redan sorterade med favoritkanalerna först, så favoriten vinner.
  const shown = new Set<string>()
  const out: XpItem[] = []
  for (const { match, channels } of candidates) {
    if (out.length >= SPORT_MAX) break
    const same = `${titleKey(matchTitle(match))}|${match.start}`
    if (shown.has(same)) continue
    const channel = channels.find((c) => !used.has(channelKey(c)))
    if (!channel) continue
    used.add(channelKey(channel))
    shown.add(same)
    const programme = nowFor(channel).now ?? { title: matchTitle(match), start: match.start, stop: match.stop }
    out.push({ kind: 'live', key: `sport:${match.id}:${channelKey(channel)}`, channel, programme, sport: { title: matchTitle(match), league: match.league } })
  }
  return out
}

/** Sänds nu i kategorin + rutnätet. Bara de visade kanalerna blir kort (aldrig 4 000). */
function categoryRows(input: XpInput, onNow: XpItem[]): XpRow[] {
  const { channels, favourites, nowFor, chip } = input
  const limit = Math.max(XP_GRID_STEP, input.limit ?? XP_GRID_STEP)
  const all = chip === XP_ALL ? channels : chip === FAVS_GROUP ? favourites : channels.filter((c) => c.group === chip)
  const items: XpItem[] = all.slice(0, limit).map((c) => liveItem('grid', c, nowFor))
  if (all.length > limit) items.push({ kind: 'more', key: 'grid:more', count: all.length - limit })
  const rows: XpRow[] = [{ id: 'onNow', items: onNow }]
  for (let i = 0; i < items.length; i += XP_GRID_COLUMNS) {
    rows.push({ id: 'grid', items: items.slice(i, i + XP_GRID_COLUMNS), ...(i === 0 ? { total: all.length } : {}) })
  }
  return rows
}

/** Halvtimmesjusterat fönster så att minuttick inte ger ett nytt tablåanrop. */
const HALF_HOUR = 30 * 60_000

export function useExperienceRows(model: LiveTvModel, chip: string | null, limit: number = XP_GRID_STEP): { featured: XpItem | null; rows: XpRow[] } {
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
  // Live sport: dagens sportdag ur värdens lokala cache, bara i hemläget.
  const { data: sportDay } = useSportDay(chip === null ? localDayKey(model.nowMs) : null, model.nowMs)
  const sport = sportDay?.matches
  const byKey = model.byKey
  const channelFor = useMemo(() => (key: string) => byKey.get(key), [byKey])
  return useMemo(() => buildExperienceRows({
    channels: model.channels, favourites, recent, nowFor: model.nowFor, replays, soon, groups: model.groups, counts, chip, nowMs: model.nowMs, limit, sport, channelFor,
  }), [model.channels, favourites, recent, model.nowFor, replays, soon, model.groups, counts, chip, model.nowMs, limit, sport, channelFor])
}
