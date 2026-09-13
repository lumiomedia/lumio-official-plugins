'use client'

import { useEffect, useMemo, useState } from 'react'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { flattenChannels, qualityFromName, topGroups } from '../live-tv-model'
import { formatClock, progressOf } from '../live-tv-ui'
import { isReminded, toggleReminder } from '../reminders'
import type { EpgProgramme } from '../epg/types'
import type { TvViewProps } from './tv-shell'
import { Progress, Tag, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { ChannelCell, FAVS_GROUP, useDebouncedChannel } from './tv-guide-shared'
import { TvPreview } from './tv-preview'

type Selection = { listId: string | null; group: string | null }

/**
 * Rader per sida i mittenkolumnen, samma steg som `tv-guide.tsx`.
 *
 * Kolumnen ritade tidigare HELA listan: en IPTV-spellista med tiotusentals
 * kanaler byggde lika många rader — var och en med ett `model.nowFor`-uppslag
 * och en `ChannelCell` — i ett enda pass, vilket låser en TV-box i sekunder
 * vid varje listbyte.
 */
const ROW_STEP = 40

export function TvGuidePlaylists({ model, nav, settings }: TvViewProps) {
  const { tt, locale } = useTvText()
  const clock = useTvClockNode(locale)
  const [sel, setSel] = useState<Selection>({ listId: model.lists[0]?.id ?? null, group: null })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [, bump] = useState(0)

  const tree = useMemo(() => model.lists.map((list) => {
    const channels = flattenChannels([list])
    return { id: list.id, name: list.name, count: channels.length, channels, groups: topGroups(channels, 12).map((g) => ({ name: g, count: channels.filter((c) => c.group === g).length })) }
  }), [model.lists])

  const rows: M3uChannel[] = useMemo(() => {
    if (sel.listId === FAVS_GROUP) return model.favouriteChannels
    const list = tree.find((l) => l.id === sel.listId)
    if (!list) return []
    return sel.group ? list.channels.filter((c) => c.group === sel.group) : list.channels
  }, [sel, tree, model.favouriteChannels])

  const [visible, setVisible] = useState(ROW_STEP)
  useEffect(() => { setVisible(ROW_STEP) }, [sel])
  const shownRows = useMemo(() => rows.slice(0, visible), [rows, visible])

  const selected = useMemo(() => (selectedKey ? rows.find((c) => channelKey(c) === selectedKey) ?? null : null) ?? rows[0] ?? null, [selectedKey, rows])
  const previewChannel = useDebouncedChannel(selected, 300)
  const info = selected ? model.nowFor(selected) : { now: null, next: null, later: null }
  const title = sel.listId === FAVS_GROUP ? tt('favourites') : sel.group ?? tree.find((l) => l.id === sel.listId)?.name ?? ''

  const remind = (programme: EpgProgramme) => {
    if (!selected) return
    toggleReminder(selected, programme, model.nowMs)
    bump((n) => n + 1)
  }

  const card = (label: string, programme: EpgProgramme | null, kind: 'now' | 'next' | 'later') => {
    if (!programme) return null
    const isNow = kind === 'now'
    const reminded = !isNow && selected ? isReminded(selected, programme) : false
    return (
      <div
        data-testid={`pl-${kind}-card`}
        {...station(() => (isNow ? selected && nav.play({ channel: selected }) : remind(programme)))}
        style={{ padding: `${dp(14)}px ${dp(18)}px`, borderRadius: dp(14), background: isNow ? TV.accMix(14) : TV.s06, border: `1px solid ${isNow ? TV.accMix(45) : TV.line}`, display: 'flex', flexDirection: 'column', gap: dp(6), cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: dp(14), letterSpacing: '0.1em', textTransform: 'uppercase', color: isNow ? TV.accText : 'rgba(243,244,248,0.5)' }}>
          <span>{label}</span><span style={{ fontSize: dp(15), letterSpacing: 0, textTransform: 'none' }}>{isNow ? `${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}` : formatClock(programme.start, locale)}</span>
        </div>
        <div style={{ fontSize: isNow ? dp(24) : dp(20), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{programme.title}</div>
        {isNow ? <Progress value={progressOf(programme.start, programme.stop, model.nowMs)} height={dp(4)} /> : null}
        <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{isNow ? tt('okWatch') : reminded ? tt('reminderSet') : tt('okRemind')}</div>
      </div>
    )
  }

  // Precis en data-init per monterad vy: normalt första kanalraden, men utan
  // rader (tom lista/grupp) faller det tillbaka på första vänsterpostens.
  const noRows = rows.length === 0

  const colItem = (key: string, active: boolean, label: string, count: number, indent: boolean, onOk: () => void, testId: string, extra?: Record<string, string>) => (
    <div key={key} data-testid={testId} {...station(onOk, undefined, { 'data-live-tv-col': 'left', ...(extra ?? {}) })} style={{ height: indent ? dp(48) : dp(56), marginLeft: indent ? dp(28) : 0, padding: `0 ${dp(16)}px`, borderRadius: dp(12), display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? (indent ? TV.accMix(18) : TV.s12) : 'transparent', color: active ? TV.text : indent ? 'rgba(243,244,248,0.6)' : TV.text, fontSize: indent ? dp(18) : dp(19), fontWeight: indent ? 400 : 600, cursor: 'pointer' }}>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.45)' }}>{count}</span>
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      {/* Vänster: spellistor + grupper */}
      <div data-testid="playlists-column" data-scroll="" style={{ width: dp(330), flexShrink: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(30)}px ${dp(16)}px 0 ${dp(20)}px`, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: dp(2) }}>
        {tree.map((list, listIndex) => [
          colItem(list.id, sel.listId === list.id && !sel.group, list.name, list.count, false, () => { setSel({ listId: list.id, group: null }); setSelectedKey(null) }, `pl-list-${list.id}`, noRows && listIndex === 0 ? { 'data-init': '' } : undefined),
          ...list.groups.map((g) => colItem(`${list.id}:${g.name}`, sel.listId === list.id && sel.group === g.name, g.name, g.count, true, () => { setSel({ listId: list.id, group: g.name }); setSelectedKey(null) }, `pl-group-${list.id}-${g.name}`)),
        ])}
        {colItem('__favs', sel.listId === FAVS_GROUP, tt('favourites'), model.favouriteChannels.length, false, () => { setSel({ listId: FAVS_GROUP, group: null }); setSelectedKey(null) }, 'pl-list-favs', noRows && tree.length === 0 ? { 'data-init': '' } : undefined)}
        <div style={{ marginTop: 'auto', padding: `${dp(20)}px 0`, fontSize: dp(15), color: TV.faint }}>{tt('helpPlaylists')}</div>
      </div>

      {/* Mitten: kanaler */}
      <div data-scroll="" style={{ flex: 1, minWidth: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(30)}px 0 0 ${dp(24)}px`, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(12), marginBottom: dp(16) }}>
          <span style={{ fontSize: dp(26), fontWeight: 600 }}>{title}</span>
          <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{tt('channelsCount', { count: rows.length })} · {clock}</span>
        </div>
        {shownRows.map((channel, index) => {
          const key = channelKey(channel)
          const rowInfo = model.nowFor(channel)
          const focused = selected ? channelKey(selected) === key : false
          return (
            <div
              key={key}
              data-testid="pl-row"
              {...station(() => nav.play({ channel }), (el) => nav.channelMenu(channel, el), { ...(index === 0 ? { 'data-init': '' } : {}), 'data-f-left': '[data-live-tv-col="left"]', 'data-f-right': '[data-testid="pl-now-card"], [data-testid="pl-preview"]' })}
              onFocus={() => setSelectedKey(key)}
              style={{ height: dp(82), marginRight: dp(24), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(14)}px`, background: focused ? TV.s10 : 'transparent', cursor: 'pointer' }}
            >
              <ChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} quality={null} focused={false} width={dp(560)} />
              <div style={{ minWidth: 0, flex: 1, fontSize: dp(17), color: 'rgba(243,244,248,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rowInfo.now?.title ?? tt('noProgramme')}</div>
              <div style={{ width: dp(110), flexShrink: 0 }}>
                {rowInfo.now ? <><div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.5)', textAlign: 'right' }}>{tt('minutesLeft', { min: Math.max(0, Math.round((rowInfo.now.stop - model.nowMs) / 60_000)) })}</div><Progress value={progressOf(rowInfo.now.start, rowInfo.now.stop, model.nowMs)} height={dp(4)} /></> : null}
              </div>
            </div>
          )
        })}
        {rows.length > visible ? (
          <div {...station(() => setVisible((v) => v + ROW_STEP))} style={{ margin: `${dp(20)}px auto ${dp(20)}px`, width: 'fit-content', height: dp(48), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.s10, display: 'flex', alignItems: 'center', fontSize: dp(18), cursor: 'pointer' }}>{tt('showMore')}</div>
        ) : null}
        {rows.length === 0 ? <div style={{ padding: dp(24), color: TV.dim, fontSize: dp(19) }}>{tt('guideEmpty')}</div> : null}
      </div>

      {/* Höger: förhandsvisning + Nu/Sen/Senare */}
      <div data-testid="pl-detail" style={{ width: dp(560), flexShrink: 0, padding: `${dp(30)}px ${dp(48)}px 0 ${dp(28)}px`, display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <TvPreview channel={previewChannel} enabled={settings.previewEnabled} live={Boolean(info.now)} width="100%" height={dp(272)} label={settings.previewEnabled ? tt('previewLabel') : tt('previewFrame')} onOk={() => selected && nav.play({ channel: selected })} extra={{ 'data-testid': 'pl-preview' }} />
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(16), color: 'rgba(243,244,248,0.55)' }}>
            <span style={{ color: TV.accText, fontWeight: 600 }}>{model.channelNumber(selected) ?? ''}</span><span>{selected.name}</span>{qualityFromName(selected.name) ? <Tag variant="quality">{qualityFromName(selected.name)}</Tag> : null}
          </div>
        ) : null}
        {card(tt('colNow'), info.now, 'now')}
        {card(tt('colNext'), info.next, 'next')}
        {card(tt('colLater'), info.later, 'later')}
      </div>
    </div>
  )
}
