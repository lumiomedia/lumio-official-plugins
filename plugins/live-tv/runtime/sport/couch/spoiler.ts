import { useEffect, useState } from 'react'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID } from '../../live-tv-data'
import type { SportMatch } from '../sport-model'
import { SPORT_SETTINGS_KEY, type SportSettings } from '../sport-store'

/**
 * Spoilerskyddet (Soffläge Sport fas 3): vilka matcher vars resultat är dolt.
 *
 * Nyckeln är ORIGINALETS fixtur, så att både reprisen och originalets egna
 * resultatrader (resultat, matchdag, flöde, lagsidor) döljs tillsammans. En
 * nyckel skyddas från att reprisen blir känd till sändningens slut + 24 h.
 *
 * Visat på TV:n gäller alla och sparas i 24 h; visat per telefon finns bara i
 * minnet och försvinner vid omstart.
 */
export const SPOILER_KEEP_MS = 86_400_000
export const REVEAL_TV_MS = 86_400_000
export const SPOILER_TV_KEY = 'sport_spoiler_tv_v1'

/** Skyddade nycklar → skyddet släpper (ms). */
const protectedUntil = new Map<string, number>()
/** Visat per telefon: nyckel → telefonernas id. */
const phoneReveals = new Map<string, Set<string>>()
const listeners = new Set<() => void>()
const emit = () => { for (const cb of [...listeners]) cb() }

/** Originalets fixtur ("api-sports:77"). Repris utan känt original: "match:{id}". Annars null. */
export function spoilerKey(m: SportMatch): string | null {
  if (m.rerun) {
    const f = m.replayOf?.fixture
    return f ? `${f.provider}:${f.id}` : `match:${m.id}`
  }
  return m.fixture ? `${m.fixture.provider}:${m.fixture.id}` : null
}

/** Reprisernas nycklar skyddas till sändningens slut + 24 h. */
export function noteReplays(matches: SportMatch[], now: number): void {
  let added = false
  for (const m of matches) {
    if (!m.rerun) continue
    const key = spoilerKey(m)
    if (!key) continue
    const until = m.stop + SPOILER_KEEP_MS
    if (until <= now) continue
    const prev = protectedUntil.get(key)
    if (prev == null) added = true
    if (prev == null || until > prev) protectedUntil.set(key, until)
  }
  if (added) emit()
}

function readTvReveals(): Record<string, number> {
  const raw = readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, SPOILER_TV_KEY, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number'))
}

/** Visa resultatet för alla (TV:n och alla telefoner) i 24 h. Rensar utgångna poster. */
export function revealTv(key: string, now: number): void {
  const fresh = Object.fromEntries(Object.entries(readTvReveals()).filter(([, at]) => at > now))
  writePluginJson(LIVE_TV_PLUGIN_ID, SPOILER_TV_KEY, { ...fresh, [key]: now + REVEAL_TV_MS })
  emit()
}

/** Visa resultatet för en telefon (bara i minnet). */
export function revealPhone(key: string, phoneId: string): void {
  let set = phoneReveals.get(key)
  if (!set) { set = new Set(); phoneReveals.set(key, set) }
  if (set.has(phoneId)) return
  set.add(phoneId)
  emit()
}

export function hiddenOnTv(m: SportMatch, now: number, s: Pick<SportSettings, 'spoilerReplays'>): boolean {
  if (s.spoilerReplays === false) return false
  const key = spoilerKey(m)
  const until = key ? protectedUntil.get(key) : undefined
  if (!key || until == null || now >= until) return false
  // Lagringen läses bara för en skyddad nyckel: de flesta matcher går aldrig hit.
  const shownUntil = readTvReveals()[key]
  return !(shownUntil != null && now < shownUntil)
}

export function hiddenForPhone(m: SportMatch, phoneId: string | null, now: number, s: Pick<SportSettings, 'spoilerReplays'>): boolean {
  if (!hiddenOnTv(m, now, s)) return false
  const key = spoilerKey(m)
  return !(phoneId && key && phoneReveals.get(key)?.has(phoneId))
}

export function onSpoilerChanged(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/** TV-vyerna: ritas om när registret, SPOILER_TV_KEY eller sport_settings_v1 ändras. */
export function useSpoilerVersion(): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    const bump = () => setV((n) => n + 1)
    const offs = [
      onSpoilerChanged(bump),
      onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPOILER_TV_KEY, bump),
      onPluginStorageChanged(LIVE_TV_PLUGIN_ID, SPORT_SETTINGS_KEY, bump),
    ]
    return () => { for (const off of offs) off() }
  }, [])
  return v
}

export function __resetSpoilerForTests(): void {
  protectedUntil.clear()
  phoneReveals.clear()
  listeners.clear()
}
