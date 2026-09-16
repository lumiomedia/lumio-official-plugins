import { describe, expect, it, vi } from 'vitest'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { TvSettings } from './tv-settings-store'
import { buildTvPlayerProps } from './tv-player-props'

const ch = (name: string): M3uChannel => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const channels = [ch('A UHD'), ch('B'), ch('C')]
const nowMs = 1_700_000_000_000
const nowFor = () => ({ now: null, next: null, later: null })

function model(overrides: Partial<LiveTvModel> = {}): LiveTvModel {
  const togglePin = vi.fn()
  return {
    channels,
    channelNumber: (channel: M3uChannel) => channels.findIndex((c) => c.url === channel.url) + 1,
    pinnedSet: new Set<string>(),
    togglePin,
    nowFor,
    nowMs,
    ...overrides,
  } as unknown as LiveTvModel
}

const settings = { bannerHideMs: 4000, keepAwake: true, fullscreenOnRotate: false } as TvSettings

function build(args: Partial<Parameters<typeof buildTvPlayerProps>[0]> = {}) {
  return buildTvPlayerProps({
    model: model(),
    settings,
    channel: channels[0],
    locale: 'sv-SE',
    gateOpen: false,
    phone: false,
    onOpenGuide: vi.fn(),
    onOpenMultiview: vi.fn(),
    onOpenChannelDetails: vi.fn(),
    onAddToMultiview: vi.fn(),
    onSwitchChannel: vi.fn(),
    ...args,
  })
}

describe('buildTvPlayerProps', () => {
  it('ger samma props som TV-skalet byggde inline', () => {
    const props = build()
    expect(props.channelNumber).toBe(1)
    expect(props.quality).toBe('4K')
    expect(props.bannerHideMs).toBe(4000)
    expect(props.neighbours).toBe(channels)
    expect(props.nowFor).toBe(nowFor)
    expect(props.nowMs).toBe(nowMs)
    expect(props.locale).toBe('sv-SE')
  })

  it('favourite speglar pinnedSet', () => {
    expect(build().favourite).toBe(false)
    const pinned = model({ pinnedSet: new Set([channelKey(channels[0])]) })
    expect(build({ model: pinned }).favourite).toBe(true)
  })

  it('gateOpen går rakt igenom', () => {
    expect(build({ gateOpen: true }).gateOpen).toBe(true)
    expect(build({ gateOpen: false }).gateOpen).toBe(false)
  })

  it('phone går rakt igenom; keepAwake/fullscreenOnRotate läses ur inställningarna', () => {
    expect(build({ phone: true }).phone).toBe(true)
    expect(build({ phone: false }).phone).toBe(false)
    const props = build()
    expect(props.keepAwake).toBe(true)
    expect(props.fullscreenOnRotate).toBe(false)
  })

  it('onToggleFavourite pinnar den kanal som spelas', () => {
    const m = model()
    build({ model: m, channel: channels[1] }).onToggleFavourite()
    expect(m.togglePin).toHaveBeenCalledWith(channels[1])
  })

  it('navigeringskallbackarna kommer utifrån — ytan bestämmer vart de går', () => {
    const onOpenGuide = vi.fn()
    const onOpenMultiview = vi.fn()
    const onOpenChannelDetails = vi.fn()
    const props = build({ onOpenGuide, onOpenMultiview, onOpenChannelDetails })
    props.onOpenGuide()
    props.onOpenMultiview()
    props.onOpenChannelDetails()
    expect(onOpenGuide).toHaveBeenCalledTimes(1)
    expect(onOpenMultiview).toHaveBeenCalledTimes(1)
    expect(onOpenChannelDetails).toHaveBeenCalledTimes(1)
  })
})
