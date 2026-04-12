'use client'

import { useEffect, useRef, useState } from 'react'
import { isTauriEnv } from '@/lib/plugin-sdk'

interface LiveTvLogoImageProps {
  src: string
  alt: string
  className?: string
  onError?: () => void
}

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

export function LiveTvLogoImage({ src, alt, className, onError }: LiveTvLogoImageProps) {
  const ref = useRef<HTMLImageElement | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setShouldLoad(false)
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

  return (
    <img
      ref={ref}
      src={shouldLoad ? src : undefined}
      alt={alt}
      className={className}
      loading={isTauriEnv ? undefined : 'lazy'}
      decoding="async"
      fetchPriority="low"
      draggable={false}
      style={isTauriEnv ? undefined : { contentVisibility: 'auto' }}
      onLoad={() => finishLogoLoad(src)}
      onError={() => {
        setFailed(true)
        finishLogoLoad(src)
        onError?.()
      }}
    />
  )
}
