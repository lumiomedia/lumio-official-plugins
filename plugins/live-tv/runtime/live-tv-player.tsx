'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  closeMpvPlayer,
  closeNativePlayer,
  getWindowFullscreen,
  getHls,
  isAndroidTauriEnv,
  isDesktopTauriEnv,
  isTauriEnv,
  lockBodyScroll,
  mpvSetBounds,
  nativeSetBounds,
  nativeSetVideoGeometry,
  onTvFocusEdge,
  openMpvPlayer,
  openNativePlayer,
  setAndroidImmersive,
  setMpvVideoGeometry,
  setWindowNativeFullscreen,
  unlockBodyScroll,
  useMpvPlayer,
  useNativePlayer,
  useLang,
  useTvMode,
  capturePlayerFrame,
} from '@/lib/plugin-sdk'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { getLiveTvLogoSrc } from './live-tv-data'
import { recordChannelWatch } from './channel-history'
import { channelKey } from './live-tv-data'
import { PlayerNowOverlay } from './player-now-overlay'
import { PlayerScheduleOverlay } from './player-schedule-overlay'
import { PlayerFavouritesRow, PlayerNextUpCard, PlayerProgrammeProgress } from './player-extras'
import { useHtmlVideoPlayer } from './hooks/useHtmlVideoPlayer'
import { HOST_PROXY_MIME, hostProxyUrl as buildHostProxyUrl, nativeFailureAction } from './live-tv-playback-fallback'

interface M3uChannel {
  name: string
  logo: string | null
  group: string
  url: string
  tvgId: string | null
}

interface LiveTvPlayerProps {
  channel: M3uChannel
  onClose: () => void
  listId?: string | null
  epgUrls?: string[]
  /** Guide-radens kanalbyte (favoriter). Utan den visar Guide-knappen tablån. */
  onSwitchChannel?: (channel: M3uChannel) => void
}

function isIosWebKitBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOSDevice = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isWebKit = /AppleWebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
  return isIOSDevice && isWebKit
}

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
}

function proxyUrl(url: string): string {
  return `/api/m3u?stream=${encodeURIComponent(url)}`
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const MPV_STARTUP_TIMEOUT_MS = 18_000
/** Budget för kanalens egen URL innan värdens strömproxy får försöka. */
const MPV_FIRST_ATTEMPT_TIMEOUT_MS = 9_000

export function LiveTvPlayer({ channel, onClose, listId = null, epgUrls = [], onSwitchChannel }: LiveTvPlayerProps) {
  const { t } = useLang()
  /**
   * TV-läget: spelaren är en helskärmsoverlay och därmed fokusfälla
   * (data-panel-root); varje kontroll är en station (data-f) och
   * spela/paus bär data-init — det man oftast vill åt med fjärren.
   * Utan detta gick spelaren inte att navigera alls med fjärrkontroll:
   * knapparna fanns men låg utanför fokusmotorns värld.
   */
  const isTv = useTvMode()
  const tvStation = isTv ? { 'data-f': '' } : {}
  // Hubbens "Fortsätt titta": en post per kanal, senast sedd först.
  useEffect(() => {
    recordChannelWatch(channel, listId)
  }, [channel.url, channel.name, listId])
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const controlsHideTimerRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  /**
   * Nativa motorernas försökstrappa: 0 = kanalens egen URL, 1 = samma ström
   * genom värdens strömproxy.
   *
   * Mätning på telefon 2026-09-08: av 70 nåbara kanaler i Free-TV-listan
   * föll fem på IO_BAD_HTTP_STATUS eller nätverksfel när ExoPlayer hämtade
   * dem själv, medan värdens proxy fick tillbaka en felfri spellista för
   * exakt samma URL:er. Proxyn följer omdirigeringar, sätter sina egna
   * huvuden och skriver om segmentlänkarna, så den är en riktigt annan väg
   * till samma ström och inte bara ett omtag.
   */
  const [nativeAttempt, setNativeAttempt] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  // Guide-raden (favoriter med nu-titel) under kontrollerna — handoff §4.
  const canSwitch = typeof onSwitchChannel === 'function' && !isTv
  const [portalEl] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null
    const div = document.createElement('div')
    div.className = isTauriEnv ? 'live-tv-player-portal mpv-player-portal' : 'live-tv-player-portal'
    div.style.background = 'transparent'
    return div
  })
  const logoSrc = getLiveTvLogoSrc(channel.logo)
  const closingRef = useRef(false)
  const mobileFullscreenAttemptedRef = useRef(false)
  // Forward-declared so the keyboard effect can reference `handleClose`
  // without listing it as a dep (handleClose is `const`-declared later in
  // the component body and would be in the temporal dead zone if the deps
  // array tried to capture it directly). A small effect further down keeps
  // the ref pointed at the latest `handleClose`.
  const handleCloseRef = useRef<() => void>(() => {})
  // Tre motorer: mpv på skrivbordet, den nativa media3-spelaren på Android,
  // och `<video>` (+ hls.js) i en webbläsarsession — iPhone över Fjärr/LAN
  // eller telefonens egen webbläsare. isTauriEnv DUGER INTE som val —
  // Android-appen är också Tauri men har ingen mpv, så den grenen slutade i
  // mpv-startens timeout och felet "uppspelningen misslyckades".
  //
  // `hasNativeSurface` skiljer de två som ritar video i ett lager BAKOM sidan
  // (och därför behöver bounds-synk och genomskinlig bakgrund) från
  // `<video>`, som är ett vanligt element i scenen. Alla tre delar hookens
  // gränssnitt, så EN rendering driver dem — webbläsaren fick tidigare en
  // egen, avskalad lightbox utan kontrollrad, tablå eller kanalbytare
  // (Jerry 2026-09-03).
  const engineKind: 'html' | 'mpv' | 'droid' =
    isDesktopTauriEnv ? 'mpv' : isAndroidTauriEnv ? 'droid' : 'html'
  const hasNativeSurface = engineKind !== 'html'
  const isDroidEngine = engineKind === 'droid'
  const isHtmlEngine = engineKind === 'html'
  // Alla tre hookarna delar gränssnitt (NativePlayerState extends
  // MpvPlayerState; useHtmlVideoPlayer speglar samma form mot elementet), så
  // allt nedströms kan läsa samma fält oavsett motor.
  const mpvDesktop = useMpvPlayer(engineKind === 'mpv')
  const droid = useNativePlayer(isDroidEngine)
  const htmlVideo = useHtmlVideoPlayer(isHtmlEngine, videoRef)
  const mpv = isDroidEngine ? droid : isHtmlEngine ? htmlVideo : mpvDesktop
  /**
   * IPTV-paneler svarar 403 på tomma eller "app-doftande" User-Agents —
   * särskilt DASH- och HLS-utlägg som filtrerar på webbläsarsträngar. mpv
   * skickar sin egen som standard, och Android-spelaren ingen alls. En vanlig
   * webbläsarsträng är vad panelerna förväntar sig; kanalens egen (från
   * spellistans user-agent-attribut) vinner när den finns.
   */
  const IPTV_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  /**
   * Samma ström, men hämtad av värden i stället för av spelaren.
   *
   * Absolut URL: mpv och ExoPlayer lever utanför sidan och kan inte lösa en
   * relativ sökväg. Samma origin som källcachen använder.
   */
  const hostProxyUrl = useCallback((url: string) => buildHostProxyUrl(window.location.origin, url), [])
  const engineOpen = useCallback(
    // Android-spelaren tar inga headers (np-bryggan saknar fältet) — den
    // vägen är oförändrad tills bryggan stödjer det. UA:n sätts i stället på
    // ExoPlayers datakälla, se PlayerBridge.
    // Råa MPEG-TS-strömmar (Xtream /live/…ts) får INGET UA-huvud: på appar
    // före 0.1.58 lades det i mpv:s http-header-fields bredvid ffmpegs egen och
    // panelen svarade 400 (svart ruta, 2026-09-03). HLS/DASH behåller
    // webbläsarsträngen som 0.3.43 införde för paneler som 403:ar mpv:s egen.
    //
    // mimeType: proxy-URL:en har ingen filändelse, och media3 gissar
    // container på just filändelsen. Utan ledtråden behandlades en felfri
    // HLS-spellista som en progressiv fil och föll på
    // PARSING_CONTAINER_UNSUPPORTED — bevisat på telefon med en kanal som
    // spelar direkt men inte genom proxyn (Jerry 2026-09-08).
    (url: string, viaProxy: boolean) => {
      const target = viaProxy ? hostProxyUrl(url) : url
      return isDroidEngine
        ? openNativePlayer({ url: target, ...(viaProxy ? { mimeType: HOST_PROXY_MIME } : {}) })
        : openMpvPlayer({
          url: target,
          requestHeaders: /\.ts(?:[?#]|$)/i.test(target) ? undefined : { 'User-Agent': IPTV_USER_AGENT },
        })
    },
    [isDroidEngine, hostProxyUrl],
  )
  const engineClose = useCallback(
    (): Promise<void> => (isDroidEngine ? closeNativePlayer() : closeMpvPlayer()),
    [isDroidEngine],
  )
  const engineSetBounds = useCallback(
    (rect: { left: number; top: number; width: number; height: number }) =>
      (isDroidEngine ? nativeSetBounds(rect) : mpvSetBounds(rect)),
    [isDroidEngine],
  )
  const engineSetGeometry = useCallback(
    (opts: { aspectOverride?: string; panscan?: number; videoZoom?: number }) =>
      (isDroidEngine ? nativeSetVideoGeometry(opts) : setMpvVideoGeometry(opts)),
    [isDroidEngine],
  )
  // Android: helskärm redan vid mount, samma som värdens spelare — annars
  // syns systemfälten en bildruta innan uppspelningen hinner igång.
  useEffect(() => {
    if (!isDroidEngine) return
    setAndroidImmersive(true)
    return () => setAndroidImmersive(false)
  }, [isDroidEngine])
  const {
    fileLoaded: mpvFileLoaded,
    loadFailed: mpvLoadFailed,
    loadFailedToken: mpvLoadFailedToken,
    timePos: mpvTimePos,
    paused: mpvPaused,
    playbackRestarted: mpvPlaybackRestarted,
    firstFrameRendered: mpvFirstFrameRendered,
    resetFileLoaded,
    resetPlaybackRestarted,
    resetFirstFrameRendered,
    setVolume: mpvSetVolume,
    setMuted: mpvSetMuted,
  } = mpv
  const ASPECT_OPTIONS: Array<{ aspectOverride: string; panscan: number; videoZoom: number; label: string; htmlFit: 'contain' | 'cover' }> = [
    { aspectOverride: '-1', panscan: 0, videoZoom: 0, label: t('aspectAuto'), htmlFit: 'contain' },
    { aspectOverride: '-1', panscan: 1, videoZoom: 0, label: t('aspectFill'), htmlFit: 'cover' },
    { aspectOverride: '16:9', panscan: 0, videoZoom: 0, label: '16:9', htmlFit: 'contain' },
    { aspectOverride: '4:3', panscan: 0, videoZoom: 0, label: '4:3', htmlFit: 'contain' },
    { aspectOverride: '2.35:1', panscan: 0, videoZoom: 0, label: '2.35:1', htmlFit: 'contain' },
  ]
  const [aspectIndex, setAspectIndex] = useState(0)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(1)
  const [muted, setMutedState] = useState(false)
  const [desktopFullscreen, setDesktopFullscreen] = useState(false)
  const cycleAspect = useCallback(() => {
    const next = (aspectIndex + 1) % ASPECT_OPTIONS.length
    const option = ASPECT_OPTIONS[next]
    setAspectIndex(next)
    if (hasNativeSurface) {
      void engineSetGeometry({
        aspectOverride: option.aspectOverride,
        panscan: option.panscan,
        videoZoom: option.videoZoom,
      })
    }
    // Webbläsaren: objectFit läses ur ASPECT_OPTIONS i videons style-prop, så
    // valet överlever en omrendering (den imperativa skrivningen gjorde inte).
  }, [aspectIndex, hasNativeSurface])
  const updateVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next))
    setVolumeLevel(clamped)
    if (clamped === 0) {
      setMutedState(true)
      mpvSetMuted(true)
    } else if (muted) {
      setMutedState(false)
      mpvSetMuted(false)
    }
    mpvSetVolume(clamped)
    if (videoRef.current) videoRef.current.volume = clamped
  }, [mpvSetMuted, mpvSetVolume, muted])
  const toggleMute = useCallback(() => {
    const next = !muted
    setMutedState(next)
    mpvSetMuted(next)
    if (videoRef.current) videoRef.current.muted = next
  }, [mpvSetMuted, muted])

  const tryEnterMobileFullscreen = useCallback(() => {
    if (mobileFullscreenAttemptedRef.current) return
    if (!isMobileBrowser()) return
    const media = videoRef.current
    if (!media) return
    mobileFullscreenAttemptedRef.current = true
    try {
      if (typeof media.requestFullscreen === 'function' && !document.fullscreenElement) {
        void media.requestFullscreen().catch(() => {})
        return
      }
      const webkitMedia = media as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
      if (typeof webkitMedia.webkitEnterFullscreen === 'function') {
        webkitMedia.webkitEnterFullscreen()
      }
    } catch {
      // Ignore: fullscreen availability depends on browser policies.
    }
  }, [])

  useEffect(() => {
    mobileFullscreenAttemptedRef.current = false
    setScheduleOpen(false)
  }, [channel.url])

  const clearControlsHideTimer = useCallback(() => {
    if (controlsHideTimerRef.current !== null) {
      window.clearTimeout(controlsHideTimerRef.current)
      controlsHideTimerRef.current = null
    }
  }, [])

  const revealControls = useCallback(() => {
    setControlsVisible(true)
    clearControlsHideTimer()
    if (!loading && !error && !scheduleOpen) {
      controlsHideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false)
        controlsHideTimerRef.current = null
      }, 2400)
    }
  }, [clearControlsHideTimer, error, loading, scheduleOpen])

  const keepControlsVisible = useCallback(() => {
    setControlsVisible(true)
    clearControlsHideTimer()
  }, [clearControlsHideTimer])

  // Kontrollraden gäller ALLA motorer nu — webbläsaren fick tidigare ingen.
  // Fönsterhelskärm är däremot ett Tauri-begrepp och frågas bara där.
  useEffect(() => {
    revealControls()
    if (hasNativeSurface) {
      void getWindowFullscreen().then(setDesktopFullscreen).catch(() => {})
    }
    return clearControlsHideTimer
  }, [channel.url, clearControlsHideTimer, revealControls, hasNativeSurface])

  useEffect(() => {
    lockBodyScroll()
    function onKey(event: KeyboardEvent) {
      // TV: kontrollraden gömmer sig efter 2,4 s — varje fjärrtryck ska
      // väcka den igen, annars navigerar man bland osynliga knappar.
      if (isTv) revealControls()
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
      // Backspace är TV-fjärrens bakåtknapp — samma väg som Escape.
      if (event.key === 'Escape' || (isTv && event.key === 'Backspace')) {
        event.preventDefault()
        event.stopPropagation()
        // Tablå-arket stängs först: bakåt kliver ur ett lager i taget.
        if (scheduleOpen) {
          setScheduleOpen(false)
          return
        }
        if (hasNativeSurface) {
          // Always query the real window state — `desktopFullscreen` can be
          // stale if the user toggled native fullscreen via the green traffic
          // light, which fires no JS event we listen to. Without this query,
          // pressing ESC in native fullscreen used to close the stream (and
          // leave the app stuck in fullscreen) instead of exiting fullscreen.
          void getWindowFullscreen()
            .then((fullscreen) => {
              if (!fullscreen) {
                handleCloseRef.current()
                return
              }
              return setWindowNativeFullscreen(false).then((nextFullscreen) => {
                setDesktopFullscreen(nextFullscreen)
                revealControls()
              })
            })
            .catch(() => handleCloseRef.current())
          return
        }
        if (typeof document !== 'undefined' && document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {})
          return
        }
        handleCloseRef.current()
        return
      }
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        revealControls()
        void mpv.setPlayPause(!mpvPaused)
      }
    }
    // TV: capture-fasen, före motorns bubblande lyssnare — annars hinner
    // värdens bakåthantering agera på trycket innan spelaren stängt sitt
    // lager. Skrivbordet behåller bubbelfasen: där finns lyssnare (t.ex.
    // schemaark med egna fält) som ska få tangenten först.
    window.addEventListener('keydown', onKey, isTv)
    return () => {
      unlockBodyScroll()
      window.removeEventListener('keydown', onKey, isTv)
    }
  }, [isTv, mpvPaused, revealControls, scheduleOpen, hasNativeSurface])

  // Vänster vid en vänsterkant i spelaren: anspråka trycket så värdens
  // reservlyssnare inte öppnar huvudmenyn ovanpå strömmen. Trycket väcker
  // bara kontrollraden. Defensivt meta?.claim?.() — äldre värdar saknar metan.
  useEffect(() => {
    if (!isTv) return
    return onTvFocusEdge((dir, meta) => {
      if (dir !== 'left') return
      meta?.claim?.()
      revealControls()
    })
  }, [isTv, revealControls])

  useLayoutEffect(() => {
    if (!portalEl) return
    document.body.appendChild(portalEl)
    return () => {
      if (portalEl.parentNode) portalEl.parentNode.removeChild(portalEl)
    }
  }, [portalEl])

  useLayoutEffect(() => {
    if (!hasNativeSurface) return
    const root = document.documentElement
    const body = document.body
    const previousRootBackgroundColor = root.style.getPropertyValue('background-color')
    const previousRootBackgroundColorPriority = root.style.getPropertyPriority('background-color')
    const previousRootBackgroundImage = root.style.getPropertyValue('background-image')
    const previousRootBackgroundImagePriority = root.style.getPropertyPriority('background-image')
    const previousBodyBackgroundColor = body.style.getPropertyValue('background-color')
    const previousBodyBackgroundColorPriority = body.style.getPropertyPriority('background-color')
    const previousBodyBackgroundImage = body.style.getPropertyValue('background-image')
    const previousBodyBackgroundImagePriority = body.style.getPropertyPriority('background-image')

    const ensureMpvClass = () => {
      root.classList.add('mpv-playing')
      root.style.setProperty('background-color', 'transparent', 'important')
      root.style.setProperty('background-image', 'none', 'important')
      body.style.setProperty('background-color', 'transparent', 'important')
      body.style.setProperty('background-image', 'none', 'important')
    }
    const restoreProperty = (target: HTMLElement, property: string, value: string, priority: string) => {
      if (value) target.style.setProperty(property, value, priority)
      else target.style.removeProperty(property)
    }

    ensureMpvClass()
    const observer = new MutationObserver(ensureMpvClass)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => {
      observer.disconnect()
      root.classList.remove('mpv-playing')
      restoreProperty(root, 'background-color', previousRootBackgroundColor, previousRootBackgroundColorPriority)
      restoreProperty(root, 'background-image', previousRootBackgroundImage, previousRootBackgroundImagePriority)
      restoreProperty(body, 'background-color', previousBodyBackgroundColor, previousBodyBackgroundColorPriority)
      restoreProperty(body, 'background-image', previousBodyBackgroundImage, previousBodyBackgroundImagePriority)
    }
  }, [hasNativeSurface])

  useEffect(() => {
    setError(null)
    setLoading(true)

    if (hasNativeSurface) {
      let cancelled = false
      let resizeObs: ResizeObserver | null = null
      const boundsTimers: number[] = []
      const sync = () => {
        const rect = stageRef.current?.getBoundingClientRect()
        if (rect) engineSetBounds(rect)
      }
      const syncRepeatedly = () => {
        sync()
        window.requestAnimationFrame(sync)
        for (const delay of [60, 160, 320, 700, 1200]) {
          boundsTimers.push(window.setTimeout(sync, delay))
        }
      }

      resetFileLoaded()
      resetPlaybackRestarted()
      resetFirstFrameRendered()

      void engineClose()
        .catch(() => {})
        .then(() => {
          if (cancelled) return
          syncRepeatedly()
          return engineOpen(channel.url, nativeAttempt > 0)
        })
        .then(() => {
          if (cancelled) return
          syncRepeatedly()
          // Laddläget släcks INTE på en timer här.
          //
          // Den gamla raden satte loading=false 1200 ms efter att motorn
          // öppnats, oavsett om strömmen kom igång. Det avväpnade samtidigt
          // startvakten längre ned, som kräver att laddläget står kvar — så
          // en kanal som aldrig laddade visade en svart ruta märkt "Spelar",
          // utan felruta och utan omtag. Numera släcker bara en riktig
          // bildruta (eller startvakten) laddläget.
          if (stageRef.current) {
            resizeObs = new ResizeObserver(sync)
            resizeObs.observe(stageRef.current)
          }
          window.addEventListener('resize', sync)
          window.addEventListener('scroll', sync, true)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setError(err instanceof Error ? err.message : t('liveTvPlaybackFailed'))
          setLoading(false)
        })

      return () => {
        cancelled = true
        boundsTimers.forEach((timer) => window.clearTimeout(timer))
        resizeObs?.disconnect()
        window.removeEventListener('resize', sync)
        window.removeEventListener('scroll', sync, true)
        void engineClose()
      }
    }

    const videoEl = videoRef.current
    if (!videoEl) return
    const media: HTMLVideoElement = videoEl

    let hlsInstance: { destroy: () => void } | null = null
    let liveSessionId: string | null = null
    let cancelled = false

    /** Spela en HLS-spellista: Safaris egen avkodare först, annars hls.js. */
    function playPlaylist(playlistUrl: string) {
      const canNativeHls = media.canPlayType('application/vnd.apple.mpegurl') !== ''
      if (canNativeHls || isIosWebKitBrowser()) {
        media.src = playlistUrl
        void media.play().then(() => {
          setLoading(false)
          tryEnterMobileFullscreen()
        }).catch(() => {})
        return
      }

      const Hls = getHls()
      if (cancelled) return
      if (!Hls || !Hls.isSupported()) throw new Error(t('liveTvHlsUnsupported'))

      const hls = new Hls({
        enableWorker: false,
        manifestLoadingTimeOut: 30000,
        levelLoadingTimeOut: 30000,
        fragLoadingTimeOut: 30000,
      })
      hls.loadSource(playlistUrl)
      hls.attachMedia(media)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) {
          void media.play().then(() => {
            tryEnterMobileFullscreen()
          }).catch(() => {})
        }
      })
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        if (!cancelled) setLoading(false)
      })
      // Ett 404 på ETT segment betyder oftast att just den renditionen
      // roterat bort hos utgivaren, inte att strömmen är död: byt nivå och
      // fortsätt i stället för att fälla hela uppspelningen.
      let renditionFallbacks = 0
      hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal?: boolean; type?: string; details?: string; response?: { code?: number } }) => {
        if (cancelled) return
        const segmentGone = data.details === 'fragLoadError' && data.response?.code === 404
        if (segmentGone && renditionFallbacks < 3) {
          const levels: unknown[] = (hls as unknown as { levels?: unknown[] }).levels ?? []
          const current = (hls as unknown as { currentLevel: number }).currentLevel
          const next = levels.length > 1 ? (current + 1) % levels.length : -1
          renditionFallbacks += 1
          ;(hls as unknown as { currentLevel: number }).currentLevel = next
          hls.startLoad()
          return
        }
        if (data.fatal) {
          setError(
            t('liveTvStreamErrorDetails').replace(
              '{details}',
              String(data.details ?? data.type ?? 'unknown'),
            ),
          )
          setLoading(false)
        }
      })
      hlsInstance = hls
    }

    /**
     * Rå ström → HLS via appens ffmpeg.
     *
     * Xtream-kanaler är rå MPEG-TS (`/live/…/8171.ts`). INGEN webbläsare
     * avkodar bar MPEG-TS i `<video>`, och hls.js kan inte heller — det
     * kräver en spellista. Den gamla webbgrenen satte `media.src` rakt på
     * strömmen, vilket aldrig kunde spela; en iPhone över Fjärr/LAN fick
     * alltid tom ruta (Jerry 2026-09-03).
     *
     * `/api/hls-stream` remuxar till fMP4 med `live=1` (rollande fönster).
     * Videon kopieras när den redan är H.264 — vilket svenska IPTV-kanaler
     * är — så det kostar nästan ingenting; annat omkodas. Ljudet blir alltid
     * AAC, för TS-ljud är ofta MP2/AC3 som webbläsare inte tar.
     */
    async function startLiveHlsSession(url: string): Promise<{ sessionId: string; playlistUrl: string }> {
      const codec = await fetch(`/api/probe-streams?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(15000),
      })
        .then((response) => response.json() as Promise<{ videoCodec?: string }>)
        .then((data) => data.videoCodec ?? null)
        .catch(() => null)
      const params = new URLSearchParams({ url, live: '1' })
      if (codec) params.set('vcodec', codec)
      // Okänd kodek → omkoda. Att kopiera en ström vi inte vet något om ger
      // en tyst svart ruta i stället för ett fel.
      if (codec !== 'h264') params.set('transcode', '1')
      const response = await fetch(`/api/hls-stream/init?${params.toString()}`, {
        signal: AbortSignal.timeout(60000),
      })
      if (!response.ok) {
        const detail = await response.json().then((body: { error?: string }) => body.error).catch(() => null)
        throw new Error(detail || t('liveTvPlaybackFailed'))
      }
      return await response.json() as { sessionId: string; playlistUrl: string }
    }

    async function setup() {
      const proxied = proxyUrl(channel.url)

      try {
        // Timeout på proben. Utan den kunde setup() hänga för alltid på ett
        // svar som aldrig kom — och då sattes media.src ALDRIG, så ingen av
        // videons händelser (onCanPlay/onLoadedMetadata/onError) kunde släppa
        // spinnern. Det är exakt "spelaren öppnas men laddar bara" på fjärren,
        // där reläet är långsammast. Faller proben ut går vi vidare på
        // fallback-värdena i stället för att stanna.
        const probe = await fetch(`${proxied}&probe=1`, { signal: AbortSignal.timeout(6000) })
          .then((response) => response.json() as Promise<{ isPlaylist?: boolean; contentType?: string | null }>)
          .catch(() => ({ isPlaylist: false, contentType: null }))
        if (cancelled) return

        const shouldUseHls = Boolean(
          probe.isPlaylist
          || probe.contentType?.includes('mpegurl')
          || probe.contentType?.includes('m3u'),
        )

        // Redan HLS: spela direkt genom proxyn, ingen ffmpeg behövs.
        if (shouldUseHls) {
          playPlaylist(proxied)
          return
        }

        const session = await startLiveHlsSession(channel.url)
        if (cancelled) {
          void fetch(`/api/hls-stream/${session.sessionId}/playlist.m3u8`, { method: 'DELETE' }).catch(() => {})
          return
        }
        liveSessionId = session.sessionId
        playPlaylist(session.playlistUrl)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('liveTvPlaybackFailed'))
          setLoading(false)
        }
      }
    }

    void setup()

    return () => {
      cancelled = true
      hlsInstance?.destroy()
      media.pause()
      media.removeAttribute('src')
      media.src = ''
      media.load()
      // ffmpeg-sessionen lever kvar i appen tills någon säger till: utan det
      // här snurrar en omkodning vidare efter att kanalen bytts eller
      // spelaren stängts (tomgångsvakten hinner först efter två minuter).
      if (liveSessionId) {
        void fetch(`/api/hls-stream/${liveSessionId}/playlist.m3u8`, { method: 'DELETE' }).catch(() => {})
      }
    }
  }, [
    channel.url,
    nativeAttempt,
    portalEl,
    resetFileLoaded,
    resetFirstFrameRendered,
    resetPlaybackRestarted,
    tryEnterMobileFullscreen,
    hasNativeSurface,
  ])

  useEffect(() => {
    if (!hasNativeSurface || !mpvFileLoaded) return
    void mpv.setPlayPause(false)
  }, [mpvFileLoaded, hasNativeSurface])

  // Nollställ trappan när kanalen byts: nästa kanal ska börja med sin egen
  // URL, inte ärva föregående kanals reservväg.
  useEffect(() => {
    setNativeAttempt(0)
  }, [channel.url])

  /**
   * Motorn sa ifrån: gå vidare i trappan, eller visa felet.
   *
   * Spelaren läste tidigare aldrig `loadFailed`, till skillnad från appens
   * egen spelare. En kanal som svarade 404 gav därför varken omtag eller
   * felruta — bara en svart bild med "Spelar" under (Jerry 2026-09-08).
   *
   * Token-jämförelsen: `loadFailed` står kvar som true efter ett fel, så
   * utan den skulle effekten larma om vid varje omrendering.
   */
  const handledFailTokenRef = useRef<number>(0)
  useEffect(() => {
    if (!hasNativeSurface || !mpvLoadFailed) return
    if (handledFailTokenRef.current === mpvLoadFailedToken) return
    handledFailTokenRef.current = mpvLoadFailedToken
    // Andra försöket går genom värdens strömproxy. Laddläget står kvar: för
    // den som tittar är det fortfarande samma start.
    if (nativeFailureAction('load-failed', nativeAttempt, mpvTimePos) === 'retry-proxy') {
      setNativeAttempt(1)
      return
    }
    setError(t('liveTvPlaybackFailed'))
    setLoading(false)
    void engineClose().catch(() => {})
  }, [hasNativeSurface, mpvLoadFailed, mpvLoadFailedToken, nativeAttempt, mpvTimePos])

  // Startvakten läser klockan genom en ref: en ren ljudkanal rapporterar
  // aldrig en bildruta, men dess speltid rör sig — och då spelar den.
  const timePosRef = useRef(0)
  timePosRef.current = mpvTimePos
  useEffect(() => {
    if (!hasNativeSurface || !loading || error || mpvFileLoaded || mpvPlaybackRestarted || mpvFirstFrameRendered) return
    // Första försöket får en kortare budget: en ström som inte kommit igång
    // på nio sekunder är oftare fel väg än långsam, och proxyvägen ska hinnas
    // med innan tittaren ger upp. Sista försöket får hela budgeten.
    const budget = nativeAttempt === 0 ? MPV_FIRST_ATTEMPT_TIMEOUT_MS : MPV_STARTUP_TIMEOUT_MS
    const timeout = window.setTimeout(() => {
      const action = nativeFailureAction('no-start', nativeAttempt, timePosRef.current)
      if (action === 'settle') {
        setLoading(false)
        return
      }
      if (action === 'retry-proxy') {
        setNativeAttempt(1)
        return
      }
      setError(t('liveTvMpvStartFailed'))
      setLoading(false)
      void engineClose().catch(() => {})
    }, budget)
    return () => window.clearTimeout(timeout)
  }, [error, loading, mpvFileLoaded, mpvFirstFrameRendered, mpvPlaybackRestarted, hasNativeSurface, nativeAttempt])

  useEffect(() => {
    if (!hasNativeSurface) return
    if (mpvFirstFrameRendered || mpvPlaybackRestarted) {
      setLoading(false)
      return
    }
    if (!mpvFileLoaded) return
    const timeout = window.setTimeout(() => setLoading(false), 900)
    return () => window.clearTimeout(timeout)
  }, [mpvFileLoaded, mpvFirstFrameRendered, mpvPlaybackRestarted, hasNativeSurface])

  /**
   * Sparad bildruta som kortbakgrund (Jerry 2026-09-06): första gången sex
   * sekunder in i uppspelningen, sedan var 90:e sekund så kortet visar något
   * aktuellt. mpv tar bilden ur videon själv; <video> ritas via canvas.
   */
  const [htmlPlaying, setHtmlPlaying] = useState(false)
  const frameReady = hasNativeSurface ? mpvFirstFrameRendered : htmlPlaying
  useEffect(() => {
    if (!frameReady) return
    const key = channelKey(channel)
    const capture = () => { void capturePlayerFrame(key, videoRef.current) }
    const first = window.setTimeout(capture, 6000)
    const repeat = window.setInterval(capture, 90_000)
    return () => { window.clearTimeout(first); window.clearInterval(repeat) }
  }, [frameReady, channel])
  useEffect(() => { setHtmlPlaying(false) }, [channel.url])

  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (hasNativeSurface) {
      // Query the real window state instead of trusting the cached
      // `desktopFullscreen`: the user can flip native fullscreen via the
      // green traffic light without firing a JS event, which would leave
      // the cached state stale and the app stranded in native fullscreen
      // after the stream closes (no recovery short of force-quit).
      void getWindowFullscreen()
        .then((fullscreen) => {
          if (fullscreen) return setWindowNativeFullscreen(false)
        })
        .catch(() => {})
      onClose()
      window.requestAnimationFrame(() => {
        void engineClose().catch(() => {})
      })
      return
    }
    try {
      const media = videoRef.current
      if (media) {
        media.pause()
        media.removeAttribute('src')
        media.src = ''
        media.load()
      }
    } finally {
      onClose()
      window.setTimeout(() => {
        closingRef.current = false
      }, 0)
    }
  }, [onClose, hasNativeSurface])

  // Sync the forward-declared ref so the keyboard effect always invokes
  // the latest handleClose without needing it as an effect dep (avoids TDZ).
  useEffect(() => {
    handleCloseRef.current = handleClose
  }, [handleClose])

  const toggleMpvPause = () => {
    revealControls()
    // Spela efter paus = ladda om kanalen, inte "unpause". Live har ingen
    // meningsfull återupptagning — livekanten rullar vidare medan man är
    // pausad — och paus-läget i JS kan hamna i osync med motorn när en
    // xtream-panel tappar TCP mitt i (vilket de rutinmässigt gör). En
    // omladdning tar oss till livekanten OCH räddar oss när motorn faktiskt
    // hängt, inte bara när flaggan är fel.
    //
    // Det här bodde tidigare som en TEXTPATCH i värdens
    // generate-bundled-plugin-runtimes.mjs, som matchade på 'setMpvPause'.
    // När motorvalet gjordes om slutade den matcha och beteendet försvann
    // tyst. Här i källan kan det inte hända igen, och det gäller nu BÅDA
    // motorerna — Android behöver det precis lika mycket.
    // `<video>` pausar och återupptar sin egen buffert, och hls.js hittar
    // tillbaka till livekanten själv. Omladdningen nedan gäller de nativa
    // motorerna.
    if (mpvPaused) {
      if (isHtmlEngine) {
        void mpv.setPlayPause(false)
        return
      }
      // Behåll vägen vi faktiskt spelar på: står vi på proxyvägen ska
      // återupptagningen också gå den vägen, annars laddar den om till en
      // URL som redan visat sig inte fungera.
      void engineClose().catch(() => {}).then(() => engineOpen(channel.url, nativeAttempt > 0))
      return
    }
    void mpv.setPlayPause(true)
  }

  const syncMpvBounds = () => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (rect) engineSetBounds(rect)
  }

  const syncMpvBoundsSoon = () => {
    syncMpvBounds()
    window.requestAnimationFrame(syncMpvBounds)
    for (const delay of [80, 180, 360, 700]) {
      window.setTimeout(() => {
        const rect = stageRef.current?.getBoundingClientRect()
        if (rect) engineSetBounds(rect)
      }, delay)
    }
  }

  const toggleFullscreen = () => {
    revealControls()
    // Webbläsarsession: elementets Fullscreen-API. Det finns inget
    // Tauri-fönster att växla, och iOS Safari ger bara videons egen helskärm.
    if (isHtmlEngine) {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
        setDesktopFullscreen(false)
        return
      }
      const root = stageRef.current?.parentElement ?? null
      const media = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
      if (root && typeof root.requestFullscreen === 'function') {
        void root.requestFullscreen().then(() => setDesktopFullscreen(true)).catch(() => {})
        return
      }
      if (media && typeof media.webkitEnterFullscreen === 'function') {
        media.webkitEnterFullscreen()
        setDesktopFullscreen(true)
      }
      return
    }
    const wasPlaying = !mpvPaused
    void getWindowFullscreen()
      .then((fullscreen) => setWindowNativeFullscreen(!fullscreen))
      .then((fullscreen) => {
        setDesktopFullscreen(fullscreen)
        syncMpvBoundsSoon()
        if (wasPlaying) {
          void mpv.setPlayPause(false)
          window.setTimeout(() => void mpv.setPlayPause(false), 250)
          window.setTimeout(() => void mpv.setPlayPause(false), 900)
        }
      })
      .catch(() => {
        const rect = stageRef.current?.getBoundingClientRect()
        if (rect) engineSetBounds(rect)
      })
  }

  const content = (
    <div
      data-lumio-player-open="1"
      // TV: fokusfälla medan spelaren är öppen. onFocusCapture väcker
      // kontrollraden när motorn flyttar fokus mellan stationerna.
      // data-tv-fullbleed: värdens CSS ger panelrötter vänsterpadding för
      // ikonrailen — en videoyta ska täcka hela skärmen och väljer bort den.
      {...(isTv ? { 'data-panel-root': '', 'data-tv-fullbleed': '' } : {})}
      className="fixed inset-0 z-[70] bg-transparent cursor-default"
      onMouseMove={revealControls}
      onPointerMove={revealControls}
      onFocusCapture={revealControls}
    >
      <div
        ref={stageRef}
        style={{
          position: 'absolute',
          inset: 0,
          // mpv och Android ritar i ett lager BAKOM sidan; scenen är bara ett
          // hål som talar om var. `<video>` ligger i själva scenen och
          // behöver en svart botten att brevlådas mot.
          background: hasNativeSurface ? 'transparent' : '#000',
        }}
      >
        {isHtmlEngine ? (
          <video
            key={channel.url}
            ref={videoRef}
            className="absolute inset-0 h-full w-full"
            // INGA inbyggda kontroller: kontrollraden nedan ÄR spelaren, och
            // webbläsarens egen overlay låg ovanpå den (Jerry 2026-09-03).
            autoPlay
            playsInline
            style={{ objectFit: ASPECT_OPTIONS[aspectIndex].htmlFit, background: '#000' }}
            onClick={revealControls}
            onCanPlay={() => setLoading(false)}
            onError={(event) => {
              // Elementet larmar ÄVEN utan källa: uppsättningen hämtar en
              // tablå-probe och startar en ffmpeg-session, vilket tar sekunder,
              // och tomma `src` under tiden räknas som fel. Det felet lade sig
              // som en svart "Could not load stream"-ruta ÖVER en ström som
              // sedan spelade utmärkt (Jerry 2026-09-03). Bara ett fel på en
              // faktisk källa är ett fel.
              const media = event.currentTarget
              if (!media.currentSrc && !media.getAttribute('src')) return
              setLoading(false)
              setError(t('liveTvStreamError'))
            }}
            onLoadedMetadata={() => setLoading(false)}
            onPlaying={() => {
              setLoading(false)
              setHtmlPlaying(true)
              // Bilder rullar = det finns inget fel längre. Ett fel från en
              // tidigare källa (kanalbyte, omstartad session) fick annars ligga
              // kvar och täcka en ström som spelade.
              setError(null)
              tryEnterMobileFullscreen()
            }}
            onWaiting={() => {
              if (!error) setLoading(true)
            }}
            {...{ 'x-webkit-airplay': 'allow' }}
          />
        ) : null}
      </div>
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-transparent">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black px-4 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <p className="text-xs text-slate-500">{t('liveTvStreamErrorHelp')}</p>
        </div>
      )}
      <div
        // Android ritar edge-to-edge och webview:n får ALDRIG insets via
        // env(safe-area-inset-*) — de är alltid 0 där. Bryggan känner dem och
        // startAndroidInsetSync() lägger dem i --android-inset-*, så max()
        // måste läsa BÅDA: env() bär iOS, variabeln bär Android.
        className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 bg-gradient-to-b from-black/75 via-black/45 to-transparent px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top),var(--android-inset-top,0px))] transition-opacity duration-200"
        onMouseEnter={keepControlsVisible}
        onMouseLeave={revealControls}
        style={{
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}
      >
        <div className="min-w-0 flex items-center gap-3">
          {logoSrc && (
            <LiveTvLogoImage
              src={logoSrc}
              alt=""
              className="h-8 w-8 rounded object-contain bg-slate-800/90 p-0.5"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{channel.name}</p>
            <div className="min-w-0">
              <PlayerNowOverlay channel={channel} listId={listId} urls={epgUrls} />
            </div>
          </div>
        </div>
        {!isTv ? (
          <div className="hidden min-w-0 flex-1 justify-center sm:flex">
            <PlayerNextUpCard channel={channel} listId={listId} urls={epgUrls} />
          </div>
        ) : null}
        <button
          type="button"
          {...tvStation}
          {...(isTv ? { 'data-init': '' } : {})}
          // Förstafokus på Stäng när strömmen öppnas: motorn kallar aldrig
          // focusInit för en vy, så knappen fokuserar sig själv vid
          // montering (och håller emot sena fokusstölder några frames).
          ref={(node: HTMLButtonElement | null) => {
            if (!isTv || !node || node.dataset.focusAsserted === '1') return
            node.dataset.focusAsserted = '1'
            let held = 0
            const deadline = Date.now() + 4000
            const tick = () => {
              if (!node.isConnected) return
              if (node.offsetParent !== null) {
                if (document.activeElement === node) {
                  if (++held >= 5) return
                } else { held = 0; node.focus() }
              }
              if (Date.now() < deadline) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }}
          onClick={handleClose}
          className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/35 hover:text-white"
        >
          {t('close')}
        </button>
      </div>
      <div
        // Se kommentaren vid topbaren: navigeringsfältets inset kommer bara
        // via --android-inset-bottom, aldrig via env() på Android.
        className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom),var(--android-inset-bottom,0px))] pt-12 transition-opacity duration-200"
        onMouseEnter={keepControlsVisible}
        onMouseLeave={revealControls}
        style={{
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}
      >
        <div className="mb-2 px-1">
          <PlayerProgrammeProgress channel={channel} listId={listId} urls={epgUrls} />
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
          <button
            type="button"
            {...tvStation}
            // Startfokus: spela/paus är det man oftast vill åt med fjärren.
            onClick={toggleMpvPause}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-white/35 hover:bg-white/15"
            aria-label={mpvPaused ? t('play') : t('liveTvPause')}
            title={mpvPaused ? t('play') : t('liveTvPause')}
          >
            {mpvPaused ? (
              <svg className="h-5 w-5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            {...tvStation}
            onClick={toggleFullscreen}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-white transition ${
              desktopFullscreen
                ? 'border-white/45 bg-white/20 hover:border-white/60'
                : 'border-white/15 bg-white/10 hover:border-white/35 hover:bg-white/15'
            }`}
            aria-label={desktopFullscreen ? t('liveTvExitFullscreen') : t('liveTvFullscreen')}
            title={desktopFullscreen ? t('liveTvExitFullscreen') : t('liveTvFullscreen')}
            aria-pressed={desktopFullscreen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H3v5" />
              <path d="M16 3h5v5" />
              <path d="M21 16v5h-5" />
              <path d="M3 16v5h5" />
            </svg>
          </button>
          <button
            type="button"
            {...tvStation}
            onClick={() => setScheduleOpen((open) => !open)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-white transition ${
              scheduleOpen
                ? 'border-emerald-300/60 bg-emerald-400/20 hover:border-emerald-200/80'
                : 'border-white/15 bg-white/10 hover:border-white/35 hover:bg-white/15'
            }`}
            aria-label={t('liveTvGuide')}
            title={t('liveTvGuide')}
            aria-pressed={scheduleOpen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <path d="M3 10h18" />
              <path d="M7 14h4" />
              <path d="M7 18h10" />
            </svg>
          </button>

          <div className="relative" onMouseLeave={() => setVolumeOpen(false)}>
            <button
              type="button"
              {...tvStation}
              onClick={() => setVolumeOpen((open) => !open)}
              onMouseEnter={() => setVolumeOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-white/35 hover:bg-white/15"
              aria-label={t('liveTvVolume')}
              title={t('liveTvVolume')}
              aria-expanded={volumeOpen}
            >
              {muted || volumeLevel === 0 ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                  <path d="m22 9-6 6" />
                  <path d="m16 9 6 6" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                  {volumeLevel > 0.33 ? <path d="M15.5 8.5a5 5 0 0 1 0 7" /> : null}
                  {volumeLevel > 0.66 ? <path d="M19 4.5a10 10 0 0 1 0 15" /> : null}
                </svg>
              )}
            </button>
            {volumeOpen ? (
              /* pb-2 on an outer wrapper instead of mb-2 on the pill: the
                 spacing must be PART of the hoverable popup element — the
                 pointer crossing an empty margin gap between button and
                 popup fires the wrapper's mouseleave, so the slider
                 vanished before it could be reached. */
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2"
                onMouseEnter={() => setVolumeOpen(true)}
              >
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/85 px-3 py-2 shadow-2xl backdrop-blur">
                {/* Reglaget förblir musens: ett range-input som station
                    skulle svälja alla pilar. Mute-knappen räcker på TV. */}
                <button
                  type="button"
                  {...tvStation}
                  onClick={toggleMute}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-white/35 hover:bg-white/15"
                  aria-label={muted ? t('liveTvUnmute') : t('liveTvMute')}
                  title={muted ? t('liveTvUnmute') : t('liveTvMute')}
                >
                  {muted || volumeLevel === 0 ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                      <path d="m22 9-6 6" />
                      <path d="m16 9 6 6" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volumeLevel}
                  onChange={(e) => updateVolume(parseFloat(e.target.value))}
                  className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
                  aria-label={t('liveTvVolume')}
                />
              </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            {...tvStation}
            onClick={cycleAspect}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-white transition hover:border-white/35 hover:bg-white/15"
            /* Etiketten bär det AKTUELLA värdet, så den måste in i aria-label
               när texten göms — annars blir knappen "bildförhållande" utan
               att avslöja vilket, för både skärmläsare och TV-fokus. */
            aria-label={`${t('aspectRatio')}: ${ASPECT_OPTIONS[aspectIndex].label}`}
            title={`${t('aspectRatio')}: ${ASPECT_OPTIONS[aspectIndex].label}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 9h18M9 5v14" />
            </svg>
            {/* Bara ikon när bredden inte räcker. Telefonens porträttläge är
                360 px och kontrollraden fick inte plats — i landskap (~800 px)
                och på skrivbordet finns utrymmet. Breddvillkor och inte
                `portrait:`/`landscape:`: det är utrymmet som är problemet, så
                en smal fönsterruta på skrivbordet ska bete sig likadant. */}
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.1em] sm:inline">
              {ASPECT_OPTIONS[aspectIndex].label}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-red-400/35 bg-red-500/15 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
                {t('liveTvLiveBadge')}
              </span>
              <p className="min-w-0 truncate text-sm font-semibold text-white">{channel.name}</p>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-3 text-xs text-slate-300">
              <span>{mpvPaused ? t('liveTvPaused') : t('liveTvPlaying')}</span>
              <span className="text-slate-600">/</span>
              <span>{formatClock(mpvTimePos)}</span>
              {channel.group ? (
                <>
                  <span className="text-slate-600">/</span>
                  <span className="truncate">{channel.group}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:flex">
            <span>{engineKind === 'mpv' ? 'MPV' : engineKind === 'droid' ? 'ANDROID' : 'HLS'}</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>Live TV</span>
          </div>
        </div>
        {canSwitch && onSwitchChannel ? (
          <PlayerFavouritesRow current={channel} listId={listId} urls={epgUrls} onSwitch={onSwitchChannel} />
        ) : null}
      </div>
      <PlayerScheduleOverlay
        channel={channel}
        listId={listId}
        urls={epgUrls}
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
      />
    </div>
  )

  return portalEl ? createPortal(content, portalEl) : content
}
