'use client'

import { useMemo, useState } from 'react'
import type { BrowsePageProps } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from './live-tv-data'
import { useLiveTvModel } from './live-tv-model'
import { useHubText } from './hub-strings'
import { catchUpAcross, expiresLabel, type CatchUpItem } from './catch-up'
import { topGroupsFromHistory } from './channel-history'
import {
  Btn,
  ChannelBadge,
  Icon,
  Kicker,
  LT,
  LiveTag,
  LiveTvHeader,
  ProgressBar,
  ScrollRow,
  SectionTitle,
  Tag,
  formatClock,
  heroGradient,
  progressOf,
  surfaceCard,
} from './live-tv-ui'
import { RemindersMenu, encodeChannelParams, useLiveTvChrome, useLiveTvNav } from './live-tv-shell'

/**
 * Live TV-hubben (handoff §1): nu spelas, favoriter, fortsätt titta,
 * rekommenderat, alla kanaler. Inga nya uppslag mot leverantörer — allt är
 * kanallistor, EPG-cachen som redan hämtas och lokal historik.
 */

export { flattenChannels, topGroups } from './live-tv-model'

const MAX_FAVORITES = 12
const MAX_RECOMMENDED = 12
const MAX_ALL_CHANNELS = 60

interface Props {
  onNavigate: BrowsePageProps['onNavigate']
}

export function LiveTvHub({ onNavigate }: Props) {
  const { h, locale } = useHubText()
  const model = useLiveTvModel()
  const go = useLiveTvNav(onNavigate)
  const { play, chrome } = useLiveTvChrome(model)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const effectiveGroup = activeGroup && model.groups.includes(activeGroup) ? activeGroup : null
  const { channels, nowFor, nowMs, pinnedKeys, pinnedSet, byKey, history } = model

  const favorites = useMemo(
    () =>
      pinnedKeys
        .map((key) => byKey.get(key))
        .filter((channel): channel is M3uChannel => Boolean(channel))
        .filter((channel) => !effectiveGroup || channel.group === effectiveGroup)
        .slice(0, MAX_FAVORITES),
    [pinnedKeys, byKey, effectiveGroup],
  )
  const catchUp = useMemo<CatchUpItem[]>(
    () => catchUpAcross(channels, model.cache, model.nameIndex, nowMs, 12),
    [channels, model.cache, model.nameIndex, nowMs],
  )
  const recent = useMemo(
    () =>
      history.map((entry) => ({
        entry,
        channel:
          byKey.get(entry.key) ??
          ({ name: entry.name, url: entry.url, group: entry.group, logo: entry.logo, tvgId: entry.tvgId } as M3uChannel),
      })),
    [history, byKey],
  )
  const recommended = useMemo(() => {
    const out: Array<{ channel: M3uChannel; reason: string }> = []
    const skip = new Set([...pinnedKeys, ...history.map((entry) => entry.key)])
    for (const group of topGroupsFromHistory(history)) {
      for (const channel of channels) {
        if (channel.group !== group || skip.has(channelKey(channel))) continue
        if (!nowFor(channel).now && out.length >= 4) continue
        out.push({ channel, reason: h('hubRecommendedBecause', { group }) })
        skip.add(channelKey(channel))
        if (out.length >= MAX_RECOMMENDED) return out
      }
    }
    // Komplettera med kanaler i samma grupp som favoriterna.
    for (const key of pinnedKeys) {
      const fav = byKey.get(key)
      if (!fav) continue
      for (const channel of channels) {
        if (channel.group !== fav.group || skip.has(channelKey(channel))) continue
        out.push({ channel, reason: h('hubRecommendedFavourite', { channel: fav.name }) })
        skip.add(channelKey(channel))
        if (out.length >= MAX_RECOMMENDED) return out
      }
    }
    return out
  }, [history, pinnedKeys, channels, byKey, nowFor, h])
  const filteredChannels = useMemo(
    () => (effectiveGroup ? channels.filter((channel) => channel.group === effectiveGroup) : channels),
    [channels, effectiveGroup],
  )
  const hero = useMemo(
    () =>
      favorites.find((channel) => nowFor(channel).now) ??
      favorites[0] ??
      recent[0]?.channel ??
      channels.find((channel) => nowFor(channel).now) ??
      channels.find((channel) => Boolean(channel.tvgId)) ??
      channels[0] ??
      null,
    [favorites, recent, channels, nowFor],
  )

  const openChannel = (channel: M3uChannel) => go('channel', encodeChannelParams(channel))
  const formatWatched = (ms: number) => {
    const sameDay = new Date(ms).toDateString() === new Date(nowMs).toDateString()
    const time = formatClock(ms, locale)
    return h('hubWatchedAt', { time: sameDay ? time : `${h('hubYesterday')} ${time}` })
  }

  const header = (
    <LiveTvHeader
      title={h('hubTitle')}
      backLabel={h('back')}
      right={
        <>
          <RemindersMenu model={model} onOpenChannel={openChannel} />
          <Btn variant="ghost" icon onClick={() => go('grid')} ariaLabel={h('hubOpenGrid')} title={h('hubOpenGrid')}>
            <Icon.Grid />
          </Btn>
        </>
      }
    >
      {model.groups.length > 0
        ? [null, ...model.groups].map((group) => (
            <Btn
              key={group ?? '__all'}
              variant={group === effectiveGroup ? 'secondary' : 'ghost'}
              small
              pressed={group === effectiveGroup}
              onClick={() => setActiveGroup(group)}
            >
              {group ?? h('hubAllGroups')}
            </Btn>
          ))
        : null}
    </LiveTvHeader>
  )

  if (channels.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: LT.text }}>
        {header}
        <div style={{ ...surfaceCard, padding: 24 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{h('hubEmptyTitle')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: LT.muted }}>{h('hubEmptyBody')}</p>
        </div>
      </div>
    )
  }

  const heroInfo = hero ? nowFor(hero) : { now: null, next: null, later: null }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: LT.text }}>
      {header}

      {hero ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3" style={{ ...heroGradient, padding: 24, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 220, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {heroInfo.now ? <LiveTag label={h('hubLive')} /> : null}
              {hero.group ? <Tag>{hero.group}</Tag> : null}
              {model.locked.has(channelKey(hero)) ? <Tag variant="outline"><Icon.Lock /> {h('locked')}</Tag> : null}
            </div>
            <h2 className="truncate" style={{ fontSize: 30, margin: 0, fontWeight: 600, lineHeight: 1.15 }}>{heroInfo.now?.title ?? hero.name}</h2>
            <div style={{ fontSize: 13, color: LT.muted }}>
              {heroInfo.now
                ? `${hero.name} · ${formatClock(heroInfo.now.start, locale)}–${formatClock(heroInfo.now.stop, locale)} · ${h('minutesLeft', { min: Math.max(0, Math.round((heroInfo.now.stop - nowMs) / 60_000)) })}`
                : `${hero.name} · ${h('hubNoProgramme')}`}
            </div>
            {heroInfo.now ? <ProgressBar value={progressOf(heroInfo.now.start, heroInfo.now.stop, nowMs)} width={320} /> : null}
            {heroInfo.next ? (
              <div style={{ fontSize: 12, color: LT.dim }}>{h('nextAt', { title: heroInfo.next.title, time: formatClock(heroInfo.next.start, locale) })}</div>
            ) : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Btn variant="primary" onClick={() => play({ channel: hero })}>
                {h('hubWatchNow')} <Icon.ArrowRight />
              </Btn>
              <Btn variant="secondary" onClick={() => openChannel(hero)}>
                {h('channelTitle')}
              </Btn>
              <Btn variant="ghost" icon onClick={() => model.togglePin(hero)} ariaLabel={pinnedSet.has(channelKey(hero)) ? h('hubUnpin') : h('hubPin')} style={{ color: pinnedSet.has(channelKey(hero)) ? LT.accent : undefined }}>
                <Icon.Heart filled={pinnedSet.has(channelKey(hero))} />
              </Btn>
            </div>
          </div>
          <div className="lg:col-span-2" style={{ ...surfaceCard, borderRadius: LT.radiusLg, padding: 24, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            <Kicker>{h('hubGuideKicker')}</Kicker>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{h('hubGuideTitle')}</div>
            <p style={{ margin: 0, fontSize: 13, color: LT.muted }}>{h('hubGuideBody')}</p>
            <Btn variant="primary" block onClick={() => go('epg')} style={{ marginTop: 6 }}>
              {h('openEpg')} <Icon.Calendar />
            </Btn>
          </div>
        </div>
      ) : null}

      <section>
        <SectionTitle title={h('hubFavorites')} sub={favorites.length > 0 ? h('channelsCount', { count: favorites.length }) : undefined} />
        {favorites.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: LT.muted }}>{h('hubFavoritesEmpty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {favorites.map((channel) => {
              const info = nowFor(channel)
              return (
                <div
                  key={channelKey(channel)}
                  role="button"
                  tabIndex={0}
                  onClick={() => openChannel(channel)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openChannel(channel)
                    }
                  }}
                  className="cursor-pointer transition hover:brightness-125"
                  style={{ ...surfaceCard, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChannelBadge channel={channel} size={40} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{channel.name}</div>
                      {info.now ? <div style={{ marginTop: 2 }}><LiveTag label={h('hubLive')} /></div> : null}
                    </div>
                    <Btn
                      variant="ghost"
                      icon
                      onClick={() => model.togglePin(channel)}
                      ariaLabel={h('hubUnpin')}
                      title={h('hubUnpin')}
                      style={{ color: LT.accent, width: 30, height: 30 }}
                    >
                      <Icon.Heart size={16} filled />
                    </Btn>
                  </div>
                  <div className="truncate" style={{ fontSize: 12, color: 'rgba(243,244,248,0.85)' }}>{info.now?.title ?? channel.group}</div>
                  <div className="truncate" style={{ fontSize: 11, color: LT.dim }}>
                    {info.next ? h('nextAt', { title: info.next.title, time: formatClock(info.next.start, locale) }) : h('hubNoProgramme')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title={h('hubContinue')} sub={catchUp.length > 0 ? h('hubContinueCatchUp') : h('hubContinueRecent')} />
        {catchUp.length === 0 && recent.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: LT.muted }}>{h('hubContinueEmpty')}</p>
        ) : (
          <ScrollRow>
            {catchUp.map((item) => {
              const left = expiresLabel(item.expiresAt, nowMs)
              return (
                <button
                  key={`${channelKey(item.channel)}-${item.programme.start}`}
                  type="button"
                  onClick={() => play({ channel: item.channel, url: item.url, label: `${item.channel.name} · ${item.programme.title}` })}
                  className="transition hover:brightness-110"
                  style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, background: 'transparent', border: 0, padding: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', scrollSnapAlign: 'start', fontFamily: 'inherit' }}
                >
                  <div style={{ width: '100%', height: 124, borderRadius: LT.radiusMd, background: 'linear-gradient(135deg, #1b2540, #2a3552)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChannelBadge channel={item.channel} size={44} radius={LT.radiusMd} />
                    <span style={{ position: 'absolute', right: 8, top: 8 }}><Tag variant="accent">{h('catchUp')}</Tag></span>
                    <span style={{ position: 'absolute', left: 8, bottom: 8, color: LT.text, opacity: 0.9 }}><Icon.Play size={22} /></span>
                  </div>
                  <div className="truncate" style={{ width: '100%', fontSize: 13, fontWeight: 500 }}>{item.programme.title}</div>
                  <div className="truncate" style={{ fontSize: 11, color: LT.dim }}>
                    {item.channel.name} · {formatClock(item.programme.start, locale)} · {Math.round((item.programme.stop - item.programme.start) / 60_000)} min
                  </div>
                  <div style={{ fontSize: 11, color: LT.dim }}>{left.days >= 1 ? h('availableDays', { days: left.days }) : h('availableHours', { hours: left.hours })}</div>
                </button>
              )
            })}
            {recent.map(({ entry, channel }) => {
              const info = nowFor(channel)
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => play({ channel })}
                  className="transition hover:brightness-110"
                  style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, background: 'transparent', border: 0, padding: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', scrollSnapAlign: 'start', fontFamily: 'inherit' }}
                >
                  <div style={{ width: '100%', height: 124, borderRadius: LT.radiusMd, background: 'linear-gradient(135deg, #1b2540, #2a3552)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChannelBadge channel={channel} size={44} radius={LT.radiusMd} />
                    <span style={{ position: 'absolute', left: 8, bottom: 8, color: LT.text, opacity: 0.9 }}><Icon.Play size={22} /></span>
                    {info.now ? (
                      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, height: 3, background: 'rgba(0,0,0,0.4)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(progressOf(info.now.start, info.now.stop, nowMs) * 100)}%`, background: LT.accent }} />
                      </div>
                    ) : null}
                  </div>
                  <div className="truncate" style={{ width: '100%', fontSize: 13, fontWeight: 500 }}>{info.now?.title ?? channel.name}</div>
                  <div className="truncate" style={{ fontSize: 11, color: LT.dim }}>
                    {channel.name}
                    {channel.group ? ` · ${channel.group}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: LT.dim }}>{formatWatched(entry.watchedAt)}</div>
                </button>
              )
            })}
          </ScrollRow>
        )}
      </section>

      {recommended.length > 0 ? (
        <section>
          <SectionTitle title={h('hubRecommended')} />
          <ScrollRow>
            {recommended.map(({ channel, reason }) => {
              const info = nowFor(channel)
              return (
                <button
                  key={channelKey(channel)}
                  type="button"
                  onClick={() => openChannel(channel)}
                  className="transition hover:brightness-125"
                  style={{ ...surfaceCard, width: 240, flexShrink: 0, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4, color: 'inherit', textAlign: 'left', cursor: 'pointer', scrollSnapAlign: 'start', fontFamily: 'inherit' }}
                >
                  <Kicker>{reason}</Kicker>
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{info.now?.title ?? channel.name}</div>
                  <div className="truncate" style={{ fontSize: 12, color: LT.dim }}>
                    {channel.name} · {info.now ? h('guideNow') : info.next ? formatClock(info.next.start, locale) : channel.group}
                  </div>
                </button>
              )
            })}
          </ScrollRow>
        </section>
      ) : null}

      <section>
        <SectionTitle
          title={h('hubAllChannels')}
          sub={h('channelsIn', { count: filteredChannels.length, group: effectiveGroup ?? h('hubAllGroups') })}
          action={
            filteredChannels.length > MAX_ALL_CHANNELS ? (
              <Btn variant="ghost" small onClick={() => go('grid')}>{h('hubShowAllInGrid', { count: filteredChannels.length })}</Btn>
            ) : null
          }
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredChannels.slice(0, MAX_ALL_CHANNELS).map((channel) => {
            const info = nowFor(channel)
            const isPinned = pinnedSet.has(channelKey(channel))
            return (
              <div
                key={channelKey(channel)}
                role="button"
                tabIndex={0}
                onClick={() => openChannel(channel)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openChannel(channel)
                  }
                }}
                className="cursor-pointer transition hover:brightness-125"
                style={{ ...surfaceCard, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
              >
                <ChannelBadge channel={channel} size={44} radius={LT.radiusMd} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{channel.name}</div>
                    {info.now ? <LiveTag label={h('hubLive')} /> : null}
                  </div>
                  <div className="truncate" style={{ fontSize: 12, color: LT.muted }}>{info.now?.title ?? channel.group}</div>
                  {info.now ? (
                    <div style={{ marginTop: 6, maxWidth: 220 }}>
                      <ProgressBar value={progressOf(info.now.start, info.now.stop, nowMs)} height={3} />
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={(event) => event.stopPropagation()}>
                  <Btn
                    variant="ghost"
                    icon
                    onClick={() => model.togglePin(channel)}
                    ariaLabel={isPinned ? h('hubUnpin') : h('hubPin')}
                    title={isPinned ? h('hubUnpin') : h('hubPin')}
                    style={{ color: isPinned ? LT.accent : undefined, width: 32, height: 32 }}
                  >
                    <Icon.Heart size={16} filled={isPinned} />
                  </Btn>
                  <Btn variant="ghost" icon onClick={() => openChannel(channel)} ariaLabel={h('channelTitle')} title={h('channelTitle')} style={{ width: 32, height: 32 }}>
                    <Icon.Info size={16} />
                  </Btn>
                  <Btn variant="solid" icon onClick={() => play({ channel })} ariaLabel={h('hubWatchNow')} title={h('hubWatchNow')} style={{ width: 34, height: 34 }}>
                    <Icon.Play size={13} />
                  </Btn>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {chrome}
    </div>
  )
}
