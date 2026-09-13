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
 * Memot ligger i MODULEN: nycklarna är stabila (namn + URL) och samma favorit
 * slås annars upp igen för varje monterad vy. Två gränser gör det säkert:
 *
 * 1. Det HELA sidladdningar av kanaler läggs INTE in här. Modellen har dem
 *    redan i `byKey`; att spegla 17 000 kanaler till ett memo som bara finns
 *    för de få nycklar som ligger UTANFÖR den laddade listan var ren dubbel-
 *    lagring.
 * 2. Innehållet kastas när indexet ändras (`clearResolvedChannels`, kopplad
 *    till `INDEX_CHANGED_EVENT` i modellen). Negativa svar memoas — annars
 *    slås en favorit vars källa tagits bort upp vid varje omrender — men ett
 *    permanent nej vore fel: efter en ny import FINNS kanalen igen.
 */

import { lookupChannels, type IndexChannel } from './index-client'

/**
 * Tak för memot. Favoriter + historik + synliga sökträffar är i praktiken
 * hundratals nycklar, inte tusentals; taket finns för att en lång session med
 * mycket sökande inte ska växa obegränsat. Äldst insatt ryker först.
 */
const MAX_ENTRIES = 1000

const memo = new Map<string, IndexChannel | null>()

function remember(key: string, value: IndexChannel | null): void {
  memo.set(key, value)
  while (memo.size > MAX_ENTRIES) {
    const oldest = memo.keys().next()
    if (oldest.done) break
    memo.delete(oldest.value)
  }
}

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
    for (const key of missing) remember(key, found.get(key) ?? null)
  }
  return wanted.map((key) => memo.get(key) ?? null).filter((item): item is IndexChannel => item !== null)
}

/** Indexet har bytt innehåll: både träffar och nej-svar är opålitliga nu. */
export function clearResolvedChannels(): void {
  memo.clear()
}

export function __resetChannelResolverForTests(): void {
  memo.clear()
}
