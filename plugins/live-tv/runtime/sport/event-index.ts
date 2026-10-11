// runtime/sport/event-index.ts
import { teamKeysMatch } from './sport-store'
import type { Fixture, ProviderId } from './provider'
import type { SportKind } from './sport-model'

/**
 * SAMMA MATCH HOS FLERA KÄLLOR. När en sport byter källa mitt på dagen (den
 * första källans kvot tog slut) har samma match ett annat id hos nästa källa.
 * Indexet ger varje match ETT id för dagen (händelsenyckeln, = den källa och
 * det id som sågs först) och minns varje källas id för den (alias). Ställning,
 * "senast sedd" och målräkning förs per händelsenyckel, så att ett källbyte
 * aldrig ger ett falskt MÅL! eller en dubbel rad.
 *
 * Samma match = samma sport, avspark inom 15 min, och minst ett av lagen lika
 * (Rusts lagnyckelregel). Ett lag spelar inte två matcher inom 15 minuter, och
 * kortnamn ("Man City") skiljer sig ofta bara på ena sidan.
 */
const WINDOW_MS = 15 * 60_000

interface Entry { key: string; sport: SportKind; kickoff: number; home: string; away: string; ids: Partial<Record<ProviderId, string>> }

/** Som merge.ts `foldTeamKey` (inlinad: ingen import av sammanslagningen härifrån). */
const fold = (name: string): string => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

export const aliasKey = (provider: ProviderId, id: string): string => `${provider}:${id}`

export class EventIndex {
  private aliases = new Map<string, Entry>()
  private buckets = new Map<string, Entry[]>()

  private bucketKey(sport: SportKind, kickoff: number, shift = 0): string {
    return `${sport}|${Math.floor(kickoff / WINDOW_MS) + shift}`
  }

  private sameEvent(e: Entry, f: Fixture, home: string, away: string): boolean {
    if (e.sport !== f.sport || Math.abs(e.kickoff - f.kickoff) > WINDOW_MS || e.ids[f.provider] != null) return false
    return teamKeysMatch(e.home, home) || teamKeysMatch(e.away, away) || (teamKeysMatch(e.home, away) && teamKeysMatch(e.away, home))
  }

  /** Händelsenyckeln för fixturen. Första gången den ses kopplas den till en känd match hos en annan källa, om en sådan finns. */
  resolve(f: Fixture): string {
    const alias = aliasKey(f.provider, f.id)
    const known = this.aliases.get(alias)
    if (known) return known.key
    const home = fold(f.home.name)
    const away = fold(f.away.name)
    for (const shift of [0, -1, 1]) {
      const hit = (this.buckets.get(this.bucketKey(f.sport, f.kickoff, shift)) ?? []).find((e) => this.sameEvent(e, f, home, away))
      if (hit) {
        hit.ids[f.provider] = f.id
        this.aliases.set(alias, hit)
        return hit.key
      }
    }
    const entry: Entry = { key: alias, sport: f.sport, kickoff: f.kickoff, home, away, ids: { [f.provider]: f.id } }
    this.aliases.set(alias, entry)
    const b = this.bucketKey(f.sport, f.kickoff)
    this.buckets.set(b, [...(this.buckets.get(b) ?? []), entry])
    return entry.key
  }

  /** Händelsenyckeln för ett id som redan setts, annars `null`. */
  keyOf(provider: ProviderId, id: string): string | null {
    return this.aliases.get(aliasKey(provider, id))?.key ?? null
  }

  /** Matchens id hos varje källa som sett den (den givna först). */
  refsOf(provider: ProviderId, id: string): Array<{ provider: ProviderId; id: string }> {
    const e = this.aliases.get(aliasKey(provider, id))
    const others = e ? (Object.entries(e.ids) as Array<[ProviderId, string]>).filter(([p]) => p !== provider).map(([p, i]) => ({ provider: p, id: i })) : []
    return [{ provider, id }, ...others]
  }

  /** Den första källans id (händelsenyckeln uppdelad): stabilt id för "Bara resultat"-rader över ett källbyte. */
  canonicalOf(f: Pick<Fixture, 'provider' | 'id'>): { provider: ProviderId; id: string } {
    const key = this.keyOf(f.provider, f.id)
    if (!key) return { provider: f.provider, id: f.id }
    const i = key.indexOf(':')
    return { provider: key.slice(0, i) as ProviderId, id: key.slice(i + 1) }
  }
}
