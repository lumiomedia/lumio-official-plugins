'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const BASE = '/api/live-tv/sport/key-handoff'
const POLL_MS = 2_000

export async function startKeyHandoff(): Promise<{ code: string; url: string | null } | null> {
  try {
    const res = await fetch(BASE, { method: 'POST' })
    if (!res.ok) return null
    const body = (await res.json()) as { code?: string; url?: string | null }
    return body.code ? { code: body.code, url: body.url ?? null } : null
  } catch {
    return null
  }
}

export async function pollKeyHandoff(code: string): Promise<{ state: 'waiting' | 'received' | 'expired'; key?: string }> {
  try {
    const res = await fetch(`${BASE}?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
    if (!res.ok) return { state: 'expired' }
    return (await res.json()) as { state: 'waiting' | 'received' | 'expired'; key?: string }
  } catch {
    return { state: 'waiting' }
  }
}

export async function cancelKeyHandoff(code: string): Promise<void> {
  try { await fetch(`${BASE}?code=${encodeURIComponent(code)}`, { method: 'DELETE' }) } catch { /* värden borta: koden går ut av sig själv */ }
}

/**
 * TV:ns sida av överlämningen. Medan `active` gäller finns en kod. Den lokala
 * värden pollas var 2:a sekund (ingen kvot). Nyckeln levereras EN gång, och
 * koden avbryts när kortet stängs.
 */
export function useKeyHandoff(active: boolean, onKey: (key: string) => void): { url: string | null; expired: boolean; restart(): void } {
  const [url, setUrl] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [round, setRound] = useState(0)
  const onKeyRef = useRef(onKey)
  onKeyRef.current = onKey

  useEffect(() => {
    if (!active) return
    let stopped = false
    let code: string | null = null
    let done = false
    let timer: ReturnType<typeof setTimeout> | null = null
    setExpired(false)
    const loop = async () => {
      if (stopped || done || !code) return
      const r = await pollKeyHandoff(code)
      if (stopped) return
      if (r.state === 'received' && r.key) { done = true; onKeyRef.current(r.key); return }
      if (r.state === 'expired') { done = true; setExpired(true); return }
      timer = setTimeout(() => void loop(), POLL_MS)
    }
    void startKeyHandoff().then((h) => {
      if (stopped || !h) return
      code = h.code
      setUrl(h.url)
      timer = setTimeout(() => void loop(), POLL_MS)
    })
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      if (code) void cancelKeyHandoff(code)
    }
  }, [active, round])

  const restart = useCallback(() => setRound((n) => n + 1), [])
  return { url, expired, restart }
}
