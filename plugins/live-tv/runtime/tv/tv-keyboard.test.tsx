import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TvKeyboard } from './tv-keyboard'

afterEach(cleanup)

describe('TvKeyboard', () => {
  it('skriver, raderar, växlar teckenläge och signalerar Klar', () => {
    const onChange = vi.fn()
    const onDone = vi.fn()
    render(<TvKeyboard value="ab" onChange={onChange} onDone={onDone} initFocus />)
    fireEvent.click(screen.getByText('q'))
    expect(onChange).toHaveBeenCalledWith('abq')
    fireEvent.click(screen.getByLabelText('Backspace'))
    expect(onChange).toHaveBeenCalledWith('a')
    fireEvent.click(screen.getByText('123?'))
    expect(screen.getByText('@')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Done'))
    expect(onDone).toHaveBeenCalled()
    expect(document.querySelectorAll('[data-init]')).toHaveLength(1)
  })
})
