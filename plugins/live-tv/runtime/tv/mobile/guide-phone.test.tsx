import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { mountPhone } from './__phone-mount'
import { getGuideMode } from '../tv-settings-store'
import { phoneGuideMode } from './guide-phone'

// Spelaren (runtime/live-tv-player, två steg upp) mockas till en markör så
// att "tryck på rad spelar" kan läsas av.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

describe('Guiden · Nu på telefon', () => {
  it('segment Now/Timeline/Lists, chips, kanalrader; ingen förhandsvisning', async () => {
    mountPhone({ view: 'guide' })
    expect(await screen.findByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Lists')).toBeInTheDocument()
    expect(screen.getByTestId('guide-phone')).toBeInTheDocument()
    expect(screen.getByTestId('guide-groups')).toBeInTheDocument()
    expect(screen.getAllByTestId('guide-row').length).toBeGreaterThan(0)
    // TvPreview bär ingen testid — dess etikett är det enda som skiljer den ut.
    expect(screen.queryByText(/OK = fullscreen/)).toBeNull()
    expect(screen.queryByTestId('guide-headline')).toBeNull()
    expect(screen.queryByTestId('guide-clock')).toBeNull()
  })
  it('ett lagrat "tl" visas som Now', async () => {
    mountPhone({ view: 'guide' }, { guideMode: 'tl' })
    expect((await screen.findByText('Now')).closest('[aria-pressed]')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Timeline').closest('[aria-pressed]')).toHaveAttribute('aria-pressed', 'false')
    // Ingen tablårad: nu-linjen finns bara i TV:ns tablåläge.
    expect(screen.queryByTestId('now-line')).toBeNull()
  })
  it('phoneGuideMode: tl → now, övriga oförändrade', () => {
    expect(phoneGuideMode('tl')).toBe('now')
    expect(phoneGuideMode('now')).toBe('now')
    expect(phoneGuideMode('grid')).toBe('grid')
    expect(phoneGuideMode('playlists')).toBe('playlists')
  })
  // Den städade guidens (skrivbord/TV) egna lägen, normaliserade för telefon.
  it('phoneGuideMode: nownext → now, timeline → grid', () => {
    expect(phoneGuideMode('nownext')).toBe('now')
    expect(phoneGuideMode('timeline')).toBe('grid')
  })
  it('segmentbyte skriver bara now/grid/playlists och Timeline ger grid', async () => {
    mountPhone({ view: 'guide' })
    fireEvent.click(await screen.findByText('Timeline'))
    expect(getGuideMode()).toBe('grid')
  })
  it('tryck på rad spelar', async () => {
    mountPhone({ view: 'guide' })
    fireEvent.click((await screen.findAllByTestId('guide-row'))[0])
    expect(await screen.findByTestId('player')).toHaveTextContent('A')
  })
  it('håll på rad öppnar bottenark', async () => {
    vi.useFakeTimers()
    mountPhone({ view: 'guide' })
    const row = (await screen.findAllByTestId('guide-row'))[0]
    fireEvent.pointerDown(row, { pointerType: 'touch', button: 0 })
    vi.advanceTimersByTime(700)
    vi.useRealTimers()
    expect(await screen.findByRole('dialog')).toHaveTextContent('Watch now')
  })
  it('chip filtrerar', async () => {
    mountPhone({ view: 'guide' })
    fireEvent.click(await screen.findByTestId('chip-News'))
    const rows = screen.getAllByTestId('guide-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('C')
  })
  it('tomt läge: centrerad tomtext', async () => {
    const empty = { id: 'l1', name: 'Tom', channels: [], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
    mountPhone({ view: 'guide' }, { lists: [empty], pins: [] })
    const text = await screen.findByText('No channels in this category')
    expect(text).toHaveStyle({ textAlign: 'center' })
    expect(screen.queryByTestId('guide-row')).toBeNull()
  })
  it('inga fjärrkontrollstexter', async () => {
    const { box } = mountPhone({ view: 'guide' })
    await screen.findAllByTestId('guide-row')
    expect(box.textContent).not.toMatch(/\bOK\b|håll|hold OK/)
  })
})
