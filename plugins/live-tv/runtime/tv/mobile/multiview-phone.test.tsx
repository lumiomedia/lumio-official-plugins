import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { TV_SCENE_PHONE_ATTR, writePluginJson } from '@/lib/plugin-sdk'
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
    fireEvent.click(await screen.findByText('B', { ignore: '[data-initials]' }))
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

  // Slutgranskningen: `phone` kan slå om vid körning (rotation). Telefon- och
  // skrivbordsgrenen är två komponenter, så bytet får inte ge "rendered more
  // hooks" — skrivbordets ljudhjälp ska bara dyka upp.
  it('phone-flaggan slår om vid körning utan hook-krasch (telefon → skrivbord)', async () => {
    await mountMulti()
    const box = document.querySelector<HTMLElement>(`[${TV_SCENE_PHONE_ATTR}]`)!
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => { act(() => { box.removeAttribute(TV_SCENE_PHONE_ATTR) }) }).not.toThrow()
    await waitFor(() => expect(screen.getByTestId('mv-audio-help')).toBeInTheDocument())
    expect(screen.queryByTestId('multiview-phone')).toBeNull()
    expect(errors.mock.calls.some((c) => String(c[0]).includes('hooks'))).toBe(false)
    errors.mockRestore()
  })
})
