'use client'

/**
 * Uppslag av ENSKILDA kanalnycklar mot appens index (spec 4.2).
 *
 * Favoriter, historik, påminnelser och programträffar pekar på kanaler som
 * inte nödvändigtvis ligger i den laddade uppsättningen — favoriten kan höra
 * till en annan spellista, och en programträff kan komma från vilken källa som
 * helst. `/api/live-tv/lookup` svarar på nycklar (chunkat 200 åt gången i
 * `index-client`).
 *
 * Memot ligger i MODULEN: nycklarna är stabila över tid (namn + URL) och
 * samma favorit slås annars upp igen för varje monterad vy. Negativa svar
 * memoas också (`null`) — en favorit vars källa tagits bort ska inte ge ett
 * uppslag per omrender resten av sessionen.
 */

import { lookupChannels, type IndexChannel } from './index-client'
import type { M3uChannel } from './live-tv-data'

const memo = new Map<string, IndexChannel | null>()

/** Redan uppslagna nycklar, utan nätverk — för synkron rendering före svaret. */
export function getResolvedChannels(keys: readonly string[]): Record<string, IndexChannel> {
  const out: Record<string, IndexChannel> = {}
  for (const key of keys) {
    const hit = memo.get(key)
    if (hit) out[key] = hit
  }
  return out
}

/**
 * Löser nycklarna till kanaler. Ordningen följer `keys`; nycklar indexet inte
 * känner till utelämnas.
 */
export async function resolveChannelKeys(keys: readonly string[]): Promise<IndexChannel[]> {
  const wanted = [...new Set(keys.filter((key) => key.length > 0))]
  const missing = wanted.filter((key) => !memo.has(key))
  if (missing.length > 0) {
    const items = await lookupChannels(missing)
    const found = new Map(items.map((item) => [item.key, item]))
    for (const key of missing) memo.set(key, found.get(key) ?? null)
  }
  return wanted.map((key) => memo.get(key) ?? null).filter((item): item is IndexChannel => item !== null)
}

/** Kanaler som redan laddats (t.ex. modellens sidhämtning) slipper ett uppslag. */
export function rememberChannels(channels: readonly (M3uChannel & { key?: string })[]): void {
  for (const channel of channels) {
    if (channel.key) memo.set(channel.key, channel as IndexChannel)
  }
}

export function __resetChannelResolverForTests(): void {
  memo.clear()
}
