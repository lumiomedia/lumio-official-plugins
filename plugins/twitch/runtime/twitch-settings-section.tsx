'use client'

import { useEffect, useState } from 'react'
import {
  onAuthCapabilitiesChanged,
  resolveAuthCapabilityStatus,
  resolvePluginText,
  useLang,
} from '@/lib/plugin-sdk'
import { connectTwitch, disconnectTwitch, openTwitchVerificationUrl } from './twitch-auth'

const settingsActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40'

const settingsPrimaryActionButtonClass =
  'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white disabled:opacity-40'

const TEXT = {
  connection: { en: 'Connection', sv: 'Anslutning' },
  notConnected: { en: 'Not connected', sv: 'Inte ansluten' },
  connectedAs: { en: 'Connected as', sv: 'Ansluten som' },
  connect: { en: 'Connect Twitch', sv: 'Anslut Twitch' },
  connecting: { en: 'Connecting…', sv: 'Ansluter…' },
  disconnect: { en: 'Disconnect', sv: 'Koppla från' },
  disconnecting: { en: 'Disconnecting…', sv: 'Kopplar från…' },
  connectError: { en: 'Could not connect Twitch.', sv: 'Kunde inte ansluta Twitch.' },
  disconnectError: { en: 'Could not disconnect Twitch.', sv: 'Kunde inte koppla från Twitch.' },
  connectionNote: {
    en: 'Sign in with your Twitch account to browse followed channels and access your streams.',
    sv: 'Logga in med ditt Twitch-konto för att bläddra bland kanaler du följer och dina streams.',
  },
  deviceCodeIntro: {
    en: 'Open the Twitch activation page and enter this code:',
    sv: 'Öppna Twitchs aktiveringssida och ange denna kod:',
  },
  openVerificationUrl: { en: 'Open twitch.tv/activate', sv: 'Öppna twitch.tv/activate' },
  waitingForApproval: { en: 'Waiting for approval on twitch.tv…', sv: 'Väntar på godkännande på twitch.tv…' },
} as const

export function TwitchSettingsSection() {
  const { lang } = useLang()
  const [sessionLabel, setSessionLabel] = useState('')
  const [sessionDetail, setSessionDetail] = useState('')
  const [busy, setBusy] = useState<'idle' | 'connecting' | 'disconnecting'>('idle')
  const [error, setError] = useState('')
  const [userCode, setUserCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')

  function text(key: keyof typeof TEXT): string {
    return TEXT[key][lang] ?? TEXT[key].en
  }

  useEffect(() => {
    const sync = () => {
      void resolveAuthCapabilityStatus('twitch-auth')
        .then((status) => {
          if (!status) {
            setSessionLabel(text('notConnected'))
            setSessionDetail('')
            return
          }
          if (status.state === 'connected' && status.accountLabel) {
            setSessionLabel(`${text('connectedAs')} ${status.accountLabel}`)
          } else {
            setSessionLabel(text('notConnected'))
          }
          setSessionDetail(status.detail ? resolvePluginText(status.detail, lang) : '')
        })
        .catch(() => {
          setSessionLabel(text('notConnected'))
          setSessionDetail('')
        })
    }
    sync()
    return onAuthCapabilitiesChanged(sync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  async function handleConnect() {
    setBusy('connecting')
    setError('')
    setUserCode('')
    setVerificationUri('')
    try {
      await connectTwitch((nextUserCode, nextVerificationUri) => {
        setUserCode(nextUserCode)
        setVerificationUri(nextVerificationUri)
      })
      const nextStatus = await resolveAuthCapabilityStatus('twitch-auth')
      setSessionLabel(
        nextStatus?.state === 'connected' && nextStatus.accountLabel
          ? `${text('connectedAs')} ${nextStatus.accountLabel}`
          : text('notConnected'),
      )
      setSessionDetail(nextStatus?.detail ? resolvePluginText(nextStatus.detail, lang) : '')
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : text('connectError'))
    } finally {
      setUserCode('')
      setVerificationUri('')
      setBusy('idle')
    }
  }

  async function handleDisconnect() {
    setBusy('disconnecting')
    setError('')
    try {
      disconnectTwitch()
      setSessionLabel(text('notConnected'))
      setSessionDetail('')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : text('disconnectError'))
    } finally {
      setBusy('idle')
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{text('connection')}</p>
        <p className="mt-2 text-sm text-slate-300">{sessionLabel}</p>
        {sessionDetail ? <p className="mt-2 text-xs text-amber-300">{sessionDetail}</p> : null}
        <p className="mt-2 text-xs text-slate-500">{text('connectionNote')}</p>
      </div>

      {busy === 'connecting' && userCode ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs text-slate-400">{text('deviceCodeIntro')}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[0.3em] text-white">{userCode}</p>
          <button
            type="button"
            onClick={() => void openTwitchVerificationUrl(verificationUri)}
            className={`${settingsPrimaryActionButtonClass} mt-3`}
          >
            {text('openVerificationUrl')}
          </button>
          <p className="mt-3 text-xs text-slate-500">{text('waitingForApproval')}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleConnect}
          disabled={busy !== 'idle'}
          className={settingsPrimaryActionButtonClass}
        >
          {busy === 'connecting' ? text('connecting') : text('connect')}
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={busy !== 'idle'}
          className={settingsActionButtonClass}
        >
          {busy === 'disconnecting' ? text('disconnecting') : text('disconnect')}
        </button>
      </div>
    </div>
  )
}
