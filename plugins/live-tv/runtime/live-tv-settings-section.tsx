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
  onLiveTvListsChanged,
  setM3uDraftUrls,
  updateLiveTvListEpg,
  type LiveTvList,
  getLiveTvHideHero,
  setLiveTvHideHero,
} from './live-tv-data'
import {
  getM3uFetchProgress,
  reportM3uFetchJobProgress,
  runM3uFetch,
  subscribeM3uFetch,
} from './m3u-fetch-progress'
import { useHubText } from './hub-strings'
import { EpgSourcesSection } from './epg-sources-section'
import { XtreamLoginSection } from './xtream-login-section'


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
                  {fetchProgress.jobProgress ? (
                    <span style={{ color: TOKENS.textMute }}>
                      ({fetchProgress.jobProgress.received}{fetchProgress.jobProgress.total ? ` / ${fetchProgress.jobProgress.total}` : ''})
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

      {lists.map((list) => (
        <Card key={list.id}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</div>
              <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>
                {list.channelCount ?? 0} {t('m3uChannels')}
                {' · '}
                {list.fetchedAt
                  ? h('m3uFetchedAt', { time: formatFetchedAt(list.fetchedAt, locale) })
                  : h('m3uNeverFetched')}
              </div>
            </div>
            <PillBtn size="sm" variant="danger" onClick={() => handleRemoveList(list)}>{t('liveTvXtreamRemove')}</PillBtn>
          </div>
          <div style={{ marginTop: 12 }}>
            <EpgSourcesSection
              autoUrl={list.urlTvg}
              manualUrls={list.epgUrls}
              onChangeManual={(epgUrls) => updateLiveTvListEpg(list.id, { epgUrls })}
              autoDisabled={list.autoEpgDisabled}
              onToggleAuto={(disabled) => updateLiveTvListEpg(list.id, { autoEpgDisabled: disabled })}
              listId={list.id}
              allUrls={[list.autoEpgDisabled ? null : list.urlTvg, ...list.epgUrls]
                .filter((url): url is string => Boolean(url))}
            />
          </div>
        </Card>
      ))}
    </div>
  )

}
