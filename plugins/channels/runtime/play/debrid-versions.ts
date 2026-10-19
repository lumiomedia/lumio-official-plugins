/**
 * Debrid-versioner av samma titel. Samma film kan ligga flera gånger i
 * molnet (flera torrents, flera konton — TorBox och ett gammalt Real-Debrid).
 * Poolen behåller en post per titel men minns alla versioner; vid uppspelning
 * provas de i den här ordningen, och fallerar en (upplåsningen nekas, filen
 * dör) provas nästa i stället för Ingen signal.
 *
 * Ordningen följer autostartens tak (Max storlek per stream, Max upplösning):
 * versioner inom taket först, bästa först; över taket sist, minsta först —
 * finns bara de spelas de hellre än inget. Taket avgörs vid uppspelningen,
 * inte i poolen: poolen och tablån ska vara lika på alla enheter.
 */
import type { DebridVersion } from '../data/pool'

export interface DebridCaps {
  maxBytes: number | null
  maxResolution: number | null
}

/** Upplösningen ur filnamnet (2160/1440/1080/720/576/480), null när den inte står. */
export function resolutionOf(name: string | undefined): number | null {
  const n = (name ?? '').toLowerCase()
  if (/\b(2160p|4k|uhd)\b/.test(n)) return 2160
  if (/\b1440p\b/.test(n)) return 1440
  if (/\b1080[pi]\b/.test(n)) return 1080
  if (/\b720p\b/.test(n)) return 720
  if (/\b576p\b/.test(n)) return 576
  if (/\b480p\b/.test(n)) return 480
  return null
}

function withinCaps(v: DebridVersion, caps: DebridCaps): boolean {
  if (caps.maxBytes != null && v.size != null && v.size > caps.maxBytes) return false
  const res = resolutionOf(v.name)
  if (caps.maxResolution != null && res != null && res > caps.maxResolution) return false
  return true
}

export function orderDebridVersions(versions: DebridVersion[], caps: DebridCaps): DebridVersion[] {
  const quality = (v: DebridVersion) => (resolutionOf(v.name) ?? 0) * 1e13 + (v.size ?? 0)
  const inside = versions.filter((v) => withinCaps(v, caps)).sort((a, b) => quality(b) - quality(a))
  const outside = versions.filter((v) => !withinCaps(v, caps)).sort((a, b) => quality(a) - quality(b))
  return [...inside, ...outside]
}
