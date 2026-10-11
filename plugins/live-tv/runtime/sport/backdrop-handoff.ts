'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { notifyBackdropUploadsChanged, type BackdropScope } from './backdrop'

const BASE = '/api/live-tv/sport/backdrop-handoff'
const POLL_MS = 2_000

/**
 * TV:ns sida när en bild ska komma från telefonen (samma mönster som
 * nyckelöverlämningen): en engångskod för platsen, QR till Soffläges port
 * 3012, och lokal pollning medan raden är öppen. Bilden sparas av värden;
 * här meddelas bara att listan över egna bilder ändrats.
 */
export function useBackdropHandoff(active: boolean, slot: BackdropScope, onReceived?: () => void): { url: string | null; expired: boolean; received: boolean; restart(): void } {
  const [url, setUrl] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [received, setReceived] = useState(false)
  const [round, setRound] = useState(0)
  const onReceivedRef = useRef(onReceived)
  onReceivedRef.current = onReceived

  useEffect(() => {
    if (!active) return
    let stopped = false
    let code: string | null = null
    let done = false
    let timer: ReturnType<typeof setTimeout> | null = null
    setExpired(false)
    setReceived(false)
    setUrl(null)
    const loop = async () => {
      if (stopped || done || !code) return
      let state = 'waiting'
      try {
        const res = await fetch(`${BASE}?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
        state = res.ok ? ((await res.json()) as { state?: string }).state ?? 'waiting' : 'expired'
      } catch { /* nätfel: försök igen */ }
      if (stopped) return
      if (state === 'received') { done = true; setReceived(true); notifyBackdropUploadsChanged(); onReceivedRef.current?.(); return }
      if (state === 'expired') { done = true; setExpired(true); return }
      timer = setTimeout(() => void loop(), POLL_MS)
    }
    void (async () => {
      try {
        const res = await fetch(`${BASE}?slot=${slot}`, { method: 'POST' })
        if (!res.ok || stopped) return
        const body = (await res.json()) as { code?: string; url?: string | null }
        if (!body.code || stopped) return
        code = body.code
        setUrl(body.url ?? null)
        timer = setTimeout(() => void loop(), POLL_MS)
      } catch { /* värden nås inte */ }
    })()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      if (code && !done) void fetch(`${BASE}?code=${encodeURIComponent(code)}`, { method: 'DELETE' }).catch(() => {})
    }
  }, [active, slot, round])

  const restart = useCallback(() => setRound((n) => n + 1), [])
  return { url, expired, received, restart }
}
