'use client'

/**
 * Engångsmigrering till lagring v2 (spec 2026-09-14-live-tv-storage-v2-design.md
 * 4.1): kanaler som i dag bor inbäddade i `lists` (från innan appens
 * kanalindex fanns) flyttas till indexet via den BEFINTLIGA `/api/live-tv/batch`-
 * endpointen (inte importjobbet — det är till för en riktig hämtning, inte
 * för att bara skriva om data som redan finns lokalt). Listan skrivs om utan
 * `channels`, med `channelCount`/`groups` som kvitto, och den gamla
 * `channels:*`-cachen (webbläsarlagringen som tidigare taket på 2000 satt på)
 * raderas.
 *
 * Egen fil (inte `live-tv-data.ts`) enligt task-P2-briefen — bara migreringen
 * behöver batcha rått mot indexet, och att hålla den utanför datalagret gör
 * det tydligt att INGEN annan kod ska ta den genvägen.
 *
 * Manuellt skapade listor (`kind: 'custom'`, se `classifyLegacyList` i
 * `live-tv-data.ts`) migreras INTE: de har ingen riktig käll-URL att skriva om
 * mot, och deras kanaler hanteras även efter v2 via
 * `addChannelToLiveTvList`/`removeChannelFromLiveTvList`.
 */

import { readPluginJson, removePluginStorageByPrefix, writePluginJson } from '@/lib/plugin-sdk'
import { batchChannels, emitIndexChanged, type BatchChannel } from './index-client'
import {
  LIVE_TV_CHANNELS_PREFIX,
  LIVE_TV_PLUGIN_ID,
  channelKey,
  getLiveTvLists,
  replaceLiveTvLists,
  type LiveTvList,
  type M3uChannel,
} from './live-tv-data'

const STORAGE_V2_MIGRATED_KEY = 'live_tv_storage_v2_migrated'

function computeGroups(channels: M3uChannel[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const channel of channels) {
    const group = channel.group?.trim() || 'Other'
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => ({ name, count }))
}

function withKeysAndNumbers(channels: M3uChannel[]): BatchChannel[] {
  return channels.map((channel, index) => ({ ...channel, key: channelKey(channel), number: index + 1 }))
}

/** Bara för tester/felsökning: har migreringen redan kört klart på den här enheten? */
export function isStorageV2Migrated(): boolean {
  return readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, STORAGE_V2_MIGRATED_KEY, false) === true
}

/**
 * Kör migreringen en gång. Idempotent: en andra körning (samma enhet, samma
 * flagga) är ett no-op utan nätverksanrop.
 */
export async function migrateStorageV2(): Promise<{ migrated: number }> {
  if (isStorageV2Migrated()) return { migrated: 0 }

  const lists = getLiveTvLists()
  let migrated = 0
  const rewritten: LiveTvList[] = []

  for (const list of lists) {
    const embedded = list.channels ?? []
    // Bara listor med en riktig importkälla flyttas — se filhuvudet om
    // manuellt skapade (`custom`) listor.
    const canMigrate = embedded.length > 0 && Boolean(list.source) && (list.kind === 'm3u' || list.kind === 'xtream')
    if (!canMigrate) {
      rewritten.push(list)
      continue
    }

    await batchChannels(list.source as string, withKeysAndNumbers(embedded), true)
    const { channels: _channels, ...withoutChannels } = list
    rewritten.push({
      ...withoutChannels,
      channelCount: embedded.length,
      groups: computeGroups(embedded),
    })
    migrated += 1
  }

  if (migrated > 0) {
    replaceLiveTvLists(rewritten)
    emitIndexChanged()
  }

  // Alltid, oavsett `migrated`: rensa eventuella kvarvarande channels:-nycklar
  // (den gamla webbläsarcachen) så en enhet som redan var utan inbäddade
  // kanaler också blir fri från resterna.
  removePluginStorageByPrefix(LIVE_TV_PLUGIN_ID, LIVE_TV_CHANNELS_PREFIX)
  writePluginJson(LIVE_TV_PLUGIN_ID, STORAGE_V2_MIGRATED_KEY, true)

  return { migrated }
}
