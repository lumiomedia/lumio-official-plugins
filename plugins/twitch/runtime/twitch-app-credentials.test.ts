import { beforeEach, describe, expect, it, vi } from 'vitest'

// SDK:t ersätts med en minnesversion: testerna kör i node, där varken
// window eller appens lagring finns.
const scoped = new Map<string, string>()
vi.mock('@/lib/plugin-sdk', () => ({
  getScopedStorageItem: (key: string) => scoped.get(key) ?? null,
  setScopedStorageItem: (key: string, value: string) => { scoped.set(key, value) },
  notifyAuthCapabilitiesChanged: () => {},
}))

import { getTwitchClientId, hasTwitchClientId, setTwitchClientId } from './twitch-app-credentials'

// Modulen är SSR-säkrad som resten av pluginets lagring (`typeof window`), och
// testerna kör i node — utan stubben läser varje getter som "ingen webbläsare".
beforeEach(() => {
  scoped.clear()
  vi.stubGlobal('window', {})
})

describe('twitch client id', () => {
  it('is empty before the user has registered an app', () => {
    expect(getTwitchClientId()).toBe('')
    expect(hasTwitchClientId()).toBe(false)
  })

  it('reads back what was saved', () => {
    setTwitchClientId('abc123')
    expect(getTwitchClientId()).toBe('abc123')
    expect(hasTwitchClientId()).toBe(true)
  })

  // Klistrar man in från dev.twitch.tv följer det ofta med blanksteg, och en
  // client_id med mellanslag ger 401 från Twitch utan att något i gränssnittet
  // förklarar varför.
  it('trims surrounding whitespace on save', () => {
    setTwitchClientId('  abc123\n')
    expect(getTwitchClientId()).toBe('abc123')
  })

  it('treats a blank value as not configured', () => {
    setTwitchClientId('   ')
    expect(hasTwitchClientId()).toBe(false)
  })
})
