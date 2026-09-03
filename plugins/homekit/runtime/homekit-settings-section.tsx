'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Card, Checkbox, PillBtn, TOKENS, eyebrowStyle, inputStyle, onProfileChanged, useLang } from '@/lib/plugin-sdk'
import { monoFont } from '@/lib/plugin-sdk'

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
  const [hkMoviePauseEnabled, setHkMoviePauseEnabled] = useState(true)
  const [hkPlayerClosedEnabled, setHkPlayerClosedEnabled] = useState(true)
  const [homekitStatus, setHomekitStatus] = useState('')
  // The code the accessory is actually published with, straight from the
  // backend. The editable field above is the desired value; this is what Home
  // will accept right now, and the two differ until settings are applied.
  const [publishedPin, setPublishedPin] = useState('')
  const [homekitError, setHomekitError] = useState('')
  const [homekitInfo, setHomekitInfo] = useState('')
  const [homekitGuideOpen, setHomekitGuideOpen] = useState(false)
  const [homekitBusy, setHomekitBusy] = useState<'idle' | 'starting' | 'resetting' | 'saving'>('idle')
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
      setHkMoviePauseEnabled((data.HOMEKIT_EVENT_MOVIE_PAUSE_ENABLED ?? '1') === '1')
      setHkPlayerClosedEnabled((data.HOMEKIT_EVENT_PLAYER_CLOSED_ENABLED ?? '1') === '1')
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
        setPublishedPin('')
        return
      }
      setPublishedPin(data.status.published ? data.status.pincode ?? '' : '')
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
    const response = await fetch('/api/env-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        HOMEKIT_ENABLED: homekitEnabled ? '1' : '0',
        HOMEKIT_ACCESSORY_NAME: homekitAccessoryName,
        HOMEKIT_PIN: homekitPin,
        HOMEKIT_SETUP_ID: homekitSetupId,
        HOMEKIT_PORT: homekitPort,
        HOMEKIT_EVENT_MOVIE_START_ENABLED: hkMovieStartEnabled ? '1' : '0',
        HOMEKIT_EVENT_MOVIE_PAUSE_ENABLED: hkMoviePauseEnabled ? '1' : '0',
        HOMEKIT_EVENT_PLAYER_CLOSED_ENABLED: hkPlayerClosedEnabled ? '1' : '0',
      }),
    })
    if (!response.ok) {
      throw new Error(`env-settings save failed: ${response.status}`)
    }
  }

  function showInfoMessage(message: string) {
    setHomekitInfo(message)
    if (infoTimerRef.current) clearTimeout(infoTimerRef.current)
    infoTimerRef.current = setTimeout(() => {
      setHomekitInfo('')
      infoTimerRef.current = null
    }, 4500)
  }

  // The backend applies saved settings to the running accessory immediately
  // (enable/disable, event rules, name/PIN/port) — so saving is the whole
  // action, and the status line below reflects the new state right away.
  async function saveAndApply() {
    setHomekitBusy('saving')
    setHomekitError('')
    setHomekitInfo('')
    try {
      await saveHomeKitSettings()
      showInfoMessage(t('homekitSavedInfo'))
    } catch {
      setHomekitError(t('homekitSaveFailed'))
    } finally {
      setHomekitBusy('idle')
      await refreshHomeKitStatus()
    }
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
      } else {
        // Publishing succeeds in well under a second, so without a message the
        // button just flickers and looks like it did nothing.
        showInfoMessage(action === 'reset' ? t('homekitResetInfo') : t('homekitPublishedInfo'))
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

  const field = (label: string, value: string, onChange: (value: string) => void, placeholder: string) => (
    <div>
      <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{label}</div>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )
  const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }

  return (
    <div style={stack}>
      <Card>
        <Checkbox checked={homekitEnabled} onChange={(value) => setHomekitEnabled(value)} label={t('homekitEnableAccessory')} />
        <div style={{ marginTop: 14, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div style={{ gridColumn: '1 / -1' }}>{field(t('name'), homekitAccessoryName, setHomekitAccessoryName, 'Lumio Cinema Sync')}</div>
          <div>
            <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{t('homekitAccessoryIdLabel')}</div>
            {/* Read-only on purpose. A controller looks the accessory up by this
                id, so changing it invalidates every pairing -- and a field that
                round-trips its value on save did exactly that by accident.
                "Reset pairing" is the deliberate way to get a new identity. */}
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', fontFamily: monoFont, fontSize: 13, color: TOKENS.textDim }}>{homekitUsername}</div>
          </div>
          {field(t('homekitPinLabel'), homekitPin, setHomekitPin, '0314-5154')}
          {field(t('homekitSetupIdLabel'), homekitSetupId, setHomekitSetupId, 'LMIO')}
          {field(t('homekitPortLabel'), homekitPort, setHomekitPort, '51826')}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: TOKENS.textDim }}>
          {t('homekitStatusLabel')}: <span style={{ color: TOKENS.text }}>{homekitStatus}</span>
        </div>
        {publishedPin ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...eyebrowStyle }}>{t('homekitPairingCodeLabel')}</div>
            <div style={{ marginTop: 4, fontFamily: monoFont, fontSize: 22, letterSpacing: '0.2em', color: TOKENS.text, userSelect: 'all' }}>{publishedPin}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: TOKENS.textMute }}>{t('homekitPairingCodeHint')}</div>
          </div>
        ) : null}
        {homekitInfo ? <p style={{ margin: '8px 0 0', fontSize: 12, color: TOKENS.mint }}>{homekitInfo}</p> : null}
        {homekitError ? <p style={{ margin: '8px 0 0', fontSize: 12, color: TOKENS.red }}>{homekitError}</p> : null}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <PillBtn variant="accent" onClick={() => void saveAndApply()} disabled={homekitBusy !== 'idle'}>
            {homekitBusy === 'saving' ? t('saving') : t('save')}
          </PillBtn>
          <PillBtn onClick={() => void controlHomeKit('restart')} disabled={!homekitEnabled || homekitBusy !== 'idle'}>
            {homekitBusy === 'starting' ? t('starting') : t('startPairing')}
          </PillBtn>
          <PillBtn onClick={() => void refreshHomeKitStatus()} disabled={homekitBusy !== 'idle'}>{t('refreshStatus')}</PillBtn>
          <PillBtn variant="danger" onClick={() => void controlHomeKit('reset')} disabled={homekitBusy !== 'idle'}>
            {homekitBusy === 'resetting' ? t('resetting') : t('resetPairing')}
          </PillBtn>
        </div>
      </Card>

      <Card>
        <div style={{ ...eyebrowStyle }}>{t('homekitEventRules')}</div>
        <p style={{ margin: '4px 0 12px', fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }}>{t('homekitEventRulesHint')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: t('movieStarts'), enabled: hkMovieStartEnabled, setEnabled: setHkMovieStartEnabled },
            { label: t('moviePaused'), enabled: hkMoviePauseEnabled, setEnabled: setHkMoviePauseEnabled },
            { label: t('videoClosed'), enabled: hkPlayerClosedEnabled, setEnabled: setHkPlayerClosedEnabled },
          ].map((rule) => (
            <div key={rule.label} style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${TOKENS.border}`, background: TOKENS.surface0 }}>
              <Checkbox checked={rule.enabled} onChange={(value) => rule.setEnabled(value)} label={rule.label} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ ...eyebrowStyle }}>{t('homekitGuideTitle')}</div>
          <PillBtn size="sm" onClick={() => setHomekitGuideOpen((v) => !v)}>{homekitGuideOpen ? t('closeGuide') : t('openGuide')}</PillBtn>
        </div>
        {homekitGuideOpen ? (
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: TOKENS.textDim }}>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>{t('homekitGuideStep1')}</li>
              <li>{t('homekitGuideStep2')}</li>
              <li>{t('homekitGuideStep3')}</li>
              <li>{t('homekitGuideStep4')}</li>
              <li>{t('homekitGuideStep5')}</li>
            </ol>
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, border: `1px solid ${TOKENS.border}`, background: TOKENS.surface0 }}>
              <div style={{ ...eyebrowStyle }}>{t('homekitSwitchesToUse')}</div>
              <div style={{ marginTop: 4, color: TOKENS.textDim }}>{t('homekitSwitchesList')}</div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )

}
