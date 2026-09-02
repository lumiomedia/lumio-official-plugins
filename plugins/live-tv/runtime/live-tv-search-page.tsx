'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrowsePageProps } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from './live-tv-data'
import { startOfLocalDay, useLiveTvModel } from './live-tv-model'
import type { EpgProgramme } from './epg/types'
import { useHubText } from './hub-strings'
import { Btn, ChannelBadge, Icon, LT, LiveTvHeader, formatClock, surfaceCard } from './live-tv-ui'
import { encodeChannelParams, useLiveTvChrome, useLiveTvNav } from './live-tv-shell'

/**
 * Sök (handoff §5): kanaler och dagens program ur EPG-cachen. Personsök
 * saknar backend i appen och är utelämnat.
 */
type Filter = 'all' | 'channels' | 'programmes'
const MAX_CHANNEL_HITS = 24
const MAX_PROGRAMME_HITS = 40

interface Props {
  params?: BrowsePageProps['params']
  onNavigate: BrowsePageProps['onNavigate']
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function LiveTvSearchPage({ params, onNavigate }: Props) {
  const { h, locale } = useHubText()
  const model = useLiveTvModel()
  const go = useLiveTvNav(onNavigate)
  const { play, chrome } = useLiveTvChrome(model)
  const [query, setQuery] = useState(params?.q ?? '')
  const [filter, setFilter] = useState<Filter>('all')
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const needle = normalize(query.trim())
  const { nowMs } = model

  const channelHits = useMemo(
    () => (needle.length < 2 ? [] : model.channels.filter((channel) => normalize(channel.name).includes(needle)).slice(0, MAX_CHANNEL_HITS)),
    [model.channels, needle],
  )
  const programmeHits = useMemo(() => {
    if (needle.length < 2 || !model.cache) return [] as Array<{ channel: M3uChannel; programme: EpgProgramme }>
    const from = startOfLocalDay(nowMs)
    const to = startOfLocalDay(nowMs, 1)
    const out: Array<{ channel: M3uChannel; programme: EpgProgramme }> = []
    for (const channel of model.channels) {
      for (const programme of model.scheduleFor(channel, from, to)) {
        if (programme.stop <= nowMs) continue
        if (!normalize(programme.title).includes(needle)) continue
        out.push({ channel, programme })
        if (out.length >= MAX_PROGRAMME_HITS * 3) break
      }
    }
    return out.sort((left, right) => left.programme.start - right.programme.start).slice(0, MAX_PROGRAMME_HITS)
  }, [model, needle, nowMs])

  const showChannels = filter !== 'programmes'
  const showProgrammes = filter !== 'channels'
  const nothing = needle.length >= 2 && (!showChannels || channelHits.length === 0) && (!showProgrammes || programmeHits.length === 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: LT.text }}>
      <LiveTvHeader title="" onBack={() => go('hub')} backLabel={h('back')}>
        <div style={{ position: 'relative', width: 'min(420px, 70vw)' }}>
          <span style={{ position: 'absolute', left: 12, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: LT.dim }}>
            <Icon.Search size={16} />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={h('searchPlaceholder')}
            aria-label={h('search')}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 36px',
              borderRadius: 999,
              border: `1px solid ${LT.line}`,
              background: LT.surface,
              color: LT.text,
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </LiveTvHeader>

      <div style={{ display: 'flex', gap: 6 }}>
        {(['all', 'channels', 'programmes'] as Filter[]).map((value) => (
          <Btn key={value} variant={filter === value ? 'secondary' : 'ghost'} small pressed={filter === value} onClick={() => setFilter(value)}>
            {value === 'all' ? h('filterAll') : value === 'channels' ? h('filterChannels') : h('filterProgrammes')}
          </Btn>
        ))}
      </div>

      {nothing ? <p style={{ margin: 0, fontSize: 14, color: LT.muted }}>{h('noResults', { query: query.trim() })}</p> : null}

      {showChannels && channelHits.length > 0 ? (
        <section>
          <h3 style={{ fontSize: 15, margin: '0 0 10px', color: LT.muted, fontWeight: 600 }}>{h('filterChannels')}</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {channelHits.map((channel) => {
              const info = model.nowFor(channel)
              return (
                <button
                  key={channelKey(channel)}
                  type="button"
                  onClick={() => go('channel', encodeChannelParams(channel))}
                  className="transition hover:brightness-125"
                  style={{ ...surfaceCard, width: 220, padding: 12, display: 'flex', alignItems: 'center', gap: 12, color: 'inherit', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <ChannelBadge channel={channel} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>{channel.name}</div>
                    <div className="truncate" style={{ fontSize: 11, color: LT.dim }}>{info.now?.title ?? channel.group}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {showProgrammes && programmeHits.length > 0 ? (
        <section>
          <h3 style={{ fontSize: 15, margin: '0 0 10px', color: LT.muted, fontWeight: 600 }}>{h('programmesToday')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: LT.line, borderRadius: LT.radiusMd, overflow: 'hidden', maxWidth: 640 }}>
            {programmeHits.map(({ channel, programme }) => {
              const isNow = programme.start <= nowMs && programme.stop > nowMs
              return (
                <button
                  key={`${channelKey(channel)}-${programme.start}`}
                  type="button"
                  onClick={() => (isNow ? play({ channel }) : go('channel', encodeChannelParams(channel)))}
                  className="transition hover:brightness-125"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: LT.surface, padding: '8px 12px', border: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <div style={{ fontSize: 12, color: LT.dim, width: 44, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{isNow ? h('guideNow') : formatClock(programme.start, locale)}</div>
                  <div className="truncate" style={{ fontSize: 13, flex: 1 }}>{programme.title}</div>
                  <div className="truncate" style={{ fontSize: 12, color: LT.dim, maxWidth: 160 }}>{channel.name}</div>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {chrome}
    </div>
  )
}
