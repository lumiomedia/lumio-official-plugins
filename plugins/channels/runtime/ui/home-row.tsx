'use client'

/**
 * Hemraden "Sänds nu på dina kanaler": ett kort per kanal med showOnHome.
 *
 * Varje kort laddar sin kanals pool (delad, cachad laddning) och räknar nu-läget
 * lokalt; raden gör aldrig ett strömuppslag. Klick/OK öppnar Kanaler-sidan som
 * spelar kanalen live. Kortet är ett riktigt fokusmål på TV (data-f), remsan en data-row.
 */
import { memo, useCallback, useEffect, useState } from 'react'
import { getPluginHomeRowTrackClass, useTvMode, type HomeRowProps } from '@/lib/plugin-sdk'
import { hueGradient, type ChannelDef } from '../model/channel'
import type { PoolItem } from '../data/pool'
import { useChannelClock, useChannelPool, useChannels } from '../state/store'
import { homeCardModel, homeChannels } from './home-row-logic'
import { CHANNELS_PAGE_ID, formatClock } from './guide-layout'
import { C, FONT, RADIUS, fontSize } from './tokens'
import { useText } from './use-text'

export function ChannelsHomeRow({ onNavigate, layout = 'slider', count, sliderCardWidth = '16rem' }: HomeRowProps) {
  const t = useText()
  const isTv = useTvMode()
  const channels = homeChannels(useChannels(), count)
  // Kortens rundowns samlas här så EN klocka räcker för hela raden.
  const [rundowns, setRundowns] = useState<Record<string, PoolItem[]>>({})
  const onRundown = useCallback((id: string, rundown: PoolItem[]) => {
    setRundowns((prev) => (prev[id] === rundown ? prev : { ...prev, [id]: rundown }))
  }, [])
  const now = useChannelClock(channels.map((channel) => ({ channel, rundown: rundowns[channel.id] ?? [] })))
  if (channels.length === 0) return null

  const slider = layout === 'slider'
  const open = (channelId: string) => onNavigate({ pageId: CHANNELS_PAGE_ID, params: { channelId, play: 'live' } })

  return (
    <section data-channels-home-row="" style={{ color: C.text, fontFamily: FONT.ui }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <h2 data-home-row-title="" style={{ margin: 0, fontSize: fontSize(21, isTv), fontWeight: 600, letterSpacing: '-0.2px' }}>{t('homeRowTitle')}</h2>
          <p style={{ margin: '4px 0 0', fontSize: fontSize(14, isTv), color: C.textDim }}>{t('homeRowSubtitle', { time: formatClock(now) })}</p>
        </div>
        <button
          type="button"
          data-f=""
          className="focus-card-ring"
          onClick={() => onNavigate({ pageId: CHANNELS_PAGE_ID })}
          style={{
            flexShrink: 0, cursor: 'pointer', padding: '6px 12px', borderRadius: RADIUS.pill, background: C.pillBg,
            border: `1px solid ${C.pillBorder}`, color: C.textSoft, fontFamily: FONT.mono, fontSize: fontSize(10.5, isTv), letterSpacing: '0.12em',
          }}
        >
          {t('homeRowShowGuide')}
        </button>
      </div>
      <div
        data-row=""
        className={getPluginHomeRowTrackClass(layout, { gridClassName: 'grid grid-cols-2 gap-3 md:grid-cols-4' })}
      >
        {channels.map((channel) => (
          <HomeCard
            key={channel.id}
            channel={channel}
            now={now}
            isTv={isTv}
            width={slider ? sliderCardWidth : undefined}
            onRundown={onRundown}
            onOpen={open}
          />
        ))}
      </div>
    </section>
  )
}

const HomeCard = memo(function HomeCard({ channel, now, isTv, width, onRundown, onOpen }: {
  channel: ChannelDef
  now: number
  isTv: boolean
  width: string | undefined
  onRundown(id: string, rundown: PoolItem[]): void
  onOpen(channelId: string): void
}) {
  const t = useText()
  const { rundown, loading } = useChannelPool(channel)
  // Rapporterar uppåt i en effekt så render förblir ren.
  useReport(channel.id, rundown, onRundown)
  const m = homeCardModel(channel, rundown, now)
  const title = m.resting
    ? t('playerRest', { time: formatClock(m.restUntil ?? now) })
    : m.title ?? (loading ? t('guideLoading') : t('playerEmpty'))
  const hasTitle = m.title != null
  const badge = m.resting ? t('homeCardRest') : m.minsLeft != null ? t('playerMinsLeft', { n: m.minsLeft }) : ''

  return (
    <div style={{ width, flex: width ? 'none' : undefined, minWidth: 0, opacity: m.resting ? 0.6 : 1 }}>
      <button
        type="button"
        data-f=""
        data-tv-card=""
        data-channel-card={channel.id}
        className="focus-card-ring"
        onClick={() => onOpen(channel.id)}
        aria-label={`${t('zapChannelLine', { n: m.number, name: m.name })} · ${title}`}
        style={{
          position: 'relative', display: 'block', width: '100%', aspectRatio: '16 / 9', padding: 0, overflow: 'hidden', cursor: 'pointer',
          textAlign: 'left', color: C.text, borderRadius: RADIUS.card, border: '1px solid rgba(255,255,255,0.08)',
          background: m.backdropUrl ? `center / cover no-repeat url("${m.backdropUrl}"), ${C.base3}` : hueGradient(m.hue),
        }}
      >
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,8,22,0) 35%, rgba(5,8,22,0.85) 100%)' }} />
        <span
          style={{
            position: 'absolute', top: 8, left: 8, padding: '2px 7px', borderRadius: 6, background: 'rgba(0,0,0,0.6)',
            fontFamily: FONT.mono, fontSize: fontSize(10, isTv), fontWeight: 600,
          }}
        >
          {m.number}
        </span>
        {badge ? (
          <span
            data-card-badge=""
            style={{
              position: 'absolute', top: 8, right: 8, padding: '2px 7px', borderRadius: RADIUS.pill, fontFamily: FONT.mono,
              fontSize: fontSize(9.5, isTv), fontWeight: 600, letterSpacing: '0.06em',
              background: m.resting ? 'rgba(5,8,22,0.8)' : C.accent, color: m.resting ? C.textDim : C.base,
            }}
          >
            {badge.toUpperCase()}
          </span>
        ) : null}
        <span style={{ position: 'absolute', left: 10, right: 10, bottom: 10, display: 'block' }}>
          <span
            data-card-title=""
            style={{
              display: 'block', fontFamily: FONT.title, fontSize: fontSize(17, isTv), lineHeight: 1.2, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', color: hasTitle ? C.text : C.textDim,
            }}
          >
            {title}
          </span>
          {hasTitle ? (
            <span aria-hidden="true" style={{ display: 'block', height: 3, marginTop: 7, borderRadius: 2, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${Math.round(m.pct * 100)}%`, background: C.accent }} />
            </span>
          ) : null}
        </span>
      </button>
      <div style={{ padding: '8px 2px 0', minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: fontSize(9, isTv), letterSpacing: '0.22em', color: 'rgba(203,213,225,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t('zapChannelLine', { n: m.number, name: m.name.toUpperCase() })}
        </span>
        {m.nextTitle ? (
          <span style={{ display: 'block', marginTop: 3, fontSize: fontSize(12.8, isTv), fontWeight: 600, color: C.textSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('homeCardNext', { title: m.nextTitle })}
          </span>
        ) : null}
      </div>
    </div>
  )
})

function useReport(id: string, rundown: PoolItem[], report: (id: string, rundown: PoolItem[]) => void): void {
  useEffect(() => { report(id, rundown) }, [id, rundown, report])
}
