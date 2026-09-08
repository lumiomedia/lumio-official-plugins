'use client'

import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import type { BrowsePageProps } from '@/lib/plugin-sdk'
import type { M3uChannel } from './live-tv-data'
import { channelKey } from './live-tv-data'
import type { LiveTvModel } from './live-tv-model'
import { useHubText } from './hub-strings'
import { Btn, ChannelBadge, Icon, LT, PinGate, Tag, formatClock, surfaceCard } from './live-tv-ui'
import {
  activeProfileHasPin,
  isUnlockedThisSession,
  markUnlockedThisSession,
  pinSupportAvailable,
  verifyActiveProfilePin,
} from './channel-locks'
import { reminderToChannel, removeReminder, type Reminder } from './reminders'

export const LIVE_TV_BROWSE_PAGE_ID = 'live-tv-browse'
export type LiveTvView = 'hub' | 'epg' | 'channel' | 'grid'

export function encodeChannelParams(channel: M3uChannel): Record<string, string> {
  return {
    url: channel.url,
    name: channel.name,
    logo: channel.logo ?? '',
    group: channel.group,
    tvgId: channel.tvgId ?? '',
  }
}

export function useLiveTvNav(onNavigate: BrowsePageProps['onNavigate']) {
  return useCallback(
    (view: LiveTvView, params: Record<string, string> = {}) =>
      onNavigate({ pageId: LIVE_TV_BROWSE_PAGE_ID, params: { view, ...params } }),
    [onNavigate],
  )
}

type PlayerComponent = ComponentType<{
  channel: M3uChannel
  onClose: () => void
  listId?: string | null
  epgUrls?: string[]
  onSwitchChannel?: (channel: M3uChannel) => void
}>

export interface PlayRequest {
  channel: M3uChannel
  /** Catch-up: spela en annan URL än kanalens liveström. */
  url?: string
  label?: string
}

/**
 * Spelare, PIN-grind och påminnelsebanner för alla Live TV-sidor. Sidan
 * anropar `play(...)`; låsta kanaler stoppas i PIN-grinden först. `chrome`
 * ritas sist i sidan.
 */
export function useLiveTvChrome(model: LiveTvModel): { play: (request: PlayRequest) => void; chrome: ReactNode } {
  const { h, locale } = useHubText()
  const [PlayerComponentState, setPlayerComponent] = useState<PlayerComponent | null>(null)
  const [active, setActive] = useState<PlayRequest | null>(null)
  const [pending, setPending] = useState<PlayRequest | null>(null)
  const [banner, setBanner] = useState<Reminder | null>(null)

  useEffect(() => {
    if (!active || PlayerComponentState) return
    let cancelled = false
    void import('./live-tv-player')
      .then((mod) => {
        if (!cancelled) setPlayerComponent(() => mod.LiveTvPlayer)
      })
      .catch(() => {
        if (!cancelled) setActive(null)
      })
    return () => {
      cancelled = true
    }
  }, [active, PlayerComponentState])

  // Påminnelseschemat körs app-övergripande i pluginets bootstrap
  // (live-tv-reminders-mount.tsx); sidans egen banner hålls kvar tyst för
  // äldre värdar som inte monterar bootstraps.
  void setBanner

  const play = useCallback(
    (request: PlayRequest) => {
      const locked = model.locked.has(channelKey(request.channel))
      if (locked && !isUnlockedThisSession() && pinSupportAvailable() && activeProfileHasPin()) {
        setPending(request)
        return
      }
      setActive(request)
    },
    [model.locked],
  )

  const activeChannel: M3uChannel | null = active
    ? active.url
      ? { ...active.channel, url: active.url, name: active.label ?? active.channel.name }
      : active.channel
    : null

  const chrome = (
    <>
      {activeChannel && PlayerComponentState ? (
        <PlayerComponentState
          channel={activeChannel}
          onClose={() => setActive(null)}
          listId={model.epgListId}
          epgUrls={model.epgUrls}
          onSwitchChannel={(channel) => setActive({ channel })}
        />
      ) : null}
      <PinGate
        open={pending !== null}
        title={h('enterPin')}
        wrongText={h('pinWrong')}
        unlockLabel={h('unlock')}
        cancelLabel={h('cancel')}
        onVerify={verifyActiveProfilePin}
        onClose={() => setPending(null)}
        onUnlocked={() => {
          markUnlockedThisSession()
          const request = pending
          setPending(null)
          if (request) setActive(request)
        }}
      />
      {banner ? (
        <div
          role="status"
          style={{
            ...surfaceCard,
            background: '#111b2f',
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 70,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: 420,
            boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
          }}
        >
          <ChannelBadge channel={reminderToChannel(banner)} size={36} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, color: LT.dim }}>
              {banner.start <= model.nowMs
                ? h('startsNow', { channel: banner.channelName })
                : h('startsIn', { min: Math.max(1, Math.round((banner.start - model.nowMs) / 60_000)), channel: banner.channelName })}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: LT.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {banner.title} · {formatClock(banner.start, locale)}
            </div>
          </div>
          <Btn
            variant="primary"
            small
            onClick={() => {
              const reminder = banner
              setBanner(null)
              removeReminder(reminder.id)
              play({ channel: reminderToChannel(reminder) })
            }}
          >
            {h('watch')}
          </Btn>
          <Btn variant="ghost" icon onClick={() => setBanner(null)} ariaLabel={h('dismiss')} title={h('dismiss')}>
            <Icon.Close size={16} />
          </Btn>
        </div>
      ) : null}
    </>
  )

  return { play, chrome }
}

/** Klock-ikonen i toppbaren med rullista över kommande påminnelser. */
export function RemindersMenu({ model, onOpenChannel, tvStation }: { model: LiveTvModel; onOpenChannel: (channel: M3uChannel) => void; tvStation?: Record<string, string> }) {
  const { h, locale } = useHubText()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('[data-reminders-menu]')) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div style={{ position: 'relative' }} data-reminders-menu="">
      <Btn variant="ghost" icon onClick={() => setOpen((value) => !value)} ariaLabel={h('reminders')} title={h('reminders')} pressed={open} tvStation={tvStation}>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Icon.Bell />
          {model.reminders.length > 0 ? (
            <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: 999, background: LT.accent }} />
          ) : null}
        </span>
      </Btn>
      {open ? (
        <div
          style={{
            ...surfaceCard,
            background: '#111b2f',
            position: 'absolute',
            right: 0,
            top: 42,
            zIndex: 60,
            width: 320,
            maxHeight: 360,
            overflowY: 'auto',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
          }}
        >
          {model.reminders.length === 0 ? (
            <div style={{ padding: 10, fontSize: 13, color: LT.dim }}>{h('remindersEmpty')}</div>
          ) : (
            model.reminders.map((reminder) => {
              const channel = model.byUrl.get(reminder.channelUrl) ?? reminderToChannel(reminder)
              return (
                <div key={reminder.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: LT.radiusSm }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onOpenChannel(channel)
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <ChannelBadge channel={channel} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: LT.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reminder.title}</div>
                      <div style={{ fontSize: 11, color: LT.dim }}>
                        {reminder.channelName} · {formatClock(reminder.start, locale)}
                      </div>
                    </div>
                  </button>
                  <Btn variant="ghost" icon onClick={() => removeReminder(reminder.id)} ariaLabel={h('remove')} title={h('remove')}>
                    <Icon.Close size={14} />
                  </Btn>
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Klockknapp för ett program: fylld när påminnelse finns. */
export function ReminderBell({ on, onToggle, label, tvStation }: { on: boolean; onToggle: () => void; label: string; tvStation?: Record<string, string> }) {
  return (
    <Btn variant="ghost" icon onClick={onToggle} ariaLabel={label} title={label} pressed={on} style={{ color: on ? LT.accent : undefined }} tvStation={tvStation}>
      <Icon.Bell size={16} filled={on} />
    </Btn>
  )
}

export function LockedTag({ label }: { label: string }) {
  return (
    <Tag variant="outline">
      <Icon.Lock /> {label}
    </Tag>
  )
}
