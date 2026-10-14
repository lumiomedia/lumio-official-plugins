/**
 * Från poolpost till spelbar URL. Värdens funktioner gör jobbet (pluginets
 * egen SDK-kopia har tomma register); här bara dispatch, cache och skydd mot
 * att en gammal resolve vinner över en nyare vid snabb zapp.
 */
import type { PlayRef, PoolItem } from '../data/pool'

export interface Playable {
  url: string
  requestHeaders?: Record<string, string>
  forceProxy?: boolean
  /** Strömuppslag: lämnas till värden när bilden syns, så valet blir ihågkommet först då. */
  rememberToken?: string
}

/** `exclude`: adresser som redan fallerat för programmet — värden ger nästa version. */
export interface ResolveDeps {
  library(ref: Extract<PlayRef, { type: 'library' }>, exclude?: string[]): Promise<Playable | null>
  stream(ref: Extract<PlayRef, { type: 'stream' }>, exclude?: string[]): Promise<Playable | null>
  debrid(ref: Extract<PlayRef, { type: 'debrid' }>): Promise<Playable | null>
}

const TTL_MS = 10 * 60_000

export function createResolver(deps: ResolveDeps, now: () => number = Date.now) {
  const cache = new Map<string, { at: number; value: Playable }>()
  const pending = new Map<string, Promise<Playable | null>>()

  function call(play: PlayRef, exclude?: string[]): Promise<Playable | null> {
    if (play.type === 'library') return deps.library(play, exclude)
    if (play.type === 'stream') return deps.stream(play, exclude)
    // En debridpost är en fil: ingen annan version att be om.
    return exclude && exclude.length > 0 ? Promise.resolve(null) : deps.debrid(play)
  }

  /**
   * Nästa version förbi `exclude`: aldrig ur cachen och aldrig cachad. Svarar
   * värden med en redan provad adress (äldre värd utan exclude) blir svaret
   * null — inga fler versioner.
   */
  async function resolveNext(item: PoolItem, exclude: string[]): Promise<Playable | null> {
    cache.delete(item.ref)
    const value = await Promise.resolve().then(() => call(item.play, exclude)).catch(() => null)
    return value && !exclude.includes(value.url) ? value : null
  }

  async function resolve(item: PoolItem, exclude: string[] = []): Promise<Playable | null> {
    if (exclude.length > 0) return resolveNext(item, exclude)
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
