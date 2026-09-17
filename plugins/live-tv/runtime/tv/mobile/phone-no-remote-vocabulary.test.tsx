import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { flushLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { mountPhone } from './__phone-mount'

// Spelaren mockas som i övriga telefontester — vakten läser bara text.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

/**
 * Strängvakt (fas 3, Task 14): ingen telefonvy får läcka fjärrkontrollens
 * ordförråd — "OK", "håll OK"/"hold OK" eller pilglyferna ◂ ▸ som TV-skalet
 * använder i hjälpremsor och förhandsvisningens etikett. Varje vy monteras
 * på telefon och texten läses av när ett stabilt element finns på plats.
 */
const REMOTE_WORDS = /\bOK\b|håll OK|hold OK|◂|▸/

describe('Telefonvyerna använder inte fjärrkontrollens ordförråd', () => {
  it('hub', async () => {
    const { box } = mountPhone({ view: 'hub' })
    await screen.findByTestId('hub-spotlight')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
  it('guide · now', async () => {
    const { box } = mountPhone({ view: 'guide' }, { guideMode: 'now' })
    await screen.findByTestId('guide-phone')
    await screen.findAllByTestId('guide-row')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
  it('guide · grid', async () => {
    const { box } = mountPhone({ view: 'guide' }, { guideMode: 'grid' })
    await flushLiveTvIndex()
    await screen.findByTestId('grid-phone')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
  it('guide · playlists', async () => {
    const { box } = mountPhone({ view: 'guide' }, { guideMode: 'playlists' })
    await flushLiveTvIndex()
    await screen.findByTestId('lists-phone')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
  it('favs', async () => {
    const { box } = mountPhone({ view: 'favs' })
    await screen.findByTestId('fav-row')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
  it('search', async () => {
    const { box } = mountPhone({ view: 'search' })
    await screen.findByTestId('search-input')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
  it('multi', async () => {
    const { box } = mountPhone({ view: 'multi' })
    await screen.findByTestId('multiview-phone')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
  it('settings', async () => {
    const { box } = mountPhone({ view: 'settings' })
    await screen.findByTestId('setting-startOnLastChannel')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
  it('channel', async () => {
    const { box } = mountPhone({ view: 'channel', url: 'http://x/A', name: 'A', group: 'Sport' })
    await flushLiveTvIndex()
    await screen.findByTestId('channel-phone')
    expect(box.textContent).not.toMatch(REMOTE_WORDS)
  })
})
