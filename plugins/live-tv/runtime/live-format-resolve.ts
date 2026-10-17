/**
 * Liveformatet mot lagringen: vilken lista och vilket konto en kanal-URL hör
 * till, och därmed vilken URL spelaren ska öppna. Alla spelvägar (spelaren,
 * förhandsvisningen, multivyn) går genom `resolveLivePlayUrl`, så valet och
 * TS-reserven gäller lika överallt.
 *
 * Catch-up/timeshift (`/timeshift/…`) och VOD (`/movie/`, `/series/`) matchar
 * inte `/live/u/p/id.ext` och passerar orörda.
 */
import {
  fetchXtreamAccount,
  getLiveTvListFormat,
  getLiveTvLists,
  getXtreamLogins,
  normalizeXtreamBase,
  type LiveTvList,
  type XtreamLogin,
} from './live-tv-data'
import { hasHlsPlaylistProxy } from './hls-playlist-proxy'
import { chooseLiveUrl, hasHlsFailed, isHlsPlayUrl, markHlsFailed, parseXtreamLiveUrl, type LiveFormat, type LiveUrlChoice } from './live-format'

function decode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

export interface LiveUrlContext extends LiveUrlChoice {
  login: XtreamLogin | null
  list: LiveTvList | null
}

/** Listan och kontot bakom en kanal-URL. Ingen träff = `kind: null` (URL:en spelas orörd). */
export function liveUrlContext(url: string): LiveUrlContext {
  const parsed = parseXtreamLiveUrl(url)
  const none: LiveUrlContext = { kind: null, format: 'auto', allowedFormats: null, login: null, list: null }
  if (!parsed) return none
  const base = normalizeXtreamBase(parsed.origin)
  const user = decode(parsed.username)
  const lists = getLiveTvLists()

  const login = getXtreamLogins().find((entry) => entry.base === base && (entry.username === user || entry.username === parsed.username)) ?? null
  if (login) {
    const list = lists.find((entry) => entry.kind === 'xtream' && entry.xtreamLoginId === login.id) ?? null
    return { kind: 'xtream', format: getLiveTvListFormat(list), allowedFormats: login.allowedFormats ?? null, login, list }
  }

  // M3U från samma panel (get.php?username=…): helst listan med samma konto.
  const sameHost = lists.filter((entry) => entry.kind === 'm3u' && entry.url && normalizeXtreamBase(entry.url) === base)
  const list = sameHost.find((entry) => {
    try {
      return new URL(entry.url as string).searchParams.get('username') === user
    } catch {
      return false
    }
  }) ?? sameHost[0] ?? null
  if (list) return { kind: 'm3u', format: getLiveTvListFormat(list), allowedFormats: null, login: null, list }
  return none
}

/**
 * Konton vars tillåtna format inte är kända (inloggningar sparade innan
 * fältet fanns) frågas ut EN gång per session i bakgrunden — `player_api.php` utan
 * åtgärd, ingen strömanslutning, så det tar ingen plats av kontots
 * `max_connections`. Svaret sparas på inloggningen (`fetchXtreamAccount`),
 * och NÄSTA start väljer HLS. Den här starten väntar inte.
 */
const askedLogins = new Set<string>()

function learnAllowedFormats(login: XtreamLogin): void {
  if (login.allowedFormats !== undefined || askedLogins.has(login.id)) return
  askedLogins.add(login.id)
  void fetchXtreamAccount(login).catch(() => {})
}

export function __resetLiveFormatResolveForTests(): void {
  askedLogins.clear()
}

/** URL:en spelaren ska öppna för kanalens egen (indexets) URL. */
export function resolveLivePlayUrl(url: string): string {
  const ctx = liveUrlContext(url)
  if (ctx.kind === null) return url
  if (ctx.login && ctx.format === 'auto') learnAllowedFormats(ctx.login)
  const key = accountKeyOf(url)
  return chooseLiveUrl(url, {
    ...ctx,
    hlsFailed: hasHlsFailed(url) || (key !== null && hlsBrokenAccounts.has(key)),
    hlsProxy: hasHlsPlaylistProxy(),
  })
}

/** Vad Auto blir för en lista just nu — till inställningsradens förklaring. */
export function autoFormatFor(list: LiveTvList): 'ts' | 'hls' | null {
  if (list.kind !== 'xtream') return null
  const login = getXtreamLogins().find((entry) => entry.id === list.xtreamLoginId)
  if (!login?.allowedFormats) return null
  // Utan appens spellisteproxy blir Auto alltid TS (live-format.ts).
  return login.allowedFormats.map((f) => f.toLowerCase()).includes('m3u8') && hasHlsPlaylistProxy() ? 'hls' : 'ts'
}

/**
 * Ska ett misslyckat försök falla tillbaka på TS? Bara första försöket
 * (direktvägen), och bara när det var VI som gjorde om kanalens TS-URL till
 * HLS — en kanal som redan är `.m3u8` i spellistan har inget TS att falla
 * tillbaka på och går vidare i den vanliga trappan (värdens proxy).
 */
export function shouldFallBackToTs(originalUrl: string, playUrl: string, attempt: number): boolean {
  return attempt === 0 && playUrl !== originalUrl && isHlsPlayUrl(playUrl) && !isHlsPlayUrl(originalUrl)
}

/** Kanalens adress utan konto: `host/…/<id>.ext` — loggen får aldrig bära lösenordet. */
export function redactLiveUrl(url: string): string {
  const parsed = parseXtreamLiveUrl(url)
  if (!parsed) return url.replace(/\/\/[^/]*@/, '//')
  let host = parsed.origin
  try { host = new URL(parsed.origin).host } catch { /* behåll */ }
  return `${host}/live/…/${parsed.streamId}.${parsed.ext}`
}

/**
 * HLS kom inte igång: minns det för kanalen resten av sessionen och logga
 * (konsolen + appens debug-logg, samma väg som ytdiagnostiken).
 */
export function fallBackToTs(originalUrl: string, reason: string, opts: { wholeAccount?: boolean } = {}): void {
  markHlsFailed(originalUrl)
  // HLS spelade aldrig på kontot: nästa kanal på samma konto ska inte gå
  // igenom samma väntan innan den också hamnar på TS.
  if (opts.wholeAccount) {
    const key = accountKeyOf(originalUrl)
    if (key) hlsBrokenAccounts.add(key)
  }
  logLiveTv(`HLS fallback → TS (${reason}${opts.wholeAccount ? ', whole account' : ''}): ${redactLiveUrl(originalUrl)}`)
}

/** Konsolen + appens debug-logg (samma väg som ytdiagnostiken). Aldrig med konto i URL:en. */
export function logLiveTv(text: string): void {
  const msg = `[live-tv] ${text}`
  console.warn(msg)
  if (typeof fetch === 'function') {
    void fetch(`/api/debug-log?msg=${encodeURIComponent(msg)}`).catch(() => {})
  }
}

const hlsBrokenAccounts = new Set<string>()

type LiveFormatTextKey = 'liveFormatAuto' | 'liveFormatAutoIs' | 'liveFormatTs' | 'liveFormatHls'

/**
 * Etiketten för ett val på en lista. Auto visar vad den blir när kontot är
 * känt — "Auto (HLS)" — så valet går att förstå utan att läsa förklaringen.
 */
export function liveFormatOptionLabel(
  list: LiveTvList,
  format: LiveFormat,
  tr: (key: LiveFormatTextKey, vars?: Record<string, string>) => string,
): string {
  if (format === 'ts') return tr('liveFormatTs')
  if (format === 'hls') return tr('liveFormatHls')
  const auto = autoFormatFor(list)
  return auto ? tr('liveFormatAutoIs', { format: tr(auto === 'hls' ? 'liveFormatHls' : 'liveFormatTs') }) : tr('liveFormatAuto')
}

/** Listor där valet betyder något: Xtream, och M3U (där bara HLS skriver om). */
export function listHasLiveFormat(list: Pick<LiveTvList, 'kind'>): boolean {
  return list.kind === 'xtream' || list.kind === 'm3u'
}

/**
 * När en ström på ett Xtream-konto senast stängdes. Paneler med ett
 * anslutningstak räknar en stängd ström en stund till — en HLS-start som får
 * 509 strax efter går därför genom återhämtningstrappan (`hls-recovery.ts`)
 * i stället för att genast falla tillbaka på TS.
 */
const accountStreamEndedAt = new Map<string, number>()

function accountKeyOf(url: string): string | null {
  const parsed = parseXtreamLiveUrl(url)
  if (!parsed) return null
  return `${normalizeXtreamBase(parsed.origin) ?? parsed.origin}|${decode(parsed.username)}`
}

export function noteLiveStreamEnded(url: string, now = Date.now()): void {
  const key = accountKeyOf(url)
  if (key) accountStreamEndedAt.set(key, now)
}

export function msSinceAccountStreamEnded(url: string, now = Date.now()): number | null {
  const key = accountKeyOf(url)
  const at = key ? accountStreamEndedAt.get(key) : undefined
  return at === undefined ? null : Math.max(0, now - at)
}

export function __resetAccountSessionsForTests(): void {
  accountStreamEndedAt.clear()
  hlsBrokenAccounts.clear()
}
