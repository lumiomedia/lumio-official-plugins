/**
 * Försökstrappan för de nativa motorerna (mpv på skrivbordet, ExoPlayer på
 * Android).
 *
 * Bakgrund, mätt på telefon 2026-09-08 mot Free-TV-spellistan: av 70 nåbara
 * kanaler spelade 53 direkt. Av de sjutton som föll klarade värdens
 * strömproxy fem — den följer omdirigeringar, sätter egna huvuden och
 * skriver om segmentlänkarna, så den är en annan väg till strömmen och inte
 * bara ett omtag. Resten var döda uppströms eller YouTube-sidor, som ingen
 * spelare kan öppna.
 *
 * Logiken bor här och inte i komponenten för att den ska gå att pröva utan
 * att montera hela spelaren.
 */

/**
 * Containertyp för värdens strömproxy.
 *
 * Proxy-URL:en har ingen filändelse, och media3 gissar container på just
 * filändelsen. Utan ledtråden behandlas en felfri HLS-spellista som en
 * progressiv fil och faller på PARSING_CONTAINER_UNSUPPORTED.
 */
export const HOST_PROXY_MIME = 'application/x-mpegURL'

/** Samma ström, hämtad av värden i stället för av spelaren. */
export function hostProxyUrl(origin: string, url: string): string {
  return `${origin}/api/m3u?stream=${encodeURIComponent(url)}`
}

export type NativeFailureReason =
  /** Motorn rapporterade ett laddfel (404, 403, okänd container …). */
  | 'load-failed'
  /** Inget hände inom budgeten. */
  | 'no-start'

export type NativeFailureAction =
  /** Försök igen genom värdens strömproxy. */
  | 'retry-proxy'
  /** Ge upp och visa felet. */
  | 'fail'
  /** Den spelar faktiskt — släck bara laddläget. */
  | 'settle'

/**
 * Vad ska spelaren göra när ett försök inte gav bild?
 *
 * `timePos` räddar rena ljudkanaler: de rapporterar aldrig en bildruta, men
 * klockan går. Det gäller bara när budgeten tog slut — ett uttalat laddfel
 * betyder att strömmen dog, oavsett hur långt den hann.
 */
export function nativeFailureAction(
  reason: NativeFailureReason,
  attempt: number,
  timePos: number,
): NativeFailureAction {
  if (reason === 'no-start' && timePos > 0) return 'settle'
  if (attempt === 0) return 'retry-proxy'
  return 'fail'
}
