'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { getTvGlassMenu, requestBrowseBack, useTvMode, type BrowsePageProps, type TvGlassMenuAction, type TvGlassMenuTarget } from '@/lib/plugin-sdk'
import { channelKey, type M3uChannel } from '../live-tv-data'
import { useLiveTvModel, type LiveTvModel } from '../live-tv-model'
import { LIVE_TV_BROWSE_PAGE_ID, encodeChannelParams, type PlayRequest } from '../live-tv-shell'
import { PinGate } from '../live-tv-ui'
import { activeProfileHasPin, isUnlockedThisSession, markUnlockedThisSession, pinSupportAvailable, toggleChannelLock, verifyActiveProfilePin } from '../channel-locks'
import { useNarrowSurface } from '../hooks/useNarrowSurface'
import { usePhoneSurface } from '../hooks/usePhoneSurface'
import { useSwipeBack } from '../hooks/useSwipeBack'
import { useTvText } from './tv-strings'
import { isDesktopTauri } from './guide-surface'
import { TV, TvFocusStyle, dp, station, Icons } from './tv-ui'
import { TvHoldAffordance } from './tv-hold-affordance'
import { useTvSettings, type TvSettings } from './tv-settings-store'
import { addToFirstFree, getMultiviewState, setMultiviewState } from './tv-multiview-store'
import { createZapBuffer, resolveZap } from './tv-zap'
import { releaseAllSurfaces } from './video-surface'
import { cutoutClipPath, useSurfaceCutouts, type SurfaceCutout } from './surface-cutouts'
import { buildTvPlayerProps } from './tv-player-props'
import type { LiveTvPlayerTvProps } from './tv-player-types'
import { TV_VIEWS } from './tv-views'
import { MobileTabBar } from './mobile/mobile-tab-bar'
import { MobileSheet } from './mobile/mobile-sheet'

/**
 * TV-SKALETS BAKGRUND MED HÅL.
 *
 * Normalt målas `TV.bg` direkt på skalets rot. Men mpv/media3 ritar sina
 * extraytor i en vy UNDER webbvyn, så en heltäckande bakgrund gör multivyns
 * rutor svarta (ljud utan bild — uppmätt på riktig maskin). Medan minst en
 * nativ yta lever blir roten därför genomskinlig och bakgrunden ritas här i
 * stället, med ett `clip-path`-hål per ytrektangel.
 *
 * KOORDINATRYMD: hålen kommer in i SKÄRMpixlar
 * (`getBoundingClientRect`), men `clip-path` räknas i elementets EGNA
 * layoutpixlar — och TV-scenen skalar hela sidan med en `transform`
 * (`lib/tv-scene.ts` i appen). Elementet mäter sig därför självt och räknar om
 * hålen: skalan är mätt bredd / layoutbredd, vilket ger 1 utanför scenen och
 * rätt tal inuti den. Samma fälla som en gång gjorde HTML-ytans fixed-portal
 * dubbelskalad, se `video-surface.ts`.
 */
function SurfaceBackdrop({ cutouts }: { cutouts: SurfaceCutout[] }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [clip, setClip] = useState<string>(() => cutoutClipPath([]))
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const box = el.getBoundingClientRect()
      const scale = el.offsetWidth > 0 && box.width > 0 ? box.width / el.offsetWidth : 1
      setClip(cutoutClipPath(cutouts.map((cutout) => ({
        left: (cutout.left - box.left) / scale,
        top: (cutout.top - box.top) / scale,
        width: cutout.width / scale,
        height: cutout.height / scale,
        radius: cutout.radius / scale,
      }))))
    }
    measure()
    if (typeof window === 'undefined') return
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [cutouts])
  return (
    <div
      ref={ref}
      data-live-tv-backdrop=""
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, background: TV.bg, pointerEvents: 'none', zIndex: -1, clipPath: clip, WebkitClipPath: clip }}
    />
  )
}

export type TvView = 'hub' | 'guide' | 'favs' | 'channel' | 'search' | 'multi' | 'settings'
const VIEWS: TvView[] = ['hub', 'guide', 'favs', 'channel', 'search', 'multi', 'settings']

export interface TvNav {
  view: TvView
  params: Record<string, string>
  go(view: TvView, params?: Record<string, string>): void
  back(): void
  play(request: PlayRequest): void
  openChannel(channel: M3uChannel, programmeStart?: number): void
  openMenu(target: TvGlassMenuTarget): void
  channelMenu(channel: M3uChannel, element: HTMLElement, extra?: TvGlassMenuAction[]): void
  addToMultiview(channel: M3uChannel): void
  pushLayer(close: () => void): () => void
  toast(text: string): void
  playerOpen: boolean
}

export interface TvViewProps { model: LiveTvModel; nav: TvNav; params: Record<string, string>; settings: TvSettings; phone: boolean }

/**
 * Vad PIN-grinden väntar på.
 *
 * Både uppspelning av en låst kanal OCH lås/upplåsning från glasmenyn går
 * genom SAMMA grind: `channelMenu` växlade tidigare låset rakt av, vilket lät
 * vem som helst låsa upp en kanal med två knapptryck och därmed göra hela
 * föräldrakontrollen verkningslös (`tv-channel.tsx` och `tv-settings.tsx`
 * kräver PIN i båda riktningarna — menyn måste göra likadant).
 */
type PendingGate =
  | { kind: 'play'; request: PlayRequest }
  | { kind: 'lock'; channel: M3uChannel }

type PlayerComponent = ComponentType<{
  channel: M3uChannel
  onClose: () => void
  listId?: string | null
  epgUrls?: string[]
  onSwitchChannel?: (channel: M3uChannel) => void
  tv?: LiveTvPlayerTvProps
}>

const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack'])
const ZAP_TIMEOUT_MS = 1500

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
const RAIL_W_TV = 104
const RAIL_W_DESKTOP = 84
const RAIL_W_NARROW = 64
/** Postens sida på TV och skrivbord. */
const RAIL_ITEM_WIDE = 60
/** Postens sida på en smal yta — fortfarande över 44 px träffyta. */
const RAIL_ITEM_NARROW = 48

export { RAIL_ITEM_NARROW, RAIL_ITEM_WIDE, RAIL_W_DESKTOP, RAIL_W_NARROW, RAIL_W_TV }

function viewFromParams(params?: Record<string, string>): TvView {
  const raw = params?.view
  if (raw && (VIEWS as string[]).includes(raw)) return raw as TvView
  if (!raw && params?.url) return 'channel'
  return 'hub'
}

export function LiveTvTvShell({ params, onNavigate }: BrowsePageProps) {
  const { tt, locale } = useTvText()
  const model = useLiveTvModel()
  const settings = useTvSettings()
  // Hål i skalets bakgrund åt nativa videoytor (multivy, förhandsvisningar).
  // Tom lista = ingen nativ yta lever, och skalet målas precis som förut.
  const cutouts = useSurfaceCutouts()
  const hasCutouts = cutouts.length > 0
  const view = viewFromParams(params)
  const viewParams = useMemo(() => params ?? {}, [params])

  const [Player, setPlayer] = useState<PlayerComponent | null>(null)
  const [active, setActive] = useState<PlayRequest | null>(null)
  const [pending, setPending] = useState<PendingGate | null>(null)
  const [menu, setMenu] = useState<TvGlassMenuTarget | null>(null)
  const [zapDigits, setZapDigits] = useState('')
  const [toastText, setToastText] = useState<string | null>(null)
  const layersRef = useRef<Array<() => void>>([])
  const mainRef = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const TvGlassMenu = getTvGlassMenu()
  /**
   * TV-läget lever kvar HÄR och bara här, för de tre affordanser som inte
   * ska finnas på en TV: skärmtangentbord mot riktigt textfält (P4/P7),
   * "…"-knappen vid hovring (P3) och Bakåt-posten i ikonraden (P3).
   * Vyerna, vad de heter och hur de navigeras är identiska på alla ytor.
   */
  const isTv = useTvMode()
  /**
   * Smal yta = värdens MÄTNING av scenlådan, aldrig ett eget fönstertal:
   * designbredden går aldrig under 1280 (se useNarrowSurface). I TV-läge
   * finns ingen låda, så flaggan är falsk där av sig själv — `isTv`-gardet
   * är ändå med så en kvarglömd låda aldrig kan krympa TV-raden.
   */
  const narrow = useNarrowSurface(rootRef) && !isTv
  /**
   * Telefon = värdens mätning av lådan, aldrig ett eget breddtal — precis som
   * `narrow` ovan. En telefon är ALLTID också smal (spec), men det omvända
   * gäller inte: ett smalt SKRIVBORDSFÖNSTER är `narrow` utan att vara
   * `phone`, och ska fortsatt få fas 1:s komprimerade rad, inte flik-raden.
   *
   * Det här är skalets ENDA anrop av `usePhoneSurface`: vyerna och deras
   * underkomponenter får `phone` som prop härifrån (`TvViewProps`), så att
   * hela trädet svarar på samma mätning.
   */
  const phone = usePhoneSurface(rootRef) && !isTv
  /**
   * TV-rester bort på skrivbordet (spec "Beslut", TV-rester): den städade
   * guiden ritas i skrivbordsappen (Tauri), inte i TV-läget och inte på
   * telefonen — TV behåller glöd, håll-OK och glasmenyn (fjärren behöver
   * dem). Attributet är bara en CSS-krok (`TvFocusStyle`); routinggrinden
   * för själva guiden är `useNewGuideSurface` i `guide-surface.ts`.
   */
  const desktopSurface = isDesktopTauri() && !isTv && !phone
  const railWidth = isTv ? RAIL_W_TV : narrow ? RAIL_W_NARROW : RAIL_W_DESKTOP
  const railItemSize = narrow ? RAIL_ITEM_NARROW : RAIL_ITEM_WIDE

  /**
   * More-arket (telefon): flik-raden har fyra vyer; multivy och inställningar
   * ligger i ett bottenark bakom "Mer". Arket registrerar sig självt som
   * lager i Bakåt-kedjan via `pushLayer` (se `MobileSheet`).
   */
  const [moreOpen, setMoreOpen] = useState(false)

  /**
   * Fokus på vyns startstation vid varje vybyte.
   *
   * Värdens fokusmotor flyttar fokus till [data-init] när en SIDA monteras,
   * men ikonraden byter bara pluginets egen vy — värdsidan monteras aldrig om.
   * Utan det här blev fokus kvar på ikonradens knapp: uppmätt i tv-sim gav
   * "Kanalguide" från raden en guide där ingen rad var vald, så toppbandet
   * stod kvar på "Ingen programinformation" tills användaren pilade in i
   * listan själv.
   *
   * Två rAF: raden renderas först efter att vyn monterat, och [data-init]
   * finns inte i första passet. Står fokus redan inne i vyn (värden hann
   * före, eller vyn flyttade fokus själv) rör vi ingenting.
   */
  useEffect(() => {
    if (active) return
    let frame = 0
    const focusInit = () => {
      const main = mainRef.current
      if (!main) return
      if (document.activeElement && main.contains(document.activeElement)) return
      main.querySelector<HTMLElement>('[data-init]')?.focus({ preventScroll: true })
    }
    frame = window.requestAnimationFrame(() => { frame = window.requestAnimationFrame(focusInit) })
    return () => window.cancelAnimationFrame(frame)
  }, [view, active])

  useEffect(() => {
    if (!active || Player) return
    let cancelled = false
    // Castet: LiveTvPlayer accepterar ännu inte `tv` (Task 16), men PlayerComponent
    // deklarerar den som valfri — samma FunctionComponent/ReactNode-mismatch som
    // redan finns i live-tv-shell.tsx:s motsvarande laddning.
    void import('../live-tv-player').then((mod) => { if (!cancelled) setPlayer(() => mod.LiveTvPlayer as PlayerComponent) }).catch(() => { if (!cancelled) setActive(null) })
    return () => { cancelled = true }
  }, [active, Player])

  const go = useCallback((next: TvView, extra: Record<string, string> = {}) => {
    onNavigate({ pageId: LIVE_TV_BROWSE_PAGE_ID, params: { view: next, ...extra } })
  }, [onNavigate])

  const toast = useCallback((text: string) => {
    setToastText(text)
    window.setTimeout(() => setToastText((current) => (current === text ? null : current)), 1800)
  }, [])

  /**
   * Färskaste modellen i en ref.
   *
   * `useLiveTvModel()` returnerar ett NYTT objekt varje rendering, och
   * `model.locked` är dessutom en ny `Set` per anrop (channel-locks.ts). Låg
   * de i beroendelistorna bytte `play`, `channelMenu` och därmed hela `nav`
   * identitet vid varje minuttick — och varje lager som har `nav` i sin
   * effekt (kanalväljaren, hubbens spellistmeny) körde om sin öppningseffekt,
   * läste om "vem öppnade mig" från det fokus som råkade gälla just då och
   * flyttade fokus tillbaka till [data-init]. Ref:en håller nav stabil.
   */
  const modelRef = useRef(model)
  useEffect(() => { modelRef.current = model })

  const play = useCallback((request: PlayRequest) => {
    const locked = modelRef.current.locked.has(channelKey(request.channel))
    if (locked && !isUnlockedThisSession() && pinSupportAvailable() && activeProfileHasPin()) {
      setPending({ kind: 'play', request })
      return
    }
    void releaseAllSurfaces().finally(() => setActive(request))
  }, [])

  const openChannel = useCallback((channel: M3uChannel, programmeStart?: number) => {
    go('channel', { ...encodeChannelParams(channel), ...(programmeStart ? { programme: String(programmeStart) } : {}) })
  }, [go])

  const addToMultiview = useCallback((channel: M3uChannel) => {
    setMultiviewState(addToFirstFree(getMultiviewState(), channelKey(channel)))
    toast(tt('addedToMultiview'))
  }, [toast, tt])

  /**
   * Lås/upplås från glasmenyn kräver PIN i BÅDA riktningarna — grinden är den
   * enda kontrollen som finns, och utan den räckte "håll OK → Lås upp" för att
   * gå förbi föräldrakontrollen helt. Saknas PIN-stöd (äldre app) eller har
   * profilen ingen PIN finns inget att verifiera mot, och låset växlas direkt
   * precis som i `tv-settings.tsx`.
   */
  const requestLockToggle = useCallback((channel: M3uChannel) => {
    if (!pinSupportAvailable() || !activeProfileHasPin()) { toggleChannelLock(channel); return }
    setPending({ kind: 'lock', channel })
  }, [])

  const channelMenu = useCallback((channel: M3uChannel, element: HTMLElement, extra: TvGlassMenuAction[] = []) => {
    const model = modelRef.current
    const key = channelKey(channel)
    const pinned = model.pinnedSet.has(key)
    const locked = model.locked.has(key)
    setMenu({
      title: channel.name,
      element,
      actions: [
        { key: 'play', label: tt('watchNow'), run: () => play({ channel }) },
        { key: 'pin', label: pinned ? tt('menuRemoveFavourite') : tt('menuAddFavourite'), run: () => model.togglePin(channel) },
        { key: 'info', label: tt('menuChannelDetails'), run: () => openChannel(channel) },
        { key: 'multi', label: tt('menuAddMultiview'), run: () => addToMultiview(channel) },
        ...extra,
        ...(pinSupportAvailable() && activeProfileHasPin()
          ? [{ key: 'lock', label: locked ? tt('menuUnlock') : tt('menuLock'), run: () => requestLockToggle(channel) }]
          : []),
      ],
    })
  }, [tt, play, openChannel, addToMultiview, requestLockToggle])

  const pushLayer = useCallback((close: () => void) => {
    layersRef.current.push(close)
    return () => { layersRef.current = layersRef.current.filter((c) => c !== close) }
  }, [])

  const back = useCallback(() => {
    // Glasmenyn ligger ÖVERST. Tangentvägen når aldrig hit medan den är öppen
    // (lyssnaren nedan står tillbaka — värdens meny äger sin egen Back), men
    // pekarvägen gör det: Bakåt-posten i raden anropar `back()` direkt, och
    // utan den här nivån stängde ett klick vyn BAKOM en öppen meny och lämnade
    // menyn hängande över en ny sida.
    if (menu) { setMenu(null); return }
    // PIN-grinden ligger över spelaren (den öppnas utan att röra `active`).
    if (pending) { setPending(null); return }
    // Spelaren äger Bakåt före lagren. Vyernas lager (guidens lägesstack,
    // listornas nivå 2) står KVAR registrerade medan spelaren är öppen —
    // av- och återregistrering runt uppspelningen kastade om deras ordning
    // (barnets effekt kör före förälderns), så Bakåt efter spelningen hoppade
    // fel nivå. Här stängs spelaren först; lagren rörs inte.
    if (active) { setActive(null); return }
    const top = layersRef.current[layersRef.current.length - 1]
    if (top) { top(); return }
    if (view === 'channel') { go('guide'); return }
    if (view !== 'hub') { go('hub'); return }
    requestBrowseBack()
  }, [menu, pending, active, view, go])

  // Back i capture-fas. Värdens glasmeny sköter sin egen Back, därför avstår
  // skalet medan den är öppen. På telefon är kanalmenyn i stället skalets EGET
  // bottenark (`MobileSheet`, utan egen lyssnare) — då tar skalet Back och
  // `back()` stänger arket som sin första nivå.
  //
  // Spelaren äger Back helt medan den är öppen (Fix round 1, Task 16-review):
  // med `active !== null` renderas `<Player>`, som har sin egen capture-fas-
  // lyssnare (och, i TV-läge, TV-kromets — se tv-player-chrome.tsx). Tre
  // capture-lyssnare på SAMMA `window`-mål kan inte lita på registrerings-
  // ordning (spelarens lyssnare läggs om varje gång dess beroenden ändras),
  // så skalet stannar helt utanför i stället för att kapplöpa om trycket.
  // `back()` självt rörs inte — det kan fortfarande kallas programmatiskt
  // (t.ex. från en vy) och har redan en `if (active) { setActive(null); … }`
  // -gren för den vägen.
  //
  // MEN: spelaren äger Back först när den FAKTISKT är monterad. `active` sätts
  // direkt, medan `<Player>` laddas med en dynamisk import — under de
  // millisekunderna (långsam disk, kall runtime) fanns ingen Back-lyssnare
  // alls, och trycket föll igenom till värdsidan bakom. Därför `active &&
  // Player`: medan importen pågår tar skalet Back och stänger `active`.
  //
  // UNDANTAG: PIN-grinden. Kanalbyte till en LÅST kanal öppnar grinden UTAN
  // att röra `active` (spelaren blir kvar bakom den, se `play` ovan) — då
  // måste skalet ta Back SJÄLVT trots att spelaren är monterad, annars finns
  // ingen väg att avbryta grinden (kromet står tillbaka helt när
  // `tv.gateOpen`, se tv-player-chrome.tsx, och `PinGate` hanterar bara
  // Escape på sitt eget fält — inte Backspace). Kollas FÖRE `active &&
  // Player`-grenen, och före INPUT/TEXTAREA-undantaget: PIN-fältet ÄR ett
  // input, men Back ska ändå avbryta grinden oavsett fokus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!BACK_KEYS.has(event.key)) return
      if (menu && !phone) return
      if (pending) {
        event.preventDefault()
        event.stopPropagation()
        back()
        return
      }
      if (active && Player) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      // Värdens egna paneler (TV-tangentbordet) stänger sig själva.
      if (target?.closest?.('[data-live-tv-host-ui]')) return
      event.preventDefault()
      event.stopPropagation()
      back()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [back, menu, phone, active, Player, pending])

  // Nummertangenter: favoriter 1–N först, sedan listnummer.
  const favourites = model.favouriteChannels
  const channels = model.channels
  // Senaste versionen av allt onCommit behöver, i en ref: bufferten skapas EN
  // gång (nedan) så en pågående zapp-timer aldrig kapas av ett orelaterat
  // omrender. `favourites`/`channels` byter identitet vid varje minuttick och
  // hade annars gjort om bufferten — och nollställt dess timer — innan
  // 1500 ms hunnit gå.
  const zapDepsRef = useRef({ favourites, channels, play, toast, tt })
  useEffect(() => { zapDepsRef.current = { favourites, channels, play, toast, tt } })
  const zapRef = useRef<ReturnType<typeof createZapBuffer> | null>(null)
  useEffect(() => {
    const buffer = createZapBuffer({
      timeoutMs: ZAP_TIMEOUT_MS,
      onChange: setZapDigits,
      onCommit: (digits) => {
        const { favourites, channels, play, toast, tt } = zapDepsRef.current
        const hit = resolveZap(digits, favourites, channels)
        if (hit) play({ channel: hit })
        else toast(tt('zapMiss', { n: digits }))
      },
    })
    zapRef.current = buffer
    return () => { buffer.dispose(); zapRef.current = null }
  }, [])
  useEffect(() => {
    // Telefonen har inga sifferknappar för zapp (systemtangentbordet skriver i fält).
    if (!settings.numericZap || phone) return
    const onKey = (event: KeyboardEvent) => {
      if (menu || layersRef.current.length > 0) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      // Värdens egna redigerbara ytor (spec §5). Sätts oavsett läge: en TV har
      // inga contenteditable-fält, så undantaget är inert där.
      if (target?.closest?.('[contenteditable]:not([contenteditable="false"])')) return
      if (target?.closest?.('[data-live-tv-keyboard]')) return
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        zapRef.current?.push(event.key)
      } else if (event.key === 'Enter' && zapDigits) {
        event.preventDefault()
        event.stopPropagation()
        zapRef.current?.commit()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [settings.numericZap, menu, zapDigits, phone])

  // Starta på senaste kanalen: bara när hubben öppnas utan parametrar.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current || !settings.startOnLastChannel || view !== 'hub' || params?.url) return
    const last = model.history[0]
    const channel = last ? model.byUrl.get(last.url) : null
    if (!channel) return
    startedRef.current = true
    play({ channel })
  }, [settings.startOnLastChannel, view, params, model.history, model.byUrl, play])

  const nav: TvNav = useMemo(() => ({
    view, params: viewParams, go, back, play, openChannel, openMenu: setMenu, channelMenu, addToMultiview, pushLayer, toast, playerOpen: active !== null,
  }), [view, viewParams, go, back, play, openChannel, channelMenu, addToMultiview, pushLayer, toast, active])

  /**
   * Kantsvepet tar ETT steg i Bakåt-kedjan — det hoppar inte till hubben som
   * skrivbordssidorna gjorde (spec §4.1). `back` är samma funktion som
   * tangenten och ikonradens Bakåt-post kör, så gesten kan aldrig komma ur fas
   * med dem. Hooken no-oppar själv i TV-läge.
   *
   * `enabled`: glasmenyn och PIN-grinden täcker skärmen men ligger kvar i
   * sidans DOM — utan flaggan hade ett drag bakom dem navigerat undan sidan
   * under dem. Glasmenyn äger dessutom sin egen Back. Telefonens kanalark
   * är däremot skalets eget lager: där tar svepet ett steg och stänger arket.
   */
  useSwipeBack(back, (!menu || phone) && pending === null)

  const View = TV_VIEWS[view]
  const activeChannel: M3uChannel | null = active
    ? active.url ? { ...active.channel, url: active.url, name: active.label ?? active.channel.name } : active.channel
    : null

  /**
   * `run` saknas för vyposterna — de navigerar till sin egen vy. Bakåt-posten
   * är den enda som kör något annat, och delar i övrigt exakt radens mått och
   * utseende (smalläget följer med av sig själv genom `railItemSize`).
   */
  type RailItem = { key: string; label: string; icon: ReactNode; run?: () => void }
  const rail: RailItem[] = [
    { key: 'search', label: tt('railSearch'), icon: <Icons.Search /> },
    { key: 'hub', label: tt('railHome'), icon: <Icons.Home /> },
    { key: 'guide', label: tt('railGuide'), icon: <Icons.Tv /> },
    { key: 'multi', label: tt('railMultiview'), icon: <Icons.SquaresFour /> },
    { key: 'favs', label: tt('railFavourites'), icon: <Icons.Heart /> },
  ]
  const railItem = (item: RailItem, extraStyle?: CSSProperties) => {
    const activeItem = item.key === view || (item.key === 'guide' && view === 'channel')
    return (
      <div
        key={item.key}
        {...station(item.run ?? (() => go(item.key as TvView)), undefined, { 'data-testid': `rail-${item.key}`, 'aria-label': item.label, title: item.label })}
        style={{ width: dp(railItemSize), height: dp(railItemSize), borderRadius: dp(16), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: activeItem ? TV.s14 : 'transparent', color: activeItem ? TV.text : 'rgba(243,244,248,0.55)', ...extraStyle }}
      >
        {item.icon}
      </div>
    )
  }

  const tvPlayerProps: LiveTvPlayerTvProps | undefined = activeChannel
    ? buildTvPlayerProps({
        model,
        settings,
        channel: activeChannel,
        locale,
        phone,
        // Kanalbyte till en LÅST kanal lämnar `active` orörd och öppnar
        // grinden ovanpå spelaren (se `play` ovan) — kromet måste då stå
        // tillbaka helt (Enter/Back) så att PIN-grinden äger dem.
        gateOpen: pending !== null,
        onOpenChannelDetails: () => { setActive(null); openChannel(activeChannel) },
        onOpenMultiview: () => { setActive(null); go('multi') },
        onOpenGuide: () => { setActive(null); go('guide') },
        onAddToMultiview: addToMultiview,
        // Kanalbyte inifrån spelaren (ChannelUp/Down, mini-guiden) går genom
        // `play` — inte `setActive` — så att en LÅST kanal möter PIN-grinden.
        // `play` lämnar `active` orörd tills grinden är klar, så spelaren
        // blinkar inte bort under bytet.
        onSwitchChannel: (channel) => play({ channel }),
      })
    : undefined

  return (
    <div
      ref={rootRef}
      data-live-tv-tv-root=""
      // `position: relative` alltid: "…"-knappen (P3) ligger absolut placerad
      // i ROTENS koordinatrum, och utan en positionerad rot hade den räknats
      // mot en godtycklig förfader i värdens träd. Det skapar ingen
      // stackningskontext och påverkar inte de `position: fixed`-lager som
      // ligger i skalet (toasts, paneler).
      //
      // `zIndex: 0` bara när hål finns: DÅ blir roten en stackningskontext, så
      // att bakgrundens `zIndex: -1` hamnar under skalets innehåll men inte
      // rymmer ut ur pluginet.
      // `data-lt-phone`: telefonens CSS-krok (fokusring/hovring av, se
      // `TvFocusStyle`). Telefonen ritas i äkta px (skala 1 under 640 px),
      // därför en egen grundstorlek i stället för scenens 22 designpixlar.
      {...(phone ? { 'data-lt-phone': '1' } : {})}
      // `data-live-tv-desktop`: skrivbordets CSS-krok (tunn fokuskant i
      // stället för glöden, se `TvFocusStyle`) — bara i skrivbordsappen.
      {...(desktopSurface ? { 'data-live-tv-desktop': '1' } : {})}
      style={{ display: 'flex', position: 'relative', height: '100%', minHeight: 0, background: hasCutouts ? 'transparent' : TV.bg, color: TV.text, fontFamily: TV.font, fontSize: phone ? 15 : dp(22), lineHeight: phone ? 1.4 : 1.3, ...(hasCutouts ? { zIndex: 0 } : null) }}
    >
      {hasCutouts ? <SurfaceBackdrop cutouts={cutouts} /> : null}
      <TvFocusStyle />
      {phone ? null : (
        /* Ikonrad: pluginets egen navigation inne i Live TV. Inte data-col="side" —
            värdens Back-regel hade då flyttat fokus hit i stället för att gå bakåt.
            OFÖRÄNDRAD ovanför telefonbredden (spec §1/krav 3) — se
            "utan telefonattribut: ikonraden som förut" i tv-shell-phone.test.tsx.
            På telefon finns ingen rad alls: flik-raden nedan tar över. */
        <nav data-testid="tv-rail" aria-label={tt('liveTv')} style={{ width: dp(railWidth), flexShrink: 0, borderRight: `1px solid ${TV.line}`, background: 'linear-gradient(180deg, rgba(252,252,255,0.05), rgba(252,252,255,0.02))', padding: `${dp(narrow ? 16 : 36)}px 0 ${dp(narrow ? 16 : 32)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dp(narrow ? 8 : 14) }}>
          {/* Märket är ren dekor och det enda "etiketten" raden har. På en smal
              yta går den bort tillsammans med luften ovanför — posterna ska nå
              ner i skärmen, inte trängas under en logotyp. */}
          {narrow ? null : (
            <div data-live-tv-rail-badge="" aria-hidden="true" style={{ width: dp(44), height: dp(44), borderRadius: dp(12), background: TV.acc, color: TV.onAcc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: dp(22), marginBottom: dp(24) }}>L</div>
          )}
          {/* Bakåt med pekaren: SAMMA `back()` som tangenten, så alla fyra
              nivåerna (lager → spelare → vy → requestBrowseBack) nås med musen.
              Aldrig på TV — där finns fjärrens egen Bakåt-knapp, och TV-designen
              är godkänd som den är. */}
          {isTv ? null : railItem({ key: 'back', label: tt('railBack'), icon: <Icons.ChevronLeft />, run: back })}
          {rail.map((item) => railItem(item))}
          {railItem({ key: 'settings', label: tt('railSettings'), icon: <Icons.Gear /> }, { marginTop: 'auto' })}
        </nav>
      )}
      <main ref={mainRef} style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <View key={view} model={model} nav={nav} params={viewParams} settings={settings} phone={phone} />
      </main>
      {/* Flik-raden (telefon): borta medan spelaren är öppen — den ligger
          `position: fixed` och hade annars legat över bilden. */}
      {phone && active === null ? <MobileTabBar view={view} onGo={(v) => go(v)} onMore={() => setMoreOpen(true)} /> : null}
      {phone && moreOpen ? (
        <MobileSheet
          title={tt('moreActions')}
          items={[
            { key: 'multi', label: tt('sheetMultiview'), run: () => go('multi') },
            { key: 'settings', label: tt('sheetSettings'), run: () => go('settings') },
          ]}
          onClose={() => setMoreOpen(false)}
          pushLayer={pushLayer}
          testId="more-sheet"
        />
      ) : null}

      {activeChannel && Player ? (
        <Player channel={activeChannel} onClose={() => setActive(null)} listId={model.epgListId} epgUrls={model.epgUrls} onSwitchChannel={(channel) => play({ channel })} tv={tvPlayerProps} />
      ) : null}
      <PinGate
        open={pending !== null}
        title={tt('enterPin')}
        wrongText={tt('pinWrong')}
        unlockLabel={tt('unlock')}
        cancelLabel={tt('cancel')}
        onVerify={verifyActiveProfilePin}
        onClose={() => setPending(null)}
        onUnlocked={() => {
          const gate = pending
          setPending(null)
          if (!gate) return
          if (gate.kind === 'lock') { toggleChannelLock(gate.channel); return }
          // Sessionsupplåsningen gäller bara uppspelningsgrinden: att ha
          // bevisat sin PIN för att LÅSA en kanal ska inte öppna alla andra
          // låsta kanaler resten av sessionen.
          markUnlockedThisSession()
          void releaseAllSurfaces().finally(() => setActive(gate.request))
        }}
      />
      {/* EN "…"-knapp för hela skalet, placerad över den hovrade stationen.
          Ligger i ROTENS koordinatrum (roten är `position: relative` ovan) —
          scenlådans transform gäller båda, så måtten förblir designpixlar. */}
      {/* `key={view}` monterar om knappen vid vybyte: stationen den pekade på
          är borta ur DOM:en, och en knapp kvar i luften pekar på ingenting. */}
      {/* Aldrig på telefon: där finns ingen hovring, och långtrycket är vägen
          till kanalmenyn (spec §5). */}
      <TvHoldAffordance key={view} rootRef={rootRef} enabled={!isTv && !phone} />
      {/* Kanalmenyn: värdens glasmeny är TV-scenens; på telefon landar SAMMA
          `menu`-mål i ett bottenark. `back()` läser `menu` först och stänger
          den där — arket registrerar sig dessutom som lager via `pushLayer`,
          men `back()` returnerar efter `setMenu(null)` och når aldrig lagrets
          close i samma anrop. */}
      {menu ? (
        phone
          ? <MobileSheet title={menu.title} items={menu.actions} onClose={() => setMenu(null)} pushLayer={pushLayer} testId="channel-sheet" />
          : TvGlassMenu ? <TvGlassMenu target={menu} onClose={() => setMenu(null)} /> : null
      ) : null}
      {/* Sifferzappningens ruta hör till fjärr/tangentbord — inte telefonen. */}
      {zapDigits && !phone ? (
        <div data-testid="zap-digits" style={{ position: 'fixed', top: dp(36), right: dp(48), zIndex: 80, padding: `${dp(10)}px ${dp(22)}px`, borderRadius: dp(12), background: TV.glass, fontSize: dp(34), fontWeight: 600, letterSpacing: '0.1em' }}>{zapDigits}</div>
      ) : null}
      {toastText ? (
        <div role="status" data-live-tv-layer="" style={{ position: 'fixed', bottom: dp(40), left: '50%', transform: 'translateX(-50%)', zIndex: 80, padding: `${dp(12)}px ${dp(24)}px`, borderRadius: 999, background: TV.glass, fontSize: dp(19) }}>{toastText}</div>
      ) : null}
    </div>
  )
}
