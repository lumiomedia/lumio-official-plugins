import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __resetForTests, __setTvModeForTests } from '@/lib/plugin-sdk'
import { Pill, TextField, TvCheck } from './tv-aware-controls'

beforeEach(() => { __resetForTests() })
afterEach(() => { cleanup(); __setTvModeForTests(false) })

describe('TV-medvetna kontroller', () => {
  it('på skrivbordet är knappen en vanlig knapp utan station', () => {
    __setTvModeForTests(false)
    render(<Pill onClick={() => {}}>Categories</Pill>)
    const button = screen.getByRole('button', { name: 'Categories' })
    expect(button).not.toHaveAttribute('data-f')
  })
  it('på TV är knappen en riktig knapp MED station och klick fungerar', () => {
    __setTvModeForTests(true)
    const onClick = vi.fn()
    render(<Pill onClick={onClick}>Categories</Pill>)
    const button = screen.getByRole('button', { name: 'Categories' })
    expect(button).toHaveAttribute('data-f')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it('på TV är kryssrutan en station som växlar värdet', () => {
    __setTvModeForTests(true)
    const onChange = vi.fn()
    render(<TvCheck checked={false} onChange={onChange} label="Sport" />)
    const row = screen.getByRole('button', { name: /Sport/ })
    expect(row).toHaveAttribute('data-f')
    fireEvent.click(row)
    expect(onChange).toHaveBeenCalledWith(true)
  })
  it('på TV öppnar textfältet tangentbordspanelen och Klar skriver värdet', () => {
    __setTvModeForTests(true)
    const onChange = vi.fn()
    render(<TextField value="" onChange={onChange} placeholder="Name" title="Name of the merged category" />)
    const trigger = screen.getByRole('button', { name: /Name/ })
    expect(trigger).toHaveAttribute('data-f')
    fireEvent.click(trigger)
    fireEvent.change(screen.getByTestId('tv-keyboard-input'), { target: { value: 'Mix' } })
    fireEvent.click(screen.getByText('Done'))
    expect(onChange).toHaveBeenCalledWith('Mix')
    expect(screen.queryByTestId('tv-keyboard-panel')).toBeNull()
  })
  it('på TV bär kontrollerna identitet och riktningsstyrning för fokusmotorn', () => {
    __setTvModeForTests(true)
    render(
      <>
        <TextField value="" onChange={() => {}} title="Username" tvNav={{ down: '[data-tv-id="connect"]' }} />
        <Pill onClick={() => {}} tvId="connect">Log in</Pill>
      </>,
    )
    expect(screen.getByRole('button', { name: /Username/ })).toHaveAttribute('data-f-down', '[data-tv-id="connect"]')
    expect(screen.getByRole('button', { name: 'Log in' })).toHaveAttribute('data-tv-id', 'connect')
  })
  it('på skrivbordet är textfältet ett vanligt input', () => {
    __setTvModeForTests(false)
    const onChange = vi.fn()
    render(<TextField value="" onChange={onChange} placeholder="Name" title="Name" />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'x' } })
    expect(onChange).toHaveBeenCalledWith('x')
  })
})
