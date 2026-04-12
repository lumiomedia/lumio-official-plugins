(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ../lumio-official-plugins/plugins/trakt/runtime/index.ts
  var runtime_exports = {};
  __export(runtime_exports, {
    TraktPlugin: () => TraktPlugin
  });

  // ../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build-wvYH2B/react-shim.ts
  var react = globalThis.__lumioPluginRuntime?.react ?? globalThis.React;
  var Activity = react.Activity;
  var Children = react.Children;
  var Component = react.Component;
  var Fragment = react.Fragment;
  var Profiler = react.Profiler;
  var PureComponent = react.PureComponent;
  var StrictMode = react.StrictMode;
  var Suspense = react.Suspense;
  var act = react.act;
  var cache = react.cache;
  var cacheSignal = react.cacheSignal;
  var captureOwnerStack = react.captureOwnerStack;
  var cloneElement = react.cloneElement;
  var createContext = react.createContext;
  var createElement = react.createElement;
  var createRef = react.createRef;
  var forwardRef = react.forwardRef;
  var isValidElement = react.isValidElement;
  var lazy = react.lazy;
  var memo = react.memo;
  var startTransition = react.startTransition;
  var unstable_useCacheRefresh = react.unstable_useCacheRefresh;
  var use = react.use;
  var useActionState = react.useActionState;
  var useCallback = react.useCallback;
  var useContext = react.useContext;
  var useDebugValue = react.useDebugValue;
  var useDeferredValue = react.useDeferredValue;
  var useEffect = react.useEffect;
  var useEffectEvent = react.useEffectEvent;
  var useId = react.useId;
  var useImperativeHandle = react.useImperativeHandle;
  var useInsertionEffect = react.useInsertionEffect;
  var useLayoutEffect = react.useLayoutEffect;
  var useMemo = react.useMemo;
  var useOptimistic = react.useOptimistic;
  var useReducer = react.useReducer;
  var useRef = react.useRef;
  var useState = react.useState;
  var useSyncExternalStore = react.useSyncExternalStore;
  var useTransition = react.useTransition;
  var version = react.version;

  // ../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build-wvYH2B/jsx-runtime-shim.ts
  var runtime = globalThis.__lumioPluginRuntime?.jsxRuntime;
  var Fragment2 = runtime.Fragment;
  var jsx = runtime.jsx;
  var jsxs = runtime.jsxs;
  var jsxDEV = runtime.jsxDEV;

  // lib/i18n.tsx
  var strings = {
    en: {
      // Nav
      calendar: "Calendar",
      releases: "Releases",
      settings: "Settings",
      lastWatched: "Last watched",
      popularStreaming: "On Streaming",
      popularOnTv: "Series",
      popularCinema: "In theaters",
      popularTrendingMovies: "Movies",
      popularTrailers: "Trailers",
      popularLiveTv: "Live TV",
      m3uUrls: "M3U Playlist URLs",
      m3uUrlsDesc: "Enter one M3U URL per line. Channels are stored in your browser.",
      m3uUrlsPlaceholder: "https://example.com/playlist.m3u",
      m3uFetchList: "Fetch list",
      m3uFetchListDone: "List fetched",
      m3uFetchListError: "Could not fetch list",
      liveTvLists: "Channel lists",
      liveTvCreateList: "Create list",
      liveTvListName: "List name",
      liveTvNoLists: "No channel lists yet.",
      liveTvAddToList: "Add to active list",
      liveTvRemoveFromList: "Remove from active list",
      liveTvDeleteList: "Delete list",
      liveTvSelectListFirst: "Select a list first",
      liveTvHomeSource: "Live TV source",
      liveTvAllChannels: "All channels",
      m3uNoUrl: "No M3U URL configured. Add one in Settings.",
      m3uLoading: "Loading channels\u2026",
      m3uError: "Failed to load channels.",
      m3uChannels: "channels",
      m3uSearch: "Search channels\u2026",
      m3uNoResults: "No channels match your search.",
      // Hero
      subtitle: "Search movies, series, or cast in Sweden.",
      brandTagline: "Movie & Series Finder",
      myFiles: "My Files",
      trending: "Trending",
      homeTrendingSubtitle: "Across movies and series this week",
      popularMoviesTitle: "Popular Movies",
      popularMoviesSubtitle: "Current movie picks with the biggest momentum",
      popularSeriesTitle: "Popular Series",
      popularSeriesSubtitle: "Top series on streaming right now",
      showAllTrending: "Show all trending",
      showAllMovies: "Show all movies",
      showAllSeries: "Show all series",
      searchPlaceholder: "Search titles or cast names",
      searchTitlePlaceholder: "Search title",
      sampleData: "Sample data",
      tmdbLive: "TMDb live",
      castSearch: "Cast search",
      titleSearch: "Title search",
      showingCastResults: "Showing cast results",
      showingTitleResults: "Showing title results.",
      for: "for",
      // Recently watched
      recentlyStreamed: "Recently streamed",
      lastWatchedTitle: "Last Watched",
      continueWhereLeftOff: "Continue where you left off",
      showAll: "Show all",
      all: "All",
      close: "Close",
      trailerLabel: "Trailer",
      closeTrailer: "Close trailer",
      liveTvStreamError: "Could not load stream.",
      liveTvStreamErrorHelp: "The stream may be geo-blocked, offline, or unsupported.",
      allCategories: "All categories",
      sceneReleases: "Scene Releases",
      activeFiltersTitle: "Active filters",
      activeFiltersHintPrefix: "Provider availability is scoped to Sweden (",
      activeFiltersHintSuffix: "), and multiple selected chips match any of the chosen labels, not all of them at once.",
      scraperGlobalDefaults: "Global defaults",
      scraperRdApiKey: "API key",
      scraperRdApiPlaceholder: "Your API key",
      scraperRdApiKeyPerScraper: "API key (per scraper)",
      scraperUsingGlobal: "Using global API key",
      apiKeyLabel: "API key",
      scraperDefaultQualityFilter: "Default quality filter (exclude)",
      scraperDefaultLanguages: "Default languages",
      scraperDefaultDebridProvider: "Default debrid provider",
      scraperDefaultMaxResults: "Default max results per quality",
      scraperQualityFilter: "Quality filter (exclude)",
      scraperLanguages: "Languages",
      scraperProviders: "Providers (empty = all)",
      scraperSelectQualities: "Select qualities",
      scraperSelectLanguages: "Select languages",
      scraperSelectProviders: "Select providers",
      scraperMaxResults: "Max results",
      scraperMaxSize: "Max size (MB, 0 = no limit)",
      scraperDebridProvider: "Debrid provider",
      scraperManifestUrl: "Manifest URL (stremio:// or https://)",
      scraperCustomUrl: "Custom URL",
      scraperNoUrl: "No URL set",
      scraperAddTorrentsDb: "+ TorrentsDB",
      scraperAddTorrentio: "+ Torrentio",
      scraperAddComet: "+ Comet",
      scraperAddMediaFusion: "+ MediaFusion",
      scraperAddCustom: "+ Custom URL",
      useGlobal: "Use global",
      clearFilters: "Clear filters",
      moviesOnly: "Movies only",
      seriesOnly: "Series only",
      titleLabel: "Title",
      ratingLabel: "Rating",
      ratingLabelTmdb: "TMDb",
      noStreamsYet: "No streamed movies or audiobooks found yet.",
      noScrapersEnabled: "No scrapers enabled.",
      streamNotCached: "Stream not cached \u2014 try another",
      downloadTimeout: "Download timeout \u2014 try another stream",
      openToContinue: "\u2014 open to continue",
      timeLeft: "left",
      resume: "Resume",
      listenedAt: "at",
      streamAvailable: "Cached",
      streamDownload: "Download",
      startingMovie: "Starting movie...",
      findingMovie: "Finding movie...",
      startingEpisode: "Starting episode...",
      // Media card / details
      movie: "Movie",
      series: "Series",
      audiobook: "Audiobook",
      synopsis: "Synopsis",
      genres: "Genres",
      filterProviders: "Services",
      streamingIn: "Streaming in Sweden",
      noProviders: "No streaming providers found",
      tmdbRating: "Rating",
      tmdbVoteAverage: "TMDb vote average",
      keywords: "Keywords",
      showLess: "Show less",
      recommendations: "Recommendations",
      follow: "Follow",
      following: "Following \u2713",
      movieWatchlistAdd: "My list",
      movieWatchlistAdded: "My list \u2713",
      moreInfo: "More info",
      watchTrailer: "Watch Trailer",
      openOnImdb: "Open on IMDb",
      seasons: "Seasons:",
      matchedOnTitle: "Matched on title:",
      localFallback: "Local fallback",
      // Streams
      streams: "Streams",
      rdStreams: "Real-Debrid streams",
      configureRd: "Configure your Real-Debrid API key in Settings.",
      loadingSeasons: "Loading seasons\u2026",
      loadingEpisodes: "Loading episodes\u2026",
      noSeasons: "No seasons found.",
      noEpisodes: "No episodes found.",
      cached: "Cached",
      notCached: "not cached (will download)",
      play: "Play",
      noStreamsAvailable: "No streams",
      noStreamYet: "No stream yet",
      addAndPlay: "Add & Play",
      searchingStreams: "Searching for streams\u2026",
      noStreams: "No streams found.",
      allFiltered: "All streams filtered by quality settings.",
      preparingPlayback: "Preparing playback\u2026",
      downloading: "Downloading\u2026",
      downloadingFile: "Downloading file...",
      queued: "Queued on Real-Debrid\u2026",
      convertingMagnet: "Converting magnet\u2026",
      selectingFiles: "Selecting files\u2026",
      addingToRd: "Adding to Real-Debrid\u2026",
      unrestrictingLinks: "Unrestricting links\u2026",
      selectFile: "Select file to play:",
      noVideoFiles: "No video files detected.",
      markWatched: "Mark as watched",
      markUnwatched: "Mark as unwatched",
      watched: "\u2713 Watched",
      watchedQ: "Watched?",
      markAllWatched: "Mark all as watched",
      addManually: "Add magnet / direct link manually",
      hideManual: "Hide manual input",
      pasteManual: "Paste magnet link manually",
      manualPlaceholder: "magnet:? or https://\u2026",
      go: "Go",
      tryAgain: "Try again",
      cancel: "Cancel",
      copyLink: "Copy link",
      copied: "Copied \u2713",
      moreActions: "More actions",
      copyStreamLink: "Copy stream link",
      downloadThisVideo: "Download this video",
      openInVlc: "Play in VLC",
      preparingDownload: "Preparing download...",
      downloadComplete: "Download complete",
      downloadFailed: "Download failed",
      backToStreams: "Back to streams",
      instantPlay: "instant play",
      continueFrom: "Continue:",
      retry: "Retry",
      // Audiobook
      audiobooks: "Audiobook",
      resumeAudiobook: "Resume audiobook",
      searchingAudiobooks: "Searching for audiobooks\u2026",
      noAudiobooks: "No audiobooks found for",
      dismiss: "Dismiss",
      // Filters
      filters: "Filters",
      refine: "Refine",
      reset: "Reset",
      type: "Type",
      movieGenres: "Movie genres",
      seriesGenres: "TV genres",
      moreFilters: "More filters",
      year: "Year",
      rating: "Rating",
      languages: "Languages",
      originalLanguage: "Original language",
      noLanguagesSelected: "No original languages selected yet.",
      languageSearchPlaceholder: "Search languages, for example Swedish, Danish, or en",
      languageSearchHelper: "Search by language name or code. Multiple selections mean the title can match any of the chosen original languages.",
      noLanguageMatches: "No language matches for",
      noKeywordsSelected: "No keywords selected yet.",
      keywordsPlaceholderTmdb: "Keyword",
      keywordsPlaceholderCatalog: "Keyword",
      clearSearch: "Clear search",
      keywordsHelperTmdb: "Type at least 2 characters. Use the arrow keys and Enter to select faster. You can only add keywords that exist in TMDb.",
      keywordsHelperCatalog: "Type at least 2 characters. Use the arrow keys and Enter to select faster. You can only add keywords that exist in the catalog.",
      searchingKeywords: "Searching keywords...",
      noKeywordMatches: "No keyword matches for",
      add: "Add",
      selected: "selected",
      sortBy: "Sort by",
      sortMostPopular: "Most popular",
      sortMostRelevant: "Most relevant",
      sortHighestRating: "Highest rating",
      sortHighestTmdb: "Highest TMDb rating",
      sortNewest: "Newest to Oldest",
      sortOldest: "Oldest to Newest",
      // Results
      aboutResults: "About",
      results: "results",
      page: "Page",
      of: "of",
      previous: "Previous",
      next: "Next",
      showingPagedResults: "Showing paged results from the strongest available matches.",
      usingFallback: "Using sample fallback",
      sampleCatalog: "Sample catalog",
      noResults: "No matches",
      // Subtitle menu
      subtitleLanguages: "Subtitle Languages",
      subtitleVariants: "Subtitles Variants",
      subtitleSettings: "Subtitles Settings",
      selectLanguage: "Select a language",
      off: "Off",
      delay: "Delay",
      subtitleAutoSync: "Auto-sync",
      subtitleAutoSyncAnalyzing: "Analyzing...",
      subtitleAutoSyncApplied: "Applied offset",
      subtitleAutoSyncFailed: "Could not auto-sync subtitles",
      subtitleAutoSyncNoMatch: "Could not find a reliable subtitle match",
      subtitleAutoSyncNeedsGroq: "Add a Groq API key in Settings first",
      subtitleAutoSyncNeedsSubtitle: "Pick a subtitle track first",
      subtitleAutoSyncNotEnoughSpeech: "Try again during a scene with more dialogue",
      size: "Size",
      verticalPosition: "Vertical Position",
      subtitlesLabel: "Subtitles",
      subtitleProvider: "OpenSubtitles v3",
      undo: "Undo",
      audio: "Audio",
      audioLanguage: "Audio language",
      currentAudioOutput: "Current audio output",
      info: "Info",
      actor: "Actor",
      readMore: "Read more",
      readLess: "Read less",
      knownFor: "Known for",
      credits: "Credits",
      gender: "Gender",
      birth: "Birth",
      bornIn: "Born in:",
      alsoKnownAs: "Also known as:",
      noBiography: "No biography available on TMDb.",
      soundtrack: "Soundtrack",
      soundtrackLoadError: "Could not load soundtrack",
      noSoundtrackFound: "No soundtrack found on Spotify",
      searchOnSpotify: "Search on Spotify",
      searching: "Searching\u2026",
      instantPlayTitle: "Instant play",
      zappFindTitle: "Find a movie",
      // Settings
      settingsTitle: "Settings",
      settingsDesc: "Configure integrations for this app.",
      profilesTitle: "Profiles",
      profilesDesc: "Create separate local profiles with their own browser cache and playback history.",
      profileName: "Profile name",
      profileNamePlaceholder: "For example Family or Kids",
      createProfile: "Create profile",
      deleteProfile: "Delete profile",
      resetProfile: "Reset profile",
      activeProfile: "Active profile",
      switchProfile: "Switch profile",
      profileSwitcher: "Profile",
      scraperTitle: "Scraper",
      scraperDesc: "Choose which Stremio scraper is used to find streams. Torrentio is enough with an RD key, but can be configured if needed.",
      configure: "Configure",
      customScraper: "Custom",
      customScraperDesc: "Any Stremio-compatible scraper with RD support.",
      rdApiKeyLabel: "Real-Debrid API key",
      scraperManifestPlaceholder: "Paste manifest URL here...",
      customManifestPlaceholder: "https://your-scraper.example.com/manifest.json",
      hevcTitle: "HEVC / H.265 Codec",
      hevcDesc: "Required to play MKV/HEVC streams in the browser. Installs the Microsoft HEVC Video Extension via PowerShell.",
      installHevc: "Install HEVC Codec",
      installed: "Installed",
      checking: "Checking\u2026",
      installing: "Installing\u2026",
      hevcRestart: "Restart your browser for the codec to take effect.",
      tmdbApiToken: "API Token (Bearer)",
      tmdbApiKey: "API Key (v3)",
      language: "Language",
      region: "Region",
      tmdbEnvNote: "",
      homekitTitle: "HomeKit",
      homekitDesc: "Expose Lumio as its own HomeKit accessory and manage pairing from here.",
      homekitEnableAccessory: "Enable HomeKit accessory",
      name: "Name",
      homekitStatusLabel: "Status",
      homekitNotConnected: "Not connected",
      homekitDisabled: "Disabled",
      homekitReady: "Ready for pairing",
      homekitNotPublished: "Not published",
      homekitStatusFetchError: "Could not fetch HomeKit status",
      homekitServerError: "Could not contact HomeKit server",
      homekitActionFailed: "HomeKit operation failed",
      homekitResetInfo: "Pairing reset. A new HomeKit identity was created for a fresh pairing.",
      homekitEventRules: "Event rules",
      movieStarts: "Movie starts",
      moviePaused: "Movie pauses",
      videoClosed: "Video closes",
      openGuide: "Open guide",
      closeGuide: "Close guide",
      startPairing: "Start pairing",
      resetPairing: "Reset pairing",
      refreshStatus: "Refresh status",
      starting: "Starting...",
      resetting: "Resetting...",
      homekitGuideTitle: "HomeKit guide",
      homekitGuideStep1: "Press Start pairing.",
      homekitGuideStep2: "Add the accessory in the Home app and enter the PIN code from the field above.",
      homekitGuideStep3: "Name the switches the same as the event rules.",
      homekitGuideStep4: "Create one automation per switch with the trigger Turns on.",
      homekitGuideStep5: "Choose your lights and set brightness/scene for each event.",
      homekitSwitchesToUse: "Switches to use",
      homekitSwitchesList: "Movie starts, Movie pauses, Video closes",
      groqTitle: "Groq AI Search",
      groqDescPrefix: "Enable AI search with natural language.",
      spotifyTitle: "Spotify",
      localFilesTitle: "Local files",
      localFilesDesc: "Choose a folder with video files. Lumio matches filenames to TMDb and shows them in a separate library.",
      chooseFolder: "Choose folder",
      removeFolder: "Remove folder",
      playbackTitle: "Playback",
      playbackDesc: "Settings for video playback.",
      homeSectionsTitle: "Homepage",
      homeSectionsDesc: "Choose order, layout and card count for each homepage section. Up to 3 custom sections are supported.",
      homeBackgroundTitle: "Homepage background",
      homeBackgroundDesc: "Use your own image URLs instead of the random homepage backdrop.",
      homeBackgroundPlaceholder: "https://example.com/background-1.jpg\nhttps://example.com/background-2.jpg",
      uploadImages: "Upload images",
      enabled: "Enabled",
      uploadedImage: "Uploaded image",
      localUploadStored: "Saved locally in Lumio",
      remove: "Remove",
      drag: "Drag",
      moveUp: "Move up",
      moveDown: "Move down",
      moveUpShort: "Up",
      moveDownShort: "Down",
      homeRowRecent: "Last watched",
      homeRowTrending: "Trending",
      homeRowMovies: "Popular movies",
      homeRowSeries: "Popular series",
      homeRowTrailers: "Trailers",
      homeRowLiveTv: "Live TV",
      homeRowTraktCollection: "Watchlist",
      homeRowCustom1: "Custom section 1",
      homeRowCustom2: "Custom section 2",
      homeRowCustom3: "Custom section 3",
      homeSearchTitle: "Homepage search",
      homeSearchDesc: "Show or hide the large search field on the homepage.",
      homeSearchToggleLabel: "Hide search field on homepage",
      homeTopMenuTitle: "Top menu",
      homeTopMenuDesc: "Choose which top buttons to show and change their order.",
      homeTopMenuSettingsShortcut: "Settings can always be opened with Cmd+, on Mac or Ctrl+, on other keyboards.",
      homeMainMenuTitle: "Homepage menu",
      homeMainMenuDesc: "Choose which menu buttons to show and change their order with up and down.",
      profileSelector: "Profile selector",
      alwaysVisible: "Always visible",
      collapseSection: "Collapse section",
      expandSection: "Expand section",
      homeSource: "Source",
      homeSourceMovies: "Movies",
      homeSourceSeries: "Series",
      homeSourceSeriesWatchlist: "New episodes",
      homeSourceSeriesWatchlistSubtitle: "Watchlist",
      homeSourceMovieWatchlist: "My list",
      homeSourceTraktCollection: "Watchlist",
      homeWatchlistList: "List",
      homeWatchlistType: "Type",
      homeSourcePlexRecentAdded: "Plex recently added",
      pluginYoutubeNotConnected: "Not connected",
      pluginYoutubeConnection: "Connection",
      pluginYoutubeConnectionNote: "This plugin uses your own Google Desktop Client ID and YouTube Data API key.",
      pluginYoutubeClientId: "Google OAuth Client ID",
      pluginYoutubeApiKey: "YouTube API Key",
      pluginYoutubeOwnAppTitle: "How to create your own app",
      pluginYoutubeOwnAppStep1: "1. Create a Google Cloud project.",
      pluginYoutubeOwnAppStep2: "2. Enable YouTube Data API v3.",
      pluginYoutubeOwnAppStep3: "3. Configure the OAuth consent screen.",
      pluginYoutubeOwnAppStep4: "4. Create an OAuth Client ID for Desktop app.",
      pluginYoutubeOwnAppStep5: "5. Create an API key restricted to YouTube Data API v3.",
      pluginYoutubeOwnAppStep6: "6. Paste the client ID and API key here, then reconnect YouTube.",
      pluginYoutubeOwnAppNote: "For private use you do not need your own domain. For localhost/browser development you can also create a Web application client, but normal plugin use should rely on a Desktop app client.",
      pluginYoutubeVideoOptions: "Video options",
      pluginYoutubeHero: "Hero",
      pluginYoutubeHeroHelp: "Uses the latest followed video as the Home hero. Once opened, that video stays hidden until a newer one appears.",
      pluginYoutubeKeepHero: "Keep hero visible",
      pluginYoutubeKeepHeroHelp: "Keeps the latest YouTube hero visible after opening it, and only replaces it when a newer video appears during startup warmup.",
      pluginYoutubeHideShorts: "Hide shorts",
      pluginYoutubeHideShortsHelp: "Hides short-form YouTube videos from grids when duration data is available.",
      pluginYoutubeConnect: "Connect YouTube",
      pluginYoutubeConnecting: "Connecting\u2026",
      pluginYoutubeRefresh: "Refresh",
      pluginYoutubeRefreshing: "Refreshing\u2026",
      pluginYoutubeReconnect: "Reconnect",
      pluginYoutubeDisconnect: "Disconnect",
      pluginYoutubeDisconnecting: "Disconnecting\u2026",
      pluginYoutubeClearCache: "Clear cache",
      pluginYoutubeConnectError: "Could not connect YouTube.",
      pluginYoutubeDisconnectError: "Could not disconnect YouTube.",
      pluginYoutubeLoadError: "Failed to load YouTube data.",
      pluginYoutubeRowLoadError: "Failed to load YouTube row.",
      pluginYoutubeFollowingPage: "Following",
      pluginYoutubeChannelsPage: "Channels",
      pluginYoutubePlaylistsPage: "Playlists",
      pluginYoutubeChannelPage: "Channel",
      pluginYoutubePlaylistPage: "Playlist",
      pluginYoutubeFollowingSubtitle: "Latest videos from channels you follow.",
      pluginYoutubeChannelsSubtitle: "Search for new channels and manage who you follow.",
      pluginYoutubePlaylistsSubtitle: "Your saved YouTube playlists.",
      pluginYoutubeChannelSubtitle: "Latest videos from this channel.",
      pluginYoutubePlaylistSubtitle: "Playlist videos",
      pluginYoutubeMatchingChannels: "Matching channels",
      pluginYoutubeYourSubscriptions: "Your subscriptions",
      pluginYoutubeSearchChannels: "Search channels",
      pluginYoutubeSetupPrompt: "Add your Google Desktop Client ID and YouTube API key in the YouTube plugin settings to get started.",
      pluginYoutubeConnectPrompt: "Connect YouTube in Settings to browse your subscriptions, channels and playlists.",
      pluginYoutubeLoading: "Loading your YouTube data\u2026",
      pluginYoutubePlaylistBadge: "Playlist",
      pluginYoutubeChannelBadge: "Channel",
      pluginYoutubeVideoBadge: "Video",
      pluginYoutubeVideos: "videos",
      pluginYoutubeUnfollow: "Unfollow",
      pluginYoutubeOpenFeed: "Open feed",
      pluginYoutubeFollowingRow: "YouTube following",
      pluginSectionIntro: "Manage installed plugins, browse the official marketplace and add plugin sources from GitHub or ZIP files.",
      pluginRestartRequired: "Restart required for plugin changes to fully apply.",
      pluginRestartNow: "Restart now",
      pluginInstalledTitle: "Installed plugins",
      pluginPreinstalled: "Pre-installed",
      pluginOfficialBadge: "Official",
      pluginManualSourceBadge: "Manual source",
      pluginInactiveBadge: "Inactive",
      pluginUpdateAvailable: "Update available",
      pluginMetadataOnly: "Metadata only",
      pluginRepoLabel: "Repo",
      pluginManifestLabel: "Manifest",
      pluginUpdateNotice: "A newer plugin version is available in the marketplace source.",
      pluginActiveState: "Active",
      pluginInactiveState: "Inactive",
      pluginDeactivate: "Deactivate",
      pluginActivate: "Activate",
      pluginUninstall: "Uninstall",
      pluginMarketplaceTitle: "Official marketplace",
      pluginMarketplaceIntro: "Install official Lumio plugins from the shared marketplace repository.",
      pluginMarketplaceFallback: "Using fallback marketplace data",
      pluginMarketplaceLive: "Live manifest",
      pluginMarketplaceStatic: "Fallback manifest",
      pluginMarketplaceChecked: "Checked",
      pluginCheckUpdates: "Check updates",
      pluginBundledRuntime: "Bundled runtime",
      pluginSharedRepoSuffix: "in shared marketplace repo",
      pluginInstall: "Install",
      pluginNoReadmePreview: "No README preview available.",
      pluginNoChangelogPreview: "No changelog preview available.",
      pluginAllOfficialInstalled: "All official marketplace plugins are installed.",
      pluginAddSourceTitle: "Add plugin source",
      pluginAddSourceIntro: "Add a GitHub repository that contains a Lumio plugin marketplace manifest, or upload a plugin ZIP. Discovered plugins will appear below as installable options.",
      pluginGithubRepoUrl: "GitHub repo URL",
      pluginAddGithubSource: "Add GitHub source",
      pluginChooseReleaseZip: "Choose a release ZIP",
      pluginChooseReleaseZipHelp: "This repository has multiple release ZIPs. Pick which asset Lumio should inspect.",
      pluginUploadZipTitle: "Upload plugin ZIP",
      pluginUploadZipHelp: "Import a plugin ZIP directly, for example a downloaded scraper package or a zipped plugin repository. You can also drag and drop a ZIP here.",
      pluginUploadZip: "Upload ZIP",
      pluginLastZipPreview: "Last ZIP preview",
      pluginSourceHelp: "GitHub sources should ideally expose a root marketplace.json. If that is missing, Lumio also tries the latest GitHub release ZIP automatically. ZIP imports can contain either a marketplace.json or one or more plugin.json files.",
      pluginAddedSources: "Added sources",
      pluginGithubSourceBadge: "GitHub source",
      pluginZipSourceBadge: "ZIP source",
      pluginAddedAt: "Added",
      pluginRemoveSource: "Remove source",
      pluginReleaseAssets: "Release assets",
      pluginFilesFound: "Files found",
      pluginInstallAllFromSource: "Install all from source",
      pluginAllSourceInstalled: "All plugins from this source are already installed.",
      pluginRuntimeAvailable: "Runtime available",
      pluginMetadataOnlyNow: "Metadata only for now",
      open: "Open",
      clear: "Clear",
      homeSourceLiveTvLists: "Live TV lists",
      homeSourceMyFiles: "My files",
      liveTvList: "Live TV list",
      liveTvChooseList: "Choose a Live TV list",
      homeMenuPremiereStar: "Premiere star",
      plexMenu: "Plex",
      traktTitle: "Trakt",
      traktDesc: "Sign in with Trakt to sync watched TV episodes, watchlists, and your collection with Lumio. Plex cards are not reliably supported for Trakt sync yet.",
      traktSignedInAs: "Signed in as",
      traktSignedInFallback: "Trakt user",
      traktSyncDesc: "Sync pulls data from Trakt into Lumio and also pushes your local Lumio watchlists and watched episodes back to Trakt. Plex follow/My list is currently not guaranteed to sync correctly.",
      traktImportData: "Sync Trakt data",
      traktImporting: "Syncing...",
      traktImportDone: "Trakt sync complete",
      traktDisconnect: "Disconnect",
      traktConnect: "Sign in with Trakt",
      traktWaiting: "Waiting for Trakt...",
      traktOpenLinkAndCode: "Open the link and enter the code",
      traktStartLoginFailed: "Failed to start Trakt login",
      traktLoginFailed: "Trakt login failed",
      traktImportFailed: "Failed to sync with Trakt",
      plexTitle: "Plex",
      plexDesc: "Sign in with Plex, choose a server and libraries, and use Plex recently added as a homepage row.",
      plexSignedInAs: "Connected as",
      plexSignedInFallback: "Plex user",
      plexConnect: "Sign in with Plex",
      plexWaiting: "Waiting for Plex...",
      plexOpenLinkAndCode: "Open the link and approve Lumio",
      plexChooseProfile: "Profile",
      plexProfilePin: "Profile PIN",
      plexProfilePinPlaceholder: "Enter Plex profile PIN",
      plexApplyProfile: "Apply profile",
      plexRefreshingProfiles: "Refreshing profiles...",
      plexProfileApplied: "Plex profile activated",
      plexChooseServer: "Server",
      plexChooseLibraries: "Libraries",
      plexRefreshLibraries: "Refresh libraries",
      plexRefreshingLibrariesButton: "Refreshing libraries...",
      plexRefreshLibrariesDone: "Plex libraries updated",
      plexRefreshLibrariesEmpty: "No movie or show libraries were found on this server.",
      plexRefreshLibrariesFailed: "Failed to refresh Plex libraries",
      plexRequestFailed: "Could not reach Plex. Check that the selected server is online and reachable.",
      plexDisconnect: "Disconnect",
      plexNoServers: "No Plex servers found.",
      plexNoLibraries: "No movie or show libraries found on this server.",
      plexRecentlyAdded: "Plex recently added",
      homeSourceCinemaMovies: "In theaters",
      homeSourceTopRatedMovies: "Top rated movies",
      homeSourceTopRatedSeries: "Top rated series",
      homeSourceReleaseRecentMovies: "Releases: recently movies",
      homeSourceReleaseRecentSeries: "Releases: recently series",
      homeSourceReleaseUpcomingMovies: "Releases: upcoming movies",
      homeSourceReleaseUpcomingSeries: "Releases: upcoming series",
      homeSourceStreamingMovies: "Trending movies (streaming)",
      homeSourceStreamingSeries: "Trending series (streaming)",
      homeLayout: "Layout",
      homeLayoutSlider: "Slider",
      homeLayoutGrid: "Grid",
      homeLayoutFull: "Show all",
      homeCount: "Cards",
      homeCountDesc: "Maximum cards shown in this section.",
      homeSliderGlobal: "Slider cards",
      homeSliderGlobalDesc: "How many cards a slider shows at most on wide screens.",
      homeSliderOverride: "Slider override",
      homeSliderDisplay: "Display",
      homeSliderUseGlobal: "Global value",
      homeFullModeNote: "Only one section can use Show all. Last watched can still stay above as a slider.",
      pinChannel: "Pin channel",
      unpinChannel: "Unpin channel",
      aspectRatio: "Aspect ratio",
      aspectRatioDesc: "Choose how the video should fit in the player.",
      cropZoom: "Zoom / crop",
      cropZoomOff: "Off",
      cropZoomCrop: "Crop",
      cropZoomZoom: "Zoom",
      cropZoomZoomPlus: "Zoom +",
      rememberAspectRatio: "Remember aspect ratio",
      rememberAspectRatioDesc: "Uses your chosen aspect ratio as the default for new movies and episodes.",
      autoSkipIntro: "Auto-skip intro",
      autoSkipIntroDesc: "When enabled, intros are skipped automatically. When disabled, a Skip intro button is shown if IntroDB has a match.",
      autoplayStreamOnPlay: "Auto-play on Play button",
      autoplayStreamOnPlayDesc: "For non-Plex cards, Play tries up to 3 streams automatically. Known mismatches on audio language and oversized files are skipped when possible.",
      hideWatchedMoviesHome: "Hide watched movies on Home",
      hideWatchedMoviesHomeDesc: "Exclude movies marked as watched from Home grids and sliders, including Plex rows.",
      stillWatching: "Still watching?",
      stillWatchingDesc: "For TV series only. Pause playback after the chosen time without control interaction, once at least 3 episodes have played in the same session.",
      stillWatchingMaxMinutes: "Still watching max time",
      stillWatchingMaxMinutesDesc: "Default matches Netflix timing: 90 minutes. Prompt appears only for TV series after at least 3 episodes.",
      stillWatchingContinue: "Continue watching",
      stillWatchingExit: "Close player",
      autoplayMaxStreamSize: "Max stream size",
      autoplayMaxStreamSizeDesc: "Optional limit in GB for auto-play attempts. Empty means no size cap.",
      introDebugReady: "IntroDB ready",
      introDebugLoading: "IntroDB loading",
      introDebugFound: "Intro found",
      introDebugMissing: "No intro match",
      introDebugAutoOn: "Auto-skip on",
      introDebugAutoOff: "Auto-skip off",
      aspectAuto: "Auto",
      aspectContain: "Fit",
      aspectFill: "Fill",
      aspect16_9: "16:9",
      aspect4_3: "4:3",
      audioMode: "Audio mode",
      audioModeDesc: "Choose between maximum compatibility or the best possible multichannel audio in proxy playback.",
      audioModeCompatible: "Compatible",
      audioModeCompatibleDesc: "Safest playback. Proxy audio is encoded to stereo AAC.",
      audioModeBest: "Best possible",
      audioModeBestDesc: "Keeps multichannel audio in the proxy when possible. Tauri/mpv continues to use the original track directly.",
      nightMode: "Night mode / DRC",
      nightModeDesc: "Reduces loud peaks and makes dialogue easier to hear at lower volume.",
      nightModeOff: "Off",
      nightModeMild: "Mild night mode",
      nightModeStrong: "Strong night mode",
      defaultSubtitleLanguage: "Default subtitles language",
      defaultSubtitleLanguageDesc: "Selected automatically when subtitles are available.",
      fallbackSubtitleLanguage: "Fallback subtitles language",
      fallbackSubtitleLanguageDesc: "Used only if the primary subtitle language is not available.",
      defaultAudioTrack: "Default audio track",
      defaultAudioTrackDesc: "Tries to choose the language automatically when multiple audio tracks exist.",
      disableSubtitlesWhenAudioMatches: "Turn off subtitles when audio matches",
      disableSubtitlesWhenAudioMatchesDesc: "If your selected default audio language is found, subtitles stay off by default.",
      subtitleSize: "Subtitle size",
      subtitleSizeDesc: "Used by default for new movies and episodes.",
      subtitleVerticalPositionDesc: "How high above the controls bar the subtitles are placed.",
      subtitleOpacity: "Opacity",
      subtitleOpacityDesc: "Applies to the whole subtitle including the background.",
      subtitleTextColor: "Subtitle color",
      subtitleTextColorDesc: "Default color for subtitles.",
      subtitleBackgroundColor: "Subtitle background color",
      subtitleBackgroundColorDesc: "Transparent matches the current style.",
      subtitleOutlineColor: "Subtitle outline color",
      subtitleOutlineColorDesc: "Used for the text outline/shadow.",
      subtitlePreviewText: "This is how your subtitles will look",
      subtitlePreviewCaption: "Preview of the default look",
      skipIntro: "Skip intro",
      originalFirst: "Original / first",
      noFallback: "No fallback",
      autoplayNextEpisode: "Auto-play next episode",
      autoplayNextEpisodeDesc: "Preloads the next episode and plays it automatically at the end of the series.",
      showPopup: "Show popup",
      showPopupDesc: "How many seconds before the end the next-episode card is shown.",
      preloadBeforePopup: "Preload before popup",
      preloadBeforePopupDesc: "How many seconds before the popup we start fetching the next episode.",
      seconds: "seconds",
      rdApiKey: "Real-Debrid API key",
      rdApiPlaceholder: "Your API key from real-debrid.com",
      rdApiNote: "Find your key at real-debrid.com \u203A Account \u203A API token. The key is stored only in your browser (localStorage).",
      streamQuality: "Stream quality filters",
      streamQualityDesc: "Hide low-quality or undesirable stream sources.",
      hideCam: "Hide CAM / CAMRIP",
      hideCamDesc: "Filmed in cinema \u2014 very low quality",
      hideTs: "Hide TeleSync / TeleCine (TS/TC)",
      hideTsDesc: "Low-quality pre-release copies",
      hideScr: "Hide Screener (SCR)",
      hideScrDesc: "DVD/streaming screener copies",
      hideBelow720p: "Hide below 720p",
      hideBelow720pDesc: "480p, 360p and lower resolutions",
      clearCache: "Clear cache",
      clearing: "Clearing\u2026",
      cleared: "Cleared \u2014 restart server",
      save: "Save",
      checkKey: "Check Key",
      testingConnection: "Testing connection\u2026",
      enterApiKeyFirst: "Enter an API key first.",
      connectedAs: "Connected as",
      // Calendar
      seriesCalendar: "Series Calendar",
      today: "Today",
      followSeries: "Follow a series to see episodes here",
      noEpisodesDay: "No episodes this day.",
      openStreams: "Open Streams",
      more: "more",
      // Media type chips
      both: "Both",
      movies: "Movies",
      // Release calendar
      releaseCalendar: "Release Calendar",
      recent: "Recent",
      upcoming: "Upcoming",
      allServices: "All services",
      premiere: "Premiere",
      newBadge: "New",
      newPremiere: "New premiere",
      loadMore: "Load more",
      allLanguages: "All languages",
      hideFilters: "Hide filters",
      sort: "Sort",
      // Watchlist
      addToWatchlist: "Add to watchlist",
      removeFromWatchlist: "Remove from watchlist",
      watchlistNewPremieres: "Watchlist \u2013 new premieres",
      watchlistAllLists: "Watchlist",
      watchlistEmpty: "No starred titles yet.",
      watchlistEmptyHint: "Star titles in the release calendar to follow premieres.",
      seriesWatchlistEmpty: "No followed series yet.",
      newEpisodeBadge: "New ep",
      // Date presets
      days7: "7 days",
      days30: "30 days",
      days60: "60 days",
      days90: "90 days",
      thisYear: "This year",
      dateFrom: "From",
      // Settings
      spotifyDesc: "Used to display soundtracks in the details panel. Create an app at developer.spotify.com and copy the Client ID and Client Secret.",
      clearCacheDesc: "Clear app cache and build artifacts if something behaves oddly.",
      // Soundtrack
      openOnSpotify: "Open on Spotify"
    },
    sv: {
      // Nav
      calendar: "Kalender",
      releases: "Releases",
      settings: "Inst\xE4llningar",
      lastWatched: "Senast sett",
      popularStreaming: "P\xE5 Streaming",
      popularOnTv: "Serier",
      popularCinema: "P\xE5 bio",
      popularTrendingMovies: "Filmer",
      popularTrailers: "Trailers",
      popularLiveTv: "Live TV",
      m3uUrls: "M3U-spellistor",
      m3uUrlsDesc: "Ange en M3U-l\xE4nk per rad.",
      m3uUrlsPlaceholder: "https://exempel.se/spellista.m3u",
      m3uFetchList: "H\xE4mta lista",
      m3uFetchListDone: "Listan h\xE4mtad",
      m3uFetchListError: "Kunde inte h\xE4mta listan",
      liveTvLists: "Kanallistor",
      liveTvCreateList: "Skapa lista",
      liveTvListName: "Listnamn",
      liveTvNoLists: "Inga kanallistor \xE4nnu.",
      liveTvAddToList: "L\xE4gg till i aktiv lista",
      liveTvRemoveFromList: "Ta bort fr\xE5n aktiv lista",
      liveTvDeleteList: "Radera lista",
      liveTvSelectListFirst: "V\xE4lj en lista f\xF6rst",
      liveTvHomeSource: "K\xE4lla f\xF6r Live TV",
      liveTvAllChannels: "Alla kanaler",
      m3uNoUrl: "Ingen M3U-l\xE4nk konfigurerad. L\xE4gg till en i Inst\xE4llningar.",
      m3uLoading: "Laddar kanaler\u2026",
      m3uError: "Kunde inte ladda kanaler.",
      m3uChannels: "kanaler",
      m3uSearch: "S\xF6k kanaler\u2026",
      m3uNoResults: "Inga kanaler matchar din s\xF6kning.",
      // Hero
      subtitle: "S\xF6k filmer, serier eller sk\xE5despelare i Sverige.",
      brandTagline: "Film- & serieguiden",
      myFiles: "Mina filer",
      trending: "Trendar",
      homeTrendingSubtitle: "Bland filmer och serier den h\xE4r veckan",
      popularMoviesTitle: "Popul\xE4ra filmer",
      popularMoviesSubtitle: "Aktuella filmtips med mest momentum",
      popularSeriesTitle: "Popul\xE4ra serier",
      popularSeriesSubtitle: "Toppserier p\xE5 streaming just nu",
      showAllTrending: "Visa alla trender",
      showAllMovies: "Visa alla filmer",
      showAllSeries: "Visa alla serier",
      searchPlaceholder: "S\xF6k titlar eller sk\xE5despelarnamn",
      searchTitlePlaceholder: "S\xF6k titel",
      sampleData: "Exempeldata",
      tmdbLive: "TMDb live",
      castSearch: "Sk\xE5despelars\xF6kning",
      titleSearch: "Titels\xF6kning",
      showingCastResults: "Visar sk\xE5despelarresultat",
      showingTitleResults: "Visar titelresultat.",
      for: "f\xF6r",
      // Recently watched
      recentlyStreamed: "Senast streamade",
      lastWatchedTitle: "Senast sett",
      continueWhereLeftOff: "Forts\xE4tt d\xE4r du slutade",
      showAll: "Visa alla",
      all: "Alla",
      close: "St\xE4ng",
      trailerLabel: "Trailer",
      closeTrailer: "St\xE4ng trailer",
      liveTvStreamError: "Kunde inte ladda str\xF6mmen.",
      liveTvStreamErrorHelp: "Str\xF6mmen kan vara geoblockerad, offline eller ej st\xF6dd.",
      allCategories: "Alla kategorier",
      sceneReleases: "Scene-releaser",
      activeFiltersTitle: "Aktiva filter",
      activeFiltersHintPrefix: "Tillg\xE4nglighet f\xF6r tj\xE4nster \xE4r begr\xE4nsad till Sverige (",
      activeFiltersHintSuffix: "), och flera valda chips matchar valfritt av etiketterna, inte alla samtidigt.",
      scraperGlobalDefaults: "Globala standarder",
      scraperRdApiKey: "API-nyckel",
      scraperRdApiPlaceholder: "Din API-nyckel",
      scraperRdApiKeyPerScraper: "API-nyckel (per skrapa)",
      scraperUsingGlobal: "Anv\xE4nder global API-nyckel",
      apiKeyLabel: "API-nyckel",
      scraperDefaultQualityFilter: "Standard kvalitetsfilter (uteslut)",
      scraperDefaultLanguages: "Standard spr\xE5k",
      scraperDefaultDebridProvider: "Standard debrid-leverant\xF6r",
      scraperDefaultMaxResults: "Standard maxresultat per kvalitet",
      scraperQualityFilter: "Kvalitetsfilter (uteslut)",
      scraperLanguages: "Spr\xE5k",
      scraperProviders: "Leverant\xF6rer (tomt = alla)",
      scraperSelectQualities: "V\xE4lj kvaliteter",
      scraperSelectLanguages: "V\xE4lj spr\xE5k",
      scraperSelectProviders: "V\xE4lj leverant\xF6rer",
      scraperMaxResults: "Maxresultat",
      scraperMaxSize: "Maxstorlek (MB, 0 = ingen gr\xE4ns)",
      scraperDebridProvider: "Debrid-leverant\xF6r",
      scraperManifestUrl: "Manifest-URL (stremio:// eller https://)",
      scraperCustomUrl: "Egen URL",
      scraperNoUrl: "Ingen URL angiven",
      scraperAddTorrentsDb: "+ TorrentsDB",
      scraperAddTorrentio: "+ Torrentio",
      scraperAddComet: "+ Comet",
      scraperAddMediaFusion: "+ MediaFusion",
      scraperAddCustom: "+ Egen URL",
      useGlobal: "Anv\xE4nd globalt",
      clearFilters: "Rensa filter",
      moviesOnly: "Endast filmer",
      seriesOnly: "Endast serier",
      titleLabel: "Titel",
      ratingLabel: "Betyg",
      ratingLabelTmdb: "TMDb",
      noStreamsYet: "Inga streamade filmer eller ljudb\xF6cker hittades \xE4nnu.",
      noScrapersEnabled: "Inga skrapor \xE4r aktiverade.",
      streamNotCached: "Streamen \xE4r inte cachad \u2014 prova en annan",
      downloadTimeout: "Nedladdningen tog f\xF6r l\xE5ng tid \u2014 prova en annan stream",
      openToContinue: "\u2014 \xF6ppna f\xF6r att forts\xE4tta",
      timeLeft: "kvar",
      resume: "Forts\xE4tt",
      listenedAt: "vid",
      streamAvailable: "Cachad",
      streamDownload: "Ladda ned",
      startingMovie: "Startar film...",
      findingMovie: "Hittar film...",
      startingEpisode: "Startar avsnitt...",
      // Media card / details
      movie: "Film",
      series: "Serie",
      audiobook: "Ljudbok",
      synopsis: "Synopsis",
      genres: "Genrer",
      filterProviders: "Tj\xE4nster",
      streamingIn: "Streaming i Sverige",
      noProviders: "Inga streamingtj\xE4nster hittades",
      tmdbRating: "Betyg",
      tmdbVoteAverage: "TMDb genomsnittsbetyg",
      keywords: "Nyckelord",
      showLess: "Visa mindre",
      recommendations: "Rekommendationer",
      follow: "F\xF6lj",
      following: "F\xF6ljer \u2713",
      movieWatchlistAdd: "Min lista",
      movieWatchlistAdded: "Min lista \u2713",
      moreInfo: "Mer info",
      watchTrailer: "Se trailer",
      openOnImdb: "\xD6ppna p\xE5 IMDb",
      seasons: "S\xE4songer:",
      matchedOnTitle: "Matchad p\xE5 titel:",
      localFallback: "Lokal reserv",
      // Streams
      streams: "Str\xF6mmar",
      rdStreams: "Real-Debrid-str\xF6mmar",
      configureRd: "Konfigurera din Real-Debrid API-nyckel i Inst\xE4llningar.",
      loadingSeasons: "Laddar s\xE4songer\u2026",
      loadingEpisodes: "Laddar avsnitt\u2026",
      noSeasons: "Inga s\xE4songer hittades.",
      noEpisodes: "Inga avsnitt hittades.",
      cached: "Cachad",
      notCached: "ej cachad (laddas ned)",
      play: "Spela",
      noStreamsAvailable: "Inga streams",
      noStreamYet: "Ingen stream \xE4n",
      addAndPlay: "L\xE4gg till & Spela",
      searchingStreams: "S\xF6ker str\xF6mmar\u2026",
      noStreams: "Inga str\xF6mmar hittades.",
      allFiltered: "Alla str\xF6mmar filtrerade bort av kvalitetsinst\xE4llningar.",
      preparingPlayback: "F\xF6rbereder uppspelning\u2026",
      downloading: "Laddar ned\u2026",
      downloadingFile: "Laddar ner fil...",
      queued: "I k\xF6 p\xE5 Real-Debrid\u2026",
      convertingMagnet: "Konverterar magnet\u2026",
      selectingFiles: "V\xE4ljer filer\u2026",
      addingToRd: "L\xE4gger till p\xE5 Real-Debrid\u2026",
      unrestrictingLinks: "Avbegr\xE4nsar l\xE4nkar\u2026",
      selectFile: "V\xE4lj fil att spela:",
      noVideoFiles: "Inga videofiler hittades.",
      markWatched: "Markera som sedd",
      markUnwatched: "Markera som osedd",
      watched: "\u2713 Sedd",
      watchedQ: "Sedd?",
      markAllWatched: "Markera alla som sedda",
      addManually: "L\xE4gg till magnet / direktl\xE4nk manuellt",
      hideManual: "D\xF6lj manuell inmatning",
      pasteManual: "Klistra in magnet-l\xE4nk manuellt",
      manualPlaceholder: "magnet:? eller https://\u2026",
      go: "K\xF6r",
      tryAgain: "F\xF6rs\xF6k igen",
      cancel: "Avbryt",
      copyLink: "Kopiera l\xE4nk",
      copied: "Kopierat \u2713",
      moreActions: "Fler val",
      copyStreamLink: "Kopiera streaml\xE4nk",
      downloadThisVideo: "Ladda ner videon",
      openInVlc: "Spela i VLC",
      preparingDownload: "F\xF6rbereder nedladdning...",
      downloadComplete: "Nedladdning klar",
      downloadFailed: "Nedladdning misslyckades",
      backToStreams: "Tillbaka till str\xF6mmar",
      instantPlay: "spelas direkt",
      continueFrom: "Forts\xE4tt:",
      retry: "F\xF6rs\xF6k igen",
      // Audiobook
      audiobooks: "Ljudbok",
      resumeAudiobook: "Forts\xE4tt lyssna",
      searchingAudiobooks: "S\xF6ker ljudb\xF6cker\u2026",
      noAudiobooks: "Inga ljudb\xF6cker hittades f\xF6r",
      dismiss: "St\xE4ng",
      // Filters
      filters: "Filter",
      refine: "F\xF6rfina",
      reset: "\xC5terst\xE4ll",
      type: "Typ",
      movieGenres: "Filmgenrer",
      seriesGenres: "TV-genrer",
      moreFilters: "Fler filter",
      year: "\xC5r",
      rating: "Betyg",
      languages: "Spr\xE5k",
      originalLanguage: "Originalspr\xE5k",
      noLanguagesSelected: "Inga originalspr\xE5k valda \xE4nnu.",
      languageSearchPlaceholder: "S\xF6k spr\xE5k, t.ex. svenska, danska eller en",
      languageSearchHelper: "S\xF6k p\xE5 spr\xE5knamn eller kod. Flera val inneb\xE4r att titeln kan matcha n\xE5got av de valda originalspr\xE5ken.",
      noLanguageMatches: "Inga spr\xE5ktr\xE4ffar f\xF6r",
      noKeywordsSelected: "Inga nyckelord valda \xE4nnu.",
      keywordsPlaceholderTmdb: "Keyword",
      keywordsPlaceholderCatalog: "Keyword",
      clearSearch: "Rensa s\xF6kning",
      keywordsHelperTmdb: "Skriv minst 2 tecken. Anv\xE4nd piltangenterna och Enter f\xF6r att v\xE4lja snabbare. Du kan bara l\xE4gga till nyckelord som finns i TMDb.",
      keywordsHelperCatalog: "Skriv minst 2 tecken. Anv\xE4nd piltangenterna och Enter f\xF6r att v\xE4lja snabbare. Du kan bara l\xE4gga till nyckelord som finns i katalogen.",
      searchingKeywords: "S\xF6ker nyckelord...",
      noKeywordMatches: "Inga nyckelordstr\xE4ffar f\xF6r",
      add: "L\xE4gg till",
      selected: "valda",
      sortBy: "Sortera",
      sortMostPopular: "Mest popul\xE4ra",
      sortMostRelevant: "Mest relevant",
      sortHighestRating: "H\xF6gst betyg",
      sortHighestTmdb: "H\xF6gst TMDb-betyg",
      sortNewest: "Nyast till \xE4ldst",
      sortOldest: "\xC4ldst till nyast",
      // Results
      aboutResults: "Ungef\xE4r",
      results: "resultat",
      page: "Sida",
      of: "av",
      previous: "F\xF6reg\xE5ende",
      next: "N\xE4sta",
      showingPagedResults: "Visar sidade resultat fr\xE5n de starkaste tr\xE4ffarna.",
      usingFallback: "Anv\xE4nder exempeldata",
      sampleCatalog: "Exempelkatalog",
      noResults: "Inga tr\xE4ffar",
      // Subtitle menu
      subtitleLanguages: "Undertextspr\xE5k",
      subtitleVariants: "Undertextvarianter",
      subtitleSettings: "Undertextinst\xE4llningar",
      selectLanguage: "V\xE4lj ett spr\xE5k",
      off: "Av",
      delay: "F\xF6rdr\xF6jning",
      subtitleAutoSync: "Auto-sync",
      subtitleAutoSyncAnalyzing: "Analyserar...",
      subtitleAutoSyncApplied: "La p\xE5 offset",
      subtitleAutoSyncFailed: "Kunde inte auto-synca undertexterna",
      subtitleAutoSyncNoMatch: "Kunde inte hitta en tillr\xE4ckligt bra matchning",
      subtitleAutoSyncNeedsGroq: "L\xE4gg till en Groq API-nyckel i inst\xE4llningar f\xF6rst",
      subtitleAutoSyncNeedsSubtitle: "V\xE4lj ett undertextsp\xE5r f\xF6rst",
      subtitleAutoSyncNotEnoughSpeech: "F\xF6rs\xF6k igen i en scen med mer dialog",
      size: "Storlek",
      verticalPosition: "Vertikal position",
      subtitlesLabel: "Undertexter",
      subtitleProvider: "OpenSubtitles v3",
      undo: "\xC5ngra",
      audio: "Ljud",
      audioLanguage: "Ljudspr\xE5k",
      currentAudioOutput: "Aktuellt ljudl\xE4ge",
      info: "Info",
      actor: "Sk\xE5dis",
      readMore: "L\xE4s mer",
      readLess: "Visa mindre",
      knownFor: "K\xE4nd f\xF6r",
      credits: "Credits",
      gender: "K\xF6n",
      birth: "F\xF6dd",
      bornIn: "F\xF6dd i:",
      alsoKnownAs: "\xC4ven k\xE4nd som:",
      noBiography: "Ingen biografi finns p\xE5 TMDb.",
      soundtrack: "Soundtrack",
      soundtrackLoadError: "Kunde inte ladda soundtrack",
      noSoundtrackFound: "Inget soundtrack hittades p\xE5 Spotify",
      searchOnSpotify: "S\xF6k p\xE5 Spotify",
      searching: "S\xF6ker\u2026",
      instantPlayTitle: "Direktspelning",
      zappFindTitle: "Hitta film",
      // Settings
      settingsTitle: "Inst\xE4llningar",
      settingsDesc: "Konfigurera integrationer f\xF6r den h\xE4r appen.",
      profilesTitle: "Profiler",
      profilesDesc: "Skapa separata lokala profiler med egen browser-cache och egen uppspelningshistorik.",
      profileName: "Profilnamn",
      profileNamePlaceholder: "Till exempel Familj eller Barn",
      createProfile: "Skapa profil",
      deleteProfile: "Ta bort profil",
      resetProfile: "Nollst\xE4ll profil",
      activeProfile: "Aktiv profil",
      switchProfile: "Byt profil",
      profileSwitcher: "Profil",
      scraperTitle: "Scraper",
      scraperDesc: "V\xE4lj vilken Stremio-scraper som anv\xE4nds f\xF6r att hitta streams. Torrentio r\xE4cker med RD-nyckel, men kan konfigureras vid behov.",
      configure: "Konfigurera",
      customScraper: "Anpassad",
      customScraperDesc: "Valfri Stremio-kompatibel scraper med RD-st\xF6d.",
      rdApiKeyLabel: "Real-Debrid API-nyckel",
      scraperManifestPlaceholder: "Klistra in manifest-URL h\xE4r...",
      customManifestPlaceholder: "https://din-scraper.example.com/manifest.json",
      hevcTitle: "HEVC / H.265-kodek",
      hevcDesc: "Kr\xE4vs f\xF6r att spela MKV/HEVC-str\xF6mmar i webbl\xE4saren. Installerar Microsoft HEVC-videotill\xE4gget via PowerShell.",
      installHevc: "Installera HEVC-kodek",
      installed: "Installerad",
      checking: "Kontrollerar\u2026",
      installing: "Installerar\u2026",
      hevcRestart: "Starta om webbl\xE4saren f\xF6r att kodeken ska aktiveras.",
      tmdbApiToken: "API-token (Bearer)",
      tmdbApiKey: "API-nyckel (v3)",
      language: "Spr\xE5k",
      region: "Region",
      tmdbEnvNote: "",
      homekitTitle: "HomeKit",
      homekitDesc: "Bygg in Lumio som ett eget HomeKit-tillbeh\xF6r och styr pairing h\xE4rifr\xE5n.",
      homekitEnableAccessory: "Aktivera HomeKit-tillbeh\xF6r",
      name: "Namn",
      homekitStatusLabel: "Status",
      homekitNotConnected: "Inte ansluten",
      homekitDisabled: "Avst\xE4ngd",
      homekitReady: "Redo f\xF6r pairing",
      homekitNotPublished: "Ej publicerad",
      homekitStatusFetchError: "Kunde inte h\xE4mta HomeKit-status",
      homekitServerError: "Kunde inte kontakta HomeKit-servern",
      homekitActionFailed: "HomeKit-operation misslyckades",
      homekitResetInfo: "Pairing nollst\xE4lld. Ny HomeKit-identitet skapad f\xF6r ny parkoppling.",
      homekitEventRules: "Event-regler",
      movieStarts: "Film startar",
      moviePaused: "Film pausas",
      videoClosed: "Video st\xE4ngs",
      openGuide: "\xD6ppna guide",
      closeGuide: "St\xE4ng guide",
      startPairing: "Starta pairing",
      resetPairing: "Nollst\xE4ll pairing",
      refreshStatus: "Uppdatera status",
      starting: "Startar...",
      resetting: "Nollst\xE4ller...",
      homekitGuideTitle: "HomeKit-guide",
      homekitGuideStep1: "Tryck p\xE5 Starta pairing.",
      homekitGuideStep2: "L\xE4gg till tillbeh\xF6ret i Hem-appen och ange PIN-koden fr\xE5n f\xE4ltet ovan.",
      homekitGuideStep3: "D\xF6p switcharna till samma namn som event-reglerna.",
      homekitGuideStep4: "Skapa en automation per switch med triggern Sl\xE5s p\xE5.",
      homekitGuideStep5: "V\xE4lj dina lampor och st\xE4ll in ljusstyrka/scen f\xF6r varje event.",
      homekitSwitchesToUse: "Switchar att anv\xE4nda",
      homekitSwitchesList: "Film startar, Film pausas, Video st\xE4ngs",
      groqTitle: "Groq AI Search",
      groqDescPrefix: "Aktiverar AI-s\xF6kning med naturligt spr\xE5k.",
      spotifyTitle: "Spotify",
      localFilesTitle: "Lokala filer",
      localFilesDesc: "V\xE4lj en mapp med videofiler. Lumio matchar filnamn mot TMDb och visar dem i ett eget bibliotek.",
      chooseFolder: "V\xE4lj mapp",
      removeFolder: "Ta bort mapp",
      playbackTitle: "Uppspelning",
      playbackDesc: "Inst\xE4llningar f\xF6r videouppspelning.",
      homeSectionsTitle: "Startsida",
      homeSectionsDesc: "V\xE4lj ordning, layout och antal kort f\xF6r varje rad p\xE5 startsidan. Upp till 3 egna sektioner st\xF6ds.",
      homeBackgroundTitle: "Bakgrund p\xE5 startsidan",
      homeBackgroundDesc: "Anv\xE4nd egna bild-URL:er i st\xE4llet f\xF6r den slumpade bakgrunden.",
      homeBackgroundPlaceholder: "https://exempel.se/bakgrund-1.jpg\nhttps://exempel.se/bakgrund-2.jpg",
      uploadImages: "Ladda upp bilder",
      enabled: "Aktiverad",
      uploadedImage: "Uppladdad bild",
      localUploadStored: "Sparas lokalt i Lumio",
      remove: "Ta bort",
      drag: "Dra",
      moveUp: "Flytta upp",
      moveDown: "Flytta ner",
      moveUpShort: "Upp",
      moveDownShort: "Ner",
      homeRowRecent: "Senast sett",
      homeRowTrending: "Trendar",
      homeRowMovies: "Popul\xE4ra filmer",
      homeRowSeries: "Popul\xE4ra serier",
      homeRowTrailers: "Trailers",
      homeRowLiveTv: "Live TV",
      homeRowTraktCollection: "Watchlist",
      homeRowCustom1: "Egen rad 1",
      homeRowCustom2: "Egen rad 2",
      homeRowCustom3: "Egen rad 3",
      homeSearchTitle: "S\xF6kf\xE4lt p\xE5 startsidan",
      homeSearchDesc: "Visa eller d\xF6lj det stora s\xF6kf\xE4ltet p\xE5 startsidan.",
      homeSearchToggleLabel: "D\xF6lj s\xF6kf\xE4lt p\xE5 startsidan",
      homeTopMenuTitle: "\xD6vre meny",
      homeTopMenuDesc: "V\xE4lj vilka \xF6vre knappar som ska visas och \xE4ndra ordningen.",
      homeTopMenuSettingsShortcut: "Inst\xE4llningar kan alltid \xF6ppnas med Cmd+, p\xE5 Mac eller Ctrl+, p\xE5 andra tangentbord.",
      homeMainMenuTitle: "Startsidans meny",
      homeMainMenuDesc: "V\xE4lj vilka menyknappar som ska visas och \xE4ndra ordningen med upp och ner.",
      profileSelector: "Profilv\xE4ljare",
      alwaysVisible: "Visas alltid",
      collapseSection: "Kollapsa sektion",
      expandSection: "Expandera sektion",
      homeSource: "K\xE4lla",
      homeSourceMovies: "Filmer",
      homeSourceSeries: "Serier",
      homeSourceSeriesWatchlist: "Nya avsnitt",
      homeSourceSeriesWatchlistSubtitle: "Watchlist",
      homeSourceMovieWatchlist: "Min lista",
      homeSourceTraktCollection: "Watchlist",
      homeWatchlistList: "Lista",
      homeWatchlistType: "Typ",
      homeSourcePlexRecentAdded: "Plex nyligen tillagt",
      pluginYoutubeNotConnected: "Inte ansluten",
      pluginYoutubeConnection: "Anslutning",
      pluginYoutubeConnectionNote: "Det h\xE4r pluginet anv\xE4nder ditt eget Google Desktop Client ID och din YouTube Data API-nyckel.",
      pluginYoutubeClientId: "Google OAuth Client ID",
      pluginYoutubeApiKey: "YouTube API-nyckel",
      pluginYoutubeOwnAppTitle: "S\xE5 skapar du din egen app",
      pluginYoutubeOwnAppStep1: "1. Skapa ett Google Cloud-projekt.",
      pluginYoutubeOwnAppStep2: "2. Aktivera YouTube Data API v3.",
      pluginYoutubeOwnAppStep3: "3. Konfigurera OAuth consent screen.",
      pluginYoutubeOwnAppStep4: "4. Skapa ett OAuth Client ID f\xF6r Desktop app.",
      pluginYoutubeOwnAppStep5: "5. Skapa en API-nyckel begr\xE4nsad till YouTube Data API v3.",
      pluginYoutubeOwnAppStep6: "6. Klistra in client ID och API-nyckel h\xE4r och anslut YouTube igen.",
      pluginYoutubeOwnAppNote: "F\xF6r privat bruk beh\xF6ver du ingen egen dom\xE4n. F\xF6r localhost/webbutveckling kan du ocks\xE5 skapa en Web application client, men vanlig pluginanv\xE4ndning ska anv\xE4nda en Desktop app client.",
      pluginYoutubeVideoOptions: "Videoalternativ",
      pluginYoutubeHero: "Hero",
      pluginYoutubeHeroHelp: "Anv\xE4nder den senaste videon fr\xE5n kanaler du f\xF6ljer som hero p\xE5 startsidan. N\xE4r den \xF6ppnas d\xF6ljs den tills en nyare video dyker upp.",
      pluginYoutubeKeepHero: "Beh\xE5ll hero",
      pluginYoutubeKeepHeroHelp: "Beh\xE5ller den senaste YouTube-heron synlig \xE4ven efter att du \xF6ppnat den, och byter bara n\xE4r en nyare video dyker upp vid uppstart/warmup.",
      pluginYoutubeHideShorts: "D\xF6lj shorts",
      pluginYoutubeHideShortsHelp: "D\xF6ljer korta YouTube-videor fr\xE5n grids n\xE4r durationsdata finns tillg\xE4nglig.",
      pluginYoutubeConnect: "Anslut YouTube",
      pluginYoutubeConnecting: "Ansluter\u2026",
      pluginYoutubeRefresh: "Uppdatera",
      pluginYoutubeRefreshing: "Uppdaterar\u2026",
      pluginYoutubeReconnect: "Reconnect",
      pluginYoutubeDisconnect: "Koppla fr\xE5n",
      pluginYoutubeDisconnecting: "Kopplar fr\xE5n\u2026",
      pluginYoutubeClearCache: "Rensa cache",
      pluginYoutubeConnectError: "Kunde inte ansluta YouTube.",
      pluginYoutubeDisconnectError: "Kunde inte koppla fr\xE5n YouTube.",
      pluginYoutubeLoadError: "Kunde inte ladda YouTube-data.",
      pluginYoutubeRowLoadError: "Kunde inte ladda YouTube-raden.",
      pluginYoutubeFollowingPage: "F\xF6ljer",
      pluginYoutubeChannelsPage: "Kanaler",
      pluginYoutubePlaylistsPage: "Spellistor",
      pluginYoutubeChannelPage: "Kanal",
      pluginYoutubePlaylistPage: "Spellista",
      pluginYoutubeFollowingSubtitle: "Senaste videorna fr\xE5n kanaler du f\xF6ljer.",
      pluginYoutubeChannelsSubtitle: "S\xF6k efter nya kanaler och hantera vilka du f\xF6ljer.",
      pluginYoutubePlaylistsSubtitle: "Dina sparade YouTube-spellistor.",
      pluginYoutubeChannelSubtitle: "Senaste videorna fr\xE5n den h\xE4r kanalen.",
      pluginYoutubePlaylistSubtitle: "Videor i spellistan",
      pluginYoutubeMatchingChannels: "Matchande kanaler",
      pluginYoutubeYourSubscriptions: "Dina prenumerationer",
      pluginYoutubeSearchChannels: "S\xF6k kanaler",
      pluginYoutubeSetupPrompt: "L\xE4gg in ditt Google Desktop Client ID och din YouTube API-nyckel i YouTube-pluginets inst\xE4llningar f\xF6r att komma ig\xE5ng.",
      pluginYoutubeConnectPrompt: "Anslut YouTube i inst\xE4llningarna f\xF6r att bl\xE4ddra bland dina prenumerationer, kanaler och spellistor.",
      pluginYoutubeLoading: "Laddar din YouTube-data\u2026",
      pluginYoutubePlaylistBadge: "Spellista",
      pluginYoutubeChannelBadge: "Kanal",
      pluginYoutubeVideoBadge: "Video",
      pluginYoutubeVideos: "videor",
      pluginYoutubeUnfollow: "Avf\xF6lj",
      pluginYoutubeOpenFeed: "\xD6ppna fl\xF6de",
      pluginYoutubeFollowingRow: "YouTube f\xF6ljer",
      pluginSectionIntro: "Hantera installerade plugins, bl\xE4ddra i den officiella marketplace-listan och l\xE4gg till plugin-k\xE4llor fr\xE5n GitHub eller ZIP-filer.",
      pluginRestartRequired: "Omstart kr\xE4vs f\xF6r att plugin\xE4ndringar ska sl\xE5 igenom helt.",
      pluginRestartNow: "Starta om nu",
      pluginInstalledTitle: "Installerade plugins",
      pluginPreinstalled: "F\xF6rinstallerad",
      pluginOfficialBadge: "Officiell",
      pluginManualSourceBadge: "Manuell k\xE4lla",
      pluginInactiveBadge: "Inaktiv",
      pluginUpdateAvailable: "Uppdatering finns",
      pluginMetadataOnly: "Endast metadata",
      pluginRepoLabel: "Repo",
      pluginManifestLabel: "Manifest",
      pluginUpdateNotice: "En nyare pluginversion finns i marketplace-k\xE4llan.",
      pluginActiveState: "Aktiv",
      pluginInactiveState: "Inaktiv",
      pluginDeactivate: "Inaktivera",
      pluginActivate: "Aktivera",
      pluginUninstall: "Avinstallera",
      pluginMarketplaceTitle: "Officiell marketplace",
      pluginMarketplaceIntro: "Installera officiella Lumio-plugins fr\xE5n det delade marketplace-repot.",
      pluginMarketplaceFallback: "Anv\xE4nder fallback-data f\xF6r marketplace",
      pluginMarketplaceLive: "Live-manifest",
      pluginMarketplaceStatic: "Fallback-manifest",
      pluginMarketplaceChecked: "Kontrollerad",
      pluginCheckUpdates: "S\xF6k uppdateringar",
      pluginBundledRuntime: "Bundlad runtime",
      pluginSharedRepoSuffix: "i delat marketplace-repo",
      pluginInstall: "Installera",
      pluginNoReadmePreview: "Ingen README-f\xF6rhandsvisning tillg\xE4nglig.",
      pluginNoChangelogPreview: "Ingen changelog-f\xF6rhandsvisning tillg\xE4nglig.",
      pluginAllOfficialInstalled: "Alla officiella marketplace-plugins \xE4r installerade.",
      pluginAddSourceTitle: "L\xE4gg till plugin-k\xE4lla",
      pluginAddSourceIntro: "L\xE4gg till ett GitHub-repo som inneh\xE5ller ett Lumio-pluginmanifest, eller ladda upp en plugin-ZIP. Uppt\xE4ckta plugins visas nedan som installerbara val.",
      pluginGithubRepoUrl: "GitHub repo-URL",
      pluginAddGithubSource: "L\xE4gg till GitHub-k\xE4lla",
      pluginChooseReleaseZip: "V\xE4lj en release-ZIP",
      pluginChooseReleaseZipHelp: "Det h\xE4r repot har flera release-ZIP-filer. V\xE4lj vilken asset Lumio ska inspektera.",
      pluginUploadZipTitle: "Ladda upp plugin-ZIP",
      pluginUploadZipHelp: "Importera en plugin-ZIP direkt, till exempel ett nedladdat scraper-paket eller ett zippat pluginrepo. Du kan ocks\xE5 dra och sl\xE4ppa en ZIP h\xE4r.",
      pluginUploadZip: "Ladda upp ZIP",
      pluginLastZipPreview: "Senaste ZIP-f\xF6rhandsvisning",
      pluginSourceHelp: "GitHub-k\xE4llor b\xF6r helst exponera en marketplace.json i roten. Om den saknas f\xF6rs\xF6ker Lumio ocks\xE5 automatiskt inspektera den senaste GitHub release-ZIP-filen. ZIP-importer kan inneh\xE5lla antingen en marketplace.json eller en eller flera plugin.json-filer.",
      pluginAddedSources: "Tillagda k\xE4llor",
      pluginGithubSourceBadge: "GitHub-k\xE4lla",
      pluginZipSourceBadge: "ZIP-k\xE4lla",
      pluginAddedAt: "Tillagd",
      pluginRemoveSource: "Ta bort k\xE4lla",
      pluginReleaseAssets: "Release-assets",
      pluginFilesFound: "Hittade filer",
      pluginInstallAllFromSource: "Installera alla fr\xE5n k\xE4llan",
      pluginAllSourceInstalled: "Alla plugins fr\xE5n den h\xE4r k\xE4llan \xE4r redan installerade.",
      pluginRuntimeAvailable: "Runtime tillg\xE4nglig",
      pluginMetadataOnlyNow: "Endast metadata just nu",
      open: "\xD6ppna",
      clear: "Rensa",
      homeSourceLiveTvLists: "Live TV-listor",
      homeSourceMyFiles: "Mina filer",
      liveTvList: "Live TV-lista",
      liveTvChooseList: "V\xE4lj en Live TV-lista",
      homeMenuPremiereStar: "Premi\xE4rstj\xE4rna",
      plexMenu: "Plex",
      traktTitle: "Trakt",
      traktDesc: "Logga in med Trakt f\xF6r att synka sedda serieavsnitt, listor och din samling med Lumio. Plex-kort st\xF6ds \xE4nnu inte p\xE5litligt f\xF6r Trakt-synk.",
      traktSignedInAs: "Inloggad som",
      traktSignedInFallback: "Trakt-anv\xE4ndare",
      traktSyncDesc: "Synk h\xE4mtar data fr\xE5n Trakt till Lumio och skickar ocks\xE5 upp dina lokala Lumio-listor och sedda avsnitt till Trakt. F\xF6lj/Min lista fr\xE5n Plex fungerar \xE4nnu inte garanterat mot Trakt.",
      traktImportData: "Synka Trakt-data",
      traktImporting: "Synkar...",
      traktImportDone: "Trakt-synk klar",
      traktDisconnect: "Koppla fr\xE5n",
      traktConnect: "Logga in med Trakt",
      traktWaiting: "V\xE4ntar p\xE5 Trakt...",
      traktOpenLinkAndCode: "\xD6ppna l\xE4nken och skriv in koden",
      traktStartLoginFailed: "Kunde inte starta Trakt-inloggning",
      traktLoginFailed: "Trakt-inloggning misslyckades",
      traktImportFailed: "Kunde inte synka med Trakt",
      plexTitle: "Plex",
      plexDesc: "Logga in med Plex, v\xE4lj server och bibliotek, och anv\xE4nd Plex nyligen tillagt som en rad p\xE5 startsidan.",
      plexSignedInAs: "Ansluten som",
      plexSignedInFallback: "Plex-anv\xE4ndare",
      plexConnect: "Logga in med Plex",
      plexWaiting: "V\xE4ntar p\xE5 Plex...",
      plexOpenLinkAndCode: "\xD6ppna l\xE4nken och godk\xE4nn Lumio",
      plexChooseProfile: "Profil",
      plexProfilePin: "Profil-PIN",
      plexProfilePinPlaceholder: "Ange Plex-profilens PIN",
      plexApplyProfile: "Anv\xE4nd profil",
      plexRefreshingProfiles: "Uppdaterar profiler...",
      plexProfileApplied: "Plex-profil aktiverad",
      plexChooseServer: "Server",
      plexChooseLibraries: "Bibliotek",
      plexRefreshLibraries: "Uppdatera bibliotek",
      plexRefreshingLibrariesButton: "Uppdaterar bibliotek...",
      plexRefreshLibrariesDone: "Plex-biblioteken uppdaterades",
      plexRefreshLibrariesEmpty: "Inga film- eller seriebibliotek hittades p\xE5 den h\xE4r servern.",
      plexRefreshLibrariesFailed: "Kunde inte uppdatera Plex-bibliotek",
      plexRequestFailed: "Kunde inte n\xE5 Plex. Kontrollera att vald server \xE4r online och n\xE5bar.",
      plexDisconnect: "Koppla fr\xE5n",
      plexNoServers: "Inga Plex-servrar hittades.",
      plexNoLibraries: "Inga film- eller seriebibliotek hittades p\xE5 den h\xE4r servern.",
      plexRecentlyAdded: "Plex nyligen tillagt",
      homeSourceCinemaMovies: "P\xE5 bio",
      homeSourceTopRatedMovies: "H\xF6gst betyg filmer",
      homeSourceTopRatedSeries: "H\xF6gst betyg serier",
      homeSourceReleaseRecentMovies: "Releases: nyligen filmer",
      homeSourceReleaseRecentSeries: "Releases: nyligen serier",
      homeSourceReleaseUpcomingMovies: "Releases: kommande filmer",
      homeSourceReleaseUpcomingSeries: "Releases: kommande serier",
      homeSourceStreamingMovies: "Trendande filmer (streaming)",
      homeSourceStreamingSeries: "Trendande serier (streaming)",
      homeLayout: "Layout",
      homeLayoutSlider: "Slider",
      homeLayoutGrid: "Grid",
      homeLayoutFull: "Visa allt",
      homeCount: "Kort",
      homeCountDesc: "Max antal kort som visas i den h\xE4r raden.",
      homeSliderGlobal: "Sliderkort",
      homeSliderGlobalDesc: "Hur m\xE5nga kort en slider max visar p\xE5 bred layout.",
      homeSliderOverride: "Slider override",
      homeSliderDisplay: "Visning",
      homeSliderUseGlobal: "Globalt v\xE4rde",
      homeFullModeNote: "Bara en sektion kan anv\xE4nda Visa allt. Senast sett kan fortfarande ligga kvar ovanf\xF6r som slider.",
      pinChannel: "Pinna kanal",
      unpinChannel: "Avpinna kanal",
      aspectRatio: "Bildformat",
      aspectRatioDesc: "V\xE4lj hur videon ska placeras i spelaren.",
      cropZoom: "Zoom / besk\xE4r",
      cropZoomOff: "Av",
      cropZoomCrop: "Besk\xE4r",
      cropZoomZoom: "Zoom",
      cropZoomZoomPlus: "Zoom +",
      rememberAspectRatio: "Kom ih\xE5g bildformat",
      rememberAspectRatioDesc: "Anv\xE4nder ditt valda bildformat som standard f\xF6r nya filmer och avsnitt.",
      autoSkipIntro: "Auto-skippa intro",
      autoSkipIntroDesc: "Om det \xE4r p\xE5slaget hoppas intro \xF6ver automatiskt. Om det \xE4r av visas en Skippa intro-knapp n\xE4r IntroDB har en tr\xE4ff.",
      autoplayStreamOnPlay: "Auto-spela fr\xE5n Play-knappen",
      autoplayStreamOnPlayDesc: "F\xF6r vanliga kort testar Play upp till 3 streams automatiskt. K\xE4nda fel spr\xE5ksp\xE5r och f\xF6r stora filer hoppas \xF6ver n\xE4r det g\xE5r.",
      hideWatchedMoviesHome: "D\xF6lj sedda filmer p\xE5 startsidan",
      hideWatchedMoviesHomeDesc: "Exkludera filmer som markerats som sedda fr\xE5n startsidans gridar och sliders, \xE4ven Plex-rader.",
      stillWatching: "Tittar du fortfarande?",
      stillWatchingDesc: "G\xE4ller bara TV-serier. Pausar uppspelningen efter vald tid utan kontrollinteraktion, n\xE4r minst 3 avsnitt har spelats i samma session.",
      stillWatchingMaxMinutes: "Max tid f\xF6r fortfarande tittar",
      stillWatchingMaxMinutesDesc: "Standard matchar Netflix-tiden: 90 minuter. Prompten visas bara f\xF6r TV-serier efter minst 3 avsnitt.",
      stillWatchingContinue: "Forts\xE4tt titta",
      stillWatchingExit: "St\xE4ng spelaren",
      autoplayMaxStreamSize: "Max storlek per stream",
      autoplayMaxStreamSizeDesc: "Valfri gr\xE4ns i GB f\xF6r autoplay-f\xF6rs\xF6k. L\xE4mna tomt f\xF6r ingen storleksgr\xE4ns.",
      introDebugReady: "IntroDB klar",
      introDebugLoading: "IntroDB laddar",
      introDebugFound: "Intro hittat",
      introDebugMissing: "Ingen introtr\xE4ff",
      introDebugAutoOn: "Auto-skip p\xE5",
      introDebugAutoOff: "Auto-skip av",
      aspectAuto: "Auto",
      aspectContain: "Anpassa",
      aspectFill: "Fyll",
      aspect16_9: "16:9",
      aspect4_3: "4:3",
      audioMode: "Ljudl\xE4ge",
      audioModeDesc: "V\xE4lj mellan maximal kompatibilitet eller b\xE4sta m\xF6jliga flerkanal i proxyspelning.",
      audioModeCompatible: "Kompatibel",
      audioModeCompatibleDesc: "S\xE4krast uppspelning. Proxyljud kodas till stereo AAC.",
      audioModeBest: "B\xE4sta m\xF6jliga",
      audioModeBestDesc: "Beh\xE5ller flerkanal i proxy n\xE4r m\xF6jligt. Tauri/mpv forts\xE4tter anv\xE4nda originalsp\xE5ret direkt.",
      nightMode: "Nattl\xE4ge / DRC",
      nightModeDesc: "D\xE4mpar h\xF6ga toppar och g\xF6r dialog l\xE4ttare att h\xF6ra p\xE5 l\xE5g volym.",
      nightModeOff: "Av",
      nightModeMild: "Mild nattl\xE4ge",
      nightModeStrong: "Stark nattl\xE4ge",
      defaultSubtitleLanguage: "Standard spr\xE5k f\xF6r textning",
      defaultSubtitleLanguageDesc: "V\xE4ljs automatiskt n\xE4r undertexter finns tillg\xE4ngliga.",
      fallbackSubtitleLanguage: "Sekund\xE4rt spr\xE5k f\xF6r textning",
      fallbackSubtitleLanguageDesc: "Anv\xE4nds bara om det prim\xE4ra undertextspr\xE5ket inte finns.",
      defaultAudioTrack: "Standard ljudsp\xE5r",
      defaultAudioTrackDesc: "F\xF6rs\xF6ker v\xE4lja spr\xE5k automatiskt n\xE4r flera ljudsp\xE5r finns.",
      disableSubtitlesWhenAudioMatches: "St\xE4ng av textning n\xE4r ljudspr\xE5ket matchar",
      disableSubtitlesWhenAudioMatchesDesc: "Om ditt valda standardspr\xE5k f\xF6r ljud hittas, h\xE5lls textningen av som standard.",
      subtitleSize: "Textstorlek",
      subtitleSizeDesc: "Anv\xE4nds som standard f\xF6r nya filmer och avsnitt.",
      subtitleVerticalPositionDesc: "Hur h\xF6gt \xF6ver kontrollbaren textningen placeras.",
      subtitleOpacity: "Opacitet",
      subtitleOpacityDesc: "G\xE4ller hela undertexten inklusive bakgrund.",
      subtitleTextColor: "Textf\xE4rg",
      subtitleTextColorDesc: "Standardf\xE4rg f\xF6r undertexten.",
      subtitleBackgroundColor: "Bakgrundsf\xE4rg",
      subtitleBackgroundColorDesc: "Transparent motsvarar dagens stil.",
      subtitleOutlineColor: "Konturf\xE4rg",
      subtitleOutlineColorDesc: "Anv\xE4nds f\xF6r textens outline/skugga.",
      subtitlePreviewText: "S\xE5 h\xE4r kommer din textning att se ut",
      subtitlePreviewCaption: "F\xF6rhandsvisning av standardutseende",
      skipIntro: "Skippa intro",
      originalFirst: "Original / f\xF6rsta",
      noFallback: "Ingen fallback",
      autoplayNextEpisode: "Auto-spela n\xE4sta avsnitt",
      autoplayNextEpisodeDesc: "Laddar n\xE4sta avsnitt i f\xF6rv\xE4g och spelar det automatiskt vid seriens slut.",
      showPopup: "Visa popup",
      showPopupDesc: "Hur m\xE5nga sekunder f\xF6re slutet n\xE4sta-avsnitt-kortet visas.",
      preloadBeforePopup: "F\xF6rladda innan popup",
      preloadBeforePopupDesc: "Hur m\xE5nga sekunder f\xF6re popup vi b\xF6rjar h\xE4mta n\xE4sta avsnitt.",
      seconds: "sekunder",
      rdApiKey: "Real-Debrid API-nyckel",
      rdApiPlaceholder: "Din API-nyckel fr\xE5n real-debrid.com",
      rdApiNote: "Hitta din nyckel p\xE5 real-debrid.com \u203A Konto \u203A API-token. Nyckeln lagras bara i din webbl\xE4sare (localStorage).",
      streamQuality: "Kvalitetsfilter f\xF6r str\xF6mmar",
      streamQualityDesc: "D\xF6lj l\xE5gkvalitets- eller o\xF6nskade str\xF6mk\xE4llor.",
      hideCam: "D\xF6lj CAM / CAMRIP",
      hideCamDesc: "Filmad p\xE5 bio \u2014 mycket l\xE5g kvalitet",
      hideTs: "D\xF6lj TeleSync / TeleCine (TS/TC)",
      hideTsDesc: "L\xE5gkvalitets f\xF6rhandsutgivningskopior",
      hideScr: "D\xF6lj Screener (SCR)",
      hideScrDesc: "DVD/streaming screenerkopiyor",
      hideBelow720p: "D\xF6lj under 720p",
      hideBelow720pDesc: "480p, 360p och l\xE4gre uppl\xF6sningar",
      clearCache: "Rensa cache",
      clearing: "Rensar\u2026",
      cleared: "Rensat \u2014 starta om servern",
      save: "Spara",
      checkKey: "Kontrollera nyckel",
      testingConnection: "Testar anslutning\u2026",
      enterApiKeyFirst: "Ange en API-nyckel f\xF6rst.",
      connectedAs: "Ansluten som",
      // Calendar
      seriesCalendar: "Seriekalender",
      today: "Idag",
      followSeries: "F\xF6lj en serie f\xF6r att se avsnitt h\xE4r",
      noEpisodesDay: "Inga avsnitt den h\xE4r dagen.",
      openStreams: "\xD6ppna str\xF6mmar",
      more: "till",
      // Media type chips
      both: "B\xE5da",
      movies: "Filmer",
      // Release calendar
      releaseCalendar: "Releasekalender",
      recent: "Nyligen",
      upcoming: "Kommande",
      allServices: "Alla tj\xE4nster",
      premiere: "Premi\xE4r",
      newBadge: "Ny",
      newPremiere: "Ny premi\xE4r",
      loadMore: "Ladda mer",
      allLanguages: "Alla spr\xE5k",
      hideFilters: "D\xF6lj filter",
      sort: "Sortera",
      // Watchlist
      addToWatchlist: "L\xE4gg till i watchlist",
      removeFromWatchlist: "Ta bort fr\xE5n watchlist",
      watchlistNewPremieres: "Watchlist \u2013 nya premi\xE4rer",
      watchlistAllLists: "Watchlist",
      watchlistEmpty: "Inga stj\xE4rnm\xE4rkta titlar \xE4n.",
      watchlistEmptyHint: "Stj\xE4rnm\xE4rk titlar i releasekalendern f\xF6r att f\xF6lja premi\xE4rer.",
      seriesWatchlistEmpty: "Inga f\xF6ljda serier \xE4n.",
      newEpisodeBadge: "Nytt avsnitt",
      // Date presets
      days7: "7 dagar",
      days30: "30 dagar",
      days60: "60 dagar",
      days90: "90 dagar",
      thisYear: "I \xE5r",
      dateFrom: "Fr\xE5n",
      // Settings
      spotifyDesc: "Anv\xE4nds f\xF6r att visa soundtracks i detaljpanelen. Skapa en app p\xE5 developer.spotify.com och kopiera Client ID och Client Secret.",
      clearCacheDesc: "Rensa app-cache och byggartefakter om n\xE5got beter sig konstigt.",
      // Soundtrack
      openOnSpotify: "\xD6ppna p\xE5 Spotify"
    }
  };
  var LangContext = createContext({
    lang: "en",
    setLang: () => {
    },
    t: (key) => strings.en[key]
  });
  function useLang() {
    return useContext(LangContext);
  }

  // lib/profile-storage.ts
  var PROFILES_KEY = "app_profiles";
  var ACTIVE_PROFILE_KEY = "app_active_profile";
  var PROFILE_EVENT = "lumio-profile-changed";
  var PROFILE_PREFIX = "profile:";
  function readProfiles() {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "[]");
    } catch {
      return [];
    }
  }
  function onProfileChanged(listener) {
    window.addEventListener(PROFILE_EVENT, listener);
    return () => window.removeEventListener(PROFILE_EVENT, listener);
  }
  function getActiveProfileId() {
    if (typeof window === "undefined") return null;
    const value = localStorage.getItem(ACTIVE_PROFILE_KEY);
    return value && readProfiles().some((profile) => profile.id === value) ? value : null;
  }
  function getProfileStorageKey(baseKey, profileId = getActiveProfileId()) {
    return profileId ? `${PROFILE_PREFIX}${profileId}:${baseKey}` : baseKey;
  }
  function getScopedStorageItem(baseKey) {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(getProfileStorageKey(baseKey));
  }
  function setScopedStorageItem(baseKey, value) {
    localStorage.setItem(getProfileStorageKey(baseKey), value);
  }
  function removeScopedStorageItem(baseKey) {
    localStorage.removeItem(getProfileStorageKey(baseKey));
  }

  // lib/trakt-storage.ts
  var AUTH_KEY = "trakt_auth";
  var EVENT = "lumio-trakt-auth-changed";
  function getTraktAuth() {
    if (typeof window === "undefined") return null;
    try {
      const raw = getScopedStorageItem(AUTH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string" || typeof parsed.expiresAt !== "number") {
        return null;
      }
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: parsed.expiresAt,
        scope: typeof parsed.scope === "string" ? parsed.scope : "",
        tokenType: typeof parsed.tokenType === "string" ? parsed.tokenType : "bearer",
        username: typeof parsed.username === "string" ? parsed.username : null,
        name: typeof parsed.name === "string" ? parsed.name : null
      };
    } catch {
      return null;
    }
  }
  function emitChanged() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT));
    }
  }
  function setTraktAuth(auth) {
    if (typeof window === "undefined") return;
    if (!auth) {
      removeScopedStorageItem(AUTH_KEY);
      emitChanged();
      return;
    }
    setScopedStorageItem(AUTH_KEY, JSON.stringify(auth));
    emitChanged();
  }
  function clearTraktAuth() {
    setTraktAuth(null);
  }
  function onTraktAuthChanged(listener) {
    if (typeof window === "undefined") return () => {
    };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }

  // lib/movie-watchlist.ts
  var KEY = "movie_watchlist";
  var EVENT2 = "lumio-movie-watchlist-changed";
  var DETAIL_EVENT = "lumio-movie-watchlist-mutated";
  function normalizeTmdbId(tmdbId) {
    return tmdbId.replace(/^movie-/, "");
  }
  function read() {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(getScopedStorageItem(KEY) ?? "[]");
      const deduped = [];
      for (const entry of parsed) {
        const normalizedEntry = {
          ...entry,
          tmdbId: normalizeTmdbId(entry.tmdbId)
        };
        const existingIndex = deduped.findIndex(
          (candidate) => candidate.tmdbId === normalizedEntry.tmdbId || candidate.imdbId && normalizedEntry.imdbId && candidate.imdbId === normalizedEntry.imdbId
        );
        if (existingIndex >= 0) {
          deduped[existingIndex] = {
            ...deduped[existingIndex],
            ...normalizedEntry,
            imdbId: normalizedEntry.imdbId ?? deduped[existingIndex].imdbId ?? null,
            posterUrl: normalizedEntry.posterUrl ?? deduped[existingIndex].posterUrl,
            monitorForStreams: normalizedEntry.monitorForStreams ?? deduped[existingIndex].monitorForStreams
          };
        } else {
          deduped.push(normalizedEntry);
        }
      }
      return deduped;
    } catch {
      return [];
    }
  }
  function write(entries) {
    setScopedStorageItem(KEY, JSON.stringify(entries));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT2));
    }
  }
  function emitMutation(mutation) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DETAIL_EVENT, { detail: mutation }));
    }
  }
  function getMovieWatchlist() {
    return read();
  }
  function addToMovieWatchlist(entry, options) {
    const normalizedEntry = {
      ...entry,
      tmdbId: normalizeTmdbId(entry.tmdbId)
    };
    const list = read().filter(
      (e) => e.tmdbId !== normalizedEntry.tmdbId && !(normalizedEntry.imdbId && e.imdbId && e.imdbId === normalizedEntry.imdbId)
    );
    const nextEntry = { ...normalizedEntry, addedAt: (/* @__PURE__ */ new Date()).toISOString() };
    write([...list, nextEntry]);
    emitMutation({
      action: "add",
      entry: nextEntry,
      source: options?.source ?? "local"
    });
  }
  function removeFromMovieWatchlist(tmdbId, options) {
    const normalizedTmdbId = normalizeTmdbId(tmdbId);
    const existing = read().find((entry) => entry.tmdbId === normalizedTmdbId) ?? null;
    write(read().filter((e) => e.tmdbId !== normalizedTmdbId));
    if (existing) {
      emitMutation({
        action: "remove",
        entry: existing,
        source: options?.source ?? "local"
      });
    }
  }

  // lib/watchlist.ts
  var KEY2 = "rd_watchlist";
  var EVENT3 = "lumio-watchlist-changed";
  var DETAIL_EVENT2 = "lumio-watchlist-mutated";
  function read2() {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(getScopedStorageItem(KEY2) ?? "[]");
      const deduped = [];
      for (const entry of parsed) {
        const existingIndex = deduped.findIndex(
          (candidate) => candidate.tmdbId === entry.tmdbId || candidate.imdbId && entry.imdbId && candidate.imdbId === entry.imdbId
        );
        if (existingIndex >= 0) {
          deduped[existingIndex] = {
            ...deduped[existingIndex],
            ...entry,
            imdbId: entry.imdbId ?? deduped[existingIndex].imdbId ?? null,
            posterUrl: entry.posterUrl ?? deduped[existingIndex].posterUrl
          };
        } else {
          deduped.push(entry);
        }
      }
      return deduped;
    } catch {
      return [];
    }
  }
  function write2(entries) {
    setScopedStorageItem(KEY2, JSON.stringify(entries));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT3));
    }
  }
  function emitMutation2(mutation) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DETAIL_EVENT2, { detail: mutation }));
    }
  }
  function getWatchlist() {
    return read2();
  }
  function addToWatchlist(entry, options) {
    const list = read2().filter(
      (e) => e.tmdbId !== entry.tmdbId && !(entry.imdbId && e.imdbId && e.imdbId === entry.imdbId)
    );
    const nextEntry = { ...entry, addedAt: (/* @__PURE__ */ new Date()).toISOString() };
    write2([...list, nextEntry]);
    emitMutation2({
      action: "add",
      entry: nextEntry,
      source: options?.source ?? "local"
    });
  }
  function removeFromWatchlist(tmdbId, options) {
    const existing = read2().find((entry) => entry.tmdbId === tmdbId) ?? null;
    write2(read2().filter((e) => e.tmdbId !== tmdbId));
    if (existing) {
      emitMutation2({
        action: "remove",
        entry: existing,
        source: options?.source ?? "local"
      });
    }
  }

  // lib/watched-episodes.ts
  var KEY3 = "watched_episodes";
  var EVENT4 = "lumio-watched-episodes-changed";
  var DETAIL_EVENT3 = "lumio-watched-episode-mutated";
  function epKey(tmdbId, season, episode) {
    return `${tmdbId}-S${season}E${episode}`;
  }
  function read3() {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(getScopedStorageItem(KEY3) ?? "{}");
    } catch {
      return {};
    }
  }
  function write3(data) {
    setScopedStorageItem(KEY3, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT4));
    }
  }
  function setWatched(tmdbId, season, episode, watched, options) {
    const data = read3();
    if (watched) {
      data[epKey(tmdbId, season, episode)] = true;
    } else {
      delete data[epKey(tmdbId, season, episode)];
    }
    write3(data);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DETAIL_EVENT3, {
        detail: {
          tmdbId,
          imdbId: options?.imdbId ?? null,
          season,
          episode,
          watched,
          source: options?.source ?? "local"
        }
      }));
    }
  }
  function getWatchedEpisodes() {
    return Object.keys(read3()).map((key) => {
      const match = key.match(/^(.+)-S(\d+)E(\d+)$/);
      if (!match) return null;
      return {
        tmdbId: match[1],
        season: Number(match[2]),
        episode: Number(match[3])
      };
    }).filter((entry) => Boolean(entry));
  }

  // lib/watched-movies.ts
  var KEY_WATCHED_MOVIES = "watched_movies";
  var EVENT_WATCHED_MOVIES_CHANGED = "lumio-watched-movies-changed";
  var DETAIL_EVENT_WATCHED_MOVIE_MUTATED = "lumio-watched-movie-mutated";
  function normalizeId(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  function normalizeTitle(value) {
    if (typeof value !== "string") return null;
    const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return normalized.length > 0 ? normalized : null;
  }
  function normalizeYear(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  function readEntries() {
    if (typeof window === "undefined") return [];
    try {
      const raw = getScopedStorageItem(KEY_WATCHED_MOVIES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry) => Boolean(entry) && typeof entry === "object").map((entry) => ({
        tmdbId: normalizeId(typeof entry.tmdbId === "string" ? entry.tmdbId : null),
        imdbId: normalizeId(typeof entry.imdbId === "string" ? entry.imdbId : null),
        title: typeof entry.title === "string" ? entry.title : null,
        year: normalizeYear(typeof entry.year === "number" ? entry.year : null),
        posterUrl: typeof entry.posterUrl === "string" ? entry.posterUrl : null,
        watchedAt: typeof entry.watchedAt === "string" && entry.watchedAt.trim().length > 0 ? entry.watchedAt : (/* @__PURE__ */ new Date()).toISOString()
      })).filter((entry) => Boolean(entry.tmdbId || entry.imdbId || normalizeTitle(entry.title) && entry.year != null));
    } catch {
      return [];
    }
  }
  function writeEntries(entries) {
    if (typeof window === "undefined") return;
    setScopedStorageItem(KEY_WATCHED_MOVIES, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_WATCHED_MOVIES_CHANGED, {
      detail: {
        action: "add",
        entry: entries[0] ?? { watchedAt: (/* @__PURE__ */ new Date()).toISOString() },
        source: "local",
        entries
      }
    }));
  }
  function emitMutation3(mutation) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(DETAIL_EVENT_WATCHED_MOVIE_MUTATED, {
      detail: {
        ...mutation,
        entries: readEntries()
      }
    }));
  }
  function sameMovie(entry, target) {
    const entryTmdbId = normalizeId(entry.tmdbId);
    const entryImdbId = normalizeId(entry.imdbId);
    const entryTitle = normalizeTitle(entry.title);
    const entryYear = normalizeYear(entry.year);
    const targetTmdbId = normalizeId(target.tmdbId);
    const targetImdbId = normalizeId(target.imdbId);
    const targetTitle = normalizeTitle(target.title);
    const targetYear = normalizeYear(target.year);
    return Boolean(
      entryTmdbId && targetTmdbId && entryTmdbId === targetTmdbId || entryImdbId && targetImdbId && entryImdbId === targetImdbId
    ) || Boolean(
      entryTitle && targetTitle && entryYear != null && targetYear != null && entryTitle === targetTitle && entryYear === targetYear
    );
  }
  function getWatchedMovies() {
    return readEntries();
  }
  function setMovieWatched(entry, watched, options) {
    const tmdbId = normalizeId(entry.tmdbId);
    const imdbId = normalizeId(entry.imdbId);
    const title = entry.title ?? null;
    const year = normalizeYear(entry.year);
    if (!tmdbId && !imdbId && !(normalizeTitle(title) && year != null)) return;
    const current = readEntries();
    const next = current.filter((currentEntry) => !sameMovie(currentEntry, { tmdbId, imdbId, title, year }));
    const nextEntry = {
      tmdbId,
      imdbId,
      title,
      year,
      posterUrl: entry.posterUrl ?? null,
      watchedAt: options?.watchedAt ?? entry.watchedAt ?? (/* @__PURE__ */ new Date()).toISOString()
    };
    if (watched) {
      next.unshift(nextEntry);
    }
    writeEntries(next);
    emitMutation3({
      action: watched ? "add" : "remove",
      entry: nextEntry,
      source: options?.source ?? "local"
    });
  }

  // lib/watchlist-item-cache.ts
  var KEY4 = "watchlist_item_cache";
  function buildKey(tmdbId, type) {
    return `${type}:${tmdbId}`;
  }
  function read4() {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(getScopedStorageItem(KEY4) ?? "{}");
    } catch {
      return {};
    }
  }
  function write4(cache2) {
    setScopedStorageItem(KEY4, JSON.stringify(cache2));
  }
  function cacheWatchlistItems(items) {
    if (typeof window === "undefined" || items.length === 0) return;
    const cache2 = read4();
    let changed = false;
    for (const { tmdbId, item } of items) {
      if (!tmdbId || !item) continue;
      cache2[buildKey(tmdbId, item.type)] = item;
      changed = true;
    }
    if (changed) write4(cache2);
  }

  // lib/trakt-sync.ts
  async function readTraktError(response, fallback) {
    try {
      const payload = await response.json();
      return payload.error || fallback;
    } catch {
      return fallback;
    }
  }
  var pendingShowEntries = /* @__PURE__ */ new Map();
  var pendingMovieEntries = /* @__PURE__ */ new Map();
  var pendingWatchedEpisodes = /* @__PURE__ */ new Map();
  var pendingWatchedMovies = /* @__PURE__ */ new Map();
  var autoSyncTimer = null;
  var autoSyncBackoffUntil = 0;
  var TRAKT_WATCHLIST_PREFETCH_DELAY_MS = 250;
  var TRAKT_WATCHLIST_PREFETCH_BATCH_SIZE = 6;
  function applyAuthUpdate(nextAuth) {
    if (!nextAuth) return getTraktAuth();
    const merged = {
      accessToken: nextAuth.accessToken,
      refreshToken: nextAuth.refreshToken,
      expiresAt: nextAuth.expiresAt,
      scope: nextAuth.scope ?? "",
      tokenType: nextAuth.tokenType ?? "bearer",
      username: nextAuth.username ?? null,
      name: nextAuth.name ?? null
    };
    const current = getTraktAuth();
    if (current?.accessToken === merged.accessToken) return merged;
    setTraktAuth(merged);
    return merged;
  }
  function traktEntryKey(entry) {
    if (entry.imdbId) return `imdb:${entry.imdbId}`;
    if (entry.tmdbId) return `tmdb:${entry.tmdbId}`;
    return `title:${entry.title ?? ""}`;
  }
  function watchedEpisodeKey(entry) {
    return `${entry.imdbId ? `imdb:${entry.imdbId}` : `tmdb:${entry.tmdbId ?? ""}`}:S${entry.season}E${entry.episode}`;
  }
  function hasPendingWatchedState(entry, watched) {
    const pending = pendingWatchedEpisodes.get(watchedEpisodeKey(entry));
    return pending?.watched === watched;
  }
  function watchedMovieKey(entry) {
    if (entry.imdbId) return `imdb:${entry.imdbId}`;
    if (entry.tmdbId) return `tmdb:${entry.tmdbId}`;
    return `title:${entry.title ?? ""}:${entry.year ?? ""}`;
  }
  function hasPendingWatchedMovieState(entry, watched) {
    const pending = pendingWatchedMovies.get(watchedMovieKey(entry));
    return pending?.watched === watched;
  }
  function sameWatchlistEntry(left, right) {
    return Boolean(
      left.tmdbId && right.tmdbId && left.tmdbId === right.tmdbId || left.imdbId && right.imdbId && left.imdbId === right.imdbId
    );
  }
  function hasPendingLocalAdd(mediaType, entry) {
    const key = traktEntryKey(entry);
    const pending = mediaType === "show" ? pendingShowEntries.get(key) : pendingMovieEntries.get(key);
    return pending?.action === "add";
  }
  function scheduleWatchlistPrefetch(entries) {
    if (typeof window === "undefined" || entries.length === 0) return;
    const uniqueEntries = Array.from(
      new Map(
        entries.filter((entry) => entry.tmdbId).map((entry) => [`${entry.type}:${entry.tmdbId}`, entry])
      ).values()
    );
    window.setTimeout(() => {
      void prefetchWatchlistItems(uniqueEntries);
    }, TRAKT_WATCHLIST_PREFETCH_DELAY_MS);
  }
  async function prefetchWatchlistItems(entries) {
    for (let start = 0; start < entries.length; start += TRAKT_WATCHLIST_PREFETCH_BATCH_SIZE) {
      const batch = entries.slice(start, start + TRAKT_WATCHLIST_PREFETCH_BATCH_SIZE);
      const updates = await Promise.all(
        batch.map(async (entry) => {
          try {
            const response = await fetch(`/api/item?tmdbId=${entry.tmdbId}&type=${entry.type}`);
            if (!response.ok) return { tmdbId: entry.tmdbId, item: null };
            const payload = await response.json();
            return { tmdbId: entry.tmdbId, item: payload.item ?? null };
          } catch {
            return { tmdbId: entry.tmdbId, item: null };
          }
        })
      );
      cacheWatchlistItems(updates);
    }
  }
  function clearPendingTraktSync() {
    pendingShowEntries.clear();
    pendingMovieEntries.clear();
    pendingWatchedEpisodes.clear();
    pendingWatchedMovies.clear();
    if (autoSyncTimer && typeof window !== "undefined") {
      window.clearTimeout(autoSyncTimer);
    }
    autoSyncTimer = null;
    autoSyncBackoffUntil = 0;
  }
  async function fetchTraktProfile() {
    const auth = getTraktAuth();
    if (!auth) return null;
    const response = await fetch("/api/trakt/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth })
    });
    if (!response.ok) return auth;
    const payload = await response.json();
    if (!payload.auth) return auth;
    return applyAuthUpdate({
      accessToken: payload.auth.accessToken,
      refreshToken: payload.auth.refreshToken,
      expiresAt: payload.auth.expiresAt,
      scope: payload.auth.scope,
      tokenType: payload.auth.tokenType,
      username: payload.profile?.username ?? payload.auth?.username ?? null,
      name: payload.profile?.name ?? payload.auth?.name ?? null
    });
  }
  async function importTraktWatched() {
    const auth = getTraktAuth();
    if (!auth) return 0;
    const response = await fetch("/api/trakt/sync/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth, action: "import" })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to import watched episodes from Trakt"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    const remoteEpisodes = payload.episodes ?? [];
    const remoteMovies = payload.movies ?? [];
    const remoteKeys = new Set(remoteEpisodes.map((episode) => watchedEpisodeKey(episode)));
    for (const localEpisode of getWatchedEpisodes()) {
      if (!remoteKeys.has(watchedEpisodeKey(localEpisode)) && !hasPendingWatchedState(localEpisode, true)) {
        setWatched(localEpisode.tmdbId, localEpisode.season, localEpisode.episode, false, { source: "trakt" });
      }
    }
    for (const episode of remoteEpisodes) {
      setWatched(episode.tmdbId, episode.season, episode.episode, true, { source: "trakt" });
    }
    const remoteMovieKeys = new Set(remoteMovies.map((movie) => watchedMovieKey(movie)));
    for (const localMovie of getWatchedMovies()) {
      if (!remoteMovieKeys.has(watchedMovieKey(localMovie)) && !hasPendingWatchedMovieState(localMovie, true)) {
        setMovieWatched(localMovie, false, { source: "trakt" });
      }
    }
    for (const movie of remoteMovies) {
      setMovieWatched({
        tmdbId: movie.tmdbId ?? void 0,
        imdbId: movie.imdbId ?? void 0,
        title: movie.title ?? void 0,
        year: movie.year ?? void 0,
        posterUrl: movie.posterUrl ?? void 0
      }, true, { watchedAt: movie.watchedAt ?? void 0, source: "trakt" });
    }
    return remoteEpisodes.length + remoteMovies.length;
  }
  async function markTraktEpisodesWatched(input) {
    const auth = getTraktAuth();
    if (!auth || input.length === 0) return false;
    const response = await fetch("/api/trakt/sync/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth,
        action: "mark_watched",
        episodes: input
      })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to push watched episodes to Trakt"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return true;
  }
  async function markTraktMoviesWatched(input) {
    const auth = getTraktAuth();
    if (!auth || input.length === 0) return false;
    const response = await fetch("/api/trakt/sync/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth,
        action: "mark_watched",
        movies: input
      })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to push watched movies to Trakt"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return true;
  }
  async function importTraktWatchlist() {
    const auth = getTraktAuth();
    if (!auth) return { shows: 0, movies: 0, snapshot: { shows: [], movies: [] } };
    const response = await fetch("/api/trakt/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to import Trakt watchlist"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    const remoteShows = payload.shows ?? [];
    const remoteMovies = payload.movies ?? [];
    const localShows = getWatchlist();
    const localMovies = getMovieWatchlist();
    for (const localEntry of localShows) {
      const existsRemotely = remoteShows.some((remoteEntry) => sameWatchlistEntry(localEntry, remoteEntry));
      if (!existsRemotely && !hasPendingLocalAdd("show", localEntry)) {
        removeFromWatchlist(localEntry.tmdbId, { source: "trakt" });
      }
    }
    for (const localEntry of localMovies) {
      const existsRemotely = remoteMovies.some((remoteEntry) => sameWatchlistEntry(localEntry, remoteEntry));
      if (!existsRemotely && !hasPendingLocalAdd("movie", localEntry)) {
        removeFromMovieWatchlist(localEntry.tmdbId, { source: "trakt" });
      }
    }
    for (const show of remoteShows) {
      addToWatchlist(show, { source: "trakt" });
    }
    for (const movie of remoteMovies) {
      addToMovieWatchlist({
        ...movie,
        monitorForStreams: false
      }, { source: "trakt" });
    }
    scheduleWatchlistPrefetch([
      ...remoteShows.map((entry) => ({ tmdbId: entry.tmdbId, type: "tv" })),
      ...remoteMovies.map((entry) => ({ tmdbId: entry.tmdbId, type: "movie" }))
    ]);
    return {
      shows: remoteShows.length,
      movies: remoteMovies.length,
      snapshot: {
        shows: remoteShows,
        movies: remoteMovies
      }
    };
  }
  async function fetchTraktWatchlistSnapshot() {
    const auth = getTraktAuth();
    if (!auth) return { shows: [], movies: [] };
    const response = await fetch("/api/trakt/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to fetch Trakt watchlist snapshot"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return {
      shows: payload.shows ?? [],
      movies: payload.movies ?? []
    };
  }
  async function syncTraktWatchlistItems(input) {
    const auth = getTraktAuth();
    if (!auth || input.entries.length === 0) return false;
    const response = await fetch("/api/trakt/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth,
        action: input.action,
        mediaType: input.mediaType,
        entries: input.entries
      })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to sync watchlist items to Trakt"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return true;
  }
  async function syncLocalDataToTrakt(remoteSnapshot) {
    const auth = getTraktAuth();
    if (!auth) return { shows: 0, movies: 0, watchedEpisodes: 0, watchedMovies: 0 };
    const remote = remoteSnapshot ?? await fetchTraktWatchlistSnapshot();
    const shows = getWatchlist().filter((entry) => Boolean(entry.tmdbId || entry.imdbId));
    const movies = getMovieWatchlist().filter((entry) => Boolean(entry.tmdbId || entry.imdbId));
    const watchedEpisodes = getWatchedEpisodes().filter((entry) => Boolean(entry.tmdbId));
    const watchedMovies = getWatchedMovies().filter((entry) => Boolean(entry.tmdbId || entry.imdbId));
    const missingShows = shows.filter((entry) => !remote.shows.some((remoteEntry) => sameWatchlistEntry(entry, remoteEntry)));
    const missingMovies = movies.filter((entry) => !remote.movies.some((remoteEntry) => sameWatchlistEntry(entry, remoteEntry)));
    const syncedShows = shows.length > 0 ? missingShows.length > 0 ? await syncTraktWatchlistItems({ mediaType: "show", action: "add", entries: missingShows }) : true : true;
    const syncedMovies = movies.length > 0 ? missingMovies.length > 0 ? await syncTraktWatchlistItems({ mediaType: "movie", action: "add", entries: missingMovies }) : true : true;
    const syncedWatchedEpisodes = watchedEpisodes.length > 0 ? await markTraktEpisodesWatched(watchedEpisodes) : true;
    const syncedWatchedMovies = watchedMovies.length > 0 ? await markTraktMoviesWatched(watchedMovies) : true;
    autoSyncBackoffUntil = 0;
    return {
      shows: syncedShows ? missingShows.length : 0,
      movies: syncedMovies ? missingMovies.length : 0,
      watchedEpisodes: syncedWatchedEpisodes ? watchedEpisodes.length : 0,
      watchedMovies: syncedWatchedMovies ? watchedMovies.length : 0
    };
  }

  // components/settings/trakt-section.tsx
  var settingsActionButtonClass = "rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50";
  var settingsDangerActionButtonClass = "rounded-full border border-red-400/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50";
  function TraktSection() {
    const { t } = useLang();
    const [traktAuth, setTraktAuthState] = useState(() => getTraktAuth());
    const [traktLoginState, setTraktLoginState] = useState("idle");
    const [traktLoginError, setTraktLoginError] = useState("");
    const [traktImportState, setTraktImportState] = useState("idle");
    const [traktDeviceCode, setTraktDeviceCode] = useState("");
    const [traktVerificationUrl, setTraktVerificationUrl] = useState("");
    const pollRef = useRef(null);
    useEffect(() => {
      const sync = () => setTraktAuthState(getTraktAuth());
      sync();
      const stopAuth = onTraktAuthChanged(sync);
      const stopProfile = onProfileChanged(sync);
      return () => {
        stopAuth();
        stopProfile();
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, []);
    async function handleTraktConnect() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setTraktLoginError("");
      setTraktLoginState("starting");
      try {
        const response = await fetch("/api/trakt/device/start", { method: "POST" });
        const payload = await response.json();
        if (!response.ok || !payload.device_code || !payload.user_code || !payload.verification_url) {
          throw new Error(payload.error || t("traktStartLoginFailed"));
        }
        setTraktDeviceCode(payload.user_code);
        setTraktVerificationUrl(payload.verification_url);
        setTraktLoginState("polling");
        const intervalMs = Math.max(3, payload.interval ?? 5) * 1e3;
        pollRef.current = setInterval(() => {
          void (async () => {
            const pollResponse = await fetch("/api/trakt/device/poll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ deviceCode: payload.device_code })
            });
            if ([400, 404, 409, 429].includes(pollResponse.status)) return;
            const pollPayload = await pollResponse.json();
            if (!pollResponse.ok || !pollPayload.ok || !pollPayload.auth) {
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
              setTraktLoginError(pollPayload.error || t("traktLoginFailed"));
              setTraktLoginState("error");
              return;
            }
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setTraktAuth(pollPayload.auth);
            setTraktAuthState(pollPayload.auth);
            setTraktLoginState("idle");
            setTraktDeviceCode("");
            setTraktVerificationUrl("");
            await fetchTraktProfile();
            await importTraktWatched();
            await importTraktWatchlist();
          })().catch((error) => {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setTraktLoginError(error instanceof Error ? error.message : t("traktLoginFailed"));
            setTraktLoginState("error");
          });
        }, intervalMs);
      } catch (error) {
        setTraktLoginError(error instanceof Error ? error.message : t("traktStartLoginFailed"));
        setTraktLoginState("error");
      }
    }
    async function handleTraktImport() {
      setTraktLoginError("");
      setTraktImportState("importing");
      try {
        clearPendingTraktSync();
        await importTraktWatched();
        const watchlistResult = await importTraktWatchlist();
        await syncLocalDataToTrakt(watchlistResult.snapshot);
        setTraktAuthState(getTraktAuth());
        setTraktImportState("done");
        window.setTimeout(() => {
          setTraktImportState((current) => current === "done" ? "idle" : current);
        }, 2500);
      } catch (error) {
        setTraktAuthState(getTraktAuth());
        setTraktImportState("error");
        setTraktLoginError(error instanceof Error ? error.message : t("traktImportFailed"));
      }
    }
    function handleTraktDisconnect() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      clearTraktAuth();
      setTraktAuthState(null);
      setTraktLoginState("idle");
      setTraktLoginError("");
      setTraktImportState("idle");
      setTraktDeviceCode("");
      setTraktVerificationUrl("");
    }
    return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3", children: [
      traktAuth ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-white", children: [
            t("traktSignedInAs"),
            " ",
            traktAuth.name || traktAuth.username || t("traktSignedInFallback")
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500", children: t("traktSyncDesc") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => void handleTraktImport(), disabled: traktImportState === "importing", className: settingsActionButtonClass, children: traktImportState === "importing" ? t("traktImporting") : t("traktImportData") }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: handleTraktDisconnect, className: settingsDangerActionButtonClass, children: t("traktDisconnect") })
        ] }),
        traktImportState === "done" ? /* @__PURE__ */ jsx("p", { className: "text-xs text-emerald-300", children: t("traktImportDone") }) : null
      ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => void handleTraktConnect(),
            disabled: traktLoginState === "starting" || traktLoginState === "polling",
            className: settingsActionButtonClass,
            children: traktLoginState === "starting" || traktLoginState === "polling" ? t("traktWaiting") : t("traktConnect")
          }
        ),
        traktDeviceCode ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-[0.18em] text-emerald-300", children: t("traktOpenLinkAndCode") }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-white", children: traktVerificationUrl }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-xl font-semibold tracking-[0.22em] text-emerald-200", children: traktDeviceCode })
        ] }) : null
      ] }),
      traktLoginError ? /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-red-300", children: traktLoginError }) : null
    ] });
  }

  // ../lumio-official-plugins/plugins/trakt/runtime/index.ts
  var TraktPlugin = {
    id: "com.lumio.trakt",
    name: { en: "Trakt", sv: "Trakt" },
    version: "0.1.1",
    description: {
      en: "Sync watched history, watchlists and collection data with Trakt.",
      sv: "Synka sedda titlar, listor och samling med Trakt."
    },
    preinstalled: true,
    register(ctx) {
      ctx.registerSettingsSection({
        id: "trakt",
        label: { en: "Trakt", sv: "Trakt" },
        Section: TraktSection
      });
    }
  };

  // ../../../../private/var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build-wvYH2B/wrapper-entry.ts
  var plugin = Reflect.get(runtime_exports, "default") ?? Object.values(runtime_exports).find((value) => value && typeof value === "object" && "id" in value && "register" in value);
  if (!plugin) {
    throw new Error("Could not find a Lumio plugin export in runtime entry.");
  }
  globalThis.__lumioPluginRuntimeBundle = plugin;
})();
