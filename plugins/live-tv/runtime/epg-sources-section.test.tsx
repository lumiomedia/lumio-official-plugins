import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EpgSourcesSection } from './epg-sources-section'

afterEach(() => {
  cleanup()
})

describe('EpgSourcesSection', () => {
  it('shows the auto-discovered url with an Auto pill', () => {
    render(
      <EpgSourcesSection
        autoUrl="https://example.com/guide.xml"
        manualUrls={[]}
        onChangeManual={() => {}}
      />,
    )
    expect(screen.getByText('https://example.com/guide.xml')).toBeInTheDocument()
    expect(screen.getByText('Auto')).toBeInTheDocument()
  })

  it('lists every manual url with a remove button', () => {
    render(
      <EpgSourcesSection
        autoUrl={null}
        manualUrls={['https://a.example/epg.xml', 'https://b.example/epg.xml']}
        onChangeManual={() => {}}
      />,
    )
    expect(screen.getByText('https://a.example/epg.xml')).toBeInTheDocument()
    expect(screen.getByText('https://b.example/epg.xml')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(2)
  })

  it('calls onChangeManual with appended url when Add is clicked', () => {
    const handle = vi.fn()
    render(
      <EpgSourcesSection
        autoUrl={null}
        manualUrls={['https://existing.example/epg.xml']}
        onChangeManual={handle}
      />,
    )
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'https://new.example/epg.xml' } })
    fireEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(handle).toHaveBeenCalledWith([
      'https://existing.example/epg.xml',
      'https://new.example/epg.xml',
    ])
  })

  it('calls onChangeManual without the removed url when Remove is clicked', () => {
    const handle = vi.fn()
    render(
      <EpgSourcesSection
        autoUrl={null}
        manualUrls={['https://a.example/epg.xml', 'https://b.example/epg.xml']}
        onChangeManual={handle}
      />,
    )
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeButtons[0])
    expect(handle).toHaveBeenCalledWith(['https://b.example/epg.xml'])
  })

  it('shows the empty-state nudge when both lists are empty', () => {
    render(
      <EpgSourcesSection autoUrl={null} manualUrls={[]} onChangeManual={() => {}} />,
    )
    expect(screen.getByText(/no epg sources yet/i)).toBeInTheDocument()
  })
})
