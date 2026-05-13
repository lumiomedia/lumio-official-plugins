import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NowBadge } from './now-badge'

vi.mock('./hooks/useEpgNowNextLater', () => ({ useEpgNowNextLater: vi.fn() }))
import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'

const channel = {
  name: 'BBC One',
  logo: null,
  group: 'UK',
  url: 'http://x',
  tvgId: 'BBCOne.uk',
}

describe('NowBadge', () => {
  it('renders programme title when NOW is present', () => {
    const now = Date.now()
    vi.mocked(useEpgNowNextLater).mockReturnValue({
      now: { title: 'BBC News', start: now - 1000, stop: now + 1000 },
      next: null,
      later: null,
    })
    render(<NowBadge channel={channel} listId="list-1" urls={['u']} />)
    expect(screen.getByText('BBC News')).toBeInTheDocument()
    expect(screen.getByText(/now/i)).toBeInTheDocument()
  })

  it('renders nothing when NOW is null', () => {
    vi.mocked(useEpgNowNextLater).mockReturnValue({ now: null, next: null, later: null })
    const { container } = render(<NowBadge channel={channel} listId="list-1" urls={['u']} />)
    expect(container).toBeEmptyDOMElement()
  })
})
