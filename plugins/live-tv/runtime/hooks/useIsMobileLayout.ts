import { useEffect, useState } from 'react'

/**
 * Mobil-/smal layout: under appens skrivbordsbrytpunkt (1024 px, samma gräns
 * som media-explorer.tsx använder för sidomenyn).
 *
 * Finns för att mobilomgången 2026-09-03 bara får ändra mobilen — skrivbordets
 * Live TV är godkänt som det är och ska se ut precis som förut.
 */
export function useIsMobileLayout(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setMobile(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}
