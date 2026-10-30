'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type JSX, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { channelKey, getLiveTvLogoSrc, type M3uChannel } from '../live-tv-data'
import { formatClock, progressOf } from '../live-tv-ui'
import { isReminded } from '../reminders'
import { useTvMode } from '@/lib/plugin-sdk'
import type { TvViewProps } from './tv-shell'
import { Icons, TV, dp, station, useTvClockNode } from './tv-ui'
import { useTvText, type TvStringKey } from './tv-strings'
import { MORE_GROUPS, useGuideGroups } from './tv-guide-shared'
import { groupCounts } from './group-chips'
import { useGroupPicker } from './tv-group-picker'
import { holdMenu, okAction } from './programme-actions'
import { useProgrammeArt } from './programme-art'
import { useRemindersVersion } from './guide-nowsen-view'
import { useTint } from './tint'
import { FOCUS_BTN, FOCUS_CARD, V2, mixHex, v2Ambient, v2Bg } from './v2-tokens'
import { KeyCap, LivePill, LogoPlate, NoArt, V2FocusStyle } from './v2-ui'
import { AccentTag, HubEmptyState, HubGreeting, HubPlaylistPill, V2Progress } from './hub-shared'
import { useExperienceRows, type XpItem, type XpRowId } from './hub-experience-data'
import { xpInitial, xpNavReduce, xpNormalise, type XpKey, type XpNavState } from './hub-experience-nav'
import { CutoutLayer } from './cutout-layer'
import { LivePreviewArt } from './live-preview-art'

/**
 * KANALER, LAYOUT UPPLEVELSE (handoff v2 "Screen 1 – Live TV Hem v3").
 *
 * Ambient tonbakgrund, hero (kicker, titel, meta, beskrivning, knapprad eller
 * tangentlegend), kategorichips och fem rader. Navigeringen är egen: pilarna
 * fångas i vyns `onKeyDown` och går genom den rena reducern
 * (`hub-experience-nav.ts`); komponenten flyttar sedan DOM-fokus till
 * stationen reducern pekar på. Där reducern inte har något att göra (◂ längst
 * till vänster, ▲ på heron) släpps tangenten till appens fokusmotor, så att
 * rälsen och topraden (spellista, sök) går att nå med fjärren.
 *
 * Alla kort är stationer (`data-xp` = adressen) så att musen och värdens
 * motor kan landa på dem; `onFocus` för tillbaka adressen till tillståndet.
 */

const NO_CHANNEL: M3uChannel = { name: '', logo: null, group: '', url: '', tvgId: null }
const HERO_DEBOUNCE_MS = 300
const EASE = 'cubic-bezier(.2,.8,.2,1)'

/** Radmått ur README "Rows" (+ prototypens extra höjd för spegling/bildtext). */
const ROW: Record<XpRowId, { w: number; h: number; gap: number; extra: number; radius: number; poster?: boolean }> = {
  continue: { w: 420, h: 236, gap: 22, extra: 30, radius: 16 },
  onNow: { w: 440, h: 248, gap: 20, extra: 46, radius: 16, poster: true },
  yours: { w: 250, h: 160, gap: 18, extra: 76, radius: 22 },
  soon: { w: 380, h: 210, gap: 20, extra: 30, radius: 16 },
  explore: { w: 320, h: 180, gap: 20, extra: 30, radius: 16 },
}
const ROW_HEAD = 64

/** Kategorins färg i Utforska (README: Sport, Nyheter, Film, Barn, Dokumentär, övrigt). */
export function categoryTint(name: string): string {
  const n = name.toLowerCase()
  if (/sport/.test(n)) return V2.categoryTints.sport
  if (/news|nyhet|nachricht|noticia|info/.test(n)) return V2.categoryTints.news
  if (/film|movie|cinema|kino|cine/.test(n)) return V2.categoryTints.film
  if (/kid|barn|child|kinder|enfant|infantil|cartoon/.test(n)) return V2.categoryTints.kids
  if (/doc|dok/.test(n)) return V2.categoryTints.docs
  return V2.categoryTints.other
}

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const
const clamp2: CSSProperties = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }

export function HubExperience({ model, nav, settings }: TvViewProps): JSX.Element {
  const { tt, locale } = useTvText()
  const isTv = useTvMode()
  const clock = useTvClockNode(locale)
  void useRemindersVersion()
  const bg = v2Bg(settings.liveBackground)

  const [chip, setChip] = useState<string | null>(null)
  const chipItems = useGuideGroups(model, tt, chip)
  const counts = useMemo(() => groupCounts(model.channels), [model.channels])
  const groupPicker = useGroupPicker({ nav, phone: false, groups: model.groups, counts, value: chip, onPick: setChip })
  const { featured, rows } = useExperienceRows(model, chip)

  const heroBtns = featured ? (featured.channel ? 3 : 2) : 0
  const dims = { heroBtns, chips: chipItems.length, rowLens: rows.map((r) => r.items.length) }
  const [rawNav, setNav] = useState<XpNavState>(() => xpInitial(rows.length))
  const s = xpNormalise(rawNav, dims)
  // DOM-fokus ligger på en av vyns stationer (ringarna ritas ur tillståndet, så
  // utan den här flaggan hade heron visat en ring medan fokus stod i topraden).
  const [active, setActive] = useState(false)

  const current: XpItem | null = s.zone === 'rows' ? rows[s.row]?.items[s.cols[s.row] ?? 0] ?? null : featured
  // Heron byter innehåll först när fokus stått still i 300 ms (inget blinkande vid skrubbning).
  const [heroKey, setHeroKey] = useState<string | null>(() => current?.key ?? null)
  const currentKey = current?.key ?? null
  useEffect(() => {
    if (currentKey === heroKey) return
    // Första innehållet (kanalerna kom efter monteringen) visas direkt.
    if (heroKey === null) { setHeroKey(currentKey); return }
    const t = window.setTimeout(() => setHeroKey(currentKey), HERO_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [currentKey, heroKey])
  const heroItem = useMemo(() => {
    if (featured?.key === heroKey) return featured
    for (const row of rows) for (const item of row.items) if (item.key === heroKey) return item
    return current
  }, [featured, rows, heroKey, current])

  // Senaste värden för lager-/tangenthanterarna (de registreras sällan).
  const rootRef = useRef<HTMLDivElement | null>(null)
  /**
   * SKRIVBORDET SCROLLAR SOM APPENS HEMRADER (Jerry 2026-10-30): sidan rullar
   * fritt lodrätt, varje rad vågrätt med styrplattan, hovring tänder bara
   * kortet. TV:n behåller handoffens stegvisa rader (fokuserad rad överst,
   * coverflow) eftersom fjärren bara har pilar.
   */
  const native = !isTv
  const live = useRef({ s, dims })
  live.current = { s, dims }
  const focusAt = (st: XpNavState) => {
    const id = st.zone === 'hero' ? `hero-${st.heroBtn}` : st.zone === 'chips' ? `chip-${st.chipIdx}` : `r${st.row}-${st.cols[st.row] ?? 0}`
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-xp="${id}"]`)
    if (!el) return
    el.focus({ preventScroll: true })
    // Skrivbordet: tangentbordet följer rullningen som i appens hemrader.
    if (native && st.zone === 'rows') el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    // Chipraden rullar inte av sig själv (overflow hidden + preventScroll).
    if (st.zone === 'chips') {
      const row = el.parentElement
      if (row) {
        if (el.offsetLeft < row.scrollLeft) row.scrollLeft = el.offsetLeft - dp(8)
        else if (el.offsetLeft + el.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = el.offsetLeft + el.offsetWidth - row.clientWidth + dp(8)
      }
    }
  }
  // Fokus flyttas efter ritningen: målet kan vara en station som inte fanns
  // förrän zonen bytte (heronas knappar ritas inte medan legenden visas).
  const pendingFocus = useRef<XpNavState | null>(null)
  // Ägde vyn fokus senast? Släpps bara när fokus går till något UTANFÖR vyn.
  // Försvinner det fokuserade kortet (Börjar snart-kortet när programmet
  // startar, ett kort ett chip filtrerar bort) hamnar fokus på body — då tar
  // vyn tillbaka det i stället för att lämna fjärren utan fäste.
  const ownsFocus = useRef(false)
  useLayoutEffect(() => {
    const target = pendingFocus.current
    if (target) {
      pendingFocus.current = null
      focusAt(target)
      return
    }
    const now = document.activeElement
    if (ownsFocus.current && (!now || now === document.body)) focusAt(live.current.s)
  })
  const apply = (key: XpKey): boolean => {
    const { s: cur, dims: d } = live.current
    const next = xpNavReduce(cur, key, d)
    if (next === cur) return false
    pendingFocus.current = next
    setNav(next)
    return true
  }

  // Bakåt: från chips/rader till heron. Lagret finns bara medan det har något att göra.
  const navRef = useRef(nav)
  useEffect(() => { navRef.current = nav })
  // Bara medan fokus står i vyn: har användaren pilat ut i rälsen hör Bakåt till skalet.
  const claimBack = s.zone !== 'hero' && active
  useEffect(() => {
    if (!claimBack) return
    return navRef.current.pushLayer(() => { apply('back') }, { allowZap: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimBack])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (!(event.target as HTMLElement).hasAttribute?.('data-xp')) return
    const key: XpKey | null = event.key === 'ArrowUp' ? 'up' : event.key === 'ArrowDown' ? 'down' : event.key === 'ArrowLeft' ? 'left' : event.key === 'ArrowRight' ? 'right' : null
    if (!key) return
    const moved = apply(key)
    // ◂ längst till vänster och ▲ på heron går vidare till appens motor (rälsen, topraden).
    if (!moved && (key === 'left' || key === 'up')) return
    event.preventDefault()
    event.stopPropagation()
  }

  // Mus (handoffen): första klicket fokuserar, andra aktiverar. Pekarnedtrycket
  // sker före fokusbytet, så där syns om kortet redan hade fokus.
  const armRef = useRef<{ id: string; focused: boolean } | null>(null)
  const pointerArm = (id: string) => ({ onPointerDownCapture: (e: { currentTarget: EventTarget }) => { armRef.current = { id, focused: document.activeElement === e.currentTarget } } })
  const guarded = (id: string, run: () => void) => () => {
    const arm = armRef.current
    armRef.current = null
    // Skrivbordet: hovring har redan gett fokus, så ett klick aktiverar.
    if (!isTv) { run(); return }
    if (arm && arm.id === id && !arm.focused) {
      rootRef.current?.querySelector<HTMLElement>(`[data-xp="${id}"]`)?.focus({ preventScroll: true })
      return
    }
    run()
  }

  const activate = (item: XpItem) => {
    if (item.kind === 'category') { nav.go('guide', { group: item.category! }); return }
    const channel = item.channel!
    if (item.kind === 'replay' && item.catchUp) { nav.play({ channel, url: item.catchUp.url, label: item.catchUp.programme.title }); return }
    if (item.kind === 'continue' || item.kind === 'live') { nav.play({ channel }); return }
    okAction({ channel, programme: item.programme ?? null, nav, nowMs: model.nowMs })()
  }
  const hold = (item: XpItem) => (item.channel ? (el: HTMLElement) => holdMenu({ channel: item.channel!, programme: item.programme ?? null, nav, nowMs: model.nowMs, element: el, tt, locale }) : undefined)
  const ctaKey = (item: XpItem | null): TvStringKey => {
    if (!item) return 'watchNow'
    if (item.kind === 'category') return 'xpOpen'
    if (item.kind === 'continue') return 'tagContinue'
    if (item.kind === 'replay') return 'playReplay'
    if (item.kind === 'upcoming') return item.channel && item.programme && isReminded(item.channel, item.programme) ? 'removeReminder' : 'remindMe'
    return 'watchNow'
  }
  const openInGuide = (item: XpItem) => (item.kind === 'category' ? nav.go('guide', { group: item.category! }) : item.channel ? nav.go('guide', { channel: channelKey(item.channel) }) : nav.go('guide'))

  // Ambient ton: programbilden, annars logon; kategorier har sin egen färg.
  const heroChannel = heroItem?.channel ?? null
  const heroProgramme = heroItem?.programme ?? null
  const { url: art } = useProgrammeArt(heroChannel ?? NO_CHANNEL, heroChannel ? heroProgramme : null, { lookup: heroChannel !== null })
  const logo = heroChannel ? getLiveTvLogoSrc(heroChannel.logo) ?? getLiveTvLogoSrc(heroChannel.logoFallback) : null
  // Upplevelse har ALLTID sin tonade bakgrund (Jerry 2026-10-30: "behåll gradient på experience");
  // "Färgton från bild" gäller guiden och Klassisk.
  const imageTone = useTint(art ?? logo, heroChannel !== null)
  const tone = heroItem?.kind === 'category' ? categoryTint(heroItem.category ?? '') : imageTone
  // Samma neutrala gradient oavsett hero (Jerry 2026-10-30) — tonen ovan färgar bara reservrutan.
  const ambient = v2Ambient(settings.liveBackground)

  if (model.allChannels.length === 0 || !featured) return <HubEmptyState testId="hub-experience" model={model} nav={nav} background={bg} />

  const ring = (on: boolean, shadow: string) => (active && on ? shadow : undefined)
  const showButtons = s.zone !== 'rows' || !isTv
  const showLegend = s.zone === 'rows' && isTv
  const hasArt = art !== null
  const heroIsLive = heroItem?.kind === 'live' || heroItem?.kind === 'continue'
  const heroProgress = heroIsLive && heroProgramme ? progressOf(heroProgramme.start, heroProgramme.stop, model.nowMs) : null

  // Radernas toppar: fokuserad rad hamnar överst i fönstret.
  const tops: number[] = []
  let acc = 0
  for (const row of rows) { tops.push(acc); acc += ROW_HEAD + ROW[row.id].h + ROW[row.id].extra }

  const featuredBtn = (i: number, onOk: () => void, extra: Record<string, string>, style: CSSProperties, children: ReactNode) => (
    <div
      {...station(onOk, undefined, { 'data-xp': `hero-${i}`, 'data-v2f': 'xp', 'data-testid': `xp-hero-btn-${i}`, ...extra })}
      onFocus={() => setNav((p) => ({ ...p, zone: 'hero', heroBtn: i }))}
      style={{ height: dp(56), minHeight: dp(56), borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: dp(10), cursor: 'pointer', transition: 'transform .2s, box-shadow .2s', boxShadow: ring(s.zone === 'hero' && s.heroBtn === i, FOCUS_BTN), transform: active && s.zone === 'hero' && s.heroBtn === i ? 'scale(1.06)' : 'none', ...style }}
    >{children}</div>
  )
  const favourite = featured.channel ? model.pinnedSet.has(channelKey(featured.channel)) : false

  return (
    <div
      ref={rootRef}
      data-testid="hub-experience"
      onKeyDown={onKeyDown}
      onFocusCapture={(e) => {
        const xp = (e.target as HTMLElement).hasAttribute?.('data-xp') ?? false
        setActive(xp)
        if (xp) ownsFocus.current = true
      }}
      onBlurCapture={(e) => {
        setActive(false)
        const to = e.relatedTarget as Node | null
        if (to && !rootRef.current?.contains(to)) ownsFocus.current = false
      }}
      style={{ position: 'relative', isolation: 'isolate', flex: 1, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden', color: V2.text, fontSize: dp(22), lineHeight: 1.3 }}
    >
      <V2FocusStyle />
      {/* Hål åt förhandsrutan: mpv ritar videon under webbvyn. */}
      <CutoutLayer testId="xp-ambient" data={{ 'data-bg': ambient }} background={ambient} style={{ zIndex: -1, transition: 'background .6s ease' }} />
      {hasArt ? (
        <div style={{ position: 'absolute', top: 0, right: 0, width: '72%', height: dp(640), WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 42%)', maskImage: 'linear-gradient(90deg, transparent 0%, #000 42%)' }}>
          <div data-testid="xp-hero-art" style={{ position: 'absolute', inset: 0, background: `url("${art}") center / cover no-repeat`, transition: 'background .5s', WebkitMaskImage: 'linear-gradient(180deg, #000 50%, transparent 100%)', maskImage: 'linear-gradient(180deg, #000 50%, transparent 100%)' }} />
        </div>
      ) : heroChannel && heroItem?.kind !== 'category' ? (
        // Utan bild: tonad ruta med logoplattan (döljs för kategorier).
        // Handoffens "liveström, tyst": kanalen spelar ljudlöst i rutan när den
        // sänder; annars (och medan spelaren är öppen) tonad ruta med logoplattan.
        <div data-testid="xp-hero-tile" style={{ position: 'absolute', right: dp(56), top: dp(120), width: dp(600), height: dp(338), borderRadius: dp(20), overflow: 'hidden', zIndex: 2, border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 30px 80px rgba(0,0,0,.5)', boxSizing: 'border-box' }}>
          <LivePreviewArt
            channel={heroChannel}
            live={heroIsLive}
            enabled={settings.previewEnabled && !nav.playerOpen}
            height={dp(338)}
            radius={dp(20)}
            style={{ width: '100%', height: '100%' }}
            fallback={(
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(150deg, ${mixHex(tone, '#ffffff', 90)}, ${mixHex(tone, bg, 40)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .5s' }}>
                <LogoPlate channel={heroChannel} width={300} height={150} radius={14} style={{ boxShadow: '0 12px 32px rgba(0,0,0,.35)' }} />
              </div>
            )}
          >
            {heroProgress !== null ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><V2Progress value={heroProgress} height={5} track="rgba(0,0,0,0.4)" /></div> : null}
          </LivePreviewArt>
        </div>
      ) : null}

      <div data-testid="hub-topbar" style={{ position: 'absolute', left: dp(56), right: dp(56), top: dp(30), display: 'flex', alignItems: 'center', gap: dp(14), zIndex: 4 }}>
        <span style={{ fontSize: dp(34), fontWeight: 600, marginRight: dp(10) }}>{tt('liveTv')}</span>
        <HubPlaylistPill model={model} nav={nav} init={false} height={48} onPicked={() => setChip(null)} />
        <div {...station(() => nav.go('search'), undefined, { 'data-v2f': 'btn', 'aria-label': tt('railSearch') })} style={{ width: dp(48), height: dp(48), minHeight: dp(48), borderRadius: 999, background: 'rgba(252,252,255,0.12)', border: '1px solid rgba(255,255,255,0.12)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icons.Search size={dp(20)} />
        </div>
        <HubGreeting nowMs={model.nowMs} clock={clock} />
      </div>

      {/* Texten får gå fram till förhandsrutan (eller över hela bredden utan ruta); rubriken står på en rad. */}
      <div data-testid="xp-hero" style={{ position: 'absolute', left: dp(56), top: dp(124), width: hasArt ? dp(1000) : heroChannel && heroItem?.kind !== 'category' ? `calc(100% - ${dp(56 + 600 + 56 + 40)}px)` : `calc(100% - ${dp(112)}px)`, display: 'flex', flexDirection: 'column', gap: dp(14), zIndex: 3 }}>
        {heroItem ? <HeroText item={heroItem} model={model} /> : null}
        {showButtons ? (
          <div data-testid="xp-hero-buttons" style={{ display: 'flex', gap: dp(12), marginTop: dp(8), alignItems: 'center' }}>
            {featuredBtn(0, () => activate(featured), { 'data-init': '' }, { padding: `0 ${dp(28)}px`, background: V2.text, color: V2.onLight, fontSize: dp(20), fontWeight: 700 }, <><Icons.Play size={dp(20)} />{tt(ctaKey(featured))}</>)}
            {featuredBtn(1, () => openInGuide(featured), {}, { padding: `0 ${dp(24)}px`, background: 'rgba(252,252,255,0.14)', border: '1px solid rgba(255,255,255,0.14)', boxSizing: 'border-box', fontSize: dp(20), fontWeight: 600 }, tt('guideV2Title'))}
            {featured.channel ? featuredBtn(2, () => model.togglePin(featured.channel!), { 'aria-label': tt('xpFavourite') }, { width: dp(56), background: 'rgba(252,252,255,0.14)', border: '1px solid rgba(255,255,255,0.14)', boxSizing: 'border-box', color: favourite ? TV.acc : V2.text }, <Icons.Heart size={dp(22)} filled />) : null}
            {isTv && s.zone === 'hero' ? <span style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.5)', marginLeft: dp(8) }}>{tt('xpHintCategories')}</span> : null}
          </div>
        ) : null}
        {showLegend ? (
          <div data-testid="xp-legend" style={{ display: 'flex', gap: dp(10), marginTop: dp(8), alignItems: 'center', fontSize: dp(17), color: V2.text2 }}>
            <KeyCap>OK</KeyCap><span>{tt(ctaKey(current))}</span>
            <span style={{ marginLeft: dp(14) }}><KeyCap>{tt('xpKeyHold')}</KeyCap></span><span>{tt('moreOptions')}</span>
            <span style={{ marginLeft: dp(14) }}><KeyCap>{tt('back')}</KeyCap></span><span>{tt('xpToTop')}</span>
          </div>
        ) : null}
      </div>

      <div data-testid="xp-chips" style={{ position: 'absolute', left: dp(50), right: dp(50), top: dp(514), display: 'flex', gap: dp(10), zIndex: 3, overflow: 'hidden', padding: dp(6) }}>
        {chipItems.map((c, i) => {
          const on = chip === c.key
          const focused = s.zone === 'chips' && s.chipIdx === i
          return (
            <div
              key={c.id}
              {...station(() => (c.key === MORE_GROUPS ? groupPicker.open() : setChip(c.key)), undefined, { 'data-xp': `chip-${i}`, 'data-v2f': 'xp', 'data-testid': `xp-chip-${c.id}` })}
              onFocus={() => setNav((p) => ({ ...p, zone: 'chips', chipIdx: i }))}
              style={{ height: dp(46), minHeight: dp(46), padding: `0 ${dp(20)}px`, borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', fontSize: dp(17), whiteSpace: 'nowrap', cursor: 'pointer', background: on ? V2.text : 'rgba(252,252,255,0.10)', color: on ? V2.onLight : V2.text, fontWeight: on ? 700 : 500, boxShadow: ring(focused, FOCUS_BTN) ?? 'inset 0 0 0 1px rgba(255,255,255,0.12)', transform: active && focused ? 'scale(1.06)' : 'none', transition: 'transform .2s, box-shadow .2s' }}
            >{c.label}</div>
          )
        })}
      </div>

      <div data-testid="xp-rows-viewport" style={{ position: 'absolute', left: 0, right: 0, top: dp(596), bottom: 0, overflowX: 'hidden', overflowY: native ? 'auto' : 'hidden', zIndex: 2 }}>
        <div data-testid="xp-rows-track" style={native ? { position: 'relative', paddingBottom: dp(40) } : { position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(-${dp(tops[s.row] ?? 0)}px)`, transition: `transform .45s ${EASE}` }}>
          {rows.map((row, ri) => {
            const m = ROW[row.id]
            const col = s.cols[ri] ?? 0
            const onRow = ri === s.row
            const inRows = s.zone === 'rows'
            const opacity = native ? 1 : ri < s.row ? 0 : onRow ? (inRows ? 1 : 0.8) : 0.55
            const { title, sub } = rowHead(row.id, chip, chipItems.find((c) => c.key === chip)?.label ?? null, isTv, tt)
            return (
              <section key={row.id} data-testid={`xp-row-${row.id}`} style={{ height: dp(ROW_HEAD + m.h + m.extra), opacity, transition: 'opacity .35s' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14), padding: `0 ${dp(56)}px`, height: dp(50) }}>
                  <span style={{ fontSize: dp(26), fontWeight: 600, color: onRow ? V2.text : 'rgba(243,244,248,0.7)' }}>{title}</span>
                  {sub ? <span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.55)' }}>{sub}</span> : null}
                </div>
                <div style={{ perspective: m.poster && !native ? dp(1600) : undefined, padding: native ? `${dp(14)}px 0 0` : `${dp(14)}px ${dp(56)}px 0` }}>
                  <div
                    data-testid="xp-row-strip"
                    className={native ? 'lumio-xp-strip' : undefined}
                    style={native
                      ? { display: 'flex', gap: dp(m.gap), overflowX: 'auto', overflowY: 'hidden', padding: `${dp(10)}px ${dp(56)}px ${dp(m.poster ? 70 : 24)}px`, scrollPaddingInline: dp(56), scrollbarWidth: 'none' }
                      : { display: 'flex', gap: dp(m.gap), transform: `translateX(-${dp(Math.max(0, col - (m.poster ? 2 : 1)) * (m.w + m.gap))}px)`, transition: `transform .4s ${EASE}`, transformStyle: 'preserve-3d' }}
                  >
                    {row.items.map((item, ii) => {
                      const d = ii - col
                      const focused = onRow && d === 0 && inRows
                      const id = `r${ri}-${ii}`
                      let tf = 'none'
                      let op = 1
                      let z = 1
                      if (native) {
                        // Skrivbordet: platta kort; hovring lyfter bara kortet (ingen layoutförskjutning).
                        if (focused) tf = 'scale(1.04)'
                      } else if (m.poster) {
                        // Coverflow (README): sidokort vridna ±26°, fokuserat framåt.
                        const a = Math.max(-3, Math.min(3, d))
                        tf = d === 0 ? (focused ? 'translateZ(50px) scale(1.05)' : 'translateZ(0)') : `rotateY(${a < 0 ? 26 : -26}deg) translateZ(-${30 + Math.abs(a) * 16}px)`
                        op = Math.abs(d) > 4 ? 0.4 : 1
                        z = 20 - Math.abs(d)
                      } else if (focused) tf = 'scale(1.07)'
                      if (!native && onRow && inRows && !focused && !m.poster) op = 0.82
                      return (
                        <div
                          key={item.key}
                          {...station(guarded(id, () => activate(item)), hold(item), { 'data-xp': id, 'data-v2f': 'xp', 'data-testid': 'xp-card', 'data-kind': item.kind })}
                          {...pointerArm(id)}
                          onFocus={() => setNav((p) => { const cols = p.cols.slice(); cols[ri] = ii; return { ...p, zone: 'rows', row: ri, cols } })}
                          style={{ flexShrink: 0, width: dp(m.w), position: 'relative', zIndex: focused ? 30 : z, cursor: 'pointer', userSelect: 'none', outline: 'none' }}
                        >
                          <div style={{ width: '100%', height: dp(m.h), borderRadius: dp(m.radius), position: 'relative', overflow: 'hidden', transform: tf, opacity: op, boxShadow: focused && active ? FOCUS_CARD : '0 10px 30px rgba(0,0,0,.35)', transition: `transform .4s ${EASE}, box-shadow .3s, opacity .3s`, WebkitBoxReflect: m.poster ? 'below 6px linear-gradient(transparent 72%, rgba(255,255,255,.14))' : undefined } as CSSProperties}>
                            <CardFace rowId={row.id} item={item} model={model} lookup={native ? ii < 6 : Math.abs(d) <= 4} />
                          </div>
                          {row.id === 'yours' && item.channel ? (
                            <div style={{ padding: `${dp(12)}px ${dp(4)}px 0`, opacity: focused ? 1 : 0.65, transition: 'opacity .3s' }}>
                              <div style={{ fontSize: dp(17), fontWeight: 600, ...ellipsis }}>{item.channel.name}</div>
                              <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.65)', ...ellipsis }}>{item.programme?.title ?? ''}</div>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
      {groupPicker.node}
    </div>
  )
}

type TT = (key: TvStringKey, vars?: Record<string, string | number>) => string

/** Radrubrik + underrad. Fjärrhjälpen ("OK = påminn mig", "nummer = zappa") bara i TV-läge. */
function rowHead(id: XpRowId, chip: string | null, chipLabel: string | null, isTv: boolean, tt: TT): { title: string; sub: string | null } {
  if (id === 'continue') return { title: tt('continueWatching'), sub: tt('continueSub') }
  if (id === 'onNow') return { title: tt('spotlightOnNow'), sub: chip ? chipLabel : tt('xpOnNowSub') }
  if (id === 'yours') {
    const hint = isTv ? tt('xpYoursSub') : null
    return { title: tt('xpYours'), sub: chip ? [chipLabel, hint].filter(Boolean).join(' · ') : hint }
  }
  if (id === 'soon') return { title: tt('xpSoon'), sub: isTv ? tt('okRemind') : null }
  return { title: tt('xpExplore'), sub: tt('categories') }
}

/** Heronas text: kicker (tagg · nummer · kanal), titel, meta + förlopp, beskrivning. */
function HeroText({ item, model }: { item: XpItem; model: TvViewProps['model'] }) {
  const { tt, locale } = useTvText()
  const p = item.programme ?? null
  const minLeft = p ? Math.max(0, Math.round((p.stop - model.nowMs) / 60_000)) : 0
  const isLive = item.kind === 'live' || item.kind === 'continue'
  const tag = item.kind === 'live' ? tt('live') : item.kind === 'continue' ? tt('tagContinue') : item.kind === 'replay' ? tt('replay') : item.kind === 'upcoming' ? tt('later') : tt('xpCategory')
  const number = item.channel ? model.channelNumber(item.channel) : null
  const title = item.kind === 'category' ? item.category ?? '' : p?.title ?? item.channel?.name ?? ''
  let meta = ''
  if (item.kind === 'category') meta = tt('channelsCount', { count: item.count ?? 0 })
  else if (item.kind === 'upcoming' && p) meta = tt('xpStartsAt', { time: formatClock(p.start, locale), min: Math.max(0, Math.round((p.start - model.nowMs) / 60_000)) })
  else if (item.kind === 'replay' && p) meta = tt('airedAt', { time: formatClock(p.start, locale), channel: item.channel?.name ?? '' })
  else if (p) meta = `${formatClock(p.start, locale)}–${formatClock(p.stop, locale)} · ${tt('minutesLeft', { min: minLeft })}`
  const description = item.kind === 'category' ? tt('xpCategoryDesc') : p?.description ?? null
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: dp(12), fontSize: dp(18), color: 'rgba(243,244,248,0.8)' }}>
        {item.kind === 'live'
          ? <LivePill label={tag} />
          : <span style={{ fontSize: dp(13), fontWeight: 600, letterSpacing: '0.14em', padding: `${dp(5)}px ${dp(12)}px`, borderRadius: dp(8), background: 'rgba(252,252,255,0.16)', color: V2.text, textTransform: 'uppercase' }}>{tag}</span>}
        {number ? <span style={{ fontWeight: 600, color: V2.accText, fontVariantNumeric: 'tabular-nums' }}>{number}</span> : null}
        {item.channel ? <span style={ellipsis}>{item.channel.name}</span> : null}
      </div>
      <div data-testid="xp-hero-title" style={{ fontSize: dp(60), fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {meta ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(16), fontSize: dp(19), color: 'rgba(243,244,248,0.8)' }}>
          <span>{meta}</span>
          {isLive && p ? <div style={{ width: dp(240) }}><V2Progress value={progressOf(p.start, p.stop, model.nowMs)} height={5} track="rgba(252,252,255,.18)" /></div> : null}
        </div>
      ) : null}
      {description ? <p style={{ margin: 0, fontSize: dp(19), color: V2.text2, maxWidth: '60ch', ...clamp2 }}>{description}</p> : null}
    </>
  )
}

/** Kortets yta per rad (README "Rows"). `lookup` = programbilden slås upp (bara nära fokus). */
function CardFace({ rowId, item, model, lookup }: { rowId: XpRowId; item: XpItem; model: TvViewProps['model']; lookup: boolean }) {
  const { tt, locale } = useTvText()
  const channel = item.channel ?? NO_CHANNEL
  const p = item.programme ?? null
  const wantsArt = rowId === 'continue' || rowId === 'onNow'
  const { url } = useProgrammeArt(channel, item.channel && wantsArt ? p : null, { lookup: wantsArt && lookup })
  const [broken, setBroken] = useState<string | null>(null)
  const art = url !== null && broken !== url ? url : null
  const progress = p && p.start <= model.nowMs && p.stop > model.nowMs ? progressOf(p.start, p.stop, model.nowMs) : null

  if (rowId === 'explore') {
    const tint = categoryTint(item.category ?? '')
    const big = (item.category ?? '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '·'
    return (
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${tint}, ${mixHex(tint, '#161a23', 40)})` }}>
        <span aria-hidden="true" style={{ position: 'absolute', right: dp(-6), bottom: dp(-34), fontSize: dp(150), fontWeight: 800, lineHeight: 1, color: 'rgba(255,255,255,0.10)', letterSpacing: '-0.04em' }}>{big}</span>
        <div style={{ position: 'absolute', left: dp(22), right: dp(22), bottom: dp(20) }}>
          <div style={{ fontSize: dp(30), fontWeight: 800, ...ellipsis }}>{item.category}</div>
          <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.8)' }}>{tt('channelsCount', { count: item.count ?? 0 })}</div>
        </div>
      </div>
    )
  }

  if (rowId === 'yours') {
    return (
      <div style={{ position: 'absolute', inset: 0, background: V2.logoPlate }}>
        <LogoPlate channel={channel} width={104} height={104} radius={14} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -54%)', background: V2.logoPlateInner, boxShadow: 'none' }} />
        <span style={{ position: 'absolute', left: dp(12), top: dp(10), fontSize: dp(15), fontWeight: 700, color: '#6b7080', fontVariantNumeric: 'tabular-nums' }}>{model.channelNumber(channel) ?? ''}</span>
        {progress !== null ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><V2Progress value={progress} height={6} track="#d9dbe3" /></div> : null}
      </div>
    )
  }

  if (rowId === 'soon') {
    const reminded = item.channel && p ? isReminded(item.channel, p) : false
    const mins = p ? Math.max(0, Math.round((p.start - model.nowMs) / 60_000)) : 0
    return (
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${mixHex('#2b3142', '#262b38', 70)}, #20242f)`, padding: `${dp(18)}px ${dp(20)}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: dp(4) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(10) }}>
          <LogoPlate channel={channel} width={60} height={34} radius={6} />
          <span style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.7)', minWidth: 0, ...ellipsis }}>{channel.name}</span>
          <span data-testid="xp-bell" data-on={reminded ? '1' : '0'} style={{ marginLeft: 'auto', flexShrink: 0, width: dp(36), height: dp(36), borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: reminded ? TV.acc : 'rgba(252,252,255,0.14)', color: reminded ? V2.onAcc : V2.text }}><Icons.Bell size={dp(17)} filled /></span>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: dp(8) }}>
          <span style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.65)' }}>{tt('xpSoonIn')}</span>
          <span style={{ fontSize: dp(56), fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: V2.accText }}>{mins}</span>
          <span style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.7)' }}>{tt('xpSoonMin', { time: p ? formatClock(p.start, locale) : '' })}</span>
        </div>
        <div style={{ fontSize: dp(20), fontWeight: 700, ...ellipsis }}>{p?.title ?? ''}</div>
      </div>
    )
  }

  const plate = art ? null : <div style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)' }}><LogoPlate channel={channel} width={180} height={90} radius={10} /></div>
  const image = art ? <img src={art} alt="" onError={() => setBroken(art)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : null

  if (rowId === 'onNow') {
    return (
      <NoArt style={{ display: 'block' }}>
        {image}{plate}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.82))' }} />
        <span style={{ position: 'absolute', left: dp(14), top: dp(14) }}><LivePill solid label={tt('live')} /></span>
        {art ? <LogoPlate channel={channel} width={60} height={34} radius={6} style={{ position: 'absolute', right: dp(14), top: dp(14) }} /> : null}
        <div style={{ position: 'absolute', left: dp(18), right: dp(18), bottom: dp(20), display: 'flex', flexDirection: 'column', gap: dp(4) }}>
          <div style={{ fontSize: dp(24), fontWeight: 800, lineHeight: 1.1, ...ellipsis }}>{p?.title ?? channel.name}</div>
          <div style={{ fontSize: dp(15), color: V2.text2, ...ellipsis }}>{channel.name}</div>
        </div>
        {progress !== null ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><V2Progress value={progress} height={5} track="rgba(0,0,0,.45)" /></div> : null}
      </NoArt>
    )
  }

  // Fortsätt titta (Fortsätt / Repris).
  const meta = item.kind === 'replay' && p
    ? `${channel.name} · ${formatClock(p.start, locale)}`
    : p ? `${channel.name} · ${tt('minutesLeft', { min: Math.max(0, Math.round((p.stop - model.nowMs) / 60_000)) })}` : channel.name
  return (
    <NoArt style={{ display: 'block' }}>
      {image}{plate}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.75))' }} />
      {art ? <LogoPlate channel={channel} width={76} height={42} radius={7} style={{ position: 'absolute', left: dp(14), top: dp(14) }} /> : null}
      <span style={{ position: 'absolute', right: dp(14), top: dp(14) }}><AccentTag>{item.kind === 'replay' ? tt('replay') : tt('tagContinue')}</AccentTag></span>
      <div style={{ position: 'absolute', left: dp(16), right: dp(16), bottom: dp(18) }}>
        <div style={{ fontSize: dp(21), fontWeight: 700, ...ellipsis }}>{p?.title ?? channel.name}</div>
        <div style={{ fontSize: dp(15), color: V2.text2, ...ellipsis }}>{meta}</div>
      </div>
      {item.kind !== 'replay' && progress !== null ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><V2Progress value={progress} height={5} track="rgba(0,0,0,.45)" /></div> : null}
    </NoArt>
  )
}
