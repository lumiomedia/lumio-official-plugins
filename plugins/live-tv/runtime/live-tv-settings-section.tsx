'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  disableHomeOverridePlugin,
  getHomeOverridePluginId,
  onHomeOverridePluginChanged,
  onProfileChanged,
  tryEnableHomeOverridePlugin,
  useLang,
} from '@/lib/plugin-sdk'
import { LtNote, LtRows, LtSection, LtTextRow, LtToggleRow, ToastHost, UI, fmtInt, hostOf, useToast } from './settings-ui'
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
import { CategoryCurationPanel } from './category-curation-panel'
import { PlaylistCard, playlistHost } from './playlist-card'

const HOME_OVERRIDE_PLUGIN_ID = 'com.lumio.live-tv'

/** Adressfältet är en rad: flera adresser skiljs med blanksteg eller komma. */
function splitUrls(text: string): string[] {
  return text.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean)
}

/**
 * LIVE TV:S INSTÄLLNINGSSIDA (handoff 2026-09-24 §3), blocken i ordning:
 * 1) de två växlarna, 2) PLAYLISTS med ett kort per spellista, 3) M3U,
 * 4) XTREAM LOGIN, 5) PROGRAMME GUIDE STATUS, 6) USE AS LIBRARY. Toaster och
 * dialoger lever i `ToastHost`/`LtDialog` (settings-ui.tsx).
 */
export function LiveTvSettingsSection() {
  return (
    <ToastHost>
      <SettingsPage />
    </ToastHost>
  )
}

function SettingsPage() {
  const { t } = useLang()
  const { h, locale } = useHubText()
  const toast = useToast()
  const fetchProgress = useSyncExternalStore(subscribeM3uFetch, getM3uFetchProgress, getM3uFetchProgress)
  const [hideHero, setHideHero] = useState<boolean>(() => getLiveTvHideHero())
  const [m3uText, setM3uText] = useState('')
  const [homeOverrideEnabled, setHomeOverrideEnabled] = useState(false)
  const [homeOverrideError, setHomeOverrideError] = useState('')
  const [lists, setLists] = useState<LiveTvList[]>([])
  /**
   * Kategoripanelen. Öppnas från kortet eller automatiskt EN gång efter en NY
   * listas första import (m3u och Xtream).
   */
  const [curationList, setCurationList] = useState<{ list: LiveTvList; mode: 'settings' | 'after-import' } | null>(null)
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

  async function handleFetchM3uList() {
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
   * Ta bort en spellista helt (bekräftad i kortet): posten, kanalerna i
   * indexet, biblioteket, kategorierna och EPG-källorna — och för M3U även
   * adressen den kom ifrån (annars kom feeden tillbaka vid nästa hämtning).
   * Xtream-listor går via inloggningen, så kontot följer med.
   */
  function handleRemoveList(list: LiveTvList) {
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
  async function handleRefetchList(list: LiveTvList) {
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

  function handleRelogin(list: LiveTvList) {
    const xtreamSource = parseXtreamSource(list.source)
    prefillXtreamLogin({ server: xtreamSource ? `http://${xtreamSource.host}` : '', loginId: xtreamSource?.loginId })
  }

  function handleHomeOverrideToggle(checked: boolean) {
    setHomeOverrideError('')
    if (!checked) {
      disableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
      return
    }
    const result = tryEnableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
    if (!result.ok) setHomeOverrideError(t('homeOverrideAlreadySet'))
  }

  const fetchLabel = fetchProgress.status === 'fetching' ? h('fetching') : h('fetchList')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: UI.text }}>
      <LtRows>
        <LtToggleRow first label={h('useAsHome')} desc={h('useAsHomeDesc')} checked={homeOverrideEnabled} onChange={handleHomeOverrideToggle} error={homeOverrideError || null} />
        <LtToggleRow
          first={false}
          label={h('hideHero')}
          desc={h('hideHeroDesc')}
          checked={hideHero}
          onChange={(value) => { setLiveTvHideHero(value); setHideHero(value) }}
        />
      </LtRows>

      <div>
        <LtSection eyebrow={h('playlists')} title={h('yourPlaylists')} hint={h('playlistsHint')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lists.length === 0 ? <LtNote>{h('noPlaylistsYet')}</LtNote> : null}
          {lists.map((list) => (
            <PlaylistCard
              key={list.id}
              list={list}
              busy={listProgress?.listId === list.id}
              onCategories={() => setCurationList({ list, mode: 'settings' })}
              onUpdate={() => void handleRefetchList(list)}
              onRemove={() => handleRemoveList(list)}
              onRelogin={() => handleRelogin(list)}
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
            value={m3uText}
            onChange={setM3uText}
            placeholder={t('m3uUrlsPlaceholder')}
            fieldWidth={260}
            button={fetchLabel}
            onButton={() => void handleFetchM3uList()}
            buttonDisabled={fetchProgress.status === 'fetching'}
          />
        </LtRows>
        {/*
          Hämtningen syns som EGET block, inte bara som knapptext: en stor
          spellista tar tiotals sekunder, och blocket ligger kvar tills nästa
          hämtning startar — det läser tillståndet ur modulen, så det är sant
          även för den som kommer tillbaka efteråt.
        */}
        {fetchProgress.status !== 'idle' && (
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            <style>{'@keyframes lumio-livetv-spin{to{transform:rotate(360deg)}}'}</style>
            {fetchProgress.status === 'fetching' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: UI.text }}>
                  <span aria-hidden style={{ width: 12, height: 12, flex: 'none', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'rgba(255,255,255,0.9)', animation: 'lumio-livetv-spin 0.7s linear infinite' }} />
                  <span>{h('m3uFetchProgress', { current: fetchProgress.current, total: fetchProgress.total })}</span>
                  {/* Jobbets EGET förlopp: en adress kan vara 17 000 kanaler. */}
                  {fetchProgress.jobProgress ? (
                    <span style={{ color: UI.muted }}>
                      {fetchProgress.jobProgress.total
                        ? h('listImportProgress', { received: fmtInt(fetchProgress.jobProgress.received, locale), total: fmtInt(fetchProgress.jobProgress.total, locale) })
                        : h('listImportProgressUnknown')}
                    </span>
                  ) : null}
                </div>
                <LtNote>{h('m3uFetchKeepOpen')}</LtNote>
              </>
            )}
            {fetchProgress.results.map((result) => (
              <div key={result.url} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: UI.muted, minWidth: 0 }}>
                <span aria-hidden style={{ color: UI.green, flex: 'none' }}>✓</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: UI.text }}>{hostOf(result.url)}</span>
                <span style={{ flex: 'none' }}>{h('channelsCount', { count: fmtInt(result.channels, locale) })}</span>
              </div>
            ))}
            {fetchProgress.status === 'error' && (
              <div role="alert" style={{ fontSize: 12.5, color: UI.danger, lineHeight: 1.45 }}>
                {h('m3uFetchFailedOn', { host: hostOf(fetchProgress.url ?? ''), error: fetchProgress.error ?? '' })}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <LtSection eyebrow={h('xtreamLogin')} title={h('xtreamLogin')} hint={h('xtreamHint')} />
        <XtreamLoginSection onImported={(listId, existedBefore) => { if (!existedBefore) maybeOpenCurationAfterImport(listId) }} />
      </div>

      <EpgStatusCard />

      <VodLibraryCard />

      {curationList ? (
        <CategoryCurationPanel list={curationList.list} mode={curationList.mode} onClose={() => setCurationList(null)} />
      ) : null}
    </div>
  )
}
