import type { ReactNode } from 'react'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { TV } from '../tv-ui'
import { MT, ellipsis } from './mobile-tokens'
import { MIcons } from './mobile-icons'

/**
 * Sidhuvudet i telefongrenen. Knapparna (X respektive Bakåt) läggs FÖRE
 * titeln och delar rad med den. Sidluften är sidans vanliga `PAD` — se noten
 * vid `padding` nedan om varför värdens menychip inte reserveras plats här.
 */
export function MobileHeader({ title, right, back, onBack, close, onClose, testId }: {
  title: ReactNode
  right?: ReactNode
  back?: boolean
  onBack?: () => void
  /**
   * Stäng-knapp i stället för Bakåt: en rund glasknapp med kryss, till vänster
   * om titeln. Startsidan har ingen nivå att gå tillbaka TILL inom pluginet —
   * den enda vägen ut var värdens meny, och på telefonen syntes inte att Live
   * TV är en egen sida man kan lämna (Jerry 2026-09-20: "ha en rund glass X
   * till vänster om loggan som stänger live TV-appen").
   */
  close?: boolean
  onClose?: () => void
  testId?: string
}) {
  const { tt } = useTvText()
  return (
    <div
      data-testid={testId}
      style={{
        // Höjden är innehållets 52 px PLUS systemradens inset: `height` ensamt
        // hade lagt rubriken under kamerahålet (se MT.SAFE_TOP_GUARD).
        minHeight: `calc(${MT.HEADER_H}px + ${MT.SAFE_TOP_GUARD})`,
        flexShrink: 0,
        /* INGET VÄNSTERINDRAG PÅ TELEFON.

           HEADER_LEFT (60 px) reserverade plats åt VÄRDENS menychip. Men
           chipet är dolt på Live TV-sidorna (Jerry 2026-09-22), så platsen
           hölls tom åt något som aldrig kommer — och både startsidans runda X
           och undersidornas bakåtpil såg ut att ligga med en obefogad
           marginal. Sidhuvudet använder nu samma sidluft som allt annat
           innehåll, så knappen står i linje med raderna under den. */
        padding: `${MT.SAFE_TOP_GUARD} ${MT.PAD}px 0 ${MT.PAD}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {close ? (
        <div
          {...station(onClose ?? (() => {}), undefined, { 'aria-label': tt('closeLiveTv'), 'data-testid': 'header-close' })}
          style={{ width: 40, height: 40, minHeight: 40, borderRadius: 999, background: TV.glass, border: `1px solid ${MT.line14}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
        >
          <MIcons.X />
        </div>
      ) : null}
      {back ? (
        <div
          {...station(onBack ?? (() => {}), undefined, { 'aria-label': tt('back'), 'data-testid': 'header-back' })}
          style={{ width: 40, height: 40, minHeight: 40, borderRadius: 999, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
        >
          <MIcons.CaretLeft />
        </div>
      ) : null}
      <div style={{ flex: 1, fontSize: 21, fontWeight: 600, ...ellipsis }}>{title}</div>
      {right ? <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div> : null}
    </div>
  )
}
