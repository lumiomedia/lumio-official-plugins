'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { channelKey, type M3uChannel, type XtreamCategory } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import { ChannelArt, Chip, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { MORE_GROUPS, filterByGroup, useGuideGroups } from './tv-guide-shared'
import { groupCounts } from './group-chips'
import { TvGroupPanel } from './tv-group-picker'
import { gp } from './guide-view-shared'

// `PickerPanel` och `Check` bor i `picker-panel.tsx` (grupplistan i
// `tv-group-picker.tsx` använder dem också, och importeras härifrån — utan
// egen modul hade det blivit en importcykel).
import { Check, PickerPanel } from './picker-panel'

export { Check, PickerPanel }

export function TvListPicker({ model, nav, title, selected, onToggle, onClose }: {
  model: LiveTvModel
  nav: TvNav
  title: string
  /** Kanalnycklar (`channelKey`), inte namn — två listor kan ha samma namn. */
  selected: ReadonlySet<string>
  onToggle: (channel: M3uChannel) => void
  onClose: () => void
}) {
  const { tt } = useTvText()
  const [group, setGroup] = useState<string | null>(null)
  const groups = useGuideGroups(model, tt, group)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const counts = useMemo(() => (groupsOpen ? groupCounts(model.channels) : undefined), [groupsOpen, model.channels])
  const rows = useMemo(() => filterByGroup(model, group).slice(0, 200), [model, group])
  return (
    <>
    <PickerPanel
      nav={nav}
      title={title}
      onClose={onClose}
      chips={(
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto' }}>
          {/* Tom kategori = inga rader att sätta `data-init` på. Då tar första
              chipet det, annars öppnades panelen utan någon station att
              landa på och fjärrkontrollen strandade på body. */}
          {groups.map((chip, index) => <Chip key={chip.id} active={group === chip.key} {...station(() => (chip.key === MORE_GROUPS ? setGroupsOpen(true) : setGroup(chip.key)), undefined, rows.length === 0 && index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(40), minHeight: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>)}
        </div>
      )}
      rows={rows.map((channel, index) => {
        const on = selected.has(channelKey(channel))
        return (
          <div
            key={channelKey(channel)}
            data-testid={`picker-row-${channel.name}`}
            {...station(() => onToggle(channel), undefined, index === 0 ? { 'data-init': '' } : undefined)}
            style={{ height: dp(74), minHeight: dp(74), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, cursor: 'pointer' }}
          >
            <Check on={on} label={channel.name} />
            <ChannelArt channel={channel} style={{ width: dp(70), height: dp(46), flexShrink: 0 }} radius={dp(8)} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: dp(19), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.name}</div>
              <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.group}</div>
            </div>
          </div>
        )
      })}
    />
    {/* Grupplistan ovanpå väljaren (samma panelmönster, senare i DOM:en = överst). */}
    {groupsOpen ? <TvGroupPanel nav={nav} groups={model.groups} counts={counts} value={group} onPick={setGroup} onClose={() => setGroupsOpen(false)} /> : null}
    </>
  )
}

/**
 * Samma panel för Xtream-kategorier: "Alla kategorier" överst (tom lista =
 * allt, precis som skrivbordets kort), sedan panelens egna kategorier.
 */
export function TvCategoryPicker({ nav, title, categories, selected, onToggle, onSelectAll, onClose }: {
  nav: TvNav
  title: string
  categories: XtreamCategory[] | null
  selected: ReadonlySet<string>
  onToggle: (category: XtreamCategory) => void
  onSelectAll: () => void
  onClose: () => void
}) {
  const { tt } = useTvText()
  const all = selected.size === 0
  return (
    <PickerPanel
      nav={nav}
      title={title}
      onClose={onClose}
      chips={null}
      rows={(
        <>
          <div
            data-testid="picker-row-all"
            {...station(onSelectAll, undefined, { 'data-init': '' })}
            style={{ height: dp(64), minHeight: dp(64), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, fontSize: dp(19), cursor: 'pointer' }}
          >
            <Check on={all} label="all" />
            {tt('xtreamAllCategories')}
          </div>
          {categories === null
            ? <div style={{ padding: dp(12), fontSize: dp(17), color: TV.dim }}>{tt('loadingChannels')}</div>
            : categories.map((category) => (
              <div
                key={category.id}
                data-testid={`picker-row-${category.name}`}
                {...station(() => onToggle(category))}
                style={{ height: dp(64), minHeight: dp(64), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(12)}px`, fontSize: dp(19), cursor: 'pointer' }}
              >
                <Check on={selected.has(category.id)} label={category.name} />
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category.name}</span>
              </div>
            ))}
        </>
      )}
    />
  )
}

/** Ett alternativ i envalspanelen. `null` = "Alla" (spellistor/kategorier). */
export interface ChoiceOption { key: string | null; label: string; count?: number }

/**
 * ENVALSPANELEN bakom kontrollradens käll- och kategoriväljare (spec §2).
 *
 * Samma panel som fler-/kategorivalet ovan — `data-panel-root`, lager via
 * `nav.pushLayer(close)` som enda Bakåt-väg, fokus tillbaka till öppnaren —
 * men ett val STÄNGER: man byter spellista eller kategori en gång, inte tio
 * i rad. Valet stänger via panelens EGEN `close` (samma som Bakåt), så
 * fokus landar hos öppnaren och inte på body. `data-init` ligger på det VALDA alternativet (annars första), så
 * fjärren landar där man står i stället för högst upp i en lång lista.
 * Rader 56 px och antal i 45 % enligt handoffen (§Ram och kontrollrad).
 */
export function TvChoicePanel({ nav, title, options, value, onPick, onClose, surface }: {
  nav: TvNav
  title: string
  options: ChoiceOption[]
  value: string | null
  onPick: (key: string | null) => void
  onClose: () => void
  surface?: CSSProperties
}) {
  const initIndex = Math.max(0, options.findIndex((option) => option.key === value))
  return (
    <PickerPanel
      nav={nav}
      title={title}
      onClose={onClose}
      chips={null}
      testId="choice-panel"
      surface={surface}
      rows={(close) => options.map((option, index) => {
        const on = option.key === value
        return (
          <div
            key={option.key ?? '__all'}
            data-testid={`choice-row-${option.label}`}
            {...station(() => { onPick(option.key); close() }, undefined, index === initIndex ? { 'data-init': '' } : undefined)}
            style={{ height: gp(56), minHeight: gp(56), borderRadius: gp(10), display: 'flex', alignItems: 'center', gap: gp(12), padding: `0 ${gp(12)}px`, cursor: 'pointer', background: on ? TV.s08 : 'transparent' }}
          >
            <Check on={on} label={option.label} />
            <span style={{ flex: 1, minWidth: 0, fontSize: gp(15), fontWeight: on ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{option.label}</span>
            {option.count !== undefined ? <span style={{ fontSize: gp(14), color: TV.faint, flexShrink: 0 }}>{option.count}</span> : null}
          </div>
        )
      })}
    />
  )
}
