'use client'

import { LtRows, LtToggleRow } from '../settings-ui'
import { MobileToggle } from '../tv/mobile/mobile-toggle'
import { MT } from '../tv/mobile/mobile-tokens'
import { HINT_SIZE, HINT_SIZE_PHONE, Row } from '../tv/settings-tabs'
import { Toggle, dp } from '../tv/tv-ui'
import { useTvText } from '../tv/tv-strings'
import { setSportSettings, useSportSettings } from './sport-store'

/**
 * Dölj resultat i repriser (Soffläge Sport fas 3). På som standard. Samma
 * ställen som bakgrundsinställningarna: TV:ns och telefonens sportflik och
 * skrivbordets sportkort.
 */
export function SportSpoilerSettingsTv({ phone = false }: { phone?: boolean }) {
  const { tt } = useTvText()
  const on = useSportSettings().spoilerReplays
  return (
    <section data-testid="sport-spoiler-settings-tv" style={{ display: 'flex', flexDirection: 'column', gap: phone ? 6 : dp(8), paddingBottom: phone ? 14 : 0 }}>
      {/* Raden är en station (OK växlar): fjärren når den som alla andra rader. */}
      <Row phone={phone} testId="sport-spoiler-toggle" label={tt('sportSpoilerSetting')} right={phone ? <MobileToggle on={on} /> : <Toggle on={on} />} onOk={() => setSportSettings({ spoilerReplays: !on })} />
      <div style={{ fontSize: phone ? HINT_SIZE_PHONE : HINT_SIZE, lineHeight: 1.45, color: phone ? MT.dim : 'rgba(243,244,248,0.6)', padding: phone ? '0 14px' : 0 }}>{tt('sportSpoilerSettingHint')}</div>
    </section>
  )
}

export function SportSpoilerSettingsDesktop() {
  const { tt } = useTvText()
  const on = useSportSettings().spoilerReplays
  return (
    <div data-testid="sport-spoiler-settings">
      <LtRows>
        <LtToggleRow testId="sport-spoiler-toggle" label={tt('sportSpoilerSetting')} desc={tt('sportSpoilerSettingHint')} checked={on} onChange={(v) => setSportSettings({ spoilerReplays: v })} />
      </LtRows>
    </div>
  )
}
