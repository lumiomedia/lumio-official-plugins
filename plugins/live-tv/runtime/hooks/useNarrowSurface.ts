import { useEffect, useState, type RefObject } from 'react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR } from '@/lib/plugin-sdk'

/**
 * SMAL YTA — mätt i FYSISKA px, inte designpixlar.
 *
 * Frestelsen är att fråga `window.innerWidth` eller scenens egen bredd. Båda
 * ljuger här: `tvScene()` håller golvet `TV_SCENE_MIN_WIDTH_PX = 1280` och
 * gör scenen HÖGRE i stället för smalare, så "smalare än 1024 designpixlar"
 * är ett tillstånd som inte finns. Värden mäter i stället lådans verkliga
 * innehållsyta och skriver `data-tv-scene-narrow="1"` på lådan när den är
 * under `TV_SCENE_NARROW_PX` (1024 css-px) — och det är den flaggan, och
 * bara den, som svarar på "är jag liten?".
 *
 * Lådan är VÄRDENS element: pluginet anmäler `tvSceneBox: true` på sitt
 * sidbidrag och får sidan lindad utifrån. Hooken läser därför uppåt i DOM:en
 * i stället för att äga något tillstånd.
 *
 * Tre lägen ger alla `false`, och alla tre är normala:
 * - **TV-läge** — body-scenen äger skalan, ingen låda finns.
 * - **Äldre värd** (< 0.1.597) — ingen låda finns att lyssna på.
 * - **Första bildrutan** — `applyTvSceneBox` sätter attributen först efter
 *   sin första mätning. Därför observeras attributen i hela dokumentet och
 *   inte bara på en låda vi redan hittat: annars hade en telefon fastnat i
 *   skrivbordsbredd tills något annat råkade rendera om.
 *
 * @param ref valfri referens till ett element INNE i lådan (skalets rot).
 *   Utan den frågas dokumentet efter lådan — pluginsidan är ändå den enda
 *   som ber om en.
 */
export function useNarrowSurface(ref?: RefObject<HTMLElement | null>): boolean {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const read = (): boolean => {
      const from = ref?.current ?? null
      const box = from
        ? from.closest(`[${TV_SCENE_BOX_ATTR}]`)
        : document.querySelector(`[${TV_SCENE_BOX_ATTR}]`)
      return box?.getAttribute(TV_SCENE_NARROW_ATTR) === '1'
    }
    const sync = () => setNarrow(read())
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: [TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR],
    })
    return () => observer.disconnect()
    // Effekten körs EFTER att React fäst referensen, så `ref.current` finns
    // redan vid den första `sync()`.
  }, [ref])
  return narrow
}
