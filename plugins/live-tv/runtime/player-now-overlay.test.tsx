import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlayerNowOverlay } from './player-now-overlay'

vi.mock('./hooks/useEpgNowNextLater', () => ({ useEpgNowNextLater: vi.fn() }))
import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'

const channel = {
  name: 'BBC One',
  logo: null,
  group: 'UK',
  url: 'http://x',
  tvgId: 'BBCOne.uk',
}

describe('PlayerNowOverlay', () => {
  it('renders title and remaining when NOW is present', () => {
    const now = Date.now()
    vi.mocked(useEpgNowNextLater).mockReturnValue({
      now: { title: 'BBC News', start: now - 60_000, stop: now + 30 * 60_000 },
      next: null,
      later: null,
    })
    const { container } = render(
      <PlayerNowOverlay channel={channel} listId="list-1" urls={['u']} />,
    )
    expect(screen.getByText('BBC News')).toBeInTheDocument()
    expect(screen.getByText(/m kvar/i)).toBeInTheDocument()
    expect(screen.getByText('Nu')).toBeInTheDocument()
    expect(container.querySelector('.absolute')).toBeFalsy()
  })

  it('renders nothing when NOW is null', () => {
    vi.mocked(useEpgNowNextLater).mockReturnValue({ now: null, next: null, later: null })
    const { container } = render(
      <PlayerNowOverlay channel={channel} listId="list-1" urls={['u']} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
