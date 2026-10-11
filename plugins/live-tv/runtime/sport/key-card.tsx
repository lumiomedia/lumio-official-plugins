'use client'

import { useState } from 'react'
import { QRCodeSVG, useTvMode } from '@/lib/plugin-sdk'
import { TV, dp, station, Segment } from '../tv/tv-ui'
import { useTvText, type TvStringKey } from '../tv/tv-strings'
import { useTextPrompt } from '../tv/tv-text-entry'
import { API_SPORTS_REGISTER_URL } from './api-sports'
import { THESPORTSDB_PRICING_URL } from './thesportsdb'
import { providerFor } from './providers'
import { saveValidatedKey, type KeyFlowResult } from './key-flow'
import { useKeyHandoff } from './key-handoff'
import { currentBudget } from './budget'
import { setSportSettings, useSportSettings, type SportSettings } from './sport-store'
import type { ProviderId } from './provider'
import type { SportKind } from './sport-model'

const SPORT_NAMES: Array<[SportKind, TvStringKey]> = [
  ['football', 'sportNameFootball'], ['hockey', 'sportNameHockey'], ['basketball', 'sportNameBasketball'], ['handball', 'sportNameHandball'],
]

export function shouldShowKeyBanner(s: SportSettings): boolean {
  return !s.apiKey && !s.keyCardDismissed
}

type Phase = { kind: 'idle' } | { kind: 'checking' } | { kind: 'done'; result: KeyFlowResult }

export function KeyCard({ variant, onDone, pushLayer }: { variant: 'banner' | 'tab' | 'settings'; onDone?: () => void; pushLayer?: (close: () => void) => () => void }) {
  const { tt } = useTvText()
  const tv = useTvMode()
  const settings = useSportSettings()
  const [provider, setProvider] = useState<ProviderId>(settings.provider)
  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [phoneEntry, setPhoneEntry] = useState(false)
  const prompt = useTextPrompt({ pushLayer })
  const broken = !!settings.apiKey && !!currentBudget()?.isInvalid()

  const submit = async (raw: string) => {
    setPhase({ kind: 'checking' })
    const result = await saveValidatedKey(provider, raw)
    setPhase({ kind: 'done', result })
    if (result.ok) setPhoneEntry(false)
  }
  const handoff = useKeyHandoff(tv && phoneEntry, (key) => void submit(key))

  const covered = SPORT_NAMES.filter(([s]) => providerFor(provider).coverage(s) === 'full').map(([, k]) => tt(k))
  const sportsText = covered.length > 1 ? `${covered.slice(0, -1).join(', ')} ${tt('sportListAnd')} ${covered[covered.length - 1]}` : covered.join('')
  const signupUrl = provider === 'api-sports' ? API_SPORTS_REGISTER_URL : THESPORTSDB_PRICING_URL

  const message = (() => {
    if (phase.kind === 'checking') return tt('sportKeyChecking')
    if (phase.kind !== 'done') return null
    const r = phase.result
    if (r.ok) {
      const plan = r.check.plan && r.check.plan.toLowerCase() === 'free' ? tt('sportPlanFree') : (r.check.plan ?? '')
      return r.check.limit != null && r.check.used != null ? tt('sportKeyOk', { used: r.check.used, limit: r.check.limit, plan }) : tt('sportKeyOkNoQuota', { plan })
    }
    return r.reason === 'network' ? tt('sportKeyNetwork') : r.reason === 'rejected' ? tt('sportKeyRejected') : null
  })()

  const btn = (label: string, onOk: () => void, primary = false, testId?: string) => (
    <div data-testid={testId} {...station(onOk)} style={{ minHeight: dp(48), padding: `0 ${dp(18)}px`, borderRadius: dp(10), display: 'inline-flex', alignItems: 'center', fontSize: dp(17), fontWeight: 600, cursor: 'pointer', background: primary ? TV.text : TV.s12, color: primary ? '#0e0f13' : TV.text }}>{label}</div>
  )

  return (
    <section data-testid={`sport-key-card-${variant}`} style={{ borderRadius: dp(16), background: TV.s06, border: `1px solid ${TV.lineCard}`, padding: dp(24), display: 'flex', gap: dp(24), flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(12) }}>
        <div style={{ fontSize: dp(24), fontWeight: 600 }}>{broken ? tt('sportKeyBroken') : tt('sportKeyTitle')}</div>
        <Segment options={[{ key: 'api-sports' as ProviderId, label: 'API-Sports' }, { key: 'thesportsdb' as ProviderId, label: 'TheSportsDB' }]} value={provider} onChange={(k) => { setProvider(k); setPhase({ kind: 'idle' }) }} />
        <div style={{ fontSize: dp(16), color: TV.muted }}>{tt('sportKeyChoice')}</div>
        <div style={{ fontSize: dp(16), color: TV.muted }}>{tt('sportKeyCovers', { sports: sportsText })}</div>
        {tv ? (
          <div style={{ display: 'flex', gap: dp(12), flexWrap: 'wrap' }}>
            {btn(tt('sportKeyPhone'), () => { setPhoneEntry(true); handoff.restart() }, true)}
            {prompt.available ? btn(tt('sportKeyKeyboard'), () => prompt.ask(tt('sportKeyPaste'), '', (v) => void submit(v), 'password')) : null}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: dp(10), flexWrap: 'wrap', alignItems: 'center' }}>
            <input data-testid="sport-key-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tt('sportKeyPaste')} autoComplete="off" spellCheck={false}
              style={{ flex: '1 1 220px', minHeight: 44, borderRadius: 10, border: `1px solid ${TV.lineStrong}`, background: 'rgba(0,0,0,0.25)', color: TV.text, padding: '0 12px', fontFamily: 'ui-monospace, monospace' }} />
            {btn(tt('sportKeyPaste'), () => { void navigator.clipboard?.readText?.().then((t) => setDraft(t)).catch(() => {}) })}
            {btn(tt('sportKeySave'), () => void submit(draft), true)}
          </div>
        )}
        {prompt.node}
        {message ? <div role="status" style={{ fontSize: dp(16), color: phase.kind === 'done' && phase.result.ok ? '#3cd6a3' : TV.text }}>{message}</div> : null}
        {variant !== 'settings' && !settings.apiKey ? <div>{btn(tt('sportKeyNotNow'), () => { setSportSettings({ keyCardDismissed: true }); onDone?.() })}</div> : null}
      </div>
      <div style={{ display: 'flex', gap: dp(20), alignItems: 'flex-start' }}>
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: dp(8), alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: dp(8), borderRadius: dp(8) }}><QRCodeSVG value={signupUrl} size={dp(132)} /></div>
          {tv ? <figcaption style={{ fontSize: dp(14), color: TV.dim }}>{tt('sportKeyGetKey')}</figcaption> : <a href={signupUrl} target="_blank" rel="noreferrer" style={{ fontSize: dp(14), color: TV.dim }}>{tt('sportKeyGetKey')}</a>}
        </figure>
        {tv && phoneEntry ? (
          <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: dp(8), alignItems: 'center', maxWidth: dp(180) }}>
            {handoff.url ? <div style={{ background: '#fff', padding: dp(8), borderRadius: dp(8) }}><QRCodeSVG value={handoff.url} size={dp(132)} /></div> : null}
            <figcaption style={{ fontSize: dp(14), color: TV.dim, textAlign: 'center' }}>{handoff.expired ? tt('sportKeyExpired') : tt('sportKeyPhoneHint')}</figcaption>
            {handoff.expired ? btn(tt('sportKeyRetry'), handoff.restart) : null}
          </figure>
        ) : null}
      </div>
    </section>
  )
}
