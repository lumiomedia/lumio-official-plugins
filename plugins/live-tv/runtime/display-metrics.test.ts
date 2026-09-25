import { describe, expect, it } from 'vitest'
import { formatDisplayMetrics, isViewportMismatch } from './display-metrics'

describe('formatDisplayMetrics', () => {
  it('visar layout, synlig yta, pixelkvot och scenskala', () => {
    expect(formatDisplayMetrics({
      layoutWidth: 960, layoutHeight: 540,
      visualWidth: 960, visualHeight: 540, visualScale: 1,
      dpr: 4, sceneScale: '0.5',
    })).toBe('960×540 · synlig 960×540 @1 · dpr 4 · scen 0.5')
  })

  it('klarar en webview utan visualViewport', () => {
    expect(formatDisplayMetrics({
      layoutWidth: 1920, layoutHeight: 1080,
      visualWidth: null, visualHeight: null, visualScale: null,
      dpr: 1, sceneScale: '1',
    })).toBe('1920×1080 · synlig saknas · dpr 1 · scen 1')
  })

  it('avrundar bråkdelar, så raden går att läsa på ett foto', () => {
    expect(formatDisplayMetrics({
      layoutWidth: 960, layoutHeight: 540,
      visualWidth: 959.6, visualHeight: 540.4, visualScale: 1,
      dpr: 4, sceneScale: '0.5',
    })).toContain('synlig 960×540')
  })
})

describe('isViewportMismatch', () => {
  /**
   * HELA FRÅGAN i Fire TV-rapporten: ritas sidan mot en större yta än den som
   * visas ser användaren bara en del av den, förstorad, och resten blir omålad
   * ("zoomat in och en vit ruta"). På en frisk TV är de två identiska — mätt i
   * Television_4K-emulatorn 2026-09-25: layout 960×540, synlig 960×540 @1.
   */
  it('är falskt när layouten och den synliga ytan är lika', () => {
    expect(isViewportMismatch({
      layoutWidth: 960, layoutHeight: 540,
      visualWidth: 960, visualHeight: 540, visualScale: 1,
      dpr: 4, sceneScale: '0.5',
    })).toBe(false)
  })

  it('är sant när sidan ritas bredare än den visas', () => {
    expect(isViewportMismatch({
      layoutWidth: 1920, layoutHeight: 1080,
      visualWidth: 960, visualHeight: 540, visualScale: 1,
      dpr: 2, sceneScale: '1',
    })).toBe(true)
  })

  it('tål en pixels avrundning utan att larma', () => {
    expect(isViewportMismatch({
      layoutWidth: 960, layoutHeight: 540,
      visualWidth: 959, visualHeight: 540, visualScale: 1,
      dpr: 4, sceneScale: '0.5',
    })).toBe(false)
  })

  it('är falskt när visualViewport saknas — då vet vi inget', () => {
    expect(isViewportMismatch({
      layoutWidth: 1920, layoutHeight: 1080,
      visualWidth: null, visualHeight: null, visualScale: null,
      dpr: 1, sceneScale: '1',
    })).toBe(false)
  })
})
