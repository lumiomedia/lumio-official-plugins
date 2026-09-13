'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEpgNowNextLater } from './hooks/useEpgNowNextLater'
import { channelKey, getLiveTvLists, getPinnedLiveTvKeys, onPinnedLiveTvKeysChanged, type M3uChannel } from './live-tv-data'
import { getResolvedChannels, resolveChannelKeys } from './channel-resolver'
import { isReminded, toggleReminder } from './reminders'
import { useHubText } from './hub-strings'
import { Btn, ChannelBadge, Icon, LT, formatClock, progressOf } from './live-tv-ui'

/**
 * Spelarens tillägg ur handoffen (§4): "Näst upp"-kort med Påminn mig,
 * programförlopp och en favoritrad för kanalbyte (Guide-knappen). Allt läser
 * samma EPG-cache som resten av Live TV — inga nya uppslag.
 */

interface EpgProps {
  channel: M3uChannel
  listId: string | null
  urls: string[]
}

export function PlayerNextUpCard({ channel, listId, urls }: EpgProps) {
  const { h, locale } = useHubText()
  const { next } = useEpgNowNextLater(channel, listId, urls)
  const [tick, setTick] = useState(0)
  void tick
  if (!next) return null
  const minutes = Math.max(0, Math.round((next.start - Date.now()) / 60_000))
  const reminded = isReminded(channel, next)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 10px 8px 12px',
        borderRadius: LT.radiusMd,
        background: 'rgba(8,12,24,0.78)',
        border: `1px solid ${LT.line}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        maxWidth: 360,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: LT.dim }}>{h('nextUp')}</div>
        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: LT.text }} title={next.title}>
          {next.title} · {minutes > 0 ? h('inMinutes', { min: minutes }) : formatClock(next.start, locale)}
        </div>
      </div>
      <Btn
        variant="ghost"
        small
        pressed={reminded}
        onClick={() => {
          toggleReminder(channel, next)
          setTick((value) => value + 1)
        }}
        style={{ color: reminded ? LT.accent : LT.accentText, padding: '4px 10px', fontSize: 12 }}
      >
        <Icon.Bell size={14} filled={reminded} /> {reminded ? h('reminderOn') : h('reminderOff')}
      </Btn>
    </div>
  )
}

export function PlayerProgrammeProgress({ channel, listId, urls }: EpgProps) {
  const { now } = useEpgNowNextLater(channel, listId, urls)
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  if (!now) return null
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }} aria-hidden="true">
      <div style={{ height: '100%', width: `${Math.round(progressOf(now.start, now.stop, nowMs) * 100)}%`, background: LT.accent }} />
    </div>
  )
}

function FavouriteCard({ channel, listId, urls, current, onSwitch }: EpgProps & { current: boolean; onSwitch: (channel: M3uChannel) => void }) {
  const { now } = useEpgNowNextLater(channel, listId, urls)
  return (
    <button
      type="button"
      onClick={() => onSwitch(channel)}
      aria-current={current ? 'true' : undefined}
      className="transition hover:brightness-125"
      style={{
        width: 190,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: LT.radiusSm,
        background: current ? 'rgba(244,132,95,0.16)' : 'rgba(252,252,255,0.08)',
        border: `1px solid ${current ? LT.accentLine : LT.line}`,
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <ChannelBadge channel={channel} size={26} />
      <div style={{ minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 12, fontWeight: 500, color: LT.text }}>{now?.title ?? channel.name}</div>
        <div className="truncate" style={{ fontSize: 10, color: LT.dim }}>{channel.name}</div>
      </div>
    </button>
  )
}

/** Guide-raden: favoriter med nu-titel; klick byter kanal. */
export function PlayerFavouritesRow({ current, listId, urls, onSwitch }: { current: M3uChannel; listId: string | null; urls: string[]; onSwitch: (channel: M3uChannel) => void }) {
  const [pinned, setPinned] = useState<string[]>(() => getPinnedLiveTvKeys())
  useEffect(() => onPinnedLiveTvKeysChanged(() => setPinned(getPinnedLiveTvKeys())), [])
  /**
   * Favoritnycklarna slås upp mot appens index (lagring v2).
   *
   * Raden byggde tidigare en nyckelkarta ur listornas INBÄDDADE `channels`.
   * Efter migreringen är det fältet tomt för m3u/xtream-listor, så raden hade
   * krympt till bara den kanal som spelas. Uppslaget är cachat per nyckel i
   * `channel-resolver`, så en favorit kostar ett anrop en gång per sidladdning.
   * Manuella (`custom`) listor bär fortfarande sina kanaler och läses direkt.
   */
  const pinnedId = pinned.join(',')
  const [resolved, setResolved] = useState<Record<string, M3uChannel>>(() => getResolvedChannels(pinned))
  useEffect(() => {
    let live = true
    if (pinned.length === 0) return
    resolveChannelKeys(pinned)
      .then((items) => {
        if (!live || items.length === 0) return
        setResolved((prev) => {
          const next = { ...prev }
          for (const item of items) next[item.key] = item as M3uChannel
          return next
        })
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedId])
  const channels = useMemo(() => {
    const byKey = new Map<string, M3uChannel>(Object.entries(resolved))
    for (const list of getLiveTvLists()) for (const channel of list.channels ?? []) byKey.set(channelKey(channel), channel)
    const favourites = pinned.map((key) => byKey.get(key)).filter((channel): channel is M3uChannel => Boolean(channel))
    // Aktuell kanal först om den inte redan är favorit, så raden alltid har en startpunkt.
    const currentKey = channelKey(current)
    return favourites.some((channel) => channelKey(channel) === currentKey) ? favourites : [current, ...favourites]
  }, [pinned, current, resolved])
  return (
    <div
      className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gap: 8, padding: '8px 0 2px' }}
    >
      {channels.map((channel) => (
        <FavouriteCard
          key={channelKey(channel)}
          channel={channel}
          listId={listId}
          urls={urls}
          current={channel.url === current.url}
          onSwitch={onSwitch}
        />
      ))}
    </div>
  )
}
