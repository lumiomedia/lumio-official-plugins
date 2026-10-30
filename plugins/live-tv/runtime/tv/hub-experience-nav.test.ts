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

describe('xpNavReduce, kategoriläget (Sänds nu + rutnät om 6)', () => {
  // Rad 0 = Sänds nu, rad 1–3 = rutnätets rader (sista raden kort: 6, 6, 2).
  const grid = { heroBtns: 3, chips: 5, rowLens: [10, 6, 6, 2], gridFrom: 1, backToChips: true }
  const go = (s: XpNavState, ...keys: Parameters<typeof xpNavReduce>[1][]) => keys.reduce((acc, k) => xpNavReduce(acc, k, grid), s)
  const onNow = go(xpInitial(4), 'down', 'down', 'right', 'right', 'right', 'right', 'right', 'right', 'right')

  it('▼ från Sänds nu går till rutnätets första rad (rutnätets egen kolumn)', () => {
    expect(onNow).toMatchObject({ zone: 'rows', row: 0 })
    expect(onNow.cols[0]).toBe(7)
    expect(go(onNow, 'down')).toMatchObject({ row: 1, cols: [7, 0, 0, 0] })
  })

  it('▲▼ mellan rutnätets rader behåller kolumnen (klampad mot en kort rad)', () => {
    const g = go(onNow, 'down', 'right', 'right', 'right', 'right')
    expect(g).toMatchObject({ row: 1 })
    expect(g.cols[1]).toBe(4)
    expect(go(g, 'down').cols[2]).toBe(4)
    expect(go(g, 'down', 'down')).toMatchObject({ row: 3 })
    expect(go(g, 'down', 'down').cols[3]).toBe(1)
    expect(go(g, 'down', 'down', 'up').cols[2]).toBe(1)
  })

  it('▲ från rutnätets första rad går till Sänds nu (som minns sin kolumn)', () => {
    const up = go(onNow, 'down', 'right', 'up')
    expect(up).toMatchObject({ row: 0 })
    expect(up.cols[0]).toBe(7)
  })

  it('Bakåt från raderna i kategoriläget går till chippen, inte heron', () => {
    expect(xpNavReduce(go(onNow, 'down'), 'back', grid).zone).toBe('chips')
    expect(xpNavReduce(go(xpInitial(4), 'down'), 'back', grid).zone).toBe('hero')
  })
})
