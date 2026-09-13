'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import { getTvKeyboardPanel } from '@/lib/plugin-sdk'
import {
  applyM3uUrls,
  channelKey,
  deleteLiveTvList,
  getM3uUrls,
  updateLiveTvListEpg,
  upsertLiveTvListFromFetch,
  type LiveTvList,
  type M3uChannel,
} from '../live-tv-data'
import { getLockedChannelKeys, onChannelLocksChanged, toggleChannelLock } from '../channel-locks'
import type { TvViewProps } from './tv-shell'
import { TV, Toggle, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { BANNER_HIDE_OPTIONS, setGuideMode, setTvSettings, useGuideMode, type BannerHideMs, type GuideMode, type TvSettings } from './tv-settings-store'

type Tab = 'appearance' | 'playlists' | 'epg' | 'parental'
const TABS: Tab[] = ['appearance', 'playlists', 'epg', 'parental']

type AccentApi = { getAccent?: () => string; setAccent?: (id: string) => void; ACCENT_PRESETS?: Record<string, { label: string; shades: string[] }> }
const accentApi = sdk as unknown as AccentApi
const hasAccent = typeof accentApi.getAccent === 'function' && typeof accentApi.setAccent === 'function' && !!accentApi.ACCENT_PRESETS

/**
 * En rad i inställningarna. Ingen `data-init` här: skalets vänsterflik bär
 * redan det enda `data-init` som får finnas i den här vyn (se TvSettingsView
 * nedan), annars hamnar TV-fokuset på två ställen samtidigt när en flik
 * råkar sakna innehåll (t.ex. Spellistor utan listor).
 */
function Row({ label, right, onOk, testId }: { label: ReactNode; right: ReactNode; onOk: () => void; testId?: string }) {
  return (
    <div data-testid={testId} {...station(onOk)} style={{ height: dp(64), borderRadius: dp(12), background: TV.s06, padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(16), fontSize: dp(19), cursor: 'pointer' }}>
      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ flexShrink: 0, color: 'rgba(243,244,248,0.6)', display: 'inline-flex', alignItems: 'center', gap: dp(10) }}>{right}</span>
    </div>
  )
}

function Heading({ children, hint }: { children: ReactNode; hint?: string }) {
  return <div><div style={{ fontSize: dp(26), fontWeight: 600 }}>{children}</div>{hint ? <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{hint}</div> : null}</div>
}

export function TvSettingsView({ model, params, settings }: TvViewProps) {
  const { tt, locale } = useTvText()
  const initial = (TABS as string[]).includes(params.tab ?? '') ? (params.tab as Tab) : 'appearance'
  const [tab, setTab] = useState<Tab>(initial)
  const labels: Record<Tab, string> = { appearance: tt('tabAppearance'), playlists: tt('tabPlaylists'), epg: tt('tabEpg'), parental: tt('tabParental') }
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ width: dp(340), flexShrink: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(20)}px 0 ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(6) }}>
        <div style={{ fontSize: dp(30), fontWeight: 600, marginBottom: dp(16) }}>{tt('liveTv')}</div>
        {TABS.map((t) => (
          <div key={t} data-testid={`tab-${t}`} {...station(() => setTab(t), undefined, { ...(t === tab ? { 'data-init': '' } : {}), 'data-f-right': '[data-live-tv-settings-content] [data-f]' })} style={{ height: dp(60), borderRadius: dp(12), padding: `0 ${dp(18)}px`, display: 'flex', alignItems: 'center', fontSize: dp(20), background: t === tab ? TV.s12 : 'transparent', color: t === tab ? TV.text : TV.muted, cursor: 'pointer' }}>{labels[t]}</div>
        ))}
      </div>
      <div data-live-tv-settings-content="" data-scroll="" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: `${dp(40)}px ${dp(48)}px`, display: 'flex', flexDirection: 'column', gap: dp(36) }}>
        {tab === 'appearance' ? <AppearanceTab settings={settings} tt={tt} /> : null}
        {tab === 'playlists' ? <PlaylistsTab lists={model.lists} tt={tt} locale={locale} /> : null}
        {tab === 'epg' ? <EpgTab lists={model.lists} tt={tt} /> : null}
        {tab === 'parental' ? <ParentalTab model={model} tt={tt} /> : null}
      </div>
    </div>
  )
}

type TT = ReturnType<typeof useTvText>['tt']

function AppearanceTab({ settings, tt }: { settings: TvSettings; tt: TT }) {
  const guideMode = useGuideMode()
  const [accent, setAccentState] = useState(() => (hasAccent ? accentApi.getAccent!() : ''))
  const modes: { key: GuideMode; label: string }[] = [{ key: 'now', label: tt('modeNow') }, { key: 'tl', label: tt('modeTimeline') }, { key: 'playlists', label: tt('modePlaylists') }]
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
                <div key={id} {...station(() => { accentApi.setAccent!(id); setAccentState(id) })} style={{ height: dp(60), padding: `0 ${dp(22)}px 0 ${dp(14)}px`, borderRadius: 999, border: `1px solid ${accent === id ? color : TV.lineCard}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', gap: dp(12), fontSize: dp(19), cursor: 'pointer' }}>
                  <span style={{ width: dp(28), height: dp(28), borderRadius: 999, background: color }} />{preset.label}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <Heading hint={tt('guideDefaultHint')}>{tt('guideDefault')}</Heading>
        <div style={{ display: 'flex', gap: dp(16) }}>
          {modes.map((m) => (
            <div key={m.key} data-testid={`guide-default-${m.key}`} {...station(() => setGuideMode(m.key))} style={{ width: dp(300), borderRadius: dp(14), border: `1px solid ${guideMode === m.key ? TV.acc : TV.lineCard}`, background: TV.s06, padding: dp(16), display: 'flex', flexDirection: 'column', gap: dp(12), cursor: 'pointer' }}>
              <div style={{ height: dp(110), borderRadius: dp(10), background: TV.s05, display: 'grid', gridTemplateColumns: m.key === 'playlists' ? '1fr 2fr 1fr' : m.key === 'tl' ? '1fr 3fr' : '1fr 1.2fr 1fr 1fr', gap: dp(6), padding: dp(10) }}>
                {Array.from({ length: m.key === 'playlists' ? 3 : m.key === 'tl' ? 2 : 4 }).map((_, i) => <div key={i} style={{ borderRadius: dp(4), background: i === 1 ? TV.accMix(35) : TV.s12 }} />)}
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

function useKeyboardPrompt() {
  const Panel = getTvKeyboardPanel()
  const [prompt, setPrompt] = useState<{ title: string; initial: string; onDone: (value: string) => void } | null>(null)
  // TvKeyboardPanel positionerar sig `inset: 0` mot närmaste positionerade
  // förälder, därför omslutningen här. `data-live-tv-host-ui` gör att
  // skalets Back-hantering (tv-shell.tsx) står tillbaka medan panelen är
  // öppen — den stänger sig själv.
  const node = Panel && prompt ? (
    <div data-live-tv-host-ui="" style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      <Panel title={prompt.title} initial={prompt.initial} onDone={(value: string) => { setPrompt(null); prompt.onDone(value) }} onClose={() => setPrompt(null)} />
    </div>
  ) : null
  return { available: Panel !== null, ask: (title: string, initial: string, onDone: (value: string) => void) => setPrompt({ title, initial, onDone }), node }
}

/**
 * Samma hämtningsväg som skrivbordets `live-tv-settings-section.tsx`
 * (`handleFetchM3uList` → lokala `fetchParsedM3u` + `upsertLiveTvListFromFetch`):
 * ett rent `applyM3uUrls([...urls, url])` lägger bara till adressen —
 * listan hämtas aldrig och kanalerna dyker aldrig upp. `fetchParsedM3u`
 * exporteras inte härifrån (den filen ägs inte av den här uppgiften), så
 * den minimala hämtnings- och normaliseringsbiten är duplicerad här; ingen
 * Xtream-utan-output-reprövning eller stegningsvisning — TV-tillägget är för
 * en enstaka M3U-URL i taget.
 */
async function fetchAndAddM3uList(url: string): Promise<void> {
  try {
    const response = await fetch('/api/m3u', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    if (!response.ok) return
    const parsed = (await response.json().catch(() => ({}))) as { channels?: unknown[]; urlTvg?: string | null }
    const channels: M3uChannel[] = Array.isArray(parsed.channels)
      ? (parsed.channels as Array<{ name?: unknown; logo?: unknown; group?: unknown; url?: unknown; tvgId?: unknown }>).map((c) => ({
          name: String(c.name ?? 'Unknown'),
          logo: typeof c.logo === 'string' ? c.logo : null,
          group: String(c.group ?? 'Other'),
          url: String(c.url ?? ''),
          tvgId: typeof c.tvgId === 'string' ? c.tvgId : null,
        }))
      : []
    upsertLiveTvListFromFetch(url, parsed.urlTvg ?? null, channels)
    applyM3uUrls([...getM3uUrls(), url])
  } catch {
    // Nätverksfel: adressen läggs inte till om hämtningen misslyckas helt —
    // annars stod en URL kvar som aldrig gav några kanaler.
  }
}

function PlaylistsTab({ lists, tt, locale }: { lists: LiveTvList[]; tt: TT; locale: string }) {
  const keyboard = useKeyboardPrompt()
  const addUrl = () => keyboard.ask(tt('addM3u'), '', (value) => { const url = value.trim(); if (url) void fetchAndAddM3uList(url) })
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading>{tt('tabPlaylists')}</Heading>
      {lists.map((list) => (
        <Row
          key={list.id}
          label={<><strong>{list.name}</strong> <span style={{ color: 'rgba(243,244,248,0.5)', fontSize: dp(16) }}>· {tt('channelsCount', { count: list.channels.length })}{list.fetchedAt ? ` · ${tt('fetchedAt', { time: new Date(list.fetchedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })}` : ''}</span></>}
          right={tt('remove')}
          onOk={() => deleteLiveTvList(list.id)}
        />
      ))}
      {keyboard.available ? <Row label={tt('addM3u')} right="+" onOk={addUrl} /> : null}
      {keyboard.node}
    </section>
  )
}

function EpgTab({ lists, tt }: { lists: LiveTvList[]; tt: TT }) {
  const keyboard = useKeyboardPrompt()
  const urls = useMemo(() => lists.flatMap((list) => list.epgUrls.map((url) => ({ listId: list.id, url }))), [lists])
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading>{tt('tabEpg')}</Heading>
      {urls.map(({ listId, url }) => {
        const list = lists.find((l) => l.id === listId)!
        return <Row key={`${listId}:${url}`} label={url} right={tt('remove')} onOk={() => updateLiveTvListEpg(listId, { epgUrls: list.epgUrls.filter((u) => u !== url) })} />
      })}
      {keyboard.available && lists[0] ? <Row label={tt('addEpgUrl')} right="+" onOk={() => keyboard.ask(tt('addEpgUrl'), '', (value) => { const url = value.trim(); if (url) updateLiveTvListEpg(lists[0].id, { epgUrls: [...lists[0].epgUrls, url] }) })} /> : null}
      {keyboard.node}
    </section>
  )
}

function ParentalTab({ model, tt }: { model: TvViewProps['model']; tt: TT }) {
  const [keys, setKeys] = useState(getLockedChannelKeys)
  useEffect(() => onChannelLocksChanged(() => setKeys(getLockedChannelKeys())), [])
  const channels = keys
    .map((key) => model.allChannels.find((c) => channelKey(c) === key))
    .filter((c): c is M3uChannel => Boolean(c))
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading>{tt('lockedChannels')}</Heading>
      {channels.length === 0 ? <div style={{ fontSize: dp(18), color: TV.dim }}>{tt('noLocked')}</div> : null}
      {channels.map((channel) => <Row key={channelKey(channel)} label={channel.name} right={tt('unlock')} onOk={() => toggleChannelLock(channel)} />)}
    </section>
  )
}
