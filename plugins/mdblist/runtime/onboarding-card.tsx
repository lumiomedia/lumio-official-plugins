'use client'

import { useEffect } from 'react'
import {
  QRCodeSVG, monoFont, openExternalUrl, resolvePluginText, useLang, type PluginOnboardingCardProps,
} from '@/lib/plugin-sdk'
import { checkConnection, device, hasAuth, status } from './host'
import { connectionTitle, countdown } from './rows'
import { useLive } from './settings-section'
import { fillBoth, S, type Text } from './strings'

/**
 * Anslutningskortet i onboardingens Integrationer-steg, bredvid Trakts.
 *
 * Visas INNAN pluginet installeras (värden läser kortet ur den inbakade
 * runtimen), så bakgrunden är inte igång — kortet kontrollerar själv
 * anslutningen. Token som sparas här ligger kvar när pluginet installeras.
 * Klasserna är onboardingens egna (`onb-*`).
 */
export function MdblistOnboardingCard({ init }: PluginOnboardingCardProps) {
  const { lang } = useLang()
  const tx = (text: Text) => resolvePluginText(text, lang)
  useLive()
  useEffect(() => { if (hasAuth()) void checkConnection() }, [])

  const state = status.get()
  const flow = device.state()
  const connected = hasAuth() && state.connection !== 'bad-key'
  const busy = flow.phase === 'waiting' || flow.phase === 'checking'
  const finished = flow.phase === 'expired' || flow.phase === 'denied' || flow.phase === 'error'

  return (
    <div className="onb-panel" data-size="sm">
      <div className="onb-row">
        <div style={{ minWidth: 0 }}>
          <p className="onb-card-title">MDBList</p>
          <p className="onb-hint" style={{ marginTop: 'calc(2 * var(--u))' }}>
            {tx(connected ? S.connectedBody : S.onboardingHint)}
          </p>
        </div>
        {connected ? (
          <p className="onb-status" style={{ color: 'var(--onb-ok)', fontWeight: 500 }}>
            {tx(connectionTitle(state, true))}
          </p>
        ) : (
          <button
            type="button"
            className="onb-btn"
            data-size="sm"
            disabled={busy}
            onClick={() => { void device.start() }}
            {...(init && !busy ? { 'data-init': '' } : {})}
          >
            {tx(busy ? S.checking : finished ? S.deviceNewCode : S.connect)}
          </button>
        )}
      </div>

      {!connected && flow.phase === 'waiting' && flow.userCode ? (
        <div style={{ display: 'flex', gap: 'calc(16 * var(--u))', alignItems: 'center', flexWrap: 'wrap', marginTop: 'calc(12 * var(--u))' }}>
          <div style={{ background: '#f4f4f6', borderRadius: 10, padding: 10, lineHeight: 0 }}>
            <QRCodeSVG value={flow.verificationUriComplete ?? ''} size={132} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(6 * var(--u))', minWidth: 0 }}>
            <p className="onb-hint">{tx(S.deviceIntro)}</p>
            <p style={{ fontFamily: monoFont, fontSize: 'calc(26 * var(--u))', letterSpacing: '.12em', margin: 0 }}>{flow.userCode}</p>
            <a
              href={flow.verificationUriComplete}
              onClick={(e) => { e.preventDefault(); void openExternalUrl(flow.verificationUriComplete ?? '') }}
              className="onb-status"
              style={{ cursor: 'pointer' }}
            >
              {(flow.verificationUri ?? 'https://mdblist.com/oauth/device/').replace(/^https?:\/\//, '')} ↗
            </a>
            <p className="onb-small-note">
              {tx(fillBoth(S.deviceWaiting, { time: countdown((flow.expiresAt ?? Date.now()) - Date.now()) }))}
            </p>
          </div>
        </div>
      ) : null}

      {!connected && finished ? (
        <p className="onb-status" style={{ marginTop: 'calc(8 * var(--u))', color: 'var(--onb-danger)' }}>
          {tx(flow.phase === 'expired' ? S.deviceExpired : flow.phase === 'denied' ? S.deviceDenied : S.deviceError)}
        </p>
      ) : null}
    </div>
  )
}
