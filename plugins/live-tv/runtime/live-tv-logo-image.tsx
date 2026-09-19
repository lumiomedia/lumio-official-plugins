'use client'

import { useEffect, useRef, useState } from 'react'
import { isTauriEnv } from '@/lib/plugin-sdk'

interface LiveTvLogoImageProps {
  src: string
  /** iptv-org-reserv (Task P1). Provas när leverantörens `src` fallerar. */
  fallbackSrc?: string | null
  alt: string
  className?: string
  onError?: () => void
}

type LogoStage = 'primary' | 'fallback'

const loadedLogoSrcs = new Set<string>()
const pendingLogoLoads: Array<() => void> = []
let activeLogoLoads = 0
const MAX_CONCURRENT_LOGO_LOADS = isTauriEnv ? 1 : 8

function drainLogoQueue() {
  while (activeLogoLoads < MAX_CONCURRENT_LOGO_LOADS && pendingLogoLoads.length > 0) {
    activeLogoLoads += 1
    const next = pendingLogoLoads.shift()
    next?.()
  }
}

function requestLogoLoad(start: () => void) {
  pendingLogoLoads.push(start)
  drainLogoQueue()
}

function finishLogoLoad(src: string) {
  loadedLogoSrcs.add(src)
  activeLogoLoads = Math.max(0, activeLogoLoads - 1)
  drainLogoQueue()
}

/**
 * Testhjälpare: nollställer laddköns modulglobala tillstånd. Utan den läcker
 * `loadedLogoSrcs`/`activeLogoLoads` mellan tester (samma URL:er tar
 * cache-genvägen i stället för att gå genom kön, och en läckt räknare kan
 * dölja en dubbelnedräkning). Används bara från tester.
 */
export function __resetLogoQueueForTests(): void {
  loadedLogoSrcs.clear()
  pendingLogoLoads.length = 0
  activeLogoLoads = 0
}

export function LiveTvLogoImage({ src, fallbackSrc, alt, className, onError }: LiveTvLogoImageProps) {
  const ref = useRef<HTMLImageElement | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [stage, setStage] = useState<LogoStage>('primary')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setShouldLoad(false)
    setStage('primary')
    setFailed(false)
  }, [src])

  useEffect(() => {
    if (loadedLogoSrcs.has(src)) {
      setShouldLoad(true)
      return
    }

    const node = ref.current
    if (!node || shouldLoad) return

    if (typeof IntersectionObserver === 'undefined') {
      requestLogoLoad(() => setShouldLoad(true))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          requestLogoLoad(() => setShouldLoad(true))
          observer.disconnect()
        }
      },
      { rootMargin: isTauriEnv ? '48px' : '160px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [shouldLoad, src])

  if (failed) return null

  // En reserv IDENTISK med `src` är inget nytt försök — bara ett bortkastat
  // andra anrop mot en adress som redan just fallerat. Räknas som "ingen
  // reserv" överallt nedanför, oavsett vilken av de fyra ytorna som ropat.
  const usableFallbackSrc = fallbackSrc && fallbackSrc !== src ? fallbackSrc : null

  // Reserven tar över samma bildplats som leverantörens logotyp — den
  // konsumerar inte en egen plats i laddkön (bara ett steg i samma laddning).
  const activeSrc = stage === 'fallback' && usableFallbackSrc ? usableFallbackSrc : src

  return (
    <img
      ref={ref}
      src={shouldLoad ? activeSrc : undefined}
      alt={alt}
      className={className}
      loading={isTauriEnv ? undefined : 'lazy'}
      decoding="async"
      fetchPriority="low"
      draggable={false}
      style={isTauriEnv ? undefined : { contentVisibility: 'auto' }}
      onLoad={() => finishLogoLoad(activeSrc)}
      onError={() => {
        if (stage === 'primary' && usableFallbackSrc) {
          // Leverantörens logotyp fallerade — prova reserven innan vi ger upp.
          // Ingen ny köplats begärs, och räknaren räknas inte ned här; det
          // sker när den bild som faktiskt laddades (reserven) själv landar.
          setStage('fallback')
          return
        }
        setFailed(true)
        finishLogoLoad(activeSrc)
        onError?.()
      }}
    />
  )
}
