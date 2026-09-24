'use client'

import { useRef, useState, type ReactNode } from 'react'
import { LtAutoBadge, LtBtn, LtCard, LtEyebrow, LtInput, LtMono, LtNote, LtSection, UI, fmtInt, useToast } from './settings-ui'
import { useHubText } from './hub-strings'
import { useEpgStatus } from './hooks/useEpgStatus'

interface Props {
  autoUrl: string | null
  manualUrls: string[]
  onChangeManual: (urls: string[]) => void
  /** Av-läget för den härledda källan. Se LiveTvList.autoEpgDisabled. */
  autoDisabled?: boolean
  onToggleAuto?: (disabled: boolean) => void
  testId?: string
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

/** EPG-raden (§6): grund `rgba(0,0,0,0.25)`, radie 8, adressen i mono 12 px. */
function SourceRow({ url, auto = false, dimmed = false, right }: { url: string; auto?: boolean; dimmed?: boolean; right: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, background: UI.dark, padding: '8px 10px', opacity: dimmed ? 0.55 : 1 }}>
      <LtMono>{url}</LtMono>
      {auto ? <LtAutoBadge /> : null}
      {right}
    </div>
  )
}

/**
 * Tablåns tillstånd — EN gång för hela sidan, inte per spellista (butiken är
 * global, `/api/live-tv/epg/status`). Blocket PROGRAMME GUIDE STATUS i
 * handoffen §3: rubrik + note, guidekortet med adressen i mono, statistiken
 * i grönt och raden "Guide fetched 12:37 · 66,111 programmes" + Refetch EPG.
 * Datadelen ligger i `hooks/useEpgStatus.ts`, delad med TV-inställningarna.
 */
export function EpgStatusCard() {
  const { h, locale } = useHubText()
  const { status, urls, refreshing, refresh } = useEpgStatus()
  const toast = useToast()
  const statusRef = useRef(status)
  statusRef.current = status

  if (urls.length === 0) return null

  const overallFetched = formatRelative(status?.fetchedAt ?? null, locale)
  const doRefresh = async () => {
    await refresh()
    toast(h('guideFetchedToast', { programmes: fmtInt(statusRef.current?.programmes ?? 0, locale) }))
  }
  return (
    <div>
      <LtSection eyebrow={h('epgStatusTitle')} hint={h('epgStatusAllLists')} />
      <LtCard gap={12} testId="epg-status-card">
        {urls.map((url) => {
          const stat = status?.urls.find((item) => item.url === url)
          const fetched = formatRelative(stat?.fetchedAt || null, locale)
          return (
            <div key={url} style={{ borderRadius: 8, background: UI.dark, padding: '10px 12px' }}>
              <LtMono style={{ display: 'block', flex: 'none' }}>{url}</LtMono>
              {!stat ? null : stat.error ? (
                <p style={{ margin: '5px 0 0', fontSize: 12, color: UI.danger }}>{stat.error}</p>
              ) : (
                <p style={{ margin: '5px 0 0', fontSize: 12, color: UI.green }}>
                  {h('epgSourceStats', { channels: fmtInt(stat.channels, locale), programmes: fmtInt(stat.programmes, locale) })}
                  {fetched ? ` · ${h('epgSourceFetched', { time: fetched })}` : ''}
                </p>
              )}
            </div>
          )
        })}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: status?.failedAt && !status.fetchedAt ? UI.danger : UI.muted }}>
            {refreshing
              ? h('fetchingGuide')
              : overallFetched
                ? h('epgFetchedAt', { time: overallFetched, programmes: fmtInt(status?.programmes ?? 0, locale) })
                : h('epgNeverFetched')}
          </span>
          <LtBtn onClick={() => void doRefresh()} disabled={refreshing}>
            {refreshing ? h('epgRefreshing') : h('epgRefresh')}
          </LtBtn>
        </div>
      </LtCard>
    </div>
  )
}

/**
 * EPG-källorna FÖR EN LISTA, inne i spellistans kort (§3.1): eyebrow, en rad
 * per källa (AUTO-bricka på den härledda), noten när ingen finns, fältet +
 * Add. Ett tomt Add toastar i stället för att tyst göra ingenting.
 * Diagnostiken (kanaler/program per adress) ligger i `EpgStatusCard`.
 */
export function EpgSourcesSection({ autoUrl, manualUrls, onChangeManual, autoDisabled = false, onToggleAuto, testId }: Props) {
  const { h } = useHubText()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const addUrl = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      toast(h('pasteXmltvFirst'))
      return
    }
    onChangeManual([...manualUrls, trimmed])
    setDraft('')
    toast(h('epgSourceAdded'))
  }
  const removeUrl = (index: number) => {
    onChangeManual(manualUrls.filter((_, j) => j !== index))
    toast(h('epgSourceRemoved'))
  }
  const hasAny = (autoUrl !== null && !autoDisabled) || manualUrls.length > 0
  const removeStyle = { padding: '5px 10px' } as const

  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <LtEyebrow>{h('epgSources')}</LtEyebrow>
      {autoUrl ? (
        <SourceRow
          url={autoUrl}
          auto
          dimmed={autoDisabled}
          right={onToggleAuto
            // Härledd källa: den STÄNGS AV, inte raderas — nästa import hade
            // skrivit tillbaka den, och då hade den inte gått att bli av med.
            ? (autoDisabled
                ? <LtBtn variant="accent" style={removeStyle} onClick={() => onToggleAuto(false)}>{h('on')}</LtBtn>
                : <LtBtn variant="danger" style={removeStyle} onClick={() => { onToggleAuto(true); toast(h('epgSourceRemoved')) }}>{h('remove')}</LtBtn>)
            : null}
        />
      ) : null}
      {manualUrls.map((url, i) => (
        <SourceRow key={`${url}-${i}`} url={url} right={<LtBtn variant="danger" style={removeStyle} onClick={() => removeUrl(i)}>{h('remove')}</LtBtn>} />
      ))}
      {!hasAny ? <LtNote>{h('noEpgSourceYet')}</LtNote> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <LtInput title={h('xmltvPlaceholder')} placeholder={h('xmltvPlaceholder')} value={draft} onChange={setDraft} onEnter={addUrl} style={{ flex: 1, fontSize: 12.5 }} />
        <LtBtn variant="accent" style={{ padding: '6px 13px' }} onClick={addUrl}>{h('add')}</LtBtn>
      </div>
    </div>
  )
}
