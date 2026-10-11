import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TvRail } from './tv-rail'
import { belowTitleBar } from './tv-ui'
import { TvPanel } from '../tv-settings-ui'
import { PickerPanel } from './tv-list-picker'
import { TvChannelPicker } from './tv-channel-picker'
import type { TvNav } from './tv-shell'
import type { LiveTvModel } from '../live-tv-model'

const nav = { pushLayer: () => () => {} } as unknown as TvNav

/*
  HELA FÖNSTRETS HÖJD PÅ SKRIVBORDET (Jerry 2026-10-11).
  Värdens scenlåda och ram går nu ända upp och ner; mac-appens titelrad hålls
  fri av innehållet. Värden exponerar marginalen i designpx som
  --tv-scene-top-inset i scenlagren (0 utanför Tauri och i TV-läget).
*/
const VAR = 'var(--tv-scene-top-inset, 0px)'
/*
  Serverrendering och inte happy-dom: happy-dom kastar varje stilvärde med
  var() i calc() (samma fälla som appens happy-dom-tester), så en DOM-läsning
  hade sett en tom padding. Markupen är exakt det React skriver.
*/
const styleOf = (ui: ReactElement, testId: string): string => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(ui)
  return host.querySelector(`[data-testid="${testId}"]`)?.outerHTML.match(/style="([^"]*)"/)?.[1] ?? ''
}

describe('titelradsmarginalen i scenen', () => {
  it('belowTitleBar lägger marginalen ovanpå designpaddingen', () => {
    expect(belowTitleBar(36)).toBe(`calc(36px + ${VAR})`)
  })
  it('rälsen skjuter ner sitt innehåll (L-brickan) i stället för att lådan flyttas', () => {
    expect(styleOf(<TvRail active="home" onSelect={() => {}} isTv={false} narrow={false} labels />, 'tv-rail')).toContain(VAR)
  })
  it('smal räls också', () => {
    expect(styleOf(<TvRail active="home" onSelect={() => {}} isTv={false} narrow labels={false} />, 'tv-rail')).toContain(VAR)
  })
  it('högerlådan (Följer-väljaren, Fler ligor, listväljaren) går fri från titelraden upptill', () => {
    expect(styleOf(<PickerPanel nav={nav} title="Add teams" chips={null} rows={null} onClose={() => {}} testId="pp" />, 'pp')).toContain(VAR)
  })
  it('kanalväljaren också', () => {
    const model = { channels: [], groups: [], favouriteChannels: [], nowFor: () => ({ now: null, next: null, later: null }), channelNumber: () => 1 } as unknown as LiveTvModel
    expect(styleOf(<TvChannelPicker nav={nav} model={model} title="Channels" onPick={() => {}} onClose={() => {}} />, 'channel-picker')).toContain(VAR)
  })
  it('inställningspanelen går fri från titelraden upptill', () => {
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(<TvPanel title="T" onBack={() => {}} testId="p">x</TvPanel>)
    const sheet = host.querySelector('[data-tv-panel-sheet]')?.outerHTML.match(/style="([^"]*)"/)?.[1] ?? ''
    expect(sheet).toContain(VAR)
  })
})
