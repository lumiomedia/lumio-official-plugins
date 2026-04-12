'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  getHls,
  lockBodyScroll,
  unlockBodyScroll,
  useLang,
} from '@/lib/plugin-sdk'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { getLiveTvLogoSrc } from './live-tv-data'

interface M3uChannel {
  name: string
  logo: string | null
  group: string
  url: string
}

interface LiveTvPlayerProps {
  channel: M3uChannel
  onClose: () => void
}

function proxyUrl(url: string): string {
  return `/api/m3u?stream=${encodeURIComponent(url)}`
}

export function LiveTvPlayer({ channel, onClose }: LiveTvPlayerProps) {
  const { t } = useLang()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null)
  const logoSrc = getLiveTvLogoSrc(channel.logo)
  const closingRef = useRef(false)

  useEffect(() => {
    lockBodyScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') void handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      unlockBodyScroll()
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    const div = document.createElement('div')
    div.className = 'live-tv-player-portal'
    document.body.appendChild(div)
    setPortalEl(div)
    return () => {
      document.body.removeChild(div)
      setPortalEl(null)
    }
  }, [])

  useEffect(() => {
    setError(null)
    setLoading(true)
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
            if (!cancelled) void media.play().catch(() => {})
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
        void media.play().catch(() => {})
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
  }, [channel.url, portalEl])

  const handleClose = useCallback(async () => {
    if (closingRef.current) return
    closingRef.current = true
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
  }, [onClose])

  const content = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <button type="button" aria-label={t('close')} onClick={() => void handleClose()} className="absolute inset-0" />

      <div className="relative z-10 w-full max-w-5xl px-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/30 shadow-2xl ring-1 ring-white/5">
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

          <div className="relative aspect-video w-full overflow-hidden bg-black">
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
              onPlaying={() => setLoading(false)}
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
