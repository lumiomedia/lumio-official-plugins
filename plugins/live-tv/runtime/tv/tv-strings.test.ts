import { describe, expect, it } from 'vitest'
import { tvText } from './tv-strings'

describe('tv-strings', () => {
  it('ersätter variabler', () => {
    expect(tvText('en', 'minutesLeft', { min: 12 })).toBe('12 min left')
    expect(tvText('sv', 'minutesLeft', { min: 12 })).toBe('12 min kvar')
  })
  it('faller tillbaka på engelska för okänt språk', () => {
    expect(tvText('de', 'railHome')).toBe('Home')
  })
})
