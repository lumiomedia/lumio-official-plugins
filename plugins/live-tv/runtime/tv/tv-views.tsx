'use client'

import type { ComponentType } from 'react'
import type { TvView, TvViewProps } from './tv-shell'
import { dp, station, TV } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvHub } from './tv-hub'
import { TvGuide } from './tv-guide'
import { TvFavourites } from './tv-favourites'

/** Tillfällig vy tills den riktiga landar (Task 8–15 byter ut en post var). */
export function TvViewStub({ nav }: TvViewProps) {
  const { tt } = useTvText()
  return (
    <div style={{ padding: dp(48), color: TV.text, display: 'flex', flexDirection: 'column', gap: dp(20) }}>
      <div style={{ fontSize: dp(34), fontWeight: 600 }}>{nav.view}</div>
      <div {...station(() => nav.go('hub'), undefined, { 'data-init': '' })} style={{ alignSelf: 'flex-start', padding: `0 ${dp(22)}px`, height: dp(52), borderRadius: 999, background: TV.s12, display: 'inline-flex', alignItems: 'center', fontSize: dp(20) }}>
        {tt('railHome')}
      </div>
    </div>
  )
}

export const TV_VIEWS: Record<TvView, ComponentType<TvViewProps>> = {
  hub: TvHub,
  guide: TvGuide,
  favs: TvFavourites,
  channel: TvViewStub,
  search: TvViewStub,
  multi: TvViewStub,
  settings: TvViewStub,
}
