'use client'

import { cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { onTvFocusEdge } from '@/lib/plugin-sdk'
import { useTvSettings } from './tv-settings-store'
import { useTvText } from './tv-strings'
import { TV, belowTitleBar, dp, station, Icons } from './tv-ui'
import type { TvView } from './tv-shell'
import { SportIcons } from '../sport/tv/sport-icons'
import { V2 } from './v2-tokens'
import { railTintBackground, useRailTint } from './rail-tint'

/**
 * IKONRADENS MÅTT — allt på ETT ställe, i designpixlar.
 *
 * TV är godkänd och rörs inte: 104 px bred rad med 60×60-poster, precis som
 * i design_handoff_live_tv_tv_mode. Utanför TV-läget sitter raden BREDVID
 * appens sidomeny i stället för i stället för den, och 104 px blev en tom
 * marginal mellan två menyer — därför 84 (Jerry 2026-09-14).
 *
 * FAS 1 (smal yta som INTE är en telefon, t.ex. ett smalt skrivbordsfönster):
 * raden komprimeras till `RAIL_W_NARROW`, den döljs inte — se
 * `usePhoneSurface`-kommentaren nedan för varför en TELEFON hanteras
 * annorlunda.
 *
 * TELEFON (`usePhoneSurface`, fas 3): raden finns inte alls — telefonen får
 * en flik-rad i botten (`MobileTabBar`) och ett bottenark för det som inte
 * ryms där (`MobileSheet`). Måtten här gäller därför bara TV, skrivbord och
 * en smal-men-inte-telefon yta.
 */
const RAIL_W_TV = 152
const RAIL_W_DESKTOP = 132
const RAIL_W_NARROW = 64
/**
 * Postens BREDD på TV och skrivbord. Sedan 2026-09-29 (Jerry: "menyn är
 * bättre lite luftig") bär posten ikon + etikett under, så den är bredare än
 * hög — höjden är `RAIL_ITEM_WIDE_H`. Smalläget behåller kvadraten utan text.
 */
const RAIL_ITEM_WIDE = 108
const RAIL_ITEM_WIDE_H = 84
const RAIL_ITEM_TV_H = 92
const RAIL_ICON_TV = 34
const RAIL_LABEL_TV = 20
/** Utan etiketter (inställningen `railLabels` av): den gamla raden — 104/84 bred med 60×60-poster. */
const RAIL_W_TV_COMPACT = 104
const RAIL_W_DESKTOP_COMPACT = 84
const RAIL_ITEM_COMPACT = 60
/** Postens sida på en smal yta — fortfarande över 44 px träffyta. */
const RAIL_ITEM_NARROW = 48

export { RAIL_ITEM_NARROW, RAIL_ITEM_WIDE, RAIL_W_DESKTOP, RAIL_W_NARROW, RAIL_W_TV }

export type RailKey = 'back' | 'search' | 'home' | 'hub' | 'guide' | 'sport' | 'library' | 'multi' | 'favs' | 'settings'

export interface TvRailProps {
  active: RailKey | null
  onSelect: (key: RailKey) => void
  isTv: boolean
  narrow: boolean
  /** `settings.railLabels && !narrow` */
  labels: boolean
}

/** Vilken radpost som lyser för en vy. Kanalvyn hör till Guide; vyer utan egen post lyser ingen. */
export function railKeyForView(view: TvView): RailKey | null {
  if (view === 'channel') return 'guide'
  if (view === 'hub' || view === 'search' || view === 'guide' || view === 'sport' || view === 'library' || view === 'multi' || view === 'favs' || view === 'settings') return view
  return null
}

/**
 * Rälsens aktiva post i skalet. Medan sidan kollar om VOD-hemmet finns
 * (omdirigeringen, tv-shell.tsx) lyser Hem — det är dit användaren är på väg.
 * Annars tändes Kanaler i en bildruta eller tre och slocknade när ramen runt
 * VOD-hemmet tog över, så markeringen hoppade två steg i rälsen (2026-10-11).
 */
export function shellRailActive(view: TvView, redirecting: boolean): RailKey | null {
  return redirecting ? 'home' : railKeyForView(view)
}

export function TvRail({ active, onSelect, isTv, narrow, labels: railLabels }: TvRailProps) {
  // En vy med bakgrundsbild (sporten) tonar rälsen efter bilden; annars rälsens vanliga yta.
  const tint = useRailTint()
  const railBg = tint ? railTintBackground(tint) : V2.railSurface
  const { tt } = useTvText()
  const railWidth = isTv ? (railLabels ? RAIL_W_TV : RAIL_W_TV_COMPACT) : narrow ? RAIL_W_NARROW : railLabels ? RAIL_W_DESKTOP : RAIL_W_DESKTOP_COMPACT
  const railItemSize = narrow ? RAIL_ITEM_NARROW : railLabels ? RAIL_ITEM_WIDE : RAIL_ITEM_COMPACT
  // TV (Jerry 2026-10-31, provat live på Mi Boxen): samma bredd, större text och
  // ikoner, ingen L-bricka — platsen går till posterna.
  const tvBig = isTv && !narrow
  const itemHeight = railLabels ? (tvBig ? RAIL_ITEM_TV_H : RAIL_ITEM_WIDE_H) : railItemSize

  /*
   * DOLD SIDOMENY (Jerry 2026-10-31: "dölja sidomenyn och placera allt content
   * så det matchar huvudappen, den ska komma fram med sidotryck"). Bara TV.
   * Rälsen tas ur flödet och ligger som ett lager utanför vänsterkanten;
   * vänster vid innehållets kant (fokusmotorns kanthändelse) fäller fram den
   * och lägger fokus på aktuell post. Stängd är den `inert`, så geometrin
   * aldrig hittar en osynlig station. Den fälls in när fokus lämnar den.
   */
  const overlay = useTvSettings().railHidden && isTv && !narrow
  const navRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const focusPendingRef = useRef(false)
  const focusCurrent = () => {
    focusPendingRef.current = false
    const rail = navRef.current
    const target = rail?.querySelector<HTMLElement>('[data-current]') ?? rail?.querySelector<HTMLElement>('[data-f]')
    target?.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (!overlay) return
    return onTvFocusEdge((dir, meta) => {
      if (dir !== 'left' || meta?.claimed) return
      const rail = navRef.current
      if (!rail || rail.contains(document.activeElement)) return
      meta?.claim?.()
      focusPendingRef.current = true
      setOpen(true)
      // Redan öppen (ingen ny rendering): fokus direkt.
      if (!rail.hasAttribute('inert')) focusCurrent()
    })
  }, [overlay])
  /*
    ◂ MOT APPENS SIDOMENY. Hem ligger i appens scen, och där pekar herons
    knappar och radernas första kort uttryckligen vänster mot appens sidomeny
    (`data-f-left` = `[data-col="side"] …`). Motorn tar då trycket själv och
    ingen kanthändelse kommer (uppmätt på Mi Box S) — så rälsen tar de trycken
    först, i capture-fas, och fälls fram i stället.
  */
  useEffect(() => {
    if (!overlay) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' || event.defaultPrevented) return
      const rail = navRef.current
      const active = document.activeElement
      if (!rail || !(active instanceof HTMLElement) || rail.contains(active)) return
      if (!(active.getAttribute('data-f-left') ?? '').includes('data-col="side"')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      focusPendingRef.current = true
      setOpen(true)
      if (!rail.hasAttribute('inert')) focusCurrent()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay])
  // Fokus först när raden ritats om utan `inert` — en inert station tar inte
  // fokus, och på Mi Boxen hann en rAF före commit ibland.
  useLayoutEffect(() => {
    if (!open || !focusPendingRef.current) return
    focusCurrent()
  }, [open])
  // Fälls in när fokus landar utanför rälsen. På dokumentet och inte som
  // onBlur på raden: i Hem-ramen (live-tv-library-frame) kom inget blur när
  // motorn flyttade fokus till heron (uppmätt på Mi Box S).
  useEffect(() => {
    if (!overlay || !open) return
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (target instanceof Node && navRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('focusin', onFocusIn, true)
    return () => document.removeEventListener('focusin', onFocusIn, true)
  }, [overlay, open])

  /**
   * Alla poster delar radens mått och utseende (smalläget följer med av sig
   * själv genom `railItemSize`); vad ett klick gör avgör ägaren via `onSelect`.
   */
  type RailItem = { key: RailKey; label: string; icon: ReactNode }
  const rail: RailItem[] = [
    { key: 'search', label: tt('railSearch'), icon: <Icons.Search /> },
    { key: 'home', label: tt('railHome'), icon: <Icons.Home /> },
    // Kanaler (dagens Hem): egen ikon, skild från Guides Tv-ikon.
    { key: 'hub', label: tt('railChannels'), icon: <Icons.Eye /> },
    { key: 'guide', label: tt('railGuide'), icon: <Icons.Tv /> },
    { key: 'sport', label: tt('railSport'), icon: <SportIcons.Ball /> },
    { key: 'library', label: tt('railLibrary'), icon: <Icons.FilmStrip /> },
    { key: 'multi', label: tt('railMultiview'), icon: <Icons.SquaresFour /> },
    { key: 'favs', label: tt('railFavourites'), icon: <Icons.Heart /> },
  ]
  const railItem = (item: RailItem, extraStyle?: CSSProperties) => {
    const activeItem = item.key === active
    return (
      <div
        key={item.key}
        {...station(() => onSelect(item.key), undefined, { 'data-testid': `rail-${item.key}`, 'aria-label': item.label, title: item.label, ...(activeItem ? { 'data-current': '' } : {}) })}
        style={{ width: dp(railItemSize), height: dp(itemHeight), borderRadius: dp(railLabels ? 18 : 16), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: dp(5), cursor: 'pointer', background: activeItem ? TV.s14 : 'transparent', color: activeItem ? TV.text : 'rgba(243,244,248,0.62)', ...extraStyle }}
      >
        {tvBig && isValidElement<{ size?: number }>(item.icon) ? cloneElement(item.icon, { size: dp(RAIL_ICON_TV) }) : item.icon}
        {/* Etiketten under ikonen — bara när raden är bred nog. */}
        {!railLabels ? null : (
          <span data-live-tv-rail-label="" style={{ fontSize: dp(tvBig ? RAIL_LABEL_TV : 15), fontWeight: 600, lineHeight: 1.1, maxWidth: '100%', padding: `0 ${dp(6)}px`, boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.label}
          </span>
        )}
      </div>
    )
  }

  /* Ikonrad: pluginets egen navigation inne i Live TV. Inte data-col="side" —
        värdens Back-regel hade då flyttat fokus hit i stället för att gå bakåt.
        OFÖRÄNDRAD ovanför telefonbredden (spec §1/krav 3) — se
        "utan telefonattribut: ikonraden som förut" i tv-shell-phone.test.tsx.
        På telefon finns ingen rad alls: flik-raden nedan tar över. */
  const nav = (
      <nav
        ref={navRef}
        data-testid="tv-rail"
        aria-label={tt('liveTv')}
        data-bg={railBg}
        {...(overlay ? { 'data-tv-rail-overlay': open ? 'open' : 'closed', ...(open ? {} : { inert: true }) } : {})}
        onFocus={overlay ? () => setOpen(true) : undefined}
        style={{ width: dp(railWidth), flexShrink: 0, borderRight: `1px solid ${TV.line}`, background: railBg, transition: overlay ? 'background 600ms ease, transform 220ms ease, box-shadow 220ms ease' : 'background 600ms ease', padding: `${belowTitleBar(dp(narrow ? 16 : 36))} 0 ${dp(narrow ? 16 : 32)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(narrow ? 8 : 8), ...(overlay ? { backgroundColor: 'var(--lt-bg, #0d0e12)', position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 45, transform: open ? 'none' : 'translateX(-100%)', boxShadow: open ? '12px 0 40px rgba(0,0,0,0.55)' : 'none' } : null) }}
      >
        {/* Märket är ren dekor och det enda "etiketten" raden har. På en smal
            yta går den bort tillsammans med luften ovanför — posterna ska nå
            ner i skärmen, inte trängas under en logotyp. */}
        {narrow || tvBig ? null : (
          <div data-live-tv-rail-badge="" aria-hidden="true" style={{ width: dp(44), height: dp(44), borderRadius: dp(12), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: dp(22), marginBottom: dp(24) }}>L</div>
        )}
        {/* Bakåt-pilen i ikonraden lämnar Live TV DIREKT (Jerry 2026-09-17) —
            inte ett steg i taget genom lager/vy/hubb som tangenten gör.
            Även på TV (Jerry 2026-09-28): fjärrens Bakåt finns, men många
            hittade inte ut ur Live TV utan en synlig väg tillbaka. Samma
            station som övriga radposter, så den nås med pilarna. */}
        {railItem({ key: 'back', label: tt('railBack'), icon: <Icons.ChevronLeft /> })}
        {rail.map((item) => railItem(item))}
        {railItem({ key: 'settings', label: tt('railSettings'), icon: <Icons.Gear /> }, { marginTop: 'auto' })}
      </nav>
  )
  // Dold räls: ingen bredd i flödet — innehållet ligger där appens innehåll ligger.
  return overlay ? <div data-tv-rail-slot="" style={{ width: 0, flexShrink: 0, position: 'relative', zIndex: 45 }}>{nav}</div> : nav
}
