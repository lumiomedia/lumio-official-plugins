import { describe, it, expect } from 'vitest'
import { helixUrl, thumb } from './twitch-client'

describe('helixUrl', () => {
  it('builds a proxied path with defined params only', () => {
    expect(helixUrl('streams', { first: 20, game_id: undefined, after: 'cur' }))
      .toBe('/api/plugins/twitch/helix/streams?first=20&after=cur')
  })
  it('omits the query when no params', () => {
    expect(helixUrl('games/top')).toBe('/api/plugins/twitch/helix/games/top')
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
