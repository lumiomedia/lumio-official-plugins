'use client'

import { Input } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { onProfileChanged, useLang } from '@/lib/plugin-sdk'

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
  'rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50'
const settingsDangerActionButtonClass =
  'rounded-full border border-red-400/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50'

interface HomeKitStatusPayload {
  enabled: boolean
  published: boolean
  lastError?: string
  pincode?: string
}

export function HomeKitSettingsSection() {
  const { t } = useLang()
  const [homekitEnabled, setHomekitEnabled] = useState(false)
  const [homekitAccessoryName, setHomekitAccessoryName] = useState('Lumio Cinema Sync')
  const [homekitUsername, setHomekitUsername] = useState('0E:39:6A:11:22:33')
  const [homekitPin, setHomekitPin] = useState('031-45-154')
  const [homekitSetupId, setHomekitSetupId] = useState('LMIO')
  const [homekitPort, setHomekitPort] = useState('51826')
  const [hkMovieStartEnabled, setHkMovieStartEnabled] = useState(true)
  const [hkMovieStartBrightness, setHkMovieStartBrightness] = useState('20')
  const [hkMoviePauseEnabled, setHkMoviePauseEnabled] = useState(true)
  const [hkMoviePauseBrightness, setHkMoviePauseBrightness] = useState('35')
  const [hkPlayerClosedEnabled, setHkPlayerClosedEnabled] = useState(true)
  const [hkPlayerClosedBrightness, setHkPlayerClosedBrightness] = useState('65')
  const [homekitStatus, setHomekitStatus] = useState('')
  const [homekitError, setHomekitError] = useState('')
  const [homekitInfo, setHomekitInfo] = useState('')
  const [homekitGuideOpen, setHomekitGuideOpen] = useState(false)
  const [homekitBusy, setHomekitBusy] = useState<'idle' | 'starting' | 'resetting'>('idle')
  const infoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadHomeKitSettings() {
    try {
      const response = await fetch('/api/env-settings', { cache: 'no-store' })
      const data = (await response.json()) as Record<string, string>
      setHomekitEnabled((data.HOMEKIT_ENABLED ?? '0') === '1')
      setHomekitAccessoryName(data.HOMEKIT_ACCESSORY_NAME || 'Lumio Cinema Sync')
      setHomekitUsername(data.HOMEKIT_USERNAME || '0E:39:6A:11:22:33')
      setHomekitPin(data.HOMEKIT_PIN || '031-45-154')
      setHomekitSetupId(data.HOMEKIT_SETUP_ID || 'LMIO')
      setHomekitPort(data.HOMEKIT_PORT || '51826')
      setHkMovieStartEnabled((data.HOMEKIT_EVENT_MOVIE_START_ENABLED ?? '1') === '1')
      setHkMovieStartBrightness(data.HOMEKIT_EVENT_MOVIE_START_BRIGHTNESS || '20')
      setHkMoviePauseEnabled((data.HOMEKIT_EVENT_MOVIE_PAUSE_ENABLED ?? '1') === '1')
      setHkMoviePauseBrightness(data.HOMEKIT_EVENT_MOVIE_PAUSE_BRIGHTNESS || '35')
      setHkPlayerClosedEnabled((data.HOMEKIT_EVENT_PLAYER_CLOSED_ENABLED ?? '1') === '1')
      setHkPlayerClosedBrightness(data.HOMEKIT_EVENT_PLAYER_CLOSED_BRIGHTNESS || '65')
    } catch {
      // Keep defaults if env settings are unavailable.
    }
  }

  async function refreshHomeKitStatus() {
    try {
      const res = await fetch('/api/homekit/pairing', { cache: 'no-store' })
      const data = (await res.json()) as {
        ok: boolean
        error?: string
        status?: HomeKitStatusPayload
      }
      if (!data.ok || !data.status) {
        setHomekitError(data.error ?? t('homekitStatusFetchError'))
        setHomekitStatus(t('homekitNotConnected'))
        return
      }
      if (!data.status.enabled) {
        setHomekitStatus(t('homekitDisabled'))
      } else if (data.status.published) {
        setHomekitStatus(t('homekitReady'))
      } else {
        setHomekitStatus(t('homekitNotPublished'))
      }
      setHomekitError(data.status.lastError ?? '')
    } catch {
      setHomekitError(t('homekitServerError'))
      setHomekitStatus(t('homekitNotConnected'))
    }
  }

  async function saveHomeKitSettings() {
    await fetch('/api/env-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        HOMEKIT_ENABLED: homekitEnabled ? '1' : '0',
        HOMEKIT_ACCESSORY_NAME: homekitAccessoryName,
        HOMEKIT_USERNAME: homekitUsername,
        HOMEKIT_PIN: homekitPin,
        HOMEKIT_SETUP_ID: homekitSetupId,
        HOMEKIT_PORT: homekitPort,
        HOMEKIT_EVENT_MOVIE_START_ENABLED: hkMovieStartEnabled ? '1' : '0',
        HOMEKIT_EVENT_MOVIE_START_BRIGHTNESS: hkMovieStartBrightness,
        HOMEKIT_EVENT_MOVIE_PAUSE_ENABLED: hkMoviePauseEnabled ? '1' : '0',
        HOMEKIT_EVENT_MOVIE_PAUSE_BRIGHTNESS: hkMoviePauseBrightness,
        HOMEKIT_EVENT_PLAYER_CLOSED_ENABLED: hkPlayerClosedEnabled ? '1' : '0',
        HOMEKIT_EVENT_PLAYER_CLOSED_BRIGHTNESS: hkPlayerClosedBrightness,
      }),
    })
  }

  async function controlHomeKit(action: 'restart' | 'reset') {
    setHomekitBusy(action === 'restart' ? 'starting' : 'resetting')
    setHomekitError('')
    setHomekitInfo('')
    try {
      await saveHomeKitSettings()
      const res = await fetch('/api/homekit/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) {
        setHomekitError(data.error ?? t('homekitActionFailed'))
      } else if (action === 'reset') {
        setHomekitInfo(t('homekitResetInfo'))
        if (infoTimerRef.current) clearTimeout(infoTimerRef.current)
        infoTimerRef.current = setTimeout(() => {
          setHomekitInfo('')
          infoTimerRef.current = null
        }, 4500)
      }
    } catch {
      setHomekitError(t('homekitActionFailed'))
    } finally {
      setHomekitBusy('idle')
      await refreshHomeKitStatus()
    }
  }

  useEffect(() => {
    void loadHomeKitSettings()
    void refreshHomeKitStatus()
    const stopProfile = onProfileChanged(() => {
      void loadHomeKitSettings()
      void refreshHomeKitStatus()
    })
    return () => {
      stopProfile()
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current)
    }
  }, [])

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20">
        <input
          type="checkbox"
          checked={homekitEnabled}
          onChange={(e) => setHomekitEnabled(e.target.checked)}
          className="h-4 w-4 flex-none accent-aurora-400"
        />
        {t('homekitEnableAccessory')}
      </label>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5 lg:col-span-2">
          <label className="block text-xs text-slate-400">{t('name')}</label>
          <Input type="text" value={homekitAccessoryName} onValueChange={setHomekitAccessoryName} placeholder="Lumio Cinema Sync" radius="lg" classNames={inputClassNames} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400">Accessory ID (MAC-format)</label>
          <Input type="text" value={homekitUsername} onValueChange={setHomekitUsername} placeholder="0E:39:6A:11:22:33" radius="lg" classNames={inputClassNames} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400">PIN</label>
          <Input type="text" value={homekitPin} onValueChange={setHomekitPin} placeholder="031-45-154" radius="lg" classNames={inputClassNames} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400">Setup ID</label>
          <Input type="text" value={homekitSetupId} onValueChange={setHomekitSetupId} placeholder="LMIO" radius="lg" classNames={inputClassNames} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400">Port</label>
          <Input type="text" value={homekitPort} onValueChange={setHomekitPort} placeholder="51826" radius="lg" classNames={inputClassNames} />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
        {t('homekitStatusLabel')}: <span className="text-slate-200">{homekitStatus}</span>
        {homekitInfo ? <p className="mt-1 text-emerald-400">{homekitInfo}</p> : null}
        {homekitError ? <p className="mt-1 text-red-400">{homekitError}</p> : null}
      </div>

      <div className="space-y-2 rounded-lg border border-white/10 bg-slate-950/60 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('homekitEventRules')}</p>
        {[
          { label: t('movieStarts'), enabled: hkMovieStartEnabled, setEnabled: setHkMovieStartEnabled, brightness: hkMovieStartBrightness, setBrightness: setHkMovieStartBrightness },
          { label: t('moviePaused'), enabled: hkMoviePauseEnabled, setEnabled: setHkMoviePauseEnabled, brightness: hkMoviePauseBrightness, setBrightness: setHkMoviePauseBrightness },
          { label: t('videoClosed'), enabled: hkPlayerClosedEnabled, setEnabled: setHkPlayerClosedEnabled, brightness: hkPlayerClosedBrightness, setBrightness: setHkPlayerClosedBrightness },
        ].map((rule) => (
          <div key={rule.label} className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => rule.setEnabled(e.target.checked)}
                className="h-3.5 w-3.5 accent-aurora-400"
              />
              {rule.label}
            </label>
            <div className="mt-2 space-y-1.5">
              <label className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">Brightness</label>
              <Input type="text" value={rule.brightness} onValueChange={rule.setBrightness} placeholder="20" radius="lg" classNames={inputClassNames} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setHomekitGuideOpen((v) => !v)} className={settingsActionButtonClass}>
          {homekitGuideOpen ? t('closeGuide') : t('openGuide')}
        </button>
        <button type="button" onClick={() => void controlHomeKit('restart')} disabled={!homekitEnabled || homekitBusy !== 'idle'} className={settingsActionButtonClass}>
          {homekitBusy === 'starting' ? t('starting') : t('startPairing')}
        </button>
        <button type="button" onClick={() => void controlHomeKit('reset')} disabled={homekitBusy !== 'idle'} className={settingsDangerActionButtonClass}>
          {homekitBusy === 'resetting' ? t('resetting') : t('resetPairing')}
        </button>
        <button type="button" onClick={() => void saveHomeKitSettings()} disabled={homekitBusy !== 'idle'} className={settingsActionButtonClass}>
          {t('save')}
        </button>
        <button type="button" onClick={() => void refreshHomeKitStatus()} disabled={homekitBusy !== 'idle'} className={settingsActionButtonClass}>
          {t('refreshStatus')}
        </button>
      </div>

      {homekitGuideOpen ? (
        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">{t('homekitGuideTitle')}</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>{t('homekitGuideStep1')}</li>
            <li>{t('homekitGuideStep2')}</li>
            <li>{t('homekitGuideStep3')}</li>
            <li>{t('homekitGuideStep4')}</li>
            <li>{t('homekitGuideStep5')}</li>
          </ol>
          <div className="mt-3 rounded-md border border-white/10 bg-white/[0.02] px-2 py-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t('homekitSwitchesToUse')}</p>
            <p className="mt-1 text-slate-300">{t('homekitSwitchesList')}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
