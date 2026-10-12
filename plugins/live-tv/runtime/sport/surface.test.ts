import { describe, expect, it } from 'vitest'
import { sportDrawerStyle, sportStackedStyle } from './surface'

describe('lådytor', () => {
  it('matchlådan läser lådvariabeln (minst 85 % i TV-läget) med kortytan som reserv', () => {
    expect(sportDrawerStyle.background).toBe('var(--sport-drawer-bg, var(--sport-card-bg, #141519))')
  })
  it('lådor ovanpå matchlådan (Fel kanal?) är helt täta, utan oskärpa', () => {
    // Samma ton som matchlådan (--sport-drawer-solid ur kortvalet), som hel färg; utan bild panelfärgen.
    expect(sportStackedStyle.background).toBe('var(--sport-drawer-solid, #141519)')
    expect(sportStackedStyle.backdropFilter).toBe('none')
  })
})
