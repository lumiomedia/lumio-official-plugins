import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import * as sdk from '@/lib/plugin-sdk'
import { TV_SCENE_BOX_ATTR } from '@/lib/plugin-sdk'
import { useSceneBoxScale } from './useSceneBoxScale'

function Probe() {
  const scale = useSceneBoxScale()
  return <div data-testid="probe">{scale === null ? 'null' : String(scale)}</div>
}

afterEach(() => {
  cleanup()
  // Lådor som testerna monterar direkt i `document.body` (utanför render's
  // egen container) städas inte av `cleanup()`.
  document.querySelectorAll(`[${TV_SCENE_BOX_ATTR}]`).forEach((el) => el.remove())
})

describe('useSceneBoxScale', () => {
  it('null utan låda', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('null')
  })

  it('läser lådans --tv-scene-box-scale', () => {
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.style.setProperty('--tv-scene-box-scale', '0.6')
    document.body.appendChild(box)
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('0.6')
  })

  it('följer med när lådan mäter om sig (skalan ändras)', async () => {
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.style.setProperty('--tv-scene-box-scale', '0.6')
    document.body.appendChild(box)
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('0.6')
    box.style.setProperty('--tv-scene-box-scale', '0.75')
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('0.75'))
  })

  // SDK:ts EGEN `tvSceneBoxScale` självläker redan ett rått 0/NaN till sitt
  // fallbackvärde 1 (se plugin-sdk.ts) — den vägen kan alltså aldrig ge oss
  // 0 i praktiken. Testerna nedan mockar funktionen direkt för att bevisa att
  // HOOKENS EGEN vaktare (inte bara SDK:ts) skyddar mot en framtida eller
  // annan värdimplementation som inte är lika försiktig.
  it('null när SDK-funktionen svarar 0', () => {
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    document.body.appendChild(box)
    const spy = vi.spyOn(sdk, 'tvSceneBoxScale').mockReturnValue(0)
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('null')
    spy.mockRestore()
  })

  it('null när SDK-funktionen svarar odefinierat', () => {
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    document.body.appendChild(box)
    const spy = vi.spyOn(sdk, 'tvSceneBoxScale').mockReturnValue(undefined as unknown as number)
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('null')
    spy.mockRestore()
  })

  it('null när SDK:t saknar tvSceneBoxScale helt (äldre app)', () => {
    const box = document.createElement('div')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    document.body.appendChild(box)
    const original = sdk.tvSceneBoxScale
    // @ts-expect-error simulerar en äldre värd vars plugin-sdk aldrig
    // exporterat funktionen.
    delete sdk.tvSceneBoxScale
    try {
      render(<Probe />)
      expect(screen.getByTestId('probe')).toHaveTextContent('null')
    } finally {
      // @ts-expect-error återställer den borttagna exporten efter testet
      sdk.tvSceneBoxScale = original
    }
  })
})
