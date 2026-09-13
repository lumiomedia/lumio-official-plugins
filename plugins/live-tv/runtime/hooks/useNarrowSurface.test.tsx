import { useRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR } from '@/lib/plugin-sdk'
import { useNarrowSurface } from './useNarrowSurface'

afterEach(cleanup)

/** Sonden står INNE i lådan, precis som skalet gör när värden lindar sidan. */
function Probe() {
  const ref = useRef<HTMLDivElement | null>(null)
  const narrow = useNarrowSurface(ref)
  return <div ref={ref} data-testid="probe">{narrow ? 'smal' : 'bred'}</div>
}

function renderInBox(narrow: boolean) {
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  if (narrow) box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
  document.body.appendChild(box)
  render(<Probe />, { container: box })
  return box
}

describe('useNarrowSurface', () => {
  it('läser data-tv-scene-narrow på lådan', () => {
    renderInBox(true)
    expect(screen.getByTestId('probe')).toHaveTextContent('smal')
  })

  it('är falskt på en bred låda', () => {
    renderInBox(false)
    expect(screen.getByTestId('probe')).toHaveTextContent('bred')
  })

  it('är falskt utan låda', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('bred')
  })

  it('reagerar på att attributet ändras', async () => {
    const box = renderInBox(false)
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('smal'))
    box.removeAttribute(TV_SCENE_NARROW_ATTR)
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('bred'))
  })

  it('reagerar på att lådan flaggas smal FÖRST efter första mätningen', async () => {
    // `applyTvSceneBox` sätter `data-tv-scene-box` först efter att den mätt
    // elementet: under första bildrutan finns alltså ingen låda att hitta.
    // Hooken måste se lådan när den dyker upp, annars fastnar en telefon i
    // skrivbordsbredd tills något annat råkar rendera om skalet.
    const box = document.createElement('div')
    document.body.appendChild(box)
    render(<Probe />, { container: box })
    expect(screen.getByTestId('probe')).toHaveTextContent('bred')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('smal'))
  })
})
