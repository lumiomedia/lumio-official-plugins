import { channelKey, type M3uChannel } from '../live-tv-data'
import { qualityFromName, type LiveTvModel } from '../live-tv-model'
import type { TvSettings } from './tv-settings-store'
import type { LiveTvPlayerTvProps } from './tv-player-types'

/**
 * TV-kromets props, byggda ur modellen.
 *
 * Kromet (`tv/tv-player-chrome.tsx`) är spelarens ENDA krom sedan de ersatta
 * skrivbordsvyerna raderades. Propsen byggdes tidigare inline i TV-skalet, och
 * alla andra ytor — startsideöverstyrningen och rutnätet — öppnade spelaren
 * UTAN `tv` och fick därför den gamla skrivbordsgrenen. Den grenen finns inte
 * längre, så varje anropsställe måste bygga samma props: det är det byggaren
 * är till för.
 *
 * Det som skiljer ytorna är bara navigeringen. Skalet byter vy i sig självt
 * (`go('guide')`), medan startsidan och rutnätet navigerar in i bläddringssidan
 * (`onNavigate({ pageId: 'live-tv-browse', params: { view: 'guide' } })`).
 * Därför är kallbackarna parametrar och inte inbyggda.
 */
export function buildTvPlayerProps(args: {
  model: LiveTvModel
  settings: TvSettings
  channel: M3uChannel
  locale: string
  /** PIN-grinden (kanalbyte till en låst kanal) är öppen ovanpå spelaren. */
  gateOpen: boolean
  onOpenGuide: () => void
  onOpenMultiview: () => void
  onOpenChannelDetails: () => void
  onAddToMultiview: (channel: M3uChannel) => void
  onSwitchChannel: (channel: M3uChannel) => void
}): LiveTvPlayerTvProps {
  const { model, settings, channel, locale, gateOpen } = args
  return {
    channelNumber: model.channelNumber(channel),
    quality: qualityFromName(channel.name),
    favourite: model.pinnedSet.has(channelKey(channel)),
    bannerHideMs: settings.bannerHideMs,
    neighbours: model.channels,
    nowFor: model.nowFor,
    nowMs: model.nowMs,
    locale,
    gateOpen,
    onToggleFavourite: () => model.togglePin(channel),
    onOpenChannelDetails: args.onOpenChannelDetails,
    onOpenMultiview: args.onOpenMultiview,
    onOpenGuide: args.onOpenGuide,
    onAddToMultiview: args.onAddToMultiview,
    onSwitchChannel: args.onSwitchChannel,
  }
}
