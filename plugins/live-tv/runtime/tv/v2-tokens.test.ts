import { describe, expect, it } from 'vitest'
import { liveColorVars, liveColors, mixHex, v2Ambient, v2Bg, V2 } from './v2-tokens'

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
  it('v2Ambient tar även en hexton (egen bakgrundsfärg)', () => {
    expect(v2Ambient('#203040')).toContain(`${mixHex(V2.categoryTints.other, '#203040', 75)}, #203040 75%`)
  })
})

describe('liveColors — de två egna färgerna (Jerry 2026-10-30)', () => {
  const base = { liveBackground: 'slate' as const, liveBgColor: null, liveSurfaceColor: null }
  it('standard = dagens utseende exakt', () => {
    expect(liveColors(base)).toEqual({
      bg: '#161a23',
      card: 'linear-gradient(180deg,#2b3142,#242938)',
      rail: 'linear-gradient(180deg, rgba(252,252,255,0.05), rgba(252,252,255,0.02))',
    })
    expect(liveColors({ ...base, liveBackground: 'night' }).bg).toBe('#0f1219')
  })
  it('egen bakgrund går före Skiffer/Grafit/Natt', () => {
    expect(liveColors({ ...base, liveBackground: 'night', liveBgColor: '#203040' }).bg).toBe('#203040')
  })
  it('egen kortfärg: kort och räls i den färgen, mörknar nedåt', () => {
    const c = liveColors({ ...base, liveSurfaceColor: '#445566' })
    expect(c.card).toBe(`linear-gradient(180deg, #445566, ${mixHex('#445566', '#000000', 88)})`)
    expect(c.rail).toContain('#445566')
    expect(c.rail).toContain('linear-gradient(180deg')
  })
  it('CSS-variablerna för skalets rot', () => {
    const c = liveColors({ ...base, liveSurfaceColor: '#445566', liveBgColor: '#203040' })
    expect(liveColorVars({ ...base, liveSurfaceColor: '#445566', liveBgColor: '#203040' })).toEqual({ '--lt-bg': c.bg, '--lt-card': c.card, '--lt-rail': c.rail })
  })
  it('kortytan läser variabeln och faller tillbaka på dagens gradient', () => {
    expect(V2.noArt).toBe('var(--lt-card, linear-gradient(180deg,#2b3142,#242938))')
  })
})
