import type { Prefs } from '../../_shared/tracker-kit/prefs'
import type { SimklApi } from './api'
import { buildScrobblePayload } from './payloads'
import type { ScrobbleEvent } from './types'

/// Spelarens start/paus/stopp till SIMKL — ett anrop per användarhandling.
///
/// SIMKL avråder uttryckligen från pulser (den räknar fram förloppet själv och
/// har ett 20 s-lås per användare), så pulser hoppas över, och en paus eller
/// ett stopp skickas bara efter en start. Stopp vid ≥ 80 % markerar titeln sedd
/// hos SIMKL; under 80 % blir det en sparad pausposition.
export function createScrobbler(deps: {
  api: SimklApi
  prefs: Prefs
  log: (message: string) => void
}): (event: ScrobbleEvent) => Promise<void> {
  /** Senaste skickade läge per titel: 'playing' efter start, 'paused' efter paus. */
  const state = new Map<string, 'playing' | 'paused'>()

  return async (event) => {
    if (event.pulse) return
    if (!deps.prefs.isOn('scrobble') || !deps.api.hasAuth()) return
    const body = buildScrobblePayload(event)
    if (!body) return
    const key = `${event.tmdbId ?? event.imdbId}:${event.season ?? ''}:${event.episode ?? ''}`
    const current = state.get(key)
    if (event.action === 'pause' && current !== 'playing') return
    if (event.action === 'stop' && current == null) return
    if (event.action === 'start' && current === 'playing') return

    if (event.action === 'stop') state.delete(key)
    else state.set(key, event.action === 'start' ? 'playing' : 'paused')

    const result = await deps.api.call('POST', `/scrobble/${event.action}`, { body })
    deps.log(`scrobble ${event.action} ${event.mediaType} ${event.tmdbId ?? event.imdbId} @ ${Math.round(event.progress)}%: ${
      result.ok ? 'ok' : `${result.status} ${result.error} (släpps)`}`)
  }
}
