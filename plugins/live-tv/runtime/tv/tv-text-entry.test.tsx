import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __setTvModeForTests } from '@/lib/plugin-sdk'
import { useTextPrompt, TvTextField } from './tv-text-entry'

afterEach(cleanup)
beforeEach(() => { __setTvModeForTests(false) })

/** Litet testskal: exponerar `ask` via en knapp så testet kan trigga prompten. */
function Harness({ onDone }: { onDone: (value: string) => void }) {
  const { ask, node } = useTextPrompt()
  return (
    <>
      <button type="button" onClick={() => ask('Server', 'http://panel:8080', onDone)}>open</button>
      {node}
    </>
  )
}

describe('useTextPrompt', () => {
  it('i TV-läge renderas värdens panel och inget eget <input>', () => {
    __setTvModeForTests(true)
    render(<Harness onDone={() => {}} />)
    fireEvent.click(screen.getByText('open'))
    expect(screen.getByTestId('tv-keyboard-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('text-prompt-dialog')).not.toBeInTheDocument()
    // Endast värdpanelens eget fält finns — vi ritar inget extra <input>.
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByTestId('tv-keyboard-input')).toBeInTheDocument()
  })

  it('utanför TV-läget renderas ett <input> och ingen TvKeyboardPanel', () => {
    __setTvModeForTests(false)
    render(<Harness onDone={() => {}} />)
    fireEvent.click(screen.getByText('open'))
    expect(screen.getByTestId('text-prompt-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('tv-keyboard-panel')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('Enter i fältet kör onDone med värdet', () => {
    __setTvModeForTests(false)
    const onDone = vi.fn()
    render(<Harness onDone={onDone} />)
    fireEvent.click(screen.getByText('open'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'jerry' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onDone).toHaveBeenCalledWith('jerry')
    expect(screen.queryByTestId('text-prompt-dialog')).not.toBeInTheDocument()
  })

  it('Escape stänger utan onDone', () => {
    __setTvModeForTests(false)
    const onDone = vi.fn()
    render(<Harness onDone={onDone} />)
    fireEvent.click(screen.getByText('open'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'jerry' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.queryByTestId('text-prompt-dialog')).not.toBeInTheDocument()
  })

  it('två prompts i rad börjar med rätt begynnelsevärde (regressionen mot "http://panel:8080jerry")', () => {
    __setTvModeForTests(true)
    let step2Onward: (value: string) => void = () => {}
    function Wizard() {
      const { ask, node } = useTextPrompt()
      return (
        <>
          <button
            type="button"
            onClick={() =>
              ask('Server', 'http://panel:8080', (server) => {
                ask('Username', '', (user) => step2Onward(`${server}|${user}`))
              })
            }
          >
            open
          </button>
          {node}
        </>
      )
    }
    render(<Wizard />)
    fireEvent.click(screen.getByText('open'))
    const step1Input = screen.getByTestId('tv-keyboard-input') as HTMLInputElement
    expect(step1Input.defaultValue).toBe('http://panel:8080')
    fireEvent.click(screen.getByText('Done'))
    const step2Input = screen.getByTestId('tv-keyboard-input') as HTMLInputElement
    // Regressionsbuggen: andra stegets fält innehöll fortfarande
    // "http://panel:8080" (React återanvände useState) och blev
    // "http://panel:8080jerry" när användarnamnet skrevs efter.
    expect(step2Input.defaultValue).toBe('')
  })
})

describe('TvTextField', () => {
  it('sökvyn utanför TV har ett fokuserat fält och inget skärmtangentbord', () => {
    __setTvModeForTests(false)
    render(<TvTextField value="" onChange={() => {}} autoFocus />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
    expect(document.querySelector('[data-live-tv-keyboard]')).not.toBeInTheDocument()
  })

  it('sökvyn i TV har TV-tangentbordet som förut', () => {
    __setTvModeForTests(true)
    render(<TvTextField value="" onChange={() => {}} autoFocus />)
    expect(document.querySelector('[data-live-tv-keyboard]')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('useTextPrompt: fälttyp, lager och IME', () => {
  /** Som Harness ovan, men med fälttyp och en lagerstack att registrera sig i. */
  function TypedHarness({ kind, pushLayer, onDone }: { kind?: 'text' | 'password' | 'url' | 'username'; pushLayer?: (close: () => void) => () => void; onDone?: (value: string) => void }) {
    const { ask, node } = useTextPrompt(pushLayer ? { pushLayer } : undefined)
    return (
      <>
        <button type="button" onClick={() => ask('Fält', '', onDone ?? (() => {}), kind)}>open</button>
        {node}
      </>
    )
  }

  it('lösenordssteget får ett maskerat fält', () => {
    render(<TypedHarness kind="password" />)
    fireEvent.click(screen.getByText('open'))
    const input = screen.getByTestId('text-prompt-input') as HTMLInputElement
    expect(input.type).toBe('password')
  })

  it('URL- och användarnamnssteget stänger av autokorrigering', () => {
    render(<TypedHarness kind="url" />)
    fireEvent.click(screen.getByText('open'))
    const input = screen.getByTestId('text-prompt-input') as HTMLInputElement
    expect(input.type).toBe('url')
    expect(input.getAttribute('inputmode')).toBe('url')
    expect(input.getAttribute('autocapitalize')).toBe('none')
    expect(input.getAttribute('autocorrect')).toBe('off')
    expect(input.getAttribute('spellcheck')).toBe('false')
  })

  it('dialogen registreras som lager så skalets Bakåt stänger den först', () => {
    const layers: (() => void)[] = []
    const pushLayer = (close: () => void) => {
      layers.push(close)
      return () => { layers.splice(layers.indexOf(close), 1) }
    }
    const onDone = vi.fn()
    render(<TypedHarness pushLayer={pushLayer} onDone={onDone} />)
    fireEvent.click(screen.getByText('open'))
    expect(layers).toHaveLength(1)
    // Skalets back() kör det översta lagret: dialogen ska stängas, inget onDone.
    act(() => { layers[layers.length - 1]() })
    expect(screen.queryByTestId('text-prompt-dialog')).not.toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    // …och lagret avregistreras när dialogen försvinner, annars hade nästa
    // Bakåt ätits av en stängare för en dialog som inte finns.
    expect(layers).toHaveLength(0)
  })

  it('Enter mitt i en IME-komposition skickar inte', () => {
    const onDone = vi.fn()
    render(<TypedHarness onDone={onDone} />)
    fireEvent.click(screen.getByText('open'))
    const input = screen.getByTestId('text-prompt-input')
    fireEvent.change(input, { target: { value: 'にほん' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 })
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByTestId('text-prompt-dialog')).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onDone).toHaveBeenCalledWith('にほん')
  })

  it('TvTextField skickar inte heller mitt i en komposition', () => {
    const onSubmit = vi.fn()
    render(<TvTextField value="にほん" onChange={() => {}} onSubmit={onSubmit} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalled()
  })
})
