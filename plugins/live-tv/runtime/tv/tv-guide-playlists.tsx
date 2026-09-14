'use client'

import { useEffect, useMemo, useState } from 'react'
import { channelKey, computeGroups, type LiveTvList, type M3uChannel } from '../live-tv-data'
import { isPlayableChannel, qualityFromName } from '../live-tv-model'
import { useListChannels } from '../view-helpers'
import { formatClock, progressOf } from '../live-tv-ui'
import { isReminded, toggleReminder } from '../reminders'
import type { EpgProgramme } from '../epg/types'
import type { TvViewProps } from './tv-shell'
import { PHONE_HIT_MIN_DP, Progress, Segment, Tag, TV, dp, phoneHitFloor, phoneTextFloor, station, useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { ChannelCell, FAVS_GROUP, useDebouncedChannel } from './tv-guide-shared'
import type { GuideMode } from './tv-settings-store'
import { TvPreview } from './tv-preview'
import { usePhoneSurface } from '../hooks/usePhoneSurface'

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

export function TvGuidePlaylists({ model, nav, settings, mode, onModeChange }: TvViewProps & { mode: GuideMode; onModeChange: (mode: GuideMode) => void }) {
  const { tt, locale } = useTvText()
  const phone = usePhoneSurface()
  const clock = useTvClockNode(locale, phone)
  const [sel, setSel] = useState<Selection>({ listId: model.lists[0]?.id ?? null, group: null })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [, bump] = useState(0)

  /**
   * Vänsterkolumnen ritas ur listornas METADATA, inte ur deras kanaler.
   *
   * Efter lagring v2 bär listorna inga inbäddade kanaler — `flattenChannels`
   * gav tomma listor i skarp drift. Antal och grupper står numera i listans
   * kvitto (`channelCount`/`groups`, skrivna av importjobbet), så hela trädet
   * kan ritas utan att en enda kanal laddas. Manuellt skapade listor
   * (`custom`) har fortfarande sina kanaler hos sig och räknas direkt.
   */
  const tree = useMemo(() => model.lists.map((list) => ({
    id: list.id,
    name: list.name,
    count: list.kind === 'custom' ? (list.channels ?? []).length : list.channelCount ?? (list.channels?.length ?? 0),
    groups: (list.kind === 'custom' ? computeGroups(list.channels ?? []) : list.groups ?? []).slice(0, 12),
  })), [model.lists])

  /**
   * Kanalerna laddas bara för den VALDA listan (ur indexet, eller ur
   * minnescachen när modellen redan har källan laddad). Att ladda alla listor
   * på en gång hade betytt en hämtning per lista vid varje montering, för
   * rader som ändå bara syns en lista i taget.
   */
  const selectedLists = useMemo<LiveTvList[]>(() => {
    const list = model.lists.find((entry) => entry.id === sel.listId)
    return list ? [list] : []
  }, [model.lists, sel.listId])
  const { byListId, loading: channelsLoading } = useListChannels(selectedLists)

  const rows: M3uChannel[] = useMemo(() => {
    if (sel.listId === FAVS_GROUP) return model.favouriteChannels
    if (!sel.listId) return []
    const channels = (byListId[sel.listId] ?? []).filter(isPlayableChannel)
    return sel.group ? channels.filter((c) => c.group === sel.group) : channels
  }, [sel, byListId, model.favouriteChannels])

  const [visible, setVisible] = useState(ROW_STEP)
  useEffect(() => { setVisible(ROW_STEP) }, [sel])
  const shownRows = useMemo(() => rows.slice(0, visible), [rows, visible])

  const selected = useMemo(() => (selectedKey ? rows.find((c) => channelKey(c) === selectedKey) ?? null : null) ?? rows[0] ?? null, [selectedKey, rows])
  const previewChannel = useDebouncedChannel(selected, 300)
  const info = selected ? model.nowFor(selected) : { now: null, next: null, later: null }
  const title = sel.listId === FAVS_GROUP ? tt('favourites') : sel.group ?? tree.find((l) => l.id === sel.listId)?.name ?? ''
  /**
   * Lägesväxeln står i ALLA guidelägen — även här.
   *
   * Spellistevyn ritade den inte: den som bytte hit hade ingen station kvar
   * som tog hen tillbaka till Nu/Sen eller Tablå, och eftersom läget sparas
   * öppnades guiden i spellistevyn även nästa gång. Enda vägen ut var
   * Inställningar → Kanalguidens standardvy.
   */
  const modeOptions: { key: GuideMode; label: string }[] = [{ key: 'now', label: tt('modeNow') }, { key: 'tl', label: tt('modeTimeline') }, { key: 'grid', label: tt('modeGrid') }, { key: 'playlists', label: tt('modePlaylists') }]

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
        style={{ padding: `${dp(14)}px ${dp(18)}px`, borderRadius: dp(14), background: isNow ? TV.accMix(14) : TV.s06, border: `1px solid ${isNow ? TV.accMix(45) : TV.line}`, display: 'flex', flexDirection: 'column', gap: dp(6), cursor: 'pointer', minHeight: phone ? dp(PHONE_HIT_MIN_DP) : undefined }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: dp(phoneTextFloor(14, phone)), letterSpacing: '0.1em', textTransform: 'uppercase', color: isNow ? TV.accText : 'rgba(243,244,248,0.5)' }}>
          <span>{label}</span><span style={{ fontSize: dp(phoneTextFloor(15, phone)), letterSpacing: 0, textTransform: 'none' }}>{isNow ? `${formatClock(programme.start, locale)}–${formatClock(programme.stop, locale)}` : formatClock(programme.start, locale)}</span>
        </div>
        <div style={{ fontSize: isNow ? dp(phoneTextFloor(24, phone)) : dp(phoneTextFloor(20, phone)), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{programme.title}</div>
        {isNow ? <Progress value={progressOf(programme.start, programme.stop, model.nowMs)} height={dp(4)} /> : null}
        <div style={{ fontSize: dp(phoneTextFloor(15, phone)), color: 'rgba(243,244,248,0.55)' }}>{isNow ? tt('okWatch') : reminded ? tt('reminderSet') : tt('okRemind')}</div>
      </div>
    )
  }

  // Precis en data-init per monterad vy: normalt första kanalraden, men utan
  // rader (tom lista/grupp) faller det tillbaka på första vänsterpostens.
  const noRows = rows.length === 0

  const colItem = (key: string, active: boolean, label: string, count: number, indent: boolean, onOk: () => void, testId: string, extra?: Record<string, string>) => (
    <div key={key} data-testid={testId} {...station(onOk, undefined, { 'data-live-tv-col': 'left', ...(extra ?? {}) })} style={{ height: dp(phoneHitFloor(indent ? 48 : 56, phone)), minHeight: dp(phoneHitFloor(indent ? 48 : 56, phone)), marginLeft: indent ? dp(28) : 0, padding: `0 ${dp(16)}px`, borderRadius: dp(12), display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? (indent ? TV.accMix(18) : TV.s12) : 'transparent', color: active ? TV.text : indent ? 'rgba(243,244,248,0.6)' : TV.text, fontSize: dp(phoneTextFloor(indent ? 18 : 19, phone)), fontWeight: indent ? 400 : 600, cursor: 'pointer' }}>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ fontSize: dp(phoneTextFloor(14, phone)), color: 'rgba(243,244,248,0.45)' }}>{count}</span>
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
        <div style={{ marginTop: 'auto', padding: `${dp(20)}px 0`, fontSize: dp(phoneTextFloor(15, phone)), color: TV.faint }}>{tt('helpPlaylists')}</div>
      </div>

      {/* Mitten: kanaler */}
      <div data-scroll="" style={{ flex: 1, minWidth: 0, borderRight: `1px solid ${TV.line}`, padding: `${dp(30)}px 0 0 ${dp(24)}px`, overflowY: 'auto' }}>
        {/*
          RUBRIKRADEN TÅL 1280 DESIGNPIXLAR (spec 5).

          Raden var tre lådor lagda för 1920: titeln utan gräns, antalet OCH
          klockan i samma `<span>`, och segmentväxeln till höger. I
          skrivbordets TV-läge byter scenen till breddgrenen (1280) och då
          krockade allt på en gång (uppmätt av Jerry i DMG v7): växeln bröt
          "Now / Next" över tre rader, och värdens klocka — ett BLOCK om två
          rader, hälsning över `07:13 | 14 SEP | MON`, inte ett textfragment —
          ritades utanför radens flöde rakt ovanpå titeln, eftersom ett block i
          en inline-låda inte hör till raden.

          Nu: titeln är den enda som ger vika (trunkerar), antalet och klockan
          är egna lådor som inte krymper, klockan är ett BLOCK i sin egen
          flexlåda, och växeln faller ner som en hel enhet när raden inte
          räcker (`flex-wrap`). Ordningen — titel, antal ·, klocka, växel till
          höger — är handoffens, så 1920 ser likadant ut som förut.

          `center` och inte `baseline`: en trunkerande titel är en
          rullningsbehållare (`overflow: hidden`), och en sådan får sin
          baslinje SYNTETISERAD ur underkanten i stället för ur texten. Med
          `baseline` hade titeln därför sjunkit några pixlar på 1920 — just den
          sortens tysta drift som fixen ska bli av med.
        */}
        <div data-testid="pl-header" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: dp(12), rowGap: dp(8), marginBottom: dp(16) }}>
          <span data-testid="pl-title" style={{ fontSize: dp(phoneTextFloor(26, phone)), fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          <span data-testid="pl-meta" style={{ fontSize: dp(phoneTextFloor(16, phone)), color: 'rgba(243,244,248,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>{tt('channelsCount', { count: rows.length })} ·</span>
          <div data-testid="pl-clock" style={{ flexShrink: 0 }}>{clock}</div>
          <Segment options={modeOptions} value={mode} onChange={onModeChange} style={{ marginLeft: 'auto', marginRight: dp(24), alignSelf: 'center' }} phone={phone} />
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
              style={{ height: dp(phoneHitFloor(82, phone)), minHeight: dp(phoneHitFloor(82, phone)), marginRight: dp(24), borderRadius: dp(12), display: 'flex', alignItems: 'center', gap: dp(14), padding: `0 ${dp(14)}px`, background: focused ? TV.s10 : 'transparent', cursor: 'pointer' }}
            >
              <ChannelCell channel={channel} number={model.channelNumber(channel)} pinned={model.pinnedSet.has(key)} locked={model.locked.has(key)} quality={null} focused={false} width={dp(560)} phone={phone} />
              <div style={{ minWidth: 0, flex: 1, fontSize: dp(phoneTextFloor(17, phone)), color: 'rgba(243,244,248,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rowInfo.now?.title ?? tt('noProgramme')}</div>
              <div style={{ width: dp(110), flexShrink: 0 }}>
                {rowInfo.now ? <><div style={{ fontSize: dp(phoneTextFloor(14, phone)), color: 'rgba(243,244,248,0.5)', textAlign: 'right' }}>{tt('minutesLeft', { min: Math.max(0, Math.round((rowInfo.now.stop - model.nowMs) / 60_000)) })}</div><Progress value={progressOf(rowInfo.now.start, rowInfo.now.stop, model.nowMs)} height={dp(4)} /></> : null}
              </div>
            </div>
          )
        })}
        {rows.length > visible ? (
          <div {...station(() => setVisible((v) => v + ROW_STEP))} style={{ margin: `${dp(20)}px auto ${dp(20)}px`, width: 'fit-content', height: dp(phoneHitFloor(48, phone)), minHeight: dp(phoneHitFloor(48, phone)), padding: `0 ${dp(24)}px`, borderRadius: 999, background: TV.s10, display: 'flex', alignItems: 'center', fontSize: dp(phoneTextFloor(18, phone)), cursor: 'pointer' }}>{tt('showMore')}</div>
        ) : null}
        {rows.length === 0 ? <div data-testid="pl-empty" style={{ padding: dp(24), color: TV.dim, fontSize: dp(phoneTextFloor(19, phone)) }}>{channelsLoading ? tt('loadingChannels') : tt('guideEmpty')}</div> : null}
      </div>

      {/* Höger: förhandsvisning + Nu/Sen/Senare */}
      <div data-testid="pl-detail" style={{ width: dp(560), flexShrink: 0, padding: `${dp(30)}px ${dp(48)}px 0 ${dp(28)}px`, display: 'flex', flexDirection: 'column', gap: dp(14) }}>
        <TvPreview channel={previewChannel} enabled={settings.previewEnabled} live={Boolean(info.now)} width="100%" height={dp(272)} label={settings.previewEnabled ? tt('previewLabel') : tt('previewFrame')} onOk={() => selected && nav.play({ channel: selected })} extra={{ 'data-testid': 'pl-preview' }} phone={phone} />
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), fontSize: dp(phoneTextFloor(16, phone)), color: 'rgba(243,244,248,0.55)' }}>
            <span style={{ color: TV.accText, fontWeight: 600 }}>{model.channelNumber(selected) ?? ''}</span><span>{selected.name}</span>{qualityFromName(selected.name) ? <Tag variant="quality" phone={phone}>{qualityFromName(selected.name)}</Tag> : null}
          </div>
        ) : null}
        {card(tt('colNow'), info.now, 'now')}
        {card(tt('colNext'), info.next, 'next')}
        {card(tt('colLater'), info.later, 'later')}
      </div>
    </div>
  )
}
