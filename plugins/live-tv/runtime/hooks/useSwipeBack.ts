'use client'

import { useEffect } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'

/**
 * Kantsvep bakåt på mobil (Jerry 2026-09-09). Undersidorna hade bara sin
 * Tillbaka-knapp, och på telefon är den längst upp till vänster — en
 * återvändsgränd för tummen.
 *
 * Gesten tar ETT STEG I BAKÅT-KEDJAN, den hoppar inte till hubben. Hooken
 * bestämmer inte själv vad "bakåt" betyder — det gör anroparen, och skalet
 * skickar in sitt eget `back()` (spec §4.1). Skrivbordssidorna som ännu
 * skickar in `() => go('hub')` (`live-tv-epg-page.tsx`,
 * `live-tv-channel-page.tsx`) raderas i P9.
 *
 * Gesten måste BÖRJA vid vänsterkanten. Det är inte kosmetik: EPG-tablån och
 * flera rader scrollar i sidled, och ett drag var som helst hade slagits om
 * mellan "scrolla innehållet" och "lämna sidan" beroende på var fingret råkade
 * hamna. Kantzonen är samma modell som systemets egen bakåtgest, så den
 * konkurrerar inte med innehållet.
 */
export const SWIPE_BACK_EDGE_PX = 32
export const SWIPE_BACK_MIN_DX = 64
export const SWIPE_BACK_MAX_DY = 48

export interface SwipeBackGeometry {
  startX: number
  startY: number
  endX: number
  endY: number
}

export function isSwipeBackGesture({ startX, startY, endX, endY }: SwipeBackGeometry): boolean {
  if (startX > SWIPE_BACK_EDGE_PX) return false
  const dx = endX - startX
  const dy = endY - startY
  if (dx < SWIPE_BACK_MIN_DX) return false
  if (Math.abs(dy) > SWIPE_BACK_MAX_DY) return false
  // Vågrätt ska dominera: annars räknas ett snett drag nedåt längs kanten som
  // ett bakåtdrag.
  return dx > Math.abs(dy)
}

/**
 * Lyssnar på hela dokumentet, inte på en behållare: sidorna renderar sitt
 * innehåll i flera scrollande lager, och en behållare hade tappat gesten så
 * fort dragningen började i ett av dem.
 *
 * `enabled` är till för att stänga av gesten när ett lager som äger Back själv
 * ligger över sidan — glasmenyn och PIN-grinden täcker skärmen men ligger kvar
 * i sidans DOM, så utan flaggan hade ett drag bakom dem navigerat undan sidan
 * under dem.
 *
 * TV-läget no-oppar: en fjärr har ingen kant att svepa från, och gesten hade
 * bara kunnat utlösas av misstag på en TV med pekskärmsemulering.
 */
export function useSwipeBack(onBack: () => void, enabled = true): void {
  const tvMode = useTvMode()

  useEffect(() => {
    if (!enabled || tvMode) return
    if (typeof document === 'undefined') return

    let start: { x: number; y: number } | null = null

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        start = null
        return
      }
      const touch = event.touches[0]
      start = { x: touch.clientX, y: touch.clientY }
    }

    const onTouchEnd = (event: TouchEvent) => {
      const from = start
      start = null
      if (!from) return
      const touch = event.changedTouches[0]
      if (!touch) return
      if (isSwipeBackGesture({ startX: from.x, startY: from.y, endX: touch.clientX, endY: touch.clientY })) {
        onBack()
      }
    }

    // Flera fingrar (nyp/zoom) ska inte kunna sluta i en navigering.
    const onTouchCancel = () => {
      start = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchCancel, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [onBack, enabled, tvMode])
}
