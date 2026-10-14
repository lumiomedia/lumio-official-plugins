/**
 * Kanalstudions rena logik: förhandsvisning, antal per källa och genrelistan.
 * Källorna hämtas en gång när studion öppnas; allt här räknas lokalt om vid
 * varje regeländring, utan uppslag och utan strömmar.
 */
import type { AirWindow, ChannelDraft, SourceId } from '../model/channel'
import { buildRundown, listing } from '../model/schedule'
import { dedupePool, filterPool, type PoolItem } from '../data/pool'
import { canonGenre } from '../data/genres'
import { GENRE_TEXT, type S } from '../strings'

export interface SourcePools { library: PoolItem[]; watchlist: PoolItem[]; debrid: PoolItem[] }

export interface PreviewRow { start: number; title: string; meta: string; isNow: boolean }

export interface Preview {
  count: number
  totalHours: number
  /** Nyckel i strings.ts — vyn översätter. */
  windowLabel: WindowTextKey
  tonight: PreviewRow[]
}

type WindowTextKey = Extract<keyof typeof S, 'windowAlways' | 'windowEvenings' | 'windowLate'>

/** Sändningsfönstrets text ('Dygnet runt' | 'Kvällar 18–02' | 'Efter midnatt 00–06') som nyckel i strings.ts. */
export const WINDOW_LABEL: Record<AirWindow, WindowTextKey> = {
  always: 'windowAlways',
  evenings: 'windowEvenings',
  late: 'windowLate',
}

const MIN = 60_000
const MAX_ROWS = 8

export function sourceCounts(pools: SourcePools): Record<SourceId, number> {
  return { library: pools.library.length, watchlist: pools.watchlist.length, debrid: pools.debrid.length }
}

/** Valda källor ihop, utan dubbletter, efter reglerna — samma väg som kanalens riktiga pool. */
export function matchingPool(draft: ChannelDraft, pools: SourcePools): PoolItem[] {
  const picked = draft.sources.flatMap((s) => pools[s] ?? [])
  return filterPool(dedupePool(picked), draft)
}

/** Nästa 03:00 efter nu; ligger den närmare än en timme blir det natten därpå. */
export function tonightEnd(now: number): number {
  const d = new Date(now)
  let end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 3, 0, 0).getTime()
  while (end - now < 60 * MIN) {
    const e = new Date(end)
    end = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1, 3, 0, 0).getTime()
  }
  return end
}

function metaFor(item: PoolItem): string {
  const parts: string[] = []
  if (item.kind === 'episode') {
    if (item.seriesTitle && item.seriesTitle !== item.title) parts.push(item.seriesTitle)
    if (item.season != null && item.episode != null) parts.push(`S${item.season}E${item.episode}`)
  } else {
    // "Film" heter likadant på båda språken.
    parts.push('Film')
    if (item.year != null) parts.push(String(item.year))
  }
  parts.push(`${Math.round(item.runtimeMin)} min`)
  return parts.join(' · ')
}

export function previewFor(draft: ChannelDraft, pools: SourcePools, seed: number, now: number): Preview {
  const pool = matchingPool(draft, pools)
  const minutes = pool.reduce((sum, item) => sum + Math.max(0, item.runtimeMin), 0)
  const hours = minutes / 60
  const totalHours = hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)
  const rundown = buildRundown(pool, draft.order, seed)
  const tonight: PreviewRow[] = []
  for (const slot of listing(rundown, draft.airWindow, now, tonightEnd(now))) {
    if (slot.kind !== 'programme') continue
    tonight.push({ start: slot.start, title: slot.item.title, meta: metaFor(slot.item), isNow: slot.start <= now && now < slot.stop })
    if (tonight.length >= MAX_ROWS) break
  }
  return { count: pool.length, totalHours, windowLabel: WINDOW_LABEL[draft.airWindow], tonight }
}

/** Visningsnamn per kanonisk token: TMDb:s stavning när den finns. */
const STANDARD_BY_TOKEN = new Map(Object.keys(GENRE_TEXT).map((name) => [canonGenre(name)[0]!, name]))

const titleCase = (token: string) => token.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())

/** Genrevalets namn för en kanonisk token. */
export function genreName(token: string, seen?: string): string {
  return STANDARD_BY_TOKEN.get(token) ?? seen ?? titleCase(token)
}

/**
 * Poolernas genrer plus TMDb:s standardgenrer som saknas, en per kanonisk
 * token ("Sci-Fi" och "Science Fiction" blir ett val, "Action & Adventure"
 * blir Action + Adventure), med TMDb-stavning där den finns. Sorterad.
 */
export function genreOptions(pools: SourcePools): string[] {
  const seen = new Map<string, string>()
  for (const item of [...pools.library, ...pools.watchlist, ...pools.debrid]) {
    for (const genre of item.genres) {
      const tokens = canonGenre(genre)
      // En ensam token behåller källans stavning om TMDb inte har en egen.
      for (const token of tokens) if (!seen.has(token)) seen.set(token, genreName(token, tokens.length === 1 ? genre.trim() : undefined))
    }
  }
  for (const [token, name] of STANDARD_BY_TOKEN) if (!seen.has(token)) seen.set(token, name)
  const cmp = (a: string, b: string) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0)
  return [...seen.values()].sort(cmp)
}

/** Visningstext för en genre: svensk för TMDb:s standardgenrer, annars som den står. */
export function genreLabel(name: string, lang: 'en' | 'sv'): string {
  return GENRE_TEXT[name]?.[lang] ?? name
}
