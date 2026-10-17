/**
 * LIVEFORMATET: rå MPEG-TS eller HLS för Xtream-kanaler.
 *
 * Bakgrund (mätt 2026-10-17, 0.1.630): en Xtream-panel med en anslutning
 * stängde `.ts`-strömmen var 30–48:e sekund. ffmpeg kopplar upp igen, men
 * panelen startar om strömmen några sekunder tidigare, så femton sekunder
 * senare (cache-secs) ser mpv tidsstämplarna hoppa bakåt: hack, hopp bakåt
 * ~5 s och en snabbspolning ikapp. Samma kanal som `.m3u8` hämtas segment för
 * segment och kan inte spola tillbaka.
 *
 * Indexet (appen) bär kanalens URL med den ändelse importen valde, och
 * kanalnyckeln (`namn::url`) hänger på den — favoriter, historik och lås
 * hade tappat sina kanaler om ändelsen skrevs om i indexet. Valet görs därför
 * först när kanalen ska SPELAS.
 *
 * Bara rena funktioner här (inga importer): datalagret läser typen härifrån,
 * och uppslaget mot lagringen bor i `live-format-resolve.ts`.
 */

export type LiveFormat = 'auto' | 'ts' | 'hls'

export const LIVE_FORMATS: readonly LiveFormat[] = ['auto', 'ts', 'hls']

export function sanitizeLiveFormat(raw: unknown): LiveFormat {
  return raw === 'ts' || raw === 'hls' ? raw : 'auto'
}

export function nextLiveFormat(current: LiveFormat): LiveFormat {
  return LIVE_FORMATS[(LIVE_FORMATS.indexOf(current) + 1) % LIVE_FORMATS.length]
}

/** Översättningsnyckel för valets etikett (hub-strings). */
export function liveFormatLabelKey(format: LiveFormat): 'liveFormatAuto' | 'liveFormatTs' | 'liveFormatHls' {
  return format === 'ts' ? 'liveFormatTs' : format === 'hls' ? 'liveFormatHls' : 'liveFormatAuto'
}

export interface XtreamLiveUrl {
  /** `http://host:port` — utan avslutande snedstreck. */
  origin: string
  username: string
  password: string
  streamId: string
  ext: 'ts' | 'm3u8'
  /** Fråga/fragment efter ändelsen, oförändrade. */
  tail: string
}

const XTREAM_LIVE_RE = /^(https?:\/\/[^/?#]+)\/live\/([^/?#]+)\/([^/?#]+)\/(\d+)\.(ts|m3u8)((?:[?#].*)?)$/i

/** `http://host/live/<user>/<pass>/<id>.ts|.m3u8` → delarna, annars null. */
export function parseXtreamLiveUrl(url: string): XtreamLiveUrl | null {
  const match = XTREAM_LIVE_RE.exec(url.trim())
  if (!match) return null
  return {
    origin: match[1],
    username: match[2],
    password: match[3],
    streamId: match[4],
    ext: match[5].toLowerCase() === 'm3u8' ? 'm3u8' : 'ts',
    tail: match[6] ?? '',
  }
}

export function withXtreamLiveExt(url: string, ext: 'ts' | 'm3u8'): string {
  const parsed = parseXtreamLiveUrl(url)
  if (!parsed || parsed.ext === ext) return url
  return `${parsed.origin}/live/${parsed.username}/${parsed.password}/${parsed.streamId}.${ext}${parsed.tail}`
}

export interface LiveUrlChoice {
  /** Vilken sorts spellista kanalen kommer ur. null = ingen känd lista. */
  kind: 'xtream' | 'm3u' | null
  format: LiveFormat
  /**
   * Kontots `user_info.allowed_output_formats`. null/tom = okänt (äldre
   * inloggning, eller en panel som inte säger något) — då väljer Auto aldrig
   * HLS på egen hand.
   */
  allowedFormats: readonly string[] | null | undefined
  /** HLS föll redan för kanalen i den här sessionen. */
  hlsFailed?: boolean
  /**
   * Appens spellisteproxy för HLS finns (`hls-playlist-proxy.ts`). Utan den
   * väljer Auto aldrig HLS: rå HLS laddar om spellistan mot en adress som
   * paneler med en anslutning svarar 509 på.
   */
  hlsProxy?: boolean
}

/**
 * Vilken URL spelaren ska öppna.
 *
 * - Xtream, Auto: HLS när kontot tillåter `m3u8` OCH appens spellisteproxy
 *   finns, annars TS (kanalens egen URL; en `.m3u8` i indexet blir `.ts` när
 *   kontot tillåter det).
 * - Xtream, TS/HLS: den valda ändelsen.
 * - M3U: spellistans URL orörd — utom när användaren uttryckligen valt HLS
 *   och adressen är en Xtream-länk (`/live/u/p/id.ts`).
 * - Har HLS redan fallerat för kanalen: kanalens egen URL.
 */
export function chooseLiveUrl(url: string, choice: LiveUrlChoice): string {
  const parsed = parseXtreamLiveUrl(url)
  if (!parsed || choice.hlsFailed) return url
  if (choice.kind === 'xtream') {
    if (choice.format === 'ts') return withXtreamLiveExt(url, 'ts')
    if (choice.format === 'hls') return withXtreamLiveExt(url, 'm3u8')
    const allowed = (choice.allowedFormats ?? []).map((f) => f.toLowerCase())
    if (allowed.includes('m3u8') && choice.hlsProxy) return withXtreamLiveExt(url, 'm3u8')
    if (parsed.ext === 'm3u8' && !choice.hlsProxy && allowed.includes('ts')) return withXtreamLiveExt(url, 'ts')
    return url
  }
  if (choice.kind === 'm3u' && choice.format === 'hls') return withXtreamLiveExt(url, 'm3u8')
  return url
}

/**
 * Sessionens minne av kanaler där HLS inte kom igång. Nyckeln är kanalens
 * EGEN URL (indexets), så samma kanal faller tillbaka på TS på alla ytor —
 * spelaren, förhandsvisningen och multivyn — tills appen startas om.
 */
const hlsFailedUrls = new Set<string>()

export function markHlsFailed(originalUrl: string): void {
  hlsFailedUrls.add(originalUrl)
}

export function hasHlsFailed(originalUrl: string): boolean {
  return hlsFailedUrls.has(originalUrl)
}

export function __resetHlsFailuresForTests(): void {
  hlsFailedUrls.clear()
}

export const isHlsPlayUrl = (url: string): boolean => /\.m3u8(?:$|[?#])/i.test(url)
