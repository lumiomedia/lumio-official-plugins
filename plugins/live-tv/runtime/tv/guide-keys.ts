/**
 * Guidens snabbtangenter (handoff v2 "Guide navigation"): N = till nu,
 * T = växla Nu/Sen ↔ Tablå. Egen ren funktion så skalet och testerna delar
 * EN tolkning av tangenten.
 */
export type GuideKeyAction = 'now' | 'toggle-tl'

export function guideKeyAction(key: string): GuideKeyAction | null {
  if (key === 'n' || key === 'N') return 'now'
  if (key === 't' || key === 'T') return 'toggle-tl'
  return null
}
