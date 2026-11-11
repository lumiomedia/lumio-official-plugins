/**
 * Är Live TV-spelaren öppen? Spelaren märker sin rot med
 * `data-lumio-player-open="1"` (live-tv-player.tsx). Bakgrundsarbete som inte
 * syns i spelaren väntar på den här — på en TV-box fryser bilden när
 * huvudtråden tolkar flera MB JSON mitt i spelningen.
 */
const SELECTOR = '[data-lumio-player-open="1"]'

export function isLiveTvPlayerOpen(): boolean {
  try { return document.querySelector(SELECTOR) !== null } catch { return false }
}

/** Löser direkt när spelaren är stängd, annars när den stängs. `stop()` sant = ge upp (löser ändå). */
export function whenLiveTvPlayerClosed(stop: () => boolean = () => false, pollMs = 500): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (stop() || !isLiveTvPlayerOpen()) resolve()
      else window.setTimeout(check, pollMs)
    }
    check()
  })
}
