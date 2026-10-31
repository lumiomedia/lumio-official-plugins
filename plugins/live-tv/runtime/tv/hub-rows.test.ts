import { describe, expect, it } from 'vitest'
import { BUILTIN_HUB_ROWS, addListRow, listRowId, moveHubRow, removeHubRow, sanitizeHubRows, toggleHubRow } from './hub-rows'

describe('hemraderna i Upplevelse (Jerry 2026-10-31)', () => {
  it('standard: de inbyggda raderna i dagens ordning, alla synliga', () => {
    expect(sanitizeHubRows(undefined)).toEqual(BUILTIN_HUB_ROWS.map((id) => ({ id, hidden: false })))
  })
  it('sanering: okända id bort, dubbletter bort, saknade inbyggda läggs sist', () => {
    const rows = sanitizeHubRows([{ id: 'yours', hidden: true }, { id: 'nope' }, { id: 'yours' }, { id: 'list:abc' }, { id: 'list:' }])
    expect(rows.slice(0, 2)).toEqual([{ id: 'yours', hidden: true }, { id: 'list:abc', hidden: false }])
    expect(rows.slice(2).map((r) => r.id)).toEqual(BUILTIN_HUB_ROWS.filter((id) => id !== 'yours'))
  })
  it('dölj/visa växlar bara den raden', () => {
    const rows = toggleHubRow(sanitizeHubRows(undefined), 'sport')
    expect(rows.find((r) => r.id === 'sport')!.hidden).toBe(true)
    expect(toggleHubRow(rows, 'sport').find((r) => r.id === 'sport')!.hidden).toBe(false)
  })
  it('flytta upp/ner byter plats med grannen och stannar vid kanterna', () => {
    const base = sanitizeHubRows(undefined)
    expect(moveHubRow(base, 'sport', -1).map((r) => r.id).slice(0, 2)).toEqual(['sport', 'onNow'])
    expect(moveHubRow(base, 'onNow', -1)).toEqual(base)
    const last = base[base.length - 1]!.id
    expect(moveHubRow(base, last, 1)).toEqual(base)
  })
  it('en egen lista läggs in direkt efter Dina kanaler, en gång', () => {
    const rows = addListRow(sanitizeHubRows(undefined), 'L1')
    const ids = rows.map((r) => r.id)
    expect(ids[ids.indexOf('yours') + 1]).toBe(listRowId('L1'))
    expect(addListRow(rows, 'L1')).toEqual(rows)
  })
  it('bara listrader går att ta bort; inbyggda döljs i stället', () => {
    const rows = addListRow(sanitizeHubRows(undefined), 'L1')
    expect(removeHubRow(rows, listRowId('L1')).some((r) => r.id === listRowId('L1'))).toBe(false)
    expect(removeHubRow(rows, 'sport')).toEqual(rows)
  })
})
