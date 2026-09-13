import { describe, expect, it } from 'vitest'
import { addToFirstFree, assignTile, enlargeTile, removeTile, setLayout, tileCount, type MultiviewState } from './tv-multiview-store'

const empty: MultiviewState = { layout: 4, tiles: [null, null, null, null], audioIndex: 0 }

describe('tv-multiview-store', () => {
  it('tileCount följer layouten', () => {
    expect(tileCount(2)).toBe(2)
    expect(tileCount(3)).toBe(3)
    expect(tileCount(4)).toBe(4)
  })
  it('assignTile sätter nyckel och ger ljud till första tilldelade rutan', () => {
    const s = assignTile(empty, 2, 'a')
    expect(s.tiles[2]).toBe('a')
    expect(s.audioIndex).toBe(2)
  })
  it('removeTile flyttar ljudet till nästa tilldelade ruta', () => {
    const s = removeTile(assignTile(assignTile(empty, 0, 'a'), 1, 'b'), 0)
    expect(s.tiles[0]).toBeNull()
    expect(s.audioIndex).toBe(1)
  })
  it('enlargeTile byter till 1+2 med rutan först', () => {
    const s = enlargeTile(assignTile(assignTile(empty, 0, 'a'), 3, 'b'), 3)
    expect(s.layout).toBe(3)
    expect(s.tiles[0]).toBe('b')
    expect(s.tiles).toContain('a')
    expect(s.tiles).toHaveLength(3)
  })
  it('setLayout behåller så många rutor som ryms', () => {
    const s = setLayout(assignTile(assignTile(assignTile(empty, 0, 'a'), 1, 'b'), 2, 'c'), 2)
    expect(s.tiles).toEqual(['a', 'b'])
    expect(s.audioIndex).toBe(0)
  })
  it('addToFirstFree tar första lediga, annars sista', () => {
    const full = { layout: 2 as const, tiles: ['a', 'b'], audioIndex: 0 }
    expect(addToFirstFree({ layout: 2, tiles: ['a', null], audioIndex: 0 }, 'c').tiles).toEqual(['a', 'c'])
    expect(addToFirstFree(full, 'c').tiles).toEqual(['a', 'c'])
  })
})
