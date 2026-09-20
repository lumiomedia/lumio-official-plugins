import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { M3uChannel } from '../live-tv-data'
import { GuideDetailPanel } from './guide-detail-panel'

/**
 * Den permanenta detaljpanelen (handoffen §1 "Detaljpanel"): ritas ALLTID,
 * även utan markering, och byter innehåll med markeringen — ingen toggle.
 */
const now = Date.now()
const ch = (name: string): M3uChannel => ({ name, logo: null, group: 'Sport', url: `http://x/${name}`, tvgId: null })
const live = { title: 'Live now', start: now - 30 * 60_000, stop: now + 30 * 60_000, description: 'Beskrivning' }
const future = { title: 'Later on', start: now + 60 * 60_000, stop: now + 90 * 60_000 }

const base = {
  nowMs: now,
  locale: 'en-GB',
  channelNumber: 7 as number | null,
  onWatch: vi.fn(),
  onRemind: vi.fn(),
  onToggleFavourite: vi.fn(),
  favourite: false,
  reminded: false,
}

afterEach(cleanup)

describe('GuideDetailPanel', () => {
  it('låter bara beskrivningen ge med sig — panelen rullar, den klämmer inte ihop raderna', () => {
    // Panelen är en rullande flex-kolumn. Utan flex-shrink: 0 krympte flex
    // varje barn när innehållet inte fick plats, och eftersom raderna har
    // fasta höjder och overflow: hidden blev resultatet AVKLIPPT text i
    // stället för en rullningslist: kanalraden och titeln låg halva bakom
    // bildrutan (Jerry 2026-09-20, ett markerat program i Grid).
    render(<GuideDetailPanel {...base} selection={{ channel: ch('A'), programme: live }} />)
    for (const id of ['detail-channel', 'detail-title', 'detail-time']) {
      expect(screen.getByTestId(id).style.flexShrink).toBe('0')
    }
    // Beskrivningen är undantaget: den är det enda som får krympa/rulla.
    expect(screen.getByTestId('detail-description').style.flexShrink).toBe('')
  })

  it('finns utan markering och visar tomtexten', () => {
    render(<GuideDetailPanel {...base} selection={null} />)
    const panel = screen.getByTestId('guide-detail-panel')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('Select a programme to see details')
    expect(screen.queryByTestId('detail-watch')).not.toBeInTheDocument()
  })

  it('pågående program: LIVE, nr · namn, titel, minuter kvar, förlopp, beskrivning, Titta nu + Favorit — ingen påminnelse', () => {
    render(<GuideDetailPanel {...base} selection={{ channel: ch('A'), programme: live }} />)
    const panel = screen.getByTestId('guide-detail-panel')
    expect(panel).toHaveTextContent('LIVE')
    expect(screen.getByTestId('detail-channel')).toHaveTextContent('7 · A')
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Live now')
    expect(screen.getByTestId('detail-time')).toHaveTextContent('30 min left')
    expect(panel.querySelector('[data-fill]')).toHaveStyle({ width: '50%' })
    expect(screen.getByTestId('detail-description')).toHaveTextContent('Beskrivning')
    expect(screen.getByTestId('detail-description')).toHaveAttribute('data-selectable-text')
    fireEvent.click(screen.getByTestId('detail-watch'))
    expect(base.onWatch).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('detail-favourite'))
    expect(base.onToggleFavourite).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('detail-remind')).not.toBeInTheDocument()
  })

  it('kommande program: Påminn mig finns, ingen LIVE-tagg och inget förlopp', () => {
    render(<GuideDetailPanel {...base} selection={{ channel: ch('A'), programme: future }} />)
    const panel = screen.getByTestId('guide-detail-panel')
    expect(panel).not.toHaveTextContent('LIVE')
    expect(panel.querySelector('[data-fill]')).toBeNull()
    fireEvent.click(screen.getByTestId('detail-remind'))
    expect(base.onRemind).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('detail-remind')).toHaveTextContent('Remind me')
  })

  it('satt påminnelse och favorit speglas i knapparna', () => {
    render(<GuideDetailPanel {...base} selection={{ channel: ch('A'), programme: future }} reminded favourite />)
    expect(screen.getByTestId('detail-remind')).toHaveTextContent('Reminder set')
    expect(screen.getByTestId('detail-favourite')).toHaveAttribute('data-active')
  })

  it('kanal utan program: kanalraden och Titta nu finns, titeln säger att tablå saknas', () => {
    render(<GuideDetailPanel {...base} selection={{ channel: ch('B'), programme: null }} channelNumber={null} />)
    expect(screen.getByTestId('detail-channel')).toHaveTextContent('B')
    expect(screen.getByTestId('detail-title')).toHaveTextContent('No programme information')
    expect(screen.getByTestId('detail-watch')).toBeInTheDocument()
    expect(screen.queryByTestId('detail-remind')).not.toBeInTheDocument()
  })
})
