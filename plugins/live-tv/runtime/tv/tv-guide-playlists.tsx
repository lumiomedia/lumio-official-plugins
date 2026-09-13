'use client'

import type { TvViewProps } from './tv-shell'
import { dp, station, TV } from './tv-ui'
import { useTvText } from './tv-strings'

/** Tillfällig vy tills den riktiga landar (Task 10 byter ut den). */
export function TvGuidePlaylists({ nav }: TvViewProps) {
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
