'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as sdk from '@/lib/plugin-sdk'
import {
  addChannelToLiveTvList,
  applyM3uUrls,
  channelKey,
  createLiveTvList,
  deleteLiveTvList,
  ensureM3uList,
  ensureXtreamList,
  fetchXtreamAccount,
  fetchXtreamCategories,
  getLiveTvLists,
  getLiveTvUrlsKey,
  getM3uUrls,
  getXtreamLogins,
  importList,
  isLogoFallbackEnabled,
  normalizeXtreamBase,
  onXtreamLoginsChanged,
  parseXtreamSource,
  removeChannelFromLiveTvList,
  saveXtreamLogin,
  setLogoFallbackEnabled,
  updateLiveTvListEpg,
  xtreamPseudoUrl,
  type LiveTvList,
  type M3uChannel,
  type XtreamAccount,
  type XtreamCategory,
  type XtreamLogin,
} from '../live-tv-data'
import { completeLogos } from '../index-client'
import type { ImportStatus } from '../index-client'
import { recordListImportOutcome } from '../list-import-flags'
import { activeProfileHasPin, getLockedChannelKeys, onChannelLocksChanged, pinSupportAvailable, toggleChannelLock, verifyActiveProfilePin } from '../channel-locks'
import { PinGate } from '../live-tv-ui'
import { useEpgStatus } from '../hooks/useEpgStatus'
import type { TvNav, TvViewProps } from './tv-shell'
import { TvCategoryPicker, TvListPicker } from './tv-list-picker'
import { useTextPrompt } from './tv-text-entry'
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

export function TvSettingsView({ model, nav, params, settings }: TvViewProps) {
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
  // Fyra lägen sedan 0.6.0: Rutnät (P6) ligger mellan Tablå och Spellistor,
  // samma ordning som segmentväxeln i guiden.
  const modes: { key: GuideMode; label: string }[] = [{ key: 'now', label: tt('modeNow') }, { key: 'tl', label: tt('modeTimeline') }, { key: 'grid', label: tt('modeGrid') }, { key: 'playlists', label: tt('modePlaylists') }]
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
        <div style={{ display: 'flex', gap: dp(16), flexWrap: 'wrap' }}>
          {modes.map((m) => (
            <div key={m.key} data-testid={`guide-default-${m.key}`} {...station(() => setGuideMode(m.key))} style={{ width: dp(300), borderRadius: dp(14), border: `1px solid ${guideMode === m.key ? TV.acc : TV.lineCard}`, background: TV.s06, padding: dp(16), display: 'flex', flexDirection: 'column', gap: dp(12), cursor: 'pointer' }}>
              <div style={{ height: dp(110), borderRadius: dp(10), background: TV.s05, display: 'grid', gridTemplateColumns: m.key === 'playlists' ? '1fr 2fr 1fr' : m.key === 'tl' ? '1fr 3fr' : m.key === 'grid' ? '1fr 1fr 1fr' : '1fr 1.2fr 1fr 1fr', gridTemplateRows: m.key === 'grid' ? '1fr 1fr' : undefined, gap: dp(6), padding: dp(10) }}>
                {Array.from({ length: m.key === 'playlists' ? 3 : m.key === 'tl' ? 2 : m.key === 'grid' ? 6 : 4 }).map((_, i) => <div key={i} style={{ borderRadius: dp(4), background: i === 1 ? TV.accMix(35) : TV.s12 }} />)}
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

/*
 * Textinmatningen bor sedan 0.6.0 i `tv/tv-text-entry.tsx` (`useTextPrompt`):
 * samma värdpanel som förut i TV-läge, ett riktigt <input> utanför. Alla
 * kommentarer om fällorna (id-nyckeln mot återanvänd useState, öppnaren
 * fångad en gång, data-live-tv-host-ui, onDone+onClose) följde med dit.
 */

/**
 * Ta bort en lista helt: raden, kanalerna i indexet (nästa hämtning skriver
 * inte tillbaka dem) OCH M3U-adressen den kom ifrån. Ett listnamn ÄR
 * värdnamnet ur käll-URL:en (`deriveListName` i `live-tv-data.ts`), så
 * matchningen går på värdnamn. Xtream-inloggningar (`xtream://`) har sin egen
 * borttagningsväg och matchas aldrig här.
 */
function hostOf(url: string): string {
  try { return new URL(url).hostname || url } catch { return url }
}

function removeListAndSourceUrl(list: LiveTvList): void {
  const urls = getM3uUrls()
  const remaining = urls.filter((url) => !url.startsWith('xtream://') && hostOf(url) !== list.name)
  if (remaining.length !== urls.length) applyM3uUrls(remaining)
  deleteLiveTvList(list.id)
}

function xtreamLoginMissing(list: LiveTvList): boolean {
  if (list.kind !== 'xtream') return false
  return !getXtreamLogins().some((login) => login.id === list.xtreamLoginId)
}

/** Jobbets tillstånd översatt till en rad text under listan som hämtas. */
type ImportProgress = { listId: string; state: ImportStatus['state']; received: number; total: number | null }

function progressText(tt: TT, locale: string, progress: ImportProgress): string {
  if (progress.state === 'parsing') return tt('importParsing')
  if (progress.state === 'writing') return tt('importWriting')
  return progress.total
    ? tt('importProgress', { received: progress.received.toLocaleString(locale), total: progress.total.toLocaleString(locale) })
    : tt('importProgressUnknown')
}

/**
 * `disabled` tar bort HANDLINGEN men inte stationen: fjärrkontrollen ska
 * fortfarande kunna gå förbi knappen medan den arbetar (en `display: none`
 * hade flyttat fokus till body mitt i en hämtning).
 */
function Action({ label, onOk, testId, disabled }: { label: string; onOk: () => void; testId?: string; disabled?: boolean }) {
  return (
    <div
      data-testid={testId}
      aria-disabled={disabled ? 'true' : undefined}
      {...station(() => { if (!disabled) onOk() })}
      style={{ height: dp(48), padding: `0 ${dp(20)}px`, borderRadius: 999, background: TV.s12, display: 'inline-flex', alignItems: 'center', fontSize: dp(17), whiteSpace: 'nowrap', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      {label}
    </div>
  )
}

/**
 * Kvittots tidsstämpel. Bara klockslaget räcker för dagens hämtning, men
 * "09:41" säger ingenting om en lista som hämtades i förrgår — då kommer
 * datumet med. Samma regel som skrivbordets `formatFetchedAt`.
 */
function formatFetchedAt(iso: string, locale: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return iso
  const now = new Date()
  return then.toDateString() === now.toDateString()
    ? then.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : then.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * En listrad. `memo` är inte pynt: framstegsräknaren tickar ~2 ggr/s under en
 * import, och utan den här spärren ritades ALLA rader om varje gång — på en
 * TV-box med tjugo spellistor räckte det för att rycka i fjärrnavigeringen.
 * Raden som faktiskt hämtar får en ny `busy` och ritas om; övriga får samma
 * `null` och hoppas över.
 */
export const ListRow = memo(function ListRow({
  list,
  tt,
  locale,
  busy,
  needsLogin,
  onRefetch,
  onRemove,
  onEditChannels,
}: {
  list: LiveTvList
  tt: TT
  locale: string
  busy: ImportProgress | null
  needsLogin: boolean
  onRefetch: (list: LiveTvList) => void
  onRemove: (list: LiveTvList) => void
  onEditChannels: (list: LiveTvList) => void
}) {
  const importable = list.kind === 'm3u' || list.kind === 'xtream'
  const logoEnabled = isLogoFallbackEnabled(list)
  // Kvittot/felet lever i raden själv, inte i föräldern: samma mönster som
  // `logoComplete` i skrivbordets `live-tv-settings-section.tsx`, men
  // nyckling per lista behövs inte här — varje `ListRow` ÄR redan en lista.
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoResult, setLogoResult] = useState<{ matched: number; total: number } | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)

  /**
   * `completeLogos` sänder `emitIndexChanged()` själv (se `index-client.ts`)
   * — ropas INTE här igen, det hade blivit en dubbelsändning.
   */
  async function handleCompleteLogos(): Promise<void> {
    setLogoBusy(true)
    setLogoError(null)
    try {
      const result = await completeLogos(list.source ?? '')
      setLogoResult(result)
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : String(err))
    } finally {
      setLogoBusy(false)
    }
  }

  return (
    <div
      data-testid={`list-row-${list.id}`}
      style={{ minHeight: dp(64), borderRadius: dp(12), background: TV.s06, padding: `${dp(12)}px ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(16), fontSize: dp(19) }}
    >
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(4) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), minWidth: 0 }}>
          <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</strong>
          {list.needsReimport ? (
            <span style={{ flexShrink: 0, fontSize: dp(14), fontWeight: 600, padding: `${dp(3)}px ${dp(10)}px`, borderRadius: dp(8), background: 'rgba(244,132,95,0.18)', color: '#f4845f' }}>{tt('needsReimport')}</span>
          ) : null}
        </div>
        <div style={{ fontSize: dp(16), color: TV.dim }}>
          {tt('channelsCount', { count: (list.channelCount ?? list.channels?.length ?? 0).toLocaleString(locale) })}
          {list.fetchedAt ? ` · ${tt('fetchedAt', { time: formatFetchedAt(list.fetchedAt, locale) })}` : ''}
        </div>
        {busy ? <div style={{ fontSize: dp(16), color: TV.muted }}>{progressText(tt, locale, busy)}</div> : null}
        {!busy && needsLogin ? <div style={{ fontSize: dp(15), color: TV.muted }}>{tt('xtreamNeedsLogin')}</div> : null}
        {list.truncated ? (
          <div data-testid={`list-truncated-${list.id}`} style={{ fontSize: dp(15), color: '#fbbf24' }}>{tt('truncated')}</div>
        ) : null}
        {!busy && list.lastImportError ? (
          <div data-testid={`list-error-${list.id}`} style={{ fontSize: dp(15), color: '#fca5a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.lastImportError}</div>
        ) : null}
        {logoResult ? (
          <div data-testid={`list-logo-complete-result-${list.id}`} style={{ fontSize: dp(15), color: TV.dim }}>
            {tt('logoCompleteResult', { matched: logoResult.matched, total: logoResult.total })}
          </div>
        ) : null}
        {logoError ? (
          <div data-testid={`list-logo-complete-error-${list.id}`} style={{ fontSize: dp(15), color: '#fca5a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logoError}</div>
        ) : null}
      </div>
      {/* Ordning: Hämta om, Logotyper, Komplettera, Ta bort — "Ta bort" sist
          så fjärrkontrollen inte råkar landa på den. */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: dp(10) }}>
        {importable ? <Action testId={`list-refetch-${list.id}`} label={busy ? tt('refetching') : tt('refetch')} onOk={() => onRefetch(list)} /> : null}
        {/* Egna listor har inget att hämta — de fylls med kanalväljaren. */}
        {list.kind === 'custom' ? <Action testId={`list-channels-${list.id}`} label={tt('listChannels')} onOk={() => onEditChannels(list)} /> : null}
        <Action
          testId={`list-logo-fallback-${list.id}`}
          label={logoEnabled ? tt('logoFallbackOn') : tt('logoFallbackOff')}
          onOk={() => setLogoFallbackEnabled(list.id, !logoEnabled)}
        />
        <Action
          testId={`list-logo-complete-${list.id}`}
          label={logoBusy ? tt('logoCompleteRunning') : tt('logoComplete')}
          disabled={!logoEnabled || list.kind === 'custom' || logoBusy}
          onOk={() => { void handleCompleteLogos() }}
        />
        <Action testId={`list-remove-${list.id}`} label={tt('remove')} onOk={() => onRemove(list)} />
      </div>
    </div>
  )
})

/**
 * Spellistor: hämtning går genom VÄRDENS importjobb (`importList`), inte
 * genom webviewn.
 *
 * Tidigare hämtade och parsade den här vyn M3U:n själv och skrev kanalerna
 * inbäddade i pluginlagringen (`upsertLiveTvListFromFetch`) — samma väg som
 * hade ett tak på 2 000 kanaler och som lagring v2 tog bort. Nu skapas bara
 * listposten här (`ensureM3uList`/`ensureXtreamList`), jobbet gör hämtningen
 * i Rust och raden visar dess `received`/`total` medan det pågår.
 */
function PlaylistsTab({ model, nav, lists, tt, locale, toast }: { model: TvViewProps['model']; nav: TvNav; lists: LiveTvList[]; tt: TT; locale: string; toast: (text: string) => void }) {
  // Dialogen utanför TV-läget registreras som lager, så skalets Bakåt (Esc
  // eller Bakåt-posten i ikonraden) stänger den före inställningsvyn.
  const keyboard = useTextPrompt({ pushLayer: nav.pushLayer })
  const [progress, setProgress] = useState<ImportProgress | null>(null)

  /**
   * `existedBefore`: en NY lista vars allra första import misslyckas ska inte
   * lämnas kvar som en tom, permanent post (spec §5) — men en lista som redan
   * fanns behåller sitt gamla innehåll när en omhämtning faller.
   */
  async function runImport(list: LiveTvList, existedBefore: boolean): Promise<boolean> {
    setProgress({ listId: list.id, state: 'fetching', received: 0, total: null })
    try {
      const status = await importList(list, (s) => setProgress({ listId: list.id, state: s.state, received: s.received, total: s.total ?? null }))
      if (status.state === 'error') {
        if (existedBefore) recordListImportOutcome(list.id, status.error ?? 'import failed')
        else deleteLiveTvList(list.id)
        toast(`${tt('importFailed')}: ${status.error ?? ''}`.trim())
        return false
      }
      recordListImportOutcome(list.id)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (existedBefore) recordListImportOutcome(list.id, message)
      else deleteLiveTvList(list.id)
      toast(`${tt('importFailed')}: ${message}`)
      return false
    } finally {
      setProgress(null)
    }
  }

  const addUrl = () => keyboard.ask(tt('addM3u'), '', (value) => {
    const url = value.trim()
    if (!url) return
    const source = getLiveTvUrlsKey([url])
    const existedBefore = getLiveTvLists().some((entry) => entry.source === source)
    const list = ensureM3uList(url)
    void runImport(list, existedBefore).then((ok) => {
      // Adressen skrivs bara in bland de aktiva när hämtningen gick igenom —
      // annars stod en URL kvar som aldrig gav några kanaler.
      if (ok && !getM3uUrls().includes(url)) applyM3uUrls([...getM3uUrls(), url])
    })
  }, 'url')

  /** Server → användarnamn → lösenord, ett tangentbord i taget. */
  const askXtream = (prefillServer: string, reuseLoginId: string | null) => keyboard.ask(tt('xtreamServer'), prefillServer, (serverValue) => {
    const server = serverValue.trim()
    if (!server) return
    keyboard.ask(tt('xtreamUsername'), '', (usernameValue) => {
      const username = usernameValue.trim()
      if (!username) return
      keyboard.ask(tt('xtreamPassword'), '', (passwordValue) => {
        const password = passwordValue.trim()
        if (!password) return
        void connectXtream(server, username, password, reuseLoginId)
      }, 'password')
    }, 'username')
  }, 'url')

  async function connectXtream(server: string, username: string, password: string, reuseLoginId: string | null): Promise<void> {
    const base = normalizeXtreamBase(server)
    if (!base) { toast(tt('xtreamLoginFailed')); return }
    let account: Awaited<ReturnType<typeof fetchXtreamAccount>>
    try {
      // Inloggning = verifiering: alltid mot panelen, aldrig ur kontocachen.
      account = await fetchXtreamAccount({ base, username, password }, { force: true })
    } catch {
      toast(tt('xtreamLoginFailed'))
      return
    }
    if (!account.auth) { toast(tt('xtreamLoginFailed')); return }
    const existing = getXtreamLogins().find((entry) => entry.base === base && entry.username === username)
    const login: XtreamLogin = {
      id: existing?.id ?? reuseLoginId ?? crypto.randomUUID(),
      base,
      username,
      password,
      format: account.allowedFormats.length === 0 || account.allowedFormats.includes('ts') ? 'ts' : 'm3u8',
      categoryIds: existing?.categoryIds ?? [],
    }
    saveXtreamLogin(login)
    const source = xtreamPseudoUrl(login)
    const existedBefore = getLiveTvLists().some((entry) => entry.source === source)
    await runImport(ensureXtreamList(login), existedBefore)
  }

  /**
   * ORDNINGEN FRYSES VID MONTERINGEN.
   *
   * Listor som behöver hämtas om ska ligga överst — men om sorteringen
   * räknades om vid varje rendering bytte raden plats i samma ögonblick som
   * `needsReimport` rensades av en lyckad hämtning. React flyttar då nodens
   * plats i DOM, och den fokuserade knappen i raden tappar fokus till `body`:
   * fjärrkontrollen strandar mitt i det som just lyckades. Rangordningen
   * bestäms därför en gång; listor som tillkommer senare läggs sist, aldrig
   * invävda bland de befintliga.
   */
  const orderRef = useRef<string[]>([])
  const ordered = useMemo(() => {
    if (orderRef.current.length === 0) {
      orderRef.current = [...lists]
        .sort((a, b) => Number(Boolean(b.needsReimport)) - Number(Boolean(a.needsReimport)))
        .map((list) => list.id)
    } else {
      for (const list of lists) if (!orderRef.current.includes(list.id)) orderRef.current.push(list.id)
    }
    const rank = new Map(orderRef.current.map((id, index) => [id, index]))
    return [...lists].sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER))
  }, [lists])

  /**
   * Stabila handtag till raderna: `memo` på ListRow biter bara om props inte
   * byter identitet per rendering. Samma ref-mönster som skalets zap-buffert
   * (`tv-shell.tsx`) — det som ändrar sig (tangentbordet, pågående jobb)
   * skrivs till en ref i en effekt, och raderna får två oföränderliga
   * återanrop.
   */
  const refetchRef = useRef<(list: LiveTvList) => void>(() => {})
  useEffect(() => {
    refetchRef.current = (list: LiveTvList) => {
      // Avstå vid VARJE pågående hämtning, inte bara den här listans: två
      // samtidiga importjobb slogs om värdens skrivlås, och förloppsraden kan
      // bara visa ett.
      if (progress || refetchingAll) return
      if (xtreamLoginMissing(list)) {
        const parsed = parseXtreamSource(list.source)
        askXtream(parsed ? `http://${parsed.host}` : '', parsed?.loginId ?? null)
        return
      }
      void runImport(list, true)
    }
  })
  const onRefetch = useCallback((list: LiveTvList) => refetchRef.current(list), [])
  const onRemove = useCallback((list: LiveTvList) => removeListAndSourceUrl(list), [])

  /**
   * EGNA LISTOR: kanalerna bockas i en flervalsväljare, och medlemskapet hålls
   * i ett eget set i stället för att läsas ur `lists` vid varje rendering.
   * Listpropsen kommer via modellen, som läser om asynkront efter en
   * lagringsändring — bocken hade då blinkat till en halv sekund efter trycket.
   */
  const [pickerListId, setPickerListId] = useState<string | null>(null)
  const [members, setMembers] = useState<ReadonlySet<string>>(() => new Set())
  const pickerList = pickerListId ? (getLiveTvLists().find((entry) => entry.id === pickerListId) ?? null) : null
  const openPicker = useCallback((list: LiveTvList) => {
    setMembers(new Set((getLiveTvLists().find((entry) => entry.id === list.id)?.channels ?? []).map(channelKey)))
    setPickerListId(list.id)
  }, [])
  const toggleMember = (channel: M3uChannel) => {
    if (!pickerListId) return
    const key = channelKey(channel)
    if (members.has(key)) {
      removeChannelFromLiveTvList(pickerListId, channel)
      setMembers((current) => { const next = new Set(current); next.delete(key); return next })
      return
    }
    const outcome = addChannelToLiveTvList(pickerListId, channel)
    // 500-taket sitter i lagringen: utan kvitto hade trycket sett ut att göra
    // ingenting alls.
    if (outcome === 'full') { toast(tt('listFull')); return }
    // `duplicate` = kanalen ligger redan i listan (samma nyckel via en annan
    // källa). Bocken ska då visas, precis som för `added` — inte utebli och
    // få trycket att se verkningslöst ut.
    if (outcome === 'added' || outcome === 'duplicate') setMembers((current) => new Set(current).add(key))
  }
  const createList = () => keyboard.ask(tt('listName'), '', (value) => {
    const name = value.trim()
    if (!name) return
    openPicker(createLiveTvList(name))
  })

  /**
   * UPPDATERA ALLA: samma anrop som knappen per lista, en lista i taget.
   * Sekventiellt med flit — parallella importjobb i värden slogs om samma
   * skrivlås, och förloppsraden kan bara visa ett jobb.
   */
  const [refetchingAll, setRefetchingAll] = useState(false)
  const importable = lists.filter((list) => Boolean(list.source) && (list.kind === 'm3u' || list.kind === 'xtream') && !xtreamLoginMissing(list))
  async function refetchAll(): Promise<void> {
    // Samma vakt som per lista: en pågående hämtning (från en rad eller en
    // tidigare "alla") ska inte kunna dubbleras av ett andra tryck.
    if (progress || refetchingAll) return
    setRefetchingAll(true)
    try {
      for (const list of importable) await runImport(list, true)
    } finally {
      setRefetchingAll(false)
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: dp(16) }}>
        <Heading>{tt('tabPlaylists')}</Heading>
        {importable.length > 0 ? <Action testId="lists-refetch-all" label={refetchingAll ? tt('refetching') : tt('refetchAll')} disabled={refetchingAll || progress !== null} onOk={() => { void refetchAll() }} /> : null}
      </div>
      {ordered.map((list) => (
        <ListRow
          key={list.id}
          list={list}
          tt={tt}
          locale={locale}
          busy={progress?.listId === list.id ? progress : null}
          needsLogin={xtreamLoginMissing(list)}
          onRefetch={onRefetch}
          onRemove={onRemove}
          onEditChannels={openPicker}
        />
      ))}
      {keyboard.available ? <Row label={tt('addM3u')} right="+" onOk={addUrl} /> : null}
      {keyboard.available ? <Row label={tt('addXtream')} right="+" onOk={() => askXtream('', null)} /> : null}
      {keyboard.available ? <Row testId="create-list" label={tt('createList')} right="+" onOk={createList} /> : null}
      <XtreamAccounts nav={nav} tt={tt} locale={locale} onReimport={(list) => { void runImport(list, true) }} />
      {pickerList ? (
        <TvListPicker
          model={model}
          nav={nav}
          title={tt('pickChannels', { list: pickerList.name })}
          selected={members}
          onToggle={toggleMember}
          onClose={() => setPickerListId(null)}
        />
      ) : null}
      {keyboard.node}
    </section>
  )
}

/** Utgångsdatumet ur Xtream-panelen (unix-sekunder). */
function formatExpiry(expDate: number | null, locale: string): string | null {
  if (!expDate) return null
  const when = new Date(expDate * 1000)
  if (Number.isNaN(when.getTime())) return null
  return when.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * KONTOKORTET + KATEGORIVALET — skrivbordets `xtream-login-section.tsx` i
 * TV-form. Kontot hämtas ur panelen (`fetchXtreamAccount`), kategorierna ur
 * `fetchXtreamCategories`, och valet skrivs till `login.categoryIds` — exakt
 * samma fält som importjobbet läser.
 */
function XtreamAccounts({ nav, tt, locale, onReimport }: { nav: TvNav; tt: TT; locale: string; onReimport: (list: LiveTvList) => void }) {
  const [logins, setLogins] = useState<XtreamLogin[]>(getXtreamLogins)
  useEffect(() => onXtreamLoginsChanged(() => setLogins(getXtreamLogins())), [])
  const [pickerLoginId, setPickerLoginId] = useState<string | null>(null)
  const [categories, setCategories] = useState<XtreamCategory[] | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [dirty, setDirty] = useState(false)
  const pickerLogin = pickerLoginId ? (logins.find((entry) => entry.id === pickerLoginId) ?? null) : null

  function openCategories(login: XtreamLogin): void {
    setCategories(null)
    setSelected(new Set(login.categoryIds))
    setDirty(false)
    setPickerLoginId(login.id)
    void fetchXtreamCategories(login).then((list) => setCategories(list)).catch(() => setCategories([]))
  }

  function writeCategories(login: XtreamLogin, ids: string[]): void {
    saveXtreamLogin({ ...login, categoryIds: ids })
    setSelected(new Set(ids))
    setDirty(true)
  }

  /**
   * Urvalet ändrar VAD som importeras, så listan hämtas om när panelen stängs.
   * `xtreamPseudoUrl` beror bara på bas och login-id — kategorierna ingår inte,
   * så listan slås upp på login-id med pseudo-URL:en som reserv.
   */
  const listForLogin = (login: XtreamLogin): LiveTvList | null =>
    getLiveTvLists().find((entry) => entry.xtreamLoginId === login.id || entry.source === xtreamPseudoUrl(login)) ?? null

  function closeCategories(): void {
    const login = pickerLogin
    setPickerLoginId(null)
    setDirty(false)
    if (!login || !dirty) return
    const list = listForLogin(login)
    if (list) onReimport(list)
  }

  /**
   * Samma omhämtning när panelen försvinner UTAN att stängas — man byter flik
   * eller lämnar Live TV med Bakåt. Utan den här hade `categoryIds` legat
   * sparade medan indexet fortfarande innehöll de gamla kategorierna, och
   * ingenting i gränssnittet hade sagt att listan var osynkad. Importen körs
   * i värden (inte via vyns förloppsrad, som är borta) och ett fel märker
   * listan för omhämtning.
   */
  const pendingRef = useRef<{ login: XtreamLogin; dirty: boolean }>({ login: logins[0] ?? ({} as XtreamLogin), dirty: false })
  useEffect(() => { if (pickerLogin) pendingRef.current = { login: pickerLogin, dirty } })
  useEffect(() => () => {
    const pending = pendingRef.current
    if (!pending.dirty || !pending.login?.id) return
    const list = getLiveTvLists().find((entry) => entry.xtreamLoginId === pending.login.id)
    if (!list) return
    void importList(list).catch((err) => recordListImportOutcome(list.id, err instanceof Error ? err.message : String(err)))
  }, [])

  if (logins.length === 0) return null
  return (
    <>
      <Heading>{tt('xtreamAccount')}</Heading>
      {logins.map((login) => (
        <XtreamAccountCard key={login.id} login={login} tt={tt} locale={locale} onCategories={() => openCategories(login)} />
      ))}
      {pickerLogin ? (
        <TvCategoryPicker
          nav={nav}
          title={tt('xtreamCategoriesTitle')}
          categories={categories}
          selected={selected}
          onToggle={(category) => {
            const next = new Set(selected)
            if (next.has(category.id)) next.delete(category.id)
            else next.add(category.id)
            writeCategories(pickerLogin, [...next])
          }}
          onSelectAll={() => writeCategories(pickerLogin, [])}
          onClose={closeCategories}
        />
      ) : null}
    </>
  )
}

function XtreamAccountCard({ login, tt, locale, onCategories }: { login: XtreamLogin; tt: TT; locale: string; onCategories: () => void }) {
  const [account, setAccount] = useState<XtreamAccount | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    setFailed(false)
    void fetchXtreamAccount(login)
      .then((next) => { if (!cancelled) setAccount(next) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [login.base, login.username, login.password])
  let host = login.base
  try { host = new URL(login.base).host } catch { /* behåll basen */ }
  const expiry = account ? formatExpiry(account.expDate, locale) : null
  const meta = failed
    ? tt('xtreamAccountUnavailable')
    : account
      ? [account.status, expiry ? tt('xtreamExpires', { date: expiry }) : tt('xtreamNoExpiry'), account.maxConnections ? tt('xtreamMaxConnections', { count: account.maxConnections }) : null]
        .filter((part): part is string => Boolean(part)).join(' · ')
      : tt('refetching')
  return (
    <div
      data-testid={`xtream-account-${login.id}`}
      style={{ minHeight: dp(64), borderRadius: dp(12), background: TV.s06, padding: `${dp(12)}px ${dp(18)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dp(16), fontSize: dp(19) }}
    >
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: dp(4) }}>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{host}</strong>
        <span style={{ fontSize: dp(16), color: failed ? '#fca5a5' : TV.dim }}>{meta}</span>
      </div>
      <Action
        testId={`xtream-categories-${login.id}`}
        label={`${tt('xtreamCategories')}${login.categoryIds.length > 0 ? ` (${login.categoryIds.length})` : ''}`}
        onOk={onCategories}
      />
    </div>
  )
}

/**
 * EPG-fliken: adresserna OCH diagnostiken.
 *
 * Liggarens beslut att TV:s EPG-flik avsiktligt SKA SAKNA diagnostik är
 * UPPHÄVT (Jerry, 2026-09-14, spec 4.4 punkt 2): samma siffror ska finnas på
 * båda ytorna. Rätta alltså inte tillbaka till "TV visar bara adresserna".
 * Datat kommer ur den delade hooken (`hooks/useEpgStatus.ts`), som
 * skrivbordets `EpgStatusCard` läser likadant — två ytor kan inte visa olika
 * siffror för samma globala butik.
 */
function EpgTab({ lists, nav, tt, locale }: { lists: LiveTvList[]; nav: TvNav; tt: TT; locale: string }) {
  const keyboard = useTextPrompt({ pushLayer: nav.pushLayer })
  const { status, urls: statusUrls, refreshing, refresh } = useEpgStatus()
  const urls = useMemo(() => lists.flatMap((list) => list.epgUrls.map((url) => ({ listId: list.id, url }))), [lists])
  return (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
        <Heading>{tt('tabEpg')}</Heading>
        {urls.map(({ listId, url }) => {
          const list = lists.find((l) => l.id === listId)!
          return <Row key={`${listId}:${url}`} label={url} right={tt('remove')} onOk={() => updateLiveTvListEpg(listId, { epgUrls: list.epgUrls.filter((u) => u !== url) })} />
        })}
        {keyboard.available && lists[0] ? <Row label={tt('addEpgUrl')} right="+" onOk={() => keyboard.ask(tt('addEpgUrl'), '', (value) => { const url = value.trim(); if (url) updateLiveTvListEpg(lists[0].id, { epgUrls: [...lists[0].epgUrls, url] }) }, 'url')} /> : null}
        {keyboard.node}
      </section>
      {statusUrls.length > 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: dp(16) }}>
            <Heading>{tt('epgStatusTitle')}</Heading>
            <Action testId="epg-refresh" label={refreshing ? tt('epgRefreshing') : tt('epgRefresh')} disabled={refreshing} onOk={() => { void refresh() }} />
          </div>
          {statusUrls.map((url) => {
            const stat = status?.urls.find((item) => item.url === url)
            const fetched = stat?.fetchedAt ? formatFetchedAt(new Date(stat.fetchedAt).toISOString(), locale) : null
            return (
              <div
                key={url}
                data-testid={`epg-status-${url}`}
                style={{ minHeight: dp(64), borderRadius: dp(12), background: TV.s06, padding: `${dp(12)}px ${dp(18)}px`, display: 'flex', flexDirection: 'column', gap: dp(4), fontSize: dp(18) }}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                {stat?.error
                  ? <span style={{ fontSize: dp(16), color: '#fca5a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.error}</span>
                  : (
                    <span style={{ fontSize: dp(16), color: TV.dim }}>
                      {stat ? tt('epgSourceStats', { channels: stat.channels.toLocaleString(locale), programmes: stat.programmes.toLocaleString(locale) }) : tt('epgNeverFetched')}
                      {fetched ? ` · ${tt('fetchedAt', { time: fetched })}` : ''}
                    </span>
                  )}
              </div>
            )
          })}
        </section>
      ) : null}
    </>
  )
}

function ParentalTab({ model, tt }: { model: TvViewProps['model']; tt: TT }) {
  const [keys, setKeys] = useState(getLockedChannelKeys)
  useEffect(() => onChannelLocksChanged(() => setKeys(getLockedChannelKeys())), [])
  const channels = keys
    .map((key) => model.allChannels.find((c) => channelKey(c) === key))
    .filter((c): c is M3uChannel => Boolean(c))
  // Lås/upplåsning går via PinGate — samma regel som tv-channel.tsx. Utan PIN-infrastruktur (eller ingen PIN satt på
  // profilen) finns inget att verifiera mot, så då låses kanalen upp direkt
  // i stället för att fastna bakom en grind ingen kan öppna.
  const lockAvailable = pinSupportAvailable() && activeProfileHasPin()
  const [pinTarget, setPinTarget] = useState<M3uChannel | null>(null)
  const requestUnlock = (channel: M3uChannel) => {
    if (!lockAvailable) { toggleChannelLock(channel); return }
    setPinTarget(channel)
  }
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: dp(10) }}>
      <Heading>{tt('lockedChannels')}</Heading>
      {channels.length === 0 ? <div style={{ fontSize: dp(18), color: TV.dim }}>{tt('noLocked')}</div> : null}
      {channels.map((channel) => <Row key={channelKey(channel)} label={channel.name} right={tt('unlock')} onOk={() => requestUnlock(channel)} />)}
      <PinGate
        open={pinTarget !== null}
        title={tt('enterPin')}
        wrongText={tt('pinWrong')}
        unlockLabel={tt('unlock')}
        cancelLabel={tt('cancel')}
        onVerify={verifyActiveProfilePin}
        onClose={() => setPinTarget(null)}
        onUnlocked={() => {
          const channel = pinTarget
          setPinTarget(null)
          if (channel) toggleChannelLock(channel)
        }}
      />
    </section>
  )
}
