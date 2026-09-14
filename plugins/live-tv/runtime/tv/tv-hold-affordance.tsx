'use client'

import { useCallback, useEffect, useRef, useState, type JSX, type RefObject } from 'react'
import { useTvText } from './tv-strings'
import { TV, dp, Icons } from './tv-ui'

/** Knappens sida i designpixlar, och hur långt in i hörnet den ligger. */
const BUTTON_PX = 36
const INSET_PX = 6

/**
 * EN "…"-knapp för hela skalet, inte en per kort (spec §4.1).
 *
 * `station()` sätter `data-hold=""` på varje station som har en hållhandling
 * (P2). Skalet håller EN delegerad `pointerover`-lyssnare på rotnoden och
 * flyttar en enda knapp till den hovrade stationens övre högra hörn. Därmed
 * får varje station med håll en synlig affordans utan att ett enda
 * anropsställe rörs, och utan att regeln "ett kort = en station" bryts på TV.
 *
 * Ritas ALDRIG i TV-läge (`enabled={!isTv}`) och aldrig när pekaren är grov —
 * på en pekskärm finns ingen hovring, knappen hade bara legat i vägen för
 * fingret, och långtrycket är redan vägen till hållmenyn (spec §5).
 */
export function TvHoldAffordance({ rootRef, enabled }: {
  rootRef: RefObject<HTMLElement | null>
  enabled: boolean
}): JSX.Element | null {
  const { tt } = useTvText()
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null)
  const stationRef = useRef<HTMLElement | null>(null)

  const hide = useCallback(() => {
    stationRef.current = null
    setSpot((current) => (current === null ? current : null))
  }, [])

  useEffect(() => {
    if (!enabled) { hide(); return }
    const root = rootRef.current
    if (!root) return
    if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) return

    const place = (station: HTMLElement) => {
      /**
       * Koordinaterna räknas i LÅDANS designpixlar, inte mot viewporten.
       *
       * Värdens scenlåda skalar hela trädet med en CSS-transform, så
       * `getBoundingClientRect()` ger skalade px — men knappen ligger inne i
       * samma transform och positioneras i designpixlar. Därför mäts allt
       * relativt rotnodens EGEN rect och delas med lådans skala (rektangelns
       * bredd mot layoutbredden). Utan lådan är skalan 1 och räkningen
       * oförändrad.
       */
      const rootRect = root.getBoundingClientRect()
      const rect = station.getBoundingClientRect()
      const scale = rootRect.width > 0 && root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1
      stationRef.current = station
      setSpot({ left: (rect.right - rootRect.left) / scale, top: (rect.top - rootRect.top) / scale })
    }

    const onPointerOver = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target || typeof target.closest !== 'function') return
      // Hovring på knappen själv får inte gömma den: knappen ligger ovanpå
      // stationens hörn, och `closest('[data-hold]')` är null därifrån.
      if (target.closest('[data-live-tv-hold-button]')) return
      const station = target.closest<HTMLElement>('[data-hold]')
      if (!station) { hide(); return }
      if (station === stationRef.current) return
      place(station)
    }

    // `scroll` bubblar inte — capture-fasen på roten fångar ändå varje
    // scrollande förfader inne i skalet, och en knapp som blir kvar i luften
    // när listan rullar är värre än ingen knapp alls.
    root.addEventListener('pointerover', onPointerOver)
    root.addEventListener('pointerleave', hide)
    root.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      root.removeEventListener('pointerover', onPointerOver)
      root.removeEventListener('pointerleave', hide)
      root.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [enabled, hide, rootRef])

  if (!enabled || !spot) return null

  return (
    <button
      type="button"
      data-live-tv-hold-button=""
      data-testid="hold-affordance"
      // Bara en pekaraffordans: ingen `data-f`, ingen tabbstopp. Fjärren och
      // tangentbordet når samma handling genom att hålla OK på stationen.
      tabIndex={-1}
      title={tt('moreOptions')}
      aria-label={tt('moreOptions')}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const station = stationRef.current
        if (!station) return
        /**
         * Klicket går in i stationens EGET håll-kontrakt (`onContextMenu` →
         * `onHold`, P2) genom ett syntetiskt `contextmenu`. Det finns alltså
         * ingen andra väg in i handlingen att hålla synkad — knappen kan aldrig
         * hamna ur fas med vad ett högerklick eller ett långtryck gör.
         * `preventDefault()` är redan anropad när eventet skickas, precis som
         * när webbläsaren själv hade lämnat över det.
         */
        const synthetic = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
        synthetic.preventDefault()
        station.dispatchEvent(synthetic)
      }}
      style={{
        position: 'absolute',
        left: dp(spot.left - BUTTON_PX - INSET_PX),
        top: dp(spot.top + INSET_PX),
        width: dp(BUTTON_PX),
        height: dp(BUTTON_PX),
        borderRadius: dp(12),
        border: `1px solid ${TV.line}`,
        background: TV.glass,
        color: TV.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
        zIndex: 60,
      }}
    >
      <Icons.Dots size={dp(20)} />
    </button>
  )
}
