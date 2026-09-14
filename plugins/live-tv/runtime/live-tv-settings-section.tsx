'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Card, Checkbox, PillBtn, TOKENS, eyebrowStyle, inputStyle } from '@/lib/plugin-sdk'
import {
  disableHomeOverridePlugin,
  getHomeOverridePluginId,
  onHomeOverridePluginChanged,
  onProfileChanged,
  tryEnableHomeOverridePlugin,
  useLang,
} from '@/lib/plugin-sdk'
import {
  applyM3uUrls,
  clearLiveTvMemoryCache,
  clearStoredLiveTvChannels,
  deleteLiveTvList,
  ensureM3uList,
  getLiveTvLists,
  getLiveTvUrlsKey,
  getM3uUrls,
  importList,
  getM3uDraftUrls,
  isLogoFallbackEnabled,
  onLiveTvListsChanged,
  setLogoFallbackEnabled,
  setM3uDraftUrls,
  updateLiveTvListEpg,
  type LiveTvList,
  getLiveTvHideHero,
  setLiveTvHideHero,
  getXtreamLogins,
  parseXtreamSource,
} from './live-tv-data'
import { completeLogos } from './index-client'
import type { ImportStatus } from './index-client'
import { recordListImportOutcome } from './list-import-flags'
import {
  getM3uFetchProgress,
  reportM3uFetchJobProgress,
  runM3uFetch,
  subscribeM3uFetch,
} from './m3u-fetch-progress'
import { useHubText } from './hub-strings'
import { EpgSourcesSection, EpgStatusCard } from './epg-sources-section'
import { XtreamLoginSection, prefillXtreamLogin } from './xtream-login-section'


const settingsActionButtonClass =
  'rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/30 hover:text-white disabled:opacity-50'
const HOME_OVERRIDE_PLUGIN_ID = 'com.lumio.live-tv'

function hostOf(url: string): string {
  try { return new URL(url).hostname || url } catch { return url }
}

/**
 * Kvittots tidsstämpel. Idag räcker klockslaget; är hämtningen äldre säger
 * bara "09:41" inget alls om huruvida listan är färsk, så då kommer datumet
 * med.
 */
function formatFetchedAt(iso: string, locale: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return iso
  const now = new Date()
  const sameDay = then.toDateString() === now.toDateString()
  return sameDay
    ? then.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : then.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function LiveTvSettingsSection() {
  const { t, lang } = useLang()
  const { h, locale } = useHubText()
  const fetchProgress = useSyncExternalStore(subscribeM3uFetch, getM3uFetchProgress, getM3uFetchProgress)
  const [hideHero, setHideHero] = useState<boolean>(() => getLiveTvHideHero())
  const [m3uText, setM3uText] = useState('')
  const [homeOverrideEnabled, setHomeOverrideEnabled] = useState(false)
  const [homeOverrideError, setHomeOverrideError] = useState('')
  const [lists, setLists] = useState<LiveTvList[]>([])
  // Omhämtning av EN lista (kortets egen knapp) — skild från M3U-fältets kö
  // ovan, som hämtar hela uppsättningen adresser.
  const [listProgress, setListProgress] = useState<{ listId: string; state: ImportStatus['state']; received: number; total: number | null } | null>(null)
  // Komplettera-knappens eget tillstånd, per lista — samma mönster som
  // `listProgress`: en enda useState nyckelad på list-id, ingen global.
  const [logoComplete, setLogoComplete] = useState<
    | { listId: string; status: 'running' }
    | { listId: string; status: 'done'; matched: number; total: number }
    | { listId: string; status: 'error'; error: string }
    | null
  >(null)

  useEffect(() => {
    const sync = () => setLists(getLiveTvLists())
    sync()
    return onLiveTvListsChanged(sync)
  }, [])

  useEffect(() => {
    const sync = () => setM3uText(getM3uDraftUrls().join('\n'))
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
    const urls = m3uText.split('\n').map((u) => u.trim()).filter(Boolean)
    if (urls.length === 0) return

    setM3uDraftUrls(urls)
    clearLiveTvMemoryCache()
    clearStoredLiveTvChannels()

    // Stegningen och kvittot ligger i m3u-fetch-progress, utanför React: den
    // här sektionen monteras om varje gång någon lämnar inställningarna och
    // kommer tillbaka, och ett tillstånd som dog med komponenten var precis
    // det som fick en betatestare att starta hämtningen en andra gång.
    const ok = await runM3uFetch(urls, async (url) => {
      // Fanns listan redan (samma källa importerad tidigare)? Om INTE, och
      // importen misslyckas, ska den nyskapade, tomma listposten inte lämnas
      // kvar som en orphan (spec §5) — bara knappens "hämta" ska kunna
      // skapa en riktig, importerad lista.
      const source = getLiveTvUrlsKey([url])
      const existedBefore = getLiveTvLists().some((entry) => entry.source === source)
      const list = ensureM3uList(url)
      const status = await importList(list, (s) => reportM3uFetchJobProgress(s.received, s.total))
      if (status.state === 'error') {
        if (!existedBefore) deleteLiveTvList(list.id)
        throw new Error(status.error ?? 'm3u import failed')
      }
      return status.result?.total ?? 0
    })

    // Bara en hel omgång får skriva om de aktiva adresserna. Föll en av dem
    // står den gamla uppsättningen kvar, i stället för att halva bytet blir
    // det nya normalläget.
    if (ok) applyM3uUrls(urls)
  }

  /**
   * Ta bort en lista helt: raden i inställningarna, kanalerna, cachen OCH
   * M3U-adressen den kom ifrån (både aktiv och i utkastet) — annars kom
   * feeden tillbaka vid nästa hämtning, och det gick inte att bli av med
   * en gammal spellista när man bara ville ha kvar Xtream-inloggningen.
   * Xtream-poster har sin egen Ta bort-knapp och rörs inte här.
   */
  function handleRemoveList(list: LiveTvList) {
    const remaining = getM3uUrls().filter((url) => !url.startsWith('xtream://') && hostOf(url) !== list.name)
    applyM3uUrls(remaining)
    setM3uText(remaining.join('\n'))
    deleteLiveTvList(list.id)
    clearLiveTvMemoryCache()
    clearStoredLiveTvChannels()
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
    } catch (err) {
      recordListImportOutcome(list.id, err instanceof Error ? err.message : String(err))
    } finally {
      setListProgress(null)
    }
  }

  /**
   * Kompletterar en listas logotyper mot iptv-org. `completeLogos` sänder
   * `emitIndexChanged()` själv vid ett lyckat svar (se `index-client.ts`) —
   * den ropas INTE här igen, det hade blivit en dubbelsändning.
   */
  async function handleCompleteLogos(list: LiveTvList) {
    setLogoComplete({ listId: list.id, status: 'running' })
    try {
      const result = await completeLogos(list.source)
      setLogoComplete({ listId: list.id, status: 'done', matched: result.matched, total: result.total })
    } catch (err) {
      setLogoComplete({ listId: list.id, status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  }

  function handleHomeOverrideToggle(checked: boolean) {
    setHomeOverrideError('')
    if (!checked) {
      disableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
      return
    }
    const result = tryEnableHomeOverridePlugin(HOME_OVERRIDE_PLUGIN_ID)
    if (!result.ok) {
      setHomeOverrideError(t('homeOverrideAlreadySet'))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Checkbox checked={homeOverrideEnabled} onChange={(value) => handleHomeOverrideToggle(value)} label={t('homeOverrideUseAsHome')} hint={t('liveTvHomeOverrideDesc')} />
          {homeOverrideError ? <p style={{ margin: 0, fontSize: 12, color: TOKENS.red }}>{homeOverrideError}</p> : null}
          <Checkbox
            checked={hideHero}
            onChange={(value) => {
              setLiveTvHideHero(value)
              setHideHero(value)
            }}
            label={lang === 'sv' ? 'Dölj filmhjälten på Live TV-sidan' : 'Hide the movie hero on the Live TV page'}
            hint={lang === 'sv'
              ? 'Live TV börjar då direkt med hubben i stället för under appens hjältekarusell.'
              : 'Live TV then starts with the hub instead of below the app’s hero carousel.'}
          />
        </div>
      </Card>

      <Card>
        <style>{'@keyframes lumio-livetv-spin{to{transform:rotate(360deg)}}'}</style>
        <div style={{ ...eyebrowStyle, marginBottom: 6 }}>M3U</div>
        <textarea
          value={m3uText}
          onChange={(event) => setM3uText(event.target.value)}
          placeholder={t('m3uUrlsPlaceholder')}
          rows={3}
          style={{ ...inputStyle, minHeight: 88, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <PillBtn variant="accent" onClick={() => void handleFetchM3uList()} disabled={fetchProgress.status === 'fetching'}>
            {fetchProgress.status === 'fetching'
              ? t('m3uLoading')
              : fetchProgress.status === 'done'
                ? t('m3uFetchListDone')
                : fetchProgress.status === 'error'
                  ? t('m3uFetchListError')
                  : t('m3uFetchList')}
          </PillBtn>
        </div>
        {/*
          Hämtningen syns som EGET block, inte bara som knapptext.
          Knapptexten var hela återkopplingen förut, och den räckte inte: en
          stor spellista tar tiotals sekunder, klartexten nollades av en timer
          efter 1,8 s, och tillståndet dog när sektionen monterades om. Blocket
          här ligger kvar tills nästa hämtning startar och läser tillståndet
          ur modulen, så det är sant även för den som kommer tillbaka efteråt.
        */}
        {fetchProgress.status !== 'idle' && (
          <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
            {fetchProgress.status === 'fetching' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: TOKENS.text }}>
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      flex: 'none',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.25)',
                      borderTopColor: 'rgba(255,255,255,0.9)',
                      animation: 'lumio-livetv-spin 0.7s linear infinite',
                    }}
                  />
                  <span>{h('m3uFetchProgress', { current: fetchProgress.current, total: fetchProgress.total })}</span>
                  {/* Jobbets EGET förlopp: en enda adress kan vara 17 000
                      kanaler, och "Hämtar lista 1 av 1…" stod still i en
                      minut utan den här raden. */}
                  {fetchProgress.jobProgress ? (
                    <span style={{ color: TOKENS.textMute }}>
                      {fetchProgress.jobProgress.total
                        ? h('listImportProgress', {
                            received: fetchProgress.jobProgress.received.toLocaleString(locale),
                            total: fetchProgress.jobProgress.total.toLocaleString(locale),
                          })
                        : h('listImportProgressUnknown')}
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: TOKENS.textMute, lineHeight: 1.45 }}>{h('m3uFetchKeepOpen')}</div>
              </>
            )}
            {fetchProgress.results.map((result) => (
              <div key={result.url} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: TOKENS.textMute, minWidth: 0 }}>
                <span aria-hidden style={{ color: '#4ade80', flex: 'none' }}>✓</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: TOKENS.text }}>{hostOf(result.url)}</span>
                <span style={{ flex: 'none' }}>{h('channelsCount', { count: result.channels })}</span>
              </div>
            ))}
            {fetchProgress.status === 'error' && (
              <div role="alert" style={{ fontSize: 12.5, color: '#fca5a5', lineHeight: 1.45 }}>
                {h('m3uFetchFailedOn', { host: hostOf(fetchProgress.url ?? ''), error: fetchProgress.error ?? '' })}
              </div>
            )}
          </div>
        )}
      </Card>

      <XtreamLoginSection />

      <EpgStatusCard />

      {lists.map((list) => {
        const busy = listProgress?.listId === list.id ? listProgress : null
        const importable = list.kind === 'm3u' || list.kind === 'xtream'
        // Enhetsöverföringen speglar `lists` men inte `xtream_logins`
        // (lösenord), så en överförd Xtream-lista har en källa som ingen
        // inloggning svarar mot — `importList` kastar, och listan står tom
        // utan att säga varför.
        const xtreamSource = list.kind === 'xtream' ? parseXtreamSource(list.source) : null
        const needsLogin = list.kind === 'xtream' && !getXtreamLogins().some((login) => login.id === list.xtreamLoginId)
        return (
        <Card key={list.id}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</span>
                {list.needsReimport ? (
                  <span style={{ flex: 'none', fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: 'rgba(244,132,95,0.18)', color: '#f4845f' }}>{h('listNeedsReimport')}</span>
                ) : null}
              </div>
              <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>
                {(list.channelCount ?? 0).toLocaleString(locale)} {t('m3uChannels')}
                {' · '}
                {list.fetchedAt
                  ? h('m3uFetchedAt', { time: formatFetchedAt(list.fetchedAt, locale) })
                  : h('m3uNeverFetched')}
              </div>
              {busy ? (
                <div style={{ fontSize: 12, color: TOKENS.text, marginTop: 4 }}>
                  {busy.state === 'parsing'
                    ? h('listImportParsing')
                    : busy.state === 'writing'
                      ? h('listImportWriting')
                      : busy.total
                        ? h('listImportProgress', { received: busy.received.toLocaleString(locale), total: busy.total.toLocaleString(locale) })
                        : h('listImportProgressUnknown')}
                </div>
              ) : null}
              {!busy && needsLogin ? (
                <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 4 }}>{h('xtreamNeedsLogin')}</div>
              ) : null}
              {/* Kapad spellista: jobbet svarade `done`, så utan den här raden
                  ser en HALV lista ut som en hel. */}
              {list.truncated ? (
                <div data-testid={`list-truncated-${list.id}`} role="alert" style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>{h('listTruncated')}</div>
              ) : null}
              {!busy && list.lastImportError ? (
                <div role="alert" style={{ fontSize: 12, color: '#fca5a5', marginTop: 4 }}>{h('listImportFailed', { error: list.lastImportError })}</div>
              ) : null}
            </div>
            <div style={{ display: 'flex', flex: 'none', alignItems: 'center', gap: 8 }}>
              {needsLogin ? (
                <PillBtn size="sm" variant="accent" onClick={() => prefillXtreamLogin({ server: xtreamSource ? `http://${xtreamSource.host}` : '', loginId: xtreamSource?.loginId })}>
                  {h('xtreamRelogin')}
                </PillBtn>
              ) : importable ? (
                <PillBtn size="sm" onClick={() => void handleRefetchList(list)} disabled={busy !== null}>
                  {busy ? h('listRefetching') : h('listRefetch')}
                </PillBtn>
              ) : null}
              <PillBtn size="sm" variant="danger" onClick={() => handleRemoveList(list)}>{t('liveTvXtreamRemove')}</PillBtn>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <EpgSourcesSection
              autoUrl={list.urlTvg}
              manualUrls={list.epgUrls}
              onChangeManual={(epgUrls) => updateLiveTvListEpg(list.id, { epgUrls })}
              autoDisabled={list.autoEpgDisabled}
              onToggleAuto={(disabled) => updateLiveTvListEpg(list.id, { autoEpgDisabled: disabled })}
            />
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* data-testid sitter på en vanlig div, inte på primitiven — Checkbox
                tar bara { checked, onChange, disabled, label, hint, right }, och
                appens riktiga primitiv (dist-bygget löser @/lib/plugin-sdk mot
                den) fäller TypeScripts excess-property-check annars. Samma
                mönster som `list-truncated-${list.id}` ovan. */}
            {/* Egna listors kanaler renderas via `withIndexTwins` (tvillingen bär
                URSPRUNGSLISTANS switch-tillstånd) — den egna listans switch
                filtrerar ingenting. Spärrad av samma skäl som Komplettera
                nedan: en kontroll som inte gör något får inte visas som om
                den gjorde det. */}
            <div data-testid={`logo-fallback-toggle-${list.id}`}>
              <Checkbox
                checked={isLogoFallbackEnabled(list)}
                onChange={(value) => setLogoFallbackEnabled(list.id, value)}
                disabled={list.kind === 'custom'}
                label={h('logoFallbackToggle')}
                hint={h('logoFallbackHint')}
              />
            </div>
            {/* Egen rad, med en synlig avdelare ovanför: switchen ÄR
                inställningen (styr OM reserven får användas), knappen är en
                HANDLING (hämtar matchningarna nu) — de ska inte läsas som en
                enda kontroll bara för att de står i samma kort (Jerrys ord
                efter test: "bara en checkbox, finns en complete-knapp men
                borde vara en separat inställning"). */}
            <div style={{ borderTop: `1px solid ${TOKENS.border}`, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span data-testid={`logo-complete-${list.id}`}>
                <PillBtn
                  size="sm"
                  onClick={() => void handleCompleteLogos(list)}
                  disabled={!isLogoFallbackEnabled(list) || list.kind === 'custom' || (logoComplete?.listId === list.id && logoComplete.status === 'running')}
                >
                  {logoComplete?.listId === list.id && logoComplete.status === 'running' ? h('logoCompleteRunning') : h('logoComplete')}
                </PillBtn>
              </span>
              {logoComplete?.listId === list.id && logoComplete.status === 'done' ? (
                <span style={{ fontSize: 12, color: TOKENS.textMute }}>
                  {h('logoCompleteResult', { matched: logoComplete.matched, total: logoComplete.total })}
                </span>
              ) : null}
              {logoComplete?.listId === list.id && logoComplete.status === 'error' ? (
                <span role="alert" style={{ fontSize: 12, color: '#fca5a5' }}>{logoComplete.error}</span>
              ) : null}
            </div>
          </div>
        </Card>
        )
      })}
    </div>
  )

}
