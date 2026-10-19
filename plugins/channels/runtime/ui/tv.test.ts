import { describe, expect, it } from 'vitest'
import { dim, dimS, pickInitTarget, typeRole, typeSize, tvu } from './tv'
import { TV_ROW_H, TV_ROW_H_COMPACT } from './channel-guide'

describe('TV-mått', () => {
  it('layout: px utanför TV, appens TV-enhet på TV', () => {
    expect(dim(54, false)).toBe(54)
    expect(dim(54, true)).toBe('calc(54 * var(--tv-u, 1px))')
    expect(dim(30, true, 40)).toBe(tvu(40))
    expect(dimS(8, false)).toBe('8px')
    expect(dimS(8, true)).toBe('calc(8 * var(--tv-u, 1px))')
  })

  it('typografi: skrivbordets px → appens tokens på TV, aldrig px', () => {
    expect(typeSize(12, false)).toBe('12px')
    expect(typeRole(10)).toBe('micro')
    expect(typeRole(10.5)).toBe('label')
    expect(typeRole(12)).toBe('small')
    expect(typeRole(14)).toBe('body')
    expect(typeRole(16)).toBe('h3')
    expect(typeRole(21)).toBe('h2')
    expect(typeRole(44)).toBe('h1')
    expect(typeSize(12, true)).toBe('var(--st-small, calc(15.5 * var(--tv-u, 1px)))')
    expect(typeSize(12, true, 'body')).toMatch(/^var\(--st-body,/)
    for (const px of [9, 10.5, 11, 12, 13, 13.5, 14, 17, 21, 24, 44]) expect(typeSize(px, true)).not.toMatch(/px\)?$/)
  })

  it('tablåblocket rymmer titel + tid i TV-typografin med 30 % större textstorlek (klippt text förr)', () => {
    // Tokens i --tv-u: --st-small 15,5 (titel), --st-micro 12 (tid); radavstånd 1,2.
    const content = (15.5 + 12) * 1.2 * 1.3 + 2
    const chrome = 2 * 5 + 2 // padding + kant
    for (const row of [TV_ROW_H, TV_ROW_H_COMPACT]) expect(row - 2 * 6).toBeGreaterThanOrEqual(content + chrome)
  })
})

describe('TV-startfokus', () => {
  const html = (markup: string) => {
    const root = document.createElement('div')
    root.innerHTML = markup
    return root
  }

  it('data-init vinner, annars första användbara station', () => {
    expect(pickInitTarget(html('<button data-f>a</button><button data-f data-init>b</button>'))!.textContent).toBe('b')
    expect(pickInitTarget(html('<button data-f disabled>a</button><button data-f>b</button>'))!.textContent).toBe('b')
  })

  it('aldrig en avstängd, dold eller osynlig station', () => {
    const root = html('<button data-f data-init disabled>a</button><div aria-hidden="true"><button data-f>b</button></div><div data-visible="0"><button data-f>c</button></div><button data-f>d</button>')
    expect(pickInitTarget(root)!.textContent).toBe('d')
    expect(pickInitTarget(html('<span>inget</span>'))).toBeNull()
  })
})
