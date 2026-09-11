import { useEffect } from 'react'

/**
 * Bakåt på undersidorna — tablån och kanalsidan.
 *
 * Rapporterat fel (testfeedback 2026-09-11): "pressing return does not exit
 * epg". Båda sidorna hade en bakåtPIL i rubriken och en svepgest för fingret,
 * men ingen tangenthantering alls — alltså ingen väg ut med fjärrkontroll. Med
 * sidan i helskärm var enheten i praktiken låst där.
 *
 * Ligger i en egen krok och inte i varje sida, för att regeln är densamma på
 * båda och den enda som är lätt att få fel: vilka lager som äger sitt eget
 * Bakåt.
 *
 * BUBBLINGSFASEN, inte capture. Ett öppet lager (spelaren, tangentbordet,
 * hållmenyn, gruppväljaren) hanterar Bakåt i capture och stoppar händelsen där.
 * Lyssnar sidan i capture tar den trycket FÖRST och river sidan under det
 * öppna lagret i stället för att stänga lagret. Ordningen är hela poängen.
 */
const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack'])

/** Lager som svarar för sitt eget Bakåt — sidan ska hålla sig undan. */
const ÄGDA_LAGER = '[data-panel-root], [role="dialog"], [data-tv-keyboard-panel], [data-tv-glass-menu]'

export function useBackToHub(onBack: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key) || event.defaultPrevented) return
      // Spelaren ligger över allt och stänger sig själv.
      if (document.querySelector('[data-lumio-player-open="1"]')) return
      const active = document.activeElement
      if (active instanceof HTMLElement && active.closest(ÄGDA_LAGER)) return
      event.preventDefault()
      event.stopPropagation()
      onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, enabled])
}
