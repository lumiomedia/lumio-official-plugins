/**
 * APPENS SPELLISTEPROXY FÖR HLS (app 0.1.630, `/api/live-tv/hls/playlist.m3u8`).
 *
 * Mätt 2026-10-17 (kkz-panelen, en anslutning): `.m3u8` 302:ar till
 * `/live/play/<token>/<id>` med RELATIVA segment. ffmpeg laddar sedan om
 * spellistan från en adress den härlett själv (`/live/<u>/<p>/<id>`), och den
 * svarar 509 inom 18–45 s → "Failed to reload playlist" → svart bild. Den
 * URSPRUNGLIGA `.m3u8` svarar däremot varje gång.
 *
 * Appens proxy hämtar därför den ursprungliga adressen vid VARJE omladdning
 * och skriver om segmenten till absoluta adresser (segmenten hämtar spelaren
 * fortfarande direkt från panelen). Utan proxyn är rå HLS känt trasigt på
 * sådana paneler, så Auto väljer då TS (`live-format.ts`).
 *
 * Appen talar om att proxyn finns i `/api/app-info` → `features`. Svaret
 * läses en gång per session; ett misslyckat svar frågas om nästa gång.
 */
import { parseXtreamLiveUrl } from './live-format'

export const HLS_PLAYLIST_PROXY_FEATURE = 'hlsPlaylistProxy'
export const HLS_PLAYLIST_PROXY_PATH = '/api/live-tv/hls/playlist.m3u8'

let available: boolean | null = null
let probe: Promise<boolean> | null = null

/** Fråga appen (en gång) om proxyn finns. Fel = okänt, frågas om senare. */
export function detectHlsPlaylistProxy(): Promise<boolean> {
  if (available !== null) return Promise.resolve(available)
  if (probe) return probe
  if (typeof fetch !== 'function') return Promise.resolve(false)
  probe = fetch('/api/app-info')
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`app-info ${res.status}`))))
    .then((info: unknown) => {
      const features = (info as { features?: unknown } | null)?.features
      available = Array.isArray(features) && features.includes(HLS_PLAYLIST_PROXY_FEATURE)
      return available
    })
    .catch(() => false)
    .finally(() => {
      probe = null
    })
  return probe
}

/** Känd och tillgänglig just nu. Okänt räknas som nej (Auto väljer då TS). */
export function hasHlsPlaylistProxy(): boolean {
  if (available === null) void detectHlsPlaylistProxy()
  return available === true
}

export function hlsPlaylistProxyUrl(origin: string, src: string): string {
  return `${origin}${HLS_PLAYLIST_PROXY_PATH}?src=${encodeURIComponent(src)}`
}

/** Går URL:en genom appens spellisteproxy? */
export function isHlsPlaylistProxyUrl(url: string): boolean {
  return url.includes(HLS_PLAYLIST_PROXY_PATH)
}

/**
 * Adressen en NATIV motor (mpv, Android, värdens yta) ska öppna för en
 * spel-URL ur liveformatet: en Xtream-kanal som `.m3u8` går genom appens
 * proxy när den finns, allt annat öppnas orört. Absolut adress — motorerna
 * lever utanför sidan (samma origin som källcachen och värdens strömproxy).
 */
export function nativeLiveOpenUrl(playUrl: string, origin: string = globalThis.location?.origin ?? ''): string {
  if (!origin || !hasHlsPlaylistProxy()) return playUrl
  if (parseXtreamLiveUrl(playUrl)?.ext !== 'm3u8') return playUrl
  return hlsPlaylistProxyUrl(origin, playUrl)
}

export function __setHlsPlaylistProxyForTests(value: boolean | null): void {
  available = value
  probe = null
}
