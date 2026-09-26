import { describe, expect, it } from 'vitest'
import { formatDisplayMetrics, isSceneNotApplied, isViewportMismatch } from './display-metrics'

/**
 * En FRISK 960×540-skärm, alltså Fire TV Cube-rapportens mått.
 *
 * Talen hänger ihop: scenen läggs ut i 1920 designpixlar (`bodyLayoutWidth`),
 * krymps med 0,5 (`bodyScale`) och mäter därför 960 efteråt (`bodyWidth`).
 */
const frisk = {
  layoutWidth: 960, layoutHeight: 540,
  visualWidth: 960, visualHeight: 540, visualScale: 1,
  dpr: 4, sceneScale: '0.5', sceneOn: true,
  bodyTransform: 'matrix(0.5, 0, 0, 0.5, 0, 0)',
  bodyWidth: 960, bodyLayoutWidth: 1920, bodyScale: 0.5,
}

describe('formatDisplayMetrics', () => {
  it('visar layout, synlig yta, pixelkvot, scenskala och kroppens två bredder', () => {
    expect(formatDisplayMetrics(frisk))
      .toBe('960×540 · synlig 960×540 @1 · dpr 4 · scen 0.5 · kropp 1920→960 ×0.5')
  })

  it('klarar en webview utan visualViewport', () => {
    expect(formatDisplayMetrics({
      layoutWidth: 1920, layoutHeight: 1080,
      visualWidth: null, visualHeight: null, visualScale: null,
      dpr: 1, sceneScale: '1', sceneOn: false, bodyTransform: 'none',
      bodyWidth: 1920, bodyLayoutWidth: 1920, bodyScale: null,
    })).toBe('1920×1080 · synlig saknas · dpr 1 · scen 1 AV · kropp 1920→1920 ×otransformerad')
  })

  it('avrundar bråkdelar, så raden går att läsa på ett foto', () => {
    expect(formatDisplayMetrics({ ...frisk, visualWidth: 959.6, visualHeight: 540.4 }))
      .toContain('synlig 960×540')
  })
})

describe('isViewportMismatch', () => {
  /**
   * Ritas sidan mot en större yta än den som visas ser användaren bara en del
   * av den, förstorad, och resten blir omålad. På en frisk TV är de två
   * identiska — mätt i Television_4K-emulatorn 2026-09-25.
   */
  it('är falskt när layouten och den synliga ytan är lika', () => {
    expect(isViewportMismatch(frisk)).toBe(false)
  })

  it('är sant när sidan ritas bredare än den visas', () => {
    expect(isViewportMismatch({
      ...frisk, layoutWidth: 1920, layoutHeight: 1080, dpr: 2, sceneScale: '1',
    })).toBe(true)
  })

  it('tål en pixels avrundning utan att larma', () => {
    expect(isViewportMismatch({ ...frisk, visualWidth: 959 })).toBe(false)
  })

  it('är falskt när visualViewport saknas — då vet vi inget', () => {
    expect(isViewportMismatch({ ...frisk, visualWidth: null, visualHeight: null, visualScale: null }))
      .toBe(false)
  })
})

describe('isSceneNotApplied', () => {
  it('är falskt när scenen faktiskt krymper sidan', () => {
    expect(isSceneNotApplied(frisk)).toBe(false)
  })

  /**
   * Fallet vi jagar: attributet är satt och skalan uträknad, men CSS-regeln
   * tillämpas inte. Sidan ritas då i designstorlek inuti en mindre ruta.
   */
  it('är sant när scenen är på men bodyn är otransformerad', () => {
    expect(isSceneNotApplied({ ...frisk, bodyTransform: 'none', bodyScale: null }))
      .toBe(true)
  })

  /**
   * DET 0.11.4 SLÄPPTE IGENOM, och skälet till att raden nu bär två bredder.
   *
   * `matrix(1, 0, 0, 1, 0, 0)` är inte 'none', så den gamla kontrollen kallade
   * det "skalad" och friskt. Men en transform som skalar med 1 gör ingenting:
   * sidan läggs ut på 960 i stället för 1920, och då är varje mått i appen
   * dubbelt för stort — exakt symptomet. Den skalade bredden ensam kan inte
   * skilja det här från det friska fallet, för båda mäter 960.
   */
  it('är sant när transformen finns men skalar med 1', () => {
    expect(isSceneNotApplied({
      ...frisk,
      bodyTransform: 'matrix(1, 0, 0, 1, 0, 0)',
      bodyScale: 1,
      bodyLayoutWidth: 960,
      bodyWidth: 960,
    })).toBe(true)
  })

  it('är sant när layoutbredden inte stämmer med skalan', () => {
    // Transformen bär rätt skala, men sidan lades ut mot skärmen i stället för
    // i designbredd: 960 × 0,5 = 480, inte de 960 som mättes.
    expect(isSceneNotApplied({ ...frisk, bodyLayoutWidth: 960 })).toBe(true)
  })

  it('påstår inget när scenen är avstängd', () => {
    expect(isSceneNotApplied({ ...frisk, sceneOn: false, bodyTransform: 'none', bodyScale: null }))
      .toBe(false)
  })

  it('påstår inget vid skala 1, där ingen transform behövs', () => {
    expect(isSceneNotApplied({
      ...frisk, sceneScale: '1', bodyTransform: 'none', bodyScale: null,
    })).toBe(false)
  })
})
