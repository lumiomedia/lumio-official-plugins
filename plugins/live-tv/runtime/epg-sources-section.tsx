'use client'

import { useCallback, useEffect, useState } from 'react'
import type * as React from 'react'
import { PillBtn, TOKENS, eyebrowStyle, inputStyle, useLang } from '@/lib/plugin-sdk'
import { LIVE_TV_GLOBAL_EPG_ID, getAllLiveTvEpgUrls, getLiveTvLists } from './live-tv-data'
import { epgStatus, refreshEpg, waitForJob, type EpgStatus } from './index-client'
import { useHubText } from './hub-strings'

interface Props {
  autoUrl: string | null
  manualUrls: string[]
  onChangeManual: (urls: string[]) => void
  /** Av-läget för den härledda källan. Se LiveTvList.autoEpgDisabled. */
  autoDisabled?: boolean
  onToggleAuto?: (disabled: boolean) => void
  listId?: string | null
  allUrls?: string[]
}

function formatRelative(ms: number | null, locale: string): string | null {
  if (!ms) return null
  const then = new Date(ms)
  if (Number.isNaN(then.getTime())) return null
  const now = new Date()
  return then.toDateString() === now.toDateString()
    ? then.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : then.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * EPG-källorna för en lista + appens diagnostik för dem.
 *
 * Fram till v2 höll pluginet en EGEN XMLTV-cache (`epg/cache.ts` via
 * `useLiveTvEpgCache`) bara för att kunna skriva "3 kanaler · 812 program"
 * under varje adress: så länge inställningarna var öppna laddade webviewn ner
 * hela tablån en gång till, parallellt med appens hämtning. Nu läses samma
 * siffror ur appens butik (`/api/live-tv/epg/status`), som ändå är den som
 * vyerna får sin tablå ifrån — det som visas här är alltså vad som FAKTISKT
 * gäller, inte vad webviewns kopia råkade innehålla.
 *
 * Butiken är GLOBAL (ett lager för alla list-id, P3): status och omhämtning
 * går därför mot `LIVE_TV_GLOBAL_EPG_ID` med samtliga listors adresser, inte
 * mot den enskilda listan. `listId`-propen säger bara om sektionen sitter på
 * en riktig lista (och alltså ska visa diagnostik alls).
 */
export function EpgSourcesSection({
  autoUrl,
  manualUrls,
  onChangeManual,
  autoDisabled = false,
  onToggleAuto,
  listId = null,
  allUrls = [],
}: Props) {
  const { t } = useLang()
  const { h, locale } = useHubText()
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<EpgStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const urlsKey = allUrls.join('|')

  const readStatus = useCallback(async (): Promise<EpgStatus | null> => {
    try {
      return await epgStatus(LIVE_TV_GLOBAL_EPG_ID)
    } catch {
      // Äldre app utan endpointen, eller ett övergående fel: sektionen ska
      // fortsätta gå att använda (lägga till/ta bort adresser) utan siffror.
      return null
    }
  }, [])

  useEffect(() => {
    if (!listId) {
      setStatus(null)
      return
    }
    let cancelled = false
    void readStatus().then((next) => { if (!cancelled) setStatus(next) })
    return () => { cancelled = true }
  }, [listId, urlsKey, readStatus])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const lists = getLiveTvLists()
      const urls = getAllLiveTvEpgUrls(lists)
      const sources = lists.map((list) => list.source).filter((source): source is string => Boolean(source))
      const job = await refreshEpg(LIVE_TV_GLOBAL_EPG_ID, urls, sources, true)
      await waitForJob(job)
    } catch {
      // Felet syns i statusen nedan (failedAt / per-adress `error`), som
      // läses om oavsett utfall.
    } finally {
      const next = await readStatus()
      setStatus(next)
      setRefreshing(false)
    }
  }

  const addUrl = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChangeManual([...manualUrls, trimmed])
    setDraft('')
  }
  const removeUrl = (index: number) => onChangeManual(manualUrls.filter((_, j) => j !== index))
  const hasAny = (autoUrl !== null && !autoDisabled) || manualUrls.length > 0
  const renderSourceMeta = (url: string) => {
    const stat = status?.urls.find((item) => item.url === url)
    if (!stat) return null
    if (stat.error) {
      return <span style={{ display: 'block', marginTop: 3, fontSize: 10.5, color: '#fca5a5' }}>{stat.error}</span>
    }
    const fetched = formatRelative(stat.fetchedAt || null, locale)
    return (
      <span style={{ display: 'block', marginTop: 3, fontSize: 10.5, color: 'rgba(110,231,183,0.75)' }}>
        {t('liveTvEpgSourceStats')
          .replace('{channels}', String(stat.channels))
          .replace('{programmes}', String(stat.programmes))}
        {fetched ? ` · ${h('epgSourceFetched', { time: fetched })}` : ''}
      </span>
    )
  }
  const sourceRow = (url: string, meta: React.ReactNode, right: React.ReactNode, dimmed = false) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: 10, border: `1px solid ${TOKENS.border}`, background: TOKENS.surface0 }}>
      <span style={{ minWidth: 0, opacity: dimmed ? 0.45 : 1 }}>
        <span style={{ display: 'block', fontSize: 12, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
        {meta}
      </span>
      <span style={{ display: 'flex', flex: 'none', alignItems: 'center', gap: 8 }}>{right}</span>
    </div>
  )

  const overallFetched = formatRelative(status?.fetchedAt ?? null, locale)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...eyebrowStyle }}>{t('liveTvEpgSources')}</div>
      {autoUrl
        ? sourceRow(
            autoUrl,
            autoDisabled ? null : renderSourceMeta(autoUrl),
            <>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: autoDisabled ? TOKENS.surface2 : 'rgba(60,214,163,0.18)', color: autoDisabled ? TOKENS.textMute : TOKENS.mint }}>
                {autoDisabled ? `Auto · ${t('off')}` : 'Auto'}
              </span>
              {/* Härledd källa: den går att STÄNGA AV, inte radera. En radering
                  hade kommit tillbaka vid nästa M3U-hämtning, och användaren
                  hade inte haft någon väg att få den igen. */}
              {onToggleAuto ? (
                <PillBtn size="sm" variant={autoDisabled ? 'accent' : 'danger'} onClick={() => onToggleAuto(!autoDisabled)}>
                  {autoDisabled ? t('on') : t('remove')}
                </PillBtn>
              ) : null}
            </>,
            autoDisabled,
          )
        : null}
      {manualUrls.map((url, i) => (
        <div key={`${url}-${i}`}>
          {sourceRow(url, renderSourceMeta(url), <PillBtn size="sm" variant="danger" onClick={() => removeUrl(i)}>{t('remove')}</PillBtn>)}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="url"
          placeholder={t('liveTvEpgUrlPlaceholder')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addUrl()
            }
          }}
          style={{ ...inputStyle, flex: 1 }}
        />
        <PillBtn variant="accent" onClick={addUrl} style={{ minHeight: 44 }}>{t('add')}</PillBtn>
      </div>
      {listId && hasAny ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: status?.failedAt && !status.fetchedAt ? '#fca5a5' : TOKENS.textMute }}>
            {overallFetched
              ? h('epgFetchedAt', { time: overallFetched, programmes: status?.programmes ?? 0 })
              : h('epgNeverFetched')}
          </span>
          <PillBtn size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
            {refreshing ? h('epgRefreshing') : h('epgRefresh')}
          </PillBtn>
        </div>
      ) : null}
      {!hasAny ? <p style={{ margin: 0, fontSize: 12, color: TOKENS.textMute }}>{t('liveTvNoEpgSourcesPrefix')}</p> : null}
    </section>
  )

}
