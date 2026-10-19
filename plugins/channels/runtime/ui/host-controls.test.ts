import { describe, expect, it } from 'vitest'
import { hostTopbarBottom, menuClearSpot } from './host-controls'

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

describe('kanalpillen förbi appens menyknapp', () => {
  const r = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height })
  const screen = r(0, 0, 1440, 900)

  it('rund menyknapp uppe till vänster (efter trafikljusen): pillen under den, aldrig bredvid i toppmenyn', () => {
    // Knappen 44 px bred på x 80–124, y 38–82.
    expect(menuClearSpot(screen, r(80, 38, 44, 44))).toEqual({ left: 80, top: 82 + 14 })
  })
  it('ingen knapp, dold knapp, knapp till höger eller långt ner: pillens vanliga plats', () => {
    expect(menuClearSpot(screen, null)).toBeNull()
    expect(menuClearSpot(screen, r(0, 0, 0, 0))).toBeNull()
    expect(menuClearSpot(screen, r(1300, 38, 44, 44))).toBeNull()
    expect(menuClearSpot(screen, r(16, 700, 44, 44))).toBeNull()
  })
  it('skalad scen (TV): px i OSD:ns egna mått', () => {
    expect(menuClearSpot(r(0, 0, 720, 450), r(40, 19, 22, 22), 0.5)).toEqual({ left: 80, top: 82 + 14 })
  })
  it('aldrig närmare kanten än pillens vanliga indrag', () => {
    expect(menuClearSpot(screen, r(-40, 10, 44, 44))?.left).toBe(16)
  })
})
