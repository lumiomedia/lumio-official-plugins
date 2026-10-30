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

/**
 * En kortplats i laddkön. Kortet som begärde den äger den och måste lämna
 * tillbaka den — också när det försvinner eller byter kanal innan bilden
 * landat. Annars blir platsen upptagen för alltid, och med EN plats i appen
 * laddas sedan inga logotyper alls förrän appen startas om.
 */
interface LogoTicket {
  start: () => void
  active: boolean
  released: boolean
}

const pendingLogoLoads: LogoTicket[] = []
let activeLogoLoads = 0
const MAX_CONCURRENT_LOGO_LOADS = isTauriEnv ? 1 : 8

function drainLogoQueue() {
  while (activeLogoLoads < MAX_CONCURRENT_LOGO_LOADS && pendingLogoLoads.length > 0) {
    const next = pendingLogoLoads.shift()!
    activeLogoLoads += 1
    next.active = true
    next.start()
  }
}

function requestLogoLoad(start: () => void): LogoTicket {
  const ticket: LogoTicket = { start, active: false, released: false }
  pendingLogoLoads.push(ticket)
  drainLogoQueue()
  return ticket
}

function releaseLogoLoad(ticket: LogoTicket | null) {
  if (!ticket || ticket.released) return
  ticket.released = true
  if (ticket.active) {
    activeLogoLoads = Math.max(0, activeLogoLoads - 1)
    drainLogoQueue()
    return
  }
  const index = pendingLogoLoads.indexOf(ticket)
  if (index >= 0) pendingLogoLoads.splice(index, 1)
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
  const ticketRef = useRef<LogoTicket | null>(null)

  // Före kö-effekten: vid kanalbyte släpps den gamla platsen innan en ny begärs.
  useEffect(() => () => {
    releaseLogoLoad(ticketRef.current)
    ticketRef.current = null
  }, [src])

  const finishLogoLoad = (loadedSrc: string) => {
    loadedLogoSrcs.add(loadedSrc)
    releaseLogoLoad(ticketRef.current)
    ticketRef.current = null
  }

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
      ticketRef.current = requestLogoLoad(() => setShouldLoad(true))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          ticketRef.current = requestLogoLoad(() => setShouldLoad(true))
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
