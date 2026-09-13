'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import {
  closeMpvPlayer,
  closeNativePlayer,
  getHls,
  isAndroidTauriEnv,
  isDesktopTauriEnv,
  mpvSetBounds,
  mpvSetPropertyStrings,
  nativeSetBounds,
  openMpvPlayer,
  openNativePlayer,
  playerFrameUrl,
} from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { HOST_PROXY_MIME, hostProxyUrl } from '../live-tv-playback-fallback'

export interface SurfaceSource { channel: M3uChannel; url: string }
export interface VideoSurfaceOptions { muted: boolean; audio?: boolean; enabled?: boolean }
export interface VideoSurfaceHandle { ready: boolean; failed: boolean; live: boolean; frameUrl: string | null }

type Rect = { left: number; top: number; width: number; height: number }

interface HostSurface {
  open(opts: { url: string; muted: boolean; mimeType?: string }): Promise<void>
  close(): Promise<void>
  setBounds(rect: Rect): void
  setMuted(muted: boolean): Promise<void>
  onState(listener: (s: { firstFrameRendered: boolean; loadFailed: boolean }) => void): () => void
  destroy(): Promise<void>
}
type HostApi = {
  createVideoSurface?: () => HostSurface | null
  getVideoSurfaceCapabilities?: () => { maxSurfaces: number }
}
const host = sdk as unknown as HostApi

export function videoSurfaceCapabilities(): { maxLive: number; engine: 'mpv' | 'droid' | 'html' | 'host' } {
  if (typeof host.createVideoSurface === 'function' && typeof host.getVideoSurfaceCapabilities === 'function') {
    return { maxLive: Math.max(0, host.getVideoSurfaceCapabilities().maxSurfaces - 1), engine: 'host' }
  }
  return { maxLive: 1, engine: isDesktopTauriEnv ? 'mpv' : isAndroidTauriEnv ? 'droid' : 'html' }
}

/* ---------- v1: en enda nativ yta ---------- */

let owner: symbol | null = null
let ownerClose: (() => Promise<void>) | null = null
const waiters = new Set<() => void>()

function notifyWaiters() {
  for (const w of waiters) w()
}

export async function releaseAllSurfaces(): Promise<void> {
  const close = ownerClose
  owner = null
  ownerClose = null
  if (close) await close().catch(() => {})
  notifyWaiters()
}

function measure(el: HTMLElement | null): Rect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return null
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

function isHls(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || !/\.[a-z0-9]{2,4}(\?|$)/i.test(url)
}

/** HTML-motor: ett <video> i en fixed portal, positionerat efter rektangeln. */
function createHtmlSession(url: string, muted: boolean, onReady: () => void, onFail: () => void) {
  const video = document.createElement('video')
  video.muted = muted
  video.autoplay = true
  video.playsInline = true
  video.style.cssText = 'position:fixed;object-fit:cover;background:#000;pointer-events:none;z-index:5;border-radius:inherit'
  video.dataset.liveTvSurface = ''
  video.addEventListener('canplay', onReady, { once: true })
  video.addEventListener('error', onFail, { once: true })
  document.body.appendChild(video)
  const src = hostProxyUrl(window.location.origin, url)
  const Hls = getHls()
  let hls: { destroy(): void } | null = null
  if (isHls(url) && Hls && (Hls as unknown as { isSupported(): boolean }).isSupported()) {
    const instance = new (Hls as unknown as new () => { loadSource(u: string): void; attachMedia(v: HTMLVideoElement): void; destroy(): void })()
    instance.loadSource(src)
    instance.attachMedia(video)
    hls = instance
  } else {
    video.src = src
  }
  void video.play().catch(() => {})
  return {
    setBounds(rect: Rect) {
      video.style.left = `${rect.left}px`
      video.style.top = `${rect.top}px`
      video.style.width = `${rect.width}px`
      video.style.height = `${rect.height}px`
    },
    setMuted(m: boolean) { video.muted = m },
    async close() {
      hls?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.remove()
    },
  }
}

export function useVideoSurface(rectRef: RefObject<HTMLElement | null>, source: SurfaceSource | null, options: VideoSurfaceOptions): VideoSurfaceHandle {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [live, setLive] = useState(false)
  const idRef = useRef<symbol>(Symbol('surface'))
  const enabled = options.enabled !== false && source !== null
  const url = source?.url ?? null
  const muted = options.muted
  const audio = options.audio === true
  const frameUrl = source ? playerFrameUrl(channelKey(source.channel)) : null

  useEffect(() => {
    if (!enabled || !url) {
      setLive(false)
      setReady(false)
      return
    }
    const caps = videoSurfaceCapabilities()
    let cancelled = false
    let setBounds: ((rect: Rect) => void) | null = null
    let closeSession: (() => Promise<void>) | null = null
    let readyTimer = 0
    const markReady = () => { if (!cancelled) setReady(true) }
    const markFailed = () => { if (!cancelled) { setFailed(true); setReady(false) } }

    const start = async () => {
      setFailed(false)
      setReady(false)
      if (caps.engine === 'host' && host.createVideoSurface) {
        const surface = host.createVideoSurface()
        if (!surface) { setLive(false); return }
        const off = surface.onState((s) => { if (s.firstFrameRendered) markReady(); if (s.loadFailed) markFailed() })
        setBounds = (rect) => surface.setBounds(rect)
        closeSession = async () => { off(); await surface.destroy() }
        setLive(true)
        await surface.open({ url, muted }).catch(markFailed)
        return
      }
      // v1: en yta. Bara ägaren spelar; ljudrutan har företräde.
      if (owner !== null && owner !== idRef.current) {
        if (!audio) { setLive(false); return }
        await releaseAllSurfaces()
      }
      if (cancelled) return
      owner = idRef.current
      setLive(true)
      if (caps.engine === 'mpv') {
        await openMpvPlayer({ url }).catch(markFailed)
        await mpvSetPropertyStrings([{ name: 'mute', value: muted ? 'yes' : 'no' }]).catch(() => {})
        setBounds = (rect) => mpvSetBounds(rect)
        closeSession = () => closeMpvPlayer()
        readyTimer = window.setTimeout(markReady, 800)
      } else if (caps.engine === 'droid') {
        if (muted) { setLive(false); owner = null; return }
        await openNativePlayer({ url, mimeType: isHls(url) ? HOST_PROXY_MIME : undefined }).catch(markFailed)
        setBounds = (rect) => nativeSetBounds(rect)
        closeSession = () => closeNativePlayer()
        readyTimer = window.setTimeout(markReady, 800)
      } else {
        const session = createHtmlSession(url, muted, markReady, markFailed)
        setBounds = (rect) => session.setBounds(rect)
        closeSession = () => session.close()
      }
      ownerClose = async () => { await closeSession?.() }
      const rect = measure(rectRef.current)
      if (rect) setBounds(rect)
    }
    void start()

    const sync = () => {
      const rect = measure(rectRef.current)
      if (rect && setBounds) setBounds(rect)
    }
    const observer = typeof ResizeObserver !== 'undefined' && rectRef.current ? new ResizeObserver(sync) : null
    if (observer && rectRef.current) observer.observe(rectRef.current)
    window.addEventListener('resize', sync)
    document.addEventListener('scroll', sync, true)
    const onReleased = () => { if (owner !== idRef.current) setLive(false) }
    waiters.add(onReleased)

    return () => {
      cancelled = true
      window.clearTimeout(readyTimer)
      observer?.disconnect()
      window.removeEventListener('resize', sync)
      document.removeEventListener('scroll', sync, true)
      waiters.delete(onReleased)
      if (owner === idRef.current) {
        owner = null
        ownerClose = null
        void closeSession?.().catch(() => {})
        notifyWaiters()
      } else {
        void closeSession?.().catch(() => {})
      }
    }
  }, [enabled, url, muted, audio, rectRef])

  return { ready, failed, live, frameUrl }
}
