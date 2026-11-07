'use client'

import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_GLOBAL_EPG_ID, LIVE_TV_PLUGIN_ID, channelKey, type M3uChannel } from './live-tv-data'
import { epgSearch } from './index-client'
import { resolveChannelKeys } from './channel-resolver'
import { getReminders, reminderId, replaceKeywordReminders, type Reminder } from './reminders'
import type { EpgProgramme } from './epg/types'

/*
  BEVAKA I TABLÅN.

  Ett sparat sökord ("Allsvenskan", "Bond") letas upp i hela guiden med appens
  egen sökning (/epg/search — lokalt index, inga externa anrop) i titlar och,
  som helt ord, programbeskrivningar ("Bond" hittar Goldfinger). Träffarna
  blir vanliga påminnelser med `origin: 'keyword'`, så schemaläggaren i
  reminders.ts säger till strax före start precis som för en handsatt
  påminnelse. Nya träffar efter första synken ger dessutom en notis direkt
  ("dyker upp i tablån"); vid första synken registreras de tyst, annars hade
  ett nytt sökord gett en notis per träff på en gång.
*/

export const EPG_WATCHES_KEY = 'epg_watches_v1'
export const EPG_WATCH_MIN_QUERY = 2
/** Hur långt fram guiden söks: lika långt som tablån sparas (48 h). */
export const EPG_WATCH_HORIZON_MS = 48 * 60 * 60_000
/** Högst så många kommande träffar per sökord blir påminnelser. */
export const EPG_WATCH_MAX_HITS = 10
export const EPG_WATCH_SYNC_MS = 30 * 60_000
/** Första synken väntar så att appstarten inte delar tid med sökningen. */
export const EPG_WATCH_START_DELAY_MS = 90_000

export interface EpgWatch {
  id: string
  query: string
  createdAt: number
  /** Satt efter första synken; först därefter ger nya träffar en notis. */
  primedAt?: number
  /** Påminnelse-id:n som redan setts för sökordet (kommande program). */
  seen?: string[]
}

export interface EpgWatchHit {
  watch: EpgWatch
  channel: M3uChannel
  programme: EpgProgramme
}

// ---------------------------------------------------------------------------
// Lagring
// ---------------------------------------------------------------------------

function sanitize(raw: unknown): EpgWatch[] {
  if (!Array.isArray(raw)) return []
  const out: EpgWatch[] = []
  for (const item of raw) {
    const w = item as Partial<EpgWatch> | null
    if (!w || typeof w.id !== 'string' || typeof w.query !== 'string') continue
    out.push({
      id: w.id,
      query: w.query,
      createdAt: typeof w.createdAt === 'number' ? w.createdAt : 0,
      primedAt: typeof w.primedAt === 'number' ? w.primedAt : undefined,
      seen: Array.isArray(w.seen) ? w.seen.filter((s): s is string => typeof s === 'string') : undefined,
    })
  }
  return out
}

export function getEpgWatches(): EpgWatch[] {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, EPG_WATCHES_KEY, []))
}

function write(list: EpgWatch[]): void {
  writePluginJson(LIVE_TV_PLUGIN_ID, EPG_WATCHES_KEY, list)
}

export function normalizeWatchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ')
}

/** Lägger till ett sökord; samma ord (oavsett skiftläge) läggs inte till två gånger. */
export function addEpgWatch(query: string, now: number = Date.now()): EpgWatch[] {
  const q = normalizeWatchQuery(query)
  const current = getEpgWatches()
  if (q.length < EPG_WATCH_MIN_QUERY || current.some((w) => w.query.toLowerCase() === q.toLowerCase())) return current
  const next = [...current, { id: `w${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, query: q, createdAt: now }]
  write(next)
  // Användarens eget ord: sök direkt, inte om en halvtimme.
  syncNow?.()
  return next
}

export function removeEpgWatch(id: string): EpgWatch[] {
  const next = getEpgWatches().filter((w) => w.id !== id)
  write(next)
  return next
}

export function hasEpgWatch(query: string): boolean {
  const q = normalizeWatchQuery(query).toLowerCase()
  return getEpgWatches().some((w) => w.query.toLowerCase() === q)
}

export function onEpgWatchesChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, EPG_WATCHES_KEY, listener)
}

// ---------------------------------------------------------------------------
// Rena regler
// ---------------------------------------------------------------------------

/**
 * Träffarna som påminnelser. Samma program på flera kanaler (HD, +1, regional)
 * blir EN påminnelse — den första kanalen per titel och starttid — och bara
 * program som inte redan börjat.
 */
export function keywordReminders(hits: EpgWatchHit[], now: number): Reminder[] {
  const byShow = new Map<string, EpgWatchHit>()
  for (const hit of [...hits].sort((a, b) => a.programme.start - b.programme.start)) {
    if (hit.programme.start <= now) continue
    const show = `${hit.programme.title.trim().toLowerCase()}@${hit.programme.start}`
    if (!byShow.has(show)) byShow.set(show, hit)
  }
  return [...byShow.values()].map(({ channel, programme }) => ({
    id: reminderId(channel, programme),
    channelKey: channelKey(channel),
    channelName: channel.name,
    channelUrl: channel.url,
    channelLogo: channel.logo ?? null,
    channelGroup: channel.group,
    channelTvgId: channel.tvgId,
    title: programme.title,
    start: programme.start,
    stop: programme.stop,
    createdAt: now,
    origin: 'keyword' as const,
  }))
}

/** Starttiden ur ett påminnelse-id (`kanal@start`), eller null. */
function startOfId(id: string): number | null {
  const at = id.lastIndexOf('@')
  const n = at >= 0 ? Number(id.slice(at + 1)) : NaN
  return Number.isFinite(n) ? n : null
}

/**
 * Vilka träffar är NYA för sökordet? Före första synken (inte `primedAt`)
 * räknas inget som nytt. `seen` är UNIONEN av allt som setts och ännu inte
 * börjat — inte bara senaste svaret — så en träff som glider in i fönstret
 * när en annan börjat, eller en guide som var tom en stund, aldrig räknas som
 * ny igen.
 */
export function updateWatchSeen(
  watch: EpgWatch,
  reminders: Reminder[],
  now: number,
): { watch: EpgWatch; discovered: Reminder[] } {
  const previous = new Set(watch.seen ?? [])
  const discovered = watch.primedAt === undefined ? [] : reminders.filter((r) => !previous.has(r.id))
  const seen = [...new Set([...(watch.seen ?? []), ...reminders.map((r) => r.id)])]
    .filter((id) => (startOfId(id) ?? now) > now)
  return { watch: { ...watch, primedAt: watch.primedAt ?? now, seen }, discovered }
}

// ---------------------------------------------------------------------------
// Synk
// ---------------------------------------------------------------------------

export interface EpgWatchSyncDeps {
  search: typeof epgSearch
  resolve: (keys: string[]) => Promise<Array<M3uChannel & { key: string }>>
}

const defaultDeps: EpgWatchSyncDeps = {
  search: epgSearch,
  resolve: (keys) => resolveChannelKeys(keys) as unknown as Promise<Array<M3uChannel & { key: string }>>,
}

/** Söker varje sökord, skriver påminnelserna och svarar med nyupptäckta träffar per sökord. */
export async function syncEpgWatches(
  now: number = Date.now(),
  deps: EpgWatchSyncDeps = defaultDeps,
): Promise<{ watch: EpgWatch; reminders: Reminder[] }[]> {
  const watches = getEpgWatches()
  if (watches.length === 0) {
    replaceKeywordReminders([], now)
    return []
  }
  const all: Reminder[] = []
  const updated: EpgWatch[] = []
  const discovered: { watch: EpgWatch; reminders: Reminder[] }[] = []
  let failed = false
  for (const watch of watches) {
    let reminders: Reminder[]
    try {
      const items = await deps.search(LIVE_TV_GLOBAL_EPG_ID, watch.query, now, now + EPG_WATCH_HORIZON_MS, EPG_WATCH_MAX_HITS * 3, { inDescription: true })
      const channels = await deps.resolve(items.map((item) => item.key))
      const byKey = new Map(channels.map((channel) => [channel.key, channel]))
      const hits: EpgWatchHit[] = []
      for (const item of items) {
        const channel = byKey.get(item.key)
        if (channel) hits.push({ watch, channel, programme: item.programme })
      }
      reminders = keywordReminders(hits, now).slice(0, EPG_WATCH_MAX_HITS)
    } catch {
      // Sökningen föll (guiden laddas om, appen upptagen): behåll sökordet orört
      // och låt nästa synk försöka. Inga påminnelser tas bort på ett fel.
      updated.push(watch)
      failed = true
      continue
    }
    const result = updateWatchSeen(watch, reminders, now)
    updated.push(result.watch)
    all.push(...reminders)
    if (result.discovered.length > 0) discovered.push({ watch, reminders: result.discovered })
  }
  // Påminnelserna bär inte sitt sökord, så ett misslyckat sökord kan inte
  // pekas ut: behåll då de befintliga och lägg de nya ovanpå.
  const keep = failed ? getReminders(now).filter((r) => r.origin === 'keyword') : []
  replaceKeywordReminders([...keep, ...all], now)
  // Sökorden kan ha ändrats under synken: skriv bara tillbaka dem som finns kvar.
  // Bara när något faktiskt ändrats: listan synkas mellan enheter.
  const latest = getEpgWatches()
  const stillThere = new Set(latest.map((w) => w.id))
  const next = updated.filter((w) => stillThere.has(w.id))
  const added = latest.filter((w) => !updated.some((u) => u.id === w.id))
  const merged = [...next, ...added]
  if (JSON.stringify(merged) !== JSON.stringify(latest)) write(merged)
  return discovered
}

const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden'

/** Startad synks "kör nu", för användarens egna ändringar (addEpgWatch). */
let syncNow: (() => void) | null = null

/**
 * Kör synken var halvtimme, när appen blir synlig igen och direkt när
 * användaren lägger till ett ord — aldrig i bakgrunden och inte under
 * startfönstret (samma regler som avsparksnotisen). En ändring i lagringen
 * (t.ex. en synk från en annan enhet) kör bara när startfönstret är förbi.
 * `onDiscovered` får ett sökords nya träffar samlade, en gång per synk.
 */
export function startEpgWatchSync(onDiscovered: (watch: EpgWatch, reminders: Reminder[]) => void): () => void {
  let stopped = false
  let ready = false
  let running = false
  let rerun = false
  const run = () => {
    if (stopped || !ready || hidden()) return
    if (running) { rerun = true; return }
    running = true
    rerun = false
    void syncEpgWatches()
      .then((found) => { if (!stopped) for (const { watch, reminders } of found) onDiscovered(watch, reminders) })
      .catch(() => {})
      .finally(() => {
        running = false
        if (rerun) run()
      })
  }
  const startTimer = window.setTimeout(() => { ready = true; run() }, EPG_WATCH_START_DELAY_MS)
  const timer = window.setInterval(run, EPG_WATCH_SYNC_MS)
  const onVisibility = () => { if (!hidden()) run() }
  document.addEventListener('visibilitychange', onVisibility)
  // Synkens egen skrivning väcker också lyssnaren; den markerar bara `rerun`
  // medan synken pågår, och nästa körning hittar inget nytt att skriva.
  const off = onEpgWatchesChanged(run)
  syncNow = () => { ready = true; run() }
  return () => {
    stopped = true
    syncNow = null
    window.clearTimeout(startTimer)
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    off()
  }
}
