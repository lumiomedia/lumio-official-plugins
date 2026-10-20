/**
 * Kanalens beslut (byte, slut, omförsök, fallerade upplåsningar) till appens
 * debuglogg: konsolen når inte loggen, och "Programmet är slut" mitt i en
 * frisk ström gick inte att spåra (Solar Opposites 2026-10-17). Ett GET-
 * anrop, inget svar väntas.
 */
export function trace(msg: string): void {
  console.info(`[channels] ${msg}`)
  try { void fetch(`/api/debug-log?msg=${encodeURIComponent(`[channels] ${msg}`)}`).catch(() => {}) } catch { /* utan värd */ }
}
