import { canonGenres } from '../data/genres'

/**
 * Kanaldefinitionen: regler, inte innehåll. Vad som faktiskt sänds räknas
 * fram ur reglerna och källorna (pool.ts + schedule.ts), så samma definition
 * ger samma tablå på alla enheter med samma innehåll.
 */
/**
 * Var titlarna kommer ifrån. 'vod' = IPTV/Xtream-VOD-katalogen i biblioteket
 * (källor med id xtream-vod:…), en egen källa som är AV som standard: de flesta
 * kör debrid, och VOD-katalogen är stor. Kanaler skapade före 0.1.5 med
 * 'library' räknas därför utan VOD — vill man ha den kryssar man i IPTV-VOD.
 */
export type SourceId = 'library' | 'watchlist' | 'debrid' | 'vod'
export type Era = 'any' | '70s' | '80s' | '90s' | '80s90s' | '00s' | '10s' | '20s'
export type LengthRule = 'any' | 'short' | 'episode' | 'feature'
export type KindRule = 'any' | 'movie' | 'tv'
export type OrderRule = 'shuffle' | 'chrono' | 'episodes'
export type AirWindow = 'always' | 'evenings' | 'late'

/**
 * En utvald titel: kanalen sänder då BARA dessa (från valfri av sina källor),
 * och genre-, epok-, längd- och slagreglerna gäller inte. Matchas på tmdbId,
 * sedan biblioteksnyckel/seriesKey, sist tvättad titel + år.
 */
export interface ChannelTitle {
  kind: 'movie' | 'tv'
  tmdbId?: number
  libraryKey?: string
  title: string
  year?: number | null
}

/** Ett förslag i studions titelfält (lokal pool eller TMDb-sökning). */
export interface TitleSuggestion extends ChannelTitle {
  posterUrl?: string
}

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
  /** Utvalda titlar; saknas eller tom = reglerna styr som vanligt. */
  titles?: ChannelTitle[]
  seed: number
  createdAt: number
}

export type ChannelDraft = Omit<ChannelDef, 'id' | 'number' | 'hue' | 'seed' | 'createdAt'>

export const ERA_RANGES: Record<Exclude<Era, 'any'>, [number, number]> = {
  '70s': [1970, 1979], '80s': [1980, 1989], '90s': [1990, 1999], '80s90s': [1980, 1999],
  '00s': [2000, 2009], '10s': [2010, 2019], '20s': [2020, 2029],
}

export function emptyDraft(): ChannelDraft {
  return {
    name: '', sources: ['library', 'watchlist', 'debrid'], genres: [], era: 'any', length: 'any', kind: 'any',
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

/**
 * Standarduppsättningen som skapas första gången Kanaler öppnas (en gång per
 * profil, se state/store.ts). Namnet sparas UPPLÖST på användarens språk när
 * kanalen skapas — det är en vanlig kanal därefter, som går att döpa om, och
 * synkas som den heter. Id, färgton och seed är fasta per förval, så varje
 * enhet får samma standardtablåer och en synkad kopia krockar inte.
 */
export type DefaultChannelId =
  | 'movies-247' | 'series-in-order' | 'action-thrills' | 'comedy' | 'eighties-nineties'
  | 'evening-film' | 'after-midnight' | 'scifi-fantasy' | 'family-animation' | 'drama'

const ALL_SOURCES: SourceId[] = ['library', 'watchlist', 'debrid']
const preset = (over: Partial<ChannelDraft>): Omit<ChannelDraft, 'name'> => {
  const { name: _name, ...base } = emptyDraft()
  return { ...base, sources: [...ALL_SOURCES], showOnHome: true, ...over }
}

export const DEFAULT_CHANNELS: Array<{ id: DefaultChannelId; name: { en: string; sv: string }; hue: number; draft: Omit<ChannelDraft, 'name'> }> = [
  { id: 'movies-247', name: { en: 'Movies around the clock', sv: 'Bio dygnet runt' }, hue: 15, draft: preset({ kind: 'movie', length: 'feature', order: 'shuffle' }) },
  { id: 'series-in-order', name: { en: 'Series in order', sv: 'Serier i följd' }, hue: 200, draft: preset({ kind: 'tv', order: 'episodes' }) },
  { id: 'action-thrills', name: { en: 'Action & thrills', sv: 'Action & spänning' }, hue: 0, draft: preset({ genres: ['Action', 'Thriller', 'Crime'] }) },
  { id: 'comedy', name: { en: 'Comedy', sv: 'Komedi' }, hue: 48, draft: preset({ genres: ['Comedy'] }) },
  { id: 'eighties-nineties', name: { en: '80s & 90s', sv: '80- & 90-tal' }, hue: 300, draft: preset({ kind: 'movie', era: '80s90s' }) },
  { id: 'evening-film', name: { en: 'Evening film', sv: 'Kvällsfilm' }, hue: 25, draft: preset({ kind: 'movie', length: 'feature', airWindow: 'evenings' }) },
  { id: 'after-midnight', name: { en: 'After midnight', sv: 'Efter midnatt' }, hue: 250, draft: preset({ length: 'short', airWindow: 'late' }) },
  { id: 'scifi-fantasy', name: { en: 'Sci-fi & fantasy', sv: 'Sci-fi & fantasy' }, hue: 180, draft: preset({ genres: ['Science Fiction', 'Fantasy'] }) },
  { id: 'family-animation', name: { en: 'Family & animation', sv: 'Familj & animerat' }, hue: 120, draft: preset({ genres: ['Family', 'Animation'] }) },
  { id: 'drama', name: { en: 'Drama', sv: 'Drama' }, hue: 220, draft: preset({ genres: ['Drama'] }) },
]

/** FNV-1a: samma seed för samma förval på alla enheter. */
export function presetSeed(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h % 2 ** 31
}

/** Kanalen är byggd av utvalda titlar (inte regler). */
export const hasTitles = (c: { titles?: readonly ChannelTitle[] | null }): boolean => (c.titles?.length ?? 0) > 0

/** Identitet för en utvald titel (dubblettkontroll, signaturer). */
export function channelTitleKey(t: ChannelTitle): string {
  if (t.tmdbId != null) return `${t.kind}:tmdb:${t.tmdbId}`
  if (t.libraryKey) return `${t.kind}:key:${t.libraryKey}`
  return `${t.kind}:name:${normTitle(t.title)}:${t.year ?? ''}`
}

/** Gemener, utan accenter och skiljetecken — för titeljämförelse. */
export function normTitle(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Titlarnas identiteter sorterade: samma val i annan ordning ger samma signatur. */
export function canonTitles(titles: readonly ChannelTitle[] | undefined): string[] {
  return [...new Set((titles ?? []).map(channelTitleKey))].sort()
}

/** Samma regler (källor, genrer, epok, längd, slag, sändningstid) — namn och ordning räknas inte. */
export function sameRules(a: Pick<ChannelDef, 'sources' | 'genres' | 'era' | 'length' | 'kind' | 'airWindow' | 'titles'>, b: Pick<ChannelDef, 'sources' | 'genres' | 'era' | 'length' | 'kind' | 'airWindow' | 'titles'>): boolean {
  // En titelkanal är aldrig en regeldubblett av ett förval.
  if (hasTitles(a) || hasTitles(b)) return false
  const norm = (c: typeof a) => JSON.stringify([
    [...c.sources].sort(), canonGenres(c.genres).sort(), c.era, c.length, c.kind, c.airWindow,
  ])
  return norm(a) === norm(b)
}

/**
 * Standardkanalerna som saknas, numrerade efter de befintliga. Ett förval
 * hoppas över när en befintlig kanal har samma id eller samma regler.
 */
export function buildDefaultChannels(existing: ChannelDef[], lang: 'en' | 'sv', now = Date.now()): ChannelDef[] {
  const all = [...existing]
  const added: ChannelDef[] = []
  for (const d of DEFAULT_CHANNELS) {
    const id = `ch-default-${d.id}`
    const draft: ChannelDraft = { ...d.draft, name: d.name[lang] }
    if (all.some((c) => c.id === id || sameRules(c, draft))) continue
    const def: ChannelDef = { ...draft, id, number: nextChannelNumber(all), hue: d.hue, seed: presetSeed(d.id), createdAt: now }
    all.push(def)
    added.push(def)
  }
  return added
}

/** Kanalens färgton som platt, halvgenomskinlig ton (ingen gradient). */
export function hueTint(hue: number, alpha = 0.22): string {
  const h = ((hue % 360) + 360) % 360
  return `hsl(${h} 60% 55% / ${alpha})`
}

/**
 * Badgens initialer: bara bokstäver och siffror — &, +, bindestreck och
 * annan interpunktion skiljer ord men syns aldrig ("Action & thrills" → AT,
 * "Sci-fi & fantasy" → SF). Börjar namnet med ett tal används talet
 * ("80s & 90s" → 80).
 */
export function channelInitials(name: string): string {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const first = words[0]
  if (!first) return ''
  const digits = /^\p{N}+/u.exec(first)?.[0]
  if (digits) return digits.slice(0, 2)
  return words.slice(0, 2).map((w) => w[0]!.toLocaleUpperCase()).join('')
}
