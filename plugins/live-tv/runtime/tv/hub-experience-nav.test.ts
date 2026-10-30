import { describe, expect, it } from 'vitest'
import { xpInitial, xpNavReduce, type XpNavState } from './hub-experience-nav'

const dims = { heroBtns: 3, chips: 5, rowLens: [4, 10, 2] }
const run = (s: XpNavState, ...keys: Parameters<typeof xpNavReduce>[1][]) => keys.reduce((acc, k) => xpNavReduce(acc, k, dims), s)

describe('xpNavReduce (Upplevelse, zonerna hero → chips → rader)', () => {
  it('startar på heron, första knappen', () => {
    expect(xpInitial(3)).toEqual({ zone: 'hero', heroBtn: 0, chipIdx: 0, row: 0, cols: [0, 0, 0] })
  })

  it('▼ hero → chips → rad 0; ▲ från rad 0 → chips; ▲ från chips → hero; ▲ på heron gör inget', () => {
    const s0 = xpInitial(3)
    expect(run(s0, 'down').zone).toBe('chips')
    const rows = run(s0, 'down', 'down')
    expect(rows).toMatchObject({ zone: 'rows', row: 0 })
    expect(run(rows, 'up').zone).toBe('chips')
    expect(run(rows, 'up', 'up').zone).toBe('hero')
    expect(run(s0, 'up')).toBe(s0)
  })

  it('◂▸ klampas i heron och chipraden', () => {
    const s0 = xpInitial(3)
    expect(run(s0, 'right', 'right', 'right', 'right').heroBtn).toBe(2)
    expect(run(s0, 'left')).toBe(s0)
    expect(run(s0, 'down', 'right', 'right').chipIdx).toBe(2)
    expect(run(s0, 'down', 'right', 'right', 'right', 'right', 'right', 'right').chipIdx).toBe(4)
  })

  it('◂▸ klampas per rad och varje rad minns sin kolumn', () => {
    const s = run(xpInitial(3), 'down', 'down', 'right', 'right', 'right', 'right', 'right')
    expect(s.cols[0]).toBe(3)
    const second = run(s, 'down', 'right', 'right')
    expect(second).toMatchObject({ row: 1, cols: [3, 2, 0] })
    expect(run(second, 'up')).toMatchObject({ row: 0, cols: [3, 2, 0] })
    expect(run(second, 'down', 'down', 'down').row).toBe(2)
    expect(run(second, 'down', 'right', 'right', 'right').cols[2]).toBe(1)
    expect(run(second, 'left', 'left', 'left').cols[1]).toBe(0)
  })

  it('Bakåt från raderna eller chippen → heronas första knapp, rad 0; Bakåt på heron gör inget', () => {
    const deep = run(xpInitial(3), 'right', 'down', 'down', 'down', 'right')
    const back = xpNavReduce(deep, 'back', dims)
    expect(back).toMatchObject({ zone: 'hero', heroBtn: 0, row: 0 })
    expect(back.cols).toEqual(deep.cols)
    expect(xpNavReduce(run(xpInitial(3), 'down'), 'back', dims).zone).toBe('hero')
    const hero = xpInitial(3)
    expect(xpNavReduce(hero, 'back', dims)).toBe(hero)
  })

  it('utan chips går ▼ från heron rakt till raderna; utan rader stannar ▼ på chippen', () => {
    const noChips = { heroBtns: 3, chips: 0, rowLens: [2] }
    expect(xpNavReduce(xpInitial(1), 'down', noChips).zone).toBe('rows')
    const noRows = { heroBtns: 3, chips: 2, rowLens: [] }
    const chips = xpNavReduce(xpInitial(0), 'down', noRows)
    expect(chips.zone).toBe('chips')
    expect(xpNavReduce(chips, 'down', noRows)).toBe(chips)
  })

  it('krympande rader klampar raden och kolumnen (chipfilter tömde en rad)', () => {
    const s: XpNavState = { zone: 'rows', heroBtn: 0, chipIdx: 0, row: 2, cols: [0, 9, 1] }
    const out = xpNavReduce(s, 'left', { heroBtns: 3, chips: 5, rowLens: [4, 3] })
    expect(out).toMatchObject({ row: 1, cols: [0, 1] })
  })
})
