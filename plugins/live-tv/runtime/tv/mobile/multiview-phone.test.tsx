import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { writePluginJson } from '@/lib/plugin-sdk'
import { LIVE_TV_PLUGIN_ID, channelKey } from '../../live-tv-data'
import { MULTIVIEW_KEY, getMultiviewState } from '../tv-multiview-store'
import { mountPhone, phoneChannel, phoneList } from './__phone-mount'

// Spelaren mockas som i övriga telefontester — Fullscreen-knappen kan
// trigga nav.play(), som annars hade krävt en riktig spelarkomponent.
vi.mock('../../live-tv-player', () => ({ LiveTvPlayer: ({ channel }: { channel: { name: string } }) => <div data-testid="player">{channel.name}</div> }))

const keyA = channelKey(phoneChannel('A', 'Sport'))
const keyB = channelKey(phoneChannel('B', 'Sport'))
const keyC = channelKey(phoneChannel('C', 'News'))

/**
 * Multivyns lager (MULTIVIEW_KEY) nollställs av `mountPhone`s interna
 * `__resetForTests()` (samma fälla som `guideMode` i `__phone-mount.tsx`),
 * så det skrivs EFTER montering — `useMultiviewState` prenumererar på
 * lagringsändringar och ritar om, `waitFor` väntar in den omritningen.
 */
async function mountMulti(tiles: (string | null)[] = [keyA, keyB, keyC, null], audioIndex = 0) {
  mountPhone({ view: 'multi' }, { lists: [phoneList] })
  writePluginJson(LIVE_TV_PLUGIN_ID, MULTIVIEW_KEY, { layout: 4, tiles, audioIndex })
  await waitFor(() => expect(screen.getAllByTestId('mv-tile')).toHaveLength(2))
}

describe('Multivy på telefon', () => {
  it('visar exakt två rutor även när det sparade laget har fyra', async () => {
    await mountMulti()
    expect(screen.getAllByTestId('mv-tile')).toHaveLength(2)
  })

  it('ingen lägesväxel på telefon — kapacitetsetiketterna finns inte', async () => {
    await mountMulti()
    expect(screen.queryByText('2 tiles')).toBeNull()
    expect(screen.queryByText('1 + 2')).toBeNull()
    expect(screen.queryByText('4 tiles')).toBeNull()
  })

  it('tom ruta öppnar kanalarket', async () => {
    await mountMulti([keyA, null, null, null], 0)
    fireEvent.click(screen.getAllByTestId('mv-tile')[1])
    expect(screen.getByTestId('mv-picker-sheet')).toBeInTheDocument()
  })

  it('val i kanalarket tilldelar den tomma rutan', async () => {
    await mountMulti([keyA, null, null, null], 0)
    fireEvent.click(screen.getAllByTestId('mv-tile')[1])
    fireEvent.click(await screen.findByText('B'))
    expect(getMultiviewState().tiles[1]).toBe(keyB)
    expect(screen.queryByTestId('mv-picker-sheet')).toBeNull()
  })

  it('Swap byter plats på de två synliga rutorna och ljudet följer med', async () => {
    await mountMulti()
    fireEvent.click(screen.getByTestId('mv-swap'))
    expect(getMultiviewState().tiles[0]).toBe(keyB)
    expect(getMultiviewState().tiles[1]).toBe(keyA)
    expect(getMultiviewState().audioIndex).toBe(1)
  })

  it('tryck på den andra rutan flyttar ljudet dit', async () => {
    await mountMulti()
    fireEvent.click(screen.getAllByTestId('mv-tile')[1])
    expect(getMultiviewState().audioIndex).toBe(1)
  })
})
