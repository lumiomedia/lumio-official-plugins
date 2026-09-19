'use client'

import { useState } from 'react'
import { qualityFromName } from '../../live-tv-model'
import { formatClock, progressOf, PinGate } from '../../live-tv-ui'
import { buildTimeshiftUrl } from '../../catch-up'
import { isReminded, toggleReminder } from '../../reminders'
import { verifyActiveProfilePin, toggleChannelLock } from '../../channel-locks'
import type { EpgProgramme } from '../../epg/types'
import type { TvViewProps } from '../tv-shell'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { DAY_OFFSETS, kindOf, useChannelDetail, type ChannelDetailKind } from '../channel-detail'
import { MT, ellipsis, clamp2 } from './mobile-tokens'
import { MIcons } from './mobile-icons'
import { MobileHeader } from './mobile-header'
import { MobileSheet, type MobileSheetProps } from './mobile-sheet'
import { MobileLogo } from './mobile-logo'
import { MobileChips } from './mobile-chips'

/** Dagchipsens "Idag" (offset 0) är alltid vit; passerade dagar (< 0) dämpas. */
const PAST_DAYS = DAY_OFFSETS.filter((o) => o < 0) as number[]

/**
 * Kanaldetaljen på telefon (fas 3, Task 8, handoffen §5). En kolumn:
 * sidhuvud, kanalrad, primärknapp, dagchips, programlista. Tryck på en rad
 * öppnar programarket — kanalinfo (kvalitet/källa/repris + lås/multivy) bor
 * i ett eget ark, nått både från kanalraden och från programarket.
 *
 * Datalagret kommer HELT från `useChannelDetail` (delad med skrivbordsgrenen,
 * `channel-detail.ts`) — den här filen äger bara layouten.
 */
export function TvChannelPhone({ model, nav, params }: TvViewProps) {
  const { tt, locale } = useTvText()
  const { channel, dayOffset, setDayOffset, rows, setSelectedStart, pinned, locked, lockAvailable, scheduleLoading, catchUpByStart, primary, primaryLabel, dayLabel } = useChannelDetail(model, nav, params)
  const [sheetProgramme, setSheetProgramme] = useState<EpgProgramme | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [lockGate, setLockGate] = useState(false)

  if (!channel) {
    return (
      <div data-testid="channel-phone" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MobileHeader title="" back onBack={nav.back} testId="channel-header" />
        <div data-testid="channel-empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MT.dim, fontSize: 15 }}>{tt('noProgramme')}</div>
      </div>
    )
  }

  const heart = (
    <div
      data-testid="channel-pin"
      {...station(() => model.togglePin(channel))}
      style={{ width: 44, height: 44, borderRadius: 999, background: pinned ? MT.accMix(22) : MT.s10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
    >
      <span style={{ display: 'flex', color: pinned ? MT.acc : MT.text }}><MIcons.Heart size={22} filled={pinned} /></span>
    </div>
  )

  const infoSheetItems: MobileSheetProps['items'] = [
    ...(lockAvailable ? [{ key: 'lock', label: locked ? tt('menuUnlock') : tt('menuLock'), run: () => setLockGate(true) }] : []),
    { key: 'multiview', label: tt('menuAddMultiview'), run: () => nav.addToMultiview(channel) },
  ]
  const infoSheetBody = (
    <>
      {[
        [tt('quality'), qualityFromName(channel.name) ?? '–'],
        [tt('source'), model.listFor(channel)?.name ?? '–'],
        [tt('replayDays'), channel.archive ? tt('daysCount', { days: channel.archive.days }) : tt('noArchive')],
      ].map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>{label}</span><span>{value}</span></div>
      ))}
    </>
  )

  // Programarkets primärval kommer av det TRYCKTA programmet direkt, inte av
  // `selected` (hookens state) — `setSelectedStart` hinner inte om till nästa
  // rendering förrän EFTER klicket, så ett ark byggt på `selected` hade visat
  // förra programmets etikett/åtgärd under en rendering.
  const sheetKind: ChannelDetailKind | null = sheetProgramme ? kindOf(sheetProgramme, model.nowMs) : null
  const sheetCanReplay = sheetProgramme ? catchUpByStart.has(sheetProgramme.start) : false
  const sheetReminded = sheetProgramme && sheetKind === 'future' ? isReminded(channel, sheetProgramme) : false
  const sheetLabel = sheetKind === 'past' ? (sheetCanReplay ? tt('playReplay') : tt('watchNow')) : sheetKind === 'future' ? (sheetReminded ? tt('removeReminder') : tt('remindMe')) : tt('watchNow')
  const sheetRun = () => {
    if (!sheetProgramme) return
    if (sheetKind === 'past') {
      const url = sheetCanReplay ? buildTimeshiftUrl(channel, sheetProgramme.start, sheetProgramme.stop - sheetProgramme.start) : null
      if (url) nav.play({ channel, url, label: sheetProgramme.title })
      else nav.play({ channel })
      return
    }
    if (sheetKind === 'future') { toggleReminder(channel, sheetProgramme, model.nowMs); return }
    nav.play({ channel })
  }

  return (
    <div data-testid="channel-phone" data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={channel.name} back onBack={nav.back} right={heart} testId="channel-header" /></div>

      {/* Kanalrad */}
      <div data-testid="channel-row" {...station(() => setInfoOpen(true))} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 46, cursor: 'pointer' }}>
        <MobileLogo channel={channel} width={72} height={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: MT.muted, ...ellipsis }}>{[model.channelNumber(channel), channel.group, qualityFromName(channel.name)].filter(Boolean).join(' · ')}</div>
          {channel.archive && channel.archive.days > 0 ? <div style={{ fontSize: 13, color: MT.dim, ...ellipsis }}>{tt('replayDaysShort', { days: channel.archive.days })}</div> : null}
        </div>
      </div>

      {/* Primärknapp */}
      <div
        data-testid="channel-primary"
        {...station(primary, undefined, { 'data-init': '' })}
        style={{ minHeight: 48, borderRadius: 999, background: MT.acc, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
      >
        <MIcons.Play size={18} />{primaryLabel}
      </div>

      {/* Dagchips */}
      <MobileChips
        testId="channel-days"
        items={DAY_OFFSETS.map((o) => ({ key: o, id: String(o), label: dayLabel(o).top }))}
        value={dayOffset}
        onChange={setDayOffset}
        emphasisKey={0}
        dimKeys={PAST_DAYS}
      />

      {/* Programlista */}
      {rows.length === 0 ? (
        <div data-testid="channel-empty" style={{ padding: 24, textAlign: 'center', color: MT.dim, fontSize: 14 }}>{scheduleLoading ? tt('loadingGuide') : tt('noProgramme')}</div>
      ) : null}
      {rows.map(({ p }) => {
        const k = kindOf(p, model.nowMs)
        const rowCanReplay = catchUpByStart.has(p.start)
        return (
          <div
            key={p.start}
            data-testid="programme-row"
            data-kind={k}
            {...station(() => { setSelectedStart(p.start); setSheetProgramme(p) })}
            style={{
              minHeight: 60, padding: '10px 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
              background: k === 'now' ? MT.s06 : undefined, opacity: k === 'past' ? 0.6 : undefined, cursor: 'pointer',
            }}
          >
            <span data-testid="programme-time" style={{ width: 46, flexShrink: 0, fontSize: 14, fontVariantNumeric: 'tabular-nums', color: MT.muted }}>{formatClock(p.start, locale)}</span>
            {/* `minWidth: '0px'` (sträng, inte talet 0): React hoppar över px-suffixet
                för exakt talet 0 (`dangerousStyleValue`s specialfall), så en numerisk
                nolla hade blivit "0" i DOM:en — samma mönster som mobile-channel-row.tsx. */}
            <div style={{ flex: 1, minWidth: '0px' }}>
              <div style={{ fontSize: 15, fontWeight: k === 'now' ? 600 : 400, ...clamp2 }}>{p.title}</div>
              {k === 'now' ? (
                <div data-testid="programme-progress" style={{ height: 4, marginTop: 4, borderRadius: 2, background: MT.s10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressOf(p.start, p.stop, model.nowMs) * 100}%`, background: MT.acc }} />
                </div>
              ) : null}
            </div>
            {k === 'now' ? (
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: MT.live, flexShrink: 0 }}>{tt('live')}</span>
            ) : k === 'past' ? (
              rowCanReplay ? <span style={{ fontSize: 12, letterSpacing: '0.08em', color: MT.dim, flexShrink: 0 }}>{tt('replay')}</span> : null
            ) : (
              <span data-testid="programme-bell" style={{ display: 'flex', flexShrink: 0, color: isReminded(channel, p) ? MT.acc : MT.dim }}><MIcons.Bell size={18} filled={isReminded(channel, p)} /></span>
            )}
          </div>
        )
      })}

      {sheetProgramme ? (
        <MobileSheet
          testId="programme-sheet"
          title={sheetProgramme.title}
          subtitle={`${formatClock(sheetProgramme.start, locale)}–${formatClock(sheetProgramme.stop, locale)}`}
          body={sheetProgramme.description ?? undefined}
          items={[
            { key: 'primary', label: sheetLabel, run: sheetRun },
            { key: 'info', label: tt('programmeSheetInfo'), run: () => setInfoOpen(true) },
          ]}
          onClose={() => setSheetProgramme(null)}
          pushLayer={nav.pushLayer}
        />
      ) : null}

      {infoOpen ? (
        <MobileSheet
          testId="channel-info-sheet"
          title={channel.name}
          art={<MobileLogo channel={channel} width={56} height={38} />}
          body={infoSheetBody}
          items={infoSheetItems}
          onClose={() => setInfoOpen(false)}
          pushLayer={nav.pushLayer}
        />
      ) : null}

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
