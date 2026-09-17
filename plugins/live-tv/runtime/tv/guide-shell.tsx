'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import type { TvViewProps } from './tv-shell'
import { useTvClockNode } from './tv-ui'
import { useTvText } from './tv-strings'
import { getTvSettings, setGuideMode, setTvSettings, useGuideMode, useTvSettings } from './tv-settings-store'
import { desktopGuideMode, type DesktopGuideMode } from './guide-surface'
import { guideWindowStart } from './epg-grid-geometry'
import { startOfLocalDay } from '../live-tv-model'
import { FAVS_GROUP, useGuideGroups } from './tv-guide-shared'
import { TvChoicePanel, type ChoiceOption } from './tv-list-picker'
import { GuideControlRow } from './guide-control-row'
import { GuideGridView } from './guide-grid-view'
import { GuideNowNextView } from './guide-nownext-view'
import { GuideTimelineView } from './guide-timeline-view'
import type { GuideSelection, GuideViewProps } from './guide-types'

/**
 * Den städade guidens skal (spec §1): äger läge, källa/kategori, dag,
 * fönsterstart, markering och panelerna, ritar kontrollraden och sedan EN
 * av tre vyer med allt som props. Lägesbyte byter bara rendering — källa,
 * kategori, dag och markering behålls.
 *
 * Importerar ALDRIG `tv-guide.tsx` (som importerar hit): vyerna hämtar sina
 * typer ur `guide-types.ts`. Grid är `GuideGridView` (Task 3), Now / Next
 * är `GuideNowNextView` (Task 4, bannern styrs av `settings.nowNextDetails`),
 * Timeline är `GuideTimelineView` (Task 5, zoomen ur `settings.timelineZoom`;
 * en rad där hoppar till Grid vid den klickade tiden via `openGridAt`).
 */
export function TvGuideShell({ model, nav, params }: TvViewProps) {
  const { tt, locale } = useTvText()
  const isTv = useTvMode()
  const clock = useTvClockNode(locale)
  const settings = useTvSettings()

  // Lokalt speglat läge, normaliserat för ytan (spec "Beslut", Lagring):
  // lagringen kan innehålla telefonens/LAN:s nycklar, och skrivbord/TV
  // skriver bara sina tre. Skrivningen notifierar inte den egna instansen
  // (samma mönster som `TvGuide`), därav spegeln.
  const storedMode = useGuideMode()
  const [mode, setMode] = useState<DesktopGuideMode>(() => desktopGuideMode(storedMode))
  useEffect(() => { setMode(desktopGuideMode(storedMode)) }, [storedMode])

  /**
   * Lägesstack + lager: Bakåt tar ETT läge tillbaka i stället för att lämna
   * guiden (kopierat från `TvGuide`, se resonemanget där). Refar håller
   * effekten still trots att `nav`/`popMode` byter identitet varje minut.
   */
  const [modeStack, setModeStack] = useState<DesktopGuideMode[]>([])
  const changeMode = (next: DesktopGuideMode) => {
    if (next === mode) return
    setModeStack((stack) => [...stack, mode])
    setGuideMode(next)
    setMode(next)
  }
  const popMode = () => {
    const prev = modeStack[modeStack.length - 1]
    if (prev === undefined) return
    setModeStack((stack) => stack.slice(0, -1))
    setGuideMode(prev)
    setMode(prev)
  }
  const navRef = useRef(nav)
  useEffect(() => { navRef.current = nav })
  const popRef = useRef(popMode)
  useEffect(() => { popRef.current = popMode })
  const claimBack = modeStack.length > 0
  useEffect(() => {
    if (!claimBack) return
    return navRef.current.pushLayer(() => popRef.current())
  }, [claimBack, modeStack.length])

  // Kategori lagras (`guideCategory`); en lagrad grupp som inte längre finns
  // i modellen faller tillbaka till Alla i stället för att ge en tom vy.
  const groups = useGuideGroups(model, tt)
  const category = useMemo(() => {
    const stored = settings.guideCategory
    if (stored === null) return null
    return groups.some((g) => g.key === stored) ? stored : null
  }, [settings.guideCategory, groups])

  // `params.group` (hubbens kategorikort och djuplänkar) skriver kategorin
  // EN gång vid inträde — `'all'` = Alla — precis som den gamla guiden läste
  // den. Bara vid montering: därefter äger panelen (och lagringen) valet.
  const groupParam = params.group
  useEffect(() => {
    if (!groupParam) return
    const next = groupParam === 'all' ? null : groupParam
    if (next !== getTvSettings().guideCategory) setTvSettings({ guideCategory: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [dayOffset, setDayOffset] = useState<0 | 1>(0)
  // Fönsterstart är VY-state och ENDA källan till Grids axel: halvtimmes-
  // justerad vid inträde och vid Nu, Imorgons 06:00 vid dagbyte, klickad
  // halvtimme från Timeline. Dagen härleds aldrig om fönstret i efterhand —
  // förut låg Imorgon fastnaglad på 06:00 och Timeline → Grid struntade i
  // den klickade tiden så fort man stod på Imorgon.
  const [windowStart, setWindowStart] = useState(() => guideWindowStart(model.nowMs))
  const [selection, setSelection] = useState<GuideSelection | null>(null)
  const [panel, setPanel] = useState<'source' | 'category' | null>(null)

  // Markeringen följer raden: byter man källa, kategori eller dag är raden
  // borta ur vyn, så markeringen nollas. Lägesbyte behåller den (spec §1).
  const changeDay = (d: 0 | 1) => {
    setDayOffset(d)
    setWindowStart(d === 1 ? startOfLocalDay(model.nowMs, 1) + 6 * 3_600_000 : guideWindowStart(model.nowMs))
    setSelection(null)
  }
  const jumpToNow = () => { setDayOffset(0); setWindowStart(guideWindowStart(model.nowMs)) }
  // Timeline → Grid vid en tidpunkt: samma lägesbyte som segmentet (lagring +
  // lägesstack, så Bakåt tar en tillbaka till Timeline) med fönstret på
  // tidpunktens halvtimme. Dagen följer tidpunkten, så en klickad tid på
  // Imorgon ger Imorgon i dagsegmentet OCH axeln på den tiden.
  const openGridAt = (atMs: number) => {
    setWindowStart(guideWindowStart(atMs))
    setDayOffset(atMs >= startOfLocalDay(model.nowMs, 1) ? 1 : 0)
    changeMode('grid')
  }

  // Källväljaren: Alla + modellens spellistor, med antal.
  const sourceOptions: ChoiceOption[] = useMemo(() => [
    { key: null, label: tt('sourceAll'), count: model.allChannels.length },
    ...model.playlists.map((p) => ({ key: p.id, label: p.name, count: p.count })),
  ], [model.allChannels.length, model.playlists, tt])
  // Kategoriväljaren: `useGuideGroups`-listan med antal per grupp.
  const categoryOptions: ChoiceOption[] = useMemo(() => {
    const perGroup = new Map<string, number>()
    for (const c of model.channels) perGroup.set(c.group, (perGroup.get(c.group) ?? 0) + 1)
    return groups.map((g) => ({
      key: g.key,
      label: g.key === null ? tt('categoryAll') : g.label,
      count: g.key === null ? model.channels.length : g.key === FAVS_GROUP ? model.favouriteChannels.length : perGroup.get(g.key) ?? 0,
    }))
  }, [groups, model.channels, model.favouriteChannels.length, tt])
  const categoryLabel = category === null ? tt('categoryAll') : groups.find((g) => g.key === category)?.label ?? tt('categoryAll')
  const categoryCount = categoryOptions.find((o) => o.key === category)?.count ?? model.channels.length

  // Vyernas gemensamma props: fönstret rakt ur state (se `windowStart`).
  const viewProps: GuideViewProps = { model, nav, category, dayOffset, windowStart, selection, onSelect: setSelection, isTv }

  const view = mode === 'nownext'
    ? <GuideNowNextView {...viewProps} details={settings.nowNextDetails} />
    : mode === 'grid'
      ? <GuideGridView {...viewProps} />
      : <GuideTimelineView {...viewProps} zoom={settings.timelineZoom} onOpenGrid={openGridAt} />

  return (
    <div data-testid="guide-shell" data-guide-mode={mode} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <GuideControlRow
        mode={mode}
        onMode={changeMode}
        sourceLabel={model.activePlaylistName ?? tt('sourceAll')}
        sourceCount={model.channels.length}
        onOpenSource={() => setPanel('source')}
        categoryLabel={categoryLabel}
        categoryCount={categoryCount}
        onOpenCategory={() => setPanel('category')}
        dayOffset={dayOffset}
        onDay={changeDay}
        onNow={jumpToNow}
        zoom={settings.timelineZoom}
        onZoom={(z) => setTvSettings({ timelineZoom: z })}
        details={settings.nowNextDetails}
        onDetails={() => setTvSettings({ nowNextDetails: !settings.nowNextDetails })}
        clock={clock}
      />
      <div data-testid="guide-content" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view}
      </div>
      {panel === 'source' ? (
        <TvChoicePanel nav={nav} title={tt('pickSource')} options={sourceOptions} value={model.activePlaylistId} onPick={(key) => { model.setActivePlaylist(key); setSelection(null) }} onClose={() => setPanel(null)} />
      ) : null}
      {panel === 'category' ? (
        <TvChoicePanel nav={nav} title={tt('pickCategory')} options={categoryOptions} value={category} onPick={(key) => { setTvSettings({ guideCategory: key }); setSelection(null) }} onClose={() => setPanel(null)} />
      ) : null}
    </div>
  )
}
