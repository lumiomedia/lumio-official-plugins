/**
 * Kanaldefinitionen: regler, inte innehåll. Vad som faktiskt sänds räknas
 * fram ur reglerna och källorna (pool.ts + schedule.ts), så samma definition
 * ger samma tablå på alla enheter med samma innehåll.
 */
export type SourceId = 'library' | 'watchlist' | 'debrid'
export type Era = 'any' | '70s' | '80s' | '90s' | '00s' | '10s' | '20s'
export type LengthRule = 'any' | 'short' | 'episode' | 'feature'
export type KindRule = 'any' | 'movie' | 'tv'
export type OrderRule = 'shuffle' | 'chrono' | 'episodes'
export type AirWindow = 'always' | 'evenings' | 'late'

export interface ChannelDef {
  id: string
  name: string
  number: number
  hue: number
  sources: SourceId[]
  genres: string[]
  era: Era
  length: LengthRule
  kind: KindRule
  order: OrderRule
  airWindow: AirWindow
  showOnHome: boolean
  seed: number
  createdAt: number
}

export type ChannelDraft = Omit<ChannelDef, 'id' | 'number' | 'hue' | 'seed' | 'createdAt'>

export const ERA_RANGES: Record<Exclude<Era, 'any'>, [number, number]> = {
  '70s': [1970, 1979], '80s': [1980, 1989], '90s': [1990, 1999],
  '00s': [2000, 2009], '10s': [2010, 2019], '20s': [2020, 2029],
}

export function emptyDraft(): ChannelDraft {
  return {
    name: '', sources: ['library'], genres: [], era: 'any', length: 'any', kind: 'any',
    order: 'shuffle', airWindow: 'always', showOnHome: true,
  }
}

export function nextChannelNumber(channels: ChannelDef[]): number {
  const taken = new Set(channels.map((c) => c.number))
  let n = 1
  while (taken.has(n)) n += 1
  return n
}

export function createChannel(draft: ChannelDraft, existing: ChannelDef[], now = Date.now(), random: () => number = Math.random): ChannelDef {
  return {
    ...draft,
    name: draft.name.trim(),
    id: `ch-${now.toString(36)}-${Math.floor(random() * 1e9).toString(36)}`,
    number: nextChannelNumber(existing),
    hue: Math.floor(random() * 360),
    seed: Math.floor(random() * 2 ** 31),
    createdAt: now,
  }
}

export function validateDraft(draft: ChannelDraft, matchingTitles: number | null): { errors: Array<'name' | 'sources'>; warnings: Array<'few-titles'> } {
  const errors: Array<'name' | 'sources'> = []
  if (!draft.name.trim()) errors.push('name')
  if (draft.sources.length === 0) errors.push('sources')
  const warnings: Array<'few-titles'> = matchingTitles != null && matchingTitles < 5 ? ['few-titles'] : []
  return { errors, warnings }
}

export const PRESETS: Array<{ id: 'evening-film' | 'comfort-series' | 'late-shorts'; draft: ChannelDraft }> = [
  { id: 'evening-film', draft: { ...emptyDraft(), name: 'Kvällsfilm', kind: 'movie', length: 'feature', airWindow: 'evenings', sources: ['library', 'watchlist', 'debrid'] } },
  { id: 'comfort-series', draft: { ...emptyDraft(), name: 'Komfortserier', kind: 'tv', order: 'episodes', sources: ['library', 'watchlist', 'debrid'] } },
  { id: 'late-shorts', draft: { ...emptyDraft(), name: 'Kortfilmer efter midnatt', length: 'short', airWindow: 'late', sources: ['library', 'watchlist', 'debrid'] } },
]

export function hueGradient(hue: number): string {
  const h = ((hue % 360) + 360) % 360
  return `linear-gradient(135deg, hsl(${h} 60% 32%), hsl(${(h + 40) % 360} 55% 14%))`
}

export function channelInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}
