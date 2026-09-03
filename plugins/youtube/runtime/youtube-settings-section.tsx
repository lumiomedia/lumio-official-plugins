'use client'

import { useEffect, useState } from 'react'
import { Card, Checkbox, PillBtn, TOKENS, eyebrowStyle, inputStyle } from '@/lib/plugin-sdk'
import {
  resolveAuthCapabilityStatus,
  disableHomeOverridePlugin,
  getHomeOverridePluginId,
  onHomeOverridePluginChanged,
  tryEnableHomeOverridePlugin,
  useLang,
} from '@/lib/plugin-sdk'
import { connectYouTube, disconnectYouTube, loadGoogleIdentityServices } from './youtube-auth'
import { isYouTubeErrorKey } from './youtube-errors'
import {
  clearYouTubeCache,
  getYouTubeSettings,
  onYouTubePluginChanged,
  setYouTubeSettings,
} from './youtube-storage'


const settingsActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40'

const settingsPrimaryActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white disabled:opacity-40'
const HOME_OVERRIDE_PLUGIN_ID = 'com.lumio.youtube'

export function YouTubeSettingsSection() {
  const { lang, t } = useLang()
  const [clientId, setClientId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [sessionLabel, setSessionLabel] = useState('')
  const [sessionDetail, setSessionDetail] = useState('')
  const [busy, setBusy] = useState<'idle' | 'connecting' | 'disconnecting'>('idle')
  const [error, setError] = useState('')
  const [hideShorts, setHideShorts] = useState(false)
  const [hero, setHero] = useState(false)
  const [keepHero, setKeepHero] = useState(false)
  const [homeOverrideEnabled, setHomeOverrideEnabled] = useState(false)
  const [homeOverrideError, setHomeOverrideError] = useState('')

  useEffect(() => {
    const sync = () => {
      const settings = getYouTubeSettings()
      setClientId(settings.clientId)
      setApiKey(settings.apiKey)
      setHideShorts(settings.hideShorts)
      setHero(settings.hero)
      setKeepHero(settings.keepHero)
      void resolveAuthCapabilityStatus('youtube-auth').then((status) => {
        if (!status) {
          setSessionLabel(t('pluginYoutubeNotConnected'))
          setSessionDetail('')
          return
        }
        if (status.state === 'connected' && status.accountLabel) {
          setSessionLabel(`${t('connectedAs')} ${status.accountLabel}`)
        } else if (status.state === 'expired') {
          setSessionLabel(t('pluginYoutubeNotConnected'))
        } else {
          setSessionLabel(t('pluginYoutubeNotConnected'))
        }
        setSessionDetail(status.detail ? (typeof status.detail === 'string' ? status.detail : status.detail[lang] ?? status.detail.en ?? status.detail.sv ?? '') : '')
      }).catch(() => {
        setSessionLabel(t('pluginYoutubeNotConnected'))
        setSessionDetail('')
      })
    }
    sync()
    const offPlugin = onYouTubePluginChanged(sync)
    return () => {
      offPlugin()
    }
  }, [])

  useEffect(() => {
    const sync = () => {
      setHomeOverrideEnabled(getHomeOverridePluginId() === HOME_OVERRIDE_PLUGIN_ID)
      setHomeOverrideError('')
    }
    sync()
    return onHomeOverridePluginChanged(sync)
  }, [])

  useEffect(() => {
    if (!clientId.trim()) return
    void loadGoogleIdentityServices().catch(() => {})
  }, [clientId])

  function persist(next: {
    clientId?: string
    apiKey?: string
    hideShorts?: boolean
    hero?: boolean
    keepHero?: boolean
  }) {
    const current = getYouTubeSettings()
    setYouTubeSettings({
      clientId: next.clientId ?? current.clientId,
      apiKey: next.apiKey ?? current.apiKey,
      hideShorts: next.hideShorts ?? current.hideShorts,
      hero: next.hero ?? current.hero,
      keepHero: next.keepHero ?? current.keepHero,
    })
  }

  async function handleConnect() {
    setBusy('connecting')
    setError('')
    persist({ clientId, apiKey, hideShorts, hero, keepHero })
    try {
      await connectYouTube(clientId)
      const nextStatus = await resolveAuthCapabilityStatus('youtube-auth')
      setSessionLabel(
        nextStatus?.state === 'connected' && nextStatus.accountLabel
          ? `${t('connectedAs')} ${nextStatus.accountLabel}`
          : t('pluginYoutubeNotConnected'),
      )
      setSessionDetail(nextStatus?.detail ? (typeof nextStatus.detail === 'string' ? nextStatus.detail : nextStatus.detail[lang] ?? nextStatus.detail.en ?? nextStatus.detail.sv ?? '') : '')
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : ''
      setError(isYouTubeErrorKey(message) ? t(message) : message || t('pluginYoutubeConnectError'))
    } finally {
      setBusy('idle')
    }
  }

  async function handleDisconnect() {
    setBusy('disconnecting')
    setError('')
    try {
      await disconnectYouTube()
      setSessionLabel(t('pluginYoutubeNotConnected'))
      setSessionDetail('')
    } catch (disconnectError) {
      const message = disconnectError instanceof Error ? disconnectError.message : ''
      setError(isYouTubeErrorKey(message) ? t(message) : message || t('pluginYoutubeDisconnectError'))
    } finally {
      setBusy('idle')
    }
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

  const field = (label: string, type: 'text' | 'password', value: string, placeholder: string, onChange: (value: string) => void) => (
    <div>
      <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{label}</div>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <Checkbox checked={homeOverrideEnabled} onChange={(value) => handleHomeOverrideToggle(value)} label={t('homeOverrideUseAsHome')} hint={t('youtubeHomeOverrideDesc')} />
        {homeOverrideError ? <p style={{ margin: '8px 0 0', fontSize: 12, color: TOKENS.red }}>{homeOverrideError}</p> : null}
      </Card>

      <Card>
        <div style={{ ...eyebrowStyle }}>{t('pluginYoutubeConnection')}</div>
        <div style={{ marginTop: 6, fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{sessionLabel}</div>
        {sessionDetail ? <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.warn }}>{sessionDetail}</p> : null}
        <p style={{ margin: '6px 0 12px', fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }}>{t('pluginYoutubeConnectionNote')}</p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {field(t('pluginYoutubeClientId'), 'text', clientId, '1234567890-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', (value) => {
            setClientId(value)
            persist({ clientId: value, apiKey, hideShorts, hero, keepHero })
          })}
          {field(t('pluginYoutubeApiKey'), 'password', apiKey, 'AIza...', (value) => {
            setApiKey(value)
            persist({ clientId, apiKey: value, hideShorts, hero, keepHero })
          })}
        </div>
        {error ? <p style={{ margin: '10px 0 0', fontSize: 13, color: TOKENS.red }}>{error}</p> : null}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <PillBtn variant="accent" onClick={handleConnect} disabled={busy !== 'idle' || !clientId.trim()}>
            {busy === 'connecting' ? t('pluginYoutubeConnecting') : t('pluginYoutubeConnect')}
          </PillBtn>
          <PillBtn onClick={handleDisconnect} disabled={busy !== 'idle'}>
            {busy === 'disconnecting' ? t('pluginYoutubeDisconnecting') : t('pluginYoutubeDisconnect')}
          </PillBtn>
          <PillBtn onClick={() => clearYouTubeCache()}>{t('pluginYoutubeClearCache')}</PillBtn>
        </div>
      </Card>

      <Card>
        <div style={{ ...eyebrowStyle }}>{t('pluginYoutubeVideoOptions')}</div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Checkbox
            checked={hero}
            onChange={(next) => {
              setHero(next)
              persist({ clientId, apiKey, hideShorts, hero: next, keepHero })
            }}
            label={t('pluginYoutubeHero')}
            hint={t('pluginYoutubeHeroHelp')}
          />
          <Checkbox
            checked={keepHero}
            onChange={(next) => {
              setKeepHero(next)
              persist({ clientId, apiKey, hideShorts, hero, keepHero: next })
            }}
            label={t('pluginYoutubeKeepHero')}
            hint={t('pluginYoutubeKeepHeroHelp')}
          />
          <Checkbox
            checked={hideShorts}
            onChange={(next) => {
              setHideShorts(next)
              clearYouTubeCache()
              persist({ clientId, apiKey, hideShorts: next, hero, keepHero })
            }}
            label={t('pluginYoutubeHideShorts')}
            hint={t('pluginYoutubeHideShortsHelp')}
          />
        </div>
      </Card>

      <Card>
        <div style={{ ...eyebrowStyle }}>{t('pluginYoutubeOwnAppTitle')}</div>
        <ol style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, lineHeight: 1.6, color: TOKENS.textDim }}>
          <li>{t('pluginYoutubeOwnAppStep1')}</li>
          <li>{t('pluginYoutubeOwnAppStep2')}</li>
          <li>{t('pluginYoutubeOwnAppStep3')}</li>
          <li>{t('pluginYoutubeOwnAppStep4')}</li>
          <li>{t('pluginYoutubeOwnAppStep5')}</li>
          <li>{t('pluginYoutubeOwnAppStep6')}</li>
        </ol>
        <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }}>{t('pluginYoutubeOwnAppNote')}</p>
      </Card>
    </div>
  )

}
