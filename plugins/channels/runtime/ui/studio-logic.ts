/**
 * Kanalstudions rena logik: förhandsvisning, antal per källa och genrelistan.
 * Källorna hämtas en gång när studion öppnas; allt här räknas lokalt om vid
 * varje regeländring, utan uppslag och utan strömmar.
 */
import { channelTitleKey, hasTitles, normTitle, type AirWindow, type ChannelDraft, type ChannelTitle, type OrderRule, type SourceId, type TitleSuggestion } from '../model/channel'
import { buildRundown, listing } from '../model/schedule'
import { applyChannelRules, dedupePool, restrictToTitles, type PoolItem } from '../data/pool'
import { canonGenre } from '../data/genres'
import { GENRE_TEXT, type S } from '../strings'

export interface SourcePools { library: PoolItem[]; watchlist: PoolItem[]; debrid: PoolItem[]; vod: PoolItem[] }

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
  return { library: pools.library.length, watchlist: pools.watchlist.length, debrid: pools.debrid.length, vod: pools.vod.length }
}

/**
 * Valda källor ihop, utan dubbletter, efter reglerna — samma väg som kanalens
 * riktiga pool. `extra` = reservposter för utvalda titlar som saknas i källorna.
 */
export function matchingPool(draft: ChannelDraft, pools: SourcePools, extra: PoolItem[] = []): PoolItem[] {
  const picked = draft.sources.flatMap((s) => pools[s] ?? [])
  return applyChannelRules(dedupePool(picked), draft, extra)
}

/** Utvalda titlar som ingen av de valda källorna har (de hämtas via reservvägen). */
export function missingTitles(draft: ChannelDraft, pools: SourcePools): ChannelTitle[] {
  if (!hasTitles(draft)) return []
  return restrictToTitles(dedupePool(draft.sources.flatMap((s) => pools[s] ?? [])), draft.titles!).missing
}

/** Namnet som sparas: det inskrivna, annars titeln när exakt en titel är vald. */
export function effectiveName(draft: Pick<ChannelDraft, 'name' | 'titles'>): string {
  const typed = draft.name.trim()
  if (typed) return typed
  return draft.titles?.length === 1 ? draft.titles[0]!.title : ''
}

/**
 * Ordningen när titelvalet ändras: blir det exakt en serie byts ordningen till
 * "Avsnitt i följd" — om användaren inte själv valt ordning i studion.
 */
export function orderForTitles(titles: readonly ChannelTitle[], current: OrderRule, touched: boolean): OrderRule {
  if (touched) return current
  return titles.length === 1 && titles[0]!.kind === 'tv' ? 'episodes' : current
}

/** En poolpost som titelval: serien för ett avsnitt, filmen själv annars. */
function titleOfItem(item: PoolItem): TitleSuggestion {
  const tv = item.kind === 'episode'
  const libraryKey = item.tmdbId != null ? undefined : item.play.type === 'library' ? item.play.key : item.seriesKey ?? item.ref
  return {
    kind: tv ? 'tv' : 'movie',
    ...(item.tmdbId != null ? { tmdbId: item.tmdbId } : {}),
    ...(libraryKey ? { libraryKey } : {}),
    title: tv ? item.seriesTitle ?? item.title : item.title,
    year: item.year,
    ...(item.posterUrl ? { posterUrl: item.posterUrl } : {}),
  }
}

/** Likhet mellan två titelval: samma tmdbId, annars samma nyckel, annars samma namn + år. */
export function sameTitle(a: ChannelTitle, b: ChannelTitle): boolean {
  if (a.kind !== b.kind) return false
  if (a.tmdbId != null && b.tmdbId != null) return a.tmdbId === b.tmdbId
  if (a.libraryKey && b.libraryKey && a.libraryKey === b.libraryKey) return true
  return normTitle(a.title) === normTitle(b.title) && (a.year == null || b.year == null || a.year === b.year)
}

export const SUGGESTION_LIMIT = 8

/**
 * Lokala förslag ur de redan hämtade källpoolerna (direkt, utan anrop):
 * titlar vars namn innehåller sökordet, de som börjar med det först.
 */
export function localTitleSuggestions(pools: SourcePools, query: string, limit = SUGGESTION_LIMIT): TitleSuggestion[] {
  const q = normTitle(query)
  if (q.length < 2) return []
  const byKey = new Map<string, { s: TitleSuggestion; rank: number }>()
  for (const item of [...pools.library, ...pools.watchlist, ...pools.debrid, ...pools.vod]) {
    const s = titleOfItem(item)
    const name = normTitle(s.title)
    const at = name.indexOf(q)
    if (at < 0) continue
    const key = channelTitleKey(s)
    const current = byKey.get(key)
    if (!current) byKey.set(key, { s, rank: at === 0 ? 0 : 1 })
    else if (!current.s.posterUrl && s.posterUrl) current.s = { ...current.s, posterUrl: s.posterUrl }
  }
  return [...byKey.values()]
    .sort((a, b) => a.rank - b.rank || (a.s.title.toLowerCase() < b.s.title.toLowerCase() ? -1 : a.s.title.toLowerCase() > b.s.title.toLowerCase() ? 1 : 0))
    .slice(0, limit)
    .map((x) => x.s)
}

/**
 * Förslagslistan: lokala träffar först, sedan TMDb:s, utan dubbletter
 * (samma titel från båda håll visas en gång) och utan redan valda titlar.
 */
export function mergeSuggestions(local: readonly TitleSuggestion[], remote: readonly TitleSuggestion[], selected: readonly ChannelTitle[], limit = SUGGESTION_LIMIT, query?: string): TitleSuggestion[] {
  const out: TitleSuggestion[] = []
  for (const s of [...local, ...remote]) {
    if (selected.some((t) => sameTitle(t, s))) continue
    const dup = out.findIndex((o) => sameTitle(o, s))
    if (dup >= 0) {
      // Den lokala posten vinner, men tar TMDb:s id och affisch när den saknar dem.
      const o = out[dup]!
      out[dup] = { ...o, ...(o.tmdbId == null && s.tmdbId != null ? { tmdbId: s.tmdbId } : {}), ...(!o.posterUrl && s.posterUrl ? { posterUrl: s.posterUrl } : {}) }
      continue
    }
    out.push(s)
  }
  return rankSuggestions(out, query).slice(0, limit)
}

/**
 * Bäst först: exakt namnträff, sedan namn som börjar med sökordet, sedan resten.
 * Vid samma nivå serier före filmer (en kanal av en titel är oftast en serie),
 * annars sökningens egen ordning. Utan sökord: oförändrad ordning.
 */
export function rankSuggestions<T extends { title: string; kind: 'movie' | 'tv' }>(list: readonly T[], query?: string): T[] {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return [...list]
  const level = (t: T) => {
    const n = t.title.trim().toLowerCase()
    return n === q ? 0 : n.startsWith(q) ? 1 : 2
  }
  return list
    .map((t, i) => ({ t, i }))
    .sort((a, b) => level(a.t) - level(b.t) || (a.t.kind === b.t.kind ? 0 : a.t.kind === 'tv' ? -1 : 1) || a.i - b.i)
    .map((x) => x.t)
}

/** Titelvalet som sparas i kanalen (utan affisch: den hör till visningen). */
export function toChannelTitle(s: TitleSuggestion): ChannelTitle {
  return {
    kind: s.kind, title: s.title,
    ...(s.tmdbId != null ? { tmdbId: s.tmdbId } : {}),
    ...(s.libraryKey ? { libraryKey: s.libraryKey } : {}),
    ...(s.year != null ? { year: s.year } : {}),
  }
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

export function previewFor(draft: ChannelDraft, pools: SourcePools, seed: number, now: number, extra: PoolItem[] = []): Preview {
  const pool = matchingPool(draft, pools, extra)
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
export function genreLabel(name: string, lang: string): string {
  const row = GENRE_TEXT[name] as Record<string, string> | undefined
  return row?.[lang] ?? row?.en ?? name
}

export type SearchStatus = 'idle' | 'searching' | 'done' | 'failed'
export interface SearchState { query: string; results: TitleSuggestion[]; status: SearchStatus }

/**
 * TMDb-sökningen bakom titelfältet, snål mot rate limits: väntar `debounceMs`
 * efter sista tangenten, söker inte under `minChars` tecken, har högst ETT
 * anrop ute åt gången (en ny sökning medan ett anrop pågår köas, och bara den
 * senaste körs) och minns svaren per sökord. Bara svaret på det aktuella
 * sökordet rapporteras.
 */
export function createTitleSearch(
  search: (query: string) => Promise<TitleSuggestion[]>,
  onState: (state: SearchState) => void,
  debounceMs = 350,
  minChars = 2,
) {
  const cache = new Map<string, TitleSuggestion[]>()
  let current = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  let inflight = false
  let queued: string | null = null
  let disposed = false
  const emit = (state: SearchState) => { if (!disposed) onState(state) }
  const keyOf = (q: string) => q.toLowerCase()

  function run(q: string): void {
    inflight = true
    search(q).then(
      (results) => {
        cache.set(keyOf(q), results)
        if (keyOf(q) === current) emit({ query: q, results, status: 'done' })
      },
      () => { if (keyOf(q) === current) emit({ query: q, results: [], status: 'failed' }) },
    ).finally(() => {
      inflight = false
      const next = queued
      queued = null
      if (!disposed && next != null && keyOf(next) === current && !cache.has(current)) run(next)
    })
  }

  function fire(q: string): void {
    const hit = cache.get(keyOf(q))
    if (hit) { emit({ query: q, results: hit, status: 'done' }); return }
    if (inflight) { queued = q; return }
    run(q)
  }

  return {
    set(raw: string): void {
      const q = raw.trim()
      current = keyOf(q)
      if (timer) { clearTimeout(timer); timer = undefined }
      if (q.length < minChars) { queued = null; emit({ query: q, results: [], status: 'idle' }); return }
      const hit = cache.get(current)
      if (hit) { emit({ query: q, results: hit, status: 'done' }); return }
      emit({ query: q, results: [], status: 'searching' })
      timer = setTimeout(() => { timer = undefined; fire(q) }, debounceMs)
    },
    dispose(): void {
      disposed = true
      if (timer) clearTimeout(timer)
    },
  }
}
