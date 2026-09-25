'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  disableHomeOverridePlugin,
  getHomeOverridePluginId,
  onHomeOverridePluginChanged,
  onProfileChanged,
  tryEnableHomeOverridePlugin,
  useLang,
  useTvMode,
} from '@/lib/plugin-sdk'
import { LtCard, LtNote, LtRows, LtSection, LtTextRow, LtToggleRow, ToastHost, UI, fmtInt, hostOf, useToast } from './settings-ui'
import { formatDisplayMetrics, isSceneNotApplied, isViewportMismatch, readDisplayMetrics } from './display-metrics'
import {
  applyM3uUrls,
  clearLiveTvMemoryCache,
  clearStoredLiveTvChannels,
  deleteLiveTvList,
  deleteXtreamLoginAndData,
  ensureM3uList,
  getLiveTvLists,
  getLiveTvUrlsKey,
  getM3uUrls,
  importList,
  getM3uDraftUrls,
  onLiveTvListsChanged,
  setM3uDraftUrls,
  type LiveTvList,
  getLiveTvHideHero,
  setLiveTvHideHero,
  parseXtreamSource,
} from './live-tv-data'
import type { ImportStatus } from './index-client'
import { recordListImportOutcome } from './list-import-flags'
import {
  getM3uFetchProgress,
  reportM3uFetchJobProgress,
  runM3uFetch,
  subscribeM3uFetch,
} from './m3u-fetch-progress'
import { useHubText } from './hub-strings'
import { EpgStatusCard } from './epg-sources-section'
import { XtreamLoginSection, prefillXtreamLogin } from './xtream-login-section'
import { VodLibraryCard } from './vod-library-card'
import { CategoriesDialog } from './category-curation-panel'
import { PlaylistCard, playlistHost } from './playlist-card'
import { TvSettingsPage } from './tv-settings-views'

const HOME_OVERRIDE_PLUGIN_ID = 'com.lumio.live-tv'

/** Adressfältet är en rad: flera adresser skiljs med blanksteg eller komma. */
export function splitUrls(text: string): string[] {
  return text.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean)
}

export type CurationTarget = { list: LiveTvList; mode: 'settings' | 'after-import' } | null

/**
 * Sidans tillstånd och handlingar, delade av skrivbordets kortsida och TV:ns
 * radsida så att de två ytorna aldrig kan bete sig olika för samma knapp.
 */
export function useLiveTvSettings() {
  const { t } = useLang()
  const { h } = useHubText()
  const toast = useToast()
  const fetchProgress = useSyncExternalStore(subscribeM3uFetch, getM3uFetchProgress, getM3uFetchProgress)
  const [hideHero, setHideHeroState] = useState<boolean>(() => getLiveTvHideHero())
  const [m3uText, setM3uText] = useState('')
  const [homeOverrideEnabled, setHomeOverrideEnabled] = useState(false)
  const [homeOverrideError, setHomeOverrideError] = useState('')
  const [lists, setLists] = useState<LiveTvList[]>([])
  /**
   * Kategorierna. Öppnas från kortet/raden eller automatiskt EN gång efter en
   * NY listas första import (m3u och Xtream).
   */
  const [curationList, setCurationList] = useState<CurationTarget>(null)
  /** Bara listor som aldrig visat panelen — en omhämtning öppnar inget. */
  function maybeOpenCurationAfterImport(listId: string) {
    const fresh = getLiveTvLists().find((entry) => entry.id === listId)
    if (fresh && fresh.curationSeen !== true) setCurationList({ list: fresh, mode: 'after-import' })
  }
  // Omhämtning av EN lista (kortets egen knapp) — skild från M3U-fältets kö,
  // som hämtar hela uppsättningen adresser.
  const [listProgress, setListProgress] = useState<{ listId: string; state: ImportStatus['state']; received: number; total: number | null } | null>(null)

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])

  useEffect(() => {
    const sync = () => setM3uText(getM3uDraftUrls().join(' '))
    sync()
    return onProfileChanged(sync)
  }, [])

  useEffect(() => {
    const sync = () => {
      setHomeOverrideEnabled(getHomeOverridePluginId() === HOME_OVERRIDE_PLUGIN_ID)
      setHomeOverrideError('')
    }
    sync()
    return onHomeOverridePluginChanged(sync)
  }, [])

  async function fetchM3u() {
    const urls = splitUrls(m3uText)
    if (urls.length === 0) return

    setM3uDraftUrls(urls)
    clearLiveTvMemoryCache()
    clearStoredLiveTvChannels()

    // Stegningen och kvittot ligger i m3u-fetch-progress, utanför React: den
    // här sektionen monteras om varje gång någon lämnar inställningarna och
    // kommer tillbaka, och ett tillstånd som dog med komponenten var precis
    // det som fick en betatestare att starta hämtningen en andra gång.
    const ok = await runM3uFetch(urls, async (url) => {
      // Fanns listan redan? Om INTE, och importen misslyckas, ska den
      // nyskapade, tomma listposten inte lämnas kvar som en orphan (spec §5).
      const source = getLiveTvUrlsKey([url])
      const existedBefore = getLiveTvLists().some((entry) => entry.source === source)
      const list = ensureM3uList(url)
      const status = await importList(list, (s) => reportM3uFetchJobProgress(s.received, s.total))
      if (status.state === 'error') {
        if (!existedBefore) deleteLiveTvList(list.id)
        throw new Error(status.error ?? 'm3u import failed')
      }
      // Bara första importen av en ny källa — en omhämtning öppnar aldrig panelen.
      if (!existedBefore) maybeOpenCurationAfterImport(list.id)
      return status.result?.total ?? 0
    })

    // Bara en hel omgång får skriva om de aktiva adresserna.
    if (ok) applyM3uUrls(urls)
  }

  /**
   * Ta bort en spellista helt (bekräftad): posten, kanalerna i indexet,
   * biblioteket, kategorierna och EPG-källorna — och för M3U även adressen
   * den kom ifrån (annars kom feeden tillbaka vid nästa hämtning).
   * Xtream-listor går via inloggningen, så kontot följer med.
   */
  function removeList(list: LiveTvList) {
    if (list.kind === 'xtream' && list.xtreamLoginId) {
      deleteXtreamLoginAndData(list.xtreamLoginId)
    } else {
      const remaining = getM3uUrls().filter((url) => !url.startsWith('xtream://') && hostOf(url) !== list.name && url !== list.url)
      applyM3uUrls(remaining)
      setM3uText(remaining.join(' '))
      deleteLiveTvList(list.id)
    }
    clearLiveTvMemoryCache()
    clearStoredLiveTvChannels()
    toast(h('hostRemoved', { host: playlistHost(list) }))
  }

  /**
   * Hämta om EN lista. Listan finns redan, så ett fel lämnar den orörd med
   * sitt gamla innehåll (spec §5) — `needsReimport`/`lastImportError` på
   * posten är det som gör felet synligt efteråt.
   */
  async function refetchList(list: LiveTvList) {
    setListProgress({ listId: list.id, state: 'fetching', received: 0, total: null })
    try {
      const status = await importList(list, (s) => setListProgress({ listId: list.id, state: s.state, received: s.received, total: s.total ?? null }))
      recordListImportOutcome(list.id, status.state === 'error' ? (status.error ?? 'import failed') : undefined)
      if (status.state !== 'error') toast(h('hostUpdated', { host: playlistHost(list) }))
    } catch (err) {
      recordListImportOutcome(list.id, err instanceof Error ? err.message : String(err))
    } finally {
      setListProgress(null)
    }
  }

  function relogin(list: LiveTvList) {
    const xtreamSource = parseXtreamSource(list.source)
    prefillXtreamLogin({ server: xtreamSource ? `http://${xtreamSource.host}` : '', loginId: xtreamSource?.loginId })
  }

  function toggleHomeOverride(checked: boolean) {
    setHomeOverrideError('')
    if (!checked) {
      disableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
      return
    }
    const result = tryEnableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
    if (!result.ok) setHomeOverrideError(t('homeOverrideAlreadySet'))
  }

  function setHideHero(value: boolean) {
    setLiveTvHideHero(value)
    setHideHeroState(value)
  }

  return {
    lists,
    m3uText,
    setM3uText,
    fetchProgress,
    fetchM3u,
    removeList,
    refetchList,
    relogin,
    listProgress,
    homeOverrideEnabled,
    homeOverrideError,
    toggleHomeOverride,
    hideHero,
    setHideHero,
    curationList,
    setCurationList,
    maybeOpenCurationAfterImport,
  }
}

/**
 * LIVE TV:S INSTÄLLNINGSSIDA (handoff 2026-09-24 §3), blocken i ordning:
 * 1) de två växlarna, 2) PLAYLISTS med ett kort per spellista, 3) M3U,
 * 4) XTREAM LOGIN, 5) PROGRAMME GUIDE STATUS, 6) USE AS LIBRARY. På TV är
 * sidan rader och kategorierna staplade vyer (§4.2, `tv-settings-views.tsx`).
 * Toaster och dialoger lever i `ToastHost`/`LtDialog` (settings-ui.tsx).
 */
export function LiveTvSettingsSection() {
  const isTv = useTvMode()
  return (
    <ToastHost>
      {isTv ? <TvSettingsPage /> : <DesktopPage />}
    </ToastHost>
  )
}

function DesktopPage() {
  const { t } = useLang()
  const { h, locale } = useHubText()
  const s = useLiveTvSettings()
  const fetchLabel = s.fetchProgress.status === 'fetching' ? h('fetching') : h('fetchList')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: UI.text }}>
      <LtRows>
        <LtToggleRow first label={h('useAsHome')} desc={h('useAsHomeDesc')} checked={s.homeOverrideEnabled} onChange={s.toggleHomeOverride} error={s.homeOverrideError || null} />
        <LtToggleRow first={false} label={h('hideHero')} desc={h('hideHeroDesc')} checked={s.hideHero} onChange={s.setHideHero} />
      </LtRows>

      <div>
        <LtSection eyebrow={h('playlists')} title={h('yourPlaylists')} hint={h('playlistsHint')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {s.lists.length === 0 ? <LtNote>{h('noPlaylistsYet')}</LtNote> : null}
          {s.lists.map((list) => (
            <PlaylistCard
              key={list.id}
              list={list}
              busy={s.listProgress?.listId === list.id}
              onCategories={() => s.setCurationList({ list, mode: 'settings' })}
              onUpdate={() => void s.refetchList(list)}
              onRemove={() => s.removeList(list)}
              onRelogin={() => s.relogin(list)}
            />
          ))}
        </div>
      </div>

      <div>
        <LtSection eyebrow={h('kindM3u')} title={h('m3uTitle')} hint={h('m3uHint')} />
        <LtRows>
          <LtTextRow
            first
            label={h('playlistUrl')}
            value={s.m3uText}
            onChange={s.setM3uText}
            placeholder={t('m3uUrlsPlaceholder')}
            fieldWidth={260}
            button={fetchLabel}
            onButton={() => void s.fetchM3u()}
            buttonDisabled={s.fetchProgress.status === 'fetching'}
          />
        </LtRows>
        {/*
          Hämtningen syns som EGET block, inte bara som knapptext: en stor
          spellista tar tiotals sekunder, och blocket ligger kvar tills nästa
          hämtning startar — det läser tillståndet ur modulen, så det är sant
          även för den som kommer tillbaka efteråt.
        */}
        {s.fetchProgress.status !== 'idle' && (
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            <style>{'@keyframes lumio-livetv-spin{to{transform:rotate(360deg)}}'}</style>
            {s.fetchProgress.status === 'fetching' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: UI.text }}>
                  <span aria-hidden style={{ width: 12, height: 12, flex: 'none', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'rgba(255,255,255,0.9)', animation: 'lumio-livetv-spin 0.7s linear infinite' }} />
                  <span>{h('m3uFetchProgress', { current: s.fetchProgress.current, total: s.fetchProgress.total })}</span>
                  {/* Jobbets EGET förlopp: en adress kan vara 17 000 kanaler. */}
                  {s.fetchProgress.jobProgress ? (
                    <span style={{ color: UI.muted }}>
                      {s.fetchProgress.jobProgress.total
                        ? h('listImportProgress', { received: fmtInt(s.fetchProgress.jobProgress.received, locale), total: fmtInt(s.fetchProgress.jobProgress.total, locale) })
                        : h('listImportProgressUnknown')}
                    </span>
                  ) : null}
                </div>
                <LtNote>{h('m3uFetchKeepOpen')}</LtNote>
              </>
            )}
            {s.fetchProgress.results.map((result) => (
              <div key={result.url} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: UI.muted, minWidth: 0 }}>
                <span aria-hidden style={{ color: UI.green, flex: 'none' }}>✓</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: UI.text }}>{hostOf(result.url)}</span>
                <span style={{ flex: 'none' }}>{h('channelsCount', { count: fmtInt(result.channels, locale) })}</span>
              </div>
            ))}
            {s.fetchProgress.status === 'error' && (
              <div role="alert" style={{ fontSize: 12.5, color: UI.danger, lineHeight: 1.45 }}>
                {h('m3uFetchFailedOn', { host: hostOf(s.fetchProgress.url ?? ''), error: s.fetchProgress.error ?? '' })}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <LtSection eyebrow={h('xtreamLogin')} title={h('xtreamLogin')} hint={h('xtreamHint')} />
        <XtreamLoginSection onImported={(listId, existedBefore) => { if (!existedBefore) s.maybeOpenCurationAfterImport(listId) }} />
      </div>

      <EpgStatusCard />

      <VodLibraryCard />

      <DisplayMetricsCard />

      {s.curationList ? (
        <CategoriesDialog list={s.curationList.list} mode={s.curationList.mode} onClose={() => s.setCurationList(null)} />
      ) : null}
    </div>
  )
}

/**
 * Skärmens mått, synliga för den som felsöker en TV på distans.
 *
 * "Channels are zoomed in and there is a white box issue" (Fire TV Cube,
 * 2026-09-25) går inte att se i skrivbordets TV-läge och inte i
 * Television_4K-emulatorn — där är layouten och den synliga ytan identiska
 * (mätt: 960×540 mot 960×540 @1). Felet måste alltså mätas på enheten som
 * visar det, och testaren når inte alltid debug-loggen. Raden står därför
 * här, att fotografera.
 *
 * Skiljer sig de två måtten ritas sidan mot en större yta än den som visas —
 * då är det den fällan, och kortet säger det rakt ut.
 */
function DisplayMetricsCard() {
  const [metrics, setMetrics] = useState(() => readDisplayMetrics())
  useEffect(() => {
    const sync = () => setMetrics(readDisplayMetrics())
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])
  if (!metrics) return null
  const mismatch = isViewportMismatch(metrics)
  return (
    <div>
      <LtSection eyebrow="Display" />
      <LtCard gap={8} testId="display-metrics-card">
        <code
          style={{
            display: 'block', fontFamily: UI.mono, fontSize: 'var(--st-small, 12.5px)',
            color: UI.soft, wordBreak: 'break-word',
          }}
        >
          {formatDisplayMetrics(metrics)}
        </code>
        <p style={{ margin: 0, fontSize: 'var(--st-small, 12.5px)', lineHeight: 1.5, color: mismatch ? UI.danger : UI.muted }}>
          {isSceneNotApplied(metrics)
            ? 'THE TV SCENE IS NOT BEING APPLIED. Everything is enlarged and the area outside the page stays unpainted.'
            : mismatch
              ? 'The page is drawn against a larger area than the screen shows — that is the zoom fault.'
              : 'Layout and visible area match, and the scene is scaling the page.'}
        </p>
      </LtCard>
    </div>
  )
}
