/**
 * ÅTERHÄMTNING FÖR HLS UR LIVEFORMATET.
 *
 * Mätt 2026-10-17 (kkz-panelen, en anslutning): HLS startade och spelade,
 * men femton sekunder in svarade panelen 509 (anslutningstaket) på
 * spellistans omladdning — troligen räknade den fortfarande TS-sessionen som
 * stängts en halv minut tidigare. ffmpeg ger upp efter en misslyckad
 * omladdning (`Failed to reload playlist`), mpv når filslut och bilden står
 * still för alltid. Startvakten hjälper inte: den gäller bara de första nio
 * sekunderna.
 *
 * Trappan här: stäng den gamla anslutningen DIREKT, vänta 3, 6, 12 s och öppna
 * samma ursprungliga `.m3u8` igen (inte omdirigeringens tokenadress, den kan
 * ha gått ut). Tre misslyckade omtag i rad → kanalen spelas som TS resten av
 * sessionen. En kanal som spelat ostört en halv minut efter ett omtag börjar
 * om från noll.
 *
 * Bara rena funktioner — spelaren äger klockor och tillstånd.
 */

/** Ingen ny speltid så här länge (och inte pausad av tittaren) = stopp. */
export const HLS_STALL_MS = 8_000
/** Väntan före omtag 1, 2 och 3. Gamla anslutningen är stängd under väntan. */
export const HLS_REOPEN_BACKOFF_MS = [3_000, 6_000, 12_000] as const
/** Så länge ett omtag måste spela ostört innan räknaren nollas. */
export const HLS_RECOVERY_RESET_MS = 30_000
/** En ström på samma konto stängd så nyligen kan fortfarande räknas av panelen. */
export const RECENT_ACCOUNT_SESSION_MS = 60_000

export type RecoveryStep =
  | { kind: 'reopen'; delayMs: number; attempt: number }
  | { kind: 'fallback-ts' }

/** Nästa steg efter `failures` misslyckade omtag i rad. */
export function nextRecoveryStep(failures: number): RecoveryStep {
  if (failures >= HLS_REOPEN_BACKOFF_MS.length) return { kind: 'fallback-ts' }
  return { kind: 'reopen', delayMs: HLS_REOPEN_BACKOFF_MS[Math.max(0, failures)], attempt: Math.max(0, failures) + 1 }
}

export type HlsFailureReason = 'load-failed' | 'no-start' | 'stall'

/**
 * Trappan (omtag med väntan) eller TS direkt?
 *
 * Ett startfel på en kanal som aldrig spelat och utan färsk session på
 * kontot betyder oftast att panelen inte ger HLS alls — då TS direkt, som
 * förut, så tittaren inte väntar 20 s i onödan. Allt annat — stopp mitt i,
 * fel under en pågående trappa, fel strax efter en annan ström på samma
 * konto (509) — går genom trappan.
 */
export function hlsFailureAction(opts: {
  reason: HlsFailureReason
  failures: number
  playedBefore: boolean
  msSinceAccountSession: number | null
}): 'ladder' | 'fallback-ts' {
  if (opts.reason === 'stall' || opts.playedBefore || opts.failures > 0) return 'ladder'
  if (opts.msSinceAccountSession !== null && opts.msSinceAccountSession < RECENT_ACCOUNT_SESSION_MS) return 'ladder'
  return 'fallback-ts'
}

/** Har spelningen stannat? Filslut på en livekanal är alltid ett stopp. */
export function isHlsStalled(opts: { now: number; lastProgressAt: number; ended: boolean; userPaused: boolean }): boolean {
  if (opts.ended) return true
  if (opts.userPaused) return false
  return opts.now - opts.lastProgressAt >= HLS_STALL_MS
}

/**
 * ffmpeg:s HLS-demuxer för konton med EN anslutning (`demuxer-lavf-o`).
 *
 * - `http_multiple=0`: standard (auto) hämtar nästa segment på en ANDRA,
 *   parallell anslutning — på ett konto med `max_connections 1` är det just
 *   det som ger 509.
 * - `http_persistent=0`: varje segment och varje omladdning på en egen,
 *   stängd anslutning, så omladdningen aldrig överlappar en kvarhängande
 *   keep-alive-anslutning för segmenten.
 * - `seg_max_retry=2`: ett segment som fallerar tas om i stället för att
 *   hoppas över.
 *
 * `reconnect*` når inte segmenten (demuxern skickar bara vidare huvuden,
 * UA och tidsgränser till sina egna anslutningar) — omladdningsfel fångas av
 * trappan ovan.
 */
export const HLS_DEMUXER_LAVF_O = 'http_multiple=0,http_persistent=0,seg_max_retry=2'
