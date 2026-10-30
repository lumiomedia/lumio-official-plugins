'use client'

import { useEffect, useState } from 'react'
import { readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, type M3uChannel } from '../live-tv-data'
import type { EpgProgramme } from '../epg/types'

/**
 * PROGRAMBILDER (Jerry 2026-10-30: "se om det går att koppla på bilder").
 *
 * Kedjan, första träff vinner:
 *   1. XMLTV:s `<icon>` per program (appen bär fältet när källan har det —
 *      Jerrys Xtream-XMLTV har det inte, 17 169 program provade).
 *   2. TMDb via appens titelsökning (`/api/media?titleQuery=`), men bara för
 *      titlar som ser ut som verk: sport, nyheter och direktsändningar hoppas
 *      över, och träffen måste vara en exakt titel (eller en av TMDb:s
 *      alternativa titlar). Hellre logoplatta än fel bild.
 *   3. Ingen bild → vyn ritar logoplattan.
 *
 * Uppslagen är dyra för användarens egna sökningar, så de har tak: högst två
 * samtidigt och högst 30 per minut, och både träffar och missar sparas i sju
 * dygn. Nätfel sparas inte — då får nästa visning försöka igen.
 */

const STORE_KEY = 'live_tv_programme_art_v1'
const TTL_MS = 7 * 86_400_000
// Litet tak: lagringen delas med allt annat i appen, och Androids
// localStorage har redan slagit i sina 10 MiB en gång.
const MAX_ENTRIES = 500
const MAX_ACTIVE = 2
const MAX_PER_MINUTE = 30
const FETCH_TIMEOUT_MS = 10_000
const WRITE_DELAY_MS = 2_000

type Entry = { url: string | null; at: number }

/** Ett uppslag per titel, delat av alla som väntar på den. */
interface Job {
  key: string
  title: string
  waiters: number
  started: boolean
  promise: Promise<string | null>
  resolve: (url: string | null) => void
}

let cache: Record<string, Entry> | null = null
const jobs = new Map<string, Job>()
const queue: Job[] = []
let active = 0
let starts: number[] = []
let pumpTimer: ReturnType<typeof setTimeout> | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null

export function __resetProgrammeArtForTests(): void {
  cache = null
  jobs.clear()
  queue.length = 0
  active = 0
  starts = []
  if (pumpTimer) clearTimeout(pumpTimer)
  if (writeTimer) clearTimeout(writeTimer)
  pumpTimer = null
  writeTimer = null
}

export function normaliseTitle(title: string): string {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const BROADCAST_TITLE = /\b(live|news|nyheter|nachrichten|noticias|journal|highlights?|vs|v|day \d+|dag \d+|matchday|round \d+)\b/
const BROADCAST_GROUP = /sport|news|nyheter|nachrichten|noticias|info/i

/** Sport, nyheter och direktsändningar: titlar som inte är ett verk TMDb känner till. */
export function looksLikeBroadcast(title: string, channel: Pick<M3uChannel, 'name' | 'group'>): boolean {
  const t = normaliseTitle(title)
  if (t.length < 3) return true
  if (t === normaliseTitle(channel.name)) return true
  if (BROADCAST_GROUP.test(channel.group ?? '')) return true
  return BROADCAST_TITLE.test(t)
}

function store(): Record<string, Entry> {
  if (!cache) cache = { ...readPluginJson<Record<string, Entry>>(LIVE_TV_PLUGIN_ID, STORE_KEY, {}) }
  return cache
}

function cached(key: string): Entry | undefined {
  const hit = store()[key]
  return hit && Date.now() - hit.at < TTL_MS ? hit : undefined
}

/** Minnet direkt, lagringen samlat: en skrivning per skur av uppslag. */
function remember(key: string, url: string | null): void {
  const all = store()
  all[key] = { url, at: Date.now() }
  const keys = Object.keys(all)
  if (keys.length > MAX_ENTRIES) {
    keys.sort((a, b) => all[a]!.at - all[b]!.at)
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete all[k]
  }
  if (writeTimer) return
  writeTimer = setTimeout(() => {
    writeTimer = null
    writePluginJson(LIVE_TV_PLUGIN_ID, STORE_KEY, store())
  }, WRITE_DELAY_MS)
}

/**
 * Släpper fram köade uppslag så länge båda taken tillåter — NYASTE först:
 * den som bläddrar vill ha bilden för titeln hen står på nu, inte för den hen
 * lämnade för en halv minut sedan.
 */
function pump(): void {
  const now = Date.now()
  starts = starts.filter((t) => now - t < 60_000)
  while (queue.length > 0 && active < MAX_ACTIVE && starts.length < MAX_PER_MINUTE) {
    const job = queue.pop()!
    active++
    starts.push(now)
    job.started = true
    void run(job)
  }
  if (queue.length > 0 && active < MAX_ACTIVE && starts.length >= MAX_PER_MINUTE && !pumpTimer) {
    pumpTimer = setTimeout(() => { pumpTimer = null; pump() }, starts[0]! + 60_000 - now)
  }
}

type MediaItem = { title?: unknown; searchTitles?: unknown; backdropUrl?: unknown }

async function run(job: Job): Promise<void> {
  // Ett anrop som aldrig svarar får inte hålla en av två platser för alltid.
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS)
  let url: string | null = null
  try {
    const res = await fetch(`/api/media?titleQuery=${encodeURIComponent(job.title)}`, { signal: abort.signal })
    if (res.ok) {
      const data = (await res.json()) as { items?: MediaItem[] }
      const items = Array.isArray(data.items) ? data.items : []
      const match = items.find((item) => {
        const titles = [item.title, ...(Array.isArray(item.searchTitles) ? item.searchTitles : [])]
        return titles.some((t) => typeof t === 'string' && normaliseTitle(t) === job.key)
      })
      url = match && typeof match.backdropUrl === 'string' && match.backdropUrl ? match.backdropUrl : null
      remember(job.key, url)
    }
  } catch {
    // Nätfel och tidsgräns sparas inte — nästa visning får försöka igen.
  } finally {
    clearTimeout(timer)
    jobs.delete(job.key)
    job.resolve(url)
    active--
    pump()
  }
}

/**
 * TMDb-bilden för en titel: cache → pågående uppslag → nytt uppslag i kön.
 * `signal`: den som väntar har gått vidare. Väntar ingen annan och har
 * uppslaget inte startat stryks det ur kön — det kostar ingen plats i taket.
 */
export function lookUpArt(title: string, opts: { signal?: AbortSignal } = {}): Promise<string | null> {
  const key = normaliseTitle(title)
  const hit = cached(key)
  if (hit) return Promise.resolve(hit.url)
  let job = jobs.get(key)
  if (!job) {
    let resolve!: (url: string | null) => void
    const promise = new Promise<string | null>((r) => { resolve = r })
    job = { key, title, waiters: 0, started: false, promise, resolve }
    jobs.set(key, job)
    queue.push(job)
  }
  const current = job
  current.waiters++
  opts.signal?.addEventListener('abort', () => {
    current.waiters--
    if (current.waiters > 0 || current.started) return
    const at = queue.indexOf(current)
    if (at >= 0) queue.splice(at, 1)
    jobs.delete(current.key)
    current.resolve(null)
  }, { once: true })
  pump()
  return current.promise
}

/**
 * Vyernas enda ingång. `lookup` sätts bara där bilden syns stort (heron,
 * synliga kort) — aldrig för tablåns block.
 */
export function useProgrammeArt(channel: M3uChannel, programme: EpgProgramme | null, opts: { lookup: boolean }): { url: string | null } {
  const icon = programme?.icon ?? null
  const title = programme?.title ?? null
  const wanted = !icon && opts.lookup && title !== null && !looksLikeBroadcast(title, channel)
  const [found, setFound] = useState<{ title: string; url: string | null } | null>(() => {
    if (!wanted || title === null) return null
    const hit = cached(normaliseTitle(title))
    return hit ? { title, url: hit.url } : null
  })
  useEffect(() => {
    if (!wanted || title === null) return
    if (found?.title === title) return
    const gone = new AbortController()
    void lookUpArt(title, { signal: gone.signal }).then((url) => { if (!gone.signal.aborted) setFound({ title, url }) })
    return () => gone.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, title])
  if (icon) return { url: icon }
  if (!wanted || found?.title !== title) return { url: null }
  return { url: found.url }
}
