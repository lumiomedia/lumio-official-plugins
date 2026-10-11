import { describe, expect, it } from 'vitest'
import { sportDrawerStyle, sportStackedStyle } from './surface'

describe('lådytor', () => {
  it('matchlådan läser lådvariabeln (minst 85 % i TV-läget) med kortytan som reserv', () => {
    expect(sportDrawerStyle.background).toBe('var(--sport-drawer-bg, var(--sport-card-bg, #141519))')
  })
  it('lådor ovanpå matchlådan (Fel kanal?) är helt täta, utan oskärpa', () => {
    expect(sportStackedStyle.background).toBe('#141519')
    expect(sportStackedStyle.backdropFilter).toBe('none')
  })
})
