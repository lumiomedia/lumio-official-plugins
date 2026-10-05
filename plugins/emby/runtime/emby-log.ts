'use client'

/**
 * Husets debug-logg, greppbar som `[emby-scan]` i fältloggen
 * (`<ip>:3011/api/debug-log`). En användare med 37 000 titlar fick bara
 * "Failed to fetch" i panelen (2026-10-01) — utan vilket anrop, vilket
 * bibliotek eller hur långt skanningen kommit gick felet inte att placera.
 * Raderna här bär just det. Token och adressens frågedel loggas aldrig.
 */
export function logEmby(message: string): void {
  try {
    void fetch(`/api/debug-log?msg=${encodeURIComponent(`[emby-scan] ${message}`)}`).catch(() => {})
  } catch {
    // Loggen får aldrig fälla skanningen.
  }
}

/** Felet som en rad: typ + meddelande, så TypeError ("Failed to fetch") syns som nätfel. */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.name && err.name !== 'Error' && !(err instanceof EmbyScanError) ? `${err.name}: ${err.message}` : err.message
  return String(err)
}

/**
 * Ett fel med var det hände. `step` blir panelens text, så användarens
 * skärmbild räcker för att se om det var Emby eller Lumios eget index.
 */
export class EmbyScanError extends Error {
  constructor(step: string, readonly original: unknown) {
    super(`${step}: ${describeError(original)}`)
    this.name = 'EmbyScanError'
  }
}
