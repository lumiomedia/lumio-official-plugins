import { describe, it, expect, vi } from 'vitest'

// `@/…` pekar på appens träd och finns inte i pluginets testmiljö. Funktionerna
// här är rena, men modulen drar in lagringen som i sin tur drar in SDK:t.
vi.mock('@/lib/plugin-sdk', () => ({
  getScopedStorageItem: () => null,
  setScopedStorageItem: () => {},
  notifyAuthCapabilitiesChanged: () => {},
}))

import { helixUrl, thumb } from './twitch-client'

describe('helixUrl', () => {
  // Anropen går DIREKT till Twitch, inte via appens Rust-proxy. Proxyn bar
  // appens egna nycklar, och de saknas helt i Android-bootstrappen — där var
  // client_id hårdkodad till None, så Twitch kunde aldrig fungera på telefon
  // eller TV. Med användarens egen app-registrering behövs ingen proxy alls.
  it('builds an absolute Twitch Helix URL with defined params only', () => {
    expect(helixUrl('streams', { first: 20, game_id: undefined, after: 'cur' }))
      .toBe('https://api.twitch.tv/helix/streams?first=20&after=cur')
  })
  it('omits the query when no params', () => {
    expect(helixUrl('games/top')).toBe('https://api.twitch.tv/helix/games/top')
  })
})

describe('thumb', () => {
  it('fills width/height placeholders', () => {
    expect(thumb('https://x/{width}x{height}.jpg', 440, 248))
      .toBe('https://x/440x248.jpg')
  })

  it('fills the %{width}x%{height} form used by Helix /videos thumbnails', () => {
    expect(thumb('https://x/%{width}x%{height}.jpg', 440, 248))
      .toBe('https://x/440x248.jpg')
  })
})
