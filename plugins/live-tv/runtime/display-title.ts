/**
 * VISADE PROGRAMTITLAR (Jerry 2026-10-31).
 *
 * Leverantörens tablå skriver markörer med upphöjda bokstäver efter titeln —
 * "Flickor ᴸᶦᵛᵉ", "Rapport ᴺᵉʷ". De tas bort där titeln VISAS (hero, kort,
 * guide, sök, spelarens banner, notiser). Råtiteln behålls överallt annars:
 * matchning, sökning, programbildsuppslag och sportdetektering läser den.
 *
 * Teckenmängden är de upphöjda/modifierande bokstäverna: fonetiska
 * modifierare (U+1D2C–U+1D6A, U+1D9B–U+1DBF), ⁱ (U+2071), ⁿ (U+207F) och de
 * upphöjda latinska i U+02B0–U+02B8 och U+02E0–U+02E4. Resten av U+02B0–U+02FF
 * (ʻ i "Hawaiʻi", ʼ som apostrof, accenttecken) lämnas — det är riktig text.
 */
const MARKERS = /[ᴬ-ᵪᶛ-ᶿⁱⁿʰ-ʸˠ-ˤ]+/g

export function displayTitle<T extends string | null | undefined>(title: T): T {
  if (!title) return title
  if (!MARKERS.test(title)) { MARKERS.lastIndex = 0; return title }
  MARKERS.lastIndex = 0
  return title.replace(MARKERS, ' ').replace(/\s{2,}/g, ' ').trim() as T
}

/** Jämförelsenyckel för "samma program": visad titel, gemener, mellanslag hopslagna. */
export function titleKey(title: string): string {
  return displayTitle(title).toLowerCase().replace(/\s+/g, ' ').trim()
}
