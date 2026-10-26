'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * FYLL I PÅ TELEFONEN. Värdens `/api/phone-form` (Lumio 0.1.637+): TV:n
 * beskriver ett litet formulär, får en kod och en adress för QR:en, och
 * telefonen (samma LAN) fyller i och skickar EN gång. TV:n pollar den lokala
 * värden var 2:a sekund medan rutan är öppen (inget nät utanför huset).
 *
 * En äldre app saknar vägen: `phoneFormSupported()` svarar då nej och raden
 * visas inte — fjärrens tangentbord finns kvar som förut.
 */

const BASE = '/api/phone-form'
const POLL_MS = 2_000

export type PhoneFieldKind = 'text' | 'url' | 'password' | 'multiline'
export interface PhoneField { id: string; label: string; kind?: PhoneFieldKind; placeholder?: string; value?: string; required?: boolean }
export type PhoneFormLang = 'en' | 'sv' | 'de' | 'fr' | 'es'
export interface PhoneFormSpec { title: string; intro?: string; submit?: string; lang: PhoneFormLang; fields: PhoneField[] }
export type PhoneValues = Record<string, string>

let supported: Promise<boolean> | null = null

/** Har värden vägen? Frågas en gång per session (ett lokalt anrop). */
export function phoneFormSupported(): Promise<boolean> {
  supported ??= fetch(`${BASE}?code=probe`, { cache: 'no-store' })
    .then(async (res) => res.ok && typeof ((await res.json()) as { state?: unknown })?.state === 'string')
    .catch(() => false)
  return supported
}

export function __resetPhoneFormForTests(): void { supported = null }

export async function startPhoneForm(spec: PhoneFormSpec): Promise<{ code: string; url: string | null } | null> {
  try {
    const res = await fetch(BASE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(spec) })
    if (!res.ok) return null
    const body = (await res.json()) as { code?: string; url?: string | null }
    return body.code ? { code: body.code, url: body.url ?? null } : null
  } catch {
    return null
  }
}

export async function pollPhoneForm(code: string): Promise<{ state: 'waiting' | 'received' | 'expired'; values?: PhoneValues }> {
  try {
    const res = await fetch(`${BASE}?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
    if (!res.ok) return { state: 'expired' }
    return (await res.json()) as { state: 'waiting' | 'received' | 'expired'; values?: PhoneValues }
  } catch {
    return { state: 'waiting' }
  }
}

export async function cancelPhoneForm(code: string): Promise<void> {
  try { await fetch(`${BASE}?code=${encodeURIComponent(code)}`, { method: 'DELETE' }) } catch { /* värden borta: koden går ut av sig själv */ }
}

/**
 * TV:ns sida. Medan `active` gäller finns en kod; värdena levereras EN gång
 * till `onValues`, och koden avbryts när rutan stängs. `failed` = värden
 * öppnade ingen ruta (ingen LAN-adress eller fel), `url: null` utan `failed`
 * = fortfarande på väg.
 */
export function usePhoneForm(active: boolean, spec: PhoneFormSpec, onValues: (values: PhoneValues) => void): { url: string | null; expired: boolean; failed: boolean; restart(): void } {
  const [url, setUrl] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [failed, setFailed] = useState(false)
  const [round, setRound] = useState(0)
  const onValuesRef = useRef(onValues)
  onValuesRef.current = onValues
  const specRef = useRef(spec)
  specRef.current = spec

  useEffect(() => {
    if (!active) return
    let stopped = false
    let code: string | null = null
    let done = false
    let timer: ReturnType<typeof setTimeout> | null = null
    setExpired(false)
    setFailed(false)
    setUrl(null)
    const loop = async () => {
      if (stopped || done || !code) return
      const r = await pollPhoneForm(code)
      if (stopped) return
      if (r.state === 'received' && r.values) { done = true; onValuesRef.current(r.values); return }
      if (r.state === 'expired') { done = true; setExpired(true); return }
      timer = setTimeout(() => void loop(), POLL_MS)
    }
    void startPhoneForm(specRef.current).then((h) => {
      if (stopped) return
      if (!h || !h.url) { setFailed(true); if (h) void cancelPhoneForm(h.code); return }
      code = h.code
      setUrl(h.url)
      timer = setTimeout(() => void loop(), POLL_MS)
    })
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      if (code && !done) void cancelPhoneForm(code)
    }
  }, [active, round])

  const restart = useCallback(() => setRound((n) => n + 1), [])
  return { url, expired, failed, restart }
}

/** Telefonens svar på Lägg till-formuläret: M3U-adresser (en per rad) och/eller en Xtream-inloggning. */
export function playlistFromPhone(values: PhoneValues): { urls: string[]; xtream: { server: string; username: string; password: string } | null } {
  const urls = (values.m3u ?? '').split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s))
  const server = (values.server ?? '').trim()
  const username = (values.username ?? '').trim()
  const password = (values.password ?? '').trim()
  return { urls: [...new Set(urls)], xtream: server && username && password ? { server, username, password } : null }
}
