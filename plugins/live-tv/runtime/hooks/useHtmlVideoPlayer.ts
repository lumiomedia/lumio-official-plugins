import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/**
 * `<video>` bakom mpv-hookens gränssnitt.
 *
 * Live TV-spelaren hade två helt skilda renderingar: en fullmatad för mpv och
 * den nativa Android-spelaren, och en boxad lightbox med `<video controls>`
 * för webbläsarsessioner (iPhone över Fjärr/LAN, telefonens webbläsare).
 * Kontrollraden, tablå-overlayen, kanalbytaren och påminnelserna fanns bara i
 * den första (Jerry 2026-09-03).
 *
 * Hela mpv-grenens gränssnitt går via ett fåtal fält och funktioner
 * (`paused`, `timePos`, `setPlayPause`, `setVolume`, `setMuted`, …). Den här
 * hooken speglar dem mot ett HTML-videoelement, så EN rendering kan driva alla
 * tre motorerna och webbläsaren får samma spelare som skrivbordet.
 *
 * Fälten som bara betyder något för mpv (`sid`, `pausedForCache` som cache-
 * mått, mpv:s felkoder) finns med för att formen ska stämma, men bärs av
 * videoelementets närmaste motsvarighet — eller ett neutralt värde.
 */
export interface HtmlVideoPlayerState {
  timePos: number
  duration: number
  paused: boolean
  ended: boolean
  sid: number | null
  fileLoaded: boolean
  fileLoadedToken: number
  playbackRestarted: boolean
  playbackRestartedToken: number
  pausedForCache: boolean
  coreIdle: boolean
  firstFrameRendered: boolean
  loadFailed: boolean
  loadFailedToken: number
  loadFailedError: number | null
  seek: (time: number) => void
  seekRelative: (delta: number) => void
  setPlayPause: (pause: boolean) => void
  setVolume: (vol: number) => void
  setSpeed: (value: number) => void
  setMuted: (muted: boolean) => void
  setAudioTrack: (aid: number) => void
  resetFileLoaded: () => void
  resetPlaybackRestarted: () => void
  resetFirstFrameRendered: () => void
  resetLoadFailed: () => void
  resetEnded: () => void
  resetTimePos: () => void
}

export function useHtmlVideoPlayer(
  enabled: boolean,
  videoRef: RefObject<HTMLVideoElement | null>,
): HtmlVideoPlayerState {
  const [timePos, setTimePos] = useState(0)
  const [duration, setDuration] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ended, setEnded] = useState(false)
  const [fileLoaded, setFileLoaded] = useState(false)
  const [fileLoadedToken, setFileLoadedToken] = useState(0)
  const [playbackRestarted, setPlaybackRestarted] = useState(false)
  const [playbackRestartedToken, setPlaybackRestartedToken] = useState(0)
  const [pausedForCache, setPausedForCache] = useState(false)
  const [firstFrameRendered, setFirstFrameRendered] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadFailedToken, setLoadFailedToken] = useState(0)
  const [loadFailedError, setLoadFailedError] = useState<number | null>(null)
  // Elementet monteras i samma rendering som hooken körs, så den första
  // effektomgången kan hinna före ref:en. Pollen nedan kopplar på när den
  // finns i stället för att tappa alla händelser tysta.
  const attachedRef = useRef<HTMLVideoElement | null>(null)
  const [attachTick, setAttachTick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    if (videoRef.current) return
    const timer = window.setInterval(() => {
      if (videoRef.current) setAttachTick((tick) => tick + 1)
    }, 60)
    return () => window.clearInterval(timer)
  }, [enabled, videoRef, attachTick])

  useEffect(() => {
    if (!enabled) return
    const media = videoRef.current
    if (!media) return
    attachedRef.current = media

    const onTime = () => setTimePos(media.currentTime || 0)
    const onDuration = () => {
      // Live har ingen längd: duration är Infinity (HLS/rollande fönster) och
      // NaN innan metadatan landat. Båda skulle rita "NaN" i kontrollraden.
      const value = media.duration
      setDuration(Number.isFinite(value) ? value : 0)
    }
    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)
    const onEnded = () => setEnded(true)
    const onLoadedMetadata = () => {
      setFileLoaded(true)
      setFileLoadedToken((token) => token + 1)
      onDuration()
    }
    const onPlaying = () => {
      setPaused(false)
      setPausedForCache(false)
      setPlaybackRestarted(true)
      setPlaybackRestartedToken((token) => token + 1)
      // `playing` avfyras när elementet faktiskt börjat visa bildrutor, vilket
      // är samma innebörd som mpv:s first-frame-rendered.
      setFirstFrameRendered(true)
    }
    const onWaiting = () => setPausedForCache(true)
    const onError = () => {
      setLoadFailedError(media.error?.code ?? null)
      setLoadFailed(true)
      setLoadFailedToken((token) => token + 1)
    }

    media.addEventListener('timeupdate', onTime)
    media.addEventListener('durationchange', onDuration)
    media.addEventListener('loadedmetadata', onLoadedMetadata)
    media.addEventListener('play', onPlay)
    media.addEventListener('pause', onPause)
    media.addEventListener('ended', onEnded)
    media.addEventListener('playing', onPlaying)
    media.addEventListener('waiting', onWaiting)
    media.addEventListener('error', onError)
    // Elementet kan redan ha hunnit förbi händelserna innan lyssnarna satt.
    setPaused(media.paused)
    if (media.readyState >= 1) onLoadedMetadata()

    return () => {
      media.removeEventListener('timeupdate', onTime)
      media.removeEventListener('durationchange', onDuration)
      media.removeEventListener('loadedmetadata', onLoadedMetadata)
      media.removeEventListener('play', onPlay)
      media.removeEventListener('pause', onPause)
      media.removeEventListener('ended', onEnded)
      media.removeEventListener('playing', onPlaying)
      media.removeEventListener('waiting', onWaiting)
      media.removeEventListener('error', onError)
    }
  }, [enabled, videoRef, attachTick])

  const seek = useCallback((time: number) => {
    const media = videoRef.current
    if (media) media.currentTime = time
  }, [videoRef])
  const seekRelative = useCallback((delta: number) => {
    const media = videoRef.current
    if (media) media.currentTime = (media.currentTime || 0) + delta
  }, [videoRef])
  const setPlayPause = useCallback((pause: boolean) => {
    const media = videoRef.current
    if (!media) return
    if (pause) media.pause()
    else void media.play().catch(() => {})
  }, [videoRef])
  const setVolume = useCallback((vol: number) => {
    const media = videoRef.current
    if (media) media.volume = Math.max(0, Math.min(1, vol))
  }, [videoRef])
  const setSpeed = useCallback((value: number) => {
    const media = videoRef.current
    if (media) media.playbackRate = value
  }, [videoRef])
  const setMuted = useCallback((next: boolean) => {
    const media = videoRef.current
    if (media) media.muted = next
  }, [videoRef])
  // Ljudspår i `<video>` kräver AudioTrackList, som ingen av de här
  // webbläsarna exponerar. Spårvalet finns inte i Live TV-kontrollraden.
  const setAudioTrack = useCallback(() => {}, [])

  const resetFileLoaded = useCallback(() => setFileLoaded(false), [])
  const resetPlaybackRestarted = useCallback(() => setPlaybackRestarted(false), [])
  const resetFirstFrameRendered = useCallback(() => setFirstFrameRendered(false), [])
  const resetLoadFailed = useCallback(() => {
    setLoadFailed(false)
    setLoadFailedError(null)
  }, [])
  const resetEnded = useCallback(() => setEnded(false), [])
  const resetTimePos = useCallback(() => setTimePos(0), [])

  return {
    timePos,
    duration,
    paused,
    ended,
    sid: null,
    fileLoaded,
    fileLoadedToken,
    playbackRestarted,
    playbackRestartedToken,
    pausedForCache,
    coreIdle: paused || !playbackRestarted,
    firstFrameRendered,
    loadFailed,
    loadFailedToken,
    loadFailedError,
    seek,
    seekRelative,
    setPlayPause,
    setVolume,
    setSpeed,
    setMuted,
    setAudioTrack,
    resetFileLoaded,
    resetPlaybackRestarted,
    resetFirstFrameRendered,
    resetLoadFailed,
    resetEnded,
    resetTimePos,
  }
}
