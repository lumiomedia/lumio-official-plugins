import { describe, expect, it } from 'vitest'
import { formatDisplayMetrics, isSceneNotApplied, isViewportMismatch } from './display-metrics'

describe('formatDisplayMetrics', () => {
  it('visar layout, synlig yta, pixelkvot och scenskala', () => {
    expect(formatDisplayMetrics({
      layoutWidth: 960, layoutHeight: 540,
      visualWidth: 960, visualHeight: 540, visualScale: 1,
      dpr: 4, sceneScale: '0.5', sceneOn: true, bodyTransform: 'matrix(0.5, 0, 0, 0.5, 0, 0)', bodyWidth: 1920,
    })).toBe('960×540 · synlig 960×540 @1 · dpr 4 · scen 0.5 · kropp 1920 skalad')
  })

  it('klarar en webview utan visualViewport', () => {
    expect(formatDisplayMetrics({
      layoutWidth: 1920, layoutHeight: 1080,
      visualWidth: null, visualHeight: null, visualScale: null,
      dpr: 1, sceneScale: '1', sceneOn: false, bodyTransform: 'none', bodyWidth: 1920,
    })).toBe('1920×1080 · synlig saknas · dpr 1 · scen 1 AV · kropp 1920 otransformerad')
  })

  it('avrundar bråkdelar, så raden går att läsa på ett foto', () => {
    expect(formatDisplayMetrics({
      layoutWidth: 960, layoutHeight: 540,
      visualWidth: 959.6, visualHeight: 540.4, visualScale: 1,
      dpr: 4, sceneScale: '0.5', sceneOn: true, bodyTransform: 'matrix(0.5, 0, 0, 0.5, 0, 0)', bodyWidth: 1920,
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
      dpr: 4, sceneScale: '0.5', sceneOn: true, bodyTransform: 'matrix(0.5, 0, 0, 0.5, 0, 0)', bodyWidth: 1920,
    })).toBe(false)
  })

  it('är sant när sidan ritas bredare än den visas', () => {
    expect(isViewportMismatch({
      layoutWidth: 1920, layoutHeight: 1080,
      visualWidth: 960, visualHeight: 540, visualScale: 1,
      dpr: 2, sceneScale: '1', sceneOn: false, bodyTransform: 'none', bodyWidth: 1920,
    })).toBe(true)
  })

  it('tål en pixels avrundning utan att larma', () => {
    expect(isViewportMismatch({
      layoutWidth: 960, layoutHeight: 540,
      visualWidth: 959, visualHeight: 540, visualScale: 1,
      dpr: 4, sceneScale: '0.5', sceneOn: true, bodyTransform: 'matrix(0.5, 0, 0, 0.5, 0, 0)', bodyWidth: 1920,
    })).toBe(false)
  })

  it('är falskt när visualViewport saknas — då vet vi inget', () => {
    expect(isViewportMismatch({
      layoutWidth: 1920, layoutHeight: 1080,
      visualWidth: null, visualHeight: null, visualScale: null,
      dpr: 1, sceneScale: '1', sceneOn: false, bodyTransform: 'none', bodyWidth: 1920,
    })).toBe(false)
  })
})

describe('isSceneNotApplied', () => {
  const frisk = {
    layoutWidth: 960, layoutHeight: 540,
    visualWidth: 960, visualHeight: 540, visualScale: 1,
    dpr: 4, sceneScale: '0.5', sceneOn: true,
    bodyTransform: 'matrix(0.5, 0, 0, 0.5, 0, 0)', bodyWidth: 1920,
  }

  it('är falskt när scenen faktiskt krymper sidan', () => {
    expect(isSceneNotApplied(frisk)).toBe(false)
  })

  /**
   * Fallet vi jagar: attributet är satt och skalan uträknad, men CSS-regeln
   * tillämpas inte. Sidan ritas då i designstorlek inuti en mindre ruta —
   * förstorad, med omålad yta utanför.
   */
  it('är sant när scenen är på men bodyn är otransformerad', () => {
    expect(isSceneNotApplied({ ...frisk, bodyTransform: 'none' })).toBe(true)
  })

  it('påstår inget när scenen är avstängd', () => {
    expect(isSceneNotApplied({ ...frisk, sceneOn: false, bodyTransform: 'none' })).toBe(false)
  })

  it('påstår inget vid skala 1, där ingen transform behövs', () => {
    expect(isSceneNotApplied({ ...frisk, sceneScale: '1', bodyTransform: 'none' })).toBe(false)
  })
})
