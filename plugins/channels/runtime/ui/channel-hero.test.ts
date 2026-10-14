import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/plugin-sdk', () => ({ requestBrowseBack: () => {} }))
import { createChannel, emptyDraft } from '../model/channel'
import type { PoolItem } from '../data/pool'
import { heroImage } from './channel-hero'

const item = (ref: string, over: Partial<PoolItem> = {}): PoolItem => ({
  ref, title: ref, runtimeMin: 60, runtimeKnown: true, year: null, kind: 'movie', source: 'library', genres: [],
  play: { type: 'library', key: ref, mediaType: 'movie' }, ...over,
})
const ch = createChannel({ ...emptyDraft(), name: 'A' }, [], 1, () => 0.1)

describe('herons bild', () => {
  it('bakgrund, annars suddig affisch, annars närmaste program med bild', () => {
    const now = Date.now()
    const plain = [item('a'), item('b'), item('c', { backdropUrl: 'https://img/c.jpg' })]
    // Alla tre utan bild utom c: oavsett vilket som sänds blir resultatet c:s bild.
    expect(heroImage(plain, ch, now)).toEqual({ url: 'https://img/c.jpg', blur: false })
    const posters = [item('a', { posterUrl: 'https://img/p.jpg' })]
    expect(heroImage(posters, ch, now)).toEqual({ url: 'https://img/p.jpg', blur: true })
    expect(heroImage([item('a')], ch, now)).toBeNull()
    expect(heroImage([], ch, now)).toBeNull()
  })
})
