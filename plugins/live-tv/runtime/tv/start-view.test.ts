import { describe, expect, it } from 'vitest'
import { DEFAULT_START_VIEW, START_VIEWS, nextStartView, resolveStartView, sanitizeStartView, startRootView, startViewLabelKey } from './start-view'

describe('startvyn', () => {
  it('Hem är standard, okända värden faller tillbaka dit', () => {
    expect(DEFAULT_START_VIEW).toBe('home')
    expect(sanitizeStartView(undefined)).toBe('home')
    expect(sanitizeStartView('multi')).toBe('home')
    expect(sanitizeStartView('sport')).toBe('sport')
  })
  it('valen följer rälsen, utan multivy', () => {
    expect([...START_VIEWS]).toEqual(['home', 'hub', 'guide', 'sport', 'library', 'favs'])
  })
  it('OK växlar runt', () => {
    expect(nextStartView('home')).toBe('hub')
    expect(nextStartView('favs')).toBe('home')
  })
  it('dold VOD: Hem och Bibliotek blir Kanaler', () => {
    expect(resolveStartView('home', true)).toBe('hub')
    expect(resolveStartView('library', true)).toBe('hub')
    expect(resolveStartView('sport', true)).toBe('sport')
    expect(resolveStartView('home', false)).toBe('home')
  })
  it('rotvyn: Hem har Kanaler som reserv', () => {
    expect(startRootView('home', false)).toBe('hub')
    expect(startRootView('guide', false)).toBe('guide')
  })
  it('etiketterna är rälsens nycklar', () => {
    expect(startViewLabelKey('hub')).toBe('railChannels')
    expect(startViewLabelKey('favs')).toBe('railFavourites')
  })
})
