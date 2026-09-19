import { useRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR } from '@/lib/plugin-sdk'
import { useInSceneBox } from './useInSceneBox'

afterEach(cleanup)

/** Sonden står INNE i lådan, precis som skalet gör när värden lindar sidan. */
function Probe() {
  const ref = useRef<HTMLDivElement | null>(null)
  const inBox = useInSceneBox(ref)
  return <div ref={ref} data-testid="probe">{inBox ? 'i låda' : 'ingen låda'}</div>
}

function renderInBox() {
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  document.body.appendChild(box)
  render(<Probe />, { container: box })
  return box
}

describe('useInSceneBox', () => {
  it('sant när en scenlåda finns', () => {
    renderInBox()
    expect(screen.getByTestId('probe')).toHaveTextContent('i låda')
  })

  it('falskt utan låda (TV-läge eller äldre värd)', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('ingen låda')
  })

  it('reagerar på att lådan monteras/avmonteras', async () => {
    const box = document.createElement('div')
    document.body.appendChild(box)
    render(<Probe />, { container: box })
    expect(screen.getByTestId('probe')).toHaveTextContent('ingen låda')
    box.setAttribute(TV_SCENE_BOX_ATTR, '1')
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('i låda'))
    box.removeAttribute(TV_SCENE_BOX_ATTR)
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('ingen låda'))
  })
})
