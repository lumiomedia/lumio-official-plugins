import type { Prefs } from '../../_shared/tracker-kit/prefs'
import type { SimklApi } from './api'
import { buildScrobblePayload } from './payloads'
import type { ScrobbleEvent } from './types'

/** SIMKL låser scrobble i 20 s per användare efter varje anrop. */
const LOCK_MS = 20_000
/** Från här markerar ett stopp titeln sedd — en paus ska då inte skickas. */
const WATCHED_AT = 80

/// Spelarens start/paus/stopp till SIMKL — ett anrop per användarhandling.
///
/// SIMKL avråder uttryckligen från pulser (den räknar fram förloppet själv och
/// har ett 20 s-lås per användare), så pulser hoppas över, och en paus eller
/// ett stopp skickas bara efter en start. Stopp vid ≥ 80 % markerar titeln sedd
/// hos SIMKL; under 80 % blir det en sparad pausposition.
///
/// Anropen går i tur och ordning och väntar ut låset: annars släpptes stoppet
/// som följer på slutpausen, och nästa avsnitts start direkt efter ett stopp.
/// Ligger en nyare händelse för samma titel redan i kön hoppas en paus eller
/// start över — den nyare säger vad som gäller.
export function createScrobbler(deps: {
  api: SimklApi
  prefs: Prefs
  log: (message: string) => void
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}): (event: ScrobbleEvent) => Promise<void> {
  const now = deps.now ?? (() => Date.now())
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  /** Senaste läge SIMKL tagit emot per titel: 'playing' efter start, 'paused' efter paus. */
  const state = new Map<string, 'playing' | 'paused'>()
  const latest = new Map<string, number>()
  let seq = 0
  let lastSentAt = -Infinity
  let chain: Promise<void> = Promise.resolve()

  async function send(event: ScrobbleEvent, body: object, key: string, mine: number): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const wait = lastSentAt + LOCK_MS - now()
      if (wait > 0) await sleep(wait)
      // Medan vi väntade kom något nyare för samma titel: det får tala.
      if (event.action !== 'stop' && latest.get(key) !== mine) return
      if (!deps.prefs.isOn('scrobble') || !deps.api.hasAuth()) return
      lastSentAt = now()
      const result = await deps.api.call('POST', `/scrobble/${event.action}`, { body })
      if (result.ok) {
        if (event.action === 'stop') state.delete(key)
        else state.set(key, event.action === 'start' ? 'playing' : 'paused')
      }
      const locked = !result.ok && (result.status === 429 || /RATE_LIMIT/i.test(result.error))
      deps.log(`scrobble ${event.action} ${event.mediaType} ${event.tmdbId ?? event.imdbId} @ ${Math.round(event.progress)}%: ${
        result.ok ? 'ok' : `${result.status} ${result.error}${locked && attempt === 0 ? ' (försöker igen efter låset)' : ' (släpps)'}`}`)
      if (!locked) return
      lastSentAt = now()
    }
  }

  return (event) => {
    if (event.pulse) return Promise.resolve()
    if (!deps.prefs.isOn('scrobble') || !deps.api.hasAuth()) return Promise.resolve()
    const body = buildScrobblePayload(event)
    if (!body) return Promise.resolve()
    const key = `${event.tmdbId ?? event.imdbId}:${event.season ?? ''}:${event.episode ?? ''}`
    const mine = ++seq
    latest.set(key, mine)
    chain = chain.then(async () => {
      const current = state.get(key)
      if (event.action === 'pause' && (current !== 'playing' || event.progress >= WATCHED_AT)) return
      if (event.action === 'stop' && current == null) return
      if (event.action === 'start' && current === 'playing') return
      await send(event, body, key, mine)
    }).catch((error) => { deps.log(`scrobble: ${error instanceof Error ? error.message : String(error)}`) })
    return chain
  }
}
