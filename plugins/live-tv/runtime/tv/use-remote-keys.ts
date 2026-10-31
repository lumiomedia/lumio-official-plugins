'use client'

import { useEffect, type RefObject } from 'react'
import { TV_HOLD_MS } from '@/lib/plugin-sdk'
import { DPAD_REMOTE_KEYS, MEDIA_REMOTE_KEYS, createRemoteHold, remoteKeyId, type RemoteAction, type RemoteBinding } from './remote-keys'

/**
 * Spelarens åtgärder (minigiude, meny, favorit, paus, kanal upp/ner) bor i
 * TV-kromet. Skalet frågar först kromet med den här händelsen; kromet svarar
 * med `preventDefault()` när det tog åtgärden. Annars kör skalet sin egen
 * version (guide, sök, multivy, senaste kanal …).
 */
export const REMOTE_ACTION_EVENT = 'lt-remote-action'
/** Spelarens mediaknappar (spola, nästa, föregående) lämnas till skalets mappning. */
export const REMOTE_MEDIA_EVENT = 'lt-remote-media'

export function dispatchRemoteAction(action: RemoteAction): boolean {
  const event = new CustomEvent(REMOTE_ACTION_EVENT, { detail: { action }, cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

/** Från spelarens `lumio-media-key`: `true` när skalets mappning tog knappen. */
export function deferMediaKeyToRemote(action: string): boolean {
  const event = new CustomEvent(REMOTE_MEDIA_EVENT, { detail: { action }, cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

export interface RemoteKeysState {
  bindings: RemoteBinding[]
  playerOpen: boolean
  /** Skalets lager, glasmeny, PIN-grind eller textfält: då rör mappningen inget. */
  blocked: (target: EventTarget | null) => boolean
  run: (action: RemoteAction) => void
}

/**
 * Lyssnarna läggs EN gång när skalet monteras (läget läses ur `stateRef`), så
 * de står först bland capture-lyssnarna på `window` — före spelarens och
 * kromets, som läggs om medan de lever och stoppar sina tangenter med
 * `stopImmediatePropagation`.
 */
export function useRemoteKeys(enabled: boolean, stateRef: RefObject<RemoteKeysState>): void {
  useEffect(() => {
    if (!enabled) return
    const fire = (action: RemoteAction) => {
      if (action === 'none') return
      if (!dispatchRemoteAction(action)) stateRef.current?.run(action)
    }
    const hold = createRemoteHold({ holdMs: TV_HOLD_MS, fire })
    const lookup = (event: KeyboardEvent) => {
      const state = stateRef.current
      const id = remoteKeyId(event)
      if (!state || !id) return null
      const binding = state.bindings.find((b) => b.key === id)
      if (!binding) return null
      const dpad = DPAD_REMOTE_KEYS.includes(id)
      // Pilarnas håll gäller bara medan en kanal spelas — annars är de navigering.
      if (dpad && !state.playerOpen) return null
      if (state.blocked(event.target)) return null
      return { id, binding, dpad }
    }
    const onDown = (event: KeyboardEvent) => {
      const hit = lookup(event)
      if (!hit) return
      if (hold.down(hit.id, hit.binding, { passFirst: hit.dpad }) === 'swallow') {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    const onUp = (event: KeyboardEvent) => {
      const id = remoteKeyId(event)
      if (id && hold.up(id) && !DPAD_REMOTE_KEYS.includes(id)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    const media = (action: string | undefined): RemoteAction | null => {
      const key = `media:${action}`
      if (!MEDIA_REMOTE_KEYS.includes(key)) return null
      const binding = stateRef.current?.bindings.find((b) => b.key === key)
      return binding ? binding.short : null
    }
    // Spelaren lämnar sina mediaknappar hit (live-tv-player.tsx).
    const onPlayerMedia = (event: Event) => {
      const action = media((event as CustomEvent<{ action?: string }>).detail?.action)
      if (action === null || action === 'none') return
      event.preventDefault()
      fire(action)
    }
    // Utan spelare lyssnar ingen annan på mediaknapparna i Live TV.
    const onHostMedia = (event: Event) => {
      const state = stateRef.current
      if (!state || state.playerOpen || state.blocked(document.activeElement)) return
      const action = media((event as CustomEvent<{ action?: string }>).detail?.action)
      if (action) fire(action)
    }
    window.addEventListener('keydown', onDown, true)
    window.addEventListener('keyup', onUp, true)
    window.addEventListener(REMOTE_MEDIA_EVENT, onPlayerMedia)
    window.addEventListener('lumio-media-key', onHostMedia)
    return () => {
      hold.reset()
      window.removeEventListener('keydown', onDown, true)
      window.removeEventListener('keyup', onUp, true)
      window.removeEventListener(REMOTE_MEDIA_EVENT, onPlayerMedia)
      window.removeEventListener('lumio-media-key', onHostMedia)
    }
  }, [enabled, stateRef])
}
