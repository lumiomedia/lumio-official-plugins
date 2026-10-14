/**
 * Gruppordningen (inställningen "Gruppordning", 2026-10-14).
 *
 * Förut var ordningen hårdkodad till "flest kanaler först" överallt där
 * grupper listas. En användare ville ha spellistans egen ordning eller A–Ö,
 * så sorteringen bor nu här och alla grupplistor går genom `sortGroups`:
 *
 * - `'playlist'` (standard): ordningen grupperna först dyker upp i
 *   kanallistan. Kanalerna ligger redan i spellistans ordning, och med "Alla
 *   spellistor" ligger de spellista för spellista (`loadEveryChannel`), så
 *   första förekomsten ger spellistans ordning och sedan gruppens plats i den.
 * - `'name'`: A–Ö efter språket, siffror som tal ("Kanal 2" före "Kanal 10").
 * - `'count'`: det gamla beteendet — flest kanaler först, sedan namn.
 *
 * Ren modul utan React: kurateringen, modellen och vyerna delar den.
 */

export type GroupOrder = 'playlist' | 'name' | 'count'
export const GROUP_ORDERS: readonly GroupOrder[] = ['playlist', 'name', 'count']
export const DEFAULT_GROUP_ORDER: GroupOrder = 'playlist'

export function sanitizeGroupOrder(raw: unknown): GroupOrder {
  return GROUP_ORDERS.includes(raw as GroupOrder) ? (raw as GroupOrder) : DEFAULT_GROUP_ORDER
}

export function nextGroupOrder(current: GroupOrder): GroupOrder {
  return GROUP_ORDERS[(GROUP_ORDERS.indexOf(current) + 1) % GROUP_ORDERS.length]
}

/** Strängnyckeln (tv-strings) för ett läge. */
export function groupOrderLabelKey(mode: GroupOrder): 'groupOrderPlaylist' | 'groupOrderName' | 'groupOrderCount' {
  return mode === 'name' ? 'groupOrderName' : mode === 'count' ? 'groupOrderCount' : 'groupOrderPlaylist'
}

export interface OrderedGroup {
  name: string
  count: number
  /**
   * Gruppens första förekomst i kanallistan (räknat per delgrupp). Saknas den (gruppen kommer ur
   * ett kvitto utan kanaler) sorteras gruppen efter de kända, i namnordning.
   */
  firstIndex?: number
}

let collator: Intl.Collator | null = null
function compareNames(a: string, b: string): number {
  collator ??= new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  return collator.compare(a, b)
}

function indexOf(group: OrderedGroup): number {
  return typeof group.firstIndex === 'number' && Number.isFinite(group.firstIndex) ? group.firstIndex : Number.POSITIVE_INFINITY
}

/** Sorterar en kopia; indata lämnas orörd. */
export function sortGroups<T extends OrderedGroup>(groups: readonly T[], mode: GroupOrder): T[] {
  const out = [...groups]
  if (mode === 'count') return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  if (mode === 'name') return out.sort((a, b) => compareNames(a.name, b.name) || indexOf(a) - indexOf(b) || a.name.localeCompare(b.name))
  return out.sort((a, b) => {
    const ia = indexOf(a)
    const ib = indexOf(b)
    if (ia !== ib) return ia < ib ? -1 : 1
    return compareNames(a.name, b.name) || a.name.localeCompare(b.name)
  })
}

function splitGroups(group: string | null | undefined): string[] {
  return String(group ?? '').split(';').map((s) => s.trim()).filter(Boolean)
}

/**
 * Grupperna i en kanallista med antal och första förekomst. Ett
 * semikolonseparerat gruppfält ("Sport;HD") räknas i varje delgrupp, samma
 * regel som Rust-indexet och kurateringen.
 */
export function collectGroups(channels: readonly { group?: string | null }[]): Required<OrderedGroup>[] {
  const byName = new Map<string, Required<OrderedGroup>>()
  // Platsen räknas per delgrupp, inte per kanal: "Sport;HD" lägger Sport
  // före HD, precis som fältet står.
  let position = 0
  for (const channel of channels) {
    for (const name of splitGroups(channel.group)) {
      const entry = byName.get(name)
      if (entry) entry.count += 1
      else byName.set(name, { name, count: 1, firstIndex: position })
      position += 1
    }
  }
  return [...byName.values()]
}

/** Grupperna i en kanallista, sorterade efter `mode`. */
export function orderedGroups(channels: readonly { group?: string | null }[], mode: GroupOrder): { name: string; count: number }[] {
  return sortGroups(collectGroups(channels), mode).map(({ name, count }) => ({ name, count }))
}

/*
 * Spellistans OKURATERADE gruppordning per källa.
 *
 * Indexets gruppsvar (`/api/live-tv/groups`) och importkvittot är sorterade
 * i bokstavsordning (BTreeMap) och bär ingen spellisteordning. Ytor som ritas
 * ur dem — kurateringspanelerna och Spellistor-trädet — läser i stället
 * ordningen som registrerades när källans kanaler laddades
 * (`loadChannelsShared`, före kurateringen, så dolda och ihopslagna grupper
 * har kvar sina ursprungliga platser). Okänd källa = ingen ordning: då faller
 * `'playlist'` tillbaka till namnordning.
 */
const rawOrderBySource = new Map<string, Map<string, number>>()

export function recordRawGroupOrder(source: string, channels: readonly { group?: string | null }[]): void {
  const order = new Map<string, number>()
  for (const g of collectGroups(channels)) order.set(g.name, g.firstIndex)
  rawOrderBySource.set(source, order)
}

export function rawGroupOrderFor(source: string | null | undefined): ReadonlyMap<string, number> | undefined {
  return source ? rawOrderBySource.get(source) : undefined
}

/** Grupper ur ett kvitto (namn + antal) med första förekomst ur källans registrerade ordning. */
export function withRawOrder<T extends { name: string; count: number }>(
  groups: readonly T[],
  order: ReadonlyMap<string, number> | undefined,
): (T & { firstIndex?: number })[] {
  return groups.map((g) => ({ ...g, firstIndex: order?.get(g.name) }))
}

export function __resetGroupOrderForTests(): void {
  rawOrderBySource.clear()
}
