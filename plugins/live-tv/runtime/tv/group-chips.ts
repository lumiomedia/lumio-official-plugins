/**
 * Gruppchippens tak och "Alla grupper"-beslutet, delat av alla vyer med en
 * chiprad (hubben, guiderna, väljarpanelerna, telefonens vyer).
 *
 * Raden visar högst `MAX_GROUP_CHIPS` grupper — en spellista med hundratals
 * grupper hade annars byggt lika många fokusbara chips på en svag TV-box.
 * Förut tog raden slut där: grupp 13 och framåt gick inte att nå alls (en
 * lista med 10 563 kanaler "visade inte alla kanaler när man scrollade åt
 * sidan"). Nu får raden en SISTA chip, "Alla grupper (N)", som öppnar en
 * sökbar lista över samtliga grupper.
 *
 * En grupp vald ur listan som inte står bland de kapade chippen ritas som en
 * EXTRA vald chip direkt efter Alla/Favoriter — annars hade filtret varit
 * aktivt utan att någon chip visade det.
 *
 * Ren modul utan React: testas för sig och importeras av både skrivbords- och
 * telefongrenen utan importcykel.
 */

export const MAX_GROUP_CHIPS = 12

/** Nyckeln för "Alla grupper (N)"-chipen. Ingen filternyckel — den öppnar listan. */
export const MORE_GROUPS = '__more_groups'

/** Samma värde som `FAVS_GROUP` i `tv-guide-shared.tsx` (ingen import: modulen ska vara fri från React). */
const FAVS = '__favs'

export interface GroupChipPlan {
  /** Grupperna som får en egen chip, i modellens ordning. */
  chips: string[]
  /** Vald grupp som INTE står bland `chips` — ritas som extra vald chip. */
  extra: string | null
  /** Fler grupper än taket: "Alla grupper (N)" ska visas. */
  more: boolean
  /** Totalt antal grupper (N i "Alla grupper (N)"). */
  total: number
}

export function planGroupChips(groups: readonly string[], selected: string | null, max = MAX_GROUP_CHIPS): GroupChipPlan {
  const chips = groups.slice(0, max)
  const extra = selected !== null && selected !== FAVS && !chips.includes(selected) && groups.includes(selected) ? selected : null
  return { chips, extra, more: groups.length > max, total: groups.length }
}

/** Gruppsökningen: delsträng, utan hänsyn till skiftläge, trimmad fråga. Tom fråga = alla. */
export function filterGroupNames(groups: readonly string[], query: string): readonly string[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups.filter((g) => g.toLowerCase().includes(q))
}

export interface GroupChipItem { key: string | null; label: string; id: string }

/**
 * Chipraden som data: Alla, Favoriter (om några), en ev. extra vald grupp,
 * de kapade grupperna och sist "Alla grupper (N)".
 */
export function buildGroupChips({ groups, selected, hasFavourites, labels, max }: {
  groups: readonly string[]
  selected: string | null
  hasFavourites: boolean
  labels: { all: string; favourites: string; more: (count: number) => string }
  max?: number
}): GroupChipItem[] {
  const plan = planGroupChips(groups, selected, max)
  return [
    { key: null, label: labels.all, id: 'all' },
    ...(hasFavourites ? [{ key: FAVS, label: labels.favourites, id: 'favs' }] : []),
    ...(plan.extra !== null ? [{ key: plan.extra, label: plan.extra, id: plan.extra }] : []),
    ...plan.chips.map((g) => ({ key: g, label: g, id: g })),
    ...(plan.more ? [{ key: MORE_GROUPS, label: labels.more(plan.total), id: 'more-groups' }] : []),
  ]
}

/** Kanaler per grupp, för antalet i grupplistan. */
export function groupCounts(channels: readonly { group: string }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const c of channels) counts.set(c.group, (counts.get(c.group) ?? 0) + 1)
  return counts
}
