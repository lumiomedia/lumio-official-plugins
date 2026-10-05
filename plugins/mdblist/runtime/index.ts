import { useEffect } from 'react'
import {
  notifyAuthCapabilitiesChanged, onProfileChanged,
  type AuthCapabilityProvider, type AuthCapabilityStatus, type LumioPlugin,
} from '@/lib/plugin-sdk'
import {
  device, disconnect, hasAuth, isTraktConnected, listSource, onAuthChanged, onTick, prefs, prefsSnapshot,
  scrobbler, startBackground, status, syncNow,
} from './host'
import { buildTvRows } from './rows'
import { MdblistSettingsSection } from './settings-section'
import { S } from './strings'

function getStatus(): AuthCapabilityStatus {
  const state = status.get()
  const base = { canConnect: true, requiresUserGesture: true, supportsSilentReconnect: false }
  if (!hasAuth()) return { ...base, state: 'disconnected', canDisconnect: false }
  if (state.connection === 'bad-key') return { ...base, state: 'error', canDisconnect: device.hasToken(), detail: S.badKey }
  return { ...base, state: 'connected', canDisconnect: device.hasToken(), accountLabel: state.username ?? 'MDBList' }
}

const authProvider: AuthCapabilityProvider = {
  id: 'mdblist-auth',
  pluginId: 'com.lumio.mdblist',
  label: S.pluginName,
  getStatus,
  async disconnect() {
    await disconnect()
  },
  async trySilentReconnect() {
    return hasAuth() ? 'success' : 'needs_user_action'
  },
}

function MdblistBootstrap() {
  useEffect(() => {
    const stop = startBackground()
    const offStatus = status.subscribe(() => notifyAuthCapabilitiesChanged())
    return () => { stop(); offStatus() }
  }, [])
  return null
}

export const MdblistPlugin: LumioPlugin = {
  id: 'com.lumio.mdblist',
  name: S.pluginName,
  version: '0.1.0',
  description: S.description,
  preinstalled: true,

  register(ctx) {
    ctx.registerAuthCapabilityProvider(authProvider)
    ctx.registerBootstrap({ id: 'mdblist-background', Mount: MdblistBootstrap })
    // Valfria: en äldre värd utan krokarna ska ändå kunna ladda pluginet.
    ctx.registerTracker?.({ id: 'mdblist', label: S.pluginName, scrobble: scrobbler })
    ctx.registerListSource?.({ id: 'mdblist', label: S.listSourceLabel, ...listSource })
    ctx.registerSettingsSection({
      id: 'mdblist',
      label: S.pluginName,
      Section: MdblistSettingsSection,
      rows: () => buildTvRows(
        {
          status: status.get(),
          prefs: prefsSnapshot(),
          hasAuth: hasAuth(),
          viaOauth: device.hasToken(),
          device: device.state(),
          traktConnected: isTraktConnected(),
          now: Date.now(),
        },
        {
          setPref: (kind, on) => prefs.setOn(kind, on),
          syncNow: () => { void syncNow({ pushWatched: true, reason: 'Synka nu (TV)' }) },
          connect: () => { void device.start() },
          cancelConnect: () => device.cancel(),
          disconnect: () => { void disconnect() },
        },
      ),
      subscribe: (listener) => {
        const offs = [status.subscribe(listener), device.subscribe(listener), onTick(listener), onAuthChanged(listener), onProfileChanged(listener)]
        return () => { for (const off of offs) off() }
      },
    })
  },
}

