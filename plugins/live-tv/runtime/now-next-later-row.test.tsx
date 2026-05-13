import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NowNextLaterRow } from './now-next-later-row'

vi.mock('./hooks/useEpgNowNextLater', () => ({ useEpgNowNextLater: vi.fn() }))
vi.mock('./hooks/useEpgLoadStatus', () => ({ useEpgLoadStatus: vi.fn(() => 'ready') }))

import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import { useEpgLoadStatus } from './hooks/useEpgLoadStatus'

const channel = {
  name: 'BBC One',
  logo: null,
  group: 'UK',
  url: 'http://x',
  tvgId: 'BBCOne.uk',
}

beforeEach(() => {
  vi.mocked(useEpgLoadStatus).mockReturnValue('ready')
})

describe('NowNextLaterRow', () => {
  it('renders NOW/NEXT/LATER cards when data exists', () => {
    const now = Date.now()
    vi.mocked(useEpgNowNextLater).mockReturnValue({
      now: { title: 'BBC News', start: now - 60_000, stop: now + 60_000, description: 'd' },
      next: { title: 'Breakfast', start: now + 60_000, stop: now + 120_000 },
      later: { title: 'Match', start: now + 120_000, stop: now + 180_000 },
    })
    render(<NowNextLaterRow channel={channel} listId="list-1" urls={['u']} />)
    expect(screen.getByText('BBC News')).toBeInTheDocument()
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getByText('Match')).toBeInTheDocument()
  })

  it('renders empty-state when status is "empty"', () => {
    vi.mocked(useEpgLoadStatus).mockReturnValue('empty')
    vi.mocked(useEpgNowNextLater).mockReturnValue({ now: null, next: null, later: null })
    render(<NowNextLaterRow channel={channel} listId="list-1" urls={[]} />)
    expect(screen.getByText(/no guide/i)).toBeInTheDocument()
  })
})
