import type { LumioPlugin } from '@/lib/plugin-sdk'
import { S } from './strings'
import { ChannelsBootstrap } from './ui/bootstrap'
import { ChannelsHomeRow } from './ui/home-row'
import { ChannelsPage } from './ui/channels-page'
import { channelsSettingsSection } from './ui/settings-section'
import { CHANNELS_PAGE_ID } from './ui/guide-layout'

export const ChannelsPlugin: LumioPlugin = {
  id: 'com.lumio.channels',
  name: S.pluginName,
  version: '0.1.17',
  description: S.description,
  preinstalled: false,
  register(ctx) {
    ctx.registerBrowsePage({ id: CHANNELS_PAGE_ID, label: S.menuLabel, Page: ChannelsPage, hideHero: true, keepsTvTopChrome: true })
    // Menyvalet och sidan delar id: värdens menyer gör nyckeln till sidans id.
    ctx.registerMainMenuItem({ id: CHANNELS_PAGE_ID, label: S.menuLabel, target: { pageId: CHANNELS_PAGE_ID }, defaultEnabled: true })
    ctx.registerHomeRow({ id: 'channels-now', title: S.homeRowTitle, showOnHome: true, Row: ChannelsHomeRow })
    // Äldre värdar saknar registerHomeSource: raden fungerar då bara som standardrad.
    ctx.registerHomeSource?.({ id: 'channels-now', label: S.homeRowTitle, rowId: 'channels-now' })
    ctx.registerSettingsSection(channelsSettingsSection)
    // Standardkanalerna vid uppstart (äldre värdar utan bootstrap: när sidan öppnas).
    ctx.registerBootstrap?.({ id: 'channels-defaults', Mount: ChannelsBootstrap })
  },
}

export default ChannelsPlugin
