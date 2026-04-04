'use client'

import { Input } from '@heroui/react'
import { useEffect, useState } from 'react'
import { connectYouTube, disconnectYouTube } from './youtube-auth'
import {
  clearYouTubeCache,
  getYouTubeSession,
  getYouTubeSettings,
  isYouTubeSessionValid,
  onYouTubePluginChanged,
  setYouTubeSettings,
} from './youtube-storage'

const inputClassNames = {
  base: 'w-full',
  inputWrapper: [
    'bg-white/8 border border-white/10 !shadow-none rounded-[1.1rem]',
    'hover:bg-white/10 hover:!border-white/10',
    'group-data-[focus=true]:bg-white/10 group-data-[focus=true]:!border-white/10 group-data-[focus=true]:!shadow-none',
    'transition-all duration-200 min-h-12',
  ].join(' '),
  input: 'text-sm text-slate-50 placeholder:text-slate-500 !shadow-none outline-none',
}

const settingsActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40'

const settingsPrimaryActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white disabled:opacity-40'

export function YouTubeSettingsSection() {
  const [clientId, setClientId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [sessionLabel, setSessionLabel] = useState('Not connected')
  const [busy, setBusy] = useState<'idle' | 'connecting' | 'disconnecting'>('idle')
  const [error, setError] = useState('')
  const [homeRows, setHomeRows] = useState({
    following: true,
    watchLater: true,
    playlists: true,
  })
  const [hideShorts, setHideShorts] = useState(false)

  useEffect(() => {
    const sync = () => {
      const settings = getYouTubeSettings()
      const session = getYouTubeSession()
      setClientId(settings.clientId)
      setApiKey(settings.apiKey)
      setHideShorts(settings.hideShorts)
      setHomeRows(settings.homeRows)
      setSessionLabel(
        isYouTubeSessionValid(session)
          ? `Connected as ${session?.channelTitle ?? 'YouTube'}`
          : 'Not connected',
      )
    }
    sync()
    const offPlugin = onYouTubePluginChanged(sync)
    return () => {
      offPlugin()
    }
  }, [])

  function persist(next: {
    clientId?: string
    apiKey?: string
    hideShorts?: boolean
    homeRows?: typeof homeRows
  }) {
    const current = getYouTubeSettings()
    setYouTubeSettings({
      clientId: next.clientId ?? current.clientId,
      apiKey: next.apiKey ?? current.apiKey,
      hideShorts: next.hideShorts ?? current.hideShorts,
      homeRows: next.homeRows ?? current.homeRows,
    })
  }

  async function handleConnect() {
    setBusy('connecting')
    setError('')
    persist({ clientId, apiKey, hideShorts, homeRows })
    try {
      await connectYouTube(clientId)
      setSessionLabel(`Connected as ${getYouTubeSession()?.channelTitle ?? 'YouTube'}`)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Could not connect YouTube.')
    } finally {
      setBusy('idle')
    }
  }

  async function handleDisconnect() {
    setBusy('disconnecting')
    setError('')
    try {
      await disconnectYouTube()
      setSessionLabel('Not connected')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Could not disconnect YouTube.')
    } finally {
      setBusy('idle')
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Connection</p>
        <p className="mt-2 text-sm text-slate-300">{sessionLabel}</p>
        <p className="mt-2 text-xs text-slate-500">
          This plugin uses your own Google Desktop Client ID and YouTube Data API key.
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs text-slate-400">Google OAuth Client ID</label>
        <Input
          type="text"
          value={clientId}
          onValueChange={(value) => {
            setClientId(value)
            persist({ clientId: value, apiKey, hideShorts, homeRows })
          }}
          placeholder="1234567890-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
          radius="lg"
          classNames={inputClassNames}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs text-slate-400">YouTube API Key</label>
        <Input
          type="password"
          value={apiKey}
          onValueChange={(value) => {
            setApiKey(value)
            persist({ clientId, apiKey: value, hideShorts, homeRows })
          }}
          placeholder="AIza..."
          radius="lg"
          classNames={inputClassNames}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">How to create your own app</p>
        <ol className="mt-3 space-y-2 text-sm text-slate-300">
          <li>1. Create a Google Cloud project.</li>
          <li>2. Enable YouTube Data API v3.</li>
          <li>3. Configure the OAuth consent screen.</li>
          <li>4. Create an OAuth Client ID for Desktop app.</li>
          <li>5. Create an API key restricted to YouTube Data API v3.</li>
          <li>6. Paste the client ID and API key here, then reconnect YouTube.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          For private use you do not need your own domain. For localhost/browser development you can also create a Web
          application client, but normal plugin use should rely on a Desktop app client.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Home rows</p>
        <div className="mt-4 space-y-3">
          {([
            ['following', 'Following'],
            ['watchLater', 'Watch later'],
            ['playlists', 'Playlists'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={homeRows[key]}
                onChange={(event) => {
                  const next = {
                    ...homeRows,
                    [key]: event.target.checked,
                  }
                  setHomeRows(next)
                  persist({ clientId, apiKey, hideShorts, homeRows: next })
                }}
                className="h-4 w-4 accent-amber-400"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Video filters</p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={hideShorts}
              onChange={(event) => {
                const next = event.target.checked
                setHideShorts(next)
                clearYouTubeCache()
                persist({ clientId, apiKey, hideShorts: next, homeRows })
              }}
              className="h-4 w-4 accent-amber-400"
            />
            Dölj shorts
          </label>
          <p className="text-xs text-slate-500">
            Hides short-form YouTube videos from grids when duration data is available.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleConnect}
          disabled={busy !== 'idle' || !clientId.trim()}
          className={settingsPrimaryActionButtonClass}
        >
          {busy === 'connecting' ? 'Connecting…' : 'Connect YouTube'}
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={busy !== 'idle'}
          className={settingsActionButtonClass}
        >
          {busy === 'disconnecting' ? 'Disconnecting…' : 'Disconnect'}
        </button>
        <button
          type="button"
          onClick={() => clearYouTubeCache()}
          className={settingsActionButtonClass}
        >
          Clear cache
        </button>
      </div>
    </div>
  )
}
