import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup, act } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_PHONE_ATTR } from '@/lib/plugin-sdk'
import { usePhoneSurface } from './usePhoneSurface'

afterEach(() => {
  cleanup()
  // Lådorna skapas direkt mot `document.body` (ingen `render`-container),
  // så `cleanup()` river inte dem. Utan städningen läcker föregående tests
  // låda kvar och `document.querySelector` i hooken kan hitta FEL låda.
  document.body.innerHTML = ''
})

describe('usePhoneSurface', () => {
  it('är falsk utan låda', () => {
    const { result } = renderHook(() => usePhoneSurface())
    expect(result.current).toBe(false)
  })

  it('är sann när lådan är märkt som telefon', () => {
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
    document.body.appendChild(box)
    const { result } = renderHook(() => usePhoneSurface())
    expect(result.current).toBe(true)
  })

  it('följer med när attributet försvinner', async () => {
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
    document.body.appendChild(box)
    const { result } = renderHook(() => usePhoneSurface())
    act(() => { box.removeAttribute(TV_SCENE_PHONE_ATTR) })
    await waitFor(() => expect(result.current).toBe(false))
  })
})
