/**
 * Hemradens kortmodell. Ren logik: ingen React, inga uppslag. Titeln kommer ur
 * kanalens egen rundown, så raden gör aldrig ett strömuppslag.
 */
import type { ChannelDef } from '../model/channel'
import { programmeAt } from '../model/schedule'
import type { PoolItem } from '../data/pool'

export const HOME_DEFAULT_COUNT = 20

/** Kanaler med showOnHome, i nummerordning, kapade till count. */
export function homeChannels(channels: ChannelDef[], count: number = HOME_DEFAULT_COUNT): ChannelDef[] {
  return channels
    .filter((c) => c.showOnHome)
    .sort((a, b) => a.number - b.number)
    .slice(0, Math.max(0, count))
}

export interface HomeCardModel {
  channelId: string
  number: number
  name: string
  /** null vid tom pool (kortet visar "Inget att sända"); vid vila behålls null och restUntil sätts. */
  title: string | null
  /** Minuter kvar (uppåt avrundat, minst 1); null vid vila och tom pool. Texten byggs i UI:t. */
  minsLeft: number | null
  resting: boolean
  /** 0–1, andel av programmet som gått. */
  pct: number
  nextTitle: string | null
  backdropUrl?: string
  hue: number
  /** Vila: när kanalen sänder igen (ms). */
  restUntil?: number
}

const titleOf = (item: PoolItem): string => (item.kind === 'episode' && item.seriesTitle ? item.seriesTitle : item.title)

/**
 * Det som faktiskt sänds efter programmet, enligt tablån: en fönsterkanal kan
 * gå i vila vid slot.stop, och då är "sedan" det som sänds när den vaknar.
 */
function nextAiring(rundown: PoolItem[], channel: ChannelDef, stop: number): PoolItem | null {
  const after = programmeAt(rundown, channel.airWindow, stop + 1000)
  if (after.kind === 'programme') return after.item
  if (after.kind === 'rest') {
    const woken = programmeAt(rundown, channel.airWindow, after.nextAir + 1000)
    return woken.kind === 'programme' ? woken.item : null
  }
  return null
}

export function homeCardModel(channel: ChannelDef, rundown: PoolItem[], now: number): HomeCardModel {
  const base = { channelId: channel.id, number: channel.number, name: channel.name, hue: channel.hue }
  const slot = programmeAt(rundown, channel.airWindow, now)
  if (slot.kind === 'empty') return { ...base, title: null, minsLeft: null, resting: false, pct: 0, nextTitle: null }
  if (slot.kind === 'rest') return { ...base, title: null, minsLeft: null, resting: true, pct: 0, nextTitle: null, restUntil: slot.nextAir }
  const next = rundown.length > 1 ? nextAiring(rundown, channel, slot.stop) : null
  return {
    ...base,
    title: titleOf(slot.item),
    minsLeft: Math.max(1, Math.ceil(slot.minsLeft)),
    resting: false,
    pct: slot.pct,
    nextTitle: next ? titleOf(next) : null,
    ...(slot.item.backdropUrl ? { backdropUrl: slot.item.backdropUrl } : {}),
  }
}
