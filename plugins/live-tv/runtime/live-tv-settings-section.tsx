'use client'

import { useEffect, useState } from 'react'
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
  getLiveTvLists,
  getM3uUrls,
  upsertLiveTvListFromFetch,
  getM3uDraftUrls,
  onLiveTvListsChanged,
  setM3uDraftUrls,
  updateLiveTvListEpg,
  type LiveTvList,
  getLiveTvHideHero,
  setLiveTvHideHero,
} from './live-tv-data'
import { EpgSourcesSection } from './epg-sources-section'
import { XtreamLoginSection } from './xtream-login-section'


const settingsActionButtonClass =
  'rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/30 hover:text-white disabled:opacity-50'
const HOME_OVERRIDE_PLUGIN_ID = 'com.lumio.live-tv'

async function fetchParsedM3u(url: string): Promise<{ channels?: unknown[]; urlTvg?: string | null }> {
  const response = await fetch('/api/m3u', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) throw new Error('m3u fetch failed')
  return (await response.json().catch(() => ({}))) as { channels?: unknown[]; urlTvg?: string | null }
}

/// Xtream-länken utan output-parametern, eller null när länken inte är en
/// Xtream get.php-länk (då finns inget vettigt att prova om med).
function xtreamUrlWithoutOutput(raw: string): string | null {
  try {
    const parsed = new URL(raw)
    if (!parsed.pathname.endsWith('/get.php')) return null
    if (!parsed.searchParams.get('username') || !parsed.searchParams.get('password')) return null
    if (!parsed.searchParams.has('output')) return null
    parsed.searchParams.delete('output')
    return parsed.toString()
  } catch {
    return null
  }
}

export function LiveTvSettingsSection() {
  const { t, lang } = useLang()
  const [hideHero, setHideHero] = useState<boolean>(() => getLiveTvHideHero())
  const [m3uText, setM3uText] = useState('')
  const [m3uFetchState, setM3uFetchState] = useState<'idle' | 'fetching' | 'done' | 'error'>('idle')
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
    setM3uFetchState('fetching')

    try {
      setM3uDraftUrls(urls)
      clearLiveTvMemoryCache()
      clearStoredLiveTvChannels()

      for (const url of urls) {
        let parsed = await fetchParsedM3u(url)
        // Xtream-paneler utan m3u8-stöd: värden skriver om output= till m3u8
        // för webbspelbara länkar, men paneler som inte stödjer det svarar
        // tomt — HTTP 200 med noll kanaler, inget fel. Prova då utan
        // output-parametern: panelen faller tillbaka till sitt standardformat
        // och svarar korrekt. (Nyare appar gör samma fallback på serversidan;
        // den här raden räddar länkarna även på appar utan den fixen.)
        if (!Array.isArray(parsed.channels) || parsed.channels.length === 0) {
          const retryUrl = xtreamUrlWithoutOutput(url)
          if (retryUrl) {
            const retried = await fetchParsedM3u(retryUrl).catch(() => null)
            if (retried && Array.isArray(retried.channels) && retried.channels.length > 0) parsed = retried
          }
        }
        const channels = Array.isArray(parsed.channels)
          ? (parsed.channels as Array<{ name?: unknown; logo?: unknown; group?: unknown; url?: unknown; tvgId?: unknown }>).map((c) => ({
              name: String(c.name ?? 'Unknown'),
              logo: typeof c.logo === 'string' ? c.logo : null,
              group: String(c.group ?? 'Other'),
              url: String(c.url ?? ''),
              tvgId: typeof c.tvgId === 'string' ? c.tvgId : null,
            }))
          : []
        upsertLiveTvListFromFetch(url, parsed.urlTvg ?? null, channels)
      }

      applyM3uUrls(urls)
      setM3uFetchState('done')
      window.setTimeout(() => setM3uFetchState('idle'), 1800)
    } catch {
      setM3uFetchState('error')
      window.setTimeout(() => setM3uFetchState('idle'), 2200)
    }
  }

  /**
   * Ta bort en lista helt: raden i inställningarna, kanalerna, cachen OCH
   * M3U-adressen den kom ifrån (både aktiv och i utkastet) — annars kom
   * feeden tillbaka vid nästa hämtning, och det gick inte att bli av med
   * en gammal spellista när man bara ville ha kvar Xtream-inloggningen.
   * Xtream-poster har sin egen Ta bort-knapp och rörs inte här.
   */
  function handleRemoveList(list: LiveTvList) {
    const hostOf = (url: string) => {
      try { return new URL(url).hostname || url } catch { return url }
    }
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
        <div style={{ ...eyebrowStyle, marginBottom: 6 }}>M3U</div>
        <textarea
          value={m3uText}
          onChange={(event) => setM3uText(event.target.value)}
          placeholder={t('m3uUrlsPlaceholder')}
          rows={3}
          style={{ ...inputStyle, minHeight: 88, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <PillBtn variant="accent" onClick={() => void handleFetchM3uList()} disabled={m3uFetchState === 'fetching'}>
            {m3uFetchState === 'fetching'
              ? t('m3uLoading')
              : m3uFetchState === 'done'
                ? t('m3uFetchListDone')
                : m3uFetchState === 'error'
                  ? t('m3uFetchListError')
                  : t('m3uFetchList')}
          </PillBtn>
        </div>
      </Card>

      <XtreamLoginSection />

      {lists.map((list) => (
        <Card key={list.id}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</div>
              <div style={{ fontSize: 12, color: TOKENS.textMute, marginTop: 2 }}>{list.channels.length} {t('m3uChannels')}</div>
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
