import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { LtBtn, LtCheck, LtDialog, LtInput, LtToggleRow, ToastHost, useBackLayer, useToast } from './settings-ui'

beforeEach(() => { __resetForTests(); __setTvModeForTests(false) })
afterEach(() => { cleanup(); vi.useRealTimers(); __setTvModeForTests(false) })

describe('UI-satsen på skrivbordet', () => {
  it('knappen är en vanlig knapp med wireframens mått och färg per variant', () => {
    render(<><LtBtn onClick={() => {}}>Categories</LtBtn><LtBtn variant="danger" onClick={() => {}}>Remove</LtBtn><LtBtn variant="accent" onClick={() => {}}>Add</LtBtn></>)
    const plain = screen.getByRole('button', { name: 'Categories' })
    expect(plain.style.borderRadius).toBe('7px')
    expect(plain.style.borderColor).toBe('rgba(255, 255, 255, 0.12)')
    expect(screen.getByRole('button', { name: 'Remove' }).style.color).toBe('#e0776a')
    expect(screen.getByRole('button', { name: 'Add' }).style.borderColor).toBe('var(--color-accent)')
    expect(plain).not.toHaveAttribute('data-f')
  })
  it('kryssrutan är 17×17 med radie 4 och hela raden växlar värdet', () => {
    const onChange = vi.fn()
    render(<LtCheck checked={false} onChange={onChange} label="Fill in missing logos from iptv-org" hint="Lets the list use the iptv-org logo registry when a channel has none of its own." />)
    const box = screen.getByRole('checkbox')
    expect(box).not.toBeChecked()
    const mark = box.querySelector<HTMLElement>('[data-lt-box]')!
    expect(mark.style.width).toBe('17px')
    expect(mark.style.borderRadius).toBe('4px')
    fireEvent.click(screen.getByText(/iptv-org logo registry/))
    expect(onChange).toHaveBeenCalledWith(true)
  })
  it('växelraden har title, beskrivning och en 38×22-switch som byter läge', () => {
    const onChange = vi.fn()
    render(<LtToggleRow label="Use as home page" desc="Replaces the regular Home rows." checked onChange={onChange} />)
    const sw = screen.getByRole('switch', { name: 'Use as home page' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(sw.style.width).toBe('38px')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(false)
  })
  it('textfältet är ett input utan ram med wireframens grund, och Enter kör onEnter', () => {
    const onEnter = vi.fn()
    render(<LtInput value="" onChange={() => {}} placeholder="XMLTV URL" title="XMLTV URL" onEnter={onEnter} />)
    const input = screen.getByPlaceholderText('XMLTV URL')
    expect(input.style.background).toBe('rgba(255, 255, 255, 0.055)')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onEnter).toHaveBeenCalledTimes(1)
  })
})

function Host({ onClose, extraPanel = false }: { onClose: () => void; extraPanel?: boolean }) {
  return (
    <>
      <LtDialog title="Categories · panel.test" body="Hide the ones you never watch." onClose={onClose} testId="dlg">
        <input aria-label="Search categories" />
        {/* Tangentbordspanelen ritas som barn till dialogen — efter dess rot i DOM. */}
        {extraPanel ? <div data-panel-root="" data-testid="kbd">keyboard</div> : null}
      </LtDialog>
    </>
  )
}

describe('LtDialog + Bakåt-lagret', () => {
  it('ritar rubrik, brödtext och wireframens ram', () => {
    render(<Host onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('data-panel-root')
    expect(screen.getByText('Categories · panel.test')).toBeInTheDocument()
    expect(screen.getByText('Hide the ones you never watch.')).toBeInTheDocument()
    const box = screen.getByTestId('dlg')
    expect(box.style.background).toBe('#1b1c23')
    expect(box.style.borderRadius).toBe('14px')
    expect(box.style.padding).toBe('26px 26px 22px')
  })
  it('Escape stänger dialogen när den är sista panelroten, och stoppar händelsen', () => {
    const onClose = vi.fn()
    const outer = vi.fn()
    window.addEventListener('keydown', outer)
    try {
      render(<Host onClose={onClose} />)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(outer).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener('keydown', outer)
    }
  })
  it('Escape rör INTE dialogen när en annan panelrot ligger efter den i DOM (tangentbordet ovanpå)', () => {
    const onClose = vi.fn()
    render(<Host onClose={onClose} extraPanel />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
  it('Backspace i ett textfält stänger inte, och på skrivbordet stänger Backspace aldrig', () => {
    const onClose = vi.fn()
    render(<Host onClose={onClose} />)
    fireEvent.keyDown(screen.getByLabelText('Search categories'), { key: 'Backspace' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onClose).not.toHaveBeenCalled()
  })
  it('på TV stänger Backspace utanför fält, och lumio-browse-back stänger', () => {
    __setTvModeForTests(true)
    const onClose = vi.fn()
    render(<Host onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onClose).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new CustomEvent('lumio-browse-back'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it('klick på överdraget stänger, klick i rutan gör det inte', () => {
    const onClose = vi.fn()
    render(<Host onClose={onClose} />)
    fireEvent.click(screen.getByTestId('dlg'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it('fokus går tillbaka till öppnaren när lagret stängs', () => {
    vi.useFakeTimers()
    function Opener() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Categories</button>
          {open ? <LtDialog title="T" onClose={() => setOpen(false)}><span>x</span></LtDialog> : null}
        </>
      )
    }
    render(<Opener />)
    const opener = screen.getByRole('button', { name: 'Categories' })
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    act(() => { vi.runAllTimers() })
    expect(document.activeElement).toBe(opener)
  })
  it('useBackLayer kan användas fristående på en egen panelrot', () => {
    const onBack = vi.fn()
    function Panel() {
      const ref = useRef<HTMLDivElement | null>(null)
      useBackLayer(true, onBack, ref)
      return <div ref={ref} data-panel-root="">panel</div>
    }
    render(<Panel />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('toast', () => {
  it('visar texten och tar bort den efter 2,4 s', () => {
    vi.useFakeTimers()
    function App() {
      const toast = useToast()
      return <button type="button" onClick={() => toast('Categories saved')}>go</button>
    }
    render(<ToastHost><App /></ToastHost>)
    fireEvent.click(screen.getByText('go'))
    expect(screen.getByRole('status')).toHaveTextContent('Categories saved')
    act(() => { vi.advanceTimersByTime(2400) })
    expect(screen.queryByRole('status')).toBeNull()
  })
})
