import type { PluginSettingsRow } from '@/lib/plugin-sdk'
import type { DeviceState } from './device-auth'
import type { PrefKind } from './prefs'
import type { StatusState } from './status'
import { fillBoth, S, type Text } from './strings'

export interface TvView {
  status: StatusState
  prefs: Record<PrefKind, boolean>
  hasAuth: boolean
  viaOauth: boolean
  device: DeviceState
  traktConnected: boolean
  now: number
}

export interface TvActions {
  setPref(kind: PrefKind, on: boolean): void
  syncNow(): void
  connect(): void
  cancelConnect(): void
  disconnect(): void
}

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function countdown(msLeft: number): string {
  const s = Math.max(0, Math.ceil(msLeft / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function isConnected(view: Pick<TvView, 'hasAuth' | 'status'>): boolean {
  return view.hasAuth && view.status.connection !== 'bad-key'
}

/** Rubriken för anslutningen, samma på skrivbord och TV. */
export function connectionTitle(status: StatusState, hasAuth: boolean): Text {
  if (!hasAuth) return S.notConnected
  if (status.connection === 'bad-key') return S.badKey
  if (status.connection === 'offline') return S.offline
  if (status.connection === 'checking') return S.checking
  return status.username ? fillBoth(S.connectedAs, { name: status.username }) : S.connected
}

export function changesText(n: number): Text {
  if (n === 0) return S.changesNone
  if (n === 1) return S.changesOne
  return fillBoth(S.changesMany, { n })
}

/** Synkraden: paus, pågår, aldrig, eller senaste körningen. */
export function syncText(status: StatusState, now: number): Text {
  if (status.pausedUntil > now) return fillBoth(S.pausedUntil, { time: clock(status.pausedUntil) })
  if (status.syncing) return S.syncingLong
  if (!status.lastSyncAt) return S.neverSynced
  const changes = changesText(status.lastChanges)
  return {
    en: S.lastSync.en.replace('{time}', clock(status.lastSyncAt)).replace('{changes}', changes.en),
    sv: S.lastSync.sv.replace('{time}', clock(status.lastSyncAt)).replace('{changes}', changes.sv),
  }
}

/** Enhetsflödets rader — samma lägen som designens TV-panel, med appens radtyper. */
function deviceRows(view: TvView, actions: TvActions): PluginSettingsRow[] {
  const { device } = view
  switch (device.phase) {
    case 'waiting':
      if (!device.userCode) return [{ t: 'note', text: S.checking }]
      return [
        { t: 'qr', label: S.deviceCode, hint: S.deviceScanHint, value: device.userCode, url: device.verificationUriComplete },
        { t: 'note', text: fillBoth(S.deviceWaiting, { time: countdown((device.expiresAt ?? view.now) - view.now) }) },
        { t: 'action', label: S.cancel, run: actions.cancelConnect },
      ]
    case 'checking':
      return [{ t: 'note', text: S.deviceChecking }]
    case 'expired':
    case 'denied':
    case 'error':
      return [
        { t: 'note', text: device.phase === 'expired' ? S.deviceExpired : device.phase === 'denied' ? S.deviceDenied : S.deviceError },
        { t: 'action', label: S.deviceNewCode, run: actions.connect },
      ]
    default:
      return []
  }
}

/** Samma inställningar som skrivbordssektionen, som typade rader för TV-skalet. */
export function buildTvRows(view: TvView, actions: TvActions): PluginSettingsRow[] {
  const rows: PluginSettingsRow[] = [{ t: 'eyebrow', label: S.tvAccount }]
  const flow = deviceRows(view, actions)
  if (flow.length > 0) return [...rows, ...flow]

  if (!isConnected(view)) {
    rows.push({
      t: 'action',
      label: S.connect,
      hint: view.status.connection === 'bad-key' ? S.badKeyBody : S.tvConnectHint,
      value: view.status.connection === 'bad-key' ? S.badKey : undefined,
      danger: view.status.connection === 'bad-key',
      run: actions.connect,
    })
    return rows
  }

  rows.push({ t: 'action', label: S.pluginName, hint: S.tvConnectedHint, value: connectionTitle(view.status, view.hasAuth) })
  if (view.viaOauth) {
    rows.push({
      t: 'action', label: S.disconnect, danger: true, run: actions.disconnect,
      confirm: { title: S.disconnect, body: S.notConnectedBody, confirmLabel: S.disconnect },
    })
  }
  const paused = view.status.pausedUntil > view.now
  rows.push(
    { t: 'eyebrow', label: S.whatSyncs },
    { t: 'toggle', label: S.scrobble, hint: S.scrobbleHintTv, value: view.prefs.scrobble, set: (v) => actions.setPref('scrobble', v) },
    { t: 'toggle', label: S.syncWatched, hint: S.syncWatchedHintTv, value: view.prefs.watched, set: (v) => actions.setPref('watched', v) },
    { t: 'toggle', label: S.syncWatchlist, hint: S.syncWatchlistHintTv, value: view.prefs.watchlist, set: (v) => actions.setPref('watchlist', v) },
    { t: 'note', text: syncText(view.status, view.now) },
  )
  if (!paused) {
    rows.push({ t: 'action', label: S.syncNow, value: view.status.syncing ? S.syncing : undefined, run: actions.syncNow })
  }
  if (view.traktConnected && (view.prefs.scrobble || view.prefs.watched)) rows.push({ t: 'note', text: S.traktTip })
  return rows
}
