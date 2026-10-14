import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { LIBRARY_STUB } from '@/lib/plugin-sdk'
import { shellToastStyle } from './shell-toast'
import { mountPhone } from './mobile/__phone-mount'

vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

const px = (v: unknown) => (typeof v === 'number' ? v : Number.parseFloat(String(v)))

describe('shellToastStyle', () => {
  it('telefon: liten ruta, aldrig cirkel, ovanför flik-raden', () => {
    const s = shellToastStyle({ phone: true, tabBar: true })
    expect(s.width).toBe('max-content')
    expect(s.maxWidth).toBe('calc(100vw - 32px)')
    expect(px(s.fontSize)).toBeGreaterThanOrEqual(13)
    expect(px(s.fontSize)).toBeLessThanOrEqual(15)
    // En radbruten ruta med 999/50 % blir rund — radien ska vara fast och liten.
    expect(px(s.borderRadius)).toBeLessThanOrEqual(16)
    expect(String(s.borderRadius)).not.toContain('%')
    expect(s.padding).toBe('10px 16px')
    expect(String(s.bottom)).toContain('52px')
    expect(String(s.bottom)).toContain('--android-inset-bottom')
  })
  it('telefon utan flik-rad: bara systemradens marginal', () => {
    expect(String(shellToastStyle({ phone: true, tabBar: false }).bottom)).not.toContain('52px')
  })
  it('TV/skrivbord: scenskala, men begränsad bredd och fast radie', () => {
    const s = shellToastStyle({ phone: false, tabBar: false })
    expect(s.fontSize).toBe(19)
    expect(s.width).toBe('max-content')
    expect(String(s.maxWidth)).toContain('100%')
    expect(px(s.borderRadius)).toBeLessThan(100)
  })
})

describe('besked på telefonen', () => {
  afterEach(() => { LIBRARY_STUB.status = { ...LIBRARY_STUB.status, sources: [] } })
  it('Hem utan VOD-index ger telefonstilen', async () => {
    LIBRARY_STUB.status = { ...LIBRARY_STUB.status, sources: [{ id: 'xtream-vod:a', provider: 'xtream-vod', titles: 0, lastFullSync: null }] } as typeof LIBRARY_STUB.status
    mountPhone()
    fireEvent.click(screen.getByTestId('tab-home'))
    const toast = await screen.findByTestId('shell-toast')
    expect(toast).toHaveTextContent('Film & series are being prepared')
    expect(toast.style.borderRadius).toBe('14px')
    expect(toast.style.fontSize).toBe('14px')
    expect(toast.style.maxWidth).toBe('calc(100vw - 32px)')
  })
})
