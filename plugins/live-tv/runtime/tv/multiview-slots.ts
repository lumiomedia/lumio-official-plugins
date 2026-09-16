import type { MultiviewState } from './tv-multiview-store'

/**
 * NARROW-VISNINGSORDNING (granskningsfynd på b6c7a69/307608e): ljudrutan
 * (`state.audioIndex`) MÅSTE alltid vara en av de två synliga — annars
 * tystnar ingenting men rubriken påstår att en kanal spelar, och ingen ruta
 * bär `data-init`. Audio-rutan visas därför alltid FÖRST; den andra platsen
 * är nästa tilldelade ruta, annars första tomma — bara VISNINGSordningen
 * ändras (verkliga index skickas oförändrade in i `update()`/`assignTile()`
 * osv.), så det sparade laget rörs aldrig.
 *
 * Egen fil (samma mönster som `hub-data.ts`): både skrivbordsgrenen
 * (`tv-multiview.tsx`) och telefongrenen (`mobile/multiview-phone.tsx`)
 * behöver den här funktionen, och telefonfilen får INTE importera
 * `tv-multiview.tsx` (den importerar i sin tur telefonfilen för
 * `props.phone`-grenen) — det hade gett en importcykel.
 */
export function narrowVisibleIndices(state: MultiviewState): [number, number] {
  const count = state.tiles.length
  const audioIdx = state.audioIndex
  const others = Array.from({ length: count }, (_, i) => i).filter((i) => i !== audioIdx)
  const second = others.find((i) => state.tiles[i] !== null) ?? others.find((i) => state.tiles[i] === null) ?? others[0] ?? audioIdx
  return [audioIdx, second]
}
