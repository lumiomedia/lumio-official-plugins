import { useEffect, useState, type RefObject } from 'react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_PHONE_ATTR } from '@/lib/plugin-sdk'

/**
 * TELEFONYTA — ytan är FYSISKT telefonsmal (< 700 css-px), precis som
 * `useNarrowSurface` svarar på "smalare än 1024 css-px".
 *
 * `TV_SCENE_PHONE_ATTR` är INGEN garanti för att scenen räknat mot
 * designbredden 780 (`TV_SCENE_PHONE_WIDTH`) — bara att lådans fysiska
 * innehållsyta var smal nog för att aspektjämförelsen kunnat välja den
 * grenen. Samma reservation gäller redan `TV_SCENE_NARROW_ATTR` mot
 * 1280-golvet. Hooken svarar alltså på "är jag fysiskt telefonsmal?", inte
 * "räknade scenen mot 780?".
 *
 * Lådan är VÄRDENS element: pluginet anmäler `tvSceneBox: true` på sitt
 * sidbidrag och får sidan lindad utifrån. Hooken läser därför uppåt i DOM:en
 * i stället för att äga något tillstånd — exakt som `useNarrowSurface`.
 *
 * Tre lägen ger alla `false`, och alla tre är normala:
 * - **TV-läge** — body-scenen äger skalan, ingen låda finns.
 * - **Äldre värd** (< 0.1.599) — ingen låda finns att lyssna på.
 * - **Första bildrutan** — `applyTvSceneBox` sätter attributen först efter
 *   sin första mätning. Därför observeras attributen i hela dokumentet och
 *   inte bara på en låda vi redan hittat: annars hade en telefon fastnat i
 *   skrivbordsbredd tills något annat råkade rendera om.
 *
 * @param ref valfri referens till ett element INNE i lådan (skalets rot).
 *   Utan den frågas dokumentet efter lådan — pluginsidan är ändå den enda
 *   som ber om en.
 */
export function usePhoneSurface(ref?: RefObject<HTMLElement | null>): boolean {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const read = (): boolean => {
      const from = ref?.current ?? null
      const box = from
        ? from.closest(`[${TV_SCENE_BOX_ATTR}]`)
        : document.querySelector(`[${TV_SCENE_BOX_ATTR}]`)
      return box?.getAttribute(TV_SCENE_PHONE_ATTR) === '1'
    }
    const sync = () => setPhone(read())
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: [TV_SCENE_BOX_ATTR, TV_SCENE_PHONE_ATTR],
    })
    return () => observer.disconnect()
    // Effekten körs EFTER att React fäst referensen, så `ref.current` finns
    // redan vid den första `sync()`.
  }, [ref])
  return phone
}
