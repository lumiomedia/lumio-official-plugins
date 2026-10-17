/**
 * Förvärmning: filens början och slut (huvud + index) hämtas i förväg till
 * appens indexcache, så ett kanalbyte bara behöver hoppet till liveläget.
 * Gäller alla källor som går att värma utan en leverantörsfråga:
 *
 *  - bibliotek via appens WebDAV-proxy → proxyns egen förvärmning
 *  - bibliotek direkt mot servern (Plex/Jellyfin/Emby) och redan upplåsta
 *    debrid-filer (Real-Debrid, TorBox, AllDebrid …) → källcachens förvärmning
 *
 * Aldrig strömuppslag (AIOStreams och andra resolvers): varje anrop dit räknas
 * mot leverantörens anropsgräns. De får indexcachen från andra uppspelningen.
 * Inte heller på Android utan källcache: spelaren hämtar där själv, och en
 * värmning vore en nedladdning ingen läser (WebDAV-proxyn gäller ändå).
 */
import type { Playable } from './resolve'

export type PlayType = 'library' | 'stream' | 'debrid'

const WEBDAV_STREAM = '/api/webdav-library/stream?'

/** Adressen som värmer filen, eller null när den inte ska värmas. */
export function warmUrlFor(playable: Playable, type: PlayType, opts: { androidDirect: boolean }): string | null {
  if (type === 'stream') return null
  const url = playable.url
  const at = url.indexOf(WEBDAV_STREAM)
  if (at >= 0) return `/api/webdav-library/warm?${url.slice(at + WEBDAV_STREAM.length)}`
  if (opts.androidDirect) return null
  if (!/^https?:\/\//i.test(url)) return null
  // Live (HLS/DASH, IPTV-live) har inget fast huvud och slut att värma.
  const path = url.toLowerCase().split('?')[0]!
  if (path.endsWith('.m3u8') || path.endsWith('.mpd') || url.toLowerCase().includes('/live/')) return null
  const headers = playable.requestHeaders && Object.keys(playable.requestHeaders).length > 0
    ? `&h=${encodeURIComponent(JSON.stringify(playable.requestHeaders))}`
    : ''
  return `/api/source-cache/warm?u=${encodeURIComponent(url)}${headers}`
}

/** Samma fil värms högst en gång per halvtimme. */
const WARM_TTL_MS = 30 * 60_000
const warmed = new Map<string, number>()

export function warmPlayable(playable: Playable, type: PlayType, now: number = Date.now()): void {
  const androidDirect = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
  const target = warmUrlFor(playable, type, { androidDirect })
  if (!target) return
  const at = warmed.get(target)
  if (at != null && now - at < WARM_TTL_MS) return
  warmed.set(target, now)
  try { void fetch(target).catch(() => {}) } catch { /* utan värd */ }
}
