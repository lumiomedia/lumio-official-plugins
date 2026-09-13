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
import { registerSurfaceCutout, unregisterSurfaceCutout } from './surface-cutouts'
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
  // `nativeBehindDom` finns bara i nyare appar (lib/video-surfaces.ts) — läses
  // defensivt och tolkas som "inte nativ bakom DOM:en" när den saknas.
  getVideoSurfaceCapabilities?: () => { maxSurfaces: number; nativeBehindDom?: boolean }
  // Finns bara i nyare appversioner; läses defensivt så att bunten bygger mot
  // appträd som saknar den.
  mpvSetPropertyStrings?: (props: Array<{ name: string; value: string }>) => Promise<void>
  // Värdens egen uppstädning av extraytor. Finns inte i alla appar — läses
  // defensivt, precis som de andra valfria broarna här.
  closeAllAuxSurfaces?: () => Promise<void> | void
}
const host = sdk as unknown as HostApi

/**
 * `nativeBehindDom` = ytan ritas UTANFÖR DOM:en, i en vy under webbvyn. Då
 * syns bilden bara där gränssnittet är genomskinligt över rektangeln, och
 * skalet måste klippa hål i sin bakgrund (`surface-cutouts.ts`). HTML-motorn
 * lägger i stället ett `<video>` i rutan och behöver inget hål.
 */
export function videoSurfaceCapabilities(): { maxLive: number; engine: 'mpv' | 'droid' | 'html' | 'host'; nativeBehindDom: boolean } {
  if (typeof host.createVideoSurface === 'function' && typeof host.getVideoSurfaceCapabilities === 'function') {
    const caps = host.getVideoSurfaceCapabilities()
    return { maxLive: Math.max(0, caps.maxSurfaces - 1), engine: 'host', nativeBehindDom: caps.nativeBehindDom === true }
  }
  const engine = isDesktopTauriEnv ? 'mpv' : isAndroidTauriEnv ? 'droid' : 'html'
  return { maxLive: 1, engine, nativeBehindDom: engine !== 'html' }
}

/* ---------- v1: en enda nativ yta ---------- */

let owner: symbol | null = null
let ownerClose: (() => Promise<void>) | null = null
/**
 * Värdens ytor har ingen enda ägare: `getVideoSurfaceCapabilities()` lovar
 * flera samtidiga ytor, så `owner`/`ownerClose` (som bara rymmer EN) räcker
 * inte. Varje öppnad värdyta lägger i stället sin stängare här, och
 * `releaseAllSurfaces()` river dem allihop — annars fortsatte multivyns rutor
 * spela under spelaren, som är precis vad anroparen bad om att slippa.
 */
const hostSurfaces = new Set<() => Promise<void>>()
/**
 * `reacquire` = ytan släpptes för att dess ÄGARE försvann (avmontering), inte
 * för att någon annan tar över skärmen. Bara då får en vilande yta försöka
 * igen: `releaseAllSurfaces()` anropas av skalet strax innan spelaren öppnas,
 * och en förhandsvisning som genast tog tillbaka ytan hade konkurrerat med
 * just den spelare den nyss lämnade plats åt.
 */
const waiters = new Set<(reacquire: boolean) => void>()

function notifyWaiters(reacquire: boolean) {
  for (const w of waiters) w(reacquire)
}

export async function releaseAllSurfaces(): Promise<void> {
  const close = ownerClose
  owner = null
  ownerClose = null
  const hosts = [...hostSurfaces]
  hostSurfaces.clear()
  if (close) await close().catch(() => {})
  for (const closeHost of hosts) await closeHost().catch(() => {})
  const closeAux = host.closeAllAuxSurfaces
  if (typeof closeAux === 'function') {
    try { await closeAux() } catch { /* värdens uppstädning får aldrig fälla anroparen */ }
  }
  notifyWaiters(false)
}

/**
 * Rutan som kan bära en ankrad <video>, eller null.
 *
 * Kravet är ett positionerat block: `position: absolute; inset: 0` gäller
 * närmaste positionerade förfader, så en statisk ruta hade låtit videon fylla
 * något helt annat. `TvPreview` och multivyns ruta sätter redan
 * `position: relative` + `overflow: hidden`. Rutan ändras INTE härifrån —
 * en yta som skriver i anroparens stil är en osynlig bieffekt som ingen hittar
 * — i stället faller vi tillbaka på den gamla fixed-portalen, som fungerar
 * överallt men målas under appens TV-sida.
 */
const POSITIONED = new Set(['relative', 'absolute', 'fixed', 'sticky'])

function anchorHost(el: HTMLElement | null): HTMLElement | null {
  if (!el || typeof window === 'undefined') return null
  // Vitlista i stället för `!== 'static'`: jsdom svarar tomma strängen för ett
  // element utan egen position, och det hade räknats som positionerat.
  return POSITIONED.has(window.getComputedStyle(el).position) ? el : null
}

function measure(el: HTMLElement | null): Rect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return null
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

/**
 * Rutans hörnradie i SKÄRMPIXLAR.
 *
 * `getComputedStyle` svarar i layoutpixlar, men TV-scenen skalar hela sidan
 * med en `transform` — rektangeln vi registrerar är mätt med
 * `getBoundingClientRect()` (skärmpixlar) och radien måste ligga i samma rymd.
 * Skalan läses ur elementet självt (mätt bredd / layoutbredd) i stället för ur
 * en scenvariabel: då stämmer den även utanför TV-scenen och i tester.
 */
function cornerRadius(el: HTMLElement | null): number {
  if (!el || typeof window === 'undefined') return 0
  const raw = Number.parseFloat(window.getComputedStyle(el).borderTopLeftRadius)
  if (!Number.isFinite(raw) || raw <= 0) return 0
  const layoutWidth = el.offsetWidth
  const screenWidth = el.getBoundingClientRect().width
  const scale = layoutWidth > 0 && screenWidth > 0 ? screenWidth / layoutWidth : 1
  return raw * scale
}

function isHls(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || !/\.[a-z0-9]{2,4}(\?|$)/i.test(url)
}

/**
 * HTML-motor: ett <video> INNE i rutan, inte en fixed portal på body.
 *
 * Portalen på `body` med `position: fixed; z-index: 5` var två mätta fel:
 *
 * 1. OSYNLIG. Appens TV-sida ligger i `div.relative z-10` — z-index 10 — så
 *    sidan målades ÖVER videon. Uppmätt i tv-sim: strömmen spelade
 *    (`readyState` 4, `currentTime` växte) på exakt rätt plats
 *    (201,108,480×270) och rutan var ändå svart; satte man `z-index: 9999`
 *    syntes bilden direkt.
 * 2. FEL STORLEK när scenens skala ≠ 1. `:root[data-tv-scene="1"] body` har en
 *    `transform`, och en `position: fixed`-nod inuti en transformerad förälder
 *    positioneras i den TRANSFORMERADE rymden. Rektangeln mäts med
 *    `getBoundingClientRect()` (skärmpixlar) och skalades därför en gång till.
 *    Uppmätt på 1280×720 (skala 0,667): en ruta mätt till 1280 px ritades
 *    853 px bred. På 1920×1080 sammanfaller talen, vilket är varför det inte
 *    syntes i simulatorn.
 *
 * Som barn till rutan försvinner båda: videon ärver rutans stackningskontext
 * (samma lager som resten av pluginets yta, inga z-krig med värdsidan) och
 * följer rutans storlek utan en enda koordinat. `setBounds` blir därmed en
 * nullhandling för den här motorn — mpv/droid behåller sin väg, för en NATIV
 * yta ligger utanför DOM:en och behöver just skärmkoordinater.
 *
 * Videon läggs FÖRST i rutan. Etiketterna ("LIVE STREAM, MUTED", LIVE-taggen,
 * multivyns kanalnamn) är absolut positionerade syskon utan z-index, och bland
 * positionerade element på samma nivå vinner den som kommer sist i DOM:en — de
 * målas alltså ovanpå videon, som i handoffen.
 *
 * Saknas en positionerad ruta (ingen ref ännu, eller en statisk ruta — se
 * `anchorHost`) faller vi tillbaka på den gamla portalen: en felplacerad
 * förhandsvisning är bättre än ingen alls, och `setBounds` gör då fortfarande
 * sitt jobb.
 */
function createHtmlSession(url: string, muted: boolean, onReady: () => void, onFail: () => void, hostEl: HTMLElement | null) {
  const video = document.createElement('video')
  video.muted = muted
  video.autoplay = true
  video.playsInline = true
  video.dataset.liveTvSurface = ''
  video.addEventListener('canplay', onReady, { once: true })
  video.addEventListener('error', onFail, { once: true })
  const anchored = hostEl !== null
  if (hostEl) {
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;pointer-events:none;z-index:0;border-radius:inherit'
    // INVARIANT: videon ska vara rutans FÖRSTA barn. Etiketterna (LIVE-taggen,
    // "MUTED", multivyns kanalnamn) är absolut positionerade syskon utan
    // z-index, och bland positionerade element på samma nivå vinner den som
    // kommer sist i DOM:en. Läggs videon sist målas den alltså över dem, och
    // hela överlagret försvinner. `insertBefore(..., firstChild)` — aldrig
    // `appendChild` — och video-surface.test.tsx vaktar ordningen.
    hostEl.insertBefore(video, hostEl.firstChild)
  } else {
    video.style.cssText = 'position:fixed;object-fit:cover;background:#000;pointer-events:none;z-index:5;border-radius:inherit'
    document.body.appendChild(video)
  }
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
      // Ett barn följer sin förälder: inget att räkna, och inget att räkna fel.
      if (anchored) return
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

/**
 * En videoyta som fyller `rectRef`.
 *
 * KRAV PÅ RUTAN: den ska vara ett positionerat block, i praktiken
 * `position: relative` + `overflow: hidden` (så som `TvPreview` och multivyns
 * ruta gör). HTML-motorn lägger sitt `<video>` som ett absolut positionerat
 * barn i rutan, och `inset: 0` gäller närmaste POSITIONERADE förfader — en
 * statisk ruta hade låtit videon fylla något helt annat. Hooken ändrar aldrig
 * rutans stil; är rutan statisk faller den tillbaka på den gamla
 * fixed-portalen (se `anchorHost`), som hamnar under appens TV-sida.
 *
 * Nativemotorerna (mpv, droid, värdens yta) ligger utanför DOM:en och får i
 * stället rutans skärmkoordinater, uppdaterade av ResizeObserver + resize +
 * scroll. De lyssnarna registreras bara för de motorerna.
 */
export function useVideoSurface(rectRef: RefObject<HTMLElement | null>, source: SurfaceSource | null, options: VideoSurfaceOptions): VideoSurfaceHandle {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [live, setLive] = useState(false)
  // Räknare, inte flagga: varje uppräkning kör om effekten, och en NY körning
  // får färska `spent`/`closeOnce` (de är per körning). Utan omkörningen blev
  // en evicerad eller nekad yta svart för alltid — även när ägaren försvann
  // sekunden efter.
  const [attempt, setAttempt] = useState(0)
  const idRef = useRef<symbol>(Symbol('surface'))
  const enabled = options.enabled !== false && source !== null
  const url = source?.url ?? null
  const muted = options.muted
  const audio = options.audio === true
  const frameUrl = source ? playerFrameUrl(channelKey(source.channel)) : null

  useEffect(() => {
    if (!enabled || !url) {
      unregisterSurfaceCutout(idRef.current)
      setLive(false)
      setReady(false)
      return
    }
    const caps = videoSurfaceCapabilities()
    // Nativ yta = bilden ligger BAKOM webbvyn. Rutans skärmrektangel skrivs in
    // i `surface-cutouts` medan ytan lever, och skalet klipper hål i sin
    // bakgrund där. Utan hålet spelar rutan med ljud och utan bild.
    const cutoutKey = idRef.current
    const needsCutout = caps.nativeBehindDom
    let cutoutLive = false
    const dropCutout = () => {
      cutoutLive = false
      unregisterSurfaceCutout(cutoutKey)
    }
    // Ankrad HTML-yta = videon är ett barn till rutan och följer den av sig
    // själv. Då finns inga koordinater att hålla i takt, och ResizeObserver,
    // resize och scroll nedan skulle bara kalla en nullhandling.
    const htmlHost = caps.engine === 'html' ? anchorHost(rectRef.current) : null
    const anchored = htmlHost !== null
    let cancelled = false
    let setBounds: ((rect: Rect) => void) | null = null
    let closeSession: (() => Promise<void>) | null = null
    let readyTimer = 0
    let spent = false
    const markReady = () => { if (!cancelled) setReady(true) }
    const markFailed = () => {
      // Rutan faller tillbaka till kanalbilden och målas ogenomskinlig igen —
      // hålet måste stängas i samma veva, annars lyser skrivbordet igenom.
      dropCutout()
      if (!cancelled) { setFailed(true); setReady(false) }
    }
    // Enkelavtryck: en gång stängd, alltid stängd. En evicerad instans (se
    // nedan) kan annars stänga NÄSTA ägares ström när dess egen effekt-städning
    // körs, eftersom mpv/droid-stängning är parameterlös (den stänger vad som
    // än är öppet just nu, inte specifikt vår egen session).
    const closeOnce = async () => {
      if (spent) return
      spent = true
      await closeSession?.().catch(() => {})
    }

    const sync = () => {
      const rect = measure(rectRef.current)
      if (!rect) return
      if (setBounds) setBounds(rect)
      if (cutoutLive) registerSurfaceCutout(cutoutKey, { ...rect, radius: cornerRadius(rectRef.current) })
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
        // Spåras så att releaseAllSurfaces() river ÄVEN värdens ytor.
        hostSurfaces.add(closeOnce)
        cutoutLive = needsCutout
        setLive(true)
        sync()
        await surface.open({ url, muted }).catch(markFailed)
        sync()
        return
      }
      // mpv utan mute-brygga: exakt samma regel som droid nedan. `openMpvPlayer`
      // startar alltid med ljud, och tystandet sker efteråt via den VALFRIA
      // `mpvSetPropertyStrings`. Saknas den (alla nuvarande skrivbordsbyggen)
      // spelade en "tyst" förhandsvisning på full volym. Kontrolleras FÖRE
      // ägarskapsanspråket, av samma skäl som droid-grenen.
      if (caps.engine === 'mpv' && muted && typeof host.mpvSetPropertyStrings !== 'function') {
        setLive(false)
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
      cutoutLive = needsCutout
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
        const session = createHtmlSession(url, muted, markReady, markFailed, htmlHost)
        closeSession = () => session.close()
        setBounds = (rect) => session.setBounds(rect)
      }
      ownerClose = closeOnce
      sync()
    }
    void start()

    const observer = !anchored && typeof ResizeObserver !== 'undefined' && rectRef.current ? new ResizeObserver(sync) : null
    if (observer && rectRef.current) observer.observe(rectRef.current)
    if (!anchored) {
      window.addEventListener('resize', sync)
      document.addEventListener('scroll', sync, true)
    }
    const onReleased = (reacquire: boolean) => {
      if (caps.engine === 'host') {
        // Värdytor äger inget `owner`-lås: de är släppta exakt när
        // releaseAllSurfaces() plockat bort deras stängare ur mängden.
        if (hostSurfaces.has(closeOnce)) return
        dropCutout()
        setLive(false)
        if (reacquire) setAttempt((n) => n + 1)
        return
      }
      if (owner === idRef.current) return
      dropCutout()
      setLive(false)
      // Ägarskapet är ledigt igen (ägaren avmonterades): försök ta ytan.
      if (reacquire && owner === null) setAttempt((n) => n + 1)
    }
    waiters.add(onReleased)

    return () => {
      cancelled = true
      dropCutout()
      window.clearTimeout(readyTimer)
      observer?.disconnect()
      if (!anchored) {
        window.removeEventListener('resize', sync)
        document.removeEventListener('scroll', sync, true)
      }
      waiters.delete(onReleased)
      hostSurfaces.delete(closeOnce)
      if (owner === idRef.current) {
        owner = null
        ownerClose = null
        void closeOnce()
        notifyWaiters(true)
      } else {
        void closeOnce()
      }
    }
  }, [enabled, url, muted, audio, rectRef, attempt])

  return { ready, failed, live, frameUrl }
}
