import { beforeEach, describe, expect, it } from 'vitest'
import { ensureVodChoiceMigrated, isVodItemIncluded, resetVodCategoryChoiceForTests, setVodCategoryChoice, vodCategoryKey, vodImportFilter } from './vod-category-filter'

beforeEach(() => resetVodCategoryChoiceForTests())

describe('vodImportFilter', () => {
  it('skickar ingenting före migreringen (okänt om källan är ny)', () => {
    expect(vodImportFilter('xtream://a/1')).toEqual({})
  })
  it('en ny källa efter migreringen hämtas i sin helhet — kategorierna väljs bort i efterhand', async () => {
    // Förut sköts hämtningen upp tills ett val gjorts, men valet går bara att
    // göra när källan finns i VOD-indexet: ett nytt konto fick aldrig film och
    // serier (Jerry 2026-11-09). Hela katalogen först, gallring sedan.
    await ensureVodChoiceMigrated(async () => [])
    expect(vodImportFilter('xtream://a/1')).toEqual({})
  })
  it('ett val med bortvalda kategorier skickar nycklarna', async () => {
    await ensureVodChoiceMigrated(async () => [])
    setVodCategoryChoice('xtream://a/1', [vodCategoryKey('2', 'MOVIE: B')])
    expect(vodImportFilter('xtream://a/1')).toEqual({ vodExcludedKeys: [vodCategoryKey('2', 'MOVIE: B')] })
  })
  it('allt med = som förut', async () => {
    await ensureVodChoiceMigrated(async () => [{ id: 'xtream://a/1' }])
    expect(vodImportFilter('xtream://a/1')).toEqual({})
  })
})

describe('isVodItemIncluded', () => {
  it('matchar på id OCH namn', () => {
    const excluded = new Set([vodCategoryKey('12', 'MOVIE: Adult')])
    expect(isVodItemIncluded({ categoryId: '12', categoryName: 'MOVIE: Adult' }, excluded)).toBe(false)
    expect(isVodItemIncluded({ categoryId: '12', categoryName: 'SERIES: Action' }, excluded)).toBe(true)
  })
})
