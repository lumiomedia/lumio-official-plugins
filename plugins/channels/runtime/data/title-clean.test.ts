import { describe, expect, it } from 'vitest'
import { cleanTitle, looksLikeEpisode } from './title-clean'

describe('titeltvätten', () => {
  it('tar bort spårnummer och skräpord', () => {
    expect(cleanTitle('03 Star Wars Episode VI Return of the Jedi')).toBe('Star Wars Episode VI Return of the Jedi')
    expect(cleanTitle('Avatar 4Kreescalado2160 pctmix1 com')).toBe('Avatar')
    expect(cleanTitle('3 - The Matrix')).toBe('The Matrix')
  })

  it('lämnar riktiga titlar', () => {
    for (const t of ['21 Jump Street', 'Blade Runner 2049', 'Se7en', '300', '1917', 'District 9', 'Apollo 13', 'WALL-E', '10 Things I Hate About You', '12 Angry Men']) {
      expect(cleanTitle(t)).toBe(t)
    }
  })

  it('känner igen avsnittsnamn', () => {
    expect(looksLikeEpisode('[Cifer] Sousou no Frieren S1 - 01 [BD')).toBe(true)
    expect(looksLikeEpisode('Carrie 1X1')).toBe(true)
    expect(looksLikeEpisode('Avatar')).toBe(false)
  })
})
