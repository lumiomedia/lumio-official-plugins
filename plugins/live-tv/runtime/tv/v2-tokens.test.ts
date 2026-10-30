import { describe, expect, it } from 'vitest'
import { mixHex, v2Ambient, v2Bg, V2 } from './v2-tokens'

describe('v2-tokens', () => {
  it('blandar två hexfärger med andelen för den första', () => {
    expect(mixHex('#ffffff', '#000000', 75)).toBe('rgb(191,191,191)')
    expect(mixHex('#ffffff', '#000000', 0)).toBe('rgb(0,0,0)')
  })
  it('bakgrundstonerna enligt handoffen', () => {
    expect(v2Bg('slate')).toBe('#161a23')
    expect(v2Bg('graphite')).toBe('#1b1b1f')
    expect(v2Bg('night')).toBe('#0f1219')
  })
  it('logoplattan är ljus', () => {
    expect(V2.logoPlate).toBe('#f3f4f8')
  })
  it('den gemensamma bakgrunden: neutral radiell ton uppe till höger mot sidtonen (Jerry 2026-10-30)', () => {
    const a = v2Ambient('slate')
    expect(a).toContain('radial-gradient(')
    expect(a).toContain('at 70% 10%')
    expect(a).toContain(mixHex(V2.categoryTints.other, '#161a23', 75))
    expect(a).toContain('#161a23 75%')
  })
})
