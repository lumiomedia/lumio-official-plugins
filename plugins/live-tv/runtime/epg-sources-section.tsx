'use client'

import { useState } from 'react'
import type * as React from 'react'
import { PillBtn, TOKENS, eyebrowStyle, inputStyle, useLang } from '@/lib/plugin-sdk'
import { useLiveTvEpgCache } from './hooks/useLiveTvEpgCache'

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
  const [draft, setDraft] = useState('')
  const cache = useLiveTvEpgCache(listId, allUrls)
  const addUrl = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChangeManual([...manualUrls, trimmed])
    setDraft('')
  }
  const removeUrl = (index: number) => onChangeManual(manualUrls.filter((_, j) => j !== index))
  const hasAny = (autoUrl !== null && !autoDisabled) || manualUrls.length > 0
  const sourceStats = cache?.sourceStats ?? []
  const failures = cache?.failures ?? []
  const renderSourceMeta = (url: string) => {
    const stat = sourceStats.find((item) => item.url === url)
    const failure = failures.find((item) => item.url === url)
    if (stat) {
      return (
        <span className="mt-1 block text-[10px] text-emerald-300/70">
          {t('liveTvEpgSourceStats')
            .replace('{channels}', String(stat.channelCount))
            .replace('{programmes}', String(stat.programmeCount))}
        </span>
      )
    }
    if (failure) {
      return <span className="mt-1 block text-[10px] text-rose-300/80">{failure.error}</span>
    }
    return null
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
      {!hasAny ? <p style={{ margin: 0, fontSize: 12, color: TOKENS.textMute }}>{t('liveTvNoEpgSourcesPrefix')}</p> : null}
    </section>
  )

}
