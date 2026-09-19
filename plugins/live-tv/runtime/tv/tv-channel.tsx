'use client'

import { useState } from 'react'
import { qualityFromName } from '../live-tv-model'
import { PinGate, formatClock } from '../live-tv-ui'
import { toggleChannelLock, verifyActiveProfilePin } from '../channel-locks'
import { DAY_OFFSETS, kindOf, useChannelDetail } from './channel-detail'
import type { TvViewProps } from './tv-shell'
import { ChannelArt, Icons, RoundBtn, Tag, TV, Toggle, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { TvPreview } from './tv-preview'
import { isReminded } from '../reminders'
import { TvChannelPhone } from './mobile/channel-phone'

/**
 * Telefongrenen (Task 8) har egen layout och egna testid:n — routas härifrån
 * innan skrivbordets tre kolumner ritas. `channelFromParams`/`kindOf`/
 * `DAY_OFFSETS` och hela datalagret bor i `channel-detail.ts`, delat av båda
 * grenarna (ingen importcykel: ingen av grenarna importerar den andra).
 */
export function TvChannel(props: TvViewProps) {
  if (props.phone) return <TvChannelPhone {...props} />
  return <TvChannelDesktop {...props} />
}

function TvChannelDesktop({ model, nav, params, settings }: TvViewProps) {
  const { tt, locale } = useTvText()
  const [lockGate, setLockGate] = useState(false)
  const { channel, dayOffset, setDayOffset, rows, selected, setSelectedStart, kind, canReplaySelected, reminded, pinned, locked, lockAvailable, scheduleLoading, catchUpByStart, primary, primaryLabel, dayLabel } = useChannelDetail(model, nav, params)

  // Oupplösbar kanal (tom `url` i parametrarna): vyn har inget att visa, och
  // utan en enda station fanns heller ingen `data-init` — värdens fokusmotor
  // hittade ingen startpunkt, fjärrkontrollen låste sig på en tom skärm och
  // Back var det enda som fungerade av ren tur. Stationen ger både ett
  // fokusmål och den enda meningsfulla handlingen: tillbaka.
  if (!channel) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: dp(48) }}>
        <div
          data-testid="channel-unresolved"
          {...station(() => nav.back(), undefined, { 'data-init': '' })}
          style={{ height: dp(52), minHeight: dp(52), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.s10, display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(19), color: TV.dim, cursor: 'pointer' }}
        >
          <Icons.ChevronLeft />{tt('noProgramme')}
        </div>
      </div>
    )
  }

  const previewLabel = kind === 'past' ? tt('replayAvailable', { days: channel.archive?.days ?? 0 }) : kind === 'future' && selected ? tt('startsAt', { time: formatClock(selected.start, locale) }) : tt('onNow')

  const requestLockToggle = () => {
    // Låsning och upplåsning kräver profilens PIN i båda riktningarna —
    // samma regel som tv-settings.tsx:s requestUnlock och tv-shell.tsx:s
    // requestLockToggle. Raden ritas bara när lockAvailable ändå är sant, så
    // det "PIN saknas"-läget som skrivbordet visar en notis för uppstår
    // aldrig här.
    if (!lockAvailable) return
    setLockGate(true)
  }

  const outerStyle = { flex: 1, minHeight: 0, display: 'flex' } as const
  const scheduleStyle = { flex: 1, minWidth: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(40)}px 0 ${dp(48)}px`, display: 'flex', flexDirection: 'column' } as const
  const scheduleListStyle = { flex: 1, minHeight: 0, overflowY: 'auto' } as const
  const dayPickerStyle = { width: dp(150), flexShrink: 0, padding: `${dp(120)}px ${dp(14)}px 0`, display: 'flex', flexDirection: 'column', gap: dp(10) } as const
  const detailStyle = { width: dp(560), flexShrink: 0, padding: `${dp(34)}px ${dp(48)}px ${dp(32)}px ${dp(36)}px`, display: 'flex', flexDirection: 'column', gap: dp(16) } as const

  return (
    <div data-testid="channel-view-root" style={outerStyle}>
      {/* Tablå */}
      <div data-testid="channel-schedule" style={scheduleStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(16), marginBottom: dp(16) }}>
          <RoundBtn {...station(() => nav.back())}><Icons.ChevronLeft /></RoundBtn>
          <ChannelArt channel={channel} style={{ width: dp(88), height: dp(56) }} radius={dp(8)} />
          <span style={{ fontSize: dp(30), fontWeight: 600 }}>{channel.name}</span>
          {channel.group ? <Tag variant="neutral">{channel.group}</Tag> : null}
          <RoundBtn {...station(() => model.togglePin(channel))} background={pinned ? TV.accMix(22) : TV.s12} style={{ marginLeft: 'auto' }}><span style={{ color: pinned ? TV.acc : TV.text }}><Icons.Heart size={dp(24)} filled={pinned} /></span></RoundBtn>
        </div>
        <div data-scroll="" style={scheduleListStyle}>
          {rows.length === 0 ? <div style={{ padding: dp(24), color: TV.dim, fontSize: dp(19) }}>{scheduleLoading ? tt('loadingGuide') : tt('noProgramme')}</div> : null}
          {rows.map((row, index) => {
            const k = kindOf(row.p, model.nowMs)
            const isSelected = selected?.start === row.p.start
            const showHeader = index === 0 || rows[index - 1].day !== row.day
            const rowCanReplay = catchUpByStart.has(row.p.start)
            const tag = k === 'now'
              ? <Tag variant="live">{tt('live')}</Tag>
              : k === 'past'
                ? (rowCanReplay ? <span style={{ fontSize: dp(15), letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(243,244,248,0.45)' }}>{tt('replay')}</span> : null)
                : <span style={{ fontSize: dp(15), letterSpacing: '0.08em', textTransform: 'uppercase', color: isReminded(channel, row.p) ? TV.accText : 'rgba(243,244,248,0.45)' }}>{tt('remind')}</span>
            return (
              <div key={row.p.start}>
                {showHeader ? <div style={{ height: dp(44), display: 'flex', alignItems: 'center', paddingLeft: dp(96), fontSize: dp(15), fontWeight: 600, color: TV.accText }}>{row.day === 'yesterday' ? tt('yesterday') : dayLabel(dayOffset).top}</div> : null}
                <div
                  {...station(primary, undefined, isSelected ? { 'data-init': '' } : undefined)}
                  onFocus={() => setSelectedStart(row.p.start)}
                  style={{ height: dp(66), minHeight: dp(66), borderRadius: dp(12), padding: `0 ${dp(16)}px`, display: 'flex', alignItems: 'center', gap: dp(16), background: isSelected ? TV.s10 : 'transparent', color: k === 'past' ? 'rgba(243,244,248,0.55)' : TV.text, cursor: 'pointer' }}
                >
                  <span style={{ width: dp(80), fontSize: dp(21), fontVariantNumeric: 'tabular-nums' }}>{formatClock(row.p.start, locale)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: dp(21), fontWeight: k === 'now' ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.p.title}</span>
                  {tag}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dagväljare */}
      <div data-testid="day-picker" style={dayPickerStyle}>
        {DAY_OFFSETS.map((offset) => {
          const active = offset === dayOffset
          const label = dayLabel(offset)
          return (
            <div key={offset} data-testid={offset === 0 ? 'day-btn-0' : undefined}>
              <div {...station(() => setDayOffset(offset), undefined, { 'data-testid': 'day-btn' })} style={{ height: dp(74), minHeight: dp(74), borderRadius: dp(12), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: active ? '#f3f4f8' : 'transparent', color: active ? '#111' : offset > 0 ? TV.accText : 'rgba(243,244,248,0.6)', cursor: 'pointer' }}>
                <span style={{ fontSize: dp(17), fontWeight: 600 }}>{label.top}</span>
                <span style={{ fontSize: dp(15), opacity: 0.75 }}>{label.bottom}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detalj */}
      <div data-testid="detail" style={detailStyle}>
        <TvPreview channel={channel} enabled={settings.previewEnabled && kind === 'now'} live={kind === 'now'} width="100%" height={dp(268)} label={previewLabel} onOk={primary} />
        <div style={{ fontSize: dp(28), fontWeight: 600 }}>{selected?.title ?? channel.name}</div>
        {selected ? <div style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.6)' }}>{tt('airedAt', { time: formatClock(selected.start, locale), channel: channel.name })}</div> : null}
        {selected?.description ? <div style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.75)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>{selected.description}</div> : null}
        <div style={{ display: 'flex', gap: dp(12) }}>
          <div
            data-testid="primary-action"
            {...station(primary, undefined, rows.length === 0 ? { 'data-init': '' } : undefined)}
            style={{ height: dp(52), minHeight: dp(52), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.acc, color: TV.onAcc, display: 'inline-flex', alignItems: 'center', gap: dp(10), fontSize: dp(19), fontWeight: 600, cursor: 'pointer' }}
          >
            {kind === 'future' ? <Icons.Bell filled={reminded} /> : <Icons.Play size={dp(20)} />}{primaryLabel}
          </div>
        </div>
        <div style={{ marginTop: 'auto', padding: `${dp(18)}px ${dp(20)}px`, borderRadius: dp(14), background: TV.s07, border: `1px solid ${TV.lineCard}`, display: 'flex', flexDirection: 'column', gap: dp(10) }}>
          <div style={{ fontFamily: TV.mono, fontSize: dp(12), letterSpacing: '0.14em', color: TV.accText }}>{tt('channelInfo')}</div>
          {[
            [tt('quality'), qualityFromName(channel.name) ?? '–'],
            [tt('source'), model.listFor(channel)?.name ?? '–'],
            [tt('replayDays'), channel.archive ? tt('daysCount', { days: channel.archive.days }) : tt('noArchive')],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: dp(17) }}><span style={{ color: TV.muted }}>{label}</span><span>{value}</span></div>
          ))}
          {lockAvailable ? (
            <div {...station(requestLockToggle)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: dp(17), paddingTop: dp(10), borderTop: `1px solid ${TV.line}`, cursor: 'pointer' }}>
              <span>{tt('lockWithPin')}</span><Toggle on={locked} />
            </div>
          ) : null}
        </div>
      </div>

      <PinGate
        open={lockGate}
        title={tt('enterPin')}
        wrongText={tt('pinWrong')}
        unlockLabel={tt('unlock')}
        cancelLabel={tt('cancel')}
        onVerify={verifyActiveProfilePin}
        onClose={() => setLockGate(false)}
        onUnlocked={() => {
          setLockGate(false)
          toggleChannelLock(channel)
        }}
      />
    </div>
  )
}
