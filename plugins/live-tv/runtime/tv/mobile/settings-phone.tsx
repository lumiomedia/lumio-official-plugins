'use client'

import type { ReactNode } from 'react'
import type { TvViewProps } from '../tv-shell'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { setGuideMode, setTvSettings, useGuideMode } from '../tv-settings-store'
import { EpgTab, ParentalTab, PhoneCaret, PlaylistsTab } from '../settings-tabs'
import { MT, ellipsis, sectionLabel } from './mobile-tokens'
import { MobileHeader } from './mobile-header'
import { MobileSegment } from './mobile-segment'
import { MobileToggle } from './mobile-toggle'
import { phoneGuideMode, type PhoneGuideMode } from './guide-phone'

/**
 * Inställningar på telefon (fas 3, Task 12, handoffen §9). Flikkolumnen
 * ersätts av en sektionslista: Spellistor · Guidens standardvy · Beteende ·
 * Mer. EPG-källor och Föräldrakontroll är egna undersidor (`params.tab`)
 * med Bakåt i sidhuvudet. TV-valen `previewEnabled`/`numericZap`/
 * `bannerHideMs` renderas inte här, och accentfärgen ligger kvar i appens
 * egna utseendeinställningar.
 *
 * Flikinnehållet kommer ur `settings-tabs.tsx` med `phone` — INTE ur
 * `tv-settings.tsx`, som importerar den här filen (cykelregeln).
 */
export function TvSettingsPhone(props: TvViewProps) {
  const { model, nav, params, settings } = props
  const { tt, locale } = useTvText()
  const guideMode = useGuideMode()

  if (params.tab === 'epg' || params.tab === 'parental') {
    const epg = params.tab === 'epg'
    return (
      <PhonePage header={<MobileHeader title={tt(epg ? 'tabEpg' : 'tabParental')} back onBack={() => nav.go('settings')} />}>
        <Card>
          {epg
            ? <EpgTab lists={model.lists} nav={nav} tt={tt} locale={locale} phone />
            : <ParentalTab model={model} tt={tt} phone />}
        </Card>
      </PhonePage>
    )
  }

  const modes: { key: PhoneGuideMode; label: string }[] = [
    { key: 'now', label: tt('phoneModeNow') },
    { key: 'grid', label: tt('phoneModeTimeline') },
    { key: 'playlists', label: tt('phoneModeLists') },
  ]

  return (
    <PhonePage header={<MobileHeader title={tt('railSettings')} />}>
      <Section label={tt('sectionPlaylists')}>
        <Card>
          <PlaylistsTab model={model} nav={nav} lists={model.lists} tt={tt} locale={locale} toast={nav.toast} phone />
        </Card>
      </Section>

      <Section label={tt('sectionGuide')}>
        <MobileSegment height={38} options={modes} value={phoneGuideMode(guideMode)} onChange={setGuideMode} testId="guide-default" />
      </Section>

      <Section label={tt('sectionBehaviour')}>
        <Card>
          <ToggleRow testId="setting-startOnLastChannel" label={tt('settingStartLast')} on={settings.startOnLastChannel} onOk={() => setTvSettings({ startOnLastChannel: !settings.startOnLastChannel })} />
          <ToggleRow testId="setting-keepAwake" label={tt('settingKeepAwake')} on={settings.keepAwake} onOk={() => setTvSettings({ keepAwake: !settings.keepAwake })} />
          <ToggleRow testId="setting-fullscreenOnRotate" label={tt('settingFullscreenOnRotate')} on={settings.fullscreenOnRotate} onOk={() => setTvSettings({ fullscreenOnRotate: !settings.fullscreenOnRotate })} />
        </Card>
      </Section>

      <Section label={tt('sectionMore')}>
        <Card>
          <NavRow testId="settings-epg" label={tt('tabEpg')} onOk={() => nav.go('settings', { tab: 'epg' })} />
          <NavRow testId="settings-parental" label={tt('tabParental')} onOk={() => nav.go('settings', { tab: 'parental' })} />
        </Card>
      </Section>
    </PhonePage>
  )
}

/** Rullande kolumn med sidhuvudet överst och bottenluft för flik-raden. */
function PhonePage({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ margin: `0 -${MT.PAD}px` }}>{header}</div>
      {children}
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={sectionLabel}>{label}</div>
      {children}
    </section>
  )
}

/**
 * Kortet raderna ligger i. Varje rad bär sin egen linje under (`Row`,
 * `ListRow` … i `settings-tabs.tsx`), och den sista radens linje ska inte
 * dubblera kortets kant: innehållet dras upp 1 px så att `overflow hidden`
 * klipper just den linjen.
 */
function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ borderRadius: 14, background: MT.s06, border: `1px solid ${MT.line08}`, overflow: 'hidden' }}>
      <div style={{ marginBottom: -1 }}>{children}</div>
    </div>
  )
}

/** Togglerad: `minHeight` 56 (aldrig `height` — etiketten kan bli två rader). */
function ToggleRow({ label, on, onOk, testId }: { label: string; on: boolean; onOk: () => void; testId: string }) {
  return (
    <div data-testid={testId} {...station(onOk)} style={{ minHeight: 56, padding: '10px 14px', borderBottom: `1px solid ${MT.line07}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 15, cursor: 'pointer' }}>
      <span style={{ minWidth: 0 }}>{label}</span>
      <MobileToggle on={on} />
    </div>
  )
}

/** Navigeringsrad (52 px) med `›`. */
function NavRow({ label, onOk, testId }: { label: string; onOk: () => void; testId: string }) {
  return (
    <div data-testid={testId} {...station(onOk)} style={{ minHeight: 52, padding: '10px 14px', borderBottom: `1px solid ${MT.line07}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 15, cursor: 'pointer' }}>
      <span style={ellipsis}>{label}</span>
      <PhoneCaret />
    </div>
  )
}
