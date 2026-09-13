'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getTvGlassMenu, getTvKeyboardPanel, requestBrowseBack, tvHoldHandlers, useTvMode, type BrowsePageProps, type TvGlassMenuTarget,
  playerFrameUrl,
} from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from './live-tv-data'
import { startOfLocalDay, useLiveTvModel } from './live-tv-model'
import { useHubText } from './hub-strings'
import { catchUpAcross, channelSupportsCatchUp, expiresLabel, type CatchUpItem } from './catch-up'
import { topGroupsFromHistory, removeChannelHistoryEntry } from './channel-history'
import {
  Btn,
  ChannelBadge,
  Icon,
  Kicker,
  LT,
  LiveTag,
  LiveTvHeader,
  ProgressBar,
  ScrollRow,
  SectionTitle,
  Tag,
  formatClock,
  heroGradient,
  progressOf,
  surfaceCard,
} from './live-tv-ui'
import { useEpgLoadStatus } from './hooks/useEpgLoadStatus'
import { useSchedules } from './hooks/useSchedules'
import { useIsMobileLayout } from './hooks/useIsMobileLayout'
import { RemindersMenu, encodeChannelParams, useLiveTvChrome, useLiveTvNav } from './live-tv-shell'

/**
 * Live TV-hubben (handoff §1): nu spelas, favoriter, fortsätt titta,
 * rekommenderat, alla kanaler. Inga nya uppslag mot leverantörer — allt är
 * kanallistor, EPG-cachen som redan hämtas och lokal historik.
 */

export { flattenChannels, topGroups } from './live-tv-model'

const MAX_FAVORITES = 12
/** Repriser: hur långt bakåt tablån hämtas, och hur många arkivkanaler som frågas åt gången. */
const REPLAY_DAYS = 3
const MAX_REPLAY_CHANNELS = 200
const MAX_RECOMMENDED = 12
/**
 * Hur många kanaler "Alla kanaler" ritar från början, och hur många varje
 * "Visa fler" lägger till. Taket finns för att korten är dyra: varje rad gör
 * en EPG-uppslagning och ritar en progressbar, och 1 100 rader monterade
 * samtidigt kostade det som betatestaren nu berömmer prestandan för.
 *
 * Men taket fick INTE synas som "det här är alla kanaler". Rubriken skrev ut
 * hela antalet medan listan visade 60, och knappen vidare till rutnätet var
 * borttagen — kanal 61 och uppåt gick inte att nå. Nu står det hur många som
 * visas av hur många, och resten är en knapptryckning bort.
 */
const MAX_ALL_CHANNELS = 60
const ALL_CHANNELS_STEP = 120

interface Props {
  onNavigate: BrowsePageProps['onNavigate']
}

/**
 * Sparad bildruta ur spelaren som kortbakgrund (Jerry 2026-09-06). Finns ingen
 * (kanalen aldrig spelad, eller ingen brygga) svarar servern 404 och bilden
 * döljs — kortet behåller sin gradient. Halv opacitet håller texten läsbar.
 */
function FrameBackdrop({ channel, version }: { channel: M3uChannel; version?: number | string | null }) {
  return (
    <img
      src={playerFrameUrl(channelKey(channel), version ?? null)}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={(event) => { event.currentTarget.style.display = 'none' }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55, borderRadius: 'inherit', pointerEvents: 'none' }}
    />
  )
}

/** Favoritkanaler: sidoscrollande rad på mobil, rutnät på skrivbord. */
function FavoritesLayout({ mobile, tvRow = false, children }: { mobile: boolean; tvRow?: boolean; children: ReactNode }) {
  if (mobile) return <ScrollRow tvRow={tvRow}>{children}</ScrollRow>
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
}

/** TV: två spotlightkort, tre på breda TV-apparater (≥ 1600 px). */
function tvSpotlightCount(): number {
  return typeof window !== 'undefined' && window.innerWidth >= 1600 ? 3 : 2
}

export function LiveTvHub({ onNavigate }: Props) {
  const { h, locale } = useHubText()
  const model = useLiveTvModel()
  const go = useLiveTvNav(onNavigate)
  const { play, chrome } = useLiveTvChrome(model)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)
  const groupMenuRef = useRef<HTMLDivElement | null>(null)
  const isTv = useTvMode()
  /** TV: allt som går att trycka på är en fokusstation (Jerry 2026-09-06). */
  const tvStation = isTv ? { 'data-f': '' } : undefined
  // TV: söket finns kvar (Jerry 2026-09-06, "saknar söken") — fältet är en
  // station som öppnar värdens TV-tangentbord, texten filtrerar Alla kanaler.
  const TvKeyboardPanel = isTv ? getTvKeyboardPanel() : null
  const [searchKeyboardOpen, setSearchKeyboardOpen] = useState(false)
  const searchChipRef = useRef<HTMLButtonElement | null>(null)
  /**
   * Efter Klar i söket: första kanalen i resultatet får fokus (Jerry
   * 2026-09-06); efter Stäng: tillbaka till sökchippet. Utan det föll fokus
   * till body och värdens vakt tog sidomenyn.
   */
  const focusFirstResultSoon = () => {
    let tries = 0
    const attempt = () => {
      const first = document.querySelector<HTMLElement>('[data-live-tv-all-channels] [data-f]')
      if (first) { first.focus({ preventScroll: true }); return }
      if (++tries < 20) window.setTimeout(attempt, 100)
      else searchChipRef.current?.focus({ preventScroll: true })
    }
    window.setTimeout(attempt, 80)
  }
  /**
   * TV: OK på ett kanalkort SPELAR kanalen direkt (Jerry 2026-09-06); håll OK
   * ger hållmenyn — favorit av/på, kanaldetalj, spela. Samma på alla rader.
   */
  const TvGlassMenu = isTv ? getTvGlassMenu() : null
  const [tvMenu, setTvMenu] = useState<TvGlassMenuTarget | null>(null)
  // TV: gruppmenyn är en fokusfälla medan den är öppen, och Back stänger den.
  useEffect(() => {
    if (!isTv || !groupMenuOpen) return
    const onKey = (event: KeyboardEvent) => {
      // Back OCH sidopil stänger (Jerry 2026-09-06: "sidoklick borde stänga
      // den") — fokus tillbaka på väljarknappen.
      if (!['Escape', 'Backspace', 'GoBack', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
      event.preventDefault()
      event.stopPropagation()
      setGroupMenuOpen(false)
      window.setTimeout(() => groupMenuRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }), 0)
    }
    window.addEventListener('keydown', onKey, true)
    const first = groupMenuRef.current?.querySelector<HTMLElement>('[data-f][data-init]') ?? groupMenuRef.current?.querySelector<HTMLElement>('[role="menu"] [data-f]')
    first?.focus({ preventScroll: true })
    return () => window.removeEventListener('keydown', onKey, true)
  }, [isTv, groupMenuOpen])
  useEffect(() => {
    if (!groupMenuOpen) return
    const onDown = (event: MouseEvent) => {
      if (!groupMenuRef.current?.contains(event.target as Node)) setGroupMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [groupMenuOpen])
  const effectiveGroup = activeGroup && model.groups.includes(activeGroup) ? activeGroup : null
  const { channels, nowFor, nowMs, pinnedKeys, pinnedSet, byKey, history } = model
  // Kall cache: hämtningen tar sekunder och kortet stod tyst med "Ingen
  // programinformation", vilket ljuger — tablån var på väg (Jerry 2026-09-03).
  const epgStatus = useEpgLoadStatus(model.epgListId, model.epgUrls)
  // Mobilomgången 2026-09-03 rör BARA mobilen; skrivbordet ska se ut som förut.
  const isMobile = useIsMobileLayout()

  const favorites = useMemo(
    () =>
      pinnedKeys
        .map((key) => byKey.get(key))
        .filter((channel): channel is M3uChannel => Boolean(channel))
        .filter((channel) => !effectiveGroup || channel.group === effectiveGroup)
        .slice(0, MAX_FAVORITES),
    [pinnedKeys, byKey, effectiveGroup],
  )
  /**
   * Repriser: tablån bor i appen sedan lagring v2, så bara de kanaler som
   * FAKTISKT har ett arkiv (Xtream tv_archive) hämtas — och bara bakåt i
   * arkivfönstret. Utan filtret hade hela spellistan frågats efter tre dygns
   * tablå för att hitta en handfull repriser.
   */
  const replayChannels = useMemo(() => channels.filter(channelSupportsCatchUp).slice(0, MAX_REPLAY_CHANNELS), [channels])
  const replayWindow = useMemo(() => {
    const to = startOfLocalDay(nowMs, 1)
    return { from: to - REPLAY_DAYS * 86_400_000, to }
  }, [nowMs])
  const { schedules: replaySchedules } = useSchedules(replayChannels, replayWindow.from, replayWindow.to)
  const catchUp = useMemo<CatchUpItem[]>(
    () => catchUpAcross(replayChannels, replaySchedules, nowMs, 12),
    [replayChannels, replaySchedules, nowMs],
  )
  const recent = useMemo(
    () =>
      history.map((entry) => ({
        entry,
        channel:
          byKey.get(entry.key) ??
          ({ name: entry.name, url: entry.url, group: entry.group, logo: entry.logo, tvgId: entry.tvgId } as M3uChannel),
      })),
    [history, byKey],
  )
  const recommended = useMemo(() => {
    const out: Array<{ channel: M3uChannel; reason: string }> = []
    const skip = new Set([...pinnedKeys, ...history.map((entry) => entry.key)])
    /*
      Kandidaterna inom en grupp RANGORDNAS, de tas inte i spellistans
      ordning.
      Förut plockades de första matchande kanalerna rakt ur listan, och en
      betatestare läste resultatet precis som det såg ut: "just seems to list
      the first x channels for every category". Med en panel där grupperna
      ligger i sändningsordning blev raden alltså listans början, inte ett
      urval.
      Det som finns att rangordna på utan att uppfinna en rekommendationsmotor
      är om något SÄNDS just nu — en kanal med ett pågående program är något
      man kan börja titta på, vilket är hela poängen med raden. Lika kanaler
      sorteras på namn så ordningen är stabil mellan renderingar i stället för
      att följa spellistan.
    */
    for (const group of topGroupsFromHistory(history)) {
      const candidates = channels
        .filter((channel) => channel.group === group && !skip.has(channelKey(channel)))
        .sort((a, b) => {
          const aLive = nowFor(a).now ? 0 : 1
          const bLive = nowFor(b).now ? 0 : 1
          return aLive - bLive || a.name.localeCompare(b.name)
        })
      for (const channel of candidates) {
        if (skip.has(channelKey(channel))) continue
        // Utan pågående program: högst fyra sådana, så raden inte fylls med
        // kanaler man inte kan börja titta på nu.
        if (!nowFor(channel).now && out.length >= 4) continue
        out.push({ channel, reason: h('hubRecommendedBecause', { group }) })
        skip.add(channelKey(channel))
        if (out.length >= MAX_RECOMMENDED) return out
      }
    }
    // Komplettera med kanaler i samma grupp som favoriterna.
    for (const key of pinnedKeys) {
      const fav = byKey.get(key)
      if (!fav) continue
      for (const channel of channels) {
        if (channel.group !== fav.group || skip.has(channelKey(channel))) continue
        out.push({ channel, reason: h('hubRecommendedFavourite', { channel: fav.name }) })
        skip.add(channelKey(channel))
        if (out.length >= MAX_RECOMMENDED) return out
      }
    }
    return out
  }, [history, pinnedKeys, channels, byKey, nowFor, h])
  const needle = query.trim().toLowerCase()
  const [visibleChannelCount, setVisibleChannelCount] = useState(MAX_ALL_CHANNELS)
  const filteredChannels = useMemo(
    () => channels
      .filter((channel) => !effectiveGroup || channel.group === effectiveGroup)
      .filter((channel) => !needle || channel.name.toLowerCase().includes(needle) || (channel.group ?? '').toLowerCase().includes(needle)),
    [channels, effectiveGroup, needle],
  )
  useEffect(() => {
    setVisibleChannelCount(MAX_ALL_CHANNELS)
  }, [effectiveGroup, needle])
  const shownChannels = useMemo(
    () => filteredChannels.slice(0, visibleChannelCount),
    [filteredChannels, visibleChannelCount],
  )
  const hero = useMemo(
    () =>
      favorites.find((channel) => nowFor(channel).now) ??
      favorites[0] ??
      recent[0]?.channel ??
      channels.find((channel) => nowFor(channel).now) ??
      channels.find((channel) => Boolean(channel.tvgId)) ??
      channels[0] ??
      null,
    [favorites, recent, channels, nowFor],
  )

  const openChannel = (channel: M3uChannel) => go('channel', encodeChannelParams(channel))
  // recentKey: kortet står i Fortsätt titta — hållmenyn får då även "Ta bort"
  // (Jerry 2026-09-06).
  const tvChannelHandlers = (channel: M3uChannel, recentKey?: string) => (isTv ? tvHoldHandlers(
    () => play({ channel }),
    (element) => setTvMenu({
      title: channel.name,
      element,
      actions: [
        { key: 'play', label: h('hubWatchNow'), run: () => play({ channel }) },
        { key: 'pin', label: pinnedSet.has(channelKey(channel)) ? h('hubUnpin') : h('hubPin'), run: () => model.togglePin(channel) },
        // Egen sträng, inte sidrubriken: raden hette "Channel", vilket inte är
        // något man kan göra (testfeedback 2026-09-11: "there is an option that
        // simply says 'channel'").
        { key: 'info', label: h('hubChannelDetails'), run: () => openChannel(channel) },
        ...(recentKey ? [{ key: 'remove', label: h('hubRemoveRecent'), run: () => removeChannelHistoryEntry(recentKey) }] : []),
      ],
    }),
  ) : {})
  const formatWatched = (ms: number) => {
    const sameDay = new Date(ms).toDateString() === new Date(nowMs).toDateString()
    const time = formatClock(ms, locale)
    return h('hubWatchedAt', { time: sameDay ? time : `${h('hubYesterday')} ${time}` })
  }

  const epgButton = (
    <Btn variant="secondary" small onClick={() => go('epg')} tvStation={isTv ? { 'data-f': '', 'data-live-tv-epg': '', 'data-f-left': '[data-live-tv-group], [data-live-tv-search]', 'data-f-right': '[data-live-tv-bell]' } : undefined}>
      <Icon.Calendar size={14} /> {h('openEpg')}
    </Btn>
  )

  /* Sök och gruppväljare bryts ut ur rubriken: på mobil ritas de i stället
     som en filterrad precis ovanför "Alla kanaler" (Jerry 2026-09-03). Det är
     den sektionen de filtrerar, och rubriken blev annars tre rader hög innan
     man ens sett en kanal. Skrivbordet har plats och behåller dem uppe i
     rubriken. Bara EN av de två platserna renderas åt gången, så den delade
     `groupMenuRef` pekar alltid på den öppna väljaren. */
  const searchField = isTv ? (
    TvKeyboardPanel ? (
      <button
        type="button"
        ref={searchChipRef}
        {...(tvStation ?? {})}
        data-live-tv-search=""
        /* Faller vidare till EPG när gruppväljaren inte finns: den renderas
           bara när listan HAR grupper (`model.groups.length > 0`), och utan
           den bröts kedjan sök → grupp → EPG mitt itu — EPG gick då bara att
           nå via geometrin från innehållet, om ens det (testfeedback
           2026-09-11: "open epg can not be accessed with remote").
           Motorn tar första SYNLIGA träffen, så en kommaväljare degraderar av
           sig själv (lib/tv-focus.tsx, explicitNext). */
        data-f-right="[data-live-tv-group], [data-live-tv-epg]"
        onClick={() => setSearchKeyboardOpen(true)}
        className="truncate"
        /* Bredare på TV (Jerry 2026-09-12: "söken, texten får ej plats hela
           vägen och kapas lite"). 260–360 räckte till "Sök" men inte till
           en skriven fråga eller den längre engelska platshållaren, och
           `truncate` klippte då i stället för att visa. 320–520 ger plats
           utan att tränga gruppväljaren och EPG-knappen i samma rad. */
        style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 999, border: '1px solid transparent', background: LT.neutral, padding: '0 18px', height: 36, minWidth: 320, maxWidth: 520, color: query ? LT.text : LT.muted, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}
      >
        <Icon.Search size={14} />
        <span className="truncate">{query || h('searchPlaceholder')}</span>
      </button>
    ) : null
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, border: `1px solid ${LT.line}`, background: 'rgba(255,255,255,0.04)', padding: '0 12px', height: 36, ...(isMobile ? { flex: 1, minWidth: 0 } : { minWidth: 220 }) }}>
      <Icon.Search size={14} />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={h('searchPlaceholder')}
        aria-label={h('search')}
        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: LT.text, fontSize: 13, fontFamily: 'inherit' }}
      />
    </div>
  )

  const groupPicker = model.groups.length > 0 ? (
    <div ref={groupMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
      <Btn
        variant={effectiveGroup || isTv ? 'secondary' : 'ghost'}
        small
        pressed={groupMenuOpen}
        onClick={() => setGroupMenuOpen((open) => !open)}
        // ▸ från gruppväljaren går till EPG-knappen i högerkanten, inte ner i
        // korten (Jerry 2026-09-06). ◂ tillbaka till söket.
        tvStation={isTv ? { 'data-f': '', 'data-live-tv-group': '', 'data-f-right': '[data-live-tv-epg]', 'data-f-left': '[data-live-tv-search]' } : undefined}
        // TV: chipfärg (Jerry 2026-09-06) — samma glas som taggarna, ingen kantlinje.
        style={isTv ? { background: LT.neutral, borderColor: 'transparent', color: LT.text } : undefined}
      >
        <span className="truncate" style={{ maxWidth: isMobile ? 120 : 220, display: 'inline-block', verticalAlign: 'bottom' }}>{effectiveGroup ?? h('hubAllGroups')}</span>
        <Icon.ChevronDown size={14} />
      </Btn>
      {groupMenuOpen ? (
        /* HÖGERSTÄLLD och skärmbred på mobil (Jerry 2026-09-03). Med `left: 0`
           föll listan ut från en knapp som börjar långt ut till höger: 240 px
           meny från x=261 slutade på x=501 i en 360 px vid skärm, så 141 px av
           varje kategorinamn låg utanför kanten. Knappen sitter sist i
           filterraden, alltså i innehållets högerkant, så `right: 0` plus
           skärmbredd minus sidmarginalerna (2 × 16 px) landar exakt innanför
           båda kanterna. */
        <div role="menu" {...(isTv ? { 'data-panel-root': '', 'data-scroll': '' } : {})} style={{ position: 'absolute', top: 'calc(100% + 6px)', zIndex: 50, maxHeight: 360, overflowY: 'auto', background: '#0b1020', border: `1px solid ${LT.line}`, borderRadius: LT.radiusMd, padding: 6, boxShadow: '0 18px 40px rgba(0,0,0,0.45)', ...(isMobile ? { right: 0, width: 'calc(100vw - 32px)' } : { left: 0, minWidth: 240 }) }}>
          {[null, ...model.groups].map((group) => (
            <button
              key={group ?? '__all'}
              type="button"
              {...(tvStation ?? {})}
              {...(isTv && group === effectiveGroup ? { 'data-init': '' } : {})}
              onClick={() => { setActiveGroup(group); setGroupMenuOpen(false) }}
              className="truncate"
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: LT.radiusSm, border: 0, background: group === effectiveGroup ? 'rgba(255,255,255,0.10)' : 'transparent', color: group === effectiveGroup ? LT.text : LT.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {group ?? h('hubAllGroups')}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null

  const filterRow = searchField || groupPicker ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {searchField}
      {groupPicker}
    </div>
  ) : null

  const header = (
    <LiveTvHeader
      title={h('hubTitle')}
      backLabel={h('back')}
      /* EPG och påminnelseklockan ligger på SAMMA rad, aldrig på var sitt håll
         i rubrikens radbrytning (Jerry 2026-09-03). På mobil är det en egen
         rad under sökfältet: EPG längst till vänster, klockan längst till
         höger. På skrivbord finns plats kvar på topprowen, och den är
         godkänd som den är — där ligger de kvar uppe till höger.

         Rutnätsikonen är borta: 'grid' fanns bara i LiveTvView-unionen,
         skalet hade ingen renderare för den, så knappen ledde ingenstans. */
      /* Mobil (Jerry 2026-09-07): EPG-chipet och klockan till höger på SAMMA rad
         som titeln och Tillbaka-pilen, inte på en egen rad under. */
      right={<>{epgButton}<RemindersMenu model={model} onOpenChannel={openChannel} tvStation={isTv ? { 'data-f': '', 'data-live-tv-bell': '', 'data-f-left': '[data-live-tv-epg]' } : undefined} /></>}
      // Tillbaka-pil bredvid rubriken på ALLA enheter (Jerry 2026-09-06/07,
      // 2026-09-07 "Tillbaka knapp saknas före Live TV-titeln" på skrivbordet):
      // värden stänger sidan. Menypillret är dolt på Live TV, så pilen är
      // vägen ut även med mus.
      onBack={() => requestBrowseBack()}
      backTvStation={isTv ? { 'data-f': '', 'data-init': '' } : undefined}
    >
      {isMobile ? null : filterRow}
    </LiveTvHeader>
  )

  if (channels.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: LT.text }}>
        {header}
        <div style={{ ...surfaceCard, padding: 24 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{h('hubEmptyTitle')}</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: LT.muted }}>{h('hubEmptyBody')}</p>
        </div>
      </div>
    )
  }

  const heroInfo = hero ? nowFor(hero) : { now: null, next: null, later: null }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: LT.text }}>
      {/* Egen keyframe: pluginets buntar får inga klasser ur appens Tailwind. */}
      <style>{'@keyframes lumio-livetv-spin{to{transform:rotate(360deg)}}'}</style>
      {header}

      {hero && !needle && isTv ? (
        /* TV (Jerry 2026-09-06): det stora kortet blev enormt på en TV. I
           stället en rad kompakta spotlightkort — heron först, sedan
           favoriter och senast sedda — två på bredden, tre på breda TV-apparater.
           Varje kort är EN station: OK spelar kanalen. Programinfo och förlopp
           när EPG:n finns, annars gruppen. */
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tvSpotlightCount()}, minmax(0, 1fr))`, gap: 16 }} data-row="">
          {(() => {
            const seen = new Set<string>()
            const picks: M3uChannel[] = []
            for (const candidate of [hero, ...favorites, ...recent.map((r) => r.channel), ...channels.filter((c) => nowFor(c).now)]) {
              const key = channelKey(candidate)
              if (seen.has(key)) continue
              seen.add(key)
              picks.push(candidate)
              if (picks.length >= tvSpotlightCount()) break
            }
            return picks.map((channel) => {
              const info = nowFor(channel)
              return (
                <div
                  key={channelKey(channel)}
                  role="button"
                  tabIndex={0}
                  {...(tvStation ?? {})}
                  onClick={() => play({ channel })}
                  {...tvChannelHandlers(channel)}
                  className="cursor-pointer transition hover:brightness-125"
                  style={{ ...heroGradient, padding: 18, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <ChannelBadge channel={channel} size={56} radius={LT.radiusMd} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="truncate" style={{ fontSize: 18, fontWeight: 600 }}>{channel.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {info.now ? <LiveTag label={h('hubLive')} /> : null}
                        {channel.group ? <Tag>{channel.group}</Tag> : null}
                      </div>
                    </div>
                    <span style={{ color: LT.text, opacity: 0.9 }}><Icon.Play size={22} /></span>
                  </div>
                  <div className="truncate" style={{ fontSize: 15, color: LT.text }}>
                    {info.now ? info.now.title : (epgStatus === 'loading' ? h('hubLoadingEpg') : h('hubNoProgramme'))}
                  </div>
                  {info.now ? (
                    <>
                      <div style={{ fontSize: 12, color: LT.muted }}>
                        {`${formatClock(info.now.start, locale)}–${formatClock(info.now.stop, locale)} · ${h('minutesLeft', { min: Math.max(0, Math.round((info.now.stop - nowMs) / 60_000)) })}`}
                      </div>
                      <ProgressBar value={progressOf(info.now.start, info.now.stop, nowMs)} width="100%" />
                    </>
                  ) : null}
                  {info.next ? (
                    <div className="truncate" style={{ fontSize: 12, color: LT.dim }}>{h('nextAt', { title: info.next.title, time: formatClock(info.next.start, locale) })}</div>
                  ) : null}
                </div>
              )
            })
          })()}
        </div>
      ) : null}

      {hero && !needle && !isTv ? (
        <div className="grid gap-4">
          {/* minWidth 0 + brytbart namn: kortet är ENDA barnet i ett
              `grid`-spår, och ett auto-spår blir minst så brett som barnets
              min-content. Rubriken hade `truncate` (white-space: nowrap), och
              ett långt kanalnamn i 30 px gav 350 px min-content — spåret växte
              till 400 px i en 328 px spalt och sköt hela sidan i sidled på
              telefonen (mätt 2026-09-03: scrollWidth 416 mot clientWidth 360).
              På mobil bryter namnet rad i mindre grad i stället; skrivbordet
              har plats och behåller en rad med ellips. */}
          <div style={{ ...heroGradient, padding: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 220, justifyContent: 'center', ...(isMobile ? { minWidth: 0 } : null) }}>
            {/* Plats RESERVERAD för det som dyker upp när EPG:n landar
                (Jerry 2026-09-03): live-taggen, förloppsraden och
                nästa-programmet ritas först när `now` finns, och utan
                reservationen växte kortet i höjd flera tiotal pixlar och
                sköt resten av sidan nedåt mitt i tittandet. Måtten är
                elementens egna: taggen 21 px (11 px text, 3 px padding),
                förloppet 4 px, nästa-raden 16 px (12 px text). */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {heroInfo.now ? <LiveTag label={h('hubLive')} /> : null}
              {hero.group ? <Tag>{hero.group}</Tag> : null}
              {model.locked.has(channelKey(hero)) ? <Tag variant="outline"><Icon.Lock /> {h('locked')}</Tag> : null}
            </div>
            <h2
              className={isMobile ? undefined : 'truncate'}
              style={{
                fontSize: isMobile ? 20 : 30,
                margin: 0,
                fontWeight: 600,
                lineHeight: isMobile ? 1.25 : 1.15,
                ...(isMobile ? { minWidth: 0, overflowWrap: 'anywhere' as const } : null),
              }}
            >
              {heroInfo.now?.title ?? hero.name}
            </h2>
            <div style={{ fontSize: 13, color: LT.muted }}>
              {heroInfo.now
                ? `${hero.name} · ${formatClock(heroInfo.now.start, locale)}–${formatClock(heroInfo.now.stop, locale)} · ${h('minutesLeft', { min: Math.max(0, Math.round((heroInfo.now.stop - nowMs) / 60_000)) })}`
                : `${hero.name} · ${epgStatus === 'loading' ? h('hubLoadingEpg') : h('hubNoProgramme')}`}
            </div>
            {heroInfo.now ? <ProgressBar value={progressOf(heroInfo.now.start, heroInfo.now.stop, nowMs)} width={320} /> : null}
            {heroInfo.next ? (
              <div style={{ fontSize: 12, color: LT.dim }}>{h('nextAt', { title: heroInfo.next.title, time: formatClock(heroInfo.next.start, locale) })}</div>
            ) : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Btn variant="primary" onClick={() => play({ channel: hero })}>
                {h('hubWatchNow')} <Icon.ArrowRight />
              </Btn>
              <Btn variant="secondary" onClick={() => openChannel(hero)}>
                {h('channelTitle')}
              </Btn>
              <Btn variant="ghost" icon onClick={() => model.togglePin(hero)} ariaLabel={pinnedSet.has(channelKey(hero)) ? h('hubUnpin') : h('hubPin')} style={{ color: pinnedSet.has(channelKey(hero)) ? LT.accent : undefined }}>
                <Icon.Heart filled={pinnedSet.has(channelKey(hero))} />
              </Btn>
            </div>
          </div>
        </div>
      ) : null}

      <section>
        <SectionTitle title={h('hubFavorites')} sub={favorites.length > 0 ? h('channelsCount', { count: favorites.length }) : undefined} />
        {favorites.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: LT.muted }}>{h('hubFavoritesEmpty')}</p>
        ) : (
          /* Sidoscrollande rad på mobil, rutnät på skrivbord (Jerry
             2026-09-03). Rutnätet gav två smala kolumner där varje kort blev
             lägre än sitt innehåll och alla tre rader staplades på höjd;
             raden håller korten 200 px breda och låter nästa kort kika in i
             kanten, precis som Fortsätt titta strax nedanför. Samma
             kortinnehåll i båda lägena. */
          <FavoritesLayout mobile={isMobile || isTv} tvRow={isTv}>
            {favorites.map((channel) => {
              const info = nowFor(channel)
              return (
                <div
                  key={channelKey(channel)}
                  role="button"
                  tabIndex={0}
                  {...(tvStation ?? {})}
                  onClick={() => openChannel(channel)}
                  {...(isTv ? tvChannelHandlers(channel) : {
                    onKeyDown: (event: React.KeyboardEvent) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openChannel(channel)
                      }
                    },
                  })}
                  className="cursor-pointer transition hover:brightness-125"
                  style={{
                    ...surfaceCard,
                    position: 'relative',
                    overflow: 'hidden',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    ...(isMobile || isTv ? { width: isTv ? 260 : 200, flexShrink: 0, scrollSnapAlign: 'start' as const } : null),
                  }}
                >
                  <FrameBackdrop channel={channel} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChannelBadge channel={channel} size={40} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{channel.name}</div>
                      {info.now ? <div style={{ marginTop: 2 }}><LiveTag label={h('hubLive')} /></div> : null}
                    </div>
                    {/* TV: hjärtat är ingen egen station — kortet är en. */}
                    {!isTv ? (
                    <Btn
                      variant="ghost"
                      icon
                      onClick={() => model.togglePin(channel)}
                      ariaLabel={h('hubUnpin')}
                      title={h('hubUnpin')}
                      style={{ color: LT.accent, width: 30, height: 30 }}
                    >
                      <Icon.Heart size={16} filled />
                    </Btn>
                    ) : <span style={{ color: LT.accent, display: 'inline-flex' }}><Icon.Heart size={16} filled /></span>}
                  </div>
                  <div className="truncate" style={{ fontSize: 12, color: 'rgba(243,244,248,0.85)' }}>{info.now?.title ?? channel.group}</div>
                  <div className="truncate" style={{ fontSize: 11, color: LT.dim }}>
                    {info.next ? h('nextAt', { title: info.next.title, time: formatClock(info.next.start, locale) }) : h('hubNoProgramme')}
                  </div>
                </div>
              )
            })}
          </FavoritesLayout>
        )}
      </section>

      <section>
        <SectionTitle title={h('hubContinue')} sub={catchUp.length > 0 ? h('hubContinueCatchUp') : h('hubContinueRecent')} />
        {catchUp.length === 0 && recent.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: LT.muted }}>{h('hubContinueEmpty')}</p>
        ) : (
          <ScrollRow tvRow={isTv}>
            {catchUp.map((item) => {
              const left = expiresLabel(item.expiresAt, nowMs)
              return (
                <button
                  key={`${channelKey(item.channel)}-${item.programme.start}`}
                  type="button"
                  {...(tvStation ?? {})}
                  data-live-tv-tile-card=""
                  onClick={() => play({ channel: item.channel, url: item.url, label: `${item.channel.name} · ${item.programme.title}` })}
                  className="transition hover:brightness-110"
                  style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, background: 'transparent', border: 0, padding: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', scrollSnapAlign: 'start', fontFamily: 'inherit' }}
                >
                  <div data-live-tv-tile="" style={{ width: '100%', height: 124, borderRadius: LT.radiusMd, background: 'linear-gradient(135deg, #1b2540, #2a3552)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChannelBadge channel={item.channel} size={44} radius={LT.radiusMd} />
                    <span style={{ position: 'absolute', right: 8, top: 8 }}><Tag variant="accent">{h('catchUp')}</Tag></span>
                    <span style={{ position: 'absolute', left: 8, bottom: 8, color: LT.text, opacity: 0.9 }}><Icon.Play size={22} /></span>
                  </div>
                  <div className="truncate" style={{ width: '100%', fontSize: 13, fontWeight: 500 }}>{item.programme.title}</div>
                  <div className="truncate" style={{ fontSize: 11, color: LT.dim }}>
                    {item.channel.name} · {formatClock(item.programme.start, locale)} · {Math.round((item.programme.stop - item.programme.start) / 60_000)} min
                  </div>
                  <div style={{ fontSize: 11, color: LT.dim }}>{left.days >= 1 ? h('availableDays', { days: left.days }) : h('availableHours', { hours: left.hours })}</div>
                </button>
              )
            })}
            {recent.map(({ entry, channel }) => {
              const info = nowFor(channel)
              return (
                <button
                  key={entry.key}
                  type="button"
                  {...(tvStation ?? {})}
                  data-live-tv-tile-card=""
                  onClick={() => play({ channel })}
                  {...tvChannelHandlers(channel, entry.key)}
                  className="transition hover:brightness-110"
                  style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, background: 'transparent', border: 0, padding: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer', scrollSnapAlign: 'start', fontFamily: 'inherit' }}
                >
                  <div data-live-tv-tile="" style={{ width: '100%', height: 124, borderRadius: LT.radiusMd, background: 'linear-gradient(135deg, #1b2540, #2a3552)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FrameBackdrop channel={channel} version={entry.watchedAt} />
                    <ChannelBadge channel={channel} size={44} radius={LT.radiusMd} />
                    <span style={{ position: 'absolute', left: 8, bottom: 8, color: LT.text, opacity: 0.9 }}><Icon.Play size={22} /></span>
                    {info.now ? (
                      <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, height: 3, background: 'rgba(0,0,0,0.4)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(progressOf(info.now.start, info.now.stop, nowMs) * 100)}%`, background: LT.accent }} />
                      </div>
                    ) : null}
                  </div>
                  <div className="truncate" style={{ width: '100%', fontSize: 13, fontWeight: 500 }}>{info.now?.title ?? channel.name}</div>
                  <div className="truncate" style={{ fontSize: 11, color: LT.dim }}>
                    {channel.name}
                    {channel.group ? ` · ${channel.group}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: LT.dim }}>{formatWatched(entry.watchedAt)}</div>
                </button>
              )
            })}
          </ScrollRow>
        )}
      </section>

      {recommended.length > 0 ? (
        <section>
          <SectionTitle title={h('hubRecommended')} />
          <ScrollRow tvRow={isTv}>
            {recommended.map(({ channel, reason }) => {
              const info = nowFor(channel)
              return (
                <button
                  key={channelKey(channel)}
                  type="button"
                  {...(tvStation ?? {})}
                  onClick={() => openChannel(channel)}
                  {...tvChannelHandlers(channel)}
                  className="transition hover:brightness-125"
                  style={{ ...surfaceCard, width: 240, flexShrink: 0, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4, color: 'inherit', textAlign: 'left', cursor: 'pointer', scrollSnapAlign: 'start', fontFamily: 'inherit' }}
                >
                  <Kicker>{reason}</Kicker>
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{info.now?.title ?? channel.name}</div>
                  <div className="truncate" style={{ fontSize: 12, color: LT.dim }}>
                    {channel.name} · {info.now ? h('guideNow') : info.next ? formatClock(info.next.start, locale) : channel.group}
                  </div>
                </button>
              )
            })}
          </ScrollRow>
        </section>
      ) : null}

      <section>
        {/* Luft ner till rubriken: filterraden satt annars klistrad direkt på
            "Alla kanaler" (Jerry 2026-09-03). SectionTitle har bara marginal
            nedåt, så avståndet måste komma härifrån. */}
        {isMobile ? <div style={{ marginBottom: 14 }}>{filterRow}</div> : null}
        <SectionTitle
          title={h('hubAllChannels')}
          /* Underrubriken måste skilja "1 100 kanaler finns" från "1 100
             kanaler visas". Den skrev det förra och listan gjorde det senare. */
          sub={shownChannels.length < filteredChannels.length
            ? h('hubShowingOf', {
                shown: shownChannels.length,
                total: filteredChannels.length,
                group: effectiveGroup ?? h('hubAllGroups'),
              })
            : h('channelsIn', { count: filteredChannels.length, group: effectiveGroup ?? h('hubAllGroups') })}
        />
        {/*
          TRE KOLUMNER PÅ TV (Jerry 2026-09-11: "kanaler i TVen, kanske bra att
          ha en 3 grid, istället för 2").

          Brytpunkterna mäter fönstret, och en TV-webview rapporterar ~960 px —
          alltså `sm:grid-cols-2` och två breda rader på en 55-tummare, trots
          att ytan rymmer tre med råge. TV har därför ett eget tal i stället för
          att hänga på en bredd som ljuger. Skrivbord och mobil är oförändrade.
        */}
        <div className={isTv ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'} data-live-tv-all-channels="">
          {shownChannels.map((channel) => {
            const info = nowFor(channel)
            const isPinned = pinnedSet.has(channelKey(channel))
            return (
              <div
                key={channelKey(channel)}
                role="button"
                tabIndex={0}
                {...(tvStation ?? {})}
                onClick={() => openChannel(channel)}
                {...(isTv ? tvChannelHandlers(channel) : {
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openChannel(channel)
                    }
                  },
                })}
                className="cursor-pointer transition hover:brightness-125"
                style={{ ...surfaceCard, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
              >
                <ChannelBadge channel={channel} size={44} radius={LT.radiusMd} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{channel.name}</div>
                    {info.now ? <LiveTag label={h('hubLive')} /> : null}
                  </div>
                  <div className="truncate" style={{ fontSize: 12, color: LT.muted }}>{info.now?.title ?? channel.group}</div>
                  {info.now ? (
                    <div style={{ marginTop: 6, maxWidth: 220 }}>
                      <ProgressBar value={progressOf(info.now.start, info.now.stop, nowMs)} height={3} />
                    </div>
                  ) : null}
                </div>
                {/*
                  INGA KNAPPAR PÅ TV (testfeedback 2026-09-11: "there are
                  favourite and info buttons on each item. But cannot be
                  selected").

                  Raden är EN fokusstation — knapparna inuti den har ingen egen,
                  och tre stationer per rad gånger hundratals rader hade dessutom
                  gjort listan omöjlig att pila igenom. Med fjärren låg de alltså
                  där som knappar man inte kan trycka på, vilket läser som
                  trasigt.

                  Åtgärderna finns kvar och är inte svårare att nå: OK spelar,
                  HÅLL OK ger hela menyn (spela, favorit, kanaldetalj). Samma
                  regel som appens Fortsätt titta, där X:et också bara finns
                  utanför TV.
                */}
                {isTv ? null : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={(event) => event.stopPropagation()}>
                  <Btn
                    variant="ghost"
                    icon
                    onClick={() => model.togglePin(channel)}
                    ariaLabel={isPinned ? h('hubUnpin') : h('hubPin')}
                    title={isPinned ? h('hubUnpin') : h('hubPin')}
                    style={{ color: isPinned ? LT.accent : undefined, width: 32, height: 32 }}
                  >
                    <Icon.Heart size={16} filled={isPinned} />
                  </Btn>
                  <Btn variant="ghost" icon onClick={() => openChannel(channel)} ariaLabel={h('channelTitle')} title={h('channelTitle')} style={{ width: 32, height: 32 }}>
                    <Icon.Info size={16} />
                  </Btn>
                  <Btn variant="solid" icon onClick={() => play({ channel })} ariaLabel={h('hubWatchNow')} title={h('hubWatchNow')} style={{ width: 34, height: 34 }}>
                    <Icon.Play size={13} />
                  </Btn>
                </div>
                )}
              </div>
            )
          })}
        </div>
        {/*
          Vägen till kanal 61 och uppåt. En knapp och inte paginering: den är
          TV-fokuserbar med en enda station, den behåller scrollpositionen, och
          den ger EN modell på alla enheter i stället för sidor på mobil och
          något annat med fjärren. Gruppväljaren och sökfältet är fortfarande
          de snabba hoppen i en lista på tusen kanaler.
        */}
        {shownChannels.length < filteredChannels.length ? (
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            <Btn
              variant="secondary"
              onClick={() => setVisibleChannelCount((count) => count + ALL_CHANNELS_STEP)}
              tvStation={isTv ? { 'data-f': '' } : undefined}
            >
              {h('hubShowMore')}
            </Btn>
          </div>
        ) : null}
      </section>

      {chrome}
      {TvGlassMenu && tvMenu ? <TvGlassMenu target={tvMenu} onClose={() => setTvMenu(null)} /> : null}
      {TvKeyboardPanel && searchKeyboardOpen ? (
        <div data-live-tv-host-ui="">
        <TvKeyboardPanel
          title={h('search')}
          placeholder={h('searchPlaceholder')}
          initial={query}
          onDone={(value) => { setQuery(value); setSearchKeyboardOpen(false); if (value.trim()) focusFirstResultSoon(); else searchChipRef.current?.focus({ preventScroll: true }) }}
          onClose={() => { setSearchKeyboardOpen(false); window.setTimeout(() => searchChipRef.current?.focus({ preventScroll: true }), 50) }}
        />
        </div>
      ) : null}
    </div>
  )
}
