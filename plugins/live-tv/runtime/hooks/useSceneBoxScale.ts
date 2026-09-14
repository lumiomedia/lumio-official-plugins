import { useEffect, useState } from 'react'
import { TV_SCENE_BOX_ATTR } from '@/lib/plugin-sdk'
import * as sdk from '@/lib/plugin-sdk'

/**
 * SCENLÅDANS SKALA — designpixel → skärmpixel för värdens skrivbordslåda,
 * eller `null` när skalan inte går att lita på.
 *
 * `null` täcker tre normala fall, alla med samma svar (falla tillbaka på
 * något ANNAT än en skalad HostClock):
 * - Ingen låda hittas (TV-läge, ingen låda alls, eller lådan har inte
 *   monterats/mätts än).
 * - SDK:t saknar `tvSceneBoxScale` — en äldre värd utan funktionen. Läses
 *   defensivt av samma skäl som `getTvClock` i `tv-ui.tsx`: ett namngivet
 *   import hade kunnat krascha byggsteget mot en äldre `plugin-sdk` som
 *   aldrig exporterat namnet.
 * - Funktionen svarar med något odugligt (0, negativt, NaN) — läses inte
 *   från SDK:t rakt av, för `useTvClockNode` ska kunna falla tillbaka på sin
 *   EGEN dp()-klocka (commit 2541690) hellre än att skala med `Infinity`
 *   eller rita HostClock i sin krympta, oskalade storlek.
 *
 * Samma läsmönster som `useInSceneBox`/`usePhoneSurface`: lådan är VÄRDENS
 * element, så hooken frågar dokumentet i stället för att äga tillstånd, och
 * lyssnar på `MutationObserver` för att fånga skalan varje gång lådan mäter
 * om sig (fönsterändring, sidomeny som öppnas/stängs, o.s.v. — se
 * `observeTvSceneBox` i värdens `lib/tv-scene.ts`). Skalan skrivs som en
 * INLINE CSS-variabel (`--tv-scene-box-scale`), vilket MutationObserver ser
 * som en `style`-attributändring på lådan.
 */
export function useSceneBoxScale(): number | null {
  const [scale, setScale] = useState<number | null>(null)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const read = (): number | null => {
      const getScale = (sdk as unknown as { tvSceneBoxScale?: (element: HTMLElement) => number }).tvSceneBoxScale
      if (typeof getScale !== 'function') return null
      const box = document.querySelector<HTMLElement>(`[${TV_SCENE_BOX_ATTR}]`)
      if (!box) return null
      const value = getScale(box)
      return Number.isFinite(value) && value > 0 ? value : null
    }
    const sync = () => setScale(read())
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: [TV_SCENE_BOX_ATTR, 'style'],
    })
    return () => observer.disconnect()
    // Effekten körs EFTER att React fäst ev. referenser i lådan, så första
    // `sync()` redan ser en monterad låda när en sådan finns.
  }, [])
  return scale
}
