import { describe, expect, it } from 'vitest'
import { createChannel, emptyDraft, type AirWindow, type ChannelDef } from '../model/channel'
import { createWheelSwipe, heroSlides, renderedSlideIds, stepSlide } from './hero-carousel-logic'

const ch = (n: number, airWindow: AirWindow = 'always'): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name: `K${n}`, airWindow }, [], 1, () => 0.1), id: `k${n}`, number: n })
const item = { ref: 'a', title: 'a', runtimeMin: 100_000, year: null, kind: 'movie' as const }
const morning = new Date(2026, 9, 14, 10, 0).getTime()

describe('heroskarusellen', () => {
  const sorted = [ch(1, 'evenings'), ch(2), ch(3), ch(4)]
  const rundowns: Record<string, typeof item[]> = { k1: [item], k2: [item], k3: [], k4: [item] }

  it('bara sändande kanaler i nummerordning; vilande, tomma och oladdade är inte bilder', () => {
    expect(heroSlides(sorted, (id) => rundowns[id], morning, 'k2').map((c) => c.id)).toEqual(['k2', 'k4'])
    expect(heroSlides(sorted, () => undefined, morning, null)).toEqual([])
  })

  it('vald kanal är alltid med, på sin nummerplats, även när den vilar', () => {
    expect(heroSlides(sorted, (id) => rundowns[id], morning, 'k1').map((c) => c.id)).toEqual(['k1', 'k2', 'k4'])
  })

  it('stegar runt om och börjar på första vid okänd aktiv', () => {
    const slides = heroSlides(sorted, (id) => rundowns[id], morning, 'k1')
    expect(stepSlide(slides, 'k4', 1)).toBe('k1')
    expect(stepSlide(slides, 'k1', -1)).toBe('k4')
    expect(stepSlide(slides, 'k2', 1)).toBe('k4')
    expect(stepSlide(slides, 'x', 1)).toBe('k1')
    expect(stepSlide([], 'k1', 1)).toBeNull()
  })

  it('ritar aktiv bild och grannarna', () => {
    const slides = [ch(1), ch(2), ch(3), ch(4), ch(5)]
    expect([...renderedSlideIds(slides, 'k1')].sort()).toEqual(['k1', 'k2', 'k5'])
  })

  it('styrplattans svep: ett steg per gest, trögheten ignoreras, lodrätt rullar sidan', () => {
    const w = createWheelSwipe({ thresholdPx: 60, idleMs: 220 })
    let t = 0
    const feed = (dx: number, dy = 0) => { t += 16; return w.feed(dx, dy, t) }
    expect(feed(20).step).toBe(0)
    expect(feed(25).step).toBe(0)
    expect(feed(30).step).toBe(1)
    // Trögheten efter gesten: inga fler steg.
    for (let i = 0; i < 30; i += 1) expect(feed(15).step).toBe(0)
    // Lodrätt dominerande: inget steg och inte vågrätt (sidan rullar).
    expect(feed(2, 40)).toEqual({ step: 0, horizontal: false })
    // Ny gest efter tystnad: åt andra hållet.
    t += 400
    expect(feed(-40).step).toBe(0)
    expect(feed(-40).step).toBe(-1)
  })
})
