import type { ListCuration } from './live-tv-data'

/**
 * Rena funktioner för kategorikuratering (spec 2026-09-24): dolda grupper
 * och ihopslagningar per källa, tillämpade i modellen ovanpå indexet.
 *
 * Gruppfältet kan vara semikolonseparerat ("Sport;HD") — samma regel som
 * Rust-indexets `groups_of`: varje delgrupp bedöms för sig. En kanal döljs
 * först när ALLA dess delgrupper är dolda; en delgrupp i en ihopslagning
 * byter namn till ihopslagningens.
 */

function splitGroups(group: string): string[] {
  return group.split(';').map((s) => s.trim()).filter(Boolean)
}

/**
 * Normaliserar reglerna till det format som sparas: trimmade, unika namn,
 * varje grupp i högst en merge (första vinner). En grupp får vara dold OCH
 * ingå i en merge: mergen vinner så länge den finns, och det dolda läget
 * vilar under den så att "Split" återställer grupperna precis som de var
 * (handoff 2026-09-24 §2). Tom kuratering blir `undefined` så att fältet
 * kan utelämnas ur lagringen.
 */
export function normalizeCuration(curation: ListCuration | undefined): ListCuration | undefined {
  if (!curation) return undefined
  const merges: { name: string; groups: string[] }[] = []
  const claimed = new Set<string>()
  const names = new Set<string>()
  for (const merge of curation.merges ?? []) {
    const name = (merge.name ?? '').trim()
    if (!name || names.has(name)) continue
    const groups: string[] = []
    for (const raw of merge.groups ?? []) {
      const g = (raw ?? '').trim()
      if (!g || claimed.has(g)) continue
      claimed.add(g)
      groups.push(g)
    }
    if (groups.length === 0) continue
    names.add(name)
    merges.push({ name, groups })
  }
  const hidden: string[] = []
  for (const raw of curation.hidden ?? []) {
    const g = (raw ?? '').trim()
    if (!g || hidden.includes(g)) continue
    hidden.push(g)
  }
  if (hidden.length === 0 && merges.length === 0) return undefined
  return { hidden, merges }
}

function mergeNameFor(curation: ListCuration): Map<string, string> {
  const map = new Map<string, string>()
  for (const merge of curation.merges) for (const g of merge.groups) map.set(g, merge.name)
  return map
}

export function applyCuration<T extends { group: string }>(channels: readonly T[], curation: ListCuration | undefined): T[] {
  if (!curation || (curation.hidden.length === 0 && curation.merges.length === 0)) return [...channels]
  const hidden = new Set(curation.hidden)
  const renamed = mergeNameFor(curation)
  const out: T[] = []
  for (const channel of channels) {
    const parts = splitGroups(channel.group)
    if (parts.length === 0) {
      out.push(channel)
      continue
    }
    const kept: string[] = []
    for (const part of parts) {
      // Mergen går före det dolda läget: en dold medlem följer med in i mergen.
      const merged = renamed.get(part)
      if (merged === undefined && hidden.has(part)) continue
      const name = merged ?? part
      if (!kept.includes(name)) kept.push(name)
    }
    if (kept.length === 0) continue
    const group = kept.join(';')
    out.push(group === channel.group ? channel : { ...channel, group })
  }
  return out
}

/**
 * Panelens och menyns underlag ur listans OKURATERADE gruppkvitto: dolda
 * borttagna, ihopslagningar summerade, sorterat efter antal fallande sedan
 * namn. En merge vars grupper alla saknas i källan faller bort.
 */
export function curatedGroupCounts(
  groups: readonly { name: string; count: number }[],
  curation: ListCuration | undefined,
): { name: string; count: number }[] {
  const hidden = new Set(curation?.hidden ?? [])
  const renamed = curation ? mergeNameFor(curation) : new Map<string, string>()
  const counts = new Map<string, number>()
  for (const { name, count } of groups) {
    const merged = renamed.get(name)
    if (merged === undefined && hidden.has(name)) continue
    const target = merged ?? name
    counts.set(target, (counts.get(target) ?? 0) + count)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/**
 * Byter namn på mergen med givet index. Tomt namn eller krock med en annan
 * merge ger en oförändrad kopia — anroparen visar sin egen toast.
 */
export function renameMerge(curation: ListCuration, index: number, name: string): ListCuration {
  const trimmed = name.trim()
  const copy: ListCuration = { hidden: [...curation.hidden], merges: curation.merges.map((m) => ({ name: m.name, groups: [...m.groups] })) }
  if (!trimmed || !copy.merges[index]) return copy
  if (copy.merges.some((m, i) => i !== index && m.name === trimmed)) return copy
  copy.merges[index] = { ...copy.merges[index], name: trimmed }
  return copy
}

/**
 * Varför ett merge-namn inte kan användas, eller null när det går.
 * `members` är grupperna som ska ingå i den nya mergen: att döpa mergen efter
 * en av sina egna medlemmar ("UK Sport" + "Sports UK" → "UK Sport") är det
 * naturliga och tillåts — medlemmen försvinner ju som egen post.
 */
export function mergeNameConflict(
  name: string,
  groups: readonly { name: string }[],
  curation: ListCuration,
  members: readonly string[] = [],
): 'empty' | 'duplicate' | 'visible-group' | null {
  const trimmed = name.trim()
  if (!trimmed) return 'empty'
  if (curation.merges.some((m) => m.name === trimmed)) return 'duplicate'
  const claimed = new Set([...curation.merges.flatMap((m) => m.groups), ...members])
  const hidden = new Set(curation.hidden)
  if (groups.some((g) => g.name === trimmed && !hidden.has(g.name) && !claimed.has(g.name))) return 'visible-group'
  return null
}
