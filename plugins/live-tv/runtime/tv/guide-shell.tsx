'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { channelKey } from '../live-tv-data'
import type { TvViewProps } from './tv-shell'
import { useTvText } from './tv-strings'
import { getTvSettings, setGuideMode, setTvSettings, useGuideMode, useTvSettings } from './tv-settings-store'
import { desktopGuideMode, type DesktopGuideMode } from './guide-surface'
import { guideWindowStart } from './epg-grid-geometry'
import { FAVS_GROUP, MORE_GROUPS, useGuideGroups } from './tv-guide-shared'
import { groupCounts } from './group-chips'
import { TvGroupPanel } from './tv-group-picker'
import { TvChoicePanel, type ChoiceOption } from './tv-list-picker'
import { GuideNowSenView } from './guide-nowsen-view'
import { GuideTimelineView } from './guide-timeline-view'
import { GuideListView } from './guide-list-view'
import { GuideHero, useDebouncedSelection } from './guide-hero'
import { GuideCategoryChips, GuideCategoryColumn, type GuideCategoryItem } from './guide-categories'
import { guideKeyAction } from './guide-keys'
import { V2, liveColors } from './v2-tokens'
import { CutoutLayer } from './cutout-layer'
import { V2FocusStyle } from './v2-ui'
import type { GuideSelection, GuideViewProps } from './guide-types'

/**
 * Kanalguide v2:s skal (handoff "Screen 2", spec "Guiden"): äger läge,
 * källa/kategori, fönsterstart och markering, ritar heron (rubrik, segment,
 * källpill, fokuserat program, förhandsvisning), kategorikolumnen eller
 * chippen och EN av tre vyer. Lägesbyte byter bara rendering — källa,
 * kategori och markering behålls.
 *
 * Importerar ALDRIG `tv-guide.tsx` (som importerar hit): vyerna hämtar sina
 * typer ur `guide-types.ts`.
 *
 * Bakåt (handoff "Guide navigation"): (1) står fönstret eller fokus inte på
 * "nu" → till nu; (2) annars, står fokus inte i kategorierna → dit; (3)
 * annars släpps trycket till TV-skalet, som lämnar guiden. Lagret
 * registreras bara medan steg 1 eller 2 gäller, så Bakåt aldrig tar två
 * steg på ett tryck — och en öppen panel/meny (registrerad senare, överst)
 * stänger först.
 *
 * N = till nu, T = växla Nu/Sen ↔ Tablå (från Kanallista → Tablå).
 */
export function TvGuideShell({ model, nav, params }: TvViewProps) {
  const { tt } = useTvText()
  const isTv = useTvMode()
  const settings = useTvSettings()

  // Lokalt speglat läge, normaliserat för ytan: lagringen kan innehålla
  // telefonens/LAN:s nycklar, och skrivbord/TV skriver bara sina tre.
  // Skrivningen notifierar inte den egna instansen, därav spegeln.
  const storedMode = useGuideMode()
  const [mode, setMode] = useState<DesktopGuideMode>(() => desktopGuideMode(storedMode))
  useEffect(() => { setMode(desktopGuideMode(storedMode)) }, [storedMode])
  const changeMode = (next: DesktopGuideMode) => {
    if (next === mode) return
    setGuideMode(next)
    setMode(next)
  }

  // Kategori lagras (`guideCategory`); en lagrad grupp som inte längre finns
  // i modellen faller tillbaka till Alla i stället för att ge en tom vy.
  // Mot ALLA grupper, inte de kapade posterna: en grupp vald ur "Alla
  // grupper" ligger ofta bortom taket och hade annars nollats direkt.
  const category = useMemo(() => {
    const stored = settings.guideCategory
    if (stored === null) return null
    if (stored === FAVS_GROUP) return model.favouriteChannels.length > 0 ? stored : null
    return model.groups.includes(stored) ? stored : null
  }, [settings.guideCategory, model.groups, model.favouriteChannels.length])
  const groups = useGuideGroups(model, tt, category)

  // `params.group` (hubbens kategorikort och djuplänkar) skriver kategorin EN
  // gång vid inträde — `'all'` = Alla. Därefter äger kolumnen valet.
  const groupParam = params.group
  useEffect(() => {
    if (!groupParam) return
    const next = groupParam === 'all' ? null : groupParam
    if (next !== getTvSettings().guideCategory) setTvSettings({ guideCategory: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // `params.channel` (Klassisks favoriter, sökträffar): vyn ger den kanalen startfokus.
  const focusChannelKey = params.channel ?? null
  // Ligger kanalen utanför den sparade kategorin finns den inte i listan och
  // kan inte få fokus — då Alla, en gång, när kanalerna har laddats.
  const deepLinkChecked = useRef(false)
  useEffect(() => {
    if (deepLinkChecked.current || !focusChannelKey || groupParam) return
    const target = model.channels.find((c) => channelKey(c) === focusChannelKey)
    if (!target) return
    deepLinkChecked.current = true
    const stored = getTvSettings().guideCategory
    if (stored === null) return
    const inside = stored === FAVS_GROUP ? model.pinnedSet.has(focusChannelKey) : target.group === stored
    if (!inside) setTvSettings({ guideCategory: null })
  }, [focusChannelKey, groupParam, model.channels, model.pinnedSet])

  // Fönsterstart är VY-state (halvtimmesjusterad vid inträde och vid Nu);
  // Tablån flyttar den med ◂▸ förbi kanten.
  const [windowStart, setWindowStart] = useState(() => guideWindowStart(model.nowMs))
  const [selection, setSelection] = useState<GuideSelection | null>(null)
  const heroSelection = useDebouncedSelection(selection)
  const [panel, setPanel] = useState<'source' | 'groups' | null>(null)
  // Kategoriposten som öppnade grupplistan: fokus tillbaka hit när den stängs.
  const groupsOpenerRef = useRef<HTMLElement | null>(null)

  // `nowTick` räknas upp på varje Nu (N, Bakåt steg 1): vyerna flyttar då
  // fokus till den markerade kanalens pågående program.
  const [nowTick, setNowTick] = useState(0)
  const jumpToNow = () => {
    setWindowStart(guideWindowStart(model.nowMs))
    setSelection((sel) => (sel ? { channel: sel.channel, programme: model.nowFor(sel.channel).now } : sel))
    setNowTick((n) => n + 1)
  }

  const sourceOptions: ChoiceOption[] = useMemo(() => [
    { key: null, label: tt('sourceAll'), count: model.allChannels.length },
    ...model.playlists.map((p) => ({ key: p.id, label: p.name, count: p.count })),
  ], [model.allChannels.length, model.playlists, tt])
  // Kategorierna med antal. Sista posten är "Alla grupper (N)" när grupperna
  // inte ryms — den öppnar den sökbara grupplistan.
  const perGroup = useMemo(() => groupCounts(model.channels), [model.channels])
  const categoryItems: GuideCategoryItem[] = useMemo(() => groups.map((g) => ({
    key: g.key,
    label: g.label,
    count: g.key === null ? model.channels.length : g.key === FAVS_GROUP ? model.favouriteChannels.length : g.key === MORE_GROUPS ? undefined : perGroup.get(g.key) ?? 0,
  })), [groups, perGroup, model.channels.length, model.favouriteChannels.length])
  const categoryLabel = category === null ? tt('categoryAll') : groups.find((g) => g.key === category)?.label ?? category
  const pickCategory = (key: string | null) => {
    if (key === MORE_GROUPS) {
      groupsOpenerRef.current = document.activeElement as HTMLElement | null
      setPanel('groups')
      return
    }
    setTvSettings({ guideCategory: key })
    setSelection(null)
  }

  // Var fokus står: kategorierna (kolumn/chips) eller resten (hero, vy).
  const catsRef = useRef<HTMLDivElement | null>(null)
  const [inCats, setInCats] = useState(false)
  const focusCategories = (): boolean => {
    const root = catsRef.current
    const target = root?.querySelector<HTMLElement>('[data-selected][data-f]') ?? root?.querySelector<HTMLElement>('[data-f]') ?? null
    if (!target) return false
    target.focus()
    setInCats(true)
    return true
  }
  const columnLayout = settings.guideCategoryLayout === 'column'
  const onLeftEdge = () => (columnLayout ? focusCategories() : false)

  // Bakåt-kedjan (se filhuvudet).
  const nowStart = guideWindowStart(model.nowMs)
  const programme = selection?.programme ?? null
  const focusAtNow = programme === null || (programme.start <= model.nowMs && programme.stop > model.nowMs)
  const atNow = windowStart === nowStart && focusAtNow
  const claimBack = !atNow || !inCats
  const backRef = useRef<() => void>(() => {})
  backRef.current = () => {
    if (!atNow) { jumpToNow(); return }
    focusCategories()
  }
  const navRef = useRef(nav)
  useEffect(() => { navRef.current = nav })
  useEffect(() => {
    if (!claimBack) return
    return navRef.current.pushLayer(() => backRef.current(), { allowZap: true })
  }, [claimBack])

  const onKeyDownCapture = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (panel !== null || event.metaKey || event.ctrlKey || event.altKey) return
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
    const action = guideKeyAction(event.key)
    if (!action) return
    event.preventDefault()
    event.stopPropagation()
    if (action === 'now') jumpToNow()
    else changeMode(mode === 'tl' ? 'now' : 'tl')
  }

  const viewProps: GuideViewProps = {
    model,
    nav,
    category,
    categoryLabel,
    dayOffset: 0,
    windowStart,
    nowTick,
    selection,
    onSelect: setSelection,
    onFocusProgramme: setSelection,
    onLeftEdge,
    focusChannelKey,
    onWindowStart: setWindowStart,
    isTv,
    mode,
  }
  const view = mode === 'now'
    ? <GuideNowSenView {...viewProps} />
    : mode === 'tl'
      ? <GuideTimelineView {...viewProps} />
      : <GuideListView {...viewProps} />

  const categories = { items: categoryItems, value: category, onPick: pickCategory }

  return (
    <div
      data-testid="guide-shell"
      data-guide-mode={mode}
      data-window-start={String(windowStart)}
      onKeyDownCapture={onKeyDownCapture}
      style={{ position: 'relative', isolation: 'isolate', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, color: V2.text, overflow: 'hidden' }}
    >
      <V2FocusStyle />
      {/* Slät sidton (ingen gradient utan bild, Jerry 2026-10-30) med hål åt förhandsrutan (mpv ritar under webbvyn). */}
      <CutoutLayer testId="guide-bg" data={{ 'data-bg': liveColors(settings).bg }} background={liveColors(settings).bg} style={{ zIndex: -1 }} />
      <div onFocusCapture={() => setInCats(false)} style={{ flexShrink: 0 }}>
        <GuideHero
          sel={heroSelection}
          model={model}
          nav={nav}
          mode={mode}
          onMode={changeMode}
          tint={settings.heroTint}
          background={liveColors(settings).bg}
          sourceLabel={model.activePlaylistName ?? tt('sourceAll')}
          onOpenSource={() => setPanel('source')}
          isTv={isTv}
        />
      </div>
      {columnLayout ? null : (
        <div ref={catsRef} onFocusCapture={() => setInCats(true)} style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <GuideCategoryChips {...categories} />
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8, padding: '0 48px', position: 'relative', zIndex: 1 }}>
        {columnLayout ? (
          <div ref={catsRef} onFocusCapture={() => setInCats(true)} style={{ display: 'flex', minHeight: 0 }}>
            <GuideCategoryColumn {...categories} />
          </div>
        ) : null}
        <div data-testid="guide-content" onFocusCapture={() => setInCats(false)} style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {view}
        </div>
      </div>
      {panel === 'source' ? (
        <TvChoicePanel nav={nav} title={tt('pickSource')} options={sourceOptions} value={model.activePlaylistId} onPick={(key) => { model.setActivePlaylist(key); setSelection(null) }} onClose={() => setPanel(null)} />
      ) : null}
      {panel === 'groups' ? (
        <TvGroupPanel
          nav={nav}
          groups={model.groups}
          counts={perGroup}
          value={category}
          opener={groupsOpenerRef.current}
          onPick={(group) => { setTvSettings({ guideCategory: group }); setSelection(null) }}
          onClose={() => setPanel(null)}
        />
      ) : null}
    </div>
  )
}
