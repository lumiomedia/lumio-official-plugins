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
  // Finns bara i nyare appversioner; läses defensivt så att bunten bygger mot
  // appträd som saknar den.
  mpvSetPropertyStrings?: (props: Array<{ name: string; value: string }>) => Promise<void>
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
    let spent = false
    const markReady = () => { if (!cancelled) setReady(true) }
    const markFailed = () => { if (!cancelled) { setFailed(true); setReady(false) } }
    // Enkelavtryck: en gång stängd, alltid stängd. En evicerad instans (se
    // nedan) kan annars stänga NÄSTA ägares ström när dess egen effekt-städning
    // körs, eftersom mpv/droid-stängning är parameterlös (den stänger vad som
    // än är öppet just nu, inte specifikt vår egen session).
    const closeOnce = async () => {
      if (spent) return
      spent = true
      await closeSession?.().catch(() => {})
    }

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
      // ExoPlayer saknar mute-API: öppna aldrig ljudlöst (visa bildruta i
      // stället). Kontrolleras FÖRE ägarskapsanspråket så att en instans som
      // ändå aldrig tänker öppna inte hinner evicera en existerande ägare i
      // onödan.
      if (caps.engine === 'droid' && muted) {
        setLive(false)
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
        closeSession = () => closeMpvPlayer()
        await openMpvPlayer({ url }).catch(markFailed)
        if (cancelled || owner !== idRef.current) { await closeOnce(); return }
        await host.mpvSetPropertyStrings?.([{ name: 'mute', value: muted ? 'yes' : 'no' }])?.catch(() => {})
        if (cancelled || owner !== idRef.current) { await closeOnce(); return }
        setBounds = (rect) => mpvSetBounds(rect)
        readyTimer = window.setTimeout(markReady, 800)
      } else if (caps.engine === 'droid') {
        closeSession = () => closeNativePlayer()
        await openNativePlayer({ url, mimeType: isHls(url) ? HOST_PROXY_MIME : undefined }).catch(markFailed)
        if (cancelled || owner !== idRef.current) { await closeOnce(); return }
        setBounds = (rect) => nativeSetBounds(rect)
        readyTimer = window.setTimeout(markReady, 800)
      } else {
        const session = createHtmlSession(url, muted, markReady, markFailed)
        closeSession = () => session.close()
        setBounds = (rect) => session.setBounds(rect)
      }
      ownerClose = closeOnce
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
        void closeOnce()
        notifyWaiters()
      } else {
        void closeOnce()
      }
    }
  }, [enabled, url, muted, audio, rectRef])

  return { ready, failed, live, frameUrl }
}
