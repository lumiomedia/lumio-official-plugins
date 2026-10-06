/// Alla pluginets texter. Samma upplägg som MDBList-pluginet (designhandoffen
/// för MDBList gäller även här), med SIMKL:s statuslistor och trendande.
export const S = {
  pluginName: { en: 'SIMKL', sv: 'SIMKL' },
  listSourceLabel: { en: 'SIMKL list', sv: 'SIMKL-lista' },
  description: {
    en: 'Scrobble playback, sync watched titles and your watchlist with SIMKL, and show SIMKL lists as rows.',
    sv: 'Scrobbla uppspelning, synka sedda titlar och watchlist med SIMKL, och visa SIMKL-listor som rader.',
  },

  // Anslutning (enhetskod, per enhet)
  connectedAs: { en: 'Connected as {name}', sv: 'Ansluten som {name}' },
  connected: { en: 'Connected', sv: 'Ansluten' },
  connectedBody: {
    en: 'Scrobble, watched titles and watchlist go through your account. Each device connects on its own.',
    sv: 'Scrobble, sedda och watchlist går via ditt konto. Varje enhet ansluter för sig.',
  },
  badKey: { en: 'Login no longer valid', sv: 'Inloggningen gäller inte längre' },
  badKeyBody: {
    en: 'SIMKL no longer accepts the login. Sync is paused — connect again.',
    sv: 'SIMKL godkänner inte längre inloggningen. Synken står still — anslut igen.',
  },
  readOnly: {
    en: 'SIMKL only granted read access. Connect again and allow changes.',
    sv: 'SIMKL gav bara läsrättighet. Anslut igen och tillåt ändringar.',
  },
  notConnected: { en: 'Not connected', sv: 'Inte ansluten' },
  notConnectedBody: {
    en: 'Connect your SIMKL account to send playback, watched titles and watchlist there.',
    sv: 'Anslut ditt SIMKL-konto för att skicka uppspelning, sedda titlar och watchlist dit.',
  },
  offline: { en: "Couldn't reach SIMKL", sv: 'Kunde inte nå SIMKL' },
  checking: { en: 'Checking…', sv: 'Kontrollerar…' },
  badgeConnected: { en: 'CONNECTED', sv: 'ANSLUTEN' },
  badgeBadKey: { en: 'LOGGED OUT', sv: 'UTLOGGAD' },
  badgeNotConnected: { en: 'NOT CONNECTED', sv: 'EJ ANSLUTEN' },
  connect: { en: 'Connect with SIMKL', sv: 'Anslut med SIMKL' },
  disconnect: { en: 'Disconnect', sv: 'Koppla från' },
  onboardingConnected: {
    en: 'Connected. Your history and watchlist sync as soon as you finish setup.',
    sv: 'Ansluten. Historik och watchlist synkas direkt när du är klar med guiden.',
  },
  onboardingHint: {
    en: 'Scrobble playback and sync watched titles and your watchlist with SIMKL — movies, series and anime.',
    sv: 'Scrobbla uppspelning och synka sedda titlar och watchlist med SIMKL — filmer, serier och anime.',
  },

  // Enhetskoden
  deviceIntro: {
    en: 'Scan the code with your phone, or go to the address and enter the code. Approve on simkl.com.',
    sv: 'Skanna koden med telefonen, eller gå till adressen och skriv in koden. Godkänn på simkl.com.',
  },
  deviceScanHint: { en: 'Scan, or go to simkl.com/pin', sv: 'Skanna, eller gå till simkl.com/pin' },
  deviceCode: { en: 'Code', sv: 'Kod' },
  deviceWaiting: { en: 'Waiting for approval · closes in {time}', sv: 'Väntar på godkännande · stängs om {time}' },
  deviceChecking: { en: 'Checking who approved…', sv: 'Frågar SIMKL vem som godkände…' },
  deviceExpired: { en: 'The code has expired', sv: 'Koden har gått ut' },
  deviceDenied: { en: 'The connection was declined', sv: 'Anslutningen nekades' },
  deviceError: { en: "Couldn't start the connection", sv: 'Kunde inte starta anslutningen' },
  deviceNewCode: { en: 'Show a new code', sv: 'Visa ny kod' },
  cancel: { en: 'Cancel', sv: 'Avbryt' },

  // Vad som synkas
  whatSyncs: { en: 'WHAT SYNCS', sv: 'VAD SOM SYNKAS' },
  connectFirst: {
    en: 'Connect SIMKL under Accounts to choose what syncs.',
    sv: 'Anslut SIMKL under Konton för att välja vad som synkas.',
  },
  scrobble: { en: 'Scrobble playback', sv: 'Scrobbla uppspelning' },
  scrobbleHint: {
    en: 'Start, pause and stop are sent to SIMKL when you press them. Finishing 80 % marks it watched.',
    sv: 'Start, paus och stopp skickas till SIMKL när du trycker. Slutar du efter 80 % markeras titeln sedd.',
  },
  scrobbleHintTv: { en: 'Start, pause and stop are sent to SIMKL.', sv: 'Start, paus och stopp skickas till SIMKL.' },
  syncWatched: { en: 'Sync watched', sv: 'Synka sedda' },
  syncWatchedHint: {
    en: 'Watched movies and episodes are merged both ways. A title is only unmarked on SIMKL when you unmark it here.',
    sv: 'Sedda filmer och avsnitt slås ihop åt båda hållen. En titel avmarkeras på SIMKL bara när du avmarkerar den här.',
  },
  syncWatchedHintTv: { en: 'Watched movies and episodes are merged both ways.', sv: 'Sedda filmer och avsnitt slås ihop åt båda hållen.' },
  syncWatchlist: { en: 'Sync watchlist', sv: 'Synka watchlist' },
  syncWatchlistHint: {
    en: 'Followed series are "Watching" or "Plan to watch" on SIMKL, the movie watchlist is "Plan to watch". Unfollowing moves a series to "Dropped".',
    sv: 'Följda serier är "Tittar på" eller "Planerar att se" på SIMKL, filmwatchlisten är "Planerar att se". Slutar du följa flyttas serien till "Avbrutna".',
  },
  syncWatchlistHintTv: { en: 'Followed series and the movie watchlist are kept the same.', sv: 'Följda serier och filmwatchlisten hålls lika.' },

  // Synkstatus
  lastSync: { en: 'Last synced {time} · {changes}', sv: 'Senast synkad {time} · {changes}' },
  changesNone: { en: 'no changes', sv: 'inga ändringar' },
  changesOne: { en: '1 change', sv: '1 ändring' },
  changesMany: { en: '{n} changes', sv: '{n} ändringar' },
  neverSynced: { en: 'Not synced yet', sv: 'Inte synkad än' },
  syncingLong: { en: 'Syncing with SIMKL…', sv: 'Synkar med SIMKL…' },
  syncing: { en: 'Syncing…', sv: 'Synkar…' },
  syncAuto: {
    en: 'Syncs on its own every 15 minutes and when you change a toggle.',
    sv: 'Synkar av sig själv var 15:e minut och när du ändrar ett reglage.',
  },
  syncNow: { en: 'Sync now', sv: 'Synka nu' },
  pausedUntil: {
    en: 'Paused until {time} — SIMKL limits how often apps may call it',
    sv: 'Pausat till {time}, SIMKL begränsar antalet anrop',
  },
  pausedBody: {
    en: 'Lumio sends nothing to SIMKL until the pause is over. Scrobble and sync then resume on their own.',
    sv: 'Lumio skickar inget till SIMKL förrän pausen är slut. Scrobble och synk fortsätter sedan av sig själva.',
  },
  quotaLow: {
    en: "Today's SIMKL quota is nearly used up — sync resumes tomorrow.",
    sv: 'Dagens SIMKL-kvot är nästan slut — synken fortsätter i morgon.',
  },
  traktTip: {
    en: "If SIMKL already syncs with Trakt on simkl.com you don't need to turn on the same thing here — it gives double plays in Trakt.",
    sv: 'Synkar SIMKL redan med Trakt på simkl.com behöver du inte slå på samma sak här, det ger dubbla visningar i Trakt.',
  },

  // Listor
  groupMine: { en: 'My lists', sv: 'Mina listor' },
  groupTrending: { en: 'Trending on Simkl', sv: 'Trendande på Simkl' },
  statusWatching: { en: 'Watching', sv: 'Tittar på' },
  statusPlantowatch: { en: 'Plan to watch', sv: 'Planerar att se' },
  statusCompleted: { en: 'Completed', sv: 'Klara' },
  statusHold: { en: 'On hold', sv: 'Pausade' },
  statusDropped: { en: 'Dropped', sv: 'Avbrutna' },
  typeMovies: { en: 'Movies', sv: 'Filmer' },
  typeShows: { en: 'Series', sv: 'Serier' },
  typeAnime: { en: 'Anime', sv: 'Anime' },
  periodToday: { en: 'Today', sv: 'Idag' },
  periodWeek: { en: 'This week', sv: 'Veckan' },
  periodMonth: { en: 'This month', sv: 'Månaden' },

  // TV
  tvAccount: { en: 'Account', sv: 'Konto' },
  tvConnectHint: {
    en: 'Shows a code and a QR code. Approve on simkl.com.',
    sv: 'Visar en kod och en QR-kod. Godkänn på simkl.com.',
  },
  tvConnectedHint: {
    en: 'This device is connected. Other devices connect on their own.',
    sv: 'Den här enheten är ansluten. Andra enheter ansluter för sig.',
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
