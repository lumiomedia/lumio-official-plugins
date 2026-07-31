'use client'

import type { AuthCapabilityProvider, AuthCapabilityStatus } from '@/lib/plugin-sdk'
import { connectTwitch, disconnectTwitch } from './twitch-auth'
import { getTwitchSession, isTwitchSessionValid } from './twitch-storage'

function getStatus(): AuthCapabilityStatus {
  const session = getTwitchSession()

  if (isTwitchSessionValid(session)) {
    return {
      state: 'connected',
      canConnect: true,
      canDisconnect: true,
      requiresUserGesture: true,
      supportsSilentReconnect: false,
      accountLabel: session?.displayName ?? 'Twitch',
    }
  }

  if (session) {
    return {
      state: 'expired',
      canConnect: true,
      canDisconnect: true,
      requiresUserGesture: true,
      supportsSilentReconnect: false,
      accountLabel: session.displayName ?? 'Twitch',
      detail: { en: 'Session expired. Reconnect required.', sv: 'Sessionen har gått ut. Återanslut krävs.' },
    }
  }

  return {
    state: 'disconnected',
    canConnect: true,
    canDisconnect: false,
    requiresUserGesture: true,
    supportsSilentReconnect: false,
  }
}

export const twitchAuthCapabilityProvider: AuthCapabilityProvider = {
  id: 'twitch-auth',
  pluginId: 'com.lumio.twitch',
  label: { en: 'Twitch', sv: 'Twitch' },
  getStatus,
  async connect() {
    // The device-code flow needs to surface a user code + verification URL
    // interactively — that UX lives in TwitchSettingsSection, which calls
    // connectTwitch() directly with its own onCode handler. This generic
    // entry point exists to satisfy the AuthCapabilityProvider contract for
    // any non-plugin-specific caller and simply drives the same flow blind.
    await connectTwitch(() => {})
  },
  async disconnect() {
    disconnectTwitch()
  },
  async trySilentReconnect() {
    return 'needs_user_action'
  },
}
