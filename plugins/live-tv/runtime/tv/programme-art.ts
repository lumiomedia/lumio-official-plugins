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
const MAX_ENTRIES = 2000
const MAX_ACTIVE = 2
const MAX_PER_MINUTE = 30

type Entry = { url: string | null; at: number }

let cache: Record<string, Entry> | null = null
const inflight = new Map<string, Promise<string | null>>()
const queue: (() => void)[] = []
let active = 0
let starts: number[] = []
let pumpTimer: ReturnType<typeof setTimeout> | null = null

export function __resetProgrammeArtForTests(): void {
  cache = null
  inflight.clear()
  queue.length = 0
  active = 0
  starts = []
  if (pumpTimer) clearTimeout(pumpTimer)
  pumpTimer = null
}

export function normaliseTitle(title: string): string {
  return title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
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

function remember(key: string, url: string | null): void {
  const all = store()
  all[key] = { url, at: Date.now() }
  const keys = Object.keys(all)
  if (keys.length > MAX_ENTRIES) {
    keys.sort((a, b) => all[a]!.at - all[b]!.at)
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete all[k]
  }
  writePluginJson(LIVE_TV_PLUGIN_ID, STORE_KEY, all)
}

/** Släpper fram köade uppslag så länge båda taken tillåter; väntar annars på att minutfönstret glider. */
function pump(): void {
  const now = Date.now()
  starts = starts.filter((t) => now - t < 60_000)
  while (queue.length > 0 && active < MAX_ACTIVE && starts.length < MAX_PER_MINUTE) {
    active++
    starts.push(now)
    queue.shift()!()
  }
  if (queue.length > 0 && active < MAX_ACTIVE && starts.length >= MAX_PER_MINUTE && !pumpTimer) {
    pumpTimer = setTimeout(() => { pumpTimer = null; pump() }, starts[0]! + 60_000 - now)
  }
}

function slot(): Promise<() => void> {
  return new Promise((resolve) => {
    queue.push(() => resolve(() => { active--; pump() }))
    pump()
  })
}

type MediaItem = { title?: unknown; searchTitles?: unknown; backdropUrl?: unknown }

async function fetchArt(title: string, key: string): Promise<string | null> {
  const release = await slot()
  try {
    const res = await fetch(`/api/media?titleQuery=${encodeURIComponent(title)}`)
    if (!res.ok) return null
    const data = (await res.json()) as { items?: MediaItem[] }
    const items = Array.isArray(data.items) ? data.items : []
    const match = items.find((item) => {
      const titles = [item.title, ...(Array.isArray(item.searchTitles) ? item.searchTitles : [])]
      return titles.some((t) => typeof t === 'string' && normaliseTitle(t) === key)
    })
    const url = match && typeof match.backdropUrl === 'string' && match.backdropUrl ? match.backdropUrl : null
    remember(key, url)
    return url
  } catch {
    return null
  } finally {
    release()
  }
}

/** TMDb-bilden för en titel: cache → pågående uppslag → nytt uppslag i kön. */
export function lookUpArt(title: string): Promise<string | null> {
  const key = normaliseTitle(title)
  const hit = cached(key)
  if (hit) return Promise.resolve(hit.url)
  const pending = inflight.get(key)
  if (pending) return pending
  const p = fetchArt(title, key).finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
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
    let alive = true
    void lookUpArt(title).then((url) => { if (alive) setFound({ title, url }) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, title])
  if (icon) return { url: icon }
  if (!wanted || found?.title !== title) return { url: null }
  return { url: found.url }
}
