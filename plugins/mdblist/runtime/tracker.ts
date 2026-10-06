import type { MdblistApi } from './api'
import { buildScrobblePayload } from './payloads'
import type { Prefs } from '../../_shared/tracker-kit/prefs'
import type { ScrobbleEvent } from './types'

const DUPLICATE_WINDOW_MS = 5_000

/// Spelarens start/paus/stopp till MDBList. Fire-and-forget: ett misslyckat
/// anrop betyder bara att visningen inte landar hos MDBList — uppspelningen
/// påverkas aldrig. Takt och 429-paus sköts av proxyn och klienten. Värden
/// har också en dubblettspärr; den här finns kvar för äldre värdar.
export function createScrobbler(deps: {
  api: MdblistApi
  prefs: Prefs
  now: () => number
  log: (message: string) => void
}): (event: ScrobbleEvent) => Promise<void> {
  let lastKey = ''
  let lastAt = -Infinity
  return async (event) => {
    if (!deps.prefs.isOn('scrobble') || !deps.api.hasAuth()) return
    const body = buildScrobblePayload(event)
    if (!body) return
    const key = `${event.action}:${event.tmdbId ?? event.imdbId}:${event.season ?? ''}:${event.episode ?? ''}:${Math.round(event.progress)}`
    const now = deps.now()
    if (key === lastKey && now - lastAt < DUPLICATE_WINDOW_MS) return
    lastKey = key
    lastAt = now
    const result = await deps.api.call('POST', `/scrobble/${event.action}`, { body })
    deps.log(`scrobble ${event.action} ${event.mediaType} ${event.tmdbId ?? event.imdbId} @ ${Math.round(event.progress)}%: ${result.ok ? 'ok' : result.error}`)
  }
}
