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
