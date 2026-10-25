/// Alla pluginets texter. Samma upplägg som MDBList-pluginet (designhandoffen
/// för MDBList gäller även här), med SIMKL:s statuslistor och trendande.
export const S = {
  pluginName: {
    en: 'SIMKL',
    sv: 'SIMKL',
    de: 'SIMKL',
    fr: 'SIMKL',
    es: 'SIMKL',
  },
  listSourceLabel: {
    en: 'SIMKL list',
    sv: 'SIMKL-lista',
    de: 'SIMKL-Liste',
    fr: 'Liste SIMKL',
    es: 'Lista de SIMKL',
  },
  description: {
    en: 'Scrobble playback, sync watched titles and your watchlist with SIMKL, and show SIMKL lists as rows.',
    sv: 'Scrobbla uppspelning, synka sedda titlar och watchlist med SIMKL, och visa SIMKL-listor som rader.',
    de: 'Wiedergabe scrobbeln, Gesehenes und Merkliste mit SIMKL synchronisieren und SIMKL-Listen als Reihen anzeigen.',
    fr: 'Scrobblez la lecture, synchronisez les titres vus et Ma liste avec SIMKL, et affichez les listes SIMKL sous forme de rangées.',
    es: 'Registra la reproducción, sincroniza los títulos vistos y tu lista con SIMKL, y muestra las listas de SIMKL como filas.',
  },

  // Anslutning (enhetskod, per enhet)
  connectedAs: {
    en: 'Connected as {name}',
    sv: 'Ansluten som {name}',
    de: 'Verbunden als {name}',
    fr: 'Connecté en tant que {name}',
    es: 'Conectado como {name}',
  },
  connected: {
    en: 'Connected',
    sv: 'Ansluten',
    de: 'Verbunden',
    fr: 'Connecté',
    es: 'Conectado',
  },
  connectedBody: {
    en: 'Scrobble, watched titles and watchlist go through your account. Each device connects on its own.',
    sv: 'Scrobble, sedda och watchlist går via ditt konto. Varje enhet ansluter för sig.',
    de: 'Scrobbeln, Gesehenes und Merkliste laufen über dein Konto. Jedes Gerät verbindet sich einzeln.',
    fr: 'Le scrobble, les titres vus et Ma liste passent par votre compte. Chaque appareil se connecte séparément.',
    es: 'El scrobble, los vistos y tu lista pasan por tu cuenta. Cada dispositivo se conecta por separado.',
  },
  badKey: {
    en: 'Login no longer valid',
    sv: 'Inloggningen gäller inte längre',
    de: 'Anmeldung nicht mehr gültig',
    fr: 'Connexion plus valide',
    es: 'Inicio de sesión no válido',
  },
  badKeyBody: {
    en: 'SIMKL no longer accepts the login. Sync is paused — connect again.',
    sv: 'SIMKL godkänner inte längre inloggningen. Synken står still — anslut igen.',
    de: 'SIMKL akzeptiert die Anmeldung nicht mehr. Die Synchronisierung ist pausiert — verbinde dich erneut.',
    fr: 'SIMKL n’accepte plus la connexion. La synchro est en pause — reconnectez-vous.',
    es: 'SIMKL ya no acepta el inicio de sesión. La sincronización está en pausa: vuelve a conectar.',
  },
  readOnly: {
    en: 'SIMKL only granted read access. Connect again and allow changes.',
    sv: 'SIMKL gav bara läsrättighet. Anslut igen och tillåt ändringar.',
    de: 'SIMKL hat nur Lesezugriff erteilt. Verbinde dich erneut und erlaube Änderungen.',
    fr: 'SIMKL n’a accordé qu’un accès en lecture. Reconnectez-vous et autorisez les modifications.',
    es: 'SIMKL solo concedió acceso de lectura. Vuelve a conectar y permite los cambios.',
  },
  notConnected: {
    en: 'Not connected',
    sv: 'Inte ansluten',
    de: 'Nicht verbunden',
    fr: 'Non connecté',
    es: 'No conectado',
  },
  notConnectedBody: {
    en: 'Connect your SIMKL account to send playback, watched titles and watchlist there.',
    sv: 'Anslut ditt SIMKL-konto för att skicka uppspelning, sedda titlar och watchlist dit.',
    de: 'Verbinde dein SIMKL-Konto, um Wiedergabe, Gesehenes und Merkliste dorthin zu senden.',
    fr: 'Connectez votre compte SIMKL pour y envoyer la lecture, les titres vus et Ma liste.',
    es: 'Conecta tu cuenta de SIMKL para enviar allí la reproducción, los vistos y tu lista.',
  },
  offline: {
    en: 'Couldn\'t reach SIMKL',
    sv: 'Kunde inte nå SIMKL',
    de: 'SIMKL nicht erreichbar',
    fr: 'SIMKL est injoignable',
    es: 'No se pudo conectar con SIMKL',
  },
  checking: {
    en: 'Checking…',
    sv: 'Kontrollerar…',
    de: 'Wird geprüft…',
    fr: 'Vérification…',
    es: 'Comprobando…',
  },
  badgeConnected: {
    en: 'CONNECTED',
    sv: 'ANSLUTEN',
    de: 'VERBUNDEN',
    fr: 'CONNECTÉ',
    es: 'CONECTADO',
  },
  badgeBadKey: {
    en: 'LOGGED OUT',
    sv: 'UTLOGGAD',
    de: 'ABGEMELDET',
    fr: 'DÉCONNECTÉ',
    es: 'SESIÓN CERRADA',
  },
  badgeNotConnected: {
    en: 'NOT CONNECTED',
    sv: 'EJ ANSLUTEN',
    de: 'NICHT VERBUNDEN',
    fr: 'NON CONNECTÉ',
    es: 'NO CONECTADO',
  },
  connect: {
    en: 'Connect with SIMKL',
    sv: 'Anslut med SIMKL',
    de: 'Mit SIMKL verbinden',
    fr: 'Se connecter à SIMKL',
    es: 'Conectar con SIMKL',
  },
  disconnect: {
    en: 'Disconnect',
    sv: 'Koppla från',
    de: 'Trennen',
    fr: 'Déconnecter',
    es: 'Desconectar',
  },
  onboardingConnected: {
    en: 'Connected. Your history and watchlist sync as soon as you finish setup.',
    sv: 'Ansluten. Historik och watchlist synkas direkt när du är klar med guiden.',
    de: 'Verbunden. Dein Verlauf und deine Merkliste werden synchronisiert, sobald du die Einrichtung abgeschlossen hast.',
    fr: 'Connecté. Votre historique et Ma liste se synchronisent dès que la configuration est terminée.',
    es: 'Conectado. Tu historial y tu lista se sincronizan en cuanto termines la configuración.',
  },
  onboardingHint: {
    en: 'Scrobble playback and sync watched titles and your watchlist with SIMKL — movies, series and anime.',
    sv: 'Scrobbla uppspelning och synka sedda titlar och watchlist med SIMKL — filmer, serier och anime.',
    de: 'Wiedergabe scrobbeln und Gesehenes sowie deine Merkliste mit SIMKL synchronisieren — Filme, Serien und Anime.',
    fr: 'Scrobblez la lecture et synchronisez les titres vus et Ma liste avec SIMKL : films, séries et animes.',
    es: 'Registra la reproducción y sincroniza los títulos vistos y tu lista con SIMKL: películas, series y anime.',
  },

  // Enhetskoden
  deviceIntro: {
    en: 'Scan the code with your phone, or go to the address and enter the code. Approve on simkl.com.',
    sv: 'Skanna koden med telefonen, eller gå till adressen och skriv in koden. Godkänn på simkl.com.',
    de: 'Scanne den Code mit deinem Handy oder öffne die Adresse und gib den Code ein. Bestätige auf simkl.com.',
    fr: 'Scannez le code avec votre téléphone, ou ouvrez l’adresse et saisissez le code. Validez sur simkl.com.',
    es: 'Escanea el código con el móvil, o ve a la dirección e introduce el código. Aprueba en simkl.com.',
  },
  deviceScanHint: {
    en: 'Scan, or go to simkl.com/pin',
    sv: 'Skanna, eller gå till simkl.com/pin',
    de: 'Scannen oder simkl.com/pin öffnen',
    fr: 'Scannez, ou ouvrez simkl.com/pin',
    es: 'Escanea, o ve a simkl.com/pin',
  },
  deviceCode: {
    en: 'Code',
    sv: 'Kod',
    de: 'Code',
    fr: 'Code',
    es: 'Código',
  },
  deviceWaiting: {
    en: 'Waiting for approval · closes in {time}',
    sv: 'Väntar på godkännande · stängs om {time}',
    de: 'Warte auf Bestätigung · läuft ab in {time}',
    fr: 'En attente de validation · expire dans {time}',
    es: 'Esperando aprobación · caduca en {time}',
  },
  deviceChecking: {
    en: 'Checking who approved…',
    sv: 'Frågar SIMKL vem som godkände…',
    de: 'Prüfe, wer bestätigt hat…',
    fr: 'Vérification de l’autorisation…',
    es: 'Comprobando quién ha aprobado…',
  },
  deviceExpired: {
    en: 'The code has expired',
    sv: 'Koden har gått ut',
    de: 'Der Code ist abgelaufen',
    fr: 'Le code a expiré',
    es: 'El código ha caducado',
  },
  deviceDenied: {
    en: 'The connection was declined',
    sv: 'Anslutningen nekades',
    de: 'Die Verbindung wurde abgelehnt',
    fr: 'La connexion a été refusée',
    es: 'Se rechazó la conexión',
  },
  deviceError: {
    en: 'Couldn\'t start the connection',
    sv: 'Kunde inte starta anslutningen',
    de: 'Verbindung konnte nicht gestartet werden',
    fr: 'Impossible de lancer la connexion',
    es: 'No se pudo iniciar la conexión',
  },
  deviceNewCode: {
    en: 'Show a new code',
    sv: 'Visa ny kod',
    de: 'Neuen Code anzeigen',
    fr: 'Afficher un nouveau code',
    es: 'Mostrar código nuevo',
  },
  cancel: {
    en: 'Cancel',
    sv: 'Avbryt',
    de: 'Abbrechen',
    fr: 'Annuler',
    es: 'Cancelar',
  },

  // Vad som synkas
  whatSyncs: {
    en: 'WHAT SYNCS',
    sv: 'VAD SOM SYNKAS',
    de: 'WAS SYNCHRONISIERT WIRD',
    fr: 'CE QUI EST SYNCHRONISÉ',
    es: 'QUÉ SE SINCRONIZA',
  },
  connectFirst: {
    en: 'Connect SIMKL under Accounts to choose what syncs.',
    sv: 'Anslut SIMKL under Konton för att välja vad som synkas.',
    de: 'Verbinde SIMKL unter Konten, um auszuwählen, was synchronisiert wird.',
    fr: 'Connectez SIMKL dans Comptes pour choisir ce qui est synchronisé.',
    es: 'Conecta SIMKL en Cuentas para elegir qué se sincroniza.',
  },
  scrobble: {
    en: 'Scrobble playback',
    sv: 'Scrobbla uppspelning',
    de: 'Wiedergabe scrobbeln',
    fr: 'Scrobbler la lecture',
    es: 'Registrar reproducción (scrobble)',
  },
  scrobbleHint: {
    en: 'Start, pause and stop are sent to SIMKL when you press them. Finishing 80 % marks it watched.',
    sv: 'Start, paus och stopp skickas till SIMKL när du trycker. Slutar du efter 80 % markeras titeln sedd.',
    de: 'Start, Pause und Stopp werden beim Drücken an SIMKL gesendet. Bei 80 % gilt der Titel als gesehen.',
    fr: 'Lecture, pause et arrêt sont envoyés à SIMKL quand vous appuyez. À 80 %, le titre est marqué comme vu.',
    es: 'El inicio, la pausa y la parada se envían a SIMKL al pulsarlos. Al llegar al 80 % el título se marca como visto.',
  },
  scrobbleHintTv: {
    en: 'Start, pause and stop are sent to SIMKL.',
    sv: 'Start, paus och stopp skickas till SIMKL.',
    de: 'Start, Pause und Stopp werden an SIMKL gesendet.',
    fr: 'Lecture, pause et arrêt sont envoyés à SIMKL.',
    es: 'El inicio, la pausa y la parada se envían a SIMKL.',
  },
  syncWatched: {
    en: 'Sync watched',
    sv: 'Synka sedda',
    de: 'Gesehenes synchronisieren',
    fr: 'Synchroniser les vus',
    es: 'Sincronizar vistos',
  },
  syncWatchedHint: {
    en: 'Watched movies and episodes are merged both ways. A title is only unmarked on SIMKL when you unmark it here.',
    sv: 'Sedda filmer och avsnitt slås ihop åt båda hållen. En titel avmarkeras på SIMKL bara när du avmarkerar den här.',
    de: 'Gesehene Filme und Folgen werden in beide Richtungen abgeglichen. Ein Titel wird bei SIMKL nur zurückgesetzt, wenn du ihn hier zurücksetzt.',
    fr: 'Les films et épisodes vus sont fusionnés dans les deux sens. Un titre n’est décoché sur SIMKL que si vous le décochez ici.',
    es: 'Las películas y episodios vistos se combinan en ambos sentidos. Un título solo se desmarca en SIMKL si lo desmarcas aquí.',
  },
  syncWatchedHintTv: {
    en: 'Watched movies and episodes are merged both ways.',
    sv: 'Sedda filmer och avsnitt slås ihop åt båda hållen.',
    de: 'Gesehene Filme und Folgen werden in beide Richtungen abgeglichen.',
    fr: 'Les films et épisodes vus sont fusionnés dans les deux sens.',
    es: 'Las películas y episodios vistos se combinan en ambos sentidos.',
  },
  syncWatchlist: {
    en: 'Sync watchlist',
    sv: 'Synka watchlist',
    de: 'Merkliste synchronisieren',
    fr: 'Synchroniser Ma liste',
    es: 'Sincronizar mi lista',
  },
  syncWatchlistHint: {
    en: 'Followed series are "Watching" or "Plan to watch" on SIMKL, the movie watchlist is "Plan to watch". Unfollowing moves a series to "Dropped".',
    sv: 'Följda serier är "Tittar på" eller "Planerar att se" på SIMKL, filmwatchlisten är "Planerar att se". Slutar du följa flyttas serien till "Avbrutna".',
    de: 'Gefolgte Serien sind bei SIMKL „Watching“ oder „Plan to watch“, die Film-Merkliste ist „Plan to watch“. Wenn du einer Serie nicht mehr folgst, wird sie auf „Dropped“ gesetzt.',
    fr: 'Les séries suivies sont « Watching » ou « Plan to watch » sur SIMKL, la liste de films est « Plan to watch ». Ne plus suivre une série la place dans « Dropped ».',
    es: 'Las series seguidas están en «Watching» o «Plan to watch» en SIMKL, y la lista de películas en «Plan to watch». Si dejas de seguir una serie, pasa a «Dropped».',
  },
  syncWatchlistHintTv: {
    en: 'Followed series and the movie watchlist are kept the same.',
    sv: 'Följda serier och filmwatchlisten hålls lika.',
    de: 'Gefolgte Serien und die Film-Merkliste bleiben gleich.',
    fr: 'Les séries suivies et la liste de films restent identiques.',
    es: 'Las series seguidas y la lista de películas se mantienen iguales.',
  },

  // Synkstatus
  lastSync: {
    en: 'Last synced {time} · {changes}',
    sv: 'Senast synkad {time} · {changes}',
    de: 'Zuletzt synchronisiert {time} · {changes}',
    fr: 'Dernière synchro {time} · {changes}',
    es: 'Última sincronización {time} · {changes}',
  },
  changesNone: {
    en: 'no changes',
    sv: 'inga ändringar',
    de: 'keine Änderungen',
    fr: 'aucun changement',
    es: 'sin cambios',
  },
  changesOne: {
    en: '1 change',
    sv: '1 ändring',
    de: '1 Änderung',
    fr: '1 changement',
    es: '1 cambio',
  },
  changesMany: {
    en: '{n} changes',
    sv: '{n} ändringar',
    de: '{n} Änderungen',
    fr: '{n} changements',
    es: '{n} cambios',
  },
  neverSynced: {
    en: 'Not synced yet',
    sv: 'Inte synkad än',
    de: 'Noch nicht synchronisiert',
    fr: 'Pas encore synchronisé',
    es: 'Aún sin sincronizar',
  },
  syncingLong: {
    en: 'Syncing with SIMKL…',
    sv: 'Synkar med SIMKL…',
    de: 'Synchronisiere mit SIMKL…',
    fr: 'Synchronisation avec SIMKL…',
    es: 'Sincronizando con SIMKL…',
  },
  syncing: {
    en: 'Syncing…',
    sv: 'Synkar…',
    de: 'Synchronisiere…',
    fr: 'Synchronisation…',
    es: 'Sincronizando…',
  },
  syncAuto: {
    en: 'Syncs on its own every 15 minutes and when you change a toggle.',
    sv: 'Synkar av sig själv var 15:e minut och när du ändrar ett reglage.',
    de: 'Synchronisiert automatisch alle 15 Minuten und wenn du einen Schalter änderst.',
    fr: 'Se synchronise automatiquement toutes les 15 minutes et quand vous modifiez un réglage.',
    es: 'Se sincroniza solo cada 15 minutos y cuando cambias un interruptor.',
  },
  syncNow: {
    en: 'Sync now',
    sv: 'Synka nu',
    de: 'Jetzt synchronisieren',
    fr: 'Synchroniser',
    es: 'Sincronizar ahora',
  },
  pausedUntil: {
    en: 'Paused until {time} — SIMKL limits how often apps may call it',
    sv: 'Pausat till {time}, SIMKL begränsar antalet anrop',
    de: 'Pausiert bis {time} — SIMKL begrenzt die Anzahl der Abrufe',
    fr: 'En pause jusqu’à {time} — SIMKL limite le nombre de requêtes',
    es: 'En pausa hasta las {time} — SIMKL limita el número de llamadas',
  },
  pausedBody: {
    en: 'Lumio sends nothing to SIMKL until the pause is over. Scrobble and sync then resume on their own.',
    sv: 'Lumio skickar inget till SIMKL förrän pausen är slut. Scrobble och synk fortsätter sedan av sig själva.',
    de: 'Lumio sendet nichts an SIMKL, bis die Pause vorbei ist. Scrobbeln und Synchronisieren laufen danach von selbst weiter.',
    fr: 'Lumio n’envoie rien à SIMKL tant que la pause n’est pas terminée. Le scrobble et la synchro reprennent ensuite d’eux-mêmes.',
    es: 'Lumio no envía nada a SIMKL hasta que termine la pausa. El scrobble y la sincronización se reanudan solos.',
  },
  quotaLow: {
    en: 'Today\'s SIMKL quota is nearly used up — sync resumes tomorrow.',
    sv: 'Dagens SIMKL-kvot är nästan slut — synken fortsätter i morgon.',
    de: 'Das heutige SIMKL-Kontingent ist fast aufgebraucht — die Synchronisierung läuft morgen weiter.',
    fr: 'Le quota SIMKL du jour est presque épuisé — la synchro reprendra demain.',
    es: 'La cuota de SIMKL de hoy casi se ha agotado: la sincronización continúa mañana.',
  },
  traktTip: {
    en: 'If SIMKL already syncs with Trakt on simkl.com you don\'t need to turn on the same thing here — it gives double plays in Trakt.',
    sv: 'Synkar SIMKL redan med Trakt på simkl.com behöver du inte slå på samma sak här, det ger dubbla visningar i Trakt.',
    de: 'Wenn SIMKL auf simkl.com bereits mit Trakt synchronisiert, musst du hier nicht dasselbe einschalten — sonst wird doppelt bei Trakt gezählt.',
    fr: 'Si SIMKL se synchronise déjà avec Trakt sur simkl.com, inutile d’activer la même chose ici : cela crée des doublons dans Trakt.',
    es: 'Si SIMKL ya se sincroniza con Trakt en simkl.com, no hace falta activarlo aquí: genera reproducciones duplicadas en Trakt.',
  },

  // Listor
  groupMine: {
    en: 'My lists',
    sv: 'Mina listor',
    de: 'Meine Listen',
    fr: 'Mes listes',
    es: 'Mis listas',
  },
  groupTrending: {
    en: 'Trending on Simkl',
    sv: 'Trendande på Simkl',
    de: 'Trends auf Simkl',
    fr: 'Tendances sur Simkl',
    es: 'Tendencias en Simkl',
  },
  statusWatching: {
    en: 'Watching',
    sv: 'Tittar på',
    de: 'Schaue ich',
    fr: 'En cours',
    es: 'Viendo',
  },
  statusPlantowatch: {
    en: 'Plan to watch',
    sv: 'Planerar att se',
    de: 'Geplant',
    fr: 'À voir',
    es: 'Pendiente',
  },
  statusCompleted: {
    en: 'Completed',
    sv: 'Klara',
    de: 'Abgeschlossen',
    fr: 'Terminé',
    es: 'Completado',
  },
  statusHold: {
    en: 'On hold',
    sv: 'Pausade',
    de: 'Pausiert',
    fr: 'En pause',
    es: 'En pausa',
  },
  statusDropped: {
    en: 'Dropped',
    sv: 'Avbrutna',
    de: 'Abgebrochen',
    fr: 'Abandonné',
    es: 'Abandonado',
  },
  typeMovies: {
    en: 'Movies',
    sv: 'Filmer',
    de: 'Filme',
    fr: 'Films',
    es: 'Películas',
  },
  typeShows: {
    en: 'Series',
    sv: 'Serier',
    de: 'Serien',
    fr: 'Séries',
    es: 'Series',
  },
  typeAnime: {
    en: 'Anime',
    sv: 'Anime',
    de: 'Anime',
    fr: 'Animes',
    es: 'Anime',
  },
  periodToday: {
    en: 'Today',
    sv: 'Idag',
    de: 'Heute',
    fr: 'Aujourd’hui',
    es: 'Hoy',
  },
  periodWeek: {
    en: 'This week',
    sv: 'Veckan',
    de: 'Diese Woche',
    fr: 'Cette semaine',
    es: 'Esta semana',
  },
  periodMonth: {
    en: 'This month',
    sv: 'Månaden',
    de: 'Dieser Monat',
    fr: 'Ce mois-ci',
    es: 'Este mes',
  },

  // TV
  tvAccount: {
    en: 'Account',
    sv: 'Konto',
    de: 'Konto',
    fr: 'Compte',
    es: 'Cuenta',
  },
  tvConnectHint: {
    en: 'Shows a code and a QR code. Approve on simkl.com.',
    sv: 'Visar en kod och en QR-kod. Godkänn på simkl.com.',
    de: 'Zeigt einen Code und einen QR-Code. Bestätige auf simkl.com.',
    fr: 'Affiche un code et un QR code. Validez sur simkl.com.',
    es: 'Muestra un código y un código QR. Aprueba en simkl.com.',
  },
  tvConnectedHint: {
    en: 'This device is connected. Other devices connect on their own.',
    sv: 'Den här enheten är ansluten. Andra enheter ansluter för sig.',
    de: 'Dieses Gerät ist verbunden. Andere Geräte verbinden sich einzeln.',
    fr: 'Cet appareil est connecté. Les autres appareils se connectent séparément.',
    es: 'Este dispositivo está conectado. Los demás se conectan por separado.',
  },
} as const

export type StringKey = keyof typeof S
/** Appens språk; okända koder (t.ex. x-…) faller tillbaka på engelska. */
export type Text = { en: string; sv: string; de: string; fr: string; es: string }

/** Texten på valt språk, engelska för allt annat. */
export function pick(text: Text, lang?: string): string {
  const value = lang ? (text as Record<string, string>)[lang] : undefined
  return value ?? text.en
}

export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

/** Fyller samma platshållare på alla språk. */
export function fillBoth(text: Text, values: Record<string, string | number>): Text {
  return {
    en: fill(text.en, values), sv: fill(text.sv, values), de: fill(text.de, values),
    fr: fill(text.fr, values), es: fill(text.es, values),
  }
}
