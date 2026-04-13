'use client'

import { useEffect, useRef, useState } from 'react'
import {
  disableHomeOverridePlugin,
  getHomeOverridePluginId,
  onHomeOverridePluginChanged,
  tryEnableHomeOverridePlugin,
  removeScopedStorageItem,
  useLang,
} from '@/lib/plugin-sdk'
import {
  appendPlexDebugLog,
  clearPlexAuth,
  clearPlexDebugLog,
  ensurePlexClientIdentifier,
  getPlexDebugLog,
  getPlexAuth,
  getPlexSettings,
  onPlexDebugLogChanged,
  onPlexAuthChanged,
  onPlexSettingsChanged,
  type PlexAuthState,
  type PlexHomeUserOption,
  type PlexLibraryOption,
  type PlexServerOption,
} from './plex-storage'
import {
  disconnectPlex,
  fetchPlexHomeUsers,
  fetchPlexLibraries,
  fetchPlexResources,
  pollPlexLogin,
  savePlexSelection,
  startPlexLogin,
  switchPlexHomeProfile,
} from './plex-sync'

// ── Local style constants (mirrors settings-panel.tsx) ──────────────────────

const settingsSelectClassName =
  'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 outline-none transition hover:border-white/20'

const settingsActionButtonClass =
  'rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50'

const settingsDangerActionButtonClass =
  'rounded-full border border-red-400/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50'
const HOME_OVERRIDE_PLUGIN_ID = 'com.lumio.plex'

// ── Component ───────────────────────────────────────────────────────────────

export function PlexSection() {
  const { t } = useLang()

  const [plexAuth, setPlexAuthState] = useState<PlexAuthState | null>(null)
  const [plexLoginState, setPlexLoginState] = useState<'idle' | 'starting' | 'polling' | 'error'>('idle')
  const [plexLoginError, setPlexLoginError] = useState('')
  const [plexPinId, setPlexPinId] = useState<number | null>(null)
  const [plexCode, setPlexCode] = useState('')
  const [plexAuthUrl, setPlexAuthUrl] = useState('')
  const [plexServers, setPlexServers] = useState<PlexServerOption[]>([])
  const [plexHomeUsers, setPlexHomeUsers] = useState<PlexHomeUserOption[]>([])
  const [plexLibraries, setPlexLibraries] = useState<PlexLibraryOption[]>([])
  const [plexSelectedHomeUserId, setPlexSelectedHomeUserId] = useState('')
  const [plexProfilePin, setPlexProfilePin] = useState('')
  const [plexProfileSwitchState, setPlexProfileSwitchState] = useState<'idle' | 'switching'>('idle')
  const [plexProfileSuccess, setPlexProfileSuccess] = useState('')
  const [plexRefreshState, setPlexRefreshState] = useState<'idle' | 'refreshing' | 'done' | 'error'>('idle')
  const [plexRefreshMessage, setPlexRefreshMessage] = useState('')
  const [plexSelectedServerId, setPlexSelectedServerId] = useState('')
  const [plexSelectedLibraryKeys, setPlexSelectedLibraryKeys] = useState<string[]>([])
  const [homeOverrideEnabled, setHomeOverrideEnabled] = useState(false)
  const [homeOverrideError, setHomeOverrideError] = useState('')
  const [plexDebugLog, setPlexDebugLog] = useState<string[]>([])
  const [plexCacheMessage, setPlexCacheMessage] = useState('')
  const plexPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const plexRefreshRequestRef = useRef(0)

  async function runPlexServerDebug() {
    const auth = getPlexAuth()
    const settings = getPlexSettings()
    if (!auth?.authToken || !auth.clientIdentifier || !settings.serverId) {
      appendPlexDebugLog('[plex-debug] missing auth or server selection')
      return
    }

    appendPlexDebugLog('[plex-debug] starting server debug...')
    try {
      const response = await fetch('/api/plugins/plex/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth,
          serverId: settings.serverId,
        }),
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        appendPlexDebugLog(`[plex-debug] server responded ${response.status}: ${text.slice(0, 500)}`)
        return
      }
      const payload = await response.json() as {
        selected?: { id?: string; name?: string; uri?: string | null; uris?: string[] }
        attempts?: Array<{
          uri?: string
          ok?: boolean
          libraryCount?: number
          error?: string
          tokenAttempts?: Array<{ tokenSource: string; ok: boolean; libraryCount?: number; error?: string }>
        }>
      }
      appendPlexDebugLog('[plex-debug] selected server ' + JSON.stringify(payload.selected ?? {}))
      for (const attempt of payload.attempts ?? []) {
        appendPlexDebugLog('[plex-debug] uri ' + JSON.stringify({
          uri: attempt.uri,
          ok: attempt.ok,
          libraryCount: attempt.libraryCount,
          error: attempt.error,
        }))
        for (const tokenAttempt of attempt.tokenAttempts ?? []) {
          appendPlexDebugLog('[plex-debug] token ' + JSON.stringify(tokenAttempt))
        }
      }
    } catch (error) {
      appendPlexDebugLog('[plex-debug] failed ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  useEffect(() => {
    const syncPlexState = () => {
      const nextAuth = getPlexAuth()
      setPlexAuthState(nextAuth)
      setPlexSelectedHomeUserId(nextAuth?.homeUserId ?? (nextAuth?.userId ? String(nextAuth.userId) : ''))
      const settings = getPlexSettings()
      if (settings.serverId && settings.serverUri) {
        const fallbackServer: PlexServerOption = {
          id: settings.serverId,
          name: settings.serverName || settings.serverId,
          uri: settings.serverUri,
          uris: settings.serverUris ?? (settings.serverUri ? [settings.serverUri] : []),
          accessToken: settings.serverAccessToken ?? null,
        }
        setPlexServers((previous) => previous.length > 0 ? previous : [fallbackServer])
        if (settings.libraries.length > 0) {
          setPlexLibraries((previous) => previous.length > 0 ? previous : settings.libraries)
        }
      }
      setPlexSelectedServerId(settings.serverId ?? '')
      setPlexSelectedLibraryKeys(settings.libraries.map((library) => library.key))
    }
    syncPlexState()
    const stopPlexAuth = onPlexAuthChanged(syncPlexState)
    const stopPlexSettings = onPlexSettingsChanged(syncPlexState)
    const stopPlexDebug = onPlexDebugLogChanged(() => setPlexDebugLog(getPlexDebugLog()))
    setPlexDebugLog(getPlexDebugLog())

    return () => {
      if (plexPollRef.current) {
        clearInterval(plexPollRef.current)
        plexPollRef.current = null
      }
      stopPlexAuth()
      stopPlexSettings()
      stopPlexDebug()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!plexAuth?.authToken) return
    void refreshPlexResourcesAndLibraries(plexSelectedServerId || undefined, { selectedOnly: true }).catch((error) => {
      console.warn('[plex-section] auto refresh failed', error)
    })
  // We auto-refresh when auth becomes available. Server changes are handled by
  // handlePlexServerChange to avoid overlapping refresh requests.
  }, [plexAuth?.authToken])

  useEffect(() => {
    const sync = () => {
      setHomeOverrideEnabled(getHomeOverridePluginId() === HOME_OVERRIDE_PLUGIN_ID)
      setHomeOverrideError('')
    }
    sync()
    return onHomeOverridePluginChanged(sync)
  }, [])

  useEffect(() => {
    if (!plexAuth?.authToken) {
      setPlexHomeUsers([])
      return
    }
    void fetchPlexHomeUsers().then(setPlexHomeUsers).catch(() => {})
  }, [plexAuth?.authToken])

  async function refreshPlexResourcesAndLibraries(
    nextServerId?: string,
    options?: { selectedOnly?: boolean },
  ) {
    const requestId = ++plexRefreshRequestRef.current
    const isStale = () => requestId !== plexRefreshRequestRef.current

    setPlexRefreshState('refreshing')
    setPlexRefreshMessage('')
    setPlexLoginError('')

    try {
      const resources = await fetchPlexResources()
      if (isStale()) return
      setPlexServers(resources)

      if (resources.length === 0) {
        const settings = getPlexSettings()
        if (settings.serverId && settings.serverUri) {
          const fallbackServer: PlexServerOption = {
            id: settings.serverId,
            name: settings.serverName || settings.serverId,
            uri: settings.serverUri,
            uris: settings.serverUris ?? (settings.serverUri ? [settings.serverUri] : []),
            accessToken: settings.serverAccessToken ?? null,
          }
          setPlexServers([fallbackServer])
          setPlexSelectedServerId(fallbackServer.id)
          setPlexLibraries(settings.libraries)
          setPlexSelectedLibraryKeys(settings.libraries.map((library) => library.key))
          setPlexRefreshState('error')
          setPlexRefreshMessage(t('plexRequestFailed'))
          return
        }

        // Transient network glitches can occasionally return an empty resources
        // payload even when the current server selection is valid. Keep the last
        // known-good state instead of wiping the UI immediately.
        if (plexServers.length > 0 || plexSelectedServerId || plexLibraries.length > 0) {
          setPlexRefreshState('error')
          setPlexRefreshMessage(t('plexRequestFailed'))
          return
        }
        if (isStale()) return
        setPlexLibraries([])
        setPlexSelectedLibraryKeys([])
        setPlexSelectedServerId('')
        setPlexRefreshState('error')
        setPlexRefreshMessage(t('plexNoServers'))
        return
      }

      const settings = getPlexSettings()
      const preferredServerId = nextServerId ?? plexSelectedServerId ?? settings.serverId ?? ''
      const requestedSelectedOnly = options?.selectedOnly ?? Boolean(preferredServerId)
      const selectedServer = preferredServerId
        ? resources.find((entry) => entry.id === preferredServerId) ?? null
        : null
      // If the caller asked for selectedOnly but the saved server is no longer
      // in the fresh resource list (common after a home-profile switch or token
      // rotation), fall back to scanning all available servers instead of
      // leaving the user with an empty library dropdown.
      const selectedOnly = requestedSelectedOnly && Boolean(selectedServer)
      if (selectedOnly && !preferredServerId) {
        if (isStale()) return
        setPlexLibraries([])
        setPlexSelectedLibraryKeys([])
        setPlexRefreshState('idle')
        setPlexRefreshMessage('')
        return
      }
      const orderedServers = selectedOnly
        ? (selectedServer ? [selectedServer] : [])
        : [
          ...(selectedServer ? [selectedServer] : []),
          ...resources.filter((entry) => entry.id !== preferredServerId),
        ]

      if (orderedServers.length === 0) {
        if (isStale()) return
        setPlexLibraries([])
        setPlexSelectedLibraryKeys([])
        setPlexSelectedServerId('')
        setPlexRefreshState('error')
        setPlexRefreshMessage(t('plexChooseServer'))
        return
      }

      let server = orderedServers[0]
      let libraries: PlexLibraryOption[] = []
      let lastLibraryError: Error | null = null

      for (const candidate of orderedServers) {
        try {
          const candidateLibraries = await fetchPlexLibraries(candidate.uri, candidate.accessToken, candidate.uris)
          if (isStale()) return
          server = candidate
          libraries = candidateLibraries
          lastLibraryError = null
          break
        } catch (error) {
          lastLibraryError = error instanceof Error ? error : new Error('Plex libraries failed')
        }
      }

      if (lastLibraryError) {
        throw lastLibraryError
      }

      if (isStale()) return
      setPlexSelectedServerId(server.id)
      setPlexLibraries(libraries)
      const savedLibraryKeys =
        settings.serverId === server.id
          ? settings.libraries.map((library) => library.key)
          : []
      const resolvedLibraries =
        savedLibraryKeys.length > 0
          ? libraries.filter((library) => savedLibraryKeys.includes(library.key))
          : libraries
      setPlexSelectedLibraryKeys(resolvedLibraries.map((library) => library.key))
      savePlexSelection(server, resolvedLibraries)
      setPlexRefreshState(libraries.length > 0 ? 'done' : 'error')
      setPlexRefreshMessage(
        libraries.length > 0
          ? `${t('plexRefreshLibrariesDone')}: ${server.name}`
          : `${t('plexRefreshLibrariesEmpty')} (${server.name})`,
      )
    } catch (error) {
      if (isStale()) return
      const settings = getPlexSettings()
      if (settings.serverId && settings.serverUri) {
        const fallbackServer: PlexServerOption = {
          id: settings.serverId,
          name: settings.serverName || settings.serverId,
          uri: settings.serverUri,
          uris: settings.serverUris ?? (settings.serverUri ? [settings.serverUri] : []),
          accessToken: settings.serverAccessToken ?? null,
        }
        setPlexServers((previous) => previous.length > 0 ? previous : [fallbackServer])
        setPlexSelectedServerId(settings.serverId)
        setPlexLibraries((previous) => previous.length > 0 ? previous : settings.libraries)
        setPlexSelectedLibraryKeys((previous) => previous.length > 0 ? previous : settings.libraries.map((library) => library.key))
      }
      setPlexRefreshState('error')
      const message = error instanceof Error ? error.message : ''
      setPlexRefreshMessage(
        message.toLowerCase() === 'fetch failed'
          ? t('plexRequestFailed')
          : message || t('plexRefreshLibrariesFailed'),
      )
    }
  }

  async function handlePlexConnect() {
    if (plexPollRef.current) {
      clearInterval(plexPollRef.current)
      plexPollRef.current = null
    }

    setPlexLoginError('')
    setPlexLoginState('starting')

    try {
      const clientIdentifier = ensurePlexClientIdentifier()
      const payload = await startPlexLogin(clientIdentifier)
      setPlexPinId(payload.pinId)
      setPlexCode(payload.code)
      setPlexAuthUrl(payload.authUrl)
      setPlexLoginState('polling')

      plexPollRef.current = setInterval(() => {
        void (async () => {
          const auth = await pollPlexLogin(payload.pinId, clientIdentifier)
          if (!auth) return
          if (plexPollRef.current) {
            clearInterval(plexPollRef.current)
            plexPollRef.current = null
          }
          setPlexAuthState(auth)
          setPlexLoginState('idle')
          setPlexPinId(null)
          setPlexCode('')
          setPlexAuthUrl('')
          setPlexSelectedHomeUserId(auth.homeUserId ?? (auth.userId ? String(auth.userId) : ''))
          setPlexHomeUsers(await fetchPlexHomeUsers().catch(() => []))
          savePlexSelection(null, [])
          setPlexSelectedServerId('')
          setPlexSelectedLibraryKeys([])
          await refreshPlexResourcesAndLibraries(undefined, { selectedOnly: true })
        })().catch((error) => {
          if (plexPollRef.current) {
            clearInterval(plexPollRef.current)
            plexPollRef.current = null
          }
          setPlexLoginError(error instanceof Error ? error.message : t('plexConnect'))
          setPlexLoginState('error')
        })
      }, 2500)
    } catch (error) {
      setPlexLoginError(error instanceof Error ? error.message : t('plexConnect'))
      setPlexLoginState('error')
    }
  }

  async function handlePlexServerChange(serverId: string) {
    setPlexSelectedServerId(serverId)
    setPlexSelectedLibraryKeys([])
    setPlexRefreshState('idle')
    setPlexRefreshMessage('')
    setPlexLoginError('')
    const server = plexServers.find((entry) => entry.id === serverId) ?? null
    if (!server) {
      savePlexSelection(null, [])
      setPlexLibraries([])
      return
    }

    savePlexSelection(server, [])

    try {
      const libraries = await fetchPlexLibraries(server.uri, server.accessToken, server.uris)
      setPlexLibraries(libraries)
      setPlexSelectedLibraryKeys(libraries.map((library) => library.key))
      savePlexSelection(server, libraries)
      setPlexRefreshState(libraries.length > 0 ? 'done' : 'error')
      setPlexRefreshMessage(
        libraries.length > 0
          ? `${t('plexRefreshLibrariesDone')}: ${server.name}`
          : `${t('plexRefreshLibrariesEmpty')} (${server.name})`,
      )
    } catch (error) {
      setPlexLibraries([])
      setPlexSelectedLibraryKeys([])
      savePlexSelection(server, [])
      setPlexRefreshState('error')
      const message = error instanceof Error ? error.message : ''
      setPlexRefreshMessage(
        message.toLowerCase() === 'fetch failed'
          ? t('plexRequestFailed')
          : message || t('plexRefreshLibrariesFailed'),
      )
    }
  }

  async function handlePlexProfileApply() {
    if (!plexSelectedHomeUserId) return
    setPlexLoginError('')
    setPlexProfileSuccess('')
    setPlexProfileSwitchState('switching')
    try {
      const nextAuth = await switchPlexHomeProfile(plexSelectedHomeUserId, plexProfilePin)
      setPlexAuthState(nextAuth)
      setPlexProfilePin('')
      setPlexProfileSuccess(`${t('plexProfileApplied')}: ${nextAuth.title || nextAuth.username || t('plexSignedInFallback')}`)
      savePlexSelection(null, [])
      setPlexSelectedServerId('')
      setPlexSelectedLibraryKeys([])
      await refreshPlexResourcesAndLibraries(undefined, { selectedOnly: true })
    } catch (error) {
      setPlexLoginError(error instanceof Error ? error.message : t('plexApplyProfile'))
      setPlexProfileSuccess('')
    } finally {
      setPlexProfileSwitchState('idle')
    }
  }

  function savePlexLibraryOrder(nextKeys: string[]) {
    setPlexSelectedLibraryKeys(nextKeys)
    const server = plexServers.find((entry) => entry.id === plexSelectedServerId) ?? null
    const ordered = nextKeys
      .map((key) => plexLibraries.find((l) => l.key === key))
      .filter(Boolean) as PlexLibraryOption[]
    savePlexSelection(server, ordered)
  }

  function handleTogglePlexLibrary(library: PlexLibraryOption) {
    const nextKeys = plexSelectedLibraryKeys.includes(library.key)
      ? plexSelectedLibraryKeys.filter((key) => key !== library.key)
      : [...plexSelectedLibraryKeys, library.key]
    savePlexLibraryOrder(nextKeys)
  }

  function handleMovePlexLibrary(key: string, offset: number) {
    const idx = plexSelectedLibraryKeys.indexOf(key)
    if (idx < 0) return
    const next = [...plexSelectedLibraryKeys]
    const target = idx + offset
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    savePlexLibraryOrder(next)
  }

  function handlePlexDisconnect() {
    if (plexPollRef.current) {
      clearInterval(plexPollRef.current)
      plexPollRef.current = null
    }
    disconnectPlex()
    setPlexAuthState(null)
    setPlexLoginState('idle')
    setPlexLoginError('')
    setPlexHomeUsers([])
    setPlexSelectedHomeUserId('')
    setPlexProfilePin('')
    setPlexProfileSuccess('')
    setPlexRefreshState('idle')
    setPlexRefreshMessage('')
    setPlexPinId(null)
    setPlexCode('')
    setPlexAuthUrl('')
    setPlexServers([])
    setPlexLibraries([])
    setPlexSelectedServerId('')
    setPlexSelectedLibraryKeys([])
  }

  function handleClearPlexCaches() {
    removeScopedStorageItem('plex_library_cache')
    removeScopedStorageItem('plex_recent_cache')
    setPlexCacheMessage('Plex-cache rensad. Oppna Plex igen for att hamta nya bilder.')
  }

  function handleHomeOverrideToggle(checked: boolean) {
    setHomeOverrideError('')
    if (!checked) {
      disableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
      return
    }
    const result = tryEnableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
    if (!result.ok) {
      setHomeOverrideError('Det finns redan en egen startsida satt. Avmarkera den först innan du valjer en annan plugin.')
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={homeOverrideEnabled}
            onChange={(event) => handleHomeOverrideToggle(event.target.checked)}
            className="h-4 w-4 accent-amber-400"
          />
          Anvand som startsida
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Ersatter vanliga Home-rader med Plex-vyn men behaller hero och resten av startsidan.
        </p>
        {homeOverrideError ? <p className="mt-2 text-xs text-rose-300">{homeOverrideError}</p> : null}
      </div>
      {plexAuth ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-white">
              {t('plexSignedInAs')} {plexAuth.title || plexAuth.username || t('plexSignedInFallback')}
            </p>
            {plexHomeUsers.length > 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                {t('plexChooseProfile')}: {plexHomeUsers.find((user) => user.id === plexSelectedHomeUserId)?.title ?? plexAuth.title ?? plexAuth.username ?? t('plexSignedInFallback')}
              </p>
            ) : null}
          </div>

          {plexHomeUsers.length > 0 ? (
            <div className="grid gap-3 2xl:grid-cols-[minmax(220px,1.15fr)_minmax(180px,0.9fr)_auto]">
              <label className="space-y-1.5">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">{t('plexChooseProfile')}</span>
                <select
                  value={plexSelectedHomeUserId}
                  onChange={(event) => setPlexSelectedHomeUserId(event.target.value)}
                  className={`w-full ${settingsSelectClassName}`}
                >
                  {plexHomeUsers.map((user) => (
                    <option key={user.id} value={user.id} className="bg-slate-900">
                      {user.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">{t('plexProfilePin')}</span>
                <input
                  type="password"
                  value={plexProfilePin}
                  onChange={(event) => setPlexProfilePin(event.target.value)}
                  placeholder={t('plexProfilePinPlaceholder')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition hover:border-white/20 focus:border-white/30"
                />
              </label>
              <div className="flex items-end 2xl:justify-end">
                <button
                  type="button"
                  onClick={() => void handlePlexProfileApply()}
                  disabled={!plexSelectedHomeUserId || plexProfileSwitchState === 'switching'}
                  className={`w-full ${settingsActionButtonClass} 2xl:w-auto`}
                >
                  {plexProfileSwitchState === 'switching' ? t('plexRefreshingProfiles') : t('plexApplyProfile')}
                </button>
              </div>
            </div>
          ) : null}

          {plexProfileSuccess ? (
            <p className="text-xs text-emerald-300">{plexProfileSuccess}</p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="space-y-1.5">
              <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">{t('plexChooseServer')}</span>
              <select
                value={plexSelectedServerId}
                onChange={(event) => { void handlePlexServerChange(event.target.value) }}
                className={`w-full ${settingsSelectClassName}`}
              >
                <option value="">{t('plexChooseServer')}</option>
                {plexServers.map((server) => (
                  <option key={`${server.id}:${server.uri}`} value={server.id} className="bg-slate-900">
                    {server.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void refreshPlexResourcesAndLibraries(plexSelectedServerId || undefined, { selectedOnly: true })}
                disabled={plexRefreshState === 'refreshing'}
                className={settingsActionButtonClass}
              >
                {plexRefreshState === 'refreshing' ? t('plexRefreshingLibrariesButton') : t('plexRefreshLibraries')}
              </button>
            </div>
          </div>

          {plexRefreshMessage ? (
            <p className={`text-xs ${plexRefreshState === 'done' ? 'text-emerald-300' : 'text-amber-300'}`}>
              {plexRefreshMessage}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClearPlexCaches}
              className={settingsActionButtonClass}
            >
              Rensa Plex-cache
            </button>
            {plexCacheMessage ? <span className="text-xs text-slate-400">{plexCacheMessage}</span> : null}
          </div>

          {plexServers.length === 0 ? (
            <p className="text-xs text-slate-500">{t('plexNoServers')}</p>
          ) : null}

          {plexSelectedServerId ? (
            <div className="space-y-2">
              <p className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">{t('plexChooseLibraries')}</p>
              {plexLibraries.length === 0 ? (
                <p className="text-xs text-slate-500">{t('plexNoLibraries')}</p>
              ) : (
                <div className="space-y-2">
                  {/* Selected libraries in order with up/down reorder */}
                  {plexSelectedLibraryKeys.length > 0 && (
                    <div className="space-y-1.5">
                      {plexSelectedLibraryKeys.map((key, idx) => {
                        const library = plexLibraries.find((l) => l.key === key)
                        if (!library) return null
                        return (
                          <div key={key} className="flex items-center gap-2 rounded-xl border border-aurora-400/30 bg-aurora-400/5 px-3 py-2 text-sm text-slate-200">
                            <span className="flex-1 truncate">{library.title}</span>
                            <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                              {library.type === 'movie' ? t('movies') : t('series')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMovePlexLibrary(key, -1)}
                              disabled={idx === 0}
                              className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500 transition hover:border-white/20 hover:text-slate-300 disabled:opacity-30"
                            >↑</button>
                            <button
                              type="button"
                              onClick={() => handleMovePlexLibrary(key, 1)}
                              disabled={idx === plexSelectedLibraryKeys.length - 1}
                              className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500 transition hover:border-white/20 hover:text-slate-300 disabled:opacity-30"
                            >↓</button>
                            <button
                              type="button"
                              onClick={() => handleTogglePlexLibrary(library)}
                              className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-red-400/70 transition hover:text-red-300"
                            >✕</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {/* Unselected libraries as add buttons */}
                  {plexLibraries.filter((l) => !plexSelectedLibraryKeys.includes(l.key)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {plexLibraries.filter((l) => !plexSelectedLibraryKeys.includes(l.key)).map((library) => (
                        <button
                          key={library.key}
                          type="button"
                          onClick={() => handleTogglePlexLibrary(library)}
                          className="rounded-xl border border-dashed border-white/15 px-3 py-1.5 text-xs text-slate-500 transition hover:border-white/30 hover:text-slate-300"
                        >
                          + {library.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePlexDisconnect}
              className={settingsDangerActionButtonClass}
            >
              {t('plexDisconnect')}
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Plex debug</p>
                <p className="text-xs text-slate-400">Visar senaste klientloggarna för Plex-hämtning.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void runPlexServerDebug()}
                  className={settingsActionButtonClass}
                >
                  Testa server
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = plexDebugLog.join('\n')
                    if (text) void navigator.clipboard.writeText(text)
                  }}
                  className={settingsActionButtonClass}
                  disabled={plexDebugLog.length === 0}
                >
                  Kopiera
                </button>
                <button
                  type="button"
                  onClick={() => clearPlexDebugLog()}
                  className={settingsDangerActionButtonClass}
                  disabled={plexDebugLog.length === 0}
                >
                  Rensa
                </button>
              </div>
            </div>
            <pre className="mt-3 max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-slate-300">
              {plexDebugLog.length > 0 ? plexDebugLog.join('\n') : 'Ingen debug-logg än.'}
            </pre>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void handlePlexConnect()}
            disabled={plexLoginState === 'starting' || plexLoginState === 'polling'}
            className={settingsActionButtonClass}
          >
            {plexLoginState === 'starting' || plexLoginState === 'polling' ? t('plexWaiting') : t('plexConnect')}
          </button>
          {plexCode ? (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">{t('plexOpenLinkAndCode')}</p>
              <p className="mt-1 text-sm text-white break-all">{plexAuthUrl}</p>
              <p className="mt-2 text-xl font-semibold tracking-[0.22em] text-emerald-200">{plexCode}</p>
            </div>
          ) : null}
        </div>
      )}
      {plexLoginError ? <p className="mt-3 text-sm text-red-300">{plexLoginError}</p> : null}
    </div>
  )
}
