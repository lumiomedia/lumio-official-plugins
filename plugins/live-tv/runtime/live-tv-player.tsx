'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  closeMpvPlayer,
  getHls,
  isTauriEnv,
  lockBodyScroll,
  mpvSetBounds,
  openMpvPlayer,
  setMpvPause,
  toggleWindowFullscreen,
  unlockBodyScroll,
  useMpvPlayer,
  useLang,
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const controlsHideTimerRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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
  } = mpv

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
    if (!useMpv && !loading && !error && !scheduleOpen) {
      controlsHideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false)
        controlsHideTimerRef.current = null
      }, 2400)
    }
  }, [clearControlsHideTimer, error, loading, scheduleOpen, useMpv])

  const keepControlsVisible = useCallback(() => {
    setControlsVisible(true)
    clearControlsHideTimer()
  }, [clearControlsHideTimer])

  useEffect(() => {
    if (!useMpv) return
    revealControls()
    return clearControlsHideTimer
  }, [channel.url, clearControlsHideTimer, revealControls, useMpv])

  useEffect(() => {
    lockBodyScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') void handleClose()
      if (useMpv && (event.key === ' ' || event.key === 'Spacebar')) {
        event.preventDefault()
        revealControls()
        void setMpvPause(!mpvPaused)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      unlockBodyScroll()
      window.removeEventListener('keydown', onKey)
    }
  }, [mpvPaused, onClose, useMpv])

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
          setError(err instanceof Error ? err.message : 'Playback failed')
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
          if (!Hls || !Hls.isSupported()) throw new Error('This browser does not support HLS playback.')

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
              setError(`Stream error: ${data.details ?? data.type ?? 'unknown'}`)
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Playback failed')
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
      setError('Streamen startade inte i MPV. Stäng spelaren och försök igen, eller testa en annan kanal.')
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

  if (useMpv) {
    const toggleMpvPause = () => {
      revealControls()
      void setMpvPause(!mpvPaused)
    }

    const syncMpvBoundsSoon = () => {
      window.setTimeout(() => {
        const rect = stageRef.current?.getBoundingClientRect()
        if (rect) mpvSetBounds(rect)
      }, 120)
    }

    const toggleFullscreen = () => {
      revealControls()
      void toggleWindowFullscreen()
        .then(syncMpvBoundsSoon)
        .catch(() => {})
    }

    const content = (
      <div
        data-lumio-player-open="1"
        className="fixed inset-0 z-[70] flex flex-col !mt-0 cursor-default"
        style={{ background: 'transparent' }}
        onMouseEnter={revealControls}
        onMouseMove={revealControls}
        onPointerMove={revealControls}
        onFocusCapture={revealControls}
      >
        <div
          ref={stageRef}
          className="vp-container relative flex flex-1 items-center justify-center bg-transparent"
          style={{ background: 'transparent' }}
        >
          <div style={{ width: '100%', height: '100%', background: 'transparent' }} />
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
            onClick={handleClose}
            className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/35 hover:text-white"
          >
            {t('close')}
          </button>
        </div>
        <div
          className="pointer-events-none transition-opacity duration-200"
          style={{ opacity: controlsVisible ? 1 : 0 }}
        >
          <PlayerNowOverlay channel={channel} listId={listId} urls={epgUrls} />
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
              onClick={toggleMpvPause}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-white/35 hover:bg-white/15"
              aria-label={mpvPaused ? 'Play' : 'Pause'}
              title={mpvPaused ? 'Play' : 'Pause'}
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
              onClick={toggleFullscreen}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-white/35 hover:bg-white/15"
              aria-label="Fullscreen"
              title="Fullscreen"
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
              onClick={() => setScheduleOpen((open) => !open)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-white transition ${
                scheduleOpen
                  ? 'border-emerald-300/60 bg-emerald-400/20 hover:border-emerald-200/80'
                  : 'border-white/15 bg-white/10 hover:border-white/35 hover:bg-white/15'
              }`}
              aria-label="Guide"
              title="Guide"
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

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-red-400/35 bg-red-500/15 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
                  Live
                </span>
                <p className="truncate text-sm font-semibold text-white">{channel.name}</p>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-3 text-xs text-slate-300">
                <span>{mpvPaused ? 'Paused' : 'Playing'}</span>
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

  const content = (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center ${wrapperBg}`}>
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
            <button
              type="button"
              onClick={() => void handleClose()}
              className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/35 hover:text-white"
            >
              {t('close')}
            </button>
          </div>

          <div className={`relative aspect-video w-full overflow-hidden ${stageBg}`}>
            <PlayerNowOverlay channel={channel} listId={listId} urls={epgUrls} />
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
