'use client'

import { useCallback, useEffect, useRef, useState, type JSX, type RefObject } from 'react'
import { tvSceneBoxScale } from '@/lib/plugin-sdk'
import { useTvText } from './tv-strings'
import { TV, dp, Icons } from './tv-ui'

/** Knappens sida i designpixlar, och hur långt in i hörnet den ligger. */
const BUTTON_PX = 36
const INSET_PX = 6
/**
 * Frågan är "finns det NÅGON fin pekare?", inte "är den primära grov".
 *
 * En hybrid (pekskärmslaptop, Surface, Chromebook med touch) svarar
 * `pointer: coarse` på sin PRIMÄRA pekare och hade då blivit av med knappen
 * trots att en mus är inkopplad. `any-pointer: fine` matchar så fort någon fin
 * pekare finns. Frågan ställs om vid `change` — en mus kan kopplas in och ur
 * medan sidan lever (uppmätt på en surfplatta med tangentbordsdocka).
 */
const FINE_POINTER_QUERY = '(any-pointer: fine)'

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
  const [finePointer, setFinePointer] = useState(true)
  const stationRef = useRef<HTMLElement | null>(null)

  const hide = useCallback(() => {
    stationRef.current = null
    setSpot((current) => (current === null ? current : null))
  }, [])

  // Utan matchMedia (mycket gammal webbvy) står svaret kvar på `true`: hellre
  // en knapp för mycket än en yta utan väg till hållmenyn på en skrivbordsmus.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(FINE_POINTER_QUERY)
    const onChange = () => setFinePointer(query.matches)
    onChange()
    query.addEventListener?.('change', onChange)
    return () => query.removeEventListener?.('change', onChange)
  }, [])

  const active = enabled && finePointer

  useEffect(() => {
    if (!active) { hide(); return }
    const root = rootRef.current
    if (!root) return

    const place = (station: HTMLElement) => {
      /**
       * Koordinaterna räknas i LÅDANS designpixlar, inte mot viewporten.
       *
       * Värdens scenlåda skalar hela trädet med en CSS-transform, så
       * `getBoundingClientRect()` ger skalade px — men knappen ligger inne i
       * samma transform och positioneras i designpixlar. Därför mäts allt
       * relativt rotnodens EGEN rect och delas med lådans skala. Skalan läses
       * ur värdens egen `--tv-scene-box-scale` (`tvSceneBoxScale`, ärvs ner
       * till roten) i stället för att räknas om ur rect mot layoutbredd — då
       * kan pluginet aldrig komma fram till en annan skala än lådan använder.
       * Utan låda är den 1 och räkningen oförändrad.
       */
      const rootRect = root.getBoundingClientRect()
      const rect = station.getBoundingClientRect()
      const scale = tvSceneBoxScale(root) || 1
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

    root.addEventListener('pointerover', onPointerOver)
    // `pointermove` utöver `pointerover`: hovringen kan börja UTAN ett
    // pointerover på stationen — listan scrollar under en stillastående mus,
    // ett kort renderas om under pekaren, eller fönstret får tillbaka fokus
    // med pekaren redan på plats. `place()` hoppar över stationen som redan är
    // vald, så rörelsen kostar ingenting.
    root.addEventListener('pointermove', onPointerOver)
    root.addEventListener('pointerleave', hide)
    // `scroll` bubblar inte, så lyssnaren sitter i capture-fasen på FÖNSTRET:
    // den fångar både skalets egna scrollytor och värdens sida utanför
    // pluginet (en knapp som blir kvar i luften är värre än ingen knapp alls).
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      root.removeEventListener('pointerover', onPointerOver)
      root.removeEventListener('pointermove', onPointerOver)
      root.removeEventListener('pointerleave', hide)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [active, hide, rootRef])

  if (!active || !spot) return null

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
        // Koordinaterna pekar på KNAPPENS mitt: glasmenyn får lägga sig vid
        // pekaren precis som efter ett högerklick, inte i stationens mitt.
        const here = event.currentTarget.getBoundingClientRect()
        const synthetic = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: here.left + here.width / 2,
          clientY: here.top + here.height / 2,
        })
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
        // Över spelaren (z 70): mini-guidens kort är stationer med håll, och
        // en knapp under spelaren hade varit osynlig just där.
        zIndex: 71,
      }}
    >
      <Icons.Dots size={dp(20)} />
    </button>
  )
}
