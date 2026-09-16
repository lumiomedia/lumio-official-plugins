import { afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../../live-tv-data'
import { LiveTvTvShell } from '../tv-shell'

/**
 * Delad monteringshjälp för telefonvyernas tester (fas 3, Task 4→).
 *
 * Testfilen som använder den ska själv mocka spelaren
 * (`vi.mock('../live-tv-player', …)`) — `vi.mock` hissas bara i den fil den
 * står i, så den kan inte bo här.
 *
 * Fixturen: tre kanaler i två grupper (A, B i Sport · C i News) och A som
 * favorit — tillräckligt för spotlight, favoritband, chips och rutnät i
 * samma montering. `opts.lists`/`opts.pins` byter ut den.
 */
export const phoneChannel = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
export const phoneList: LiveTvList = { id: 'l1', name: 'Xtream', channels: [phoneChannel('A', 'Sport'), phoneChannel('B', 'Sport'), phoneChannel('C', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }
export const phonePins = [channelKey({ name: 'A', url: 'http://x/A' })]

// Lådan som `render(page, { container })` skriver in i — måste bort efter
// varje test: en kvarglömd låda stör `document.querySelector` i nästa test.
let currentBox: HTMLElement | null = null

afterEach(() => {
  cleanup()
  currentBox?.remove()
  currentBox = null
})

export interface MountPhoneOptions {
  lists?: LiveTvList[]
  pins?: string[]
  /** `false` monterar samma sida utan telefonattribut (skrivbordsjämförelse). */
  phone?: boolean
}

/** Monterar skalet i en låda märkt som värdens `applyTvSceneBox` gör på en telefon. */
export function mountPhone(params: Record<string, string> = {}, opts: MountPhoneOptions = {}) {
  __resetForTests()
  __setTvModeForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', opts.lists ?? [phoneList])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', opts.pins ?? phonePins)
  seedLiveTvIndex()
  const onNavigate = vi.fn()
  const page = <LiveTvTvShell pageId="live-tv-browse" params={params} onNavigate={onNavigate} onOpenDetails={() => {}} />
  const box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  if (opts.phone !== false) {
    box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
    box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  }
  document.body.appendChild(box)
  currentBox = box
  return { onNavigate, box, ...render(page, { container: box }) }
}
