import type { LumioPlugin } from '@/lib/plugin-sdk'

export const MdblistPlugin: LumioPlugin = {
  id: 'com.lumio.mdblist',
  name: { en: 'MDBList', sv: 'MDBList' },
  version: '0.1.0',
  description: {
    en: 'Scrobble playback, sync watched titles and watchlists, and show MDBList lists as rows.',
    sv: 'Scrobbla uppspelning, synka sedda titlar och watchlist, och visa MDBList-listor som rader.',
  },
  preinstalled: true,
  register() {},
}
