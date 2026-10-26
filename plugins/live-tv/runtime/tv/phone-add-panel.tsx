'use client'

import { useMemo } from 'react'
import { QRCodeSVG } from '@/lib/plugin-sdk'
import { usePhoneForm, type PhoneFormLang, type PhoneFormSpec, type PhoneValues } from '../phone-form'
import { PickerPanel } from './picker-panel'
import type { TvNav } from './tv-shell'
import type { TvStringKey } from './tv-strings'
import { TV, dp, station } from './tv-ui'

type TT = (k: TvStringKey, v?: Record<string, string | number>) => string

/** Formuläret telefonen ritar: M3U-adresser ELLER en Xtream-inloggning. */
export function playlistPhoneSpec(tt: TT, lang: PhoneFormLang): PhoneFormSpec {
  return {
    title: tt('phoneFormTitle'),
    intro: tt('phoneFormIntro'),
    lang,
    fields: [
      { id: 'm3u', label: tt('phoneFieldM3u'), kind: 'multiline', placeholder: 'https://example.com/playlist.m3u' },
      { id: 'server', label: tt('phoneFieldServer'), kind: 'url', placeholder: 'http://host:8080' },
      { id: 'username', label: tt('phoneFieldUsername'), kind: 'text' },
      { id: 'password', label: tt('phoneFieldPassword'), kind: 'password' },
    ],
  }
}

/**
 * LÄGG TILL MED TELEFONEN. En panel med QR:en till telefonsidan; svaret går
 * till `onValues` och panelen stängs. Bakåt (eller Avbryt) stänger och
 * avbryter koden.
 */
export function PhoneAddPanel({ nav, tt, lang, onValues, onClose }: { nav: TvNav; tt: TT; lang: PhoneFormLang; onValues: (values: PhoneValues) => void; onClose: () => void }) {
  const spec = useMemo(() => playlistPhoneSpec(tt, lang), [tt, lang])
  return (
    <PickerPanel
      nav={nav}
      title={tt('addFromPhone')}
      testId="phone-add"
      chips={null}
      onClose={onClose}
      rows={(close) => <Body tt={tt} spec={spec} onValues={(v) => { close(); onValues(v) }} onCancel={close} />}
    />
  )
}

function Body({ tt, spec, onValues, onCancel }: { tt: TT; spec: PhoneFormSpec; onValues: (values: PhoneValues) => void; onCancel: () => void }) {
  const form = usePhoneForm(true, spec, onValues)
  const btn = (label: string, onOk: () => void, testId: string, init = false) => (
    <div {...station(onOk)} {...(init ? { 'data-init': '' } : {})} data-testid={testId}
      style={{ minHeight: dp(56), padding: `0 ${dp(22)}px`, borderRadius: dp(12), background: TV.s06, display: 'inline-flex', alignItems: 'center', fontSize: dp(19), fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: dp(18), alignItems: 'flex-start' }}>
      <div style={{ fontSize: dp(19), color: TV.muted, lineHeight: 1.4 }}>{tt('phoneFormScan')}</div>
      <div data-testid="phone-add-qr" style={{ background: '#fff', padding: dp(12), borderRadius: dp(12), minWidth: dp(220), minHeight: dp(220), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {form.url && !form.expired ? <QRCodeSVG value={form.url} size={dp(220)} /> : <span style={{ color: '#333', fontSize: dp(17) }}>{form.failed ? '—' : form.expired ? '' : tt('phoneFormWaiting')}</span>}
      </div>
      {form.url && !form.expired ? <div style={{ fontSize: dp(15), color: TV.muted, wordBreak: 'break-all' }}>{form.url}</div> : null}
      {form.failed ? <div role="status" style={{ fontSize: dp(18) }}>{tt('phoneFormFailed')}</div> : null}
      {form.expired ? <div role="status" style={{ fontSize: dp(18) }}>{tt('phoneFormExpired')}</div> : null}
      <div style={{ display: 'flex', gap: dp(12) }}>
        {form.expired || form.failed ? btn(tt('phoneFormRetry'), form.restart, 'phone-add-retry', true) : null}
        {btn(tt('cancel'), onCancel, 'phone-add-cancel', !(form.expired || form.failed))}
      </div>
    </div>
  )
}
