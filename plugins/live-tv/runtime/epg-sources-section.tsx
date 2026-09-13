'use client'

import { useState } from 'react'
import type * as React from 'react'
import { Card, PillBtn, TOKENS, eyebrowStyle, inputStyle, useLang } from '@/lib/plugin-sdk'
import { useHubText } from './hub-strings'
import { useEpgStatus } from './hooks/useEpgStatus'

interface Props {
  autoUrl: string | null
  manualUrls: string[]
  onChangeManual: (urls: string[]) => void
  /** Av-läget för den härledda källan. Se LiveTvList.autoEpgDisabled. */
  autoDisabled?: boolean
  onToggleAuto?: (disabled: boolean) => void
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

function sourceRow(url: string, meta: React.ReactNode, right: React.ReactNode, dimmed = false) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: 10, border: `1px solid ${TOKENS.border}`, background: TOKENS.surface0 }}>
      <span style={{ minWidth: 0, opacity: dimmed ? 0.45 : 1 }}>
        <span style={{ display: 'block', fontSize: 12, color: TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
        {meta}
      </span>
      <span style={{ display: 'flex', flex: 'none', alignItems: 'center', gap: 8 }}>{right}</span>
    </div>
  )
}

/**
 * Tablåns tillstånd — EN gång för hela sidan, inte per spellista.
 *
 * Fram till v2 höll pluginet en EGEN XMLTV-cache (`epg/cache.ts`) bara för att
 * kunna skriva "3 kanaler · 812 program" under varje adress: så länge
 * inställningarna var öppna laddade webviewn ner hela tablån en gång till,
 * parallellt med appens hämtning. Siffrorna kommer nu ur appens butik
 * (`/api/live-tv/epg/status`), som ändå är den vyerna får sin tablå ifrån.
 *
 * Butiken är GLOBAL (ett lager för alla list-id, P3). Därför ligger det här
 * blocket ÖVER listkorten i stället för i varje kort: renderat per lista blev
 * det N statusläsningar av samma sak och N "Hämta om EPG"-knappar som alla
 * gjorde exakt samma globala omhämtning — men med var sitt `refreshing`, så
 * de andra knapparna såg overksamma ut medan en av dem arbetade.
 *
 * Datadelen (läsning/omhämtning) är ren utbrytning i `hooks/useEpgStatus.ts`,
 * delad med TV-inställningarnas EPG-flik (P7) — den här komponenten äger
 * bara renderingen.
 */
export function EpgStatusCard() {
  const { h, locale } = useHubText()
  const { status, urls, refreshing, refresh } = useEpgStatus()

  if (urls.length === 0) return null

  const overallFetched = formatRelative(status?.fetchedAt ?? null, locale)
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ ...eyebrowStyle }}>{h('epgStatusTitle')}</div>
        <p style={{ margin: 0, fontSize: 12, color: TOKENS.textMute, lineHeight: 1.45 }}>{h('epgStatusAllLists')}</p>
        {urls.map((url) => {
          const stat = status?.urls.find((item) => item.url === url)
          const fetched = formatRelative(stat?.fetchedAt || null, locale)
          const meta = !stat
            ? null
            : stat.error
              ? <span style={{ display: 'block', marginTop: 3, fontSize: 10.5, color: '#fca5a5' }}>{stat.error}</span>
              : (
                <span style={{ display: 'block', marginTop: 3, fontSize: 10.5, color: 'rgba(110,231,183,0.75)' }}>
                  {h('epgSourceStats', { channels: stat.channels, programmes: stat.programmes })}
                  {fetched ? ` · ${h('epgSourceFetched', { time: fetched })}` : ''}
                </span>
              )
          return <div key={url}>{sourceRow(url, meta, null)}</div>
        })}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: status?.failedAt && !status.fetchedAt ? '#fca5a5' : TOKENS.textMute }}>
            {overallFetched
              ? h('epgFetchedAt', { time: overallFetched, programmes: status?.programmes ?? 0 })
              : h('epgNeverFetched')}
          </span>
          <PillBtn size="sm" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? h('epgRefreshing') : h('epgRefresh')}
          </PillBtn>
        </div>
      </div>
    </Card>
  )
}

/**
 * EPG-källorna FÖR EN LISTA: lägg till, ta bort, stäng av den härledda.
 * Diagnostiken (kanaler/program/fel per adress) ligger i `EpgStatusCard`
 * ovanför listkorten — se motiveringen där.
 */
export function EpgSourcesSection({
  autoUrl,
  manualUrls,
  onChangeManual,
  autoDisabled = false,
  onToggleAuto,
}: Props) {
  const { t } = useLang()
  const [draft, setDraft] = useState('')
  const addUrl = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChangeManual([...manualUrls, trimmed])
    setDraft('')
  }
  const removeUrl = (index: number) => onChangeManual(manualUrls.filter((_, j) => j !== index))
  const hasAny = (autoUrl !== null && !autoDisabled) || manualUrls.length > 0

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...eyebrowStyle }}>{t('liveTvEpgSources')}</div>
      {autoUrl
        ? sourceRow(
            autoUrl,
            null,
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
          {sourceRow(url, null, <PillBtn size="sm" variant="danger" onClick={() => removeUrl(i)}>{t('remove')}</PillBtn>)}
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
      {!hasAny ? <p style={{ margin: 0, fontSize: 12, color: TOKENS.textMute }}>{t('liveTvNoEpgSourcesPrefix')}</p> : null}
    </section>
  )

}
