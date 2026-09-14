import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { TV_SCENE_BOX_ATTR, TV_SCENE_NARROW_ATTR, TV_SCENE_PHONE_ATTR, __resetForTests, __setTvModeForTests, writePluginJson } from '@/lib/plugin-sdk'
import { seedLiveTvIndex } from '../../src/__test-stubs__/live-tv-index'
import { LIVE_TV_PLUGIN_ID, channelKey, type LiveTvList } from '../live-tv-data'
import { encodeChannelParams } from '../live-tv-shell'
import { PHONE_HIT_MIN_DP, PHONE_TEXT_MIN_DP } from './tv-ui'

// Spelaren behöver inte finnas för att vyerna ska ritas.
vi.mock('../live-tv-player', () => ({ LiveTvPlayer: () => null }))

import { LiveTvTvShell } from './tv-shell'

const ch = (name: string, group: string) => ({ name, logo: null, group, url: `http://x/${name}`, tvgId: null })
const channelA = ch('A', 'Sport')
const list: LiveTvList = { id: 'l1', name: 'Xtream', channels: [channelA, ch('B', 'News')], createdAt: '', urlTvg: null, epgUrls: [], autoEpgDisabled: false, fetchedAt: null }

// Varje vy som skalet kan slå upp (`TV_VIEWS`, tv-views.tsx). Testerna är
// avsiktligt breda: de ska fälla VARJE vy som glömts bort, inte bara den man
// råkar ändra — se M-P4 i planen.
//
// KÄND BEGRÄNSNING (fixrunda 1, granskningsfynd): sviten monterar bara varje
// vys STANDARDLÄGE — hubben som den ser ut direkt efter montering, guiden i
// Nu-läge, osv. Den öppnar INGA dialoger (textprompten, kanal-/listväljaren,
// PIN-grinden), byter INTE guidens läge till Tablå/Rutnät/Spellistor, och
// startar ingen uppspelning (spelaren mockas bort helt, se ovan — kromet
// testas därför inte här alls). Text eller träffytor som bara finns bakom en
// sådan handling kan alltså glida under golven utan att detta test märker
// det. Golv i sådana ytor har hittills lagts till manuellt när de rörts
// (spelarkromet, guidens rutnät/spellistor, de delade panelerna) — inte för
// att sviten bevisat att de behövs.
const VIEW_PARAMS: Record<string, Record<string, string>> = {
  hub: {},
  guide: { view: 'guide' },
  favs: { view: 'favs' },
  channel: { view: 'channel', ...encodeChannelParams(channelA) },
  search: { view: 'search' },
  multi: { view: 'multi' },
  settings: { view: 'settings' },
}

let box: HTMLElement | null = null

afterEach(() => {
  cleanup()
  box?.remove()
  box = null
})

beforeEach(() => {
  __resetForTests()
  __setTvModeForTests(false)
  writePluginJson(LIVE_TV_PLUGIN_ID, 'lists', [list])
  writePluginJson(LIVE_TV_PLUGIN_ID, 'pins', [channelKey(channelA)])
  seedLiveTvIndex()
})

/** Lådan märks som telefon precis som värdens `applyTvSceneBox` gör. */
function renderViewOnPhone(view: string) {
  box = document.createElement('div')
  box.setAttribute(TV_SCENE_BOX_ATTR, '1')
  box.setAttribute(TV_SCENE_NARROW_ATTR, '1')
  box.setAttribute(TV_SCENE_PHONE_ATTR, '1')
  document.body.appendChild(box)
  return render(<LiveTvTvShell pageId="live-tv-browse" params={VIEW_PARAMS[view]} onNavigate={() => {}} onOpenDetails={() => {}} />, { container: box })
}

describe.each(Object.keys(VIEW_PARAMS))('Telefonens golv — vyn %s', (view) => {
  it('inget tryckbart element är lägre än träffytegolvet', () => {
    renderViewOnPhone(view)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    for (const el of buttons) {
      // minHeight, inte height: jsdom/happy-dom räknar aldrig ut ett flödes
      // height i förväg, så `height` ger tom sträng och NaN (M-P2).
      const h = Number.parseFloat(getComputedStyle(el).minHeight || '0')
      expect(h).toBeGreaterThanOrEqual(PHONE_HIT_MIN_DP)
    }
  })

  it('ingen text är mindre än teckengolvet', () => {
    renderViewOnPhone(view)
    const texts = box!.querySelectorAll<HTMLElement>('[style*="font-size"]')
    for (const el of texts) {
      const size = Number.parseFloat(el.style.fontSize)
      if (Number.isFinite(size)) expect(size).toBeGreaterThanOrEqual(PHONE_TEXT_MIN_DP)
    }
  })
})
