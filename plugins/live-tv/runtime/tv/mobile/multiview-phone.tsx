'use client'

import { useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../../live-tv-data'
import type { TvViewProps } from '../tv-shell'
import { ChannelArt, station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { assignTile, removeTile, setMultiviewState, useMultiviewState, type MultiviewState } from '../tv-multiview-store'
import { narrowVisibleIndices } from '../multiview-slots'
import { useVideoSurface, videoSurfaceCapabilities } from '../video-surface'
import { filterByGroup, useGuideGroups } from '../tv-guide-shared'
import { MT, ellipsis } from './mobile-tokens'
import { MIcons } from './mobile-icons'
import { MobileHeader } from './mobile-header'
import { MobileSheet } from './mobile-sheet'
import { MobileChips } from './mobile-chips'
import { MobileChannelRow } from './mobile-channel-row'

/** Kanalarkets lista skärs av här — samma tak som skrivbordets kanalväljare. */
const MAX_PICKER_ROWS = 200

/**
 * Multivy på telefon (fas 3, Task 11, handoffen §8). Bara TVÅ rutor visas
 * någonsin — `narrowVisibleIndices` (delad med skrivbordsgrenens smala läge,
 * se `multiview-slots.ts`) väljer alltid ljudrutan plus en till, oavsett
 * hur många rutor det sparade laget (`layout` 2/3/4) faktiskt rymmer.
 * Lägesväxeln (2/1+2/4) finns inte här: telefonen byter aldrig layout,
 * bara VILKA två kanaler som visas (Swap) och vilken som har ljud.
 *
 * `Tile` i `tv-multiview.tsx` återanvänds INTE (TV-mått, dp()) — `PhoneTile`
 * nedan är telefonens egen, i äkta px, men lånar samma tre ytmontesteg
 * (`useVideoSurface`, `showsVideo`, `ChannelArt`-fallback) som skrivbordets.
 */
export function TvMultiviewPhone({ model, nav }: TvViewProps) {
  const { tt, locale } = useTvText()
  const state = useMultiviewState()
  const groups = useGuideGroups(model, tt)
  const [pickerTile, setPickerTile] = useState<number | null>(null)
  const [group, setGroup] = useState<string | null>(null)
  const caps = videoSurfaceCapabilities()
  const update = (next: MultiviewState) => setMultiviewState(next)

  const channelFor = (key: string | null): M3uChannel | null =>
    key ? model.byKey.get(key) ?? model.allChannels.find((c) => channelKey(c) === key) ?? null : null

  const [a, b] = narrowVisibleIndices(state)
  const visible = [a, b]
  const audioChannel = channelFor(state.tiles[state.audioIndex])

  const openPicker = (index: number) => {
    setGroup(null)
    setPickerTile(index)
  }

  /**
   * Byt plats: bara de TVÅ synliga rutorna byter kanal — `audioIndex`
   * följer sin kanal (den pekar på `a` eller `b`, se `narrowVisibleIndices`,
   * så bytet slår om den till den andra platsen).
   */
  const swap = () => {
    const tiles = [...state.tiles]
    ;[tiles[a], tiles[b]] = [tiles[b], tiles[a]]
    let audioIndex = state.audioIndex
    if (audioIndex === a) audioIndex = b
    else if (audioIndex === b) audioIndex = a
    update({ ...state, tiles, audioIndex })
  }

  const liveBudget = Math.max(0, caps.maxLive - 1)
  let liveLeft = liveBudget

  const noProgrammeLabel = model.epgLoading ? tt('loadingGuide') : tt('noProgramme')
  const pickerRows = pickerTile !== null ? filterByGroup(model, group).slice(0, MAX_PICKER_ROWS) : []

  return (
    <div data-testid="multiview-phone" data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ margin: `0 -${MT.PAD}px` }}>
        <MobileHeader
          title={tt('multiview')}
          right={
            <div data-testid="mv-swap" {...station(swap)} style={{ height: 36, padding: '0 16px', borderRadius: 999, background: MT.s10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {tt('swap')}
            </div>
          }
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13 }}>
        <span style={{ color: MT.dim }}>{tt('audioLabel')}</span>
        {audioChannel ? <span style={{ fontWeight: 600, ...ellipsis }}>{audioChannel.name}</span> : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map((realIndex) => {
          const key = state.tiles[realIndex]
          const channel = channelFor(key)
          const hasAudio = realIndex === state.audioIndex && channel !== null
          const live = hasAudio || (channel !== null && liveLeft-- > 0)
          return (
            <PhoneTile
              key={`${realIndex}:${key ?? 'empty'}`}
              channel={channel}
              hasAudio={hasAudio}
              live={live}
              nowTitle={channel ? model.nowFor(channel).now?.title ?? null : null}
              number={channel ? model.channelNumber(channel) : null}
              onTap={() => {
                if (!channel) { openPicker(realIndex); return }
                update({ ...state, audioIndex: realIndex })
              }}
              onHold={(el) => {
                if (!channel) { openPicker(realIndex); return }
                nav.openMenu({
                  title: channel.name,
                  element: el,
                  actions: [
                    { key: 'audio', label: tt('menuAudioHere'), run: () => update({ ...state, audioIndex: realIndex }) },
                    { key: 'switch', label: tt('menuSwitchChannel'), run: () => openPicker(realIndex) },
                    { key: 'full', label: tt('menuFullscreen'), run: () => nav.play({ channel }) },
                    { key: 'remove', label: tt('menuRemoveTile'), run: () => update(removeTile(state, realIndex)) },
                  ],
                })
              }}
            />
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div data-testid="mv-change-channel" {...station(() => openPicker(state.audioIndex))} style={{ height: 46, borderRadius: 12, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {tt('changeChannel')}
        </div>
        <div data-testid="mv-fullscreen" {...station(() => { if (audioChannel) nav.play({ channel: audioChannel }) })} style={{ height: 46, borderRadius: 12, background: MT.s08, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {tt('menuFullscreen')}
        </div>
      </div>

      {pickerTile !== null ? (
        <MobileSheet
          testId="mv-picker-sheet"
          title={tt('selectChannel')}
          body={
            <>
              <MobileChips items={groups} value={group} onChange={setGroup} testId="mv-picker-groups" />
              <div>
                {pickerRows.map((channel) => {
                  const key = channelKey(channel)
                  return (
                    <MobileChannelRow
                      key={key}
                      testId="mv-picker-row"
                      channel={channel}
                      number={model.channelNumber(channel)}
                      now={model.nowFor(channel)}
                      nowMs={model.nowMs}
                      locale={locale}
                      variant="sheet"
                      noProgrammeLabel={noProgrammeLabel}
                      onPress={() => {
                        if (pickerTile === null) return
                        update(assignTile(state, pickerTile, key))
                        setPickerTile(null)
                      }}
                    />
                  )
                })}
              </div>
            </>
          }
          items={[]}
          onClose={() => setPickerTile(null)}
          pushLayer={nav.pushLayer}
        />
      ) : null}
    </div>
  )
}

function PhoneTile({ channel, hasAudio, live, nowTitle, number, onTap, onHold }: {
  channel: M3uChannel | null; hasAudio: boolean; live: boolean; nowTitle: string | null; number: number | null
  onTap: () => void; onHold: (el: HTMLElement) => void
}) {
  const { tt } = useTvText()
  const ref = useRef<HTMLDivElement | null>(null)
  const surface = useVideoSurface(ref, channel && live ? { channel, url: channel.url } : null, { muted: !hasAudio, audio: hasAudio, enabled: live })
  const showsVideo = live && surface.live && !surface.failed
  return (
    <div
      ref={ref}
      data-testid="mv-tile"
      {...station(onTap, onHold)}
      style={{ position: 'relative', height: 220, borderRadius: 16, border: `1px solid ${hasAudio ? MT.accMix(55) : MT.line10}`, overflow: 'hidden', background: showsVideo ? 'transparent' : '#05070d', cursor: 'pointer' }}
    >
      {channel && !showsVideo ? <ChannelArt channel={channel} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /> : null}
      {channel ? (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '32px 14px 12px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))', display: 'flex', alignItems: 'baseline', gap: 8, overflow: 'hidden' }}>
            <span style={{ fontSize: 13, color: MT.dim, flexShrink: 0 }}>{number ?? ''}</span>
            <span style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, ...ellipsis }}>{channel.name}</span>
            {nowTitle ? <span style={{ fontSize: 13, color: MT.muted, flexShrink: 0, maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {nowTitle}</span> : null}
          </div>
          {hasAudio ? (
            <span style={{ position: 'absolute', top: 8, right: 8, height: 24, padding: '0 8px', borderRadius: 999, background: MT.acc, color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>{tt('audioLabel')}</span>
          ) : (
            <span style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <MIcons.SpeakerSlash size={18} />
            </span>
          )}
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff' }}>
          <MIcons.Plus size={32} />
          <span style={{ fontSize: 15 }}>{tt('selectChannel')}</span>
        </div>
      )}
    </div>
  )
}
