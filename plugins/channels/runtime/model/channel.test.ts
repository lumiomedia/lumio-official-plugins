import { describe, expect, it } from 'vitest'
import { channelInitials, createChannel, emptyDraft, buildDefaultChannels, DEFAULT_CHANNELS, ERA_RANGES, hueTint, nextChannelNumber, presetSeed, validateDraft, type ChannelDef } from './channel'

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
    expect(DEFAULT_CHANNELS).toHaveLength(10)
    for (const d of DEFAULT_CHANNELS) expect(validateDraft({ ...d.draft, name: d.name.sv }, null).errors).toEqual([])
  })

  it('hueTint använder hsl, aldrig oklch eller gradient', () => {
    expect(hueTint(200)).toContain('hsl(')
    expect(hueTint(200)).not.toContain('oklch')
    expect(hueTint(200)).not.toContain('gradient')
  })

  it('initialer', () => {
    expect(channelInitials('Kalles komfortserier')).toBe('KK')
    expect(channelInitials('noir')).toBe('N')
    expect(channelInitials('Action & thrills')).toBe('AT')
    expect(channelInitials('Sci-fi & fantasy')).toBe('SF')
    expect(channelInitials('Family & animation')).toBe('FA')
    expect(channelInitials('80s & 90s')).toBe('80')
    expect(channelInitials('+ Ny – kanal!')).toBe('NK')
    expect(channelInitials('Åskväder')).toBe('Å')
    expect(channelInitials('&&')).toBe('')
  })
})

describe('standardkanalerna', () => {
  it('tio kanaler med fasta id, seeds och nummer 1–10 på språket', () => {
    const made = buildDefaultChannels([], 'sv', 5)
    expect(made.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(made.map((c) => c.name)).toEqual(['Bio dygnet runt', 'Serier i följd', 'Action & spänning', 'Komedi', '80- & 90-tal', 'Kvällsfilm', 'Efter midnatt', 'Sci-fi & fantasy', 'Familj & animerat', 'Drama'])
    expect(buildDefaultChannels([], 'en', 99)).toEqual(buildDefaultChannels([], 'en', 99))
    expect(made[0]!.seed).toBe(presetSeed('movies-247'))
    expect(made.every((c) => c.sources.length === 3 && c.showOnHome)).toBe(true)
    expect(ERA_RANGES['80s90s']).toEqual([1980, 1999])
  })

  it('läggs efter befintliga och hoppar över en kanal med samma regler', () => {
    const own = { ...createChannel({ ...emptyDraft(), name: 'Evening film', kind: 'movie', length: 'feature', airWindow: 'evenings', sources: ['debrid', 'library', 'watchlist'] }, [], 1, () => 0.1) }
    const made = buildDefaultChannels([own], 'sv', 5)
    expect(made).toHaveLength(9)
    expect(made.some((c) => c.name === 'Kvällsfilm')).toBe(false)
    expect(made[0]!.number).toBe(2)
    expect(buildDefaultChannels([own, ...made], 'sv', 6)).toEqual([])
  })
})
