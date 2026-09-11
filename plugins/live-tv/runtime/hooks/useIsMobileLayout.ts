import { useEffect, useState } from 'react'

/**
 * Mobil-/smal layout: under appens skrivbordsbrytpunkt (1024 px, samma gräns
 * som media-explorer.tsx använder för sidomenyn).
 *
 * Finns för att mobilomgången 2026-09-03 bara får ändra mobilen — skrivbordets
 * Live TV är godkänt som det är och ska se ut precis som förut.
 *
 * EN TV ÄR ALDRIG MOBIL (testfeedback 2026-09-11: "cat menu is offscreen").
 *
 * TV-webviews rapporterar ~960 px CSS-viewport — under 1024 — så hela Live
 * TV-navet ritades i MOBILLAYOUT på en 55-tummare. Kategorimenyn är det
 * tydligaste utslaget: mobilgrenen ger den `right: 0` och
 * `width: calc(100vw - 32px)`, alltså en skärmbred panel högerställd mot en
 * knapp som sitter långt ut åt höger — vänsterkanten hamnade utanför skärmen.
 *
 * Brytpunkten mäter FÖNSTRET, och på en TV mäter fönstret fel sak. `data-tv`
 * på roten är appens eget svar på vilken sorts enhet man sitter framför
 * (lib/tv-focus.tsx) och går före talet.
 */
function ärTv(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.tv === '1'
}

export function useIsMobileLayout(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && !ärTv() && !window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setMobile(!ärTv() && !mq.matches)
    sync()
    mq.addEventListener('change', sync)
    /*
     * `data-tv` sätts i en effekt i appen (lib/tv-focus.tsx) och kan alltså
     * komma EFTER pluginets första rendering. En observatör på attributet gör
     * att navet inte fastnar i mobillayout när flaggan landar en bildruta sent.
     */
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tv'] })
    return () => {
      mq.removeEventListener('change', sync)
      observer.disconnect()
    }
  }, [])
  return mobile
}
