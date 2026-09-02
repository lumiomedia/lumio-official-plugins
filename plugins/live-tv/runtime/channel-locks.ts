'use client'

import { useEffect, useState } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { onPluginStorageChanged, readPluginJson, writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey, type M3uChannel } from './live-tv-data'

/**
 * Föräldrakontroll per kanal: låsta kanaler kräver PROFILENS PIN-kod innan de
 * spelas. Låsen är lokal plugin-lagring; PIN-verifieringen går via appens
 * SDK. Den funktionen finns bara i appar från 0.1.57, därför läses den
 * dynamiskt — pluginet ska bygga och fungera mot äldre appar (låsning är då
 * inte tillgänglig och UI:t säger det).
 */
export const LOCKED_CHANNELS_KEY = 'locked_channels_v1'

type PinBridge = {
  activeProfileHasPin?: () => boolean
  verifyActiveProfilePin?: (pin: string) => Promise<boolean>
}

function bridge(): PinBridge {
  return sdk as unknown as PinBridge
}

export function pinSupportAvailable(): boolean {
  const b = bridge()
  return typeof b.activeProfileHasPin === 'function' && typeof b.verifyActiveProfilePin === 'function'
}

export function activeProfileHasPin(): boolean {
  const b = bridge()
  try {
    return typeof b.activeProfileHasPin === 'function' ? b.activeProfileHasPin() : false
  } catch {
    return false
  }
}

export async function verifyActiveProfilePin(pin: string): Promise<boolean> {
  const b = bridge()
  if (typeof b.verifyActiveProfilePin !== 'function') return false
  try {
    return await b.verifyActiveProfilePin(pin)
  } catch {
    return false
  }
}

function sanitize(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string' && value.length > 0) : []
}

export function getLockedChannelKeys(): string[] {
  return sanitize(readPluginJson<unknown>(LIVE_TV_PLUGIN_ID, LOCKED_CHANNELS_KEY, []))
}

export function isChannelLocked(channel: Pick<M3uChannel, 'name' | 'url'>): boolean {
  return getLockedChannelKeys().includes(channelKey(channel))
}

export function toggleChannelLock(channel: Pick<M3uChannel, 'name' | 'url'>): string[] {
  const key = channelKey(channel)
  const current = getLockedChannelKeys()
  const next = current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
  writePluginJson(LIVE_TV_PLUGIN_ID, LOCKED_CHANNELS_KEY, next)
  return next
}

export function onChannelLocksChanged(listener: () => void): () => void {
  return onPluginStorageChanged(LIVE_TV_PLUGIN_ID, LOCKED_CHANNELS_KEY, listener)
}

export function useLockedChannelKeys(): Set<string> {
  const [keys, setKeys] = useState<string[]>(() => getLockedChannelKeys())
  useEffect(() => onChannelLocksChanged(() => setKeys(getLockedChannelKeys())), [])
  return new Set(keys)
}

/**
 * Upplåsning gäller sessionen: när PIN:en godkänts en gång behöver användaren
 * inte skriva den igen förrän appen startas om.
 */
let unlockedThisSession = false
export function markUnlockedThisSession(): void {
  unlockedThisSession = true
}
export function isUnlockedThisSession(): boolean {
  return unlockedThisSession
}
