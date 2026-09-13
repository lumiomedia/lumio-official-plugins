'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import { ChannelArt, Chip, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { filterByGroup, useGuideGroups } from './tv-guide-shared'

export function TvChannelPicker({ model, nav, title, onPick, onClose }: { model: LiveTvModel; nav: TvNav; title: string; onPick: (channel: M3uChannel) => void; onClose: () => void }) {
  const { tt } = useTvText()
  const groups = useGuideGroups(model, tt)
  const [group, setGroup] = useState<string | null>(null)
  const rows = useMemo(() => filterByGroup(model, group).slice(0, 200), [model, group])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  // Senaste `nav`/`onClose` i refar. Effekten nedan får BARA köra en gång per
  // öppning: `nav` bytte identitet vid varje omrender av skalet (minuttick,
  // lagringsändring), och då kördes effekten om — den läste om "vem öppnade
  // mig" från det fokus som råkade gälla just då (ett kort inne i väljaren)
  // och flyttade tillbaka fokus till [data-init]. Resultatet var att markören
  // hoppade hem varje minut och att Back landade i väljaren i stället för hos
  // den station som öppnade den.
  const navRef = useRef(nav)
  const onCloseRef = useRef(onClose)
  useEffect(() => { navRef.current = nav; onCloseRef.current = onClose })

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    const close = () => { onCloseRef.current(); window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0) }
    const off = navRef.current.pushLayer(close)
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [])

  return (
    <div ref={rootRef} data-testid="channel-picker" data-panel-root="" data-live-tv-layer="" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(640)}px, 100%)`, zIndex: 60, background: TV.panel, borderLeft: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(32)}px`, display: 'flex', flexDirection: 'column', gap: dp(18) }}>
      <div style={{ fontSize: dp(28), fontWeight: 600 }}>{title}</div>
      <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto' }}>
        {groups.map((chip) => <Chip key={chip.id} active={group === chip.key} {...station(() => setGroup(chip.key))} style={{ height: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>)}
      </div>
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {rows.map((channel, index) => {
          const info = model.nowFor(channel)
          return (
            <div key={channelKey(channel)} data-testid={`picker-row-${channel.name}`} {...station(() => { onPick(channel); onCloseRef.current(); window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0) }, undefined, index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(74), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}>
              <span style={{ width: dp(40), fontSize: dp(16), color: 'rgba(243,244,248,0.5)', textAlign: 'right' }}>{model.channelNumber(channel) ?? ''}</span>
              <ChannelArt channel={channel} style={{ width: dp(70), height: dp(46), flexShrink: 0 }} radius={dp(8)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? channel.group}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
