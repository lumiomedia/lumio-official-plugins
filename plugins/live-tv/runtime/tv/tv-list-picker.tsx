'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { channelKey, type M3uChannel, type XtreamCategory } from '../live-tv-data'
import type { LiveTvModel } from '../live-tv-model'
import type { TvNav } from './tv-shell'
import { ChannelArt, Chip, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'
import { filterByGroup, useGuideGroups } from './tv-guide-shared'
import { gp } from './guide-view-shared'

/**
 * FLERVALSVÄLJAREN — `tv-channel-picker.tsx` med bock i stället för "välj och
 * stäng". Samma panelmönster: högerpanel, `data-panel-root` (motorns pilar
 * stannar i den), kategorichips i `data-row`, rader i `data-scroll`, öppnaren
 * fångad EN gång och `nav.pushLayer(close)` som enda Back-väg.
 *
 * Skillnaden mot enkelvalet är avsiktlig: man bockar i tio kanaler i rad, så
 * panelen får INTE stänga sig på varje OK.
 */
function PickerPanel({
  nav,
  title,
  chips,
  rows,
  onClose,
  testId = 'list-picker',
}: {
  nav: TvNav
  title: string
  chips: ReactNode
  /**
   * Rader, eller en funktion som får panelens `close` — DEN stängning som
   * lagret registrerade (ropar `onClose` OCH lämnar tillbaka fokus till
   * öppnaren). Ett val i envalspanelen ska gå den vägen: ropar man `onClose`
   * själv rivs panelen med fokus kvar på en borttagen rad → body, och
   * fjärren står stilla tills man klickar med mus.
   */
  rows: ReactNode | ((close: () => void) => ReactNode)
  onClose: () => void
  testId?: string
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<(() => void) | null>(null)
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
    closeRef.current = close
    const off = navRef.current.pushLayer(close)
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true }), 0)
    return off
  }, [])

  return (
    <div
      ref={rootRef}
      data-testid={testId}
      data-panel-root=""
      data-live-tv-layer=""
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: `min(${dp(640)}px, 100%)`, zIndex: 60, background: TV.panel, borderLeft: `1px solid ${TV.line}`, padding: `${dp(34)}px ${dp(32)}px`, display: 'flex', flexDirection: 'column', gap: dp(18) }}
    >
      <div style={{ fontSize: dp(28), fontWeight: 600 }}>{title}</div>
      {chips}
      <div data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{typeof rows === 'function' ? rows(() => closeRef.current?.()) : rows}</div>
    </div>
  )
}

/** Bocken. Enda återkopplingen i flervalsläget — raden ligger kvar. */
function Check({ on, label }: { on: boolean; label: string }) {
  if (!on) return <span style={{ width: dp(28), flexShrink: 0 }} />
  return (
    <span data-testid={`picker-check-${label}`} style={{ width: dp(28), flexShrink: 0, color: TV.acc, fontSize: dp(22), textAlign: 'center' }}>✓</span>
  )
}

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
  const groups = useGuideGroups(model, tt)
  const [group, setGroup] = useState<string | null>(null)
  const rows = useMemo(() => filterByGroup(model, group).slice(0, 200), [model, group])
  return (
    <PickerPanel
      nav={nav}
      title={title}
      onClose={onClose}
      chips={(
        <div data-row="" style={{ display: 'flex', gap: dp(8), overflowX: 'auto' }}>
          {/* Tom kategori = inga rader att sätta `data-init` på. Då tar första
              chipet det, annars öppnades panelen utan någon station att
              landa på och fjärrkontrollen strandade på body. */}
          {groups.map((chip, index) => <Chip key={chip.id} active={group === chip.key} {...station(() => setGroup(chip.key), undefined, rows.length === 0 && index === 0 ? { 'data-init': '' } : undefined)} style={{ height: dp(40), minHeight: dp(40), fontSize: dp(16), padding: `0 ${dp(18)}px` }}>{chip.label}</Chip>)}
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
export function TvChoicePanel({ nav, title, options, value, onPick, onClose }: {
  nav: TvNav
  title: string
  options: ChoiceOption[]
  value: string | null
  onPick: (key: string | null) => void
  onClose: () => void
}) {
  const initIndex = Math.max(0, options.findIndex((option) => option.key === value))
  return (
    <PickerPanel
      nav={nav}
      title={title}
      onClose={onClose}
      chips={null}
      testId="choice-panel"
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
