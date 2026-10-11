'use client'

import { useState } from 'react'
import { LtBtn, LtNote, LtRows, LtSection, LtTextRow, hostOf } from '../settings-ui'
import { Heading, Row } from '../tv/settings-tabs'
import { useTextPrompt } from '../tv/tv-text-entry'
import { useTvText, type TvStringKey } from '../tv/tv-strings'
import { useHomeBackgrounds } from './backdrop'
import { setSportSettings, useSportSettings, type SportBackdropCustom, type SportBackdropMode } from './sport-store'

const MODES: SportBackdropMode[] = ['auto', 'custom', 'off']
const MODE_LABEL: Record<SportBackdropMode, TvStringKey> = { auto: 'sportBackdropAuto', custom: 'sportBackdropCustom', off: 'sportBackdropOff' }
const isHttp = (v: string) => /^https?:\/\/\S+$/i.test(v.trim())
const pick = (c: SportBackdropCustom) => setSportSettings({ backdrop: 'custom', backdropCustom: c })

export function SportBackdropSettingsDesktop() {
  const { tt } = useTvText()
  const s = useSportSettings()
  const home = useHomeBackgrounds()
  const [link, setLink] = useState(s.backdropCustom?.from === 'url' ? s.backdropCustom.url : '')
  return (
    <div data-testid="sport-backdrop-settings">
      <LtSection title={tt('sportBackdropTitle')} hint={tt('sportBackdropHint')} />
      <LtRows>
        <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
          {MODES.map((m) => (
            <LtBtn key={m} testId={`sport-backdrop-${m}`} active={s.backdrop === m} onClick={() => setSportSettings({ backdrop: m })}>{tt(MODE_LABEL[m])}</LtBtn>
          ))}
        </div>
        {s.backdrop === 'custom' ? (
          <>
            {home.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
                {home.map((url, index) => {
                  const on = s.backdropCustom?.from === 'home' && s.backdropCustom.index === index
                  return (
                    <button
                      key={index}
                      type="button"
                      data-testid={`sport-backdrop-home-${index}`}
                      aria-pressed={on}
                      onClick={() => pick({ from: 'home', index })}
                      style={{ width: 120, height: 68, padding: 0, borderRadius: 8, cursor: 'pointer', borderWidth: 2, borderStyle: 'solid', borderColor: on ? 'rgb(var(--accent-500))' : 'transparent', background: `center / cover no-repeat url("${url.replace(/"/g, '%22')}")` }}
                    />
                  )
                })}
              </div>
            ) : (
              <LtNote>{tt('sportBackdropNoHome')}</LtNote>
            )}
            <LtTextRow
              label={tt('sportBackdropLink')}
              value={link}
              onChange={setLink}
              placeholder="https://…"
              button={tt('sportBackdropUse')}
              buttonDisabled={!isHttp(link)}
              onButton={() => { if (isHttp(link)) pick({ from: 'url', url: link }) }}
              onEnter={() => { if (isHttp(link)) pick({ from: 'url', url: link }) }}
              testId="sport-backdrop-link"
            />
          </>
        ) : null}
      </LtRows>
    </div>
  )
}

export function SportBackdropSettingsTv({ phone = false, pushLayer }: { phone?: boolean; pushLayer?: (close: () => void) => () => void }) {
  const { tt } = useTvText()
  const s = useSportSettings()
  const home = useHomeBackgrounds()
  const prompt = useTextPrompt({ pushLayer })
  const nextMode = MODES[(MODES.indexOf(s.backdrop) + 1) % MODES.length]!
  const homeRight = s.backdropCustom?.from === 'home'
    ? tt('sportBackdropHomeN', { n: s.backdropCustom.index + 1, total: home.length })
    : home.length > 0 ? tt('sportBackdropNone') : tt('sportBackdropNoHomeShort')
  const nextHome = () => {
    if (home.length === 0) return
    const index = s.backdropCustom?.from === 'home' ? (s.backdropCustom.index + 1) % home.length : 0
    pick({ from: 'home', index })
  }
  const askLink = () => prompt.ask(tt('sportBackdropLink'), s.backdropCustom?.from === 'url' ? s.backdropCustom.url : '', (value) => {
    if (isHttp(value)) pick({ from: 'url', url: value })
  }, 'url')
  return (
    <div data-testid="sport-backdrop-settings-tv">
      <Heading phone={phone} hint={tt('sportBackdropHint')}>{tt('sportBackdropTitle')}</Heading>
      <Row phone={phone} testId="sport-backdrop-mode" label={tt('sportBackdropTitle')} right={tt(MODE_LABEL[s.backdrop])} onOk={() => setSportSettings({ backdrop: nextMode })} />
      {s.backdrop === 'custom' ? (
        <>
          <Row phone={phone} testId="sport-backdrop-home" label={tt('sportBackdropFromHome')} right={homeRight} onOk={nextHome} />
          <Row phone={phone} testId="sport-backdrop-link-tv" label={tt('sportBackdropLink')} right={s.backdropCustom?.from === 'url' ? hostOf(s.backdropCustom.url) : ''} onOk={askLink} />
        </>
      ) : null}
      {prompt.node}
    </div>
  )
}
