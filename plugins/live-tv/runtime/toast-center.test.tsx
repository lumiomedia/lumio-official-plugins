import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { __emitTvFocusEdgeForTests, __resetForTests } from '@/lib/plugin-sdk'
import { ToastCenter, __resetToastsForTests, hasToasts, pushToast } from './toast-center'
import { setPlayingChannel } from './sport/goal-alerts'

/*
  Notiserna med fjärren (Jerry 2026-10-12): målnotisen och avsparks-
  påminnelsen gick inte att nå på TV.
*/

const toast = (title: string, onWatch?: () => void) => ({ title, body: "Kamara 3'", watchLabel: 'Watch', onWatch, dismissLabel: 'Close', timeoutMs: 20_000 })

function page() {
  return render(
    <div>
      <button data-testid="page-btn" data-f="">page</button>
      <input data-testid="field" />
      <div data-panel-root=""><button data-testid="panel-btn" data-f="">panel</button></div>
      <ToastCenter />
    </div>,
  )
}
const tick = (ms = 1) => act(() => { vi.advanceTimersByTime(ms) })

beforeEach(() => {
  __resetForTests()
  __resetToastsForTests()
  setPlayingChannel(null)
  vi.useFakeTimers()
  document.documentElement.setAttribute('data-tv', '1')
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.documentElement.removeAttribute('data-tv')
})

describe('Notiserna på TV', () => {
  it('en ny notis tar fokus till Titta; Bakåt stänger den och fokus går tillbaka dit det stod', () => {
    page()
    screen.getByTestId('page-btn').focus()
    act(() => { pushToast(toast('Goal · Elfsborg 1-0 Halmstad', () => {})) })
    tick()
    expect(document.activeElement).toHaveAttribute('data-toast-btn', 'watch')
    // Fällan gäller bara medan fokus står i notisen.
    expect(document.querySelector('[data-lt-toasts]')).toHaveAttribute('data-panel-root')
    fireEvent.keyDown(window, { key: 'Escape' })
    tick()
    expect(hasToasts()).toBe(false)
    expect(document.activeElement).toBe(screen.getByTestId('page-btn'))
  })
  it('utan något att titta på: fokus till Stäng; Stäng tar bort notisen', () => {
    page()
    act(() => { pushToast(toast('Kick-off soon')) })
    tick()
    expect(document.activeElement).toHaveAttribute('data-toast-btn', 'dismiss')
    fireEvent.click(document.activeElement!)
    tick()
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('flera notiser staplas, nyast överst, fokus till den nyaste; var och en kan stängas', () => {
    page()
    act(() => { pushToast(toast('first', () => {})) })
    tick()
    act(() => { pushToast(toast('second', () => {})) })
    tick()
    const all = screen.getAllByRole('status')
    expect(all.map((t) => t.textContent?.includes('second'))).toEqual([true, false])
    expect(all[0].contains(document.activeElement)).toBe(true)
  })
  it('tidsgränsen med fokus i notisen lämnar tillbaka fokus', () => {
    page()
    screen.getByTestId('page-btn').focus()
    act(() => { pushToast(toast('Goal', () => {})) })
    tick()
    expect(document.activeElement).toHaveAttribute('data-toast-btn', 'watch')
    tick(20_001)
    expect(hasToasts()).toBe(false)
    expect(document.activeElement).toBe(screen.getByTestId('page-btn'))
  })
  it('textfält, öppen spelare eller annat lager: fokus stannar; ▸ eller ▾ vid kanten tar dit', async () => {
    page()
    screen.getByTestId('field').focus()
    act(() => { pushToast(toast('Goal', () => {})) })
    tick()
    expect(document.activeElement).toBe(screen.getByTestId('field'))
    screen.getByTestId('panel-btn').focus()
    act(() => { pushToast(toast('Goal 2', () => {})) })
    tick()
    expect(document.activeElement).toBe(screen.getByTestId('panel-btn'))
    expect(document.querySelector('[data-lt-toasts]')).not.toHaveAttribute('data-panel-root')
    const meta = __emitTvFocusEdgeForTests('right')
    await act(async () => { await Promise.resolve() })
    expect(meta.claimed).toBe(true)
    expect(document.activeElement).toHaveAttribute('data-toast-btn', 'watch')
    // Bakåt därifrån: tillbaka till panelen.
    fireEvent.keyDown(window, { key: 'Escape' })
    tick()
    expect(document.activeElement).toBe(screen.getByTestId('panel-btn'))
  })
  it('spelaren öppen: ingen fokusstöld', () => {
    page()
    setPlayingChannel('tv4')
    screen.getByTestId('page-btn').focus()
    act(() => { pushToast(toast('Goal', () => {})) })
    tick()
    expect(document.activeElement).toBe(screen.getByTestId('page-btn'))
  })
  it('Titta stänger notisen och spelar', () => {
    page()
    const watch = vi.fn()
    act(() => { pushToast(toast('Goal', watch)) })
    tick()
    fireEvent.click(document.activeElement!)
    expect(watch).toHaveBeenCalled()
    expect(hasToasts()).toBe(false)
  })
})

describe('Skrivbordet', () => {
  it('riktiga knappar (Tab-nåbara) och ingen fokusflytt', () => {
    document.documentElement.removeAttribute('data-tv')
    page()
    screen.getByTestId('page-btn').focus()
    act(() => { pushToast(toast('Goal', () => {})) })
    tick()
    expect(document.activeElement).toBe(screen.getByTestId('page-btn'))
    expect(screen.getAllByRole('button').filter((b) => b.hasAttribute('data-toast-btn')).map((b) => b.tagName)).toEqual(['BUTTON', 'BUTTON'])
  })
})

describe('onDismiss (Soffläge: ett aktivt Stäng stänger målet överallt)', () => {
  it('anropas vid Stäng och Bakåt, men inte vid tidsgränsen eller Titta', () => {
    page()
    const onDismiss = vi.fn()
    act(() => { pushToast({ ...toast('a'), onDismiss }) })
    tick()
    fireEvent.click(document.activeElement!)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    act(() => { pushToast({ ...toast('b', () => {}), onDismiss }) })
    tick()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(2)
    act(() => { pushToast({ ...toast('c', () => {}), onDismiss }) })
    tick()
    fireEvent.click(document.activeElement!)
    expect(onDismiss).toHaveBeenCalledTimes(2)
    act(() => { pushToast({ ...toast('d'), onDismiss }) })
    tick(20_001)
    expect(hasToasts()).toBe(false)
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })
  it('målutseendet: märke, korall överrad och nedräkningslinje', () => {
    page()
    act(() => { pushToast({ ...toast('Malmö FF 2–1 · 67\'', () => {}), kicker: 'MÅL! · DU FÖLJER', look: 'goal', badge: 'MFF' }) })
    tick()
    expect(screen.getByTestId('toast-badge')).toHaveTextContent('MFF')
    expect(document.querySelector('[data-toast-countdown]')).not.toBeNull()
  })
})

describe('notiser med nyckel', () => {
  it('samma nyckel ersätter den synliga notisen i stället för att lägga en till', () => {
    __resetToastsForTests()
    render(<ToastCenter />)
    act(() => { pushToast({ ...toast('Manchester City - PSG'), key: 'reminder:a' }) })
    act(() => { pushToast({ ...toast('Roma - Real Madrid'), key: 'reminder:b' }) })
    act(() => { pushToast({ ...toast('Manchester City - PSG'), key: 'reminder:a' }) })
    expect(screen.getAllByText('Manchester City - PSG')).toHaveLength(1)
    expect(screen.getAllByText('Roma - Real Madrid')).toHaveLength(1)
  })
})
