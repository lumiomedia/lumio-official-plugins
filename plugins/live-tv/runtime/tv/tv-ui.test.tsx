import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, __setHostClockForTests } from '@/lib/plugin-sdk'
import { ChannelArt, Chip, Progress, RoundBtn, Tag, TvFocusStyle, dp, station, useTvClockNode } from './tv-ui'
import { __resetLogoQueueForTests } from '../live-tv-logo-image'

// happy-dom har en riktig IntersectionObserver som aldrig rapporterar
// intersection i test — utan den odefinierad hänger ChannelArts logotyp i
// laddkön för evigt och `src`-attributet sätts aldrig.
vi.stubGlobal('IntersectionObserver', undefined)

// Laddkön är modulglobal (se live-tv-logo-image.tsx) — utan nollställning tar
// återanvända URL:er cache-genvägen i stället för att gå genom kön.
beforeEach(() => {
  __resetLogoQueueForTests()
})

afterEach(cleanup)

describe('tv-ui', () => {
  it('dp är designpixlar rakt av — scenen är redan 1920×1080', () => {
    expect(dp(22)).toBe(22)
    expect(dp(52)).toBe(52)
    expect(dp(104)).toBe(104)
  })
  it('RoundBtn behåller anroparens style i stället för att skriva över den', () => {
    render(<RoundBtn {...station(() => {})} style={{ marginLeft: 'auto' }}>x</RoundBtn>)
    const el = screen.getByRole('button')
    expect(el.style.marginLeft).toBe('auto')
    // Knappens egna mått ska finnas kvar.
    expect(el.style.borderRadius).toBe('999px')
  })
  it('station ger en fokusstation som kör onOk på klick', () => {
    const ok = vi.fn()
    render(<div {...station(ok)}>x</div>)
    const el = screen.getByRole('button')
    expect(el).toHaveAttribute('data-f')
    expect(el).toHaveAttribute('tabindex', '0')
    fireEvent.click(el)
    expect(ok).toHaveBeenCalledTimes(1)
  })
  it('Tag live har punkt och versaler', () => {
    render(<Tag variant="live">LIVE</Tag>)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })
  it('Progress klipper värdet till 0..1', () => {
    const { container } = render(<Progress value={1.5} />)
    expect((container.querySelector('[data-fill]') as HTMLElement).style.width).toBe('100%')
  })
  it('ChannelArt faller tillbaka på initialer när logotypen inte kan laddas', () => {
    // Leverantörens bildserver svarade 503 → proxyn ger 502 → <img> onerror.
    render(<ChannelArt channel={{ name: 'Sky Sports', logo: 'http://logos.example/sky.png' }} />)
    const img = document.querySelector('img.lumio-tv-logo-img') as HTMLImageElement | null
    if (img) fireEvent.error(img)
    expect(screen.getByText('SS')).toBeTruthy()
  })

  it('ChannelArt visar initialer utan logotyp och bildruta', () => {
    render(<ChannelArt channel={{ name: 'Sky Sports', logo: null }} />)
    expect(screen.getByText('SS')).toBeInTheDocument()
  })

  it('ChannelArt kanalkortet skickar med reserven', () => {
    render(
      <ChannelArt channel={{ name: 'K', logo: 'http://p/a.png', logoFallback: 'http://p/b.png' }} />,
    )
    const img = document.querySelector('img.lumio-tv-logo-img') as HTMLImageElement
    fireEvent.error(img)
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/b.png'))
  })

  it('ChannelArt: kanal utan leverantörslogotyp går direkt på reserven', () => {
    render(
      <ChannelArt channel={{ name: 'K', logo: null, logoFallback: 'http://p/b.png' }} />,
    )
    const img = document.querySelector('img.lumio-tv-logo-img') as HTMLImageElement
    expect(img.getAttribute('src')).toContain(encodeURIComponent('http://p/b.png'))
  })

  it('ChannelArt: kanal utan både och visar initialerna', () => {
    render(<ChannelArt channel={{ name: 'Kanal Ett', logo: null, logoFallback: null }} />)
    expect(document.querySelector('img.lumio-tv-logo-img')).toBeNull()
    expect(screen.getByText('KE')).toBeInTheDocument()
  })
})

/**
 * Pekaren i primitiverna (P2). Stationen ska kunna hållas med fjärr, mus och
 * finger — en implementation per handling. Handlarna kommer ur SDK:t
 * (`tvPointerHoldHandlers`); teststubben bär en riktig kopia av appens kod, så
 * det här testar BETEENDET och inte en attrapp.
 */
describe('station med pekarhåll', () => {
  it('station utan onHold har inget data-hold', () => {
    render(<div {...station(() => {})}>x</div>)
    expect(screen.getByRole('button')).not.toHaveAttribute('data-hold')
  })

  it('station med onHold har data-hold', () => {
    render(<div {...station(() => {}, () => {})}>x</div>)
    expect(screen.getByRole('button')).toHaveAttribute('data-hold')
  })

  it('pointerdown i 650 ms kör onHold', () => {
    vi.useFakeTimers()
    try {
      const ok = vi.fn()
      const hold = vi.fn()
      render(<div {...station(ok, hold)}>x</div>)
      const el = screen.getByRole('button')
      fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' })
      vi.advanceTimersByTime(650)
      expect(hold).toHaveBeenCalledTimes(1)
      expect(hold.mock.calls[0][0]).toBe(el)
      expect(ok).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('det efterföljande klicket kör INTE onOk', () => {
    vi.useFakeTimers()
    try {
      const ok = vi.fn()
      const hold = vi.fn()
      render(<div {...station(ok, hold)}>x</div>)
      const el = screen.getByRole('button')
      fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' })
      vi.advanceTimersByTime(650)
      fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' })
      fireEvent.click(el)
      expect(hold).toHaveBeenCalledTimes(1)
      expect(ok).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('pointerup före 650 ms ger onOk via klicket, inte onHold', () => {
    vi.useFakeTimers()
    try {
      const ok = vi.fn()
      const hold = vi.fn()
      render(<div {...station(ok, hold)}>x</div>)
      const el = screen.getByRole('button')
      fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' })
      vi.advanceTimersByTime(200)
      fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' })
      vi.advanceTimersByTime(2000)
      expect(hold).not.toHaveBeenCalled()
      fireEvent.click(el)
      expect(ok).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('pointerleave avbryter hållet', () => {
    vi.useFakeTimers()
    try {
      const ok = vi.fn()
      const hold = vi.fn()
      render(<div {...station(ok, hold)}>x</div>)
      const el = screen.getByRole('button')
      fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' })
      vi.advanceTimersByTime(300)
      fireEvent.pointerOut(el, { relatedTarget: document.body })
      vi.advanceTimersByTime(2000)
      expect(hold).not.toHaveBeenCalled()
      expect(ok).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('contextmenu på en station med håll kör onHold och preventDefault', () => {
    const ok = vi.fn()
    const hold = vi.fn()
    render(<div {...station(ok, hold)}>x</div>)
    const el = screen.getByRole('button')
    const event = createEvent.contextMenu(el)
    fireEvent(el, event)
    expect(hold).toHaveBeenCalledTimes(1)
    expect(hold.mock.calls[0][0]).toBe(el)
    expect(event.defaultPrevented).toBe(true)
    expect(ok).not.toHaveBeenCalled()
  })

  /**
   * Regressionen mot A4:s closure-flagga (appens `lib/tv-hold.ts`, 6def2de).
   * `station()` bygger NYA handlare vid varje rendering, och `onHold` öppnar en
   * meny — en omrendering kan alltså landa MELLAN pointerup och click. Ligger
   * undertryckningen i handlarobjektets closure är den borta när det nya
   * `onClickCapture` läser den, och både menyn och OK körs. Flaggan måste
   * därför ligga per ELEMENT på modulnivå.
   */
  it('ett håll som orsakar omrendering undertrycker ändå klicket', () => {
    vi.useFakeTimers()
    try {
      const ok = vi.fn()
      const opened: HTMLElement[] = []
      let bump = () => {}
      function Harness() {
        const [menu, setMenu] = useState(0)
        bump = () => setMenu((n) => n + 1)
        return (
          <div {...station(ok, (el) => { opened.push(el); setMenu((n) => n + 1) })}>
            {`meny ${menu}`}
          </div>
        )
      }
      render(<Harness />)
      const el = screen.getByRole('button')
      fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' })
      act(() => { vi.advanceTimersByTime(650) })
      expect(opened).toHaveLength(1)
      expect(el.textContent).toBe('meny 1')
      fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' })
      // Omrenderingen som gör closure-varianten fel: det onClickCapture som
      // klicket möter är inte det som såg uppsläppet.
      act(() => { bump() })
      expect(el.textContent).toBe('meny 2')
      fireEvent.click(el)
      expect(ok).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ett långt håll undertrycker klicket vid uppsläppet', () => {
    vi.useFakeTimers()
    try {
      const ok = vi.fn()
      const hold = vi.fn()
      render(<div {...station(ok, hold)}>x</div>)
      const el = screen.getByRole('button')
      fireEvent.pointerDown(el, { button: 0, pointerType: 'mouse' })
      // Två sekunder — långt bortom bildrutan som släpper spärren.
      vi.advanceTimersByTime(2000)
      expect(hold).toHaveBeenCalledTimes(1)
      fireEvent.pointerUp(el, { button: 0, pointerType: 'mouse' })
      fireEvent.click(el)
      expect(ok).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('klick på en station utan håll kör onOk som förut', () => {
    const ok = vi.fn()
    render(<div {...station(ok)}>x</div>)
    fireEvent.click(screen.getByRole('button'))
    expect(ok).toHaveBeenCalledTimes(1)
  })
})

describe('TvFocusStyle', () => {
  const css = () => {
    const { container } = render(<TvFocusStyle />)
    return container.querySelector('style')?.textContent ?? ''
  }

  it('TvFocusStyle innehåller hovringsregeln bakom @media (hover: hover)', () => {
    const text = css()
    expect(text).toContain('@media (hover: hover) and (pointer: fine)')
    expect(text).toContain('[data-live-tv-tv-root] [data-f]:hover')
    expect(text).toContain('[data-live-tv-chip][data-f]:hover')
    // Hovringen får inte ligga utanför media-frågan: en TV med fjärr och en
    // pekskärm skulle annars fastna i hovringsläget efter ett tryck.
    const hoverIndex = text.indexOf('[data-f]:hover')
    expect(hoverIndex).toBeGreaterThan(text.indexOf('@media (hover: hover) and (pointer: fine)'))
  })

  it('ringen är villkorad på data-focus-source', () => {
    const text = css()
    expect(text).toContain(':root:not([data-focus-source="pointer"]) [data-live-tv-tv-root] [data-f]:focus')
    expect(text).toContain(':root:not([data-focus-source="pointer"]) [data-live-tv-tv-root] [data-f][data-fcur="1"]')
  })

  it('stationer är markeringsfria men beskrivningstext går att markera', () => {
    const text = css()
    expect(text).toContain('[data-live-tv-tv-root] [data-f] { user-select: none')
    expect(text).toContain('[data-live-tv-tv-root] [data-selectable-text] { user-select: text')
    // Undantaget måste stå EFTER huvudregeln — lika specificitet, sista vinner.
    expect(text.indexOf('[data-selectable-text] { user-select: text')).toBeGreaterThan(
      text.indexOf('[data-f] { user-select: none'),
    )
  })
})

describe('verktygstips på trunkerade titlar', () => {
  it('Chip släpper igenom title', () => {
    render(<Chip active={false} title="Hela kategorinamnet">Kate…</Chip>)
    expect(screen.getByText('Kate…')).toHaveAttribute('title', 'Hela kategorinamnet')
  })

  it('Tag släpper igenom title', () => {
    render(<Tag variant="neutral" title="Hela taggen">Ta…</Tag>)
    expect(screen.getByText('Ta…')).toHaveAttribute('title', 'Hela taggen')
  })
})

// Jerrys återkoppling 2026-09-14: "Välkomstmeddelandet i högra hörnet har
// förminskats i desktop" — värdens klocka (HostClock) är skriven i äkta
// rem/px och krymper med scenlådans `transform: scale()` om den hamnar
// INUTI lådan. Fixen väljer pluginets EGEN dp()-klocka där i stället, och
// HostClock bara när den kan ritas oskalad (ingen låda). Appens HostClock
// rörs inte — testet dubbelgångar den bara för att bevisa vilken gren som
// väljs.
function HostClockMarker({ variant }: { variant?: 'tv' | 'desktop' }) {
  return <span data-testid="host-clock">host:{variant}</span>
}

function ClockProbe() {
  return <>{useTvClockNode('en-GB')}</>
}

afterEach(() => __setHostClockForTests(null))

describe('useTvClockNode i en scenlåda (Jerrys återkoppling 2026-09-14)', () => {
  it('använder värdens klocka oskalad — ingen låda', () => {
    __setHostClockForTests(HostClockMarker)
    render(<ClockProbe />)
    expect(screen.getByTestId('host-clock')).toBeInTheDocument()
  })

  it('växlar till pluginets EGEN dp()-klocka inuti en scenlåda, i stället för att låta HostClock krympa', () => {
    __setHostClockForTests(HostClockMarker)
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    document.body.appendChild(box)
    render(<ClockProbe />, { container: box })
    expect(screen.queryByTestId('host-clock')).not.toBeInTheDocument()
    // Pluginets egen klocka: "HH:MM | DAG MÅN | VECKODAG".
    expect(screen.getByText(/^\d{2}:\d{2} \| /)).toBeInTheDocument()
  })
})
