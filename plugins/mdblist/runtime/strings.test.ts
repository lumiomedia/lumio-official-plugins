import { describe, expect, it } from 'vitest'
import { S } from './strings'

describe('strings', () => {
  it('varje text finns på båda språken', () => {
    for (const [key, text] of Object.entries(S)) {
      expect(text.en, key).toBeTruthy()
      expect(text.sv, key).toBeTruthy()
    }
  })
})
