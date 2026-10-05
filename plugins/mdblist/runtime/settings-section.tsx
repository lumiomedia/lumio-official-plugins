'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Card, Icon, PillBtn, QRCodeSVG, Switch, TOKENS, eyebrowStyle, getMdblistApiKey, inputStyle, monoFont,
  onProfileChanged, onRatingSourcesChanged, resolvePluginText, setMdblistApiKey, useLang,
} from '@/lib/plugin-sdk'
import { checkConnection, device, disconnect, hasAuth, isTraktConnected, onTick, prefs, prefsSnapshot, status, syncNow } from './host'
import type { PrefKind } from './prefs'
import { connectionTitle, countdown, syncText } from './rows'
import { fillBoth, S, type Text } from './strings'

const MINT = '#3CD6A3'
const RED = '#FF5A6A'

/** Värdens statuspunkt + kort, ritat enligt designhandoffen (Spårningstjänster → Konton). */
export function MdblistSettingsSection() {
  const { lang } = useLang()
  const tx = (text: Text) => resolvePluginText(text, lang)
  const [, rerender] = useState(0)
  const bump = () => rerender((n) => n + 1)
  const [key, setKey] = useState(() => getMdblistApiKey())
  const [showKey, setShowKey] = useState(() => getMdblistApiKey().trim().length > 0 && !device.hasToken())

  useEffect(() => {
    const offs = [
      status.subscribe(bump), device.subscribe(bump), onTick(bump),
      onRatingSourcesChanged(() => setKey(getMdblistApiKey())),
      // Profilbyte: fältet ska visa den nya profilens nyckel, och en osparad
      // ändring får inte sparas in i den nya profilen vid blur.
      onProfileChanged(() => {
        setKey(getMdblistApiKey())
        setShowKey(getMdblistApiKey().trim().length > 0 && !device.hasToken())
      }),
    ]
    return () => { for (const off of offs) off() }
  }, [])

  // Pausrutan försvinner av sig själv när pausen är slut.
  const pausedUntil = status.get().pausedUntil
  useEffect(() => {
    const left = pausedUntil - Date.now()
    if (left <= 0) return
    const timer = window.setTimeout(bump, left + 50)
    return () => window.clearTimeout(timer)
  }, [pausedUntil])

  const state = status.get()
  const flow = device.state()
  const authed = hasAuth()
  const connected = authed && state.connection !== 'bad-key'
  const ok = connected && state.connection === 'ok'
  const on = prefsSnapshot()
  const paused = state.pausedUntil > Date.now()

  const badge = !authed
    ? { text: S.badgeNotConnected, bg: 'rgba(255,255,255,.06)', fg: '#8b8e99' }
    : state.connection === 'bad-key'
      ? { text: S.badgeBadKey, bg: 'rgba(255,90,106,.14)', fg: RED }
      : { text: S.badgeConnected, bg: 'rgba(60,214,163,.14)', fg: MINT }
  const body = !authed ? S.notConnectedBody : state.connection === 'bad-key' ? S.badKeyBody : S.connectedBody

  const toggle = (kind: PrefKind) => (value: boolean) => {
    prefs.setOn(kind, value)
    bump()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text }}>{tx(connectionTitle(state, authed))}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: TOKENS.textMute, maxWidth: '62ch', marginTop: 4 }}>
                {ok && state.supporter ? 'MDBList Supporter · ' : ''}{tx(body)}
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', padding: '3px 7px', borderRadius: 4, background: badge.bg, color: badge.fg, whiteSpace: 'nowrap' }}>
              {tx(badge.text)}
            </span>
          </div>

          <DeviceFlow tx={tx} />

          {flow.phase === 'idle' || flow.phase === 'done' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!device.hasToken() ? (
                <PillBtn variant="accent" onClick={() => { void device.start() }}>{tx(S.connect)}</PillBtn>
              ) : (
                <PillBtn onClick={() => { void disconnect() }}>{tx(S.disconnect)}</PillBtn>
              )}
              {!device.hasToken() && !showKey ? (
                <PillBtn onClick={() => setShowKey(true)}>{tx(S.useApiKey)}</PillBtn>
              ) : null}
            </div>
          ) : null}

          {showKey && !device.hasToken() ? (
            <div>
              <div style={{ ...eyebrowStyle, marginBottom: 6 }}>{tx(S.apiKeyEyebrow)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={key}
                  placeholder={tx(S.apiKeyPlaceholder)}
                  onChange={(e) => setKey(e.target.value)}
                  onBlur={() => { if (key.trim() !== getMdblistApiKey().trim()) setMdblistApiKey(key.trim()) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setMdblistApiKey(key.trim()); void checkConnection() } }}
                  style={{
                    ...inputStyle, flex: 1, minWidth: 0, fontFamily: monoFont, fontSize: 14,
                    ...(state.connection === 'bad-key' ? { borderColor: 'rgba(255,90,106,.5)' } : null),
                  }}
                />
                <PillBtn
                  onClick={() => { setMdblistApiKey(key.trim()); void checkConnection() }}
                  disabled={state.connection === 'checking'}
                >
                  {tx(state.connection === 'checking' ? S.checking : S.check)}
                </PillBtn>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 8, fontSize: 12.5, color: TOKENS.textMute }}>
                <span>{tx(S.keyHint)}</span>
                <a href="https://mdblist.com/preferences/" target="_blank" rel="noreferrer" style={{ color: TOKENS.accent, whiteSpace: 'nowrap' }}>
                  {tx(S.getKey)}
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <div>
        <div style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '.16em', color: '#e8e8ec', paddingTop: 12, marginBottom: 6 }}>
          {tx(S.whatSyncs)}
        </div>
        <div style={{ background: 'var(--st-box)', borderRadius: 10, padding: '0 18px' }}>
          <ToggleRow first title={tx(S.scrobble)} hint={tx(S.scrobbleHint)} checked={on.scrobble} disabled={!ok} onChange={toggle('scrobble')} />
          <ToggleRow title={tx(S.syncWatched)} hint={tx(S.syncWatchedHint)} checked={on.watched} disabled={!ok} onChange={toggle('watched')} />
          <ToggleRow title={tx(S.syncWatchlist)} hint={tx(S.syncWatchlistHint)} checked={on.watchlist} disabled={!ok} onChange={toggle('watchlist')} />
        </div>
      </div>

      {connected && paused ? (
        <div style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${TOKENS.warn}`, background: 'rgba(243,201,105,.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.warn }}>{tx(syncText(state, Date.now()))}</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: TOKENS.textDim, marginTop: 2 }}>{tx(S.pausedBody)}</div>
        </div>
      ) : ok ? (
        <Card padding="14px 18px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, color: '#e8e8ec' }}>{tx(syncText(state, Date.now()))}</div>
              <div style={{ fontSize: 12.5, color: TOKENS.textMute, marginTop: 2 }}>{tx(S.syncAuto)}</div>
            </div>
            <PillBtn
              icon="refresh"
              onClick={() => { void syncNow({ pushWatched: true, reason: 'Synka nu' }) }}
              disabled={state.syncing || (!on.watched && !on.watchlist)}
            >
              {tx(state.syncing ? S.syncing : S.syncNow)}
            </PillBtn>
          </div>
        </Card>
      ) : null}

      {ok && isTraktConnected() && (on.watched || on.scrobble) ? (
        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.035)' }}>
          <Icon name="warning" size={16} color={TOKENS.textDim} />
          <span style={{ fontSize: 12.5, color: TOKENS.textDim }}>{tx(S.traktTip)}</span>
        </div>
      ) : null}
    </div>
  )
}

/** Koden, QR-koden och nedräkningen medan anslutningen väntar på godkännande. */
function DeviceFlow({ tx }: { tx: (text: Text) => string }) {
  const flow = device.state()
  if (flow.phase === 'idle' || flow.phase === 'done') return null
  if (flow.phase === 'checking' || (flow.phase === 'waiting' && !flow.userCode)) {
    return <div style={{ fontSize: 13, color: TOKENS.textDim }}>{tx(S.deviceChecking)}</div>
  }
  if (flow.phase !== 'waiting') {
    const text = flow.phase === 'expired' ? S.deviceExpired : flow.phase === 'denied' ? S.deviceDenied : S.deviceError
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: flow.phase === 'expired' ? TOKENS.textDim : RED }}>{tx(text)}</span>
        <PillBtn variant="accent" onClick={() => { void device.start() }}>{tx(S.deviceNewCode)}</PillBtn>
        <PillBtn onClick={() => device.cancel()}>{tx(S.cancel)}</PillBtn>
      </div>
    )
  }
  const left = (flow.expiresAt ?? Date.now()) - Date.now()
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ background: '#f4f4f6', borderRadius: 10, padding: 12, lineHeight: 0 }}>
        <QRCodeSVG value={flow.verificationUriComplete ?? ''} size={148} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
        <div style={{ fontSize: 12.5, color: TOKENS.textMute, maxWidth: '44ch' }}>{tx(S.deviceIntro)}</div>
        <div style={{ ...eyebrowStyle }}>{tx(S.deviceCode)}</div>
        <div style={{ fontFamily: monoFont, fontSize: 26, letterSpacing: '.12em', color: TOKENS.text }}>{flow.userCode}</div>
        <a href={flow.verificationUriComplete} target="_blank" rel="noreferrer" style={{ color: TOKENS.accent, fontSize: 13 }}>
          {(flow.verificationUri ?? 'https://mdblist.com/oauth/device/').replace(/^https?:\/\//, '')} ↗
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: TOKENS.textDim }}>{tx(fillBoth(S.deviceWaiting, { time: countdown(left) }))}</span>
          <PillBtn onClick={() => device.cancel()}>{tx(S.cancel)}</PillBtn>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ title, hint, checked, disabled, onChange, first }: {
  title: ReactNode
  hint: ReactNode
  checked: boolean
  disabled: boolean
  onChange: (value: boolean) => void
  first?: boolean
}) {
  const row: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '17px 0',
    borderTop: first ? 'none' : '1px solid var(--st-line)', opacity: disabled ? 0.5 : 1,
  }
  return (
    <div style={row}>
      <div>
        <div style={{ fontSize: 14.5, color: '#e8e8ec' }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#8b8e99', maxWidth: '62ch', marginTop: 4 }}>{hint}</div>
      </div>
      <Switch checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  )
}
