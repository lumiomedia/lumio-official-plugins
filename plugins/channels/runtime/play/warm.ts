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
 * På Android utan källcache hämtar spelaren själv: där förhämtar spelaren
 * filens huvud och index till minnet i stället (WebDAV-proxyn gäller ändå).
 */
import type { Playable } from './resolve'
import { prefetchInPlayer, sourceCacheSetting } from '../host'

export type PlayType = 'library' | 'stream' | 'debrid'

const WEBDAV_STREAM = '/api/webdav-library/stream?'

/** En fil med fast huvud och slut: http(s), inte live (HLS/DASH, IPTV-live). */
function isFileUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false
  const path = url.toLowerCase().split('?')[0]!
  return !(path.endsWith('.m3u8') || path.endsWith('.mpd') || url.toLowerCase().includes('/live/'))
}

/**
 * Direktströmning (Android utan källcache): adressen spelaren själv ska
 * förhämta (huvud + index till minnet), eller null. WebDAV går via appens
 * proxy och värms där; strömuppslag aldrig.
 */
export function prefetchUrlFor(playable: Playable, type: PlayType, opts: { androidDirect: boolean }): string | null {
  if (!opts.androidDirect || type === 'stream') return null
  const url = playable.url
  if (url.includes(WEBDAV_STREAM) || !isFileUrl(url)) return null
  return url
}

/** Adressen som värmer filen, eller null när den inte ska värmas. */
export function warmUrlFor(playable: Playable, type: PlayType, opts: { androidDirect: boolean }): string | null {
  if (type === 'stream') return null
  const url = playable.url
  const at = url.indexOf(WEBDAV_STREAM)
  if (at >= 0) return `/api/webdav-library/warm?${url.slice(at + WEBDAV_STREAM.length)}`
  if (opts.androidDirect) return null
  if (!isFileUrl(url)) return null
  const headers = playable.requestHeaders && Object.keys(playable.requestHeaders).length > 0
    ? `&h=${encodeURIComponent(JSON.stringify(playable.requestHeaders))}`
    : ''
  return `/api/source-cache/warm?u=${encodeURIComponent(url)}${headers}`
}

/**
 * Samma regel som appens android-source-cache: inställningen "Mellanlagra
 * strömmar" (playback_android_source_cache) avgör; utan eget val har telefoner
 * källcachen och TV-boxar hämtar direkt. Med källcachen gäller förvärmningen.
 */
function androidStreamsDirect(): boolean {
  if (typeof navigator === 'undefined' || !/android/i.test(navigator.userAgent)) return false
  const setting = sourceCacheSetting()
  if (setting) return !setting.get()
  // Äldre värd: samma regel läst direkt ur lagringen.
  let stored: string | null = null
  try { stored = localStorage.getItem('playback_android_source_cache') } catch { /* ingen lagring */ }
  if (stored === '1') return false
  if (stored === '0') return true
  const phone = navigator.maxTouchPoints > 0 && /mobile/i.test(navigator.userAgent)
  return !phone
}

/** Samma fil värms högst en gång per halvtimme. */
const WARM_TTL_MS = 30 * 60_000
const warmed = new Map<string, number>()

export function warmPlayable(playable: Playable, type: PlayType, now: number = Date.now()): void {
  const androidDirect = androidStreamsDirect()
  const direct = prefetchUrlFor(playable, type, { androidDirect })
  if (direct) {
    const at = warmed.get(direct)
    if (at != null && now - at < WARM_TTL_MS) return
    warmed.set(direct, now)
    prefetchInPlayer(direct, playable.requestHeaders)
    return
  }
  const target = warmUrlFor(playable, type, { androidDirect })
  if (!target) return
  const at = warmed.get(target)
  if (at != null && now - at < WARM_TTL_MS) return
  warmed.set(target, now)
  try { void fetch(target).catch(() => {}) } catch { /* utan värd */ }
}
