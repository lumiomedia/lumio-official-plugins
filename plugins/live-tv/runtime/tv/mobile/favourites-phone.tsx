'use client'

import { useState } from 'react'
import { channelKey, setPinnedLiveTvKeys } from '../../live-tv-data'
import { progressOf } from '../../live-tv-ui'
import type { TvViewProps } from '../tv-shell'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { MT, ellipsis } from './mobile-tokens'
import { MIcons } from './mobile-icons'
import { MobileHeader } from './mobile-header'
import { MobileLogo } from './mobile-logo'
import { reorder, useDragReorder } from './use-drag-reorder'

/** Radhöjden dra-hooken räknar mål-index ifrån (samma som `minHeight` nedan). */
const ROW_HEIGHT = 74

/**
 * Favoriter på telefon (fas 3, Task 9, handoffen §6). Skrivbordets
 * 3-kolumnsrutnät ersätts av en lista — ordningen ÄR kanalnumren, så den
 * måste både gå att läsa av och att flytta med fingret. Ingen egen
 * datahook: allt kommer av `model` (samma `pinnedKeys`/`favouriteChannels`
 * som skrivbordsgrenen), och den här filen importerar medvetet INGET från
 * `tv-favourites.tsx` (projektregeln mot importcykler mellan de två).
 */
export function TvFavouritesPhone({ model, nav }: TvViewProps) {
  const { tt } = useTvText()
  const [editing, setEditing] = useState(false)
  const favourites = model.favouriteChannels

  const { dragging, offsetY, handleProps } = useDragReorder({
    count: favourites.length,
    rowHeight: ROW_HEIGHT,
    onCommit: (from, to) => setPinnedLiveTvKeys(reorder(model.pinnedKeys, from, to)),
  })

  const pill = (
    <div
      data-testid="fav-edit-pill"
      {...station(() => setEditing((v) => !v))}
      style={{ minHeight: 36, padding: '0 14px', borderRadius: 999, background: MT.s12, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
    >
      {editing ? tt('done') : tt('edit')}
    </div>
  )

  return (
    <div data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={tt('favourites')} right={pill} /></div>
      <div style={{ fontSize: 13, color: MT.dim, marginBottom: 10 }}>{tt('channelsCount', { count: favourites.length })}</div>

      {favourites.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: MT.dim, fontSize: 15 }}>{tt('favouritesEmptyPhone')}</div>
      ) : (
        favourites.map((channel, index) => {
          const key = channelKey(channel)
          const info = model.nowFor(channel)
          const minutes = info.now ? Math.max(0, Math.round((info.now.stop - model.nowMs) / 60_000)) : 0
          const isDragging = dragging === index
          return (
            <div
              key={key}
              data-testid="fav-row"
              {...(editing ? {} : station(() => nav.play({ channel }), (el) => nav.channelMenu(channel, el)))}
              style={{
                minHeight: ROW_HEIGHT, borderRadius: 14, background: MT.s07, border: `1px solid ${MT.line08}`,
                padding: '0 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
                cursor: editing ? 'default' : 'pointer',
                transform: isDragging ? `translateY(${offsetY}px)` : undefined,
                zIndex: isDragging ? 2 : undefined,
                boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.4)' : undefined,
                position: 'relative',
              }}
            >
              <span style={{ flexShrink: 0, fontSize: 18, fontWeight: 600, color: MT.dim }}>{index + 1}</span>
              <MobileLogo channel={channel} width={64} height={42} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{channel.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(243,244,248,0.8)', ...ellipsis }}>{info.now?.title ?? tt('noProgramme')}</div>
                {info.now ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 3, background: MT.s14, overflow: 'hidden' }}>
                      <div style={{ width: `${progressOf(info.now.start, info.now.stop, model.nowMs) * 100}%`, height: '100%', background: MT.acc }} />
                    </div>
                    <span style={{ fontSize: 11, color: MT.dim, flexShrink: 0 }}>{tt('minutesShort', { min: minutes })}</span>
                  </div>
                ) : null}
              </div>
              {editing ? (
                <div
                  data-testid="fav-handle"
                  {...handleProps(index)}
                  style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MT.faint, touchAction: 'none', cursor: 'grab' }}
                >
                  <MIcons.ListHandle size={20} />
                </div>
              ) : null}
            </div>
          )
        })
      )}

      <div
        data-testid="fav-add"
        {...station(() => nav.go('guide', { group: 'all' }))}
        style={{ minHeight: 48, borderRadius: 999, border: `1px solid ${MT.line14}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
      >
        {tt('addFromGuide')}
      </div>
    </div>
  )
}
