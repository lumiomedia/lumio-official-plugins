import { describe, it, expect } from 'vitest'
import { embedUrl } from './twitch-player'

describe('embedUrl', () => {
  it('builds a live channel embed with parents', () => {
    expect(embedUrl('live', 'shroud', ['127.0.0.1', 'localhost']))
      .toBe('https://player.twitch.tv/?channel=shroud&parent=127.0.0.1&parent=localhost')
  })
  it('builds a vod embed', () => {
    expect(embedUrl('vod', '12345', ['127.0.0.1']))
      .toBe('https://player.twitch.tv/?video=12345&parent=127.0.0.1')
  })
  it('builds a clip embed', () => {
    expect(embedUrl('clip', 'FunnyClip', ['127.0.0.1']))
      .toBe('https://clips.twitch.tv/embed?clip=FunnyClip&parent=127.0.0.1')
  })
})
