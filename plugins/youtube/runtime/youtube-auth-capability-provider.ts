'use client'

import type { AuthCapabilityProvider, AuthCapabilityStatus } from '@/lib/plugin-sdk'
import { connectYouTube, disconnectYouTube } from './youtube-auth'
import { getYouTubeSettings, getYouTubeSession, isYouTubeSessionValid } from './youtube-storage'

function getStatus(): AuthCapabilityStatus {
  const settings = getYouTubeSettings()
  const session = getYouTubeSession()

  if (!settings.clientId.trim()) {
    return {
      state: 'disconnected',
      canConnect: false,
      canDisconnect: false,
      requiresUserGesture: true,
      supportsSilentReconnect: false,
      detail: { en: 'Add a Google OAuth Client ID first.', sv: 'Lagg till ett Google OAuth Client ID forst.' },
    }
  }

  if (isYouTubeSessionValid(session)) {
    return {
      state: 'connected',
      canConnect: true,
      canDisconnect: true,
      requiresUserGesture: true,
      supportsSilentReconnect: false,
      accountLabel: session?.channelTitle ?? 'YouTube',
    }
  }

  if (session) {
    return {
      state: 'expired',
      canConnect: true,
      canDisconnect: true,
      requiresUserGesture: true,
      supportsSilentReconnect: false,
      accountLabel: session.channelTitle ?? 'YouTube',
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

export const youtubeAuthCapabilityProvider: AuthCapabilityProvider = {
  id: 'youtube-auth',
  pluginId: 'com.lumio.youtube',
  label: { en: 'YouTube', sv: 'YouTube' },
  getStatus,
  async connect() {
    const settings = getYouTubeSettings()
    await connectYouTube(settings.clientId)
  },
  async disconnect() {
    await disconnectYouTube()
  },
  async trySilentReconnect() {
    return 'needs_user_action'
  },
}
