'use client'

import { useCallback, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { QRCodeSVG, getTvGlassMenu, useTvMode, type TvGlassMenuAction, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { LtBtn, LtNote, LtRows, LtSection, UI } from '../settings-ui'
import { HINT_SIZE, HINT_SIZE_PHONE, Heading, Row } from '../tv/settings-tabs'
import { MT } from '../tv/mobile/mobile-tokens'
import { TV, dp } from '../tv/tv-ui'
import { useTvText, type TvStringKey } from '../tv/tv-strings'
import { MobileSheet } from '../tv/mobile/mobile-sheet'
import { KIND_KEYS } from './sport-ctx'
import { localDayKey } from './sport-epg'
import {
  STANDARD_IMAGES, backdropPreview, customBackdropUrl, removeBackdrop, standardImageFor, uploadBackdrop, useBackdropUploads, type BackdropScope,
} from './backdrop'
import { useBackdropHandoff } from './backdrop-handoff'
import { BACKDROP_SPORTS, BUNDLED_IMAGES, setSportSettings, useSportSettings, type SportBackdropMode, type SportBackdrops, type SportCardTone } from './sport-store'

/**
 * BAKGRUND I SPORT: EN RAD PER SPORT (Jerry 2026-10-11: "ska ju vara en bild
 * per sport? och kunna manuellt välja per sport vilken bild man vill ha?").
 *
 * Alla sporter överst (gäller sporter utan eget val), sedan varje sport. Raden
 * visar en miniatyr av bilden som gäller och lägets namn; en sport utan eget
 * val visar "Som Alla sporter" och den ärvda bilden. Raden öppnar väljaren:
 * glasmenyn på TV, ett bottenark på telefonen och en utfälld panel med
 * miniatyrer på skrivbordet.
 */

const SCOPES: BackdropScope[] = ['all', ...BACKDROP_SPORTS]
const TONES: SportCardTone[] = ['black', 'gray', 'image']
const TONE_LABEL: Record<SportCardTone, TvStringKey> = { black: 'sportCardsBlack', gray: 'sportCardsGray', image: 'sportCardsImage' }
/** TV-radens steg (fjärren har inget reglage). */
const OPACITY_STEPS = [0, 25, 50, 70, 85, 100]
const ACCEPT = 'image/jpeg,image/png,image/webp'

type ChoiceKey = SportBackdropMode | 'inherit' | 'replace' | 'remove'
interface Choice { key: ChoiceKey; label: string; thumb: string | null; active: boolean }
interface RowInfo { scope: BackdropScope; label: string; modeLabel: string; thumb: string | null }

function setScopeMode(current: SportBackdrops, scope: BackdropScope, mode: SportBackdropMode | 'inherit'): void {
  if (scope === 'all') {
    if (mode !== 'inherit') setSportSettings({ backdrops: { ...current, all: mode } })
    return
  }
  // "Som Alla sporter" sparas uttryckligen: en saknad nyckel betyder Standard för sporterna med egen bild.
  const sports = { ...current.sports, [scope]: mode }
  setSportSettings({ backdrops: { ...current, sports } })
}

function useUploader() {
  const { tt } = useTvText()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const slotRef = useRef<BackdropScope>('all')
  const [status, setStatus] = useState<string | null>(null)
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus(tt('sportBackdropUploading'))
    void uploadBackdrop(slotRef.current, file).then((r) => setStatus(r.ok ? null : tt('sportBackdropUploadFailed')))
  }
  const input = <input ref={inputRef} data-testid="sport-backdrop-file" type="file" accept={ACCEPT} onChange={onFile} style={{ display: 'none' }} />
  const pick = useCallback((slot: BackdropScope) => { slotRef.current = slot; inputRef.current?.click() }, [])
  return { input, pick, status }
}

/** Raderna och väljarens innehåll; samma för TV, telefon och skrivbord. */
function useBackdropModel() {
  const { tt } = useTvText()
  const s = useSportSettings()
  const uploads = useBackdropUploads()
  const day = localDayKey(Date.now())
  const scopeLabel = (k: BackdropScope) => (k === 'all' ? tt('sportBackdropAllSports') : tt(KIND_KEYS[k]))
  const modeLabel = (m: SportBackdropMode): string => {
    if (m.startsWith('image:')) return tt('sportBackdropPick', { name: tt(KIND_KEYS[m.slice(6) as (typeof BUNDLED_IMAGES)[number]]) })
    return tt(m === 'standard' ? 'sportBackdropStandard' : m === 'auto' ? 'sportBackdropAuto' : m === 'custom' ? 'sportBackdropCustom' : 'sportBackdropOff')
  }
  const rows: RowInfo[] = SCOPES.map((scope) => {
    const p = backdropPreview(s.backdrops, scope, uploads, day)
    return { scope, label: scopeLabel(scope), modeLabel: p.inherited ? tt('sportBackdropInherit') : modeLabel(p.mode), thumb: p.url }
  })
  const choicesFor = (scope: BackdropScope): Choice[] => {
    const own: ChoiceKey = scope === 'all' ? s.backdrops.all : s.backdrops.sports[scope] ?? 'inherit'
    const standard = standardImageFor(scope, day)
    const ownImage = scope === 'all' ? undefined : STANDARD_IMAGES[scope]
    const standardLabel = scope === 'all'
      ? tt('sportBackdropStandardPerSport')
      : ownImage ? tt('sportBackdropStandardOwn', { name: scopeLabel(scope) }) : tt('sportBackdropStandardDaily')
    const upload = uploads[scope]
    const uploadUrl = upload != null ? customBackdropUrl(scope, upload) : null
    const out: Choice[] = []
    if (scope !== 'all') {
      const { sports, ...rest } = s.backdrops
      const { [scope]: _drop, ...others } = sports
      out.push({ key: 'inherit', label: tt('sportBackdropInherit'), thumb: backdropPreview({ ...rest, sports: others }, scope, uploads, day).url, active: own === 'inherit' })
    }
    out.push({ key: 'standard', label: standardLabel, thumb: standard, active: own === 'standard' })
    for (const b of BUNDLED_IMAGES) out.push({ key: `image:${b}`, label: tt('sportBackdropPick', { name: tt(KIND_KEYS[b]) }), thumb: STANDARD_IMAGES[b], active: own === `image:${b}` })
    out.push({ key: 'auto', label: tt('sportBackdropAutoLong'), thumb: standard, active: own === 'auto' })
    out.push({ key: 'custom', label: tt('sportBackdropCustom'), thumb: uploadUrl, active: own === 'custom' })
    if (uploadUrl) {
      out.push({ key: 'replace', label: tt('sportBackdropReplace'), thumb: null, active: false })
      out.push({ key: 'remove', label: tt('sportBackdropRemove'), thumb: null, active: false })
    }
    out.push({ key: 'off', label: tt('sportBackdropOff'), thumb: null, active: own === 'off' })
    return out
  }
  /** Sparar valet; `wantsImage` = Egen bild utan bild än, eller Byt bild: fönstret ska be om en fil. */
  const apply = (scope: BackdropScope, key: ChoiceKey): { wantsImage: boolean } => {
    if (key === 'remove') { void removeBackdrop(scope); return { wantsImage: false } }
    if (key === 'replace') return { wantsImage: true }
    setScopeMode(s.backdrops, scope, key)
    return { wantsImage: key === 'custom' && uploads[scope] == null }
  }
  return { s, rows, choicesFor, apply }
}

function Thumb({ scope, url, w, h, radius }: { scope?: BackdropScope; url: string | null; w: number; h: number; radius: number }) {
  return (
    <span
      data-testid={scope ? `sport-backdrop-thumb-${scope}` : undefined}
      data-src={url ?? undefined}
      aria-hidden="true"
      style={{
        flex: 'none', display: 'inline-block', width: w, height: h, borderRadius: radius, boxSizing: 'border-box',
        background: url ? `center / cover no-repeat url("${url}")` : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    />
  )
}

/** Skrivbordets väljare: fälls ut under raden, med en miniatyr per val. */
function ChooserPanel({ choices, onPick }: { choices: Choice[]; onPick(key: ChoiceKey): void }) {
  return (
    <div data-testid="sport-backdrop-chooser" role="listbox" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, padding: '6px 0 12px' }}>
      {choices.map((c) => (
        <button
          key={c.key}
          type="button"
          role="option"
          aria-selected={c.active}
          data-testid={`sport-backdrop-opt-${c.key}`}
          onClick={() => onPick(c.key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: 6, borderRadius: 8, cursor: 'pointer', textAlign: 'left',
            fontFamily: 'inherit', fontSize: 12.5, color: c.key === 'remove' ? UI.danger : UI.text,
            background: c.active ? UI.accent900 : 'rgba(255,255,255,0.03)',
            borderWidth: 1, borderStyle: 'solid', borderColor: c.active ? UI.accent : 'transparent',
          }}
        >
          {c.key === 'replace' || c.key === 'remove' ? null : <Thumb url={c.thumb} w={56} h={32} radius={5} />}
          <span style={{ minWidth: 0 }}>{c.label}</span>
        </button>
      ))}
    </div>
  )
}

export function SportBackdropSettingsDesktop() {
  const { tt } = useTvText()
  const { s, rows, choicesFor, apply } = useBackdropModel()
  const uploader = useUploader()
  const [open, setOpen] = useState<BackdropScope | null>(null)
  const pick = (scope: BackdropScope, key: ChoiceKey) => {
    setOpen(null)
    if (apply(scope, key).wantsImage) uploader.pick(scope)
  }
  const rowStyle = (first: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 0', cursor: 'pointer', textAlign: 'left',
    background: 'transparent', border: 'none', borderTop: `1px solid ${first ? 'transparent' : UI.lineSoft}`, color: UI.text, fontFamily: 'inherit', fontSize: 13,
  })
  return (
    <div data-testid="sport-backdrop-settings">
      <LtSection title={tt('sportBackdropTitle')} hint={tt('sportBackdropHint')} />
      <LtRows>
        {uploader.input}
        {rows.map((r, i) => (
          <div key={r.scope}>
            <button type="button" data-testid={`sport-backdrop-row-${r.scope}`} aria-expanded={open === r.scope} onClick={() => setOpen(open === r.scope ? null : r.scope)} style={rowStyle(i === 0)}>
              <Thumb scope={r.scope} url={r.thumb} w={64} h={36} radius={6} />
              <span style={{ flex: 1, minWidth: 0, fontWeight: r.scope === 'all' ? 500 : 400 }}>{r.label}</span>
              <span style={{ color: UI.muted }}>{r.modeLabel}</span>
            </button>
            {open === r.scope ? <ChooserPanel choices={choicesFor(r.scope)} onPick={(k) => pick(r.scope, k)} /> : null}
          </div>
        ))}
        {uploader.status ? <LtNote style={{ paddingBottom: 10, fontSize: 13 }}>{uploader.status}</LtNote> : null}
        <LtNote style={{ paddingBottom: 12, fontSize: 13 }}>{tt('sportBackdropLocalNote')}</LtNote>
      </LtRows>
      <div style={{ height: 28 }} />
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

const noLayer = () => () => {}

/**
 * Inställningssidans rader: TV (glasmeny, bild från telefonen via QR),
 * telefon (bottenark, filväljare) och skrivbordet i nya designen (utfälld
 * panel, filväljare).
 */
export function SportBackdropSettingsTv({ phone = false, pushLayer }: { phone?: boolean; pushLayer?: (close: () => void) => () => void }) {
  const { tt } = useTvText()
  const tvMode = useTvMode()
  const { s, rows, choicesFor, apply } = useBackdropModel()
  const uploader = useUploader()
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const [sheet, setSheet] = useState<BackdropScope | null>(null)
  const [open, setOpen] = useState<BackdropScope | null>(null)
  const [qrSlot, setQrSlot] = useState<BackdropScope | null>(null)
  // TV-boxen har ingen filväljare: bilden kommer från telefonen. Telefonen och skrivbordet väljer en fil.
  const viaPhone = tvMode && !phone
  const handoff = useBackdropHandoff(viaPhone && qrSlot != null, qrSlot ?? 'all')
  const GlassMenu = getTvGlassMenu()
  const pick = (scope: BackdropScope, key: ChoiceKey) => {
    setOpen(null)
    const { wantsImage } = apply(scope, key)
    // På TV:n öppnar Egen bild alltid QR-koden (ingen fil att välja); annars bara när en bild behövs.
    if (viaPhone) {
      if (key === 'custom' || key === 'replace') { setQrSlot(scope); handoff.restart() } else setQrSlot(null)
    } else if (wantsImage) uploader.pick(scope)
  }
  const actions = (scope: BackdropScope): TvGlassMenuAction[] =>
    choicesFor(scope).map((c) => ({ key: c.key, label: c.active ? `${c.label} ✓` : c.label, run: () => pick(scope, c.key) }))
  const onRow = (scope: BackdropScope) => {
    if (phone) { setSheet(scope); return }
    if (tvMode && GlassMenu) {
      const element = document.querySelector<HTMLElement>(`[data-testid="sport-backdrop-row-${scope}"]`) ?? document.body
      const own = scope === 'all' ? s.backdrops.all : s.backdrops.sports[scope] ?? 'inherit'
      setMenu({ title: rows.find((r) => r.scope === scope)!.label, element, actions: actions(scope), initialKey: own } as TvGlassMenuTarget)
      return
    }
    setOpen(open === scope ? null : scope)
  }
  const thumbSize = phone ? { w: 48, h: 27, radius: 5 } : { w: dp(80), h: dp(45), radius: dp(6) }
  /** Hjälptexterna i samma storlek som avsnittens beskrivningar (`HINT_SIZE` i settings-tabs). */
  const note = { fontSize: phone ? HINT_SIZE_PHONE : HINT_SIZE, color: phone ? MT.dim : 'rgba(243,244,248,0.6)', padding: phone ? '6px 14px' : 0 }
  const nextOpacity = OPACITY_STEPS.find((n) => n > s.cards.opacity) ?? OPACITY_STEPS[0]!
  const nextTone = TONES[(TONES.indexOf(s.cards.tone) + 1) % TONES.length]!
  const sheetRow = sheet ? rows.find((r) => r.scope === sheet) : null
  return (
    // Två sektioner med samma luft som Live TV:s övriga inställningar (innehållets gap 36, sektionens 10).
    <div data-testid="sport-backdrop-settings-tv" style={{ display: 'flex', flexDirection: 'column', gap: phone ? 18 : dp(36) }}>
      <section data-testid="sport-backdrop-section" style={{ display: 'flex', flexDirection: 'column', gap: phone ? 0 : dp(10) }}>
      <Heading phone={phone} hint={tt('sportBackdropHint')}>{tt('sportBackdropTitle')}</Heading>
      {viaPhone ? null : uploader.input}
      {rows.map((r) => (
        <div key={r.scope}>
          <Row
            phone={phone}
            testId={`sport-backdrop-row-${r.scope}`}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: phone ? 12 : dp(16) }}><Thumb scope={r.scope} url={r.thumb} {...thumbSize} />{r.label}</span>}
            right={r.modeLabel}
            onOk={() => onRow(r.scope)}
          />
          {open === r.scope ? <ChooserPanel choices={choicesFor(r.scope)} onPick={(k) => pick(r.scope, k)} /> : null}
        </div>
      ))}
      {viaPhone && qrSlot ? (
        <figure data-testid="sport-backdrop-handoff" style={{ margin: 0, display: 'flex', gap: dp(20), alignItems: 'center', padding: `${dp(8)}px 0` }}>
          {handoff.url && !handoff.received ? <div data-testid="sport-backdrop-qr" style={{ background: '#fff', padding: dp(8), borderRadius: dp(8) }}><QRCodeSVG value={handoff.url} size={dp(132)} /></div> : null}
          <figcaption style={{ fontSize: dp(16), color: TV.dim, maxWidth: dp(360) }}>
            {handoff.received ? tt('sportBackdropReceived') : handoff.expired ? tt('sportKeyExpired') : `${rows.find((r) => r.scope === qrSlot)!.label}: ${tt('sportBackdropPhoneHint')}`}
          </figcaption>
        </figure>
      ) : null}
      {uploader.status ? <div role="status" style={note}>{uploader.status}</div> : null}
      <div data-testid="sport-backdrop-note" style={note}>{tt('sportBackdropLocalNote')}</div>
      </section>
      <section data-testid="sport-cards-section" style={{ display: 'flex', flexDirection: 'column', gap: phone ? 0 : dp(10) }}>
      <Heading phone={phone} hint={tt('sportCardsHint')}>{tt('sportCardsTitle')}</Heading>
      <Row phone={phone} testId="sport-cards-opacity-row" label={tt('sportCardsOpacity')} right={`${s.cards.opacity} %`} onOk={() => setSportSettings({ cards: { ...s.cards, opacity: nextOpacity } })} />
      <Row phone={phone} testId="sport-cards-tone-row" label={tt('sportCardsColor')} right={tt(TONE_LABEL[s.cards.tone])} onOk={() => setSportSettings({ cards: { ...s.cards, tone: nextTone } })} />
      </section>
      {menu && GlassMenu ? <GlassMenu target={menu} onClose={() => setMenu(null)} /> : null}
      {sheetRow ? (
        <MobileSheet
          testId="sport-backdrop-sheet"
          title={sheetRow.label}
          subtitle={sheetRow.modeLabel}
          art={<Thumb url={sheetRow.thumb} w={56} h={32} radius={6} />}
          items={actions(sheetRow.scope)}
          onClose={() => setSheet(null)}
          pushLayer={pushLayer ?? noLayer}
        />
      ) : null}
    </div>
  )
}
