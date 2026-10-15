import { describe, expect, it } from 'vitest'
import { hostTopbarBottom } from './host-controls'

const box = (top: number, height: number, width = 1000, offsetWidth = width) => {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ top, bottom: top + height, left: 0, right: width, width, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
  Object.defineProperty(el, 'offsetWidth', { value: offsetWidth })
  return el
}

describe('värdens topprad', () => {
  it('kanalpillen mäter radens verkliga nederkant (raden kan ligga lägre än 52 px)', () => {
    // Spelaren börjar 0, raden ligger 28 px ned (titelrad/inset) och är 52 hög.
    expect(hostTopbarBottom(box(0, 900), box(28, 52))).toBe(80)
  })

  it('räknar bort scenens skala och returnerar null för en omätbar rad', () => {
    // Skalad 0,5: skärmpx 40 → 80 i sidans egna px.
    expect(hostTopbarBottom(box(10, 450, 500, 1000), box(10, 40, 500))).toBe(80)
    expect(hostTopbarBottom(box(0, 900), box(0, 0, 0))).toBeNull()
  })
})
