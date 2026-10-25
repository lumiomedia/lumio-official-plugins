import { describe, expect, it } from 'vitest'
import { pick, S } from './strings'

const LANGS = ['en', 'sv', 'de', 'fr', 'es'] as const
const holders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')

describe('strings', () => {
  it('varje text finns på alla fem språken med samma platshållare', () => {
    for (const [key, text] of Object.entries(S)) {
      for (const l of LANGS) {
        expect(text[l], `${key}.${l}`).toBeTruthy()
        expect(holders(text[l]), `${key}.${l}`).toBe(holders(text.en))
      }
    }
  })

  it('pick faller tillbaka på engelska för okända språk', () => {
    expect(pick(S.cancel, 'de')).toBe(S.cancel.de)
    expect(pick(S.cancel, 'x-pirate')).toBe(S.cancel.en)
    expect(pick(S.cancel, undefined)).toBe(S.cancel.en)
  })
})
