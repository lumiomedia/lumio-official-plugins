'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  closeMpvPlayer,
  getWindowFullscreen,
  getHls,
  isTauriEnv,
  lockBodyScroll,
  mpvSetBounds,
  onTvFocusEdge,
  openMpvPlayer,
  setMpvPause,
  setMpvVideoGeometry,
  setWindowNativeFullscreen,
  unlockBodyScroll,
  useMpvPlayer,
  useLang,
  useTvMode,
} from '@/lib/plugin-sdk'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { getLiveTvLogoSrc } from './live-tv-data'
import { PlayerNowOverlay } from './player-now-overlay'
import { PlayerScheduleOverlay } from './player-schedule-overlay'

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

export function LiveTvPlayer({ channel, onClose, listId = null, epgUrls = [] }: LiveTvPlayerProps) {
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const controlsHideTimerRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // HTML-spelarens paus-läge speglas i state: de inbyggda kontrollerna går
  // inte att nå med fjärren, så TV-läget ritar en egen spela/paus-station.
  const [htmlPaused, setHtmlPaused] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [scheduleOpen, setScheduleOpen] = useState(false)
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
  const useMpv = isTauriEnv
  const mpv = useMpvPlayer(useMpv)
  const {
    fileLoaded: mpvFileLoaded,
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
    if (useMpv) {
      void setMpvVideoGeometry({
        aspectOverride: option.aspectOverride,
        panscan: option.panscan,
        videoZoom: option.videoZoom,
      })
    } else if (videoRef.current) {
      videoRef.current.style.objectFit = option.htmlFit
    }
  }, [aspectIndex, useMpv])
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

  useEffect(() => {
    if (!useMpv) return
    revealControls()
    void getWindowFullscreen().then(setDesktopFullscreen).catch(() => {})
    return clearControlsHideTimer
  }, [channel.url, clearControlsHideTimer, revealControls, useMpv])

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
        if (useMpv) {
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
      if (useMpv && (event.key === ' ' || event.key === 'Spacebar')) {
        event.preventDefault()
        revealControls()
        void setMpvPause(!mpvPaused)
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
  }, [isTv, mpvPaused, revealControls, scheduleOpen, useMpv])

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
    if (!useMpv) return
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
  }, [useMpv])

  useEffect(() => {
    setError(null)
    setLoading(true)

    if (useMpv) {
      let cancelled = false
      let resizeObs: ResizeObserver | null = null
      const boundsTimers: number[] = []
      const sync = () => {
        const rect = stageRef.current?.getBoundingClientRect()
        if (rect) mpvSetBounds(rect)
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

      void closeMpvPlayer()
        .catch(() => {})
        .then(() => {
          if (cancelled) return
          syncRepeatedly()
          return openMpvPlayer({ url: channel.url })
        })
        .then(() => {
          if (cancelled) return
          syncRepeatedly()
          window.setTimeout(() => {
            if (!cancelled) setLoading(false)
          }, 1200)
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
        void closeMpvPlayer()
      }
    }

    const videoEl = videoRef.current
    if (!videoEl) return
    const media: HTMLVideoElement = videoEl

    let hlsInstance: { destroy: () => void } | null = null
    let cancelled = false

    async function setup() {
      const proxied = proxyUrl(channel.url)

      try {
        const probe = await fetch(`${proxied}&probe=1`)
          .then((response) => response.json() as Promise<{ isPlaylist?: boolean; contentType?: string | null }>)
          .catch(() => ({ isPlaylist: false, contentType: null }))
        if (cancelled) return

        const shouldUseHls = Boolean(
          probe.isPlaylist
          || probe.contentType?.includes('mpegurl')
          || probe.contentType?.includes('m3u'),
        )

        if (shouldUseHls) {
          const canNativeHls = media.canPlayType('application/vnd.apple.mpegurl') !== ''
          if (canNativeHls || isIosWebKitBrowser()) {
            media.src = proxied
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
          hls.loadSource(proxied)
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
          hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal?: boolean; type?: string; details?: string }) => {
            if (cancelled) return
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
          return
        }

        media.src = proxied
        void media.play().then(() => {
          tryEnterMobileFullscreen()
        }).catch(() => {})
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('liveTvPlaybackFailed'))
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
    }
  }, [
    channel.url,
    portalEl,
    resetFileLoaded,
    resetFirstFrameRendered,
    resetPlaybackRestarted,
    tryEnterMobileFullscreen,
    useMpv,
  ])

  useEffect(() => {
    if (!useMpv || !mpvFileLoaded) return
    void setMpvPause(false)
  }, [mpvFileLoaded, useMpv])

  useEffect(() => {
    if (!useMpv || !loading || error || mpvFileLoaded || mpvPlaybackRestarted || mpvFirstFrameRendered) return
    const timeout = window.setTimeout(() => {
      setError(t('liveTvMpvStartFailed'))
      setLoading(false)
      void closeMpvPlayer().catch(() => {})
    }, MPV_STARTUP_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [error, loading, mpvFileLoaded, mpvFirstFrameRendered, mpvPlaybackRestarted, useMpv])

  useEffect(() => {
    if (!useMpv) return
    if (mpvFirstFrameRendered || mpvPlaybackRestarted) {
      setLoading(false)
      return
    }
    if (!mpvFileLoaded) return
    const timeout = window.setTimeout(() => setLoading(false), 900)
    return () => window.clearTimeout(timeout)
  }, [mpvFileLoaded, mpvFirstFrameRendered, mpvPlaybackRestarted, useMpv])

  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (useMpv) {
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
        void closeMpvPlayer().catch(() => {})
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
  }, [onClose, useMpv])

  // Sync the forward-declared ref so the keyboard effect always invokes
  // the latest handleClose without needing it as an effect dep (avoids TDZ).
  useEffect(() => {
    handleCloseRef.current = handleClose
  }, [handleClose])

  if (useMpv) {
    const toggleMpvPause = () => {
      revealControls()
      void setMpvPause(!mpvPaused)
    }

    const syncMpvBounds = () => {
      const rect = stageRef.current?.getBoundingClientRect()
      if (rect) mpvSetBounds(rect)
    }

    const syncMpvBoundsSoon = () => {
      syncMpvBounds()
      window.requestAnimationFrame(syncMpvBounds)
      for (const delay of [80, 180, 360, 700]) {
        window.setTimeout(() => {
          const rect = stageRef.current?.getBoundingClientRect()
          if (rect) mpvSetBounds(rect)
        }, delay)
      }
    }

    const toggleFullscreen = () => {
      revealControls()
      const wasPlaying = !mpvPaused
      void getWindowFullscreen()
        .then((fullscreen) => setWindowNativeFullscreen(!fullscreen))
        .then((fullscreen) => {
          setDesktopFullscreen(fullscreen)
          syncMpvBoundsSoon()
          if (wasPlaying) {
            void setMpvPause(false)
            window.setTimeout(() => void setMpvPause(false), 250)
            window.setTimeout(() => void setMpvPause(false), 900)
          }
        })
        .catch(() => {
          const rect = stageRef.current?.getBoundingClientRect()
          if (rect) mpvSetBounds(rect)
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
            background: 'transparent',
          }}
        />
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
          className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 bg-gradient-to-b from-black/75 via-black/45 to-transparent px-5 py-4 transition-opacity duration-200"
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
              {channel.group && <p className="truncate text-xs text-slate-300">{channel.group}</p>}
            </div>
          </div>
          <button
            type="button"
            {...tvStation}
            onClick={handleClose}
            className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/35 hover:text-white"
          >
            {t('close')}
          </button>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-5 pb-5 pt-12 transition-opacity duration-200"
          onMouseEnter={keepControlsVisible}
          onMouseLeave={revealControls}
          style={{
            opacity: controlsVisible ? 1 : 0,
            pointerEvents: controlsVisible ? 'auto' : 'none',
          }}
        >
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
            <button
              type="button"
              {...tvStation}
              // Startfokus: spela/paus är det man oftast vill åt med fjärren.
              {...(isTv ? { 'data-init': '' } : {})}
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
              aria-label={t('aspectRatio')}
              title={`${t('aspectRatio')}: ${ASPECT_OPTIONS[aspectIndex].label}`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 9h18M9 5v14" />
              </svg>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                {ASPECT_OPTIONS[aspectIndex].label}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-red-400/35 bg-red-500/15 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
                  {t('liveTvLiveBadge')}
                </span>
                <p className="shrink-0 truncate text-sm font-semibold text-white">{channel.name}</p>
                <div className="min-w-0 flex-1">
                  <PlayerNowOverlay channel={channel} listId={listId} urls={epgUrls} />
                </div>
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
              <span>MPV</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>Live TV</span>
            </div>
          </div>
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

  const wrapperBg = 'bg-black/60 backdrop-blur-sm'
  const cardBg = 'bg-slate-950/30'
  const stageBg = 'bg-black'

  const toggleHtmlPause = () => {
    const media = videoRef.current
    if (!media) return
    if (media.paused) void media.play().catch(() => {})
    else media.pause()
  }

  const content = (
    <div
      // TV: fokusfälla även för HTML-spelaren (värdar utan mpv).
      // data-tv-fullbleed väljer bort värdens rail-padding — se mpv-grenen.
      {...(isTv ? { 'data-panel-root': '', 'data-tv-fullbleed': '' } : {})}
      className={`fixed inset-0 z-[70] flex items-center justify-center ${wrapperBg}`}
    >
      <button type="button" aria-label={t('close')} onClick={() => void handleClose()} className="absolute inset-0" />

      <div className="relative z-10 w-full max-w-5xl px-4">
        <div className={`relative overflow-hidden rounded-3xl border border-white/10 ${cardBg} shadow-2xl ring-1 ring-white/5`}>
          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/75 via-black/45 to-transparent px-4 py-3">
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
                {channel.group && <p className="truncate text-xs text-slate-300">{channel.group}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* TV: videons inbyggda kontroller nås inte med fjärren — en
                  egen spela/paus-station med startfokus krävs. */}
              {isTv ? (
                <button
                  type="button"
                  {...tvStation}
                  data-init=""
                  onClick={toggleHtmlPause}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-slate-200 transition hover:border-white/35 hover:text-white"
                  aria-label={htmlPaused ? t('play') : t('liveTvPause')}
                  title={htmlPaused ? t('play') : t('liveTvPause')}
                >
                  {htmlPaused ? (
                    <svg className="h-4 w-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                    </svg>
                  )}
                </button>
              ) : null}
              <button
                type="button"
                {...tvStation}
                onClick={() => void handleClose()}
                className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/35 hover:text-white"
              >
                {t('close')}
              </button>
            </div>
          </div>

          <div className={`relative aspect-video w-full overflow-hidden ${stageBg}`}>
            {loading && !error && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="text-sm text-red-400">{error}</p>
                <p className="text-xs text-slate-500">{t('liveTvStreamErrorHelp')}</p>
              </div>
            )}
            <video
              key={channel.url}
              ref={videoRef}
              className="absolute inset-0 h-full w-full bg-black object-contain"
              controls
              autoPlay
              playsInline
              onCanPlay={() => setLoading(false)}
              onError={() => {
                setLoading(false)
                setError(t('liveTvStreamError'))
              }}
              onLoadedMetadata={() => setLoading(false)}
              onPlay={() => setHtmlPaused(false)}
              onPause={() => setHtmlPaused(true)}
              onPlaying={() => {
                setLoading(false)
                tryEnterMobileFullscreen()
              }}
              onWaiting={() => {
                if (!error) setLoading(true)
              }}
              {...{ 'x-webkit-airplay': 'allow' }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return portalEl ? createPortal(content, portalEl) : content
}
