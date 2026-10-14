import { describe, expect, it } from 'vitest'
import { channelInitials, createChannel, emptyDraft, hueTint, nextChannelNumber, PRESETS, validateDraft, type ChannelDef } from './channel'

const ch = (number: number): ChannelDef => ({ ...createChannel({ ...emptyDraft(), name: 'X', sources: ['library'] }, [], 0, () => 0.5), number })

describe('kanalmodellen', () => {
  it('tilldelar första lediga nummer', () => {
    expect(nextChannelNumber([])).toBe(1)
    expect(nextChannelNumber([ch(1), ch(2), ch(4)])).toBe(3)
  })

  it('createChannel sätter id, nummer, hue, seed och createdAt', () => {
    const made = createChannel({ ...emptyDraft(), name: '80-tals sci-fi', sources: ['library'] }, [ch(1)], 1234, () => 0.25)
    expect(made).toMatchObject({ name: '80-tals sci-fi', number: 2, hue: 90, createdAt: 1234 })
    expect(made.id).toMatch(/^ch-/)
    expect(Number.isInteger(made.seed)).toBe(true)
  })

  it('validerar namn och källor och varnar för få titlar', () => {
    expect(validateDraft({ ...emptyDraft(), name: ' ', sources: [] }, 0)).toEqual({ errors: ['name', 'sources'], warnings: ['few-titles'] })
    expect(validateDraft({ ...emptyDraft(), name: 'A', sources: ['debrid'] }, 12)).toEqual({ errors: [], warnings: [] })
    expect(validateDraft({ ...emptyDraft(), name: 'A', sources: ['debrid'] }, null)).toEqual({ errors: [], warnings: [] })
  })

  it('har tre förslag med giltiga regler', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['evening-film', 'comfort-series', 'late-shorts'])
    for (const preset of PRESETS) expect(validateDraft(preset.draft, null).errors).toEqual([])
  })

  it('hueTint använder hsl, aldrig oklch eller gradient', () => {
    expect(hueTint(200)).toContain('hsl(')
    expect(hueTint(200)).not.toContain('oklch')
    expect(hueTint(200)).not.toContain('gradient')
  })

  it('initialer', () => {
    expect(channelInitials('Kalles komfortserier')).toBe('KK')
    expect(channelInitials('noir')).toBe('N')
  })
})
