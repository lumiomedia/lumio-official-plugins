'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { PlexLibraryIndexPanel } from './plex-library-index-panel'
import {
  Card,
  Checkbox,
  PillBtn,
  Select,
  TOKENS,
  disableHomeOverridePlugin,
  eyebrowStyle,
  getHomeOverridePluginId,
  inputStyle,
  onHomeOverridePluginChanged,
  tryEnableHomeOverridePlugin,
  removeScopedStorageItem,
  useLang,
} from '@/lib/plugin-sdk'
import {
  clearPlexAuth,
  ensurePlexClientIdentifier,
  getPlexAuth,
  getPlexSettings,
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


const HOME_OVERRIDE_PLUGIN_ID = 'com.lumio.plex'

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
  const [plexCacheMessage, setPlexCacheMessage] = useState('')
  const plexPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const plexRefreshRequestRef = useRef(0)

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

    return () => {
      if (plexPollRef.current) {
        clearInterval(plexPollRef.current)
        plexPollRef.current = null
      }
      stopPlexAuth()
      stopPlexSettings()
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
      const selectedById = preferredServerId
        ? resources.find((entry) => entry.id === preferredServerId) ?? null
        : null
      const selectedByUri = !selectedById && settings.serverUri
        ? resources.find((entry) => entry.uri === settings.serverUri || (entry.uris ?? []).includes(settings.serverUri ?? '')) ?? null
        : null
      const selectedByName = !selectedById && !selectedByUri && settings.serverName
        ? resources.find((entry) => entry.name === settings.serverName) ?? null
        : null
      const selectedServer = selectedById ?? selectedByUri ?? selectedByName ?? null
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
    setPlexCacheMessage(t('plexCacheCleared'))
  }

  function handleHomeOverrideToggle(checked: boolean) {
    setHomeOverrideError('')
    if (!checked) {
      disableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
      return
    }
    const result = tryEnableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
    if (!result.ok) {
      setHomeOverrideError(t('homeOverrideAlreadySet'))
    }
  }

  const fieldLabel = (text: string) => <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{text}</div>
  const note = (text: string, tone: 'ok' | 'warn' | 'error' | 'dim' = 'dim') => (
    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: tone === 'ok' ? TOKENS.mint : tone === 'warn' ? TOKENS.warn : tone === 'error' ? TOKENS.red : TOKENS.textMute }}>{text}</p>
  )
  const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }

  return (
    <div style={stack}>
      {/* Gamla Plex-startsidan (ersätter raderna med Plex-vyn) — visas bara
          om den redan är på, så den går att stänga av. Biblioteksläget under
          Hem → Layout → Bibliotek är vägen framåt. */}
      {homeOverrideEnabled ? (
        <Card>
          <Checkbox checked={homeOverrideEnabled} onChange={(value) => handleHomeOverrideToggle(value)} label={t('homeOverrideUseAsHome')} hint={t('plexHomeOverrideDesc')} />
          {homeOverrideError ? <div style={{ marginTop: 8 }}>{note(homeOverrideError, 'error')}</div> : null}
        </Card>
      ) : null}

      {plexAuth ? (
        <>
          <Card>
            <div style={stack}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>
                  {t('plexSignedInAs')} {plexAuth.title || plexAuth.username || t('plexSignedInFallback')}
                </div>
                {plexHomeUsers.length > 0 ? (
                  <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>
                    {t('plexChooseProfile')}: {plexHomeUsers.find((user) => user.id === plexSelectedHomeUserId)?.title ?? plexAuth.title ?? plexAuth.username ?? t('plexSignedInFallback')}
                  </div>
                ) : null}
              </div>
              {plexHomeUsers.length > 0 ? (
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'end' }}>
                  <div>
                    {fieldLabel(t('plexChooseProfile'))}
                    <Select
                      value={plexSelectedHomeUserId}
                      options={plexHomeUsers.map((user) => ({ value: user.id, label: user.title }))}
                      onChange={(value) => setPlexSelectedHomeUserId(value)}
                      width="100%"
                    />
                  </div>
                  <div>
                    {fieldLabel(t('plexProfilePin'))}
                    <input
                      type="password"
                      value={plexProfilePin}
                      onChange={(event) => setPlexProfilePin(event.target.value)}
                      placeholder={t('plexProfilePinPlaceholder')}
                      style={inputStyle}
                    />
                  </div>
                  <PillBtn
                    variant="accent"
                    onClick={() => void handlePlexProfileApply()}
                    disabled={!plexSelectedHomeUserId || plexProfileSwitchState === 'switching'}
                    style={{ minHeight: 44 }}
                  >
                    {plexProfileSwitchState === 'switching' ? t('plexRefreshingProfiles') : t('plexApplyProfile')}
                  </PillBtn>
                </div>
              ) : null}
              {plexProfileSuccess ? note(plexProfileSuccess, 'ok') : null}
            </div>
          </Card>

          <Card>
            <div style={stack}>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end' }}>
                <div>
                  {fieldLabel(t('plexChooseServer'))}
                  <Select
                    value={plexSelectedServerId}
                    options={[{ value: '', label: t('plexChooseServer') }, ...plexServers.map((server) => ({ value: server.id, label: server.name }))]}
                    onChange={(value) => { void handlePlexServerChange(value) }}
                    width="100%"
                  />
                </div>
                <PillBtn
                  onClick={() => void refreshPlexResourcesAndLibraries(plexSelectedServerId || undefined, { selectedOnly: true })}
                  disabled={plexRefreshState === 'refreshing'}
                  style={{ minHeight: 44 }}
                >
                  {plexRefreshState === 'refreshing' ? t('plexRefreshingLibrariesButton') : t('plexRefreshLibraries')}
                </PillBtn>
              </div>
              {plexRefreshMessage ? note(plexRefreshMessage, plexRefreshState === 'done' ? 'ok' : 'warn') : null}
              {plexServers.length === 0 ? note(t('plexNoServers')) : null}

              {plexSelectedServerId ? (
                <div>
                  {fieldLabel(t('plexChooseLibraries'))}
                  {plexLibraries.length === 0 ? (
                    note(t('plexNoLibraries'))
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {plexSelectedLibraryKeys.map((key, idx) => {
                        const library = plexLibraries.find((l) => l.key === key)
                        if (!library) return null
                        return (
                          <div
                            key={key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 14px',
                              borderRadius: 12,
                              border: `1px solid ${TOKENS.accent}`,
                              background: TOKENS.accentSoft,
                            }}
                          >
                            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{library.title}</span>
                            <span style={{ ...eyebrowStyle, marginBottom: 0 }}>{library.type === 'movie' ? t('movies') : t('series')}</span>
                            <PillBtn size="sm" onClick={() => handleMovePlexLibrary(key, -1)} disabled={idx === 0} icon="chevUp" title="↑">{''}</PillBtn>
                            <PillBtn size="sm" onClick={() => handleMovePlexLibrary(key, 1)} disabled={idx === plexSelectedLibraryKeys.length - 1} icon="chevDown" title="↓">{''}</PillBtn>
                            <PillBtn size="sm" variant="danger" onClick={() => handleTogglePlexLibrary(library)} icon="close" title="✕">{''}</PillBtn>
                          </div>
                        )
                      })}
                      {plexLibraries.filter((l) => !plexSelectedLibraryKeys.includes(l.key)).length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {plexLibraries.filter((l) => !plexSelectedLibraryKeys.includes(l.key)).map((library) => (
                            <PillBtn key={library.key} size="sm" icon="plus" onClick={() => handleTogglePlexLibrary(library)}>
                              {library.title}
                            </PillBtn>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <PillBtn onClick={handleClearPlexCaches}>{t('plexClearCache')}</PillBtn>
                <PillBtn variant="danger" onClick={handlePlexDisconnect}>{t('plexDisconnect')}</PillBtn>
                {plexCacheMessage ? <span style={{ fontSize: 12, color: TOKENS.textDim }}>{plexCacheMessage}</span> : null}
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div style={stack}>
            <PillBtn
              variant="accent"
              onClick={() => void handlePlexConnect()}
              disabled={plexLoginState === 'starting' || plexLoginState === 'polling'}
              style={{ alignSelf: 'flex-start' }}
            >
              {plexLoginState === 'starting' || plexLoginState === 'polling' ? t('plexWaiting') : t('plexConnect')}
            </PillBtn>
            {plexCode ? (
              <div style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${TOKENS.mint}`, background: 'rgba(60,214,163,0.10)' }}>
                <div style={{ ...eyebrowStyle, color: TOKENS.mint }}>{t('plexOpenLinkAndCode')}</div>
                <div style={{ marginTop: 4, fontSize: 14, color: TOKENS.text, wordBreak: 'break-all' }}>{plexAuthUrl}</div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 600, letterSpacing: '0.22em', color: TOKENS.mint }}>{plexCode}</div>
              </div>
            ) : null}
          </div>
        </Card>
      )}
      {plexLoginError ? note(plexLoginError, 'error') : null}
      <PlexLibraryIndexPanel />
    </div>
  )

}
