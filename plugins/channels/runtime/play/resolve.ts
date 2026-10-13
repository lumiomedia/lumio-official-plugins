/**
 * Från poolpost till spelbar URL. Värdens funktioner gör jobbet (pluginets
 * egen SDK-kopia har tomma register); här bara dispatch, cache och skydd mot
 * att en gammal resolve vinner över en nyare vid snabb zapp.
 */
import type { PlayRef, PoolItem } from '../data/pool'

export interface Playable { url: string; requestHeaders?: Record<string, string>; forceProxy?: boolean }

export interface ResolveDeps {
  library(ref: Extract<PlayRef, { type: 'library' }>): Promise<Playable | null>
  stream(ref: Extract<PlayRef, { type: 'stream' }>): Promise<Playable | null>
  debrid(ref: Extract<PlayRef, { type: 'debrid' }>): Promise<Playable | null>
}

const TTL_MS = 10 * 60_000

export function createResolver(deps: ResolveDeps, now: () => number = Date.now) {
  const cache = new Map<string, { at: number; value: Playable }>()
  const pending = new Map<string, Promise<Playable | null>>()

  function call(play: PlayRef): Promise<Playable | null> {
    if (play.type === 'library') return deps.library(play)
    if (play.type === 'stream') return deps.stream(play)
    return deps.debrid(play)
  }

  async function resolve(item: PoolItem): Promise<Playable | null> {
    const hit = cache.get(item.ref)
    if (hit && now() - hit.at < TTL_MS) return hit.value
    const running = pending.get(item.ref)
    if (running) return running
    // Anropet kan kasta synkront; Promise.resolve().then fångar det också.
    const job: Promise<Playable | null> = Promise.resolve()
      .then(() => call(item.play))
      .catch(() => null)
      .then((value) => {
        if (value) cache.set(item.ref, { at: now(), value })
        return value
      })
      .finally(() => { pending.delete(item.ref) })
    pending.set(item.ref, job)
    return job
  }

  return { resolve, forget: (ref: string) => { cache.delete(ref) } }
}

export function createLatestGate() {
  let latest = 0
  return {
    begin: () => ++latest,
    isCurrent: (token: number) => token === latest,
  }
}
