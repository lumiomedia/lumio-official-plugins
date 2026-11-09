'use client'

import { useEffect, useState } from 'react'
import type { TvViewProps } from './tv-shell'
import { Progress, TV, dp, station } from './tv-ui'
import { useTvText, type TvStringKey } from './tv-strings'
import { VOD_READY_EVENT, maybeAutoScanVod, vodHomeStatus, type VodHomeState, type VodHomeStatus } from '../vod-autoscan'
import { MT } from './mobile/mobile-tokens'

/*
  FÖRBEREDER FILM OCH SERIER — sidan Hem öppnar medan biblioteket byggs.

  En ny Xtream-panel med tusentals titlar tar lång tid att gå igenom (varje
  titel matchas mot uppgifter och bilder), och ett besked i fyra sekunder sade
  ingenting om hur långt det kommit eller när det blir klart (Jerry 2026-11-09).
  Sidan pollar statusen, ritar förloppet och säger till skalet (VOD_READY_EVENT)
  när biblioteket finns — skalet går då vidare till film och serier.
*/

export const PREPARING_POLL_MS = 3000

const STATE_TEXT: Partial<Record<VodHomeState, TvStringKey>> = {
  importing: 'vodHomeImporting',
  failed: 'vodHomeRetrying',
}

export function TvVodPreparing({ nav, phone }: TvViewProps) {
  const { tt, locale } = useTvText()
  const [status, setStatus] = useState<VodHomeStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    let kicked = false
    const poll = async () => {
      const next = await vodHomeStatus()
      if (cancelled) return
      setStatus(next)
      if (next.state === 'ready') { window.dispatchEvent(new Event(VOD_READY_EVENT)); return }
      // Ett misslyckat eller aldrig startat försök får ett nytt direkt — användaren bad om det.
      if (!kicked && (next.state === 'failed' || next.state === 'waiting')) { kicked = true; void maybeAutoScanVod({ force: true }) }
    }
    void poll()
    const timer = window.setInterval(() => { void poll() }, PREPARING_POLL_MS)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [])

  const indexed = status?.indexed ?? null
  const total = status?.total ?? null
  const showBar = indexed !== null && total !== null && total > 0
  const stateKey = status ? STATE_TEXT[status.state] : undefined
  const px = (n: number) => (phone ? Math.round(n * 0.75) : dp(n))
  const muted = phone ? MT.dim : TV.muted

  return (
    <div data-scroll="" data-testid="tv-vod-preparing" style={{ flex: 1, overflowY: 'auto', padding: phone ? '24px 16px' : `${dp(34)}px ${dp(48)}px ${dp(40)}px`, display: 'flex', flexDirection: 'column', gap: px(22) }}>
      <div style={{ fontSize: px(34), fontWeight: 600 }}>{tt('vodPreparingTitle')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(14), maxWidth: px(760) }}>
        {showBar ? (
          <>
            <div data-testid="vod-preparing-bar"><Progress value={indexed / total} height={px(8)} /></div>
            <div data-testid="vod-preparing-count" style={{ fontSize: px(22), fontWeight: 600 }}>
              {tt('vodPreparingCount', { done: indexed.toLocaleString(locale), total: total.toLocaleString(locale) })}
            </div>
          </>
        ) : null}
        {stateKey ? <div data-testid="vod-preparing-state" style={{ fontSize: px(20), color: muted }}>{tt(stateKey)}</div> : null}
        <div style={{ fontSize: px(18), color: muted, lineHeight: 1.45 }}>{tt('vodPreparingHint')}</div>
        <div {...station(() => nav.go('guide', { group: 'all' }), undefined, { 'data-init': '' })} style={{ alignSelf: 'flex-start', height: px(48), minHeight: px(48), padding: `0 ${px(22)}px`, borderRadius: 999, border: `1px solid ${TV.lineStrong}`, background: TV.s06, display: 'inline-flex', alignItems: 'center', fontSize: px(18), cursor: 'pointer' }}>{tt('railGuide')}</div>
      </div>
    </div>
  )
}
