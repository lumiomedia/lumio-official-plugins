import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { __resetForTests } from '@/lib/plugin-sdk'
import type { M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'

/**
 * Förhandsrutan i guidens hero får inte starta en ström medan spelaren är
 * öppen: heron byter kanal 300 ms efter OK, och en andra ström på samma
 * Xtream-konto (ofta en anslutning) fällde spelaren — "valde en kanal, den
 * spelade ej" (Jerry 2026-10-30).
 */
const previewProps = vi.hoisted(() => [] as Array<{ enabled: boolean }>)
vi.mock('./live-preview-art', () => ({
  LivePreviewArt: (p: { enabled: boolean }) => { previewProps.push(p); return null },
}))
import { GuideHero } from './guide-hero'

const now = Date.now()
const channel: M3uChannel = { name: 'TV4 HD', logo: null, group: 'Underhållning', url: 'http://x/tv4', tvgId: 'tv4' }
const live = { title: 'Silo', start: now - 60_000, stop: now + 60_000 }
const model = { nowMs: now, channelNumber: () => 1, nowFor: () => ({ now: live, next: null, later: null }) } as unknown as LiveTvModel
const hero = (playerOpen: boolean) => render(<GuideHero sel={{ channel, programme: live }} model={model} nav={{ play: vi.fn(), playerOpen } as unknown as TvNav} mode="now" onMode={() => {}} tint={false} background="slate" sourceLabel="" onOpenSource={() => {}} isTv />)

beforeEach(() => { __resetForTests(); previewProps.length = 0 })
afterEach(cleanup)

describe('guidens förhandsruta och spelaren', () => {
  it('spelar när spelaren är stängd', () => {
    hero(false)
    expect(previewProps.at(-1)?.enabled).toBe(true)
  })
  it('startar ingen ström medan spelaren är öppen', () => {
    hero(true)
    expect(previewProps.at(-1)?.enabled).toBe(false)
  })
})
