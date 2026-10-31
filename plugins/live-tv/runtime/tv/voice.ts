'use client'

import { useEffect, useState } from 'react'

/**
 * RÖSTSÖKNING (Jerry 2026-10-31). Värdens brygga (lib/voice.ts, Android:
 * systemets röstdialog) läses direkt från `__lumioPluginRuntime.sdk` i stället
 * för via SDK-importen: pluginet byggs ibland mot ett värdträd utan den, och
 * en äldre värd ska bara dölja mikrofonen — inte fälla bygget eller sidan.
 */
type VoiceHost = { voiceAvailable?: () => Promise<boolean>; listenForVoice?: (opts?: { lang?: string; prompt?: string }) => Promise<string | null> }

const host = (): VoiceHost | undefined => (typeof window !== 'undefined'
  ? (window as unknown as { __lumioPluginRuntime?: { sdk?: VoiceHost } }).__lumioPluginRuntime?.sdk
  : undefined)

export function voiceAvailable(): Promise<boolean> {
  const fn = host()?.voiceAvailable
  return fn ? fn().catch(() => false) : Promise.resolve(false)
}

export function listenVoice(lang?: string, prompt?: string): Promise<string | null> {
  const fn = host()?.listenForVoice
  return fn ? fn({ lang, prompt }).catch(() => null) : Promise.resolve(null)
}

/** `true` när enheten har en röstdialog; `false` tills frågan svarat. */
export function useVoiceAvailable(): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let alive = true
    void voiceAvailable().then((v) => { if (alive) setOk(v) })
    return () => { alive = false }
  }, [])
  return ok
}
