'use client'

import { useEffect, useMemo, useReducer, useState, type CSSProperties, type ReactNode } from 'react'
import { LtBtn, LtConfirm, LtNote, LtSection, UI } from '../settings-ui'
import { Action, HINT_SIZE, HINT_SIZE_PHONE, Heading } from '../tv/settings-tabs'
import { MT } from '../tv/mobile/mobile-tokens'
import { TV, dp, station } from '../tv/tv-ui'
import { useTvText } from '../tv/tv-strings'
import { KeyCard } from './key-card'
import { removeKey } from './key-flow'
import { PROVIDER_BLURB_KEY, keyQuotaDetail, keyRows, keyStatus, type KeyRow, type KeyTone } from './key-model'
import { PROVIDER_IDS, PROVIDER_LABEL } from './providers'
import { rateLine } from './rate-line'
import { useResultsController } from './results-controller'
import { currentRouter, type SportRouter } from './router'
import { hasAnyKey, useSportSettings, type SportSettings } from './sport-store'
import type { ProviderId } from './provider'

/*
  "Resultat och tabeller" i inställningarna (skrivbordskortet, TV-raderna och
  telefonraderna), omgjort 2026-10-11 (Jerry: "förvirrande", "glöm inte luft
  mellan rader och text").

  Nycklar: ETT KORT PER KÄLLA — namn, en rad om täckning och gräns och ett
  statuspiller, inget mer. Kortet öppnar källans nyckelredigerare (klistra
  in / telefonens QR på TV) som visar nuvarande nyckel och har Ta bort
  nyckel. Inga separata Ta bort-rader.

  Källa per sport finns inte längre (Jerry: "sköts automatiskt, det räcker"):
  standardordningen gäller och routern faller igenom till nästa källa med
  nyckel när kvoten tar slut.
*/

function useQuotaText(): string | null {
  const { tt, lang, locale } = useTvText()
  const controller = useResultsController()
  return controller ? rateLine(controller.status(), tt, { lang, locale })?.text ?? null : null
}

/** Routern för nycklarna, med dagens kvot ur värdens bok. Ritar om när en källas kvot ändras. */
function useRouterView(s: SportSettings): SportRouter | null {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- routern byts när nycklarna byts
  const router = useMemo(() => currentRouter(), [s.keys])
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!router) return
    const off = router.subscribe(bump)
    for (const id of PROVIDER_IDS) void router.budget(id)?.loadLedger()
    return off
  }, [router])
  return router
}

function useKeyRows(s: SportSettings) {
  const router = useRouterView(s)
  return keyRows(s, (id) => router?.budget(id) ?? null, Date.now())
}

const TONE: Record<KeyTone, { fg: string; bg: string }> = {
  ok: { fg: '#3cd6a3', bg: 'rgba(60,214,163,0.14)' },
  none: { fg: 'rgba(243,244,248,0.7)', bg: 'rgba(252,252,255,0.10)' },
  warn: { fg: '#f5c26b', bg: 'rgba(245,194,107,0.14)' },
  bad: { fg: '#e0776a', bg: 'rgba(224,119,106,0.16)' },
}

type Size = 'tv' | 'phone' | 'desktop'

function Pill({ tone, children, size, testId }: { tone: KeyTone; children: ReactNode; size: Size; testId?: string }) {
  const fs = size === 'tv' ? dp(16) : size === 'phone' ? 12.5 : 12
  const pad = size === 'tv' ? `${dp(5)}px ${dp(12)}px` : '3px 9px'
  return <span data-testid={testId} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: pad, fontSize: fs, fontWeight: 500, lineHeight: 1.3, color: TONE[tone].fg, background: TONE[tone].bg, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{children}</span>
}

/** Kortets innehåll: namn, statuspiller och en rad om täckning och gräns — inget mer. */
function KeyCardBody({ r, size }: { r: KeyRow; size: Size }) {
  const { tt, locale } = useTvText()
  const status = keyStatus(r, tt, { locale })
  const m = size === 'tv'
    ? { title: dp(22), text: HINT_SIZE, gap: dp(10), muted: 'rgba(243,244,248,0.62)' }
    : size === 'phone'
      ? { title: 15, text: HINT_SIZE_PHONE, gap: 6, muted: MT.muted }
      : { title: 14, text: 12.5, gap: 8, muted: UI.muted }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: m.gap, minWidth: 0, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: m.gap * 1.5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: m.title, fontWeight: 600, lineHeight: 1.3 }}>{r.label}</span>
        <Pill tone={status.tone} size={size} testId={`sport-key-status-${r.id}`}>{status.text}</Pill>
      </div>
      <div style={{ fontSize: m.text, lineHeight: 1.45, color: m.muted, overflowWrap: 'anywhere' }}>{tt(PROVIDER_BLURB_KEY[r.id])}</div>
    </div>
  )
}

/** Redigeraren för en källa: nyckelkortet (klistra in / telefonens QR), nuvarande nyckel och Ta bort nyckel. */
function Editor({ r, onClose, onRemove, pushLayer, children }: { r: KeyRow; onClose: () => void; onRemove: () => void; pushLayer?: (close: () => void) => () => void; children?: ReactNode }) {
  const { tt, locale } = useTvText()
  const current = r.masked ? { masked: r.masked, detail: keyQuotaDetail(r, tt, locale) } : undefined
  return (
    <>
      <KeyCard variant="settings" provider={r.id} current={current} onRemove={current ? onRemove : undefined} onDone={onClose} pushLayer={pushLayer} />
      {children}
    </>
  )
}

/* ------------------------------------------------------------------ skrivbord */

export function SportKeySettingsDesktop({ bare = false }: { bare?: boolean } = {}) {
  const { tt } = useTvText()
  const s = useSportSettings()
  const quota = useQuotaText()
  const rows = useKeyRows(s)
  const [editing, setEditing] = useState<ProviderId | null>(null)
  const [confirm, setConfirm] = useState<ProviderId | null>(null)
  const editRow = editing ? rows.find((r) => r.id === editing) ?? null : null
  const card = (active: boolean): CSSProperties => ({
    borderRadius: 10, background: active ? 'rgba(255,255,255,0.07)' : UI.card, padding: '16px 18px', color: UI.text, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${active ? UI.lineBox : 'transparent'}`, display: 'block', width: '100%',
  })
  return (
    <div data-testid="sport-key-settings" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {bare ? null : <LtSection eyebrow={tt('tabSport')} title={tt('sportSettingsTitle')} />}
      {!hasAnyKey(s) && !editRow ? <KeyCard variant="settings" /> : null}
      <section data-testid="sport-keys-section" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <LtSection title={tt('sportKeysTitle')} hint={tt('sportKeysHint')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {rows.map((r) => (
            <button key={r.id} type="button" data-testid={`sport-key-row-${r.id}`} aria-expanded={editing === r.id}
              onClick={() => setEditing(editing === r.id ? null : r.id)} style={card(editing === r.id)}>
              <KeyCardBody r={r} size="desktop" />
            </button>
          ))}
        </div>
        {editRow ? (
          <Editor r={editRow} onClose={() => setEditing(null)} onRemove={() => setConfirm(editRow.id)}>
            <div><LtBtn testId="sport-key-close" onClick={() => setEditing(null)}>{tt('sportCancel')}</LtBtn></div>
          </Editor>
        ) : null}
        {quota ? <LtNote>{quota}</LtNote> : null}
      </section>
      {confirm ? (
        <LtConfirm title={`${tt('sportKeyRemove')} · ${PROVIDER_LABEL[confirm]}`} body={tt('sportKeyRemoveBody')} confirmLabel={tt('sportKeyRemove')} cancelLabel={tt('sportCancel')}
          testId="sport-key-remove-confirm" onCancel={() => setConfirm(null)} onConfirm={() => { removeKey(confirm); setConfirm(null); setEditing(null) }} />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ TV och telefon */

/** TV-raderna, och telefonens rader (`phone`). OK på en källa öppnar dess nyckelredigerare (telefonens QR på TV). */
export function SportKeySettingsTv({ phone = false, pushLayer }: { phone?: boolean; pushLayer?: (close: () => void) => () => void }) {
  const { tt } = useTvText()
  const s = useSportSettings()
  const quota = useQuotaText()
  const rows = useKeyRows(s)
  const [editing, setEditing] = useState<ProviderId | null>(null)
  const [confirm, setConfirm] = useState<ProviderId | null>(null)
  const editRow = editing ? rows.find((r) => r.id === editing) ?? null : null

  if (editRow) {
    // TV: Ta bort direkt (fjärrkontrollen har redan valt källan och knappen). Telefonen: bekräftelse.
    const remove = () => { if (phone) setConfirm(editRow.id); else { removeKey(editRow.id); setEditing(null) } }
    return (
      <div data-testid="sport-key-settings-tv" style={{ display: 'flex', flexDirection: 'column', gap: phone ? 12 : dp(16), padding: phone ? 14 : 0 }}>
        <Editor r={editRow} onClose={() => setEditing(null)} onRemove={remove} pushLayer={pushLayer}>
          <div><Action phone={phone} testId="sport-key-cancel" label={tt('sportCancel')} onOk={() => setEditing(null)} /></div>
        </Editor>
        {confirm ? (
          <LtConfirm title={`${tt('sportKeyRemove')} · ${PROVIDER_LABEL[confirm]}`} body={tt('sportKeyRemoveBody')} confirmLabel={tt('sportKeyRemove')} cancelLabel={tt('sportCancel')}
            testId="sport-key-remove-confirm" onCancel={() => setConfirm(null)} onConfirm={() => { removeKey(confirm); setConfirm(null); setEditing(null) }} />
        ) : null}
      </div>
    )
  }
  if (!hasAnyKey(s)) return <KeyCard variant="settings" pushLayer={pushLayer} />

  return (
    // Samma luft som Live TV:s övriga inställningar: rubriken med beskrivning, luft, sedan korten med luft emellan.
    <section data-testid="sport-key-settings-tv" style={{ display: 'flex', flexDirection: 'column', gap: phone ? 10 : dp(14), paddingBottom: phone ? 14 : 0 }}>
      <div style={{ marginBottom: phone ? 2 : dp(8) }}>
        <Heading phone={phone} hint={tt('sportKeysHint')}>{tt('sportKeysTitle')}</Heading>
      </div>
      {rows.map((r) => (
        <div key={r.id} data-testid={`sport-key-${r.id}`} {...station(() => setEditing(r.id))}
          style={phone
            ? { margin: '0 14px', borderRadius: 12, background: MT.s06, padding: '14px 16px', cursor: 'pointer' }
            : { borderRadius: dp(14), background: TV.s06, padding: `${dp(20)}px ${dp(24)}px`, cursor: 'pointer' }}>
          <KeyCardBody r={r} size={phone ? 'phone' : 'tv'} />
        </div>
      ))}
      {quota ? <div style={{ fontSize: phone ? HINT_SIZE_PHONE : HINT_SIZE, lineHeight: 1.45, color: phone ? MT.dim : 'rgba(243,244,248,0.6)', padding: phone ? '2px 14px 0' : `${dp(4)}px 0 0` }}>{quota}</div> : null}
    </section>
  )
}
