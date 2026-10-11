'use client'

import { useEffect, useMemo, useReducer, useState } from 'react'
import { LtBtn, LtConfirm, LtNote, LtRows, LtSection } from '../settings-ui'
import { Heading, Row } from '../tv/settings-tabs'
import { useTvText } from '../tv/tv-strings'
import { KeyCard } from './key-card'
import { removeKey } from './key-flow'
import { ORDER_SPORTS, SPORT_NAME_KEY, keyRowText, keyRows, moveProvider, orderRows } from './key-model'
import { PROVIDER_IDS, PROVIDER_LABEL } from './providers'
import { rateLine } from './rate-line'
import { useResultsController } from './results-controller'
import { currentRouter, type SportRouter } from './router'
import { hasAnyKey, setSportOrder, useSportSettings, type SportSettings } from './sport-store'
import type { ProviderId } from './provider'
import type { SportKind } from './sport-model'

/*
  "Resultat och tabeller" i inställningarna (skrivbordskortet, TV-raderna och
  telefonraderna). Nycklar: en rad per källa med status, dagens kvot och
  Lägg till / Byt / Ta bort — EN nyckel per källa (en ny ersätter den gamla).
  Källa per sport: sportens ordning med flytta upp/ned. Kvoten läses ur värdens
  kvotbok (lokalt, kostar inga anrop).
*/

function useQuotaText(): string | null {
  const { tt, lang, locale } = useTvText()
  const controller = useResultsController()
  return controller ? rateLine(controller.status(), tt, { lang, locale })?.text ?? null : null
}

/** Routern för nycklarna, med dagens kvot ur värdens bok. Ritar om när en källas kvot ändras. */
function useRouterView(s: SportSettings): SportRouter | null {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- routern byts när nycklar eller ordning byts
  const router = useMemo(() => currentRouter(), [s.keys, s.order])
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

function move(s: SportSettings, sport: SportKind, id: ProviderId, dir: -1 | 1): void {
  setSportOrder(sport, moveProvider(orderRows(s, sport).map((r) => r.id), id, dir))
}

const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', flexWrap: 'wrap' } as const

export function SportKeySettingsDesktop() {
  const { tt, locale } = useTvText()
  const s = useSportSettings()
  const quota = useQuotaText()
  const rows = useKeyRows(s)
  const [editing, setEditing] = useState<ProviderId | null>(null)
  const [confirm, setConfirm] = useState<ProviderId | null>(null)
  return (
    <div data-testid="sport-key-settings">
      <LtSection eyebrow={tt('tabSport')} title={tt('sportSettingsTitle')} />
      {editing ? <KeyCard variant="settings" provider={editing} onDone={() => setEditing(null)} />
        : !hasAnyKey(s) ? <KeyCard variant="settings" /> : null}
      <LtSection title={tt('sportKeysTitle')} hint={tt('sportKeysHint')} />
      <LtRows>
        {rows.map((r) => (
          <div key={r.id} data-testid={`sport-key-row-${r.id}`} style={rowStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 13, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{keyRowText(r, tt, { locale })}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {r.state === 'none'
                ? <LtBtn testId={`sport-key-add-${r.id}`} onClick={() => setEditing(r.id)}>{tt('sportKeyAdd')}</LtBtn>
                : <>
                  <LtBtn testId={`sport-key-change-${r.id}`} onClick={() => setEditing(r.id)}>{tt('sportKeyChange')}</LtBtn>
                  <LtBtn testId={`sport-key-remove-${r.id}`} variant="danger" onClick={() => setConfirm(r.id)}>{tt('sportKeyRemove')}</LtBtn>
                </>}
            </div>
          </div>
        ))}
        {quota ? <LtNote>{quota}</LtNote> : null}
      </LtRows>
      <LtSection title={tt('sportOrderTitle')} hint={tt('sportOrderHint')} />
      <LtRows>
        {ORDER_SPORTS.map((sport) => {
          const order = orderRows(s, sport)
          if (order.length === 0) return null
          return (
            <div key={sport} data-testid={`sport-order-${sport}`} style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{tt(SPORT_NAME_KEY[sport]!)}</div>
              {order.map((o, i) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, opacity: o.hasKey ? 1 : 0.5 }}>{`${i + 1}. ${o.label}`}{o.hasKey ? '' : ` (${tt('sportOrderNoKey')})`}</span>
                  <LtBtn testId={`sport-order-up-${sport}-${o.id}`} title={tt('sportOrderUp')} disabled={i === 0} onClick={() => move(s, sport, o.id, -1)}>↑</LtBtn>
                  <LtBtn testId={`sport-order-down-${sport}-${o.id}`} title={tt('sportOrderDown')} disabled={i === order.length - 1} onClick={() => move(s, sport, o.id, 1)}>↓</LtBtn>
                </div>
              ))}
            </div>
          )
        })}
      </LtRows>
      {confirm ? (
        <LtConfirm title={`${tt('sportKeyRemove')} · ${PROVIDER_LABEL[confirm]}`} body={tt('sportKeyRemoveBody')} confirmLabel={tt('sportKeyRemove')} cancelLabel={tt('sportCancel')}
          onCancel={() => setConfirm(null)} onConfirm={() => { removeKey(confirm); setConfirm(null) }} />
      ) : null}
    </div>
  )
}

/** TV-raderna, och telefonens rader (`phone`). Nyckeln skrivs in via telefonens QR på TV (nyckelkortet). */
export function SportKeySettingsTv({ phone = false }: { phone?: boolean }) {
  const { tt, locale } = useTvText()
  const s = useSportSettings()
  const quota = useQuotaText()
  const rows = useKeyRows(s)
  const [editing, setEditing] = useState<ProviderId | null>(null)
  if (editing) {
    return (
      <div data-testid="sport-key-settings-tv">
        <KeyCard variant="settings" provider={editing} onDone={() => setEditing(null)} />
        <Row phone={phone} testId="sport-key-cancel" label={tt('sportCancel')} right="" onOk={() => setEditing(null)} />
      </div>
    )
  }
  if (!hasAnyKey(s)) return <KeyCard variant="settings" />
  return (
    <div data-testid="sport-key-settings-tv">
      <Heading phone={phone} hint={quota ?? undefined}>{tt('sportSettingsTitle')}</Heading>
      <Heading phone={phone} hint={tt('sportKeysHint')}>{tt('sportKeysTitle')}</Heading>
      {rows.map((r) => (
        <Row key={r.id} phone={phone} testId={`sport-key-${r.id}`} label={r.label} right={keyRowText(r, tt, { locale })} onOk={() => setEditing(r.id)} />
      ))}
      {rows.filter((r) => r.state !== 'none').map((r) => (
        <Row key={`rm-${r.id}`} phone={phone} testId={`sport-key-remove-${r.id}`} label={`${tt('sportKeyRemove')} · ${r.label}`} right="" onOk={() => removeKey(r.id)} />
      ))}
      <Heading phone={phone} hint={tt('sportOrderHint')}>{tt('sportOrderTitle')}</Heading>
      {ORDER_SPORTS.flatMap((sport) => {
        const order = orderRows(s, sport)
        // Fjärrkontrollen: OK flyttar källan ett steg upp (den första flyttas ned).
        return order.map((o, i) => (
          <Row key={`${sport}-${o.id}`} phone={phone} testId={`sport-order-${sport}-${o.id}`}
            label={`${tt(SPORT_NAME_KEY[sport]!)} · ${i + 1}. ${o.label}${o.hasKey ? '' : ` (${tt('sportOrderNoKey')})`}`}
            right={order.length > 1 ? tt(i === 0 ? 'sportOrderDown' : 'sportOrderUp') : ''}
            onOk={() => { if (order.length > 1) move(s, sport, o.id, i === 0 ? 1 : -1) }} />
        ))
      })}
    </div>
  )
}
