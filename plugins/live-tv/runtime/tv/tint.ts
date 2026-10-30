import { useImageTone } from '../sport/backdrop'

/** Tonen när bilden saknas, är avstängd eller inte går att läsa (CORS, 404). */
export const NEUTRAL_TINT = '#2b3142'

const hex = (n: number) => n.toString(16).padStart(2, '0')

/**
 * "Färgton från bild" (handoff v2). Provningen och cachen är sportens
 * (`useImageTone`: 24×24-canvas en gång per URL, cachad även i lagringen) —
 * samma fälla gäller: en logga utan CORS-huvuden smutsar canvasen och ger
 * ingen ton, och då blir det neutralt i stället för ett kast.
 */
export function useTint(imageUrl: string | null, enabled: boolean): string {
  const tone = useImageTone(imageUrl, enabled)
  if (!enabled || !tone) return NEUTRAL_TINT
  return `#${hex(tone[0])}${hex(tone[1])}${hex(tone[2])}`
}
