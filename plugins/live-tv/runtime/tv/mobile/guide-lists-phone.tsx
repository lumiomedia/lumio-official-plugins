'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { channelKey } from '../../live-tv-data'
import type { TvViewProps } from '../tv-shell'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import type { GuideMode } from '../tv-settings-store'
import { FAVS_GROUP } from '../tv-guide-shared'
import { useListRows, useListTree, type ListTreeEntry } from '../list-tree'
import { MT, ellipsis, sectionLabel } from './mobile-tokens'
import { MIcons } from './mobile-icons'
import { MobileHeader } from './mobile-header'
import { MobileChannelRow } from './mobile-channel-row'
import { PhoneGuideModeBar, phoneGuideMode } from './guide-phone'

/** Kategorirader per lista innan "Visa alla N kategorier". */
const GROUPS_PREVIEW = 6
/** Samma steg som TV:ns lista: fler rader läggs på med Visa fler. */
const ROW_STEP = 40
/** Kortens hörnradie och kategoriradens mått (handoffen §4). */
const CARD_RADIUS = 14
const GROUP_ROW_H = 52

/** Nivå 2:s adress: vilken lista/kategori som är öppen och vad sidan heter. */
interface ListPath { listId: string; group: string | null; title: string }

/**
 * Guiden · Lists på telefon (fas 3, handoffen §4).
 *
 * TV:ns tre kolumner blir en drill-down i två steg: nivå 1 är ett filterfält
 * och en sektion per spellista (kort med kategorirader, antalet HÖGERSTÄLLT
 * — aldrig under namnet, det var det som gjorde TV-kolumnen oläsbar i
 * 330 px); nivå 2 är samma kanallista som Nu-vyn med kategorinamnet som
 * sidtitel. Trädet och raderna kommer ur `list-tree.ts`, exakt skrivbordets
 * pipeline — bara skärmen skiljer.
 */
export function TvGuideListsPhone({ model, nav, mode, onModeChange }: TvViewProps & { mode: GuideMode; onModeChange: (mode: GuideMode) => void }) {
  const { tt, locale } = useTvText()
  const tree = useListTree(model)
  const [path, setPath] = useState<ListPath | null>(null)
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const { rows, channelsLoading } = useListRows(model, path ?? { listId: null, group: null })

  /**
   * Nivå 2 är ett lager i skalets Bakåt-kedja: svep höger/Escape/Bakåt
   * poppar lagret (tillbaka till nivå 1) i stället för att lämna guiden.
   * `nav` byter identitet varje omrender (minuttick), så ref:en håller
   * effekten still — den registrerar en gång per öppning. Lagret står kvar
   * medan spelaren är öppen: skalets `back()` stänger spelaren FÖRE lagren,
   * och en av-/återregistrering runt uppspelningen hade kastat om
   * lagerordningen mot guidens eget lager (barnets effekt kör först).
   */
  const navRef = useRef(nav)
  useEffect(() => { navRef.current = nav })
  const claimBack = path !== null
  useEffect(() => {
    if (!claimBack) return
    return navRef.current.pushLayer(() => setPath(null))
  }, [claimBack])

  const [visible, setVisible] = useState(ROW_STEP)
  useEffect(() => { setVisible(ROW_STEP) }, [path])
  const visibleRows = useMemo(() => rows.slice(0, visible), [rows, visible])
  const noProgrammeLabel = model.epgLoading ? tt('loadingGuide') : tt('noProgramme')
  const needle = filter.trim().toLowerCase()

  if (path) {
    return (
      <div data-testid="lists-phone-level2" data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column' }}>
        <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={path.title} back onBack={() => setPath(null)} testId="lists-level2-header" /></div>
        {rows.length === 0 ? (
          // Listans kanaler kommer ur appens index: tomt betyder "hämtar"
          // tills hämtningen är klar, annars saknar kategorin kanaler.
          <div data-testid="lists-empty" style={{ padding: '32px 16px', textAlign: 'center', fontSize: 15, color: MT.muted }}>
            {channelsLoading ? tt('loadingChannels') : tt('guideEmpty')}
          </div>
        ) : (
          <div>
            {visibleRows.map((channel, index) => {
              const key = channelKey(channel)
              return (
                <MobileChannelRow
                  key={key}
                  channel={channel}
                  number={model.channelNumber(channel)}
                  now={model.nowFor(channel)}
                  nowMs={model.nowMs}
                  locale={locale}
                  pinned={model.pinnedSet.has(key)}
                  locked={model.locked.has(key)}
                  noProgrammeLabel={noProgrammeLabel}
                  onPress={() => nav.play({ channel })}
                  onLongPress={(el) => nav.channelMenu(channel, el)}
                  init={index === 0}
                  testId="guide-row"
                />
              )
            })}
            {rows.length > visible ? (
              <div data-testid="show-more" {...station(() => setVisible((v) => v + ROW_STEP))} style={{ margin: '16px auto 0', width: 'fit-content', minHeight: MT.HIT, padding: '0 24px', borderRadius: 999, background: MT.s10, display: 'flex', alignItems: 'center', fontSize: 15, cursor: 'pointer' }}>{tt('showMore')}</div>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  const openList = (list: ListTreeEntry) => setPath({ listId: list.id, group: null, title: list.name })
  const openGroup = (list: ListTreeEntry, group: string) => setPath({ listId: list.id, group, title: group })
  const expand = (id: string) => setExpanded((prev) => new Set(prev).add(id))

  return (
    <div data-testid="lists-phone" data-scroll="" style={{ flex: 1, overflowY: 'auto', padding: `0 ${MT.PAD}px`, paddingBottom: MT.SCROLL_PAD_BOTTOM, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Sidhuvudet äger sina egna kanter (60 px vänster för värdens menychip,
          16 höger) — kolumnens 16 px-luft dras tillbaka runt det. */}
      <div style={{ margin: `0 -${MT.PAD}px` }}><MobileHeader title={tt('guideTitle')} /></div>
      <PhoneGuideModeBar mode={phoneGuideMode(mode)} onChange={onModeChange} />
      {/* 16 px text: iOS zoomar in på fält med mindre text vid fokus. */}
      <input
        data-testid="lists-filter"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder={tt('filterCategories')}
        aria-label={tt('filterCategories')}
        style={{ minHeight: MT.HIT, width: '100%', boxSizing: 'border-box', padding: '0 14px', borderRadius: CARD_RADIUS, border: 'none', outline: 'none', background: MT.s10, color: MT.text, fontSize: 16, fontFamily: MT.font }}
      />

      {model.favouriteChannels.length > 0 ? (
        <div data-testid="lists-favs-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ ...sectionLabel, flex: 1, ...ellipsis }}>{tt('favourites')}</span>
            <span style={{ fontSize: 12, color: MT.dim, flexShrink: 0 }}>{model.favouriteChannels.length}</span>
          </div>
          <div
            data-testid="lists-favs"
            {...station(() => setPath({ listId: FAVS_GROUP, group: null, title: tt('favourites') }))}
            style={{ minHeight: GROUP_ROW_H, padding: '0 14px', borderRadius: CARD_RADIUS, background: MT.accMix(14), border: `1px solid ${MT.accMix(40)}`, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, cursor: 'pointer' }}
          >
            <span style={{ color: MT.acc, display: 'inline-flex', flexShrink: 0 }}><MIcons.Heart size={18} filled /></span>
            <span style={{ flex: 1, fontWeight: 600, ...ellipsis }}>{tt('favourites')}</span>
            <span style={{ fontSize: 13, color: MT.dim, flexShrink: 0 }}>{model.favouriteChannels.length}</span>
            <span style={{ color: MT.dim, display: 'inline-flex', flexShrink: 0 }}><MIcons.CaretRight size={16} /></span>
          </div>
        </div>
      ) : null}

      {tree.map((list) => {
        const matching = needle ? list.groups.filter((g) => g.name.toLowerCase().includes(needle)) : list.groups
        const shown = expanded.has(list.id) ? matching : matching.slice(0, GROUPS_PREVIEW)
        return (
          <div key={list.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Rubrikraden är själv en station: hela listan öppnas härifrån. */}
            <div data-testid={`lists-section-${list.id}`} {...station(() => openList(list))} style={{ minHeight: MT.HIT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}>
              <span style={{ ...sectionLabel, flex: 1, ...ellipsis }}>{list.name}</span>
              <span data-testid="lists-list-count" style={{ fontSize: 12, color: MT.dim, flexShrink: 0 }}>{list.count}</span>
            </div>
            {shown.length > 0 ? (
              <div style={{ borderRadius: CARD_RADIUS, background: MT.s06, border: `1px solid ${MT.line08}`, overflow: 'hidden' }}>
                {shown.map((group, index) => (
                  <div
                    key={group.name}
                    data-testid={`lists-group-${list.id}-${group.name}`}
                    {...station(() => openGroup(list, group.name))}
                    style={{ minHeight: GROUP_ROW_H, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, borderTop: index === 0 ? 'none' : `1px solid ${MT.line07}`, cursor: 'pointer' }}
                  >
                    <span style={{ flex: 1, ...ellipsis }}>{group.name}</span>
                    {/* Antalet finns bara när listans kanaler är laddade — kvittots grupper saknar tal att lita på. */}
                    {list.channelsLoaded ? <span data-testid="lists-group-count" style={{ fontSize: 13, color: MT.dim, flexShrink: 0 }}>{group.count}</span> : null}
                    <span style={{ fontSize: 13, color: MT.dim, flexShrink: 0 }}>›</span>
                  </div>
                ))}
                {matching.length > shown.length ? (
                  <div data-testid={`lists-show-all-${list.id}`} {...station(() => expand(list.id))} style={{ minHeight: MT.HIT, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14, color: MT.muted, borderTop: `1px solid ${MT.line07}`, cursor: 'pointer' }}>
                    {tt('showAllCategories', { count: matching.length })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
