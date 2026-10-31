'use client'

import { useEffect, useState } from 'react'
import { getTvGlassMenu, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { Action, Heading, Row } from './settings-tabs'
import { PickerPanel } from './picker-panel'
import { TV, dp } from './tv-ui'
import type { TvNav } from './tv-shell'
import type { TvStringKey } from './tv-strings'
import { setTvSettings } from './tv-settings-store'
import {
  DEFAULT_REMOTE_BINDINGS, DPAD_REMOTE_KEYS, MEDIA_REMOTE_KEYS, PRESET_REMOTE_KEYS, REMOTE_ACTIONS, addLearnedKey, isReservedRemoteKey,
  remoteKeyId, removeLearnedKey, setRemoteBinding, type RemoteAction, type RemoteBinding,
} from './remote-keys'

type TT = (key: TvStringKey, vars?: Record<string, string | number>) => string

const KEY_LABEL: Record<string, TvStringKey> = {
  ColorF0Red: 'keyRed', ColorF1Green: 'keyGreen', ColorF2Yellow: 'keyYellow', ColorF3Blue: 'keyBlue',
  Info: 'keyInfo', Guide: 'keyGuide', ContextMenu: 'keyMenu', MediaLast: 'keyLast',
  'media:rewind': 'keyRewind', 'media:fastforward': 'keyFastForward', 'media:next': 'keyNext', 'media:previous': 'keyPrevious',
  ArrowLeft: 'keyLeft', ArrowRight: 'keyRight', ArrowUp: 'keyUp', ArrowDown: 'keyDown',
}
const KEY_DOT: Record<string, string> = { ColorF0Red: '#e5484d', ColorF1Green: '#30a46c', ColorF2Yellow: '#f5d90a', ColorF3Blue: '#3e63dd' }

export const REMOTE_ACTION_LABEL: Record<Exclude<RemoteAction, 'none'>, TvStringKey> = {
  lastChannel: 'actLastChannel', guide: 'actGuide', miniGuide: 'actMiniGuide', menu: 'actMenu', info: 'actInfo', favourite: 'actFavourite',
  multiview: 'actMultiview', playPause: 'actPlayPause', channelUp: 'actChannelUp', channelDown: 'actChannelDown', search: 'actSearch',
  favourites: 'actFavourites', sport: 'actSport', home: 'actHome',
}

export const remoteKeyLabel = (key: string, tt: TT): string => (KEY_LABEL[key] ? tt(KEY_LABEL[key]) : tt('remoteLearned', { id: key.replace(/^code:/, '#') }))
const actionLabel = (action: RemoteAction, tt: TT): string => (action === 'none' ? tt('remoteNotSet') : tt(REMOTE_ACTION_LABEL[action]))

/**
 * FJÄRRKONTROLL-FLIKEN (Jerry 2026-10-31). En rad per knapp med kort tryck och
 * håll; OK öppnar glasmenyn (Tryck… / Håll… / Ta bort), och valet av åtgärd är
 * en andra glasmeny med en bock på det som gäller. "Lägg till en knapp" väntar
 * på nästa knapptryck i en panel — det är så okända fjärrar får sina knappar.
 */
export function RemoteTab({ bindings, nav, tt }: { bindings: RemoteBinding[]; nav: Pick<TvNav, 'pushLayer' | 'toast'>; tt: TT }) {
  const GlassMenu = getTvGlassMenu()
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const [learning, setLearning] = useState(false)
  const save = (next: RemoteBinding[]) => setTvSettings({ remoteKeys: next })
  const rowEl = (key: string) => document.querySelector<HTMLElement>(`[data-testid="remote-key-${CSS.escape(key)}"]`)

  const pickAction = (b: RemoteBinding, slot: 'short' | 'long', element: HTMLElement) => {
    setMenu({
      title: `${remoteKeyLabel(b.key, tt)} · ${slot === 'short' ? tt('remotePress') : tt('remoteHold')}`,
      element,
      actions: REMOTE_ACTIONS.map((a) => ({
        key: a,
        label: `${b[slot] === a ? '✓ ' : ''}${actionLabel(a, tt)}`,
        run: () => save(setRemoteBinding(bindings, b.key, slot, a)),
      })),
    })
  }
  const open = (b: RemoteBinding, element: HTMLElement) => {
    const dpad = DPAD_REMOTE_KEYS.includes(b.key)
    const media = MEDIA_REMOTE_KEYS.includes(b.key)
    const actions = [
      ...(dpad ? [] : [{ key: 'short', label: `${tt('remotePress')}: ${actionLabel(b.short, tt)}`, run: () => window.setTimeout(() => pickAction(b, 'short', element), 0) }]),
      ...(media ? [] : [{ key: 'long', label: `${tt('remoteHold')}: ${actionLabel(b.long, tt)}`, run: () => window.setTimeout(() => pickAction(b, 'long', element), 0) }]),
      ...(PRESET_REMOTE_KEYS.includes(b.key) ? [] : [{ key: 'remove', label: tt('remoteRemove'), run: () => save(removeLearnedKey(bindings, b.key)) }]),
    ]
    // En knapp med bara ett val (pilar, mediaknappar) går direkt till åtgärderna.
    if (actions.length === 1 && actions[0]!.key !== 'remove') pickAction(b, actions[0]!.key as 'short' | 'long', element)
    else setMenu({ title: remoteKeyLabel(b.key, tt), element, actions })
  }

  const summary = (b: RemoteBinding) => {
    const parts: string[] = []
    if (!DPAD_REMOTE_KEYS.includes(b.key)) parts.push(actionLabel(b.short, tt))
    if (!MEDIA_REMOTE_KEYS.includes(b.key) && (b.long !== 'none' || DPAD_REMOTE_KEYS.includes(b.key))) parts.push(`${tt('remoteHold')}: ${actionLabel(b.long, tt)}`)
    return parts.join(' · ')
  }

  const learned = (key: string) => {
    setLearning(false)
    const next = addLearnedKey(bindings, key)
    save(next)
    nav.toast(tt('remoteAdded'))
    const b = next.find((x) => x.key === key)
    // Raden finns först efter nästa rendering.
    window.setTimeout(() => { const el = rowEl(key); if (b && el) { el.focus({ preventScroll: false }); pickAction(b, 'short', el) } }, 60)
  }

  return (
    <section data-testid="remote-settings" style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading hint={tt('remoteHint')}>{tt('remoteHeading')}</Heading>
      {bindings.map((b) => (
        <Row
          key={b.key}
          testId={`remote-key-${b.key}`}
          label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: dp(12) }}>{KEY_DOT[b.key] ? <span style={{ width: dp(18), height: dp(18), borderRadius: 999, background: KEY_DOT[b.key] }} /> : null}{remoteKeyLabel(b.key, tt)}</span>}
          right={<span style={{ color: b.short === 'none' && b.long === 'none' ? TV.muted : TV.text }}>{summary(b)}</span>}
          onOk={() => { const el = rowEl(b.key); if (el) open(b, el) }}
        />
      ))}
      <Row testId="remote-add" label={tt('remoteAdd')} right="+" onOk={() => setLearning(true)} />
      <div style={{ display: 'flex', gap: dp(12), paddingTop: dp(6) }}>
        <Action testId="remote-reset" label={tt('remoteReset')} onOk={() => save(DEFAULT_REMOTE_BINDINGS)} />
      </div>
      {learning ? <LearnPanel nav={nav} tt={tt} onKey={learned} onClose={() => setLearning(false)} /> : null}
      {menu && GlassMenu ? <GlassMenu target={menu} onClose={() => setMenu(null)} /> : null}
    </section>
  )
}

const BACK = new Set(['Escape', 'Backspace', 'GoBack'])
const NAV = new Set(['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'])

/** Väntar på nästa knapp. Bakåt stänger panelen; pilar och OK navigerar i den som vanligt. */
function LearnPanel({ nav, tt, onKey, onClose }: { nav: Pick<TvNav, 'pushLayer'>; tt: TT; onKey: (key: string) => void; onClose: () => void }) {
  const [reserved, setReserved] = useState(false)
  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (BACK.has(event.key) || NAV.has(event.key)) return
      const id = remoteKeyId(event)
      if (!id) return
      event.preventDefault()
      event.stopImmediatePropagation()
      // En knapp som redan har en rad: stäng och ställ fokus på den raden.
      if (PRESET_REMOTE_KEYS.includes(id)) {
        onClose()
        window.setTimeout(() => document.querySelector<HTMLElement>(`[data-testid="remote-key-${CSS.escape(id)}"]`)?.focus(), 60)
        return
      }
      if (isReservedRemoteKey(id)) { setReserved(true); return }
      onKey(id)
    }
    window.addEventListener('keydown', onDown, true)
    return () => window.removeEventListener('keydown', onDown, true)
  }, [onKey, onClose])
  return (
    <PickerPanel
      nav={nav}
      title={tt('remoteAdd')}
      testId="remote-learn"
      chips={null}
      opener={document.querySelector<HTMLElement>('[data-testid="remote-add"]')}
      onClose={onClose}
      rows={(close) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: dp(20), padding: `${dp(8)}px 0` }}>
          <div style={{ fontSize: dp(22), lineHeight: 1.4 }}>{tt('remoteAddHint')}</div>
          {reserved ? <div data-testid="remote-learn-reserved" style={{ fontSize: dp(19), color: TV.muted }}>{tt('remoteAddReserved')}</div> : null}
          <div><Action testId="remote-learn-cancel" label={tt('cancel')} onOk={close} /></div>
        </div>
      )}
    />
  )
}
