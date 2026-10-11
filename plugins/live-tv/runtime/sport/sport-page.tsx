import { createElement } from 'react'
import type { BrowsePageProps } from '@/lib/plugin-sdk'
import { LIVE_TV_SPORT_PAGE_ID } from '../live-tv-shell'
import { LiveTvTvShell } from '../tv/tv-shell'

export const SPORT_PAGE_ID = LIVE_TV_SPORT_PAGE_ID

/*
  SPORT SOM EGEN SIDA.

  Inte en genväg in i Live TV utan Live TV:s skal i sportläge: samma
  inställningar (bakgrunder, kortens ton, vyval, följda lag, nycklar), samma
  rotstil och samma spelare — utan ikonraden och telefonens flikrad. Spelaren
  ägs av sidan, så en stängd match landar här igen. Se `sportOnly` i
  `tv/tv-shell.tsx`.
*/
export function LiveTvSportPage(props: BrowsePageProps) {
  return createElement(LiveTvTvShell, { ...props, sportOnly: true })
}
