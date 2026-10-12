'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import { useTvMode } from '@/lib/plugin-sdk'
import { ChannelArt, Chip, TV, belowTitleBar, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { MORE_GROUPS, filterByGroup, useGuideGroups } from './tv-guide-shared'
import { groupCounts } from './group-chips'
import { TvGroupPanel } from './tv-group-picker'

/** Sports radkort (samma som matchinfons rader), ritat utan att importera ur sport/. */
/**
 * Sports chip (samma som Tabeller & resultat): ovald tät pill med vit text,
 * vald fylld ljus pill med mörk text. `big` = TV-minimimåtten (22/56).
 */
function sportChip(on: boolean, big: boolean): CSSProperties {
  return {
    height: dp(big ? 56 : 46), minHeight: dp(big ? 56 : 46), padding: `0 ${dp(big ? 24 : 20)}px`, fontSize: dp(big ? 22 : 18), fontWeight: on ? 700 : 600, boxSizing: 'border-box',
    ...(on ? { background: TV.text, color: '#12152a', border: `1px solid ${TV.text}` } : { background: 'var(--sport-card-bg, rgba(252,252,255,0.12))', color: TV.text, border: `1px solid ${TV.lineCard}` }),
  }
}

const SPORT_ROW: CSSProperties = { background: 'var(--sport-card-bg, rgba(252,252,255,0.07))', border: `1px solid ${TV.lineCard}`, boxSizing: 'border-box' }

/**
 * `sport`: Sports utseende (Jerry 2026-10-12) — raderna som Sports radkort,
 * rubriken som matchlådans, sekundärtexten i muted, och lagret alltid
 * ovanför matchlådan. Ytan (`surface`) skickar Sport som sin täta lådyta.
 */
export function TvChannelPicker({ model, nav, title, onPick, onClose, surface, sport = false }: { model: LiveTvModel; nav: TvNav; title: string; onPick: (channel: M3uChannel) => void; onClose: () => void; surface?: CSSProperties; sport?: boolean }) {
  const { tt } = useTvText()
  // Sport på TV: TV-minimimåtten (chip 22/56, rad 24/20) — Jerry 2026-10-12.
  const tvMode = useTvMode()
  const big = sport && tvMode
  const [group, setGroup] = useState<string | null>(null)
  const groups = useGuideGroups(model, tt, group)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const counts = useMemo(() => (groupsOpen ? groupCounts(model.channels) : undefined), [groupsOpen, model.channels])
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
    <div ref={rootRef} data-testid="channel-picker" data-variant={sport ? 'sport' : undefined} data-panel-root="" data-live-tv-layer="" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(big ? 820 : 640)}px, 100%)`, zIndex: sport ? 61 : 60, background: TV.panel, borderLeft: `1px solid ${TV.line}`, padding: `${belowTitleBar(dp(34))} ${dp(32)}px ${dp(34)}px`, display: 'flex', flexDirection: 'column', gap: dp(18), boxSizing: 'border-box', ...surface }}>
      <div style={{ fontSize: dp(big ? 34 : sport ? 30 : 28), fontWeight: sport ? 700 : 600 }}>{title}</div>
      <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto' }}>
        {groups.map((chip) => {
          const on = group === chip.key
          return <Chip key={chip.id} active={on} data-chip-on={sport && on ? '1' : '0'} {...station(() => (chip.key === MORE_GROUPS ? setGroupsOpen(true) : setGroup(chip.key)))} style={sport ? sportChip(on, big) : { height: dp(40), minHeight: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>
        })}
      </div>
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...(sport ? { display: 'flex', flexDirection: 'column', gap: dp(10), padding: dp(4) } : null) }}>
        {rows.map((channel, index) => {
          const info = model.nowFor(channel)
          return (
            <div key={channelKey(channel)} data-testid={`picker-row-${channel.name}`} {...station(() => { onPick(channel); onCloseRef.current(); window.setTimeout(() => openerRef.current?.focus({ preventScroll: true }), 0) }, undefined, index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(big ? 92 : 74), minHeight: dp(big ? 92 : 74), borderRadius: dp(sport ? 14 : 12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer', flexShrink: 0, ...(sport ? SPORT_ROW : null) }}>
              <span style={{ width: dp(big ? 48 : 40), fontSize: dp(big ? 20 : 16), color: sport ? TV.muted : 'rgba(243,244,248,0.5)', textAlign: 'right' }}>{model.channelNumber(channel) ?? ''}</span>
              <ChannelArt channel={channel} style={{ width: dp(big ? 90 : 70), height: dp(big ? 58 : 46), flexShrink: 0 }} radius={dp(8)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: dp(big ? 24 : 19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
                <div style={{ fontSize: dp(big ? 20 : 15), color: sport ? TV.muted : 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.now?.title ?? channel.group}</div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Grupplistan ovanpå väljaren (samma panelmönster, senare i DOM:en = överst). */}
      {groupsOpen ? <TvGroupPanel nav={nav} groups={model.groups} counts={counts} value={group} onPick={setGroup} onClose={() => setGroupsOpen(false)} /> : null}
    </div>
  )
}
