import { describe, expect, it } from 'vitest'
import { helpSections } from './help-content'
import { tvText } from './tv-strings'

/** Knapptexterna hjälpen hänvisar till, per språk, och nyckeln de kommer från. */
const LABELS: Array<[string, string]> = [
  ['addM3u', 'en'], ['addXtream', 'en'], ['createList', 'en'], ['mergeInto', 'en'], ['settingGroupOrder', 'en'],
  ['menuAddFavourite', 'en'], ['menuMoveUp', 'en'], ['menuMoveDown', 'en'], ['menuAddMultiview', 'en'],
  ['sportMatches', 'en'], ['sportEveningPlan', 'en'], ['epgShift', 'en'], ['tabEpg', 'en'], ['tabPlaylists', 'en'],
  ['addM3u', 'sv'], ['addXtream', 'sv'], ['createList', 'sv'], ['mergeInto', 'sv'], ['settingGroupOrder', 'sv'],
  ['menuAddFavourite', 'sv'], ['menuMoveUp', 'sv'], ['menuMoveDown', 'sv'], ['menuAddMultiview', 'sv'],
  ['sportMatches', 'sv'], ['epgShift', 'sv'], ['tabEpg', 'sv'], ['tabPlaylists', 'sv'],
]

describe('Så gör du', () => {
  it('hjälpen nämner knapparna med samma text som gränssnittet', () => {
    for (const [key, lang] of LABELS) {
      const label = tvText(lang, key as never).replace(/\s*\(\{n\}\)$/, '')
      const text = helpSections(lang).flatMap((s) => [s.title, ...s.steps]).join('\n')
      expect(text, `${lang}: ${key} = "${label}"`).toContain(label)
    }
  })
  it('samma avsnitt på båda språken; övriga språk får engelska', () => {
    expect(helpSections('sv').map((s) => s.id)).toEqual(helpSections('en').map((s) => s.id))
    expect(helpSections('de')).toBe(helpSections('en'))
  })
})
