'use client'

import type { CSSProperties, JSX } from 'react'
import { formatClock, progressOf } from '../live-tv-ui'
import { ChannelArt, Icons, Progress, TV, Tag, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { gp } from './guide-view-shared'
import type { GuideSelection } from './guide-types'

/** Panelens bredd (handoffen §1 "Detaljpanel (320 px, permanent)"). */
export const DETAIL_PANEL_WIDTH_PX = gp(320)

/**
 * Grids permanenta detaljpanel (handoffen §1 "Detaljpanel", spec §4). Ritas
 * ALLTID — utan markering med en tomtext — och har ingen toggle: Timeline
 * täcker behovet av full radbredd. Ersätter den gamla `grid-detail`-bannern
 * som låg över de sista raderna.
 *
 * Måtten är handoffens designpixlar rakt av (skrivbord/TV, ingen `dp`-
 * skalning): bildruta 180, titel 20/600 två rader, Titta nu 40, Påminn mig /
 * Favorit 38. Knapparna är `station()` så fjärren når dem, och panelen
 * saknar `data-init` — startstationen bor i rutnätet.
 */
export function GuideDetailPanel({ selection, nowMs, locale, channelNumber, onWatch, onRemind, onToggleFavourite, favourite, reminded }: {
  selection: GuideSelection | null
  nowMs: number
  locale: string
  channelNumber: number | null
  onWatch: () => void
  onRemind: () => void
  onToggleFavourite: () => void
  favourite: boolean
  reminded: boolean
}): JSX.Element {
  const { tt } = useTvText()
  const frame: CSSProperties = {
    flex: `0 0 ${DETAIL_PANEL_WIDTH_PX}px`,
    width: DETAIL_PANEL_WIDTH_PX,
    minWidth: 0,
    boxSizing: 'border-box',
    borderLeft: `1px solid ${TV.line}`,
    padding: gp(20),
    display: 'flex',
    flexDirection: 'column',
    gap: gp(14),
    overflow: 'auto',
  }
  if (!selection) {
    return (
      <div data-testid="guide-detail-panel" style={frame}>
        <div style={{ fontSize: gp(13), color: TV.faint, lineHeight: 1.5 }}>{tt('detailEmpty')}</div>
      </div>
    )
  }
  const { channel, programme } = selection
  const live = programme !== null && programme.start <= nowMs && programme.stop > nowMs
  const future = programme !== null && programme.start > nowMs
  const minutesLeft = programme ? Math.max(0, Math.ceil((programme.stop - nowMs) / 60_000)) : 0
  const timeLine = programme
    ? `${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}${live ? ` · ${tt('minutesLeft', { min: minutesLeft })}` : ''}`
    : ''
  const secondary: CSSProperties = { height: gp(38), flex: 1, minWidth: 0, borderRadius: gp(10), background: TV.s08, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: gp(8), fontSize: gp(13), cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  return (
    <div data-testid="guide-detail-panel" style={frame}>
      <ChannelArt channel={channel} height={gp(180)} radius={gp(12)} style={{ width: '100%' }}>
        {live ? (
          <span style={{ position: 'absolute', left: gp(12), bottom: gp(12) }}>
            <Tag variant="live" style={{ height: gp(24), padding: `0 ${gp(10)}px`, fontSize: gp(11) }}>{tt('live')}</Tag>
          </span>
        ) : null}
      </ChannelArt>
      <div data-testid="detail-channel" style={{ fontSize: gp(12), color: 'rgba(243,244,248,0.45)', letterSpacing: '0.12em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {[channelNumber, channel.name].filter((part) => part !== null && part !== '').join(' · ')}
      </div>
      <div data-testid="detail-title" style={{ fontSize: gp(20), fontWeight: 600, lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {programme ? programme.title : tt('noProgramme')}
      </div>
      {programme ? <div data-testid="detail-time" style={{ fontSize: gp(13), color: 'rgba(243,244,248,0.6)' }}>{timeLine}</div> : null}
      {live && programme ? <Progress value={progressOf(programme.start, programme.stop, nowMs)} height={gp(4)} /> : null}
      {/* `data-selectable-text` är undantaget från `user-select: none` —
          beskrivningar är text man vill kunna markera. Noden ritas alltid
          när ett program finns, så undantaget finns även utan beskrivning. */}
      {programme ? (
        <div data-testid="detail-description" data-selectable-text="" style={{ fontSize: gp(13), color: TV.muted, lineHeight: 1.5 }}>
          {programme.description ?? ''}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: gp(8), marginTop: 'auto' }}>
        <div
          data-testid="detail-watch"
          /* ◀ tillbaka till rutnätet: panelen nås med ▶ från radens sista
             block, och utan vägen tillbaka blir den en återvändsgränd. */
          data-f-left="[data-guide-block][data-selected], [data-guide-block]"
          {...station(onWatch)}
          style={{ height: gp(40), borderRadius: gp(10), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: gp(8), fontSize: gp(14), fontWeight: 600, cursor: 'pointer' }}
        >
          <Icons.Play size={gp(14)} /> {tt('watchNowShort')}
        </div>
        <div style={{ display: 'flex', gap: gp(8) }}>
          {future ? (
            <div data-testid="detail-remind" data-f-left="[data-guide-block][data-selected], [data-guide-block]" {...station(onRemind)} style={{ ...secondary, color: reminded ? TV.accText : TV.text }} {...(reminded ? { 'data-active': '' } : {})}>
              <Icons.Bell size={gp(14)} filled={reminded} /> {reminded ? tt('reminderSet') : tt('remindMe')}
            </div>
          ) : null}
          <div data-testid="detail-favourite" data-f-left="[data-guide-block][data-selected], [data-guide-block]" {...station(onToggleFavourite)} style={{ ...secondary, color: favourite ? TV.accText : TV.text }} {...(favourite ? { 'data-active': '' } : {})}>
            <Icons.Heart size={gp(14)} filled={favourite} /> {tt('favouriteShort')}
          </div>
        </div>
      </div>
    </div>
  )
}
