'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useTvText } from './tv-strings'
import { TV, dp, station, Icons } from './tv-ui'
import type { TvView } from './tv-shell'
import { SportIcons } from '../sport/tv/sport-icons'

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
  const { tt } = useTvText()
  const railWidth = isTv ? (railLabels ? RAIL_W_TV : RAIL_W_TV_COMPACT) : narrow ? RAIL_W_NARROW : railLabels ? RAIL_W_DESKTOP : RAIL_W_DESKTOP_COMPACT
  const railItemSize = narrow ? RAIL_ITEM_NARROW : railLabels ? RAIL_ITEM_WIDE : RAIL_ITEM_COMPACT

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
        style={{ width: dp(railItemSize), height: dp(railLabels ? RAIL_ITEM_WIDE_H : railItemSize), borderRadius: dp(railLabels ? 18 : 16), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: dp(5), cursor: 'pointer', background: activeItem ? TV.s14 : 'transparent', color: activeItem ? TV.text : 'rgba(243,244,248,0.62)', ...extraStyle }}
      >
        {item.icon}
        {/* Etiketten under ikonen — bara när raden är bred nog. */}
        {!railLabels ? null : (
          <span data-live-tv-rail-label="" style={{ fontSize: dp(15), fontWeight: 600, lineHeight: 1.1, maxWidth: '100%', padding: `0 ${dp(6)}px`, boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
  return (
      <nav data-testid="tv-rail" aria-label={tt('liveTv')} style={{ width: dp(railWidth), flexShrink: 0, borderRight: `1px solid ${TV.line}`, background: 'linear-gradient(180deg, rgba(252,252,255,0.05), rgba(252,252,255,0.02))', padding: `${dp(narrow ? 16 : 36)}px 0 ${dp(narrow ? 16 : 32)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(narrow ? 8 : 8) }}>
        {/* Märket är ren dekor och det enda "etiketten" raden har. På en smal
            yta går den bort tillsammans med luften ovanför — posterna ska nå
            ner i skärmen, inte trängas under en logotyp. */}
        {narrow ? null : (
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
}
