'use client'

import { useMemo, useState } from 'react'
import type { BrowsePageProps } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from './live-tv-data'
import { qualityFromName, startOfLocalDay, useLiveTvModel } from './live-tv-model'
import { useHubText } from './hub-strings'
import { catchUpForChannel, channelSupportsCatchUp, expiresLabel } from './catch-up'
import { isReminded, toggleReminder } from './reminders'
import { activeProfileHasPin, pinSupportAvailable, toggleChannelLock, verifyActiveProfilePin } from './channel-locks'
import {
  Btn,
  ChannelBadge,
  Icon,
  Kicker,
  LT,
  LiveTag,
  LiveTvHeader,
  PinGate,
  ProgressBar,
  ScrollRow,
  Tag,
  formatClock,
  heroGradient,
  progressOf,
  surfaceCard,
} from './live-tv-ui'
import { LockedTag, ReminderBell, RemindersMenu, encodeChannelParams, useLiveTvChrome, useLiveTvNav } from './live-tv-shell'

/**
 * Kanaldetalj (handoff §3): hero, dagens tablå med påminnelser, repriser,
 * kanalinformation och föräldrakontroll (profilens PIN).
 */
interface Props {
  params?: BrowsePageProps['params']
  onNavigate: BrowsePageProps['onNavigate']
}

function channelFromParams(params?: Record<string, string>): M3uChannel | null {
  const url = params?.url?.trim()
  if (!url) return null
  return {
    name: params?.name?.trim() || 'Unknown',
    logo: params?.logo?.trim() || null,
    group: params?.group?.trim() || 'Other',
    url,
    tvgId: params?.tvgId?.trim() || null,
  }
}

export function LiveTvChannelPage({ params, onNavigate }: Props) {
  const { h, locale } = useHubText()
  const model = useLiveTvModel()
  const go = useLiveTvNav(onNavigate)
  const { play, chrome } = useLiveTvChrome(model)
  const [reminderTick, setReminderTick] = useState(0)
  const [lockGate, setLockGate] = useState(false)
  const [lockNotice, setLockNotice] = useState<string | null>(null)
  void reminderTick

  const fromParams = channelFromParams(params)
  const channel = (fromParams ? model.byUrl.get(fromParams.url) : null) ?? fromParams
  const { nowMs } = model

  const info = channel ? model.nowFor(channel) : { now: null, next: null, later: null }
  const today = useMemo(
    () => (channel ? model.scheduleFor(channel, startOfLocalDay(nowMs), startOfLocalDay(nowMs, 1)) : []),
    [channel, model, nowMs],
  )
  const replays = useMemo(
    () => (channel ? catchUpForChannel(channel, model.cache, model.nameIndex, nowMs, 8) : []),
    [channel, model.cache, model.nameIndex, nowMs],
  )

  if (!channel) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: LT.text }}>
        <LiveTvHeader title={h('channelTitle')} onBack={() => go('hub')} backLabel={h('back')} />
        <div style={{ ...surfaceCard, padding: 20, color: LT.muted }}>{h('hubEmptyBody')}</div>
      </div>
    )
  }

  const key = channelKey(channel)
  const pinned = model.pinnedSet.has(key)
  const locked = model.locked.has(key)
  const list = model.listFor(channel)
  const quality = qualityFromName(channel.name)
  const lockAvailable = pinSupportAvailable()

  const requestLockToggle = () => {
    if (!lockAvailable || !activeProfileHasPin()) {
      setLockNotice(h('pinMissing'))
      return
    }
    setLockNotice(null)
    setLockGate(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: LT.text }}>
      <LiveTvHeader
        title={h('channelTitle')}
        onBack={() => go('hub')}
        backLabel={h('back')}
        right={<RemindersMenu model={model} onOpenChannel={(target) => go('channel', encodeChannelParams(target))} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <div style={{ ...heroGradient, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ChannelBadge channel={channel} size={56} radius={LT.radiusMd} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="truncate" style={{ fontSize: 22, fontWeight: 500 }}>{channel.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {channel.group ? <Tag>{channel.group}</Tag> : null}
                  {info.now ? <LiveTag label={h('hubLive')} /> : null}
                  {locked ? <LockedTag label={h('lockedWithPin')} /> : null}
                </div>
              </div>
              <Btn variant="ghost" icon onClick={() => model.togglePin(channel)} ariaLabel={pinned ? h('hubUnpin') : h('hubPin')} title={pinned ? h('hubUnpin') : h('hubPin')} style={{ color: pinned ? LT.accent : undefined }}>
                <Icon.Heart filled={pinned} />
              </Btn>
            </div>
            <div style={{ fontSize: 17, fontWeight: 500 }}>{info.now?.title ?? h('hubNoProgramme')}</div>
            {info.now?.description ? (
              <p style={{ margin: 0, fontSize: 13, color: LT.muted, maxWidth: '60ch' }}>{info.now.description}</p>
            ) : null}
            {info.now ? (
              <>
                <ProgressBar value={progressOf(info.now.start, info.now.stop, nowMs)} width={320} />
                <div style={{ fontSize: 12, color: LT.dim }}>
                  {formatClock(info.now.start, locale)}–{formatClock(info.now.stop, locale)} · {h('minutesLeft', { min: Math.max(0, Math.round((info.now.stop - nowMs) / 60_000)) })}
                </div>
              </>
            ) : null}
            {info.next ? <div style={{ fontSize: 12, color: LT.dim }}>{h('nextAt', { title: info.next.title, time: formatClock(info.next.start, locale) })}</div> : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <Btn variant="primary" onClick={() => play({ channel })}>
                {h('hubWatchNow')} <Icon.Play size={12} />
              </Btn>
              <Btn variant="secondary" onClick={() => go('epg')}>
                {h('openEpg')}
              </Btn>
            </div>
          </div>

          <section>
            <h3 style={{ fontSize: 16, margin: '0 0 10px', fontWeight: 600 }}>{h('today')}</h3>
            {today.length === 0 ? (
              <div style={{ ...surfaceCard, padding: 14, fontSize: 13, color: LT.muted }}>{h('hubNoProgramme')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: LT.line, borderRadius: LT.radiusMd, overflow: 'hidden' }}>
                {today.map((programme) => {
                  const isNow = programme.start <= nowMs && programme.stop > nowMs
                  const past = programme.stop <= nowMs
                  const reminded = isReminded(channel, programme)
                  return (
                    <div key={programme.start} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isNow ? LT.surfaceRaised : LT.surface, padding: '8px 12px', opacity: past ? 0.6 : 1 }}>
                      <div style={{ fontSize: 12, color: LT.dim, width: 44, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{formatClock(programme.start, locale)}</div>
                      <div className="truncate" style={{ fontSize: 13, flex: 1 }}>
                        {programme.title}
                        {isNow ? <span style={{ marginLeft: 8 }}><LiveTag label={h('hubLive')} /></span> : null}
                      </div>
                      {isNow ? (
                        <Btn variant="ghost" small onClick={() => play({ channel })}>{h('guideWatch')}</Btn>
                      ) : !past ? (
                        <ReminderBell
                          on={reminded}
                          label={reminded ? h('reminderOn') : h('reminderOff')}
                          onToggle={() => {
                            toggleReminder(channel, programme)
                            setReminderTick((value) => value + 1)
                          }}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {channelSupportsCatchUp(channel) ? (
            <section>
              <h3 style={{ fontSize: 16, margin: '0 0 10px', fontWeight: 600 }}>{h('replays')}</h3>
              {replays.length === 0 ? (
                <div style={{ ...surfaceCard, padding: 14, fontSize: 13, color: LT.muted }}>{h('hubNoProgramme')}</div>
              ) : (
                <ScrollRow>
                  {replays.map((item) => {
                    const left = expiresLabel(item.expiresAt, nowMs)
                    return (
                      <button
                        key={item.programme.start}
                        type="button"
                        onClick={() => play({ channel, url: item.url, label: `${channel.name} · ${item.programme.title}` })}
                        className="transition hover:brightness-110"
                        style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, background: 'transparent', border: 0, padding: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <div style={{ width: '100%', height: 110, borderRadius: LT.radiusMd, background: 'linear-gradient(135deg, #1b2540, #2a3552)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          <Icon.Play size={26} />
                          <span style={{ position: 'absolute', right: 8, top: 8 }}><Tag variant="accent">{h('catchUp')}</Tag></span>
                        </div>
                        <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>{item.programme.title}</div>
                        <div style={{ fontSize: 11, color: LT.dim }}>
                          {formatClock(item.programme.start, locale)} · {left.days >= 1 ? h('availableDays', { days: left.days }) : h('availableHours', { hours: left.hours })}
                        </div>
                      </button>
                    )
                  })}
                </ScrollRow>
              )}
            </section>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...surfaceCard, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Kicker>{h('channelInfo')}</Kicker>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginTop: 6 }}>
              <Row label={h('quality')} value={quality ?? h('unknown')} />
              <Row label={h('group')} value={channel.group || h('unknown')} />
              <Row label={h('sourceList')} value={list?.name ?? h('unknown')} />
              <Row label={h('epgSource')} value={model.tvgIdFor(channel) ? h('yes') : h('no')} />
              <Row label={h('catchUp')} value={channel.archive ? h('availableDays', { days: channel.archive.days }) : h('no')} />
            </div>
          </div>
          <div style={{ ...surfaceCard, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Kicker>{h('parental')}</Kicker>
            <p style={{ margin: 0, fontSize: 12, color: LT.muted }}>{h('parentalBody')}</p>
            <button
              type="button"
              onClick={requestLockToggle}
              aria-pressed={locked}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, marginTop: 4, color: 'inherit', fontFamily: 'inherit' }}
            >
              <span style={{ width: 36, height: 20, borderRadius: 10, background: locked ? LT.accent : LT.neutral, position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: locked ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: LT.text, transition: 'left 0.15s' }} />
              </span>
              <span style={{ fontSize: 13 }}>{locked ? h('lockedWithPin') : h('noRestriction')}</span>
            </button>
            {lockNotice ? <div style={{ fontSize: 12, color: '#fecdd3' }}>{lockNotice}</div> : null}
          </div>
        </div>
      </div>

      <PinGate
        open={lockGate}
        title={h('enterPin')}
        wrongText={h('pinWrong')}
        unlockLabel={h('unlock')}
        cancelLabel={h('cancel')}
        onVerify={verifyActiveProfilePin}
        onClose={() => setLockGate(false)}
        onUnlocked={() => {
          setLockGate(false)
          toggleChannelLock(channel)
        }}
      />
      {chrome}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: LT.dim }}>{label}</span>
      <span className="truncate" style={{ textAlign: 'right' }}>{value}</span>
    </div>
  )
}
