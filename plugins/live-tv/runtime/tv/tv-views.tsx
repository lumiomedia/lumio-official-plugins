'use client'

import type { ComponentType } from 'react'
import type { TvView, TvViewProps } from './tv-shell'
import { TvHub } from './tv-hub'
import { TvGuide } from './tv-guide'
import { TvFavourites } from './tv-favourites'
import { TvChannel } from './tv-channel'
import { TvSearch } from './tv-search'
import { TvMultiview } from './tv-multiview'
import { TvLibrary } from './tv-library'
import { TvSettingsView } from './tv-settings'

export const TV_VIEWS: Record<TvView, ComponentType<TvViewProps>> = {
  hub: TvHub,
  guide: TvGuide,
  favs: TvFavourites,
  channel: TvChannel,
  search: TvSearch,
  multi: TvMultiview,
  library: TvLibrary,
  settings: TvSettingsView,
}
