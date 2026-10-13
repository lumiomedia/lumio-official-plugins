import { acquirePollDemand } from '../live-poller'

/**
 * Telefoner som visar sportfliken i Soffläge. EN efterfrågan ('couch') så
 * länge någon är färsk; fler telefoner ger inga fler anrop. En telefon som
 * tappas utan att säga av (låst skärm, wifi) släpps efter TTL.
 */
export const PRESENCE_TTL_MS = 60_000
const seen = new Map<string, number>()
const listeners = new Set<() => void>()
let release: (() => void) | null = null

function sync(): void {
  const want = seen.size > 0
  if (want && !release) release = acquirePollDemand('couch')
  if (!want && release) { release(); release = null }
  for (const cb of [...listeners]) cb()
}

export function markPresence(phoneId: string, on: boolean, now: number): void {
  if (on) seen.set(phoneId, now)
  else seen.delete(phoneId)
  sync()
}

export function sweepPresence(now: number): void {
  let changed = false
  for (const [id, at] of seen) if (now - at > PRESENCE_TTL_MS) { seen.delete(id); changed = true }
  if (changed) sync()
}

export const hasCouchPresence = (): boolean => seen.size > 0

export function onPresenceChanged(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function __resetPresenceForTests(): void { seen.clear(); release?.(); release = null; listeners.clear() }
