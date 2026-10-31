import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTvMode, type LibraryFrameProps } from '@/lib/plugin-sdk'
import { TvRail, type RailKey } from './tv-rail'
import { MobileCloseButton } from './mobile/mobile-header'
import { MT } from './mobile/mobile-tokens'
import { MobileSheet } from './mobile/mobile-sheet'
import { useTvText } from './tv-strings'
import { MobileTabBar } from './mobile/mobile-tab-bar'
import { getActivePlaylistId, useTvSettings } from './tv-settings-store'
import { useNarrowSurface } from '../hooks/useNarrowSurface'
import { TV } from './tv-ui'
import { liveColorVars, liveColors } from './v2-tokens'
import { LIVE_TV_BROWSE_PAGE_ID } from '../live-tv-shell'
import { getLiveTvLists } from '../live-tv-data'
import { listVodCategories } from '../vod-client'
import { getVodMode } from '../vod-data'
import { isDesktopTauri } from './guide-surface'
import { useImageTone, type Rgb } from '../sport/backdrop'
import { railTone } from './rail-tint'

const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])

/**
 * HERONS BILD PÅ APPENS HEM (glasrälsen, Jerry 2026-10-30).
 *
 * Värden lägger <main> till höger om rälsen (padding = ramens inset), så
 * karusellens bild ligger aldrig bakom rälsen. Ramen ritar därför själv en
 * suddig kopia av bilden bakom rälsen och tonar med bildens medelton.
 *
 * Skrivbordet: den aktiva sliden i appens hero-karusell (hero-carousel.tsx).
 * Prickarna bär `data-active="1"` i samma ordning som sliderna; utan prickar
 * (en enda slide) gäller den första. TV-läget: TV-heron (tv-hero.tsx) lägger
 * bildlagren `[data-tv-hero-image]` i ordning, det senaste sist.
 */
export function readHomeHeroImage(doc: Document): string | null {
  const slides = doc.querySelectorAll<HTMLElement>('.hero-carousel-slide')
  let layer: HTMLElement | null | undefined = null
  if (slides.length > 0) {
    const dots = Array.from(doc.querySelectorAll<HTMLElement>('.hero-carousel-dot'))
    const index = Math.max(0, dots.findIndex((dot) => dot.getAttribute('data-active') === '1'))
    const slide = slides[index] ?? slides[0]!
    layer = slide.querySelector<HTMLElement>('.hero-slide-media [style*="background-image"]')
  } else {
    const tvLayers = doc.querySelectorAll<HTMLElement>('[data-tv-hero-backdrop] [data-tv-hero-image][style*="background-image"]')
    layer = tvLayers[tvLayers.length - 1]
  }
  const match = layer?.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)
  return match?.[1] ?? null
}

/**
 * Följer heron medan Hem visas. Karusellen byter slide genom prickarnas
 * `data-active` och nya slides monteras som nya noder — bara de två
 * ändringarna lyssnas på (inte style, som React skriver om hela tiden), och
 * läsningen samlas till en per bildruta.
 */
function useHomeHeroImage(enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(() => (enabled && typeof document !== 'undefined' ? readHomeHeroImage(document) : null))
  useEffect(() => {
    if (!enabled || typeof MutationObserver === 'undefined') { setUrl(null); return }
    let frame = 0
    const read = () => { frame = 0; setUrl(readHomeHeroImage(document)) }
    read()
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(read) })
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-active'] })
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame) }
  }, [enabled])
  return url
}

const GLASS_BLUR = 'blur(24px) saturate(140%)'

export { railTone } from './rail-tint'

function hexRgb(color: string): Rgb | null {
  const h = color.trim().replace('#', '')
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) return null
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Telefonens flikrad med samma Bibliotek-villkor som tv-shell.tsx (VOD-kategorier
 * finns och läget är inte `off`) — men utan att montera hela modellen: det
 * hade dragit in kanal-/EPG-laddning i en ram som ligger ovanpå uppspelningsstart.
 * Aktiv källa läses ur lagringen precis som modellen gör, ett enda anrop, ingen polling.
 * Monteras bara på telefon.
 */
function PhoneTabBar({ select, onInsetBottom }: { select: (key: RailKey | 'hub' | 'guide' | 'sport' | 'search' | 'library' | 'home') => void; onInsetBottom?: (px: number) => void }) {
  const tvMode = useTvMode()
  const { tt } = useTvText()
  const [moreOpen, setMoreOpen] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  /*
    Flikradens höjd (rad + säkerhetsmarginal) till värden, så hemmet och
    detaljsidan slutar ovanför den och raden syns hela tiden. Mäts på själva
    <nav>:en; 0 när ramen avmonteras. Valfri i SDK:t (app före 0.1.624).
  */
  useEffect(() => {
    if (!onInsetBottom) return
    const nav = wrapRef.current?.querySelector<HTMLElement>('[data-testid="mobile-tab-bar"]')
    if (!nav) return
    const report = () => onInsetBottom(nav.getBoundingClientRect().height)
    report()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null
    observer?.observe(nav)
    return () => { observer?.disconnect(); onInsetBottom(0) }
  }, [onInsetBottom])
  useEffect(() => {
    let cancelled = false
    const playlistId = getActivePlaylistId()
    const source = tvMode || isDesktopTauri() ? getLiveTvLists().find((list) => list.id === playlistId)?.source ?? null : null
    if (getVodMode(playlistId) === 'off') return
    listVodCategories(source)
      .then((result) => { if (!cancelled) setShowLibrary(result.total > 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [tvMode])
  // Samma Mer-ark som i Live TV; varje post går in i Live TV-sidan. Ramen har ingen Bakåt-kedja (pushLayer) att anmäla sig i.
  return (
    <div ref={wrapRef}>
      <MobileTabBar view="hub" activeOverride="home" showLibrary={showLibrary} onGo={select} onMore={() => setMoreOpen(true)} />
      {moreOpen ? (
        <MobileSheet
          title={tt('moreActions')}
          items={[
            { key: 'favs', label: tt('sheetFavourites'), run: () => select('favs') },
            { key: 'multi', label: tt('sheetMultiview'), run: () => select('multi') },
            { key: 'settings', label: tt('sheetSettings'), run: () => select('settings') },
          ]}
          onClose={() => setMoreOpen(false)}
          pushLayer={() => () => {}}
          testId="more-sheet"
        />
      ) : null}
    </div>
  )
}

/**
 * Live TV:s räls runt appens VOD-hem (spec 2026-10-10). Samma `TvRail` som
 * inne i Live TV, med Hem aktivt; övriga poster går in i Live TV-sidan.
 * Värden ritar oss i en skalad låda (data-tv-scene-box="frame"), så
 * narrow-mätningen och designpixlarna är desamma som i sidans egen låda.
 * Ramen lindar sig inte i någon egen scenlåda.
 */
export function LiveTvLibraryFrame({ platform, onNavigate, onExit, onInset, onInsetBottom }: LibraryFrameProps) {
  const settings = useTvSettings()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const tvMode = useTvMode()
  const isTv = platform === 'tv'
  const phone = platform === 'phone'
  // Herotonen på skrivbord OCH TV (Jerry 2026-10-30); telefonen har ingen räls.
  // Oskärpan (och den suddiga bildkopian) bara på skrivbordet — för tung för Mi Box/Shield.
  const glass = !phone
  const blur = platform === 'desktop' && !tvMode
  const heroImage = useHomeHeroImage(glass)
  const heroTone = useImageTone(heroImage, glass)
  const narrow = useNarrowSurface(rootRef) && !isTv
  const select = (key: RailKey | 'hub' | 'guide' | 'sport' | 'search' | 'library' | 'home') => {
    if (key === 'back') { onExit(); return }
    if (key === 'home') return
    onNavigate({ pageId: LIVE_TV_BROWSE_PAGE_ID, params: { view: key } })
  }

  useEffect(() => {
    if (phone) { onInset(0); return }
    const el = rootRef.current
    if (!el) return
    // Skalad bredd (skärmpixlar) — det värdens inset vill ha.
    const report = () => onInset(el.getBoundingClientRect().width)
    report()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [phone, onInset])

  // Bakåt på rälsen lämnar Live TV. Värdens fokusmotor tar annars Back för
  // [data-col="side"] och skickar den till bläddringsbakåt (gör inget på VOD-hemmet).
  // Capture-fas på window, som tv-shell.tsx, så vi hinner före motorn. Bara när
  // trycket kommer inifrån ramen — står fokus i hemmets innehåll äger värden Back.
  useEffect(() => {
    if (phone) return
    const onKey = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key)) return
      const el = rootRef.current
      const target = event.target as Node | null
      if (!el || !target || !el.contains(target)) return
      event.preventDefault()
      event.stopPropagation()
      onExit()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [phone, onExit])

  if (phone) {
    // Samma X som på Kanaler, på samma plats (sidluft PAD, 6 px under systemradens inset = mitt i en 52 px hög rad).
    return (
      <>
        <div data-testid="frame-exit" style={{ position: 'fixed', top: `calc(${MT.SAFE_TOP_GUARD} + 6px)`, left: MT.PAD, zIndex: 51 }}>
          <MobileCloseButton onClose={onExit} />
        </div>
        <PhoneTabBar select={select} onInsetBottom={onInsetBottom} />
      </>
    )
  }
  // v2-tonen även runt Hem (Jerry 2026-10-30), samma val som i Utseende.
  // Egen bakgrundsfärg går före förvalet; variablerna ger rälsen samma meny/kortfärg som i skalet.
  const frameBg = liveColors(settings).bg
  /*
    GLASRÄLSEN (Jerry 2026-10-30: "glasversion av sidomenyn som tar färgen från
    heron"). Värden lägger heron till höger om rälsen och ramen tvingar .bg-mesh
    till den platta sidtonen, så bakom rälsen finns bara en enfärgad yta —
    backdrop-filter ensamt suddade alltså en platt färg och rälsen såg solid ut
    (appen, 2026-10-30). Därför, nerifrån och upp i ramens egen stapel:
      1. skrivbordet: en suddig kopia av herobilden (`filter`, inte backdrop),
      2. en genomskinlig toning i herons ton (railTone) som går mot sidtonen
         nertill; utan hero sidtonen själv, genomskinlig,
      3. rälsen, vars egen yta (`--lt-rail`) är genomskinlig.
    Skrivbordet behåller backdrop-filter för appens helbreddsbakgrunder (egen
    bakgrundsbild, plugin-hero) som går under rälsen. TV: bara toningen.
  */
  const bgRgb = hexRgb(frameBg) ?? [22, 26, 35]
  const tint: Rgb = heroTone ? railTone(heroTone) : bgRgb
  const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
  const tintImage = heroTone
    ? `linear-gradient(180deg, ${rgba(tint, 0.82)} 0%, ${rgba(tint, 0.7)} 55%, ${rgba(bgRgb, 0.78)} 100%)`
    : `linear-gradient(180deg, ${rgba(bgRgb, 0.72)} 0%, ${rgba(bgRgb, 0.86)} 100%)`
  const glassStyle: CSSProperties | null = glass ? {
    background: undefined,
    position: 'relative',
    isolation: 'isolate',
    ...(blur ? { backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR } : null),
    ['--lt-rail' as string]: 'transparent',
  } : null
  const layer: CSSProperties = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }
  return (
    <div
      ref={rootRef}
      data-live-tv-frame-bg={frameBg}
      data-live-tv-frame-glass={glass ? '1' : undefined}
      // happy-dom tappar backdrop-filter; attributen gör glaset testbart.
      data-live-tv-frame-blur={blur ? GLASS_BLUR : undefined}
      data-live-tv-frame-tint={glass ? `rgb(${tint[0]},${tint[1]},${tint[2]})` : undefined}
      style={{ ...(liveColorVars(settings) as CSSProperties), height: '100%', display: 'flex', background: frameBg, color: TV.text, fontFamily: TV.font, ...glassStyle }}
    >
      {glass && blur && heroImage ? (
        <div aria-hidden="true" style={{ ...layer, overflow: 'hidden' }}>
          <div
            data-live-tv-frame-hero={heroImage}
            style={{ position: 'absolute', inset: -48, backgroundImage: `url("${heroImage}")`, backgroundSize: 'cover', backgroundPosition: 'left center', filter: GLASS_BLUR, opacity: 0.85 }}
          />
        </div>
      ) : null}
      {glass ? <div aria-hidden="true" data-live-tv-frame-tint-layer={tintImage /* happy-dom tappar gradienter med färgstopp */} style={{ ...layer, backgroundImage: tintImage, transition: 'opacity 600ms ease' }} /> : null}
      {/* Appens sidbakgrund bor på `.bg-mesh` (spa/src/index.css). Ramen finns bara
          medan Live TV:s Hem visas, så regeln följer med den och försvinner när man
          lämnar — hemsidan får samma ton som Live TV:s övriga vyer (Jerry 2026-10-30).
          Detaljsidans flytande Hem-pill (media-details-panel.tsx, [data-details-home])
          göms samma tid: rälsen har redan Hem. Bibliotekschipsen (Filmer, Serier,
          Sök; home-rows.tsx [data-library-nav]) får herons pilknappars glasstil:
          mörk botten, ljus toning, kant överst (Jerry 2026-10-31). */}
      <style>{`.bg-mesh { background-image: none !important; background-color: ${frameBg} !important; } [data-details-home] { display: none !important; } [data-library-nav] { border-radius: 9999px !important; background-color: rgba(0,0,0,0.35) !important; background-image: linear-gradient(rgba(255,255,255,0.16), rgba(255,255,255,0.04)) !important; border-color: transparent !important; color: #fff !important; font-weight: 600 !important; } [data-library-nav]:not(:focus):not([data-fcur="1"]) { box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.22) !important; } [data-library-nav][data-current] { background-image: linear-gradient(rgba(255,255,255,0.30), rgba(255,255,255,0.10)) !important; }`}</style>
      <TvRail active="home" isTv={isTv} narrow={narrow} labels={settings.railLabels && !narrow} onSelect={select} />
    </div>
  )
}
