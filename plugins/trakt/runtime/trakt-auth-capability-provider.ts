'use client'

import {
  clearTraktAuth,
  getTraktAuth,
  type AuthCapabilityProvider,
  type AuthCapabilityStatus,
} from '@/lib/plugin-sdk'

// Without this provider Settings had no way to know whether Trakt actually has
// an account attached: renderPluginSectionDot treats "no auth providers" as
// "nothing to connect", so the section dot was green on a plugin that had never
// been signed in to.
function getStatus(): AuthCapabilityStatus {
  const auth = getTraktAuth()

  if (!auth?.accessToken || !auth.refreshToken) {
    return {
      state: 'disconnected',
      canConnect: true,
      canDisconnect: false,
      requiresUserGesture: true,
      supportsSilentReconnect: false,
    }
  }

  const accountLabel = auth.name || auth.username || 'Trakt'

  // An expired access token is not a broken connection: /api/trakt/* refreshes
  // it from the stored refresh token on the next call. Only report 'expired'
  // when there is nothing left to refresh with.
  return {
    state: 'connected',
    canConnect: true,
    canDisconnect: true,
    requiresUserGesture: true,
    supportsSilentReconnect: true,
    accountLabel,
  }
}

export const traktAuthCapabilityProvider: AuthCapabilityProvider = {
  id: 'trakt-auth',
  pluginId: 'com.lumio.trakt',
  label: { en: 'Trakt', sv: 'Trakt' },
  getStatus,
  async disconnect() {
    clearTraktAuth()
  },
  async trySilentReconnect() {
    // The device flow needs the user to approve a code on trakt.tv; the token
    // refresh that does work happens server-side on each Trakt call.
    return getTraktAuth() ? 'success' : 'needs_user_action'
  },
}
