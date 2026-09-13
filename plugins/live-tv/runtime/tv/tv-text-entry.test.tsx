import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
