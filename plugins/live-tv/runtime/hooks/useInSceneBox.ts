import { useEffect, useState, type RefObject } from 'react'
import { TV_SCENE_BOX_ATTR } from '@/lib/plugin-sdk'

/**
 * SCENLÅDA — sant när sidan renderas inuti värdens skalade scenlåda
 * (skrivbord/telefon som ber om TV:ns designrymd via `tvSceneBox: true` på
 * sidbidraget), falskt annars: TV-läge (body-scenen äger skalan där, ingen
 * låda finns), äldre värd utan lådstöd, eller ingen låda alls.
 *
 * Behövs för host-komponenter som INTE är skrivna i pluginets `dp()`-enhet
 * (raw designpixlar som samverkar rätt med lådans `transform: scale()`) utan
 * i äkta rem/px, och som därför krymper med scenens faktor om de hamnar
 * inuti lådan — se `useTvClockNode` i `tv-ui.tsx` (Jerrys återkoppling
 * 2026-09-14: värdens klocka i hörnet förminskad på skrivbordet).
 *
 * Samma läsmönster som `usePhoneSurface`/`useNarrowSurface`: lådan är
 * VÄRDENS element, så hooken läser uppåt i DOM:en (eller hela dokumentet
 * utan en ref) i stället för att äga något tillstånd.
 *
 * @param ref valfri referens till ett element INNE i lådan (skalets rot).
 *   Utan den frågas dokumentet efter lådan.
 */
export function useInSceneBox(ref?: RefObject<HTMLElement | null>): boolean {
  const [inBox, setInBox] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const read = (): boolean => {
      const from = ref?.current ?? null
      const box = from
        ? from.closest(`[${TV_SCENE_BOX_ATTR}]`)
        : document.querySelector(`[${TV_SCENE_BOX_ATTR}]`)
      return box !== null
    }
    const sync = () => setInBox(read())
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: [TV_SCENE_BOX_ATTR],
    })
    return () => observer.disconnect()
    // Effekten körs EFTER att React fäst referensen, så `ref.current` finns
    // redan vid den första `sync()`.
  }, [ref])
  return inBox
}
