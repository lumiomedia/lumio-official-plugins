/**
 * Heroskarusellen på Kanaler-sidan: en bild per kanal som sänder just nu, i
 * nummerordning. Vald kanal är alltid med — vilar den (eller laddar) läggs
 * den in på sin nummerplats bland de sändande, så heron alltid visar vald
 * kanal och man ändå kan bläddra vidare till dem som sänder. Ren logik.
 */
import type { ChannelDef } from '../model/channel'
import { programmeAt, type ScheduleItem } from '../model/schedule'

export function heroSlides(
  sorted: ChannelDef[],
  rundownOf: (id: string) => ScheduleItem[] | undefined,
  now: number,
  selectedId: string | null,
): ChannelDef[] {
  return sorted.filter((c) => {
    if (c.id === selectedId) return true
    const rundown = rundownOf(c.id)
    return !!rundown && rundown.length > 0 && programmeAt(rundown, c.airWindow, now).kind === 'programme'
  })
}

/** Nästa/föregående bild, runt om. Okänd aktiv bild ger första. */
export function stepSlide(slides: ChannelDef[], activeId: string | null, dir: -1 | 1): string | null {
  if (slides.length === 0) return null
  const i = slides.findIndex((c) => c.id === activeId)
  if (i < 0) return slides[0]!.id
  return slides[(i + dir + slides.length) % slides.length]!.id
}

/** Bilderna som ritas: aktiv och grannarna (förladdning), inte alla. */
export function renderedSlideIds(slides: ChannelDef[], activeId: string | null): Set<string> {
  const i = Math.max(0, slides.findIndex((c) => c.id === activeId))
  const out = new Set<string>()
  for (const d of [-1, 0, 1]) {
    const s = slides[(i + d + slides.length) % slides.length]
    if (s) out.add(s.id)
  }
  return out
}

/**
 * Styrplattans tvåfingersvep (wheel-händelser med deltaX) → ett steg per
 * gest. Appens egen hero har ingen sådan hantering att återanvända, så
 * trösklarna är egna: lodrätt dominerande rörelse är sidrullning och lämnas
 * orörd; vågrätt summeras tills `thresholdPx`, sedan är gesten förbrukad
 * tills händelserna tystnat i `idleMs` (styrplattans tröghet fortsätter
 * skicka deltaX långt efter att fingrarna släppt). Ren logik.
 */
export function createWheelSwipe(opts: { thresholdPx?: number; idleMs?: number } = {}) {
  const threshold = opts.thresholdPx ?? 60
  const idle = opts.idleMs ?? 220
  let acc = 0
  let last = -Infinity
  let spent = false
  return {
    /** Riktning att bläddra (1 = nästa) eller 0. `horizontal`: händelsen var ett sidsvep (ska inte rulla sidan). */
    feed(dx: number, dy: number, now: number): { step: -1 | 0 | 1; horizontal: boolean } {
      if (now - last >= idle) { acc = 0; spent = false }
      last = now
      if (Math.abs(dx) <= Math.abs(dy)) return { step: 0, horizontal: false }
      if (spent) return { step: 0, horizontal: true }
      acc += dx
      if (Math.abs(acc) < threshold) return { step: 0, horizontal: true }
      const step = acc > 0 ? 1 : -1
      acc = 0
      spent = true
      return { step, horizontal: true }
    },
  }
}
