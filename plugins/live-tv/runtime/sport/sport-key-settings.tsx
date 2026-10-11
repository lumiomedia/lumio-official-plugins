'use client'

import { useState } from 'react'
import { LtBtn, LtConfirm, LtNote, LtRows, LtSection } from '../settings-ui'
import { Heading, Row } from '../tv/settings-tabs'
import { useTvText } from '../tv/tv-strings'
import { KeyCard } from './key-card'
import { maskKey, removeKey } from './key-flow'
import { rateLine } from './rate-line'
import { useResultsController } from './results-controller'
import { useSportSettings } from './sport-store'

const PROVIDER_LABEL = { 'api-sports': 'API-Sports', thesportsdb: 'TheSportsDB' } as const

function useQuotaText(): string | null {
  const { tt, lang, locale } = useTvText()
  const controller = useResultsController()
  return controller ? rateLine(controller.status(), tt, { lang, locale })?.text ?? null : null
}

export function SportKeySettingsDesktop() {
  const { tt } = useTvText()
  const s = useSportSettings()
  const quota = useQuotaText()
  const [changing, setChanging] = useState(false)
  const [confirm, setConfirm] = useState(false)
  return (
    <div data-testid="sport-key-settings">
      <LtSection eyebrow={tt('tabSport')} title={tt('sportSettingsTitle')} />
      {!s.apiKey || changing ? (
        <KeyCard variant="settings" onDone={() => setChanging(false)} />
      ) : (
        <LtRows>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0' }}>
            <span>{tt('sportSettingsSource')}</span><span>{PROVIDER_LABEL[s.provider]}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0' }}>
            <span>{tt('sportSettingsKey')}</span><span style={{ fontFamily: 'ui-monospace, monospace' }}>{maskKey(s.apiKey)}</span>
          </div>
          {quota ? <LtNote>{quota}</LtNote> : null}
          <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
            <LtBtn onClick={() => setChanging(true)}>{tt('sportKeyChange')}</LtBtn>
            <LtBtn variant="danger" onClick={() => setConfirm(true)}>{tt('sportKeyRemove')}</LtBtn>
          </div>
        </LtRows>
      )}
      {confirm ? (
        <LtConfirm title={tt('sportKeyRemove')} body={tt('sportKeyRemoveBody')} confirmLabel={tt('sportKeyRemove')} cancelLabel={tt('sportCancel')}
          onCancel={() => setConfirm(false)} onConfirm={() => { removeKey(); setConfirm(false) }} />
      ) : null}
    </div>
  )
}

export function SportKeySettingsTv({ phone = false }: { phone?: boolean }) {
  const { tt } = useTvText()
  const s = useSportSettings()
  const quota = useQuotaText()
  const [changing, setChanging] = useState(false)
  if (!s.apiKey || changing) return <KeyCard variant="settings" onDone={() => setChanging(false)} />
  return (
    <div data-testid="sport-key-settings-tv">
      <Heading phone={phone} hint={quota ?? undefined}>{tt('sportSettingsTitle')}</Heading>
      <Row phone={phone} testId="sport-key-source" label={tt('sportSettingsSource')} right={PROVIDER_LABEL[s.provider]} onOk={() => setChanging(true)} />
      <Row phone={phone} testId="sport-key-masked" label={tt('sportSettingsKey')} right={maskKey(s.apiKey)} onOk={() => setChanging(true)} />
      <Row phone={phone} testId="sport-key-change" label={tt('sportKeyChange')} right="" onOk={() => setChanging(true)} />
      <Row phone={phone} testId="sport-key-remove" label={tt('sportKeyRemove')} right="" onOk={() => removeKey()} />
    </div>
  )
}
