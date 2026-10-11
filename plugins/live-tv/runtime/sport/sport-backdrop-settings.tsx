'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { QRCodeSVG, useTvMode } from '@/lib/plugin-sdk'
import { LtBtn, LtNote, LtRows, LtSection } from '../settings-ui'
import { Heading, Row } from '../tv/settings-tabs'
import { TV, dp } from '../tv/tv-ui'
import { useTvText, type TvStringKey } from '../tv/tv-strings'
import { KIND_KEYS } from './sport-ctx'
import { SPORT_KINDS } from './sport-model'
import { customBackdropUrl, removeBackdrop, resolveBackdropMode, uploadBackdrop, useBackdropUploads, type BackdropScope } from './backdrop'
import { useBackdropHandoff } from './backdrop-handoff'
import { setSportSettings, useSportSettings, type SportBackdropMode, type SportBackdrops, type SportCardTone } from './sport-store'

const MODES: SportBackdropMode[] = ['standard', 'auto', 'custom', 'off']
const MODE_LABEL: Record<SportBackdropMode, TvStringKey> = { standard: 'sportBackdropStandard', auto: 'sportBackdropAuto', custom: 'sportBackdropCustom', off: 'sportBackdropOff' }
const SCOPES: BackdropScope[] = ['all', ...SPORT_KINDS]
const TONES: SportCardTone[] = ['black', 'gray', 'image']
const TONE_LABEL: Record<SportCardTone, TvStringKey> = { black: 'sportCardsBlack', gray: 'sportCardsGray', image: 'sportCardsImage' }
/** TV-radens steg (fjärren har inget reglage). */
const OPACITY_STEPS = [0, 25, 50, 70, 85, 100]
const ACCEPT = 'image/jpeg,image/png,image/webp'

type ModeChoice = SportBackdropMode | 'inherit'

function setScopeMode(current: SportBackdrops, scope: BackdropScope, mode: ModeChoice): void {
  if (scope === 'all') {
    if (mode !== 'inherit') setSportSettings({ backdrops: { ...current, all: mode } })
    return
  }
  const sports = { ...current.sports }
  if (mode === 'inherit') delete sports[scope]
  else sports[scope] = mode
  setSportSettings({ backdrops: { ...current, sports } })
}

function useScopeState(scope: BackdropScope) {
  const s = useSportSettings()
  const own: ModeChoice = scope === 'all' ? s.backdrops.all : s.backdrops.sports[scope] ?? 'inherit'
  const { mode, slot } = resolveBackdropMode(s.backdrops, scope)
  // Egna bilder laddas upp till platsen som faktiskt gäller (ärvd Egen bild = "Alla sporter").
  return { s, own, mode, slot }
}

function useUploader(slot: BackdropScope) {
  const { tt } = useTvText()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus(tt('sportBackdropUploading'))
    void uploadBackdrop(slot, file).then((r) => setStatus(r.ok ? null : tt('sportBackdropUploadFailed')))
  }
  const input = <input ref={inputRef} data-testid="sport-backdrop-file" type="file" accept={ACCEPT} onChange={onFile} style={{ display: 'none' }} />
  return { input, pick: () => inputRef.current?.click(), status }
}

export function SportBackdropSettingsDesktop() {
  const { tt } = useTvText()
  const [scope, setScope] = useState<BackdropScope>('all')
  const { s, own, mode, slot } = useScopeState(scope)
  const uploads = useBackdropUploads()
  const uploader = useUploader(slot)
  const scopeLabel = (k: BackdropScope) => (k === 'all' ? tt('sportBackdropAllSports') : tt(KIND_KEYS[k]))
  const choices: ModeChoice[] = scope === 'all' ? MODES : ['inherit', ...MODES]
  const version = uploads[slot]
  return (
    <div data-testid="sport-backdrop-settings">
      <LtSection title={tt('sportBackdropTitle')} hint={tt('sportBackdropHint')} />
      <LtRows>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 0 4px' }}>
          {SCOPES.map((k) => (
            <LtBtn key={k} testId={`sport-backdrop-scope-${k}`} active={scope === k} onClick={() => setScope(k)}>{scopeLabel(k)}</LtBtn>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0 12px' }}>
          {choices.map((m) => (
            <LtBtn key={m} testId={`sport-backdrop-${m}`} active={own === m} onClick={() => setScopeMode(s.backdrops, scope, m)}>
              {m === 'inherit' ? `${tt('sportBackdropInherit')} (${tt(MODE_LABEL[s.backdrops.all])})` : tt(MODE_LABEL[m])}
            </LtBtn>
          ))}
        </div>
        {mode === 'custom' ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0' }}>
            {version != null ? (
              <span data-testid="sport-backdrop-preview" aria-hidden="true" style={{ width: 120, height: 68, borderRadius: 8, background: `center / cover no-repeat url("${customBackdropUrl(slot, version)}")` }} />
            ) : null}
            {uploader.input}
            <LtBtn testId="sport-backdrop-choose" onClick={uploader.pick}>{version != null ? tt('sportBackdropReplace') : tt('sportBackdropChoose')}</LtBtn>
            {version != null ? <LtBtn variant="danger" testId="sport-backdrop-remove" onClick={() => void removeBackdrop(slot)}>{tt('sportBackdropRemove')}</LtBtn> : null}
            {slot !== scope ? <LtNote>{`${tt('sportBackdropInherit')}`}</LtNote> : null}
          </div>
        ) : null}
        {uploader.status ? <LtNote>{uploader.status}</LtNote> : null}
        {mode === 'custom' ? <LtNote>{tt('sportBackdropLocalNote')}</LtNote> : null}
      </LtRows>
      <LtSection title={tt('sportCardsTitle')} hint={tt('sportCardsHint')} />
      <LtRows>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
          <span style={{ minWidth: 90 }}>{tt('sportCardsOpacity')}</span>
          <input data-testid="sport-cards-opacity" type="range" min={0} max={100} step={5} value={s.cards.opacity}
            onChange={(e) => setSportSettings({ cards: { ...s.cards, opacity: Number(e.target.value) } })} style={{ flex: 1, accentColor: 'rgb(var(--accent-500))' }} />
          <span style={{ minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{`${s.cards.opacity} %`}</span>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0 12px' }}>
          {TONES.map((t) => (
            <LtBtn key={t} testId={`sport-cards-tone-${t}`} active={s.cards.tone === t} onClick={() => setSportSettings({ cards: { ...s.cards, tone: t } })}>{tt(TONE_LABEL[t])}</LtBtn>
          ))}
        </div>
      </LtRows>
    </div>
  )
}

export function SportBackdropSettingsTv({ phone = false }: { phone?: boolean; pushLayer?: (close: () => void) => () => void }) {
  const { tt } = useTvText()
  const tvMode = useTvMode()
  const [scope, setScope] = useState<BackdropScope>('all')
  const { s, own, mode, slot } = useScopeState(scope)
  const uploads = useBackdropUploads()
  const uploader = useUploader(slot)
  const [qrOpen, setQrOpen] = useState(false)
  // TV-boxen har ingen filväljare: bilden kommer från telefonen. Telefonen och skrivbordet väljer en fil.
  const viaPhone = tvMode && !phone
  const handoff = useBackdropHandoff(viaPhone && qrOpen && mode === 'custom', slot)
  const choices: ModeChoice[] = scope === 'all' ? MODES : ['inherit', ...MODES]
  const nextMode = choices[(choices.indexOf(own) + 1) % choices.length]!
  const nextScope = SCOPES[(SCOPES.indexOf(scope) + 1) % SCOPES.length]!
  const scopeLabel = scope === 'all' ? tt('sportBackdropAllSports') : tt(KIND_KEYS[scope])
  const modeLabel = own === 'inherit' ? `${tt('sportBackdropInherit')} (${tt(MODE_LABEL[s.backdrops.all])})` : tt(MODE_LABEL[own])
  const version = uploads[slot]
  const nextOpacity = OPACITY_STEPS.find((n) => n > s.cards.opacity) ?? OPACITY_STEPS[0]!
  const nextTone = TONES[(TONES.indexOf(s.cards.tone) + 1) % TONES.length]!
  return (
    <div data-testid="sport-backdrop-settings-tv">
      <Heading phone={phone} hint={tt('sportBackdropHint')}>{tt('sportBackdropTitle')}</Heading>
      <Row phone={phone} testId="sport-backdrop-scope" label={tt('sportBackdropScope')} right={scopeLabel} onOk={() => { setScope(nextScope); setQrOpen(false) }} />
      <Row phone={phone} testId="sport-backdrop-mode" label={tt('sportBackdropTitle')} right={modeLabel} onOk={() => setScopeMode(s.backdrops, scope, nextMode)} />
      {mode === 'custom' ? (
        <>
          {viaPhone ? (
            <Row phone={phone} testId="sport-backdrop-phone" label={tt('sportBackdropPhone')} right={version != null ? tt('sportBackdropHasImage') : tt('sportBackdropNoImage')} onOk={() => { setQrOpen(true); handoff.restart() }} />
          ) : (
            <>
              {uploader.input}
              <Row phone={phone} testId="sport-backdrop-choose" label={version != null ? tt('sportBackdropReplace') : tt('sportBackdropChoose')} right={version != null ? tt('sportBackdropHasImage') : tt('sportBackdropNoImage')} onOk={uploader.pick} />
            </>
          )}
          {version != null ? <Row phone={phone} testId="sport-backdrop-remove" label={tt('sportBackdropRemove')} right="" onOk={() => void removeBackdrop(slot)} /> : null}
          {viaPhone && qrOpen ? (
            <figure data-testid="sport-backdrop-handoff" style={{ margin: 0, display: 'flex', gap: dp(20), alignItems: 'center', padding: `${dp(8)}px 0` }}>
              {handoff.url && !handoff.received ? <div data-testid="sport-backdrop-qr" style={{ background: '#fff', padding: dp(8), borderRadius: dp(8) }}><QRCodeSVG value={handoff.url} size={dp(132)} /></div> : null}
              <figcaption style={{ fontSize: dp(16), color: TV.dim, maxWidth: dp(360) }}>
                {handoff.received ? tt('sportBackdropReceived') : handoff.expired ? tt('sportKeyExpired') : tt('sportBackdropPhoneHint')}
              </figcaption>
            </figure>
          ) : null}
          {uploader.status ? <div role="status" style={{ fontSize: phone ? 13 : dp(16), color: TV.dim, padding: phone ? '6px 14px' : 0 }}>{uploader.status}</div> : null}
          <div style={{ fontSize: phone ? 13 : dp(15), color: TV.dim, padding: phone ? '6px 14px' : 0 }}>{tt('sportBackdropLocalNote')}</div>
        </>
      ) : null}
      <Heading phone={phone} hint={tt('sportCardsHint')}>{tt('sportCardsTitle')}</Heading>
      <Row phone={phone} testId="sport-cards-opacity-row" label={tt('sportCardsOpacity')} right={`${s.cards.opacity} %`} onOk={() => setSportSettings({ cards: { ...s.cards, opacity: nextOpacity } })} />
      <Row phone={phone} testId="sport-cards-tone-row" label={tt('sportCardsColor')} right={tt(TONE_LABEL[s.cards.tone])} onOk={() => setSportSettings({ cards: { ...s.cards, tone: nextTone } })} />
    </div>
  )
}
