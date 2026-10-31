'use client'

import { useEffect, useState } from 'react'

/**
 * APPENS "Dölj första raden" (lib/appearance-settings.ts, värdar från 0.1.639).
 * Live TV:s Hem ligger i appens scen, så valet gäller där också — Jerry ville
 * kunna slå på det från Live TV:s inställningar (2026-10-31). Läses direkt ur
 * `__lumioPluginRuntime.sdk`: en äldre värd saknar det och raden döljs.
 */
type HeroFullHost = { getTvHeroFull?: () => boolean; setTvHeroFull?: (v: boolean) => void; onAppearanceChanged?: (fn: () => void) => () => void }

const host = (): HeroFullHost | undefined => (typeof window !== 'undefined'
  ? (window as unknown as { __lumioPluginRuntime?: { sdk?: HeroFullHost } }).__lumioPluginRuntime?.sdk
  : undefined)

/** `null` när värden saknar valet. */
export function useHostHeroFull(): { on: boolean; set: (v: boolean) => void } | null {
  const h = host()
  const available = typeof h?.getTvHeroFull === 'function' && typeof h?.setTvHeroFull === 'function'
  const [on, setOn] = useState(() => (available ? h!.getTvHeroFull!() : false))
  useEffect(() => {
    if (!available) return
    return h?.onAppearanceChanged?.(() => setOn(h.getTvHeroFull!()))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available])
  if (!available) return null
  return { on, set: (v) => { h!.setTvHeroFull!(v); setOn(v) } }
}
