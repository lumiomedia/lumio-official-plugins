import { describe, expect, it } from 'vitest'
import { displayTitle, titleKey } from './display-title'

describe('displayTitle (leverantörens upphöjda markörer bort ur visade titlar)', () => {
  it('tar bort ᴸᶦᵛᵉ och ᴺᵉʷ', () => {
    expect(displayTitle('Flickor ᴸᶦᵛᵉ')).toBe('Flickor')
    expect(displayTitle('Rapport ᴺᵉʷ')).toBe('Rapport')
    expect(displayTitle('Ishockey: TV-pucken : Semifinaler, flickor ᴸᶦᵛᵉ')).toBe('Ishockey: TV-pucken : Semifinaler, flickor')
  })
  it('markör mitt i titeln lämnar ett mellanslag', () => {
    expect(displayTitle('Nyheter ᴸᶦᵛᵉ från Kiruna')).toBe('Nyheter från Kiruna')
  })
  it('vanliga titlar orörda (även okinawa-apostrof och diakriter)', () => {
    expect(displayTitle('Rapport')).toBe('Rapport')
    expect(displayTitle('Hawaiʻi Five-0')).toBe('Hawaiʻi Five-0')
    expect(displayTitle('Brännpunkt – Malmö')).toBe('Brännpunkt – Malmö')
  })
  it('null/undefined passerar', () => {
    expect(displayTitle(null)).toBeNull()
    expect(displayTitle(undefined)).toBeUndefined()
  })
  it('titleKey: samma program med och utan markör, olika versaler/mellanslag', () => {
    expect(titleKey('Rapport ᴺᵉʷ')).toBe(titleKey('rapport'))
    expect(titleKey('  Go’kväll  ')).toBe(titleKey('go’kväll'))
    expect(titleKey('Rapport')).not.toBe(titleKey('Sportnytt'))
  })
})
