/**
 * Från poolpost till spelbar URL. Värdens funktioner gör jobbet (pluginets
 * egen SDK-kopia har tomma register); här bara dispatch, cache och skydd mot
 * att en gammal resolve vinner över en nyare vid snabb zapp.
 */
import type { CloudVersion, PlayRef, PoolItem } from '../data/pool'
import { orderCloudVersions, type CloudCaps } from './cloud-versions'

export interface Playable {
  url: string
  requestHeaders?: Record<string, string>
  forceProxy?: boolean
  /** Strömuppslag: lämnas till värden när bilden syns, så valet blir ihågkommet först då. */
  rememberToken?: string
}

/** `exclude`: adresser som redan fallerat för programmet — värden ger nästa version. */
export interface ResolveDeps {
  /** `allowCatalog: false` = aldrig titelns IPTV-VOD-versioner (kanalen har inte VOD som källa). */
  library(ref: Extract<PlayRef, { type: 'library' }>, exclude?: string[], allowCatalog?: boolean): Promise<Playable | null>
  stream(ref: Extract<PlayRef, { type: 'stream' }>, exclude?: string[]): Promise<Playable | null>
  cloud(ref: CloudVersion): Promise<Playable | null>
  /** Autostartens tak, läses vid varje uppspelning. Saknas = inget tak. */
  cloudCaps?(): CloudCaps
  /** En fil tjänsten sagt inte finns (data/dead-files): provas inte, inget anrop. */
  isDead?(file: { provider: string; fileRef: string }): boolean
}

const TTL_MS = 10 * 60_000

export function createResolver(deps: ResolveDeps, now: () => number = Date.now) {
  const cache = new Map<string, { at: number; value: Playable }>()
  const pending = new Map<string, Promise<Playable | null>>()

  /**
   * Provade cloudfiler per post. Versionerna provas i takets ordning tills
   * en låses upp; en nekad upplåsning (utgånget konto) ger ingen adress att
   * utesluta, så resolvern minns själv vilka som provats. Ny start = nytt varv.
   */
  const cloudTried = new Map<string, Set<string>>()

  async function callCloud(ref: string, play: Extract<PlayRef, { type: 'cloud' }>, fresh: boolean): Promise<Playable | null> {
    const tried = (!fresh && cloudTried.get(ref)) || new Set<string>()
    cloudTried.set(ref, tried)
    const caps = deps.cloudCaps?.() ?? { maxBytes: null, maxResolution: null }
    const { alts, type: _type, ...main } = play
    for (const version of orderCloudVersions([main, ...(alts ?? [])], caps)) {
      const key = `${version.provider}:${version.fileRef}`
      if (tried.has(key)) continue
      tried.add(key)
      if (deps.isDead?.(version)) continue
      const playable = await deps.cloud({ provider: version.provider, fileRef: version.fileRef }).catch(() => null)
      if (playable) return playable
    }
    return null
  }

  function call(ref: string, play: PlayRef, exclude?: string[], allowCatalog?: boolean): Promise<Playable | null> {
    if (play.type === 'library') return allowCatalog === false ? deps.library(play, exclude, false) : deps.library(play, exclude)
    if (play.type === 'stream') return deps.stream(play, exclude)
    return callCloud(ref, play, !exclude || exclude.length === 0)
  }

  /**
   * Nästa version förbi `exclude`: aldrig ur cachen och aldrig cachad. Svarar
   * värden med en redan provad adress (äldre värd utan exclude) blir svaret
   * null — inga fler versioner.
   */
  /** Cachenyckeln: samma post kan spelas från kanaler med och utan IPTV-VOD. */
  const keyOf = (ref: string, allowCatalog?: boolean) => (allowCatalog === false ? `${ref}|novod` : ref)

  async function resolveNext(item: PoolItem, exclude: string[], allowCatalog?: boolean): Promise<Playable | null> {
    cache.delete(keyOf(item.ref, allowCatalog))
    const value = await Promise.resolve().then(() => call(item.ref, item.play, exclude, allowCatalog)).catch(() => null)
    return value && !exclude.includes(value.url) ? value : null
  }

  async function resolve(item: PoolItem, exclude: string[] = [], opts: { allowCatalog?: boolean } = {}): Promise<Playable | null> {
    const { allowCatalog } = opts
    if (exclude.length > 0) return resolveNext(item, exclude, allowCatalog)
    const key = keyOf(item.ref, allowCatalog)
    const hit = cache.get(key)
    if (hit && now() - hit.at < TTL_MS) return hit.value
    const running = pending.get(key)
    if (running) return running
    // Anropet kan kasta synkront; Promise.resolve().then fångar det också.
    const job: Promise<Playable | null> = Promise.resolve()
      .then(() => call(item.ref, item.play, undefined, allowCatalog))
      .catch(() => null)
      .then((value) => {
        if (value) cache.set(key, { at: now(), value })
        return value
      })
      .finally(() => { pending.delete(key) })
    pending.set(key, job)
    return job
  }

  /** Finns en färsk uppslagen adress (förladdad granne, nästa program)? Då behövs ingen zappfördröjning. */
  function peek(ref: string, allowCatalog?: boolean): boolean {
    const hit = cache.get(keyOf(ref, allowCatalog))
    return !!hit && now() - hit.at < TTL_MS
  }

  return { resolve, peek, forget: (ref: string) => { cache.delete(ref); cache.delete(keyOf(ref, false)) } }
}

export function createLatestGate() {
  let latest = 0
  return {
    begin: () => ++latest,
    isCurrent: (token: number) => token === latest,
  }
}
