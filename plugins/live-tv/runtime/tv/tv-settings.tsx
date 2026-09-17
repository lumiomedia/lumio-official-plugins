'use client'

import { useState } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import type { TvViewProps } from './tv-shell'
import { TV, Toggle, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { BANNER_HIDE_OPTIONS, setGuideMode, setTvSettings, useGuideMode, type BannerHideMs, type GuideMode, type TvSettings } from './tv-settings-store'
import { EpgTab, Heading, ParentalTab, PlaylistsTab, Row } from './settings-tabs'
import { TvSettingsPhone } from './mobile/settings-phone'
import { useNewGuideSurface } from './guide-surface'

type Tab = 'appearance' | 'playlists' | 'epg' | 'parental'
const TABS: Tab[] = ['appearance', 'playlists', 'epg', 'parental']

type AccentApi = { getAccent?: () => string; setAccent?: (id: string) => void; ACCENT_PRESETS?: Record<string, { label: string; shades: string[] }> }
const accentApi = sdk as unknown as AccentApi
const hasAccent = typeof accentApi.getAccent === 'function' && typeof accentApi.setAccent === 'function' && !!accentApi.ACCENT_PRESETS

/*
 * Radprimitiverna (`Row`, `Heading`, `Action`, `ListRow`) och flikarnas
 * innehåll bor sedan P12 i `settings-tabs.tsx`: telefonvyn
 * (`mobile/settings-phone.tsx`) återanvänder dem, och den får inte importera
 * den här filen (som importerar telefonvyn) — se projektregeln mot cykler.
 */

export function TvSettingsView(props: TvViewProps) {
  // Telefonen får sektionslistan i stället för flikkolumnen (fas 3, P12).
  if (props.phone) return <TvSettingsPhone {...props} />
  return <TvSettingsDesktop {...props} />
}

function TvSettingsDesktop({ model, nav, params, settings }: TvViewProps) {
  const { tt, locale } = useTvText()
  const initial = (TABS as string[]).includes(params.tab ?? '') ? (params.tab as Tab) : 'appearance'
  const [tab, setTab] = useState<Tab>(initial)
  const labels: Record<Tab, string> = { appearance: tt('tabAppearance'), playlists: tt('tabPlaylists'), epg: tt('tabEpg'), parental: tt('tabParental') }
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ width: dp(340), flexShrink: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(20)}px 0 ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(6) }}>
        <div style={{ fontSize: dp(30), fontWeight: 600, marginBottom: dp(16) }}>{tt('liveTv')}</div>
        {TABS.map((t) => (
          <div key={t} data-testid={`tab-${t}`} {...station(() => setTab(t), undefined, { ...(t === tab ? { 'data-init': '' } : {}), 'data-f-right': '[data-live-tv-settings-content] [data-f]' })} style={{ height: dp(60), minHeight: dp(60), borderRadius: dp(12), padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', fontSize: dp(20), background: t === tab ? TV.s12 : 'transparent', color: t === tab ? TV.text : TV.muted, cursor: 'pointer' }}>{labels[t]}</div>
        ))}
      </div>
      <div data-live-tv-settings-content="" data-scroll="" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: `${dp(40)}px ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(36) }}>
        {tab === 'appearance' ? <AppearanceTab settings={settings} tt={tt} /> : null}
        {tab === 'playlists' ? <PlaylistsTab model={model} nav={nav} lists={model.lists} tt={tt} locale={locale} toast={nav.toast} /> : null}
        {tab === 'epg' ? <EpgTab lists={model.lists} nav={nav} tt={tt} locale={locale} /> : null}
        {tab === 'parental' ? <ParentalTab model={model} tt={tt} /> : null}
      </div>
    </div>
  )
}

type TT = ReturnType<typeof useTvText>['tt']

function AppearanceTab({ settings, tt }: { settings: TvSettings; tt: TT }) {
  const guideMode = useGuideMode()
  const [accent, setAccentState] = useState(() => (hasAccent ? accentApi.getAccent!() : ''))
  // Den städade guiden (skrivbord/TV, spec "Beslut", Lägen) har tre lägen i
  // kontrollradens ordning: Grid · Now / Next · Timeline. LAN/fjärr behåller
  // de fyra gamla sedan 0.6.0 (Rutnät mellan Tablå och Spellistor, som
  // segmentväxeln där). Telefonen når aldrig hit (egen inställningssida).
  const newGuide = useNewGuideSurface(false)
  const modes: { key: GuideMode; label: string }[] = newGuide
    ? [{ key: 'grid', label: tt('modeGrid') }, { key: 'nownext', label: tt('modeNowNext') }, { key: 'timeline', label: tt('modeTimelineDay') }]
    : [{ key: 'now', label: tt('modeNow') }, { key: 'tl', label: tt('modeTimeline') }, { key: 'grid', label: tt('modeGrid') }, { key: 'playlists', label: tt('modePlaylists') }]
  const nextBanner = (current: BannerHideMs): BannerHideMs => BANNER_HIDE_OPTIONS[(BANNER_HIDE_OPTIONS.indexOf(current) + 1) % BANNER_HIDE_OPTIONS.length]
  return (
    <>
      {hasAccent ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
          <Heading>{tt('accentColour')}</Heading>
          <div style={{ display: 'flex', gap: dp(12), flexWrap: 'wrap' }}>
            {Object.entries(accentApi.ACCENT_PRESETS!).map(([id, preset]) => {
              const color = `rgb(${preset.shades[1]})`
              return (
                <div key={id} {...station(() => { accentApi.setAccent!(id); setAccentState(id) })} style={{ height: dp(60), minHeight: dp(60), padding: `0 ${dp(22)}px 0 ${dp(14)}px`, borderRadius: 999, border: `1px solid ${accent === id ? color : TV.lineCard}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', gap: dp(12), fontSize: dp(19), cursor: 'pointer' }}>
                  <span style={{ width: dp(28), height: dp(28), borderRadius: 999, background: color }} />{preset.label}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <Heading hint={tt('guideDefaultHint')}>{tt('guideDefault')}</Heading>
        <div style={{ display: 'flex', gap: dp(16), flexWrap: 'wrap' }}>
          {modes.map((m) => (
            <div key={m.key} data-testid={`guide-default-${m.key}`} {...station(() => setGuideMode(m.key))} style={{ width: dp(300), borderRadius: dp(14), border: `1px solid ${guideMode === m.key ? TV.acc : TV.lineCard}`, background: TV.s06, padding: dp(16), display: 'flex', flexDirection: 'column', gap: dp(12), cursor: 'pointer' }}>
              {/* Miniatyren: Timeline ritas som den gamla tablåraden (`tl`), Now / Next som Nu/Sen. */}
              <div style={{ height: dp(110), borderRadius: dp(10), background: TV.s05, display: 'grid', gridTemplateColumns: m.key === 'playlists' ? '1fr 2fr 1fr' : m.key === 'tl' || m.key === 'timeline' ? '1fr 3fr' : m.key === 'grid' ? '1fr 1fr 1fr' : '1fr 1.2fr 1fr 1fr', gridTemplateRows: m.key === 'grid' ? '1fr 1fr' : undefined, gap: dp(6), padding: dp(10) }}>
                {Array.from({ length: m.key === 'playlists' ? 3 : m.key === 'tl' || m.key === 'timeline' ? 2 : m.key === 'grid' ? 6 : 4 }).map((_, i) => <div key={i} style={{ borderRadius: dp(4), background: i === 1 ? TV.accMix(35) : TV.s12 }} />)}
              </div>
              <div style={{ fontSize: dp(19), fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
        <Heading>{tt('behaviour')}</Heading>
        <Row testId="setting-previewEnabled" label={tt('settingPreview')} right={<Toggle on={settings.previewEnabled} />} onOk={() => setTvSettings({ previewEnabled: !settings.previewEnabled })} />
        <Row testId="setting-startOnLastChannel" label={tt('settingStartLast')} right={<Toggle on={settings.startOnLastChannel} />} onOk={() => setTvSettings({ startOnLastChannel: !settings.startOnLastChannel })} />
        <Row testId="setting-numericZap" label={tt('settingNumericZap')} right={<Toggle on={settings.numericZap} />} onOk={() => setTvSettings({ numericZap: !settings.numericZap })} />
        <Row testId="setting-bannerHideMs" label={tt('settingBannerHide')} right={settings.bannerHideMs === 0 ? tt('never') : tt('seconds', { s: settings.bannerHideMs / 1000 })} onOk={() => setTvSettings({ bannerHideMs: nextBanner(settings.bannerHideMs) })} />
      </section>
    </>
  )
}
