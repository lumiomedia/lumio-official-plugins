/// Alla pluginets texter. Svenskan följer designhandoffen
/// (design_handoff_mdblist_tracking/README.md); engelskan speglar den.
export const S = {
  pluginName: { en: 'MDBList', sv: 'MDBList' },
  listSourceLabel: { en: 'MDBList list', sv: 'MDBList-lista' },
  description: {
    en: 'Scrobble playback, sync watched titles and watchlists, and show MDBList lists as rows.',
    sv: 'Scrobbla uppspelning, synka sedda titlar och watchlist, och visa MDBList-listor som rader.',
  },

  // Anslutning (enhetskod — ingen API-nyckel; den hör till betygen)
  connectedAs: { en: 'Connected as {name}', sv: 'Ansluten som {name}' },
  connected: { en: 'Connected', sv: 'Ansluten' },
  connectedBody: {
    en: 'Scrobble, watched titles and watchlist go through your account.',
    sv: 'Scrobble, sedda och watchlist går via ditt konto.',
  },
  badKey: { en: 'Login no longer valid', sv: 'Inloggningen gäller inte längre' },
  badKeyBody: {
    en: "MDBList no longer accepts the login. Sync is paused — connect again.",
    sv: 'MDBList godkänner inte längre inloggningen. Synken står still — anslut igen.',
  },
  notConnected: { en: 'Not connected', sv: 'Inte ansluten' },
  notConnectedBody: {
    en: 'Connect your MDBList account to send playback, watched titles and watchlist there.',
    sv: 'Anslut ditt MDBList-konto för att skicka uppspelning, sedda titlar och watchlist dit.',
  },
  offline: { en: "Couldn't reach MDBList", sv: 'Kunde inte nå MDBList' },
  checking: { en: 'Checking…', sv: 'Kontrollerar…' },
  badgeConnected: { en: 'CONNECTED', sv: 'ANSLUTEN' },
  badgeBadKey: { en: 'LOGGED OUT', sv: 'UTLOGGAD' },
  badgeNotConnected: { en: 'NOT CONNECTED', sv: 'EJ ANSLUTEN' },
  connect: { en: 'Connect with MDBList', sv: 'Anslut med MDBList' },
  disconnect: { en: 'Disconnect', sv: 'Koppla från' },

  // Enhetskoden
  deviceTitle: { en: 'Connect MDBList', sv: 'Anslut MDBList' },
  deviceIntro: {
    en: 'Scan the code with your phone, or go to the address and enter the code. Approve on mdblist.com.',
    sv: 'Skanna koden med telefonen, eller gå till adressen och skriv in koden. Godkänn på mdblist.com.',
  },
  deviceScanHint: {
    en: 'Scan, or go to mdblist.com/oauth/device',
    sv: 'Skanna, eller gå till mdblist.com/oauth/device',
  },
  deviceCode: { en: 'Code', sv: 'Kod' },
  deviceWaiting: { en: 'Waiting for approval · closes in {time}', sv: 'Väntar på godkännande · stängs om {time}' },
  deviceChecking: { en: 'Checking who approved…', sv: 'Frågar MDBList vem som godkände…' },
  deviceExpired: { en: 'The code has expired', sv: 'Koden har gått ut' },
  deviceDenied: { en: 'The connection was declined', sv: 'Anslutningen nekades' },
  deviceError: { en: "Couldn't start the connection", sv: 'Kunde inte starta anslutningen' },
  deviceNewCode: { en: 'Show a new code', sv: 'Visa ny kod' },
  cancel: { en: 'Cancel', sv: 'Avbryt' },

  // API-nyckeln

  // Vad som synkas
  whatSyncs: { en: 'WHAT SYNCS', sv: 'VAD SOM SYNKAS' },
  connectFirst: {
    en: 'Connect MDBList under Accounts to choose what syncs.',
    sv: 'Anslut MDBList under Konton för att välja vad som synkas.',
  },
  scrobble: { en: 'Scrobble playback', sv: 'Scrobbla uppspelning' },
  scrobbleHint: {
    en: 'Start, pause and stop are sent to MDBList while you watch — the same moments as for Trakt.',
    sv: 'Start, paus och stopp skickas till MDBList medan du tittar, samma tillfällen som för Trakt.',
  },
  scrobbleHintTv: { en: 'Start, pause and stop are sent to MDBList.', sv: 'Start, paus och stopp skickas till MDBList.' },
  syncWatched: { en: 'Sync watched', sv: 'Synka sedda' },
  syncWatchedHint: {
    en: 'Watched movies and episodes are merged both ways. A title is only unmarked on MDBList when you unmark it here.',
    sv: 'Sedda filmer och avsnitt slås ihop åt båda hållen. En titel avmarkeras på MDBList bara när du avmarkerar den här.',
  },
  syncWatchedHintTv: { en: 'Watched movies and episodes are merged both ways.', sv: 'Sedda filmer och avsnitt slås ihop åt båda hållen.' },
  syncWatchlist: { en: 'Sync watchlist', sv: 'Synka watchlist' },
  syncWatchlistHint: {
    en: 'Followed series and the movie watchlist are kept the same in Lumio and on MDBList.',
    sv: 'Följda serier och filmwatchlisten hålls lika i Lumio och på MDBList.',
  },
  syncWatchlistHintTv: { en: 'Followed series and the movie watchlist are kept the same.', sv: 'Följda serier och filmwatchlisten hålls lika.' },

  // Synkstatus
  lastSync: { en: 'Last synced {time} · {changes}', sv: 'Senast synkad {time} · {changes}' },
  changesNone: { en: 'no changes', sv: 'inga ändringar' },
  changesOne: { en: '1 change', sv: '1 ändring' },
  changesMany: { en: '{n} changes', sv: '{n} ändringar' },
  neverSynced: { en: 'Not synced yet', sv: 'Inte synkad än' },
  syncingLong: { en: 'Syncing with MDBList…', sv: 'Synkar med MDBList…' },
  syncing: { en: 'Syncing…', sv: 'Synkar…' },
  syncAuto: {
    en: 'Syncs on its own every 15 minutes and when you change a toggle.',
    sv: 'Synkar av sig själv var 15:e minut och när du ändrar ett reglage.',
  },
  syncNow: { en: 'Sync now', sv: 'Synka nu' },
  pausedUntil: {
    en: 'Paused until {time} — MDBList limits how often apps may call it',
    sv: 'Pausat till {time}, MDBList begränsar antalet anrop',
  },
  pausedBody: {
    en: 'Lumio sends nothing to MDBList until the pause is over. Scrobble and sync then resume on their own.',
    sv: 'Lumio skickar inget till MDBList förrän pausen är slut. Scrobble och synk fortsätter sedan av sig själva.',
  },
  traktTip: {
    en: "If Trakt sync is on at mdblist.com you don't need to turn on the same thing here — it gives double plays in Trakt.",
    sv: 'Har du Trakt-synk påslagen på mdblist.com behöver du inte slå på samma sak här, det ger dubbla visningar i Trakt.',
  },

  // TV
  tvAccount: { en: 'Account', sv: 'Konto' },
  tvIntro: {
    en: 'How Lumio and MDBList exchange playback, watched titles and watchlist.',
    sv: 'Hur Lumio och MDBList utbyter uppspelning, sedda titlar och watchlist.',
  },
  tvConnectHint: {
    en: 'Shows a code and a QR code. Approve on mdblist.com.',
    sv: 'Visar en kod och en QR-kod. Godkänn på mdblist.com.',
  },
  tvConnectedHint: {
    en: 'Follows along to your other devices via sync.',
    sv: 'Följer med till dina andra enheter via synken.',
  },
} as const

export type StringKey = keyof typeof S
export type Text = { en: string; sv: string }

export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

/** Fyller samma platshållare på båda språken. */
export function fillBoth(text: Text, values: Record<string, string | number>): Text {
  return { en: fill(text.en, values), sv: fill(text.sv, values) }
}
