'use client'

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  closeMpvPlayer,
  getTvKeyboardPanel,
  isTauriEnv,
  onTvFocusEdge,
  useLang,
  useTvMode,
} from '@/lib/plugin-sdk'
import { LiveTvLogoImage } from './live-tv-logo-image'
import { startOfLocalDay, useLiveTvModel, type LiveTvModel } from './live-tv-model'
import { Btn, ChannelBadge, Kicker, LT, LiveTag, ProgressBar, formatClock, progressOf } from './live-tv-ui'
import { useHubText } from './hub-strings'
import { NowBadge } from './now-badge'
import { ResultsPagination } from './results-pagination'
import {
  addChannelToLiveTvList,
  createLiveTvList,
  deleteLiveTvList,
  getAllLiveTvEpgUrls,
  getLiveTvLists,
  getLiveTvLogoSrc,
  getLiveTvUrlsKey,
  getM3uUrls,
  getXtreamLogins,
  importList,
  onXtreamLoginsChanged,
  xtreamPseudoUrl,
  LIVE_TV_GLOBAL_EPG_ID,
  isChannelInLiveTvList,
  isLiveTvLogoLoaded,
  onLiveTvListsChanged,
  onM3uUrlsChanged,
  preloadLiveTvLogo,
  removeChannelFromLiveTvList,
  sortChannelsWithPins,
  togglePinnedLiveTvChannel,
  channelKey,
  type LiveTvList,
} from './live-tv-data'
import { useSchedules } from './hooks/useSchedules'
import { useChannelsBySource, withIndexTwins } from './view-helpers'
import { getM3uFetchProgress, reportM3uFetchJobProgress, runM3uFetch } from './m3u-fetch-progress'

interface M3uChannel {
  name: string
  logo?: string | null
  group: string
  url: string
  tvgId: string | null
}

const rememberedChannelLogoSrcs = new Map<string, string>()
const CHANNELS_PER_PAGE = 28
const FAVORITES_LIST_ID = '__favorites__'
const neutralPillClass = 'rounded-full border border-transparent bg-[#fcfcff14] text-slate-300 backdrop-blur-md transition hover:bg-[#fcfcff22] hover:text-white'
/**
 * TV-lägets kontroller: större träffytor och läsbar text på tio fots avstånd.
 *
 * Skrivbordets piller är 36 px höga med 10 px versaler — de fungerar med en
 * muspekare och inte med en fjärrkontroll. Måtten följer TV-skalets övriga
 * rader (minst 52 px) så fokusringen ser likadan ut här som i inställningarna.
 */
const tvControlClass = 'h-[52px] rounded-2xl border border-transparent bg-[#fcfcff14] px-6 text-[15px] text-slate-200 backdrop-blur-md transition hover:bg-[#fcfcff22] hover:text-white'
// Runda ikonknappar för TV: samma visuella språk som tvControlClass men
// cirkulära — kortens EPG/nåla/spela-rad och menyknappen uppe till höger.

const tvRoundControlClass = 'flex h-12 w-12 items-center justify-center rounded-full border border-transparent bg-[#fcfcff14] text-slate-300 backdrop-blur-md transition hover:bg-[#fcfcff22] hover:text-white'
// Sidomenyns rader: fullbreddsvarianten av tvControlClass.
const tvMenuItemClass = 'flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-left text-[15px] text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
const activePillClass = 'border-transparent bg-[#fcfcff2e] text-white backdrop-blur-md'

function logLiveTvStage(message: string, details?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const payload = {
    message: `[live-tv] ${message}`,
    stack: details ? JSON.stringify(details, null, 2) : undefined,
    href: window.location.href,
    userAgent: navigator.userAgent,
    ts: new Date().toISOString(),
  }
  void fetch('/api/client-crash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

export function LiveTvGrid({ initialChannel = null, tvCompactTop = false }: {
  initialChannel?: M3uChannel | null
  /**
   * Browse-sidans värdlayout reserverar hero-yta som Live TV aldrig fyller
   * (pt-20 + mt-4 ≈ 96 px). I TV-läget lämnade det ett stort tomt fält
   * ovanför kontrollraden — sant bara på browse-sidan, så hemvyns variant
   * (som har kanalkortet ovanför) lämnas orörd.
   */
  tvCompactTop?: boolean
}) {
  const { t, lang } = useLang()
  /**
   * TV-läget behöver fokusstationer. Sidan hade sex kontroller — sök,
   * kategorier, skapa lista, guide, uppdatera, listflikar — och ingen av dem
   * gick att nå med fjärrkontroll. De fanns på skärmen men inte i
   * navigeringen.
   */
  const isTv = useTvMode()
  const tvStation = isTv ? { 'data-f': '' } : {}
  // Värdens skärmknappsats. Ett <input> går inte att fylla i med bara
  // riktningsknappar — och fokusmotorn släpper dessutom igenom alla tangenter
  // i ett input, så pilarna fastnar i fältet i stället för att navigera
  // vidare. I TV-läge ritas sökfältet därför som en knapp som öppnar panelen.
  // null på värdar äldre än komponentbryggan — då behålls input-fältet.
  const TvKeyboardPanel = isTv ? getTvKeyboardPanel() : null
  const [searchKeyboardOpen, setSearchKeyboardOpen] = useState(false)
  /**
   * TV-lägets sidomeny. Kontrollraden (sök, kategorier, guide, uppdatera,
   * listflikar) blev en rad stationer man klev igenom på väg till innehållet.
   * På TV samlas allt i en höger-lagd lucka bakom en enda rund menyknapp:
   * ett steg in i vyn i stället för sex. Kategorierna visas som en undervy
   * inne i luckan — Escape/Backspace går tillbaka till menyroten, och från
   * roten stänger samma knappar luckan och lämnar fokus på menyknappen.
   */
  const [tvMenuOpen, setTvMenuOpen] = useState(false)
  const [tvMenuView, setTvMenuView] = useState<'root' | 'categories'>('root')
  const tvMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  // TV-kortens EPG-hämtning styrs utifrån (den runda knappen), nycklad på
  // kanal-url så knappen kan stå kvar som station efter aktivering.
  const [tvEpgRequested, setTvEpgRequested] = useState<Record<string, boolean>>({})
  // Nycklat på källa (samma sträng som `list.source`/varje post i `urls`) så
  // att en specifik listflik kan visa BARA sina egna kanaler i stället för
  // hela unionen — index-svaret ger ingen annan koppling mellan kanal och
  // källa än det anropet skickades med.
  const [urls, setUrls] = useState<string[]>([])
  /**
   * Kanalerna kommer ur MODELLENS delade laddare (`view-helpers` →
   * `loadChannelsShared`), inte ur en egen slinga.
   *
   * Vyn hade en egen: den körde parallellt med modellen som ändå är monterad
   * här (`useLiveTvModel` nedan), så en 17 000-kanalskälla hämtades två gånger
   * per sidladdning. Den hade också en egen `onIndexChanged`-lyssnare som
   * kunde läsa om FÖRE invalideringen och skriva tillbaka kanalerna importen
   * just ersatte.
   */
  const { bySource: channelsBySource, loading: channelsLoading, error: channelsError } = useChannelsBySource(urls)
  const channels = useMemo(() => Object.values(channelsBySource).flat(), [channelsBySource])
  // Skelettvyn bara vid KALL start: en bakgrundsuppdatering ska inte tömma rutnätet.
  const loading = channelsLoading && channels.length === 0
  /**
   * Importfel ritas som en NOTIS, inte i stället för rutnätet.
   *
   * `error` nedan tar över hela vyn — rätt när kanalerna inte gick att läsa
   * (det finns inget att visa), fel när en omhämtning föll: kanalerna som
   * redan ligger i indexet är kvar och fullt spelbara.
   */
  const [importError, setImportError] = useState<string | null>(null)
  const error = channelsError
  /**
   * Sökfältet har två tillstånd: det man SKRIVER (`searchInput`, ritas direkt)
   * och det som FILTRERAR (`search`, 150 ms senare).
   *
   * Filtret går igenom hela utbudet och sorterar om det med favoriterna först
   * — med 17 000 kanaler kostade varje tangenttryck en full sortering, och
   * fältet halkade efter med flera bokstäver. Fördröjningen är kortare än ett
   * bekvämt tangentintervall, så den som slutat skriva ser träffarna som
   * omedelbara.
   */
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    if (searchInput === search) return
    const id = window.setTimeout(() => setSearch(searchInput), 150)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])
  /** Skriver båda på en gång: rensa-knappen och skärmknappsatsen ska slå igenom direkt. */
  const setSearchNow = (value: string) => {
    setSearchInput(value)
    setSearch(value)
  }
  const [activeChannel, setActiveChannel] = useState<M3uChannel | null>(null)
  // Högerkolumnen (60/40): dagens tablå för kanalen under pekaren/fokus.
  const [previewChannel, setPreviewChannel] = useState<M3uChannel | null>(null)
  const model = useLiveTvModel()
  // useHubText returnerar { lang, locale, h } sedan hubbens omgörning — det
  // var hela objektet som skickades som `h`, och ChannelSidePanel kraschade
  // med "h is not a function" (Jerry 2026-09-06).
  const { h } = useHubText()
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)
  const [pinVersion, setPinVersion] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [loadedLogoUrls, setLoadedLogoUrls] = useState<Record<string, string>>({})
  const [lists, setLists] = useState<LiveTvList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [listPickerChannelKey, setListPickerChannelKey] = useState<string | null>(null)
  /** Senaste "lägg till i lista" föll på taket (500 kanaler). Rensas när väljaren öppnas igen. */
  const [listFull, setListFull] = useState(false)
  const [createListOpen, setCreateListOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const defaultTabAppliedRef = useRef(false)
  const [LiveTvGuideComponent, setLiveTvGuideComponent] = useState<
    null | typeof import('./live-tv-guide').LiveTvGuide
  >(null)
  const [createListName, setCreateListName] = useState('')
  const [pendingChannelForNewList, setPendingChannelForNewList] = useState<M3uChannel | null>(null)
  const [LiveTvPlayerComponent, setLiveTvPlayerComponent] = useState<ComponentType<{
    channel: M3uChannel
    onClose: () => void
    listId?: string | null
    epgUrls?: string[]
    onSwitchChannel?: (channel: M3uChannel) => void
  }> | null>(null)
  const urlsKey = getLiveTvUrlsKey(urls)
  const m3uErrorText = t('m3uError')
  const groupDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const syncUrls = () => {
      try {
        // Xtream-inloggningar är kanalkällor precis som M3U-länkarna; deras
        // pseudo-URL:er ingår i urlsKey så cachen invalideras när de ändras.
        setUrls([...getM3uUrls(), ...getXtreamLogins().map((login) => xtreamPseudoUrl(login))])
      } catch {
        setUrls([])
      }
    }

    syncUrls()
    const offM3u = onM3uUrlsChanged(syncUrls)
    const offXtream = onXtreamLoginsChanged(syncUrls)
    return () => {
      offM3u()
      offXtream()
    }
  }, [])

  useEffect(() => {
    const syncLists = () => {
      const nextLists = getLiveTvLists()
      setLists(nextLists)
      setActiveListId((current) => {
        if (current === FAVORITES_LIST_ID) return current
        if (current === null) return null
        if (current && nextLists.some((list) => list.id === current)) return current
        return null
      })
    }

    syncLists()
    return onLiveTvListsChanged(syncLists)
  }, [])

  useEffect(() => {
    if (!groupDropdownOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setGroupDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [groupDropdownOpen, groupDropdownRef])

  useEffect(() => {
    if (!isTauriEnv) return
    void closeMpvPlayer().catch(() => {})
    document.documentElement.classList.remove('mpv-playing')
    return () => {
      document.documentElement.classList.remove('mpv-playing')
      void closeMpvPlayer().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!isTauriEnv || activeChannel) return
    document.documentElement.classList.remove('mpv-playing')
    void closeMpvPlayer().catch(() => {})
  }, [activeChannel])

  useEffect(() => {
    if (!initialChannel) return
    setActiveChannel(initialChannel)
  }, [initialChannel])

  /**
   * Startfokus på menyknappen när vyn öppnas i TV-läge.
   *
   * Motorn kallar aldrig focusInit för en vy — fokus kommer in geometriskt
   * från sidomenyns rail, och därifrån vinner alltid ett kanalkort nära
   * railens höjd över en knapp uppe i högra hörnet. data-init hjälper bara
   * när fokus redan är tappat. Därför fokuseras knappen explicit vid
   * montering; motorns focusin-lyssnare synkar lastRef/markering åt oss.
   *
   * Railens onSelect blurrar aktivt element ~220 ms efter valet (för att
   * fälla ihop menyn) — därav uppföljningen: har fokus hamnat på body igen
   * läggs det tillbaka, men bara då, så en användare som redan hunnit
   * navigera inte rycks tillbaka. Hoppas över vid direktlänk till en kanal
   * (spelaren äger skärmen) — annars ligger Enter kvar på menyknappen
   * bakom spelaren.
   */
  useEffect(() => {
    // loading som beroende: under skelettvyn finns knappen inte ännu —
    // effekten körs om när laddningen är klar och knappen har monterats.
    if (!isTv || initialChannel || loading) return
    tvMenuButtonRef.current?.focus()
    const id = window.setTimeout(() => {
      if (document.activeElement === document.body) tvMenuButtonRef.current?.focus()
    }, 260)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTv, loading])

  /**
   * Bro mellan menyknappen och rutnätet. Geometrin ensam ger fel svar åt
   * båda hållen: NED från knappen längst till höger landar på SISTA kortet
   * i första raden, och UPP från radens vänstra kort fastnar i värdens rail
   * (närmare i sidled än knappen långt till höger). Fångas i capture-fasen
   * så motorns egen keydown (bubblande) aldrig hinner räkna.
   */
  useEffect(() => {
    if (!isTv) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      // En öppen panel (lucka, guide, spelare, tangentbord) äger fjärren.
      if (document.querySelector('[data-panel-root]')) return
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
      // Motorn kan stå på en station utan DOM-fokus (railens fördröjda blur)
      // — dess markering är då sanningen.
      const current = active?.hasAttribute('data-f')
        ? active
        : document.querySelector<HTMLElement>('[data-fcur="1"]')
      if (!current) return

      if (event.key === 'ArrowDown' && current === tvMenuButtonRef.current) {
        // Första kortets spela-knapp: primäråtgärden, inte närmaste i sidled.
        // Kortet självt är stationen (hela blocket markeras); äldre markup
        // hade stationerna INUTI kortet — täck båda.
        const target = document.querySelector<HTMLElement>('.live-tv-channel-grid > div:first-child[data-f]')
          ?? document.querySelector<HTMLElement>('.live-tv-channel-grid > div:first-child [data-f]')
        if (!target) return
        event.preventDefault()
        event.stopPropagation()
        target.focus()
        return
      }

      if (event.key === 'ArrowUp') {
        const grid = current.closest<HTMLElement>('.live-tv-channel-grid')
        const card = current.closest<HTMLElement>('.live-tv-channel-grid > div')
        const menuButton = tvMenuButtonRef.current
        if (!grid || !card || !menuButton) return
        const firstCard = grid.firstElementChild as HTMLElement | null
        if (!firstCard) return
        // Första raden = samma överkant som första kortet (±8 px, samma
        // tolerans som motorns kantregel).
        if (Math.abs(card.getBoundingClientRect().top - firstCard.getBoundingClientRect().top) > 8) return
        event.preventDefault()
        event.stopPropagation()
        menuButton.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isTv])

  /**
   * Vänster i sidomenyn = backa ur, samma ordning som Escape. Luckan är en
   * enda kolumn, så varje vänstertryck når kanten — utan anspråket öppnade
   * värdens reservlyssnare huvudmenyn ovanpå luckan. meta?.claim?.() säger
   * åt reserven att avstå; defensivt eftersom äldre värdar inte skickar metan.
   */
  useEffect(() => {
    if (!isTv || !tvMenuOpen) return
    return onTvFocusEdge((dir, meta) => {
      if (dir !== 'left') return
      meta?.claim?.()
      if (tvMenuView === 'categories') {
        setTvMenuView('root')
        return
      }
      closeTvMenu()
    })
  }, [isTv, tvMenuOpen, tvMenuView])

  // Back/Escape i sidomenyn. Fångas på window i capture-fasen — samma skäl
  // som i guiden: annars tar värdens globala bakåthanterare hela vyn i
  // stället för att stänga luckan. Kategorivyn backar till menyroten först.
  useEffect(() => {
    if (!isTv || !tvMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Backspace') return
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
      event.preventDefault()
      event.stopPropagation()
      if (tvMenuView === 'categories') {
        setTvMenuView('root')
        return
      }
      closeTvMenu()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isTv, tvMenuOpen, tvMenuView])

  function closeTvMenu(restoreFocus = true) {
    setTvMenuOpen(false)
    setTvMenuView('root')
    if (restoreFocus) {
      // Fokusmotorn är DOM-driven: när panelroten försvinner ska fokus landa
      // på knappen som öppnade den, inte på vyns data-init.
      requestAnimationFrame(() => tvMenuButtonRef.current?.focus())
    }
  }

  /**
   * Uppdatera = HÄMTA OM, inte "rensa cachen".
   *
   * Före lagring v2 låg kanalerna i webbläsarlagringen, så knappen kastade
   * cachen och lät vyn läsa om. Nu bor de i appens index: en tom cache hade
   * bara lästs tillbaka oförändrad, och listan skulle stå kvar med gårdagens
   * innehåll. Knappen kör i stället importjobbet (`importList`) för de listor
   * som faktiskt syns, en i taget, via samma förloppsmönster som
   * inställningarnas hämtning (`runM3uFetch` + `reportM3uFetchJobProgress`) —
   * så en 17 000-kanalspanel kan följas medan den går.
   *
   * Manuella (`custom`) listor har inget att hämta: de läses bara om.
   */
  async function refreshLists(scope: LiveTvList[]) {
    const targets = scope.filter((list) => Boolean(list.source) && (list.kind === 'm3u' || list.kind === 'xtream'))
    if (targets.length === 0) return
    setImportError(null)
    setRefreshing(true)
    try {
      const bySource = new Map(targets.map((list) => [list.source as string, list]))
      const ok = await runM3uFetch([...bySource.keys()], async (source) => {
        const list = bySource.get(source)
        if (!list) return 0
        const status = await importList(list, (job) => reportM3uFetchJobProgress(job.received, job.total))
        if (status.state === 'error') throw new Error(status.error ?? m3uErrorText)
        return status.result?.total ?? 0
      })
      /*
       * `runM3uFetch` svarar false av TVÅ skäl: något föll, eller en hämtning
       * pågår redan (inställningarna kan ha startat en). Bara det första är
       * ett fel att visa — förut larmade knappen "kunde inte hämta" när den i
       * själva verket bara avstod från att starta en andra omgång.
       *
       * Texten kommer ur jobbets eget `error` ("could not resolve host …"),
       * som köraren redan lagt i förloppet; den generiska m3u-strängen säger
       * ingenting om vad som hände.
       */
      if (!ok) {
        const progress = getM3uFetchProgress()
        if (progress.status === 'error') setImportError(progress.error ?? m3uErrorText)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : m3uErrorText)
    } finally {
      setRefreshing(false)
    }
    // Ingen omladdning här: varje lyckad `importList` emitterar
    // INDEX_CHANGED_EVENT, som invaliderar cachen och väcker både modellen och
    // den här vyn. En egen bump hade gett N+1 omläsningar av hela utbudet.
  }

  async function handleRefreshChannels() {
    await refreshLists(activeList ? [activeList] : lists)
  }

  /**
   * Uppdatera EN lista — utan att först behöva klicka fliken. Toppknappen
   * (`handleRefreshChannels`) körde redan bara den aktiva listan när en flik
   * var vald, men det krävde bytet av flik; den här sitter direkt på
   * listpillen och kör alltid EXAKT den listan, oavsett vilken flik som råkar
   * vara aktiv (spec 4.4 punkt 4 — samma två knappar som TV-inställningarna).
   */
  async function handleRefreshList(list: LiveTvList) {
    await refreshLists([list])
  }

  function handleCreateList(name: string): LiveTvList | null {
    if (!name.trim()) return null
    const created = createLiveTvList(name)
    setActiveListId(created.id)
    return created
  }

  function handleOpenCreateListModal() {
    setCreateListName('')
    setPendingChannelForNewList(null)
    setCreateListOpen(true)
    setListPickerChannelKey(null)
  }

  function handleSubmitCreateList() {
    const created = handleCreateList(createListName)
    if (!created) return
    if (pendingChannelForNewList) {
      addChannelToLiveTvList(created.id, pendingChannelForNewList)
    }
    setCreateListOpen(false)
    setCreateListName('')
    setPendingChannelForNewList(null)
  }

  function handleOpenListPicker(channel: M3uChannel) {
    setListFull(false)
    const key = `${channel.name}::${channel.url}`
    if (customLists.length === 0) {
      setCreateListName('')
      setPendingChannelForNewList(channel)
      setCreateListOpen(true)
      return
    }
    setListPickerChannelKey((current) => current === key ? null : key)
  }

  useEffect(() => {
    logLiveTvStage('live tv sources', { count: urls.length, loaded: channels.length })
  }, [urlsKey, channels.length])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, activeGroup, activeListId])

  const activeList = activeListId && activeListId !== FAVORITES_LIST_ID
    ? (lists.find((list) => list.id === activeListId) ?? null)
    : null

  /**
   * "Lägg till i lista" gäller BARA manuellt skapade listor.
   *
   * `addChannelToLiveTvList` skriver kanalen inbäddad i listan — det är rätt
   * för en `custom`-lista (den ÄR sina kanaler) och fel för en m3u/xtream-
   * lista, vars innehåll kommer ur indexet och skrivs över av nästa import.
   * Väljaren erbjöd ändå varje lista, så en kanal kunde läggas i en importerad
   * lista, se ut att sitta där, och vara borta efter nästa hämtning — samtidigt
   * som den la tillbaka kanalnyttolast i pluginlagringen som v2 just tömt.
   */
  const customLists = useMemo(() => lists.filter((list) => list.kind === 'custom'), [lists])

  /**
   * Kanaler för en enskild listflik: manuellt skapade (`custom`) listor bär
   * sina kanaler inbäddade precis som förut (`addChannelToLiveTvList` m.fl.
   * skriver dit dem) — m3u/xtream-listor har bara ett `source` och deras
   * kanaler hämtas ur `channelsBySource` (samma karta som "ALL"-fliken).
   */
  function channelsForList(list: LiveTvList): M3uChannel[] {
    if (list.kind === 'custom') return customChannelsByList[list.id] ?? []
    return list.source ? (channelsBySource[list.source] ?? []) : []
  }


  /**
   * "ALL"-fliken: unionen av allt som lästs ur indexet PLUS de manuellt
   * skapade listornas inbäddade kanaler (de har ingen källa i indexet).
   *
   * Memoiserad, liksom `categories` och `filtered` nedan. Uttrycken låg förut
   * rakt i renderingen: varje omrender — en minuttick från modellen, en
   * öppnad meny, en logotyp som laddat klart — byggde om unionen av 17 000
   * kanaler, plockade ut kategorierna och sorterade om hela filtret.
   */
  /**
   * Manuellt skapade listors kanaler, med indexets tvilling där den finns.
   *
   * Den lagrade kopian bär inte längre `archive` (Xtream-inloggningen ska inte
   * speglas mellan enheter), så repriser och timeshift skulle annars saknas på
   * just de här kanalerna. Egen memo och inte inlagd i unionen nedan: den här
   * väger hundratals kanaler, unionen tiotusentals.
   */
  const customChannelsByList = useMemo(() => {
    const out: Record<string, M3uChannel[]> = {}
    for (const list of lists) {
      if (list.kind !== 'custom') continue
      out[list.id] = withIndexTwins(list.channels ?? [], model.byUrl)
    }
    return out
  }, [lists, model.byUrl])

  const allSourceChannels = useMemo(() => {
    const seen = new Set<string>()
    const out: M3uChannel[] = []
    const add = (list: M3uChannel[]) => {
      for (const c of list) {
        const key = `${c.name}::${c.url}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(c)
      }
    }
    add(channels)
    for (const entry of Object.values(customChannelsByList)) add(entry)
    return out
  }, [channels, customChannelsByList])
  /**
   * Nålarna läses EN gång per ändring, inte en gång per kanal.
   * `isPinnedLiveTvChannel` gör ett `readPluginJson` + en linjär sökning per
   * anrop — i ett filter över hela utbudet blev det 17 000 lagringsläsningar
   * för att hitta en handfull favoriter. Modellen håller redan mängden och
   * ritar om vyn när den ändras.
   */
  const pinnedSet = model.pinnedSet
  const pinnedChannels = useMemo(
    () => sortChannelsWithPins(allSourceChannels.filter((channel) => pinnedSet.has(channelKey(channel)))),
    [allSourceChannels, pinnedSet],
  )
  const globalEpgUrls = getAllLiveTvEpgUrls(lists)
  const globalEpgListId = globalEpgUrls.length > 0 ? LIVE_TV_GLOBAL_EPG_ID : null
  const visibleChannels = useMemo(
    () => (activeListId === FAVORITES_LIST_ID
      ? pinnedChannels
      : activeList ? channelsForList(activeList) : allSourceChannels),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeListId, activeList, pinnedChannels, allSourceChannels, channelsBySource, customChannelsByList],
  )

  useEffect(() => {
    // Standardfliken (öppna på Favoriter när man HAR nålar) avgörs EN gång,
    // när laddningen är klar — inte "första gången pins > 0": då kapade
    // vyn till Favoriter mitt i sessionen så fort man nålade sin första
    // kanal, och alla andra kanaler "försvann".
    if (loading) return
    if (!defaultTabAppliedRef.current) {
      defaultTabAppliedRef.current = true
      if (pinnedChannels.length > 0) setActiveListId(FAVORITES_LIST_ID)
      return
    }
    if (activeListId === FAVORITES_LIST_ID && pinnedChannels.length === 0) {
      setActiveListId(null)
    }
  }, [loading, activeListId, pinnedChannels.length])

  const categories = useMemo(
    () => Array.from(
      new Set(
        visibleChannels.flatMap((c) =>
          String(c.group ?? '')
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ),
    ).sort(),
    [visibleChannels],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return sortChannelsWithPins(
      visibleChannels.filter((c) => {
        const name = String(c.name ?? '')
        const groups = String(c.group ?? '')
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
        const matchSearch = !needle || name.toLowerCase().includes(needle)
        const matchGroup = !activeGroup || groups.includes(activeGroup)
        return matchSearch && matchGroup
      }),
    )
  }, [visibleChannels, search, activeGroup, pinnedSet])
  const totalPages = Math.max(1, Math.ceil(filtered.length / CHANNELS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * CHANNELS_PER_PAGE
  const pagedChannels = useMemo(
    () => filtered.slice(pageStart, pageStart + CHANNELS_PER_PAGE),
    [filtered, pageStart],
  )
  const visibleChannelKey = pagedChannels.map((channel) => channel.url).join('|')

  useEffect(() => {
    if (currentPage !== safeCurrentPage) setCurrentPage(safeCurrentPage)
  }, [currentPage, safeCurrentPage])

  useEffect(() => {
    let cancelled = false
    const logoEntries = pagedChannels
      .map((channel) => ({ key: channel.url, src: getLiveTvLogoSrc(channel.logo) }))
      .filter((entry): entry is { key: string; src: string } => Boolean(entry.src))

    if (logoEntries.length === 0) {
      setLoadedLogoUrls({})
      return
    }

    const initialLoaded = Object.fromEntries(
      logoEntries
        .filter((entry) => rememberedChannelLogoSrcs.get(entry.key) === entry.src || isLiveTvLogoLoaded(entry.src))
        .map((entry) => [entry.key, entry.src]),
    ) as Record<string, string>

    Object.entries(initialLoaded).forEach(([key, src]) => rememberedChannelLogoSrcs.set(key, src))
    setLoadedLogoUrls((current) => ({ ...current, ...initialLoaded }))

    void (async () => {
      const pendingEntries = logoEntries.filter((entry) => !initialLoaded[entry.key])
      const batchSize = isTauriEnv ? 3 : 8

      for (let i = 0; i < pendingEntries.length; i += batchSize) {
        if (cancelled) break
        const batch = pendingEntries.slice(i, i + batchSize)
        const results = await Promise.all(
          batch.map(async (entry) => ({
            key: entry.key,
            src: entry.src,
            ok: await preloadLiveTvLogo(entry.src),
          })),
        )

        if (cancelled) break

        const batchLoaded = Object.fromEntries(
          results.filter((result) => result.ok).map((result) => [result.key, result.src]),
        ) as Record<string, string>

        Object.entries(batchLoaded).forEach(([key, src]) => rememberedChannelLogoSrcs.set(key, src))
        if (Object.keys(batchLoaded).length > 0) {
          setLoadedLogoUrls((current) => ({ ...current, ...batchLoaded }))
        }

        if (isTauriEnv && i + batchSize < pendingEntries.length) {
          await new Promise((resolve) => setTimeout(resolve, 40))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visibleChannelKey])

  useEffect(() => {
    if (LiveTvPlayerComponent || !isTauriEnv) return
    let cancelled = false
    void import('./live-tv-player')
      .then((mod) => {
        if (!cancelled) setLiveTvPlayerComponent(() => mod.LiveTvPlayer)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [LiveTvPlayerComponent])

  useEffect(() => {
    if (!activeChannel || LiveTvPlayerComponent) return
    let cancelled = false
    void import('./live-tv-player')
      .then((mod) => {
        if (!cancelled) setLiveTvPlayerComponent(() => mod.LiveTvPlayer)
      })
      .catch(() => {
        if (!cancelled) setActiveChannel(null)
      })
    return () => {
      cancelled = true
    }
  }, [activeChannel, LiveTvPlayerComponent])

  useEffect(() => {
    if (!guideOpen || LiveTvGuideComponent) return
    let cancelled = false
    void import('./live-tv-guide')
      .then((mod) => {
        if (!cancelled) setLiveTvGuideComponent(() => mod.LiveTvGuide)
      })
      .catch(() => {
        if (!cancelled) setGuideOpen(false)
      })
    return () => {
      cancelled = true
    }
  }, [guideOpen, LiveTvGuideComponent])

  useEffect(() => {
    if (!loading) {
      logLiveTvStage('render state ready', {
        channels: channels.length,
        filtered: filtered.length,
        visible: pagedChannels.length,
        hasError: Boolean(error),
      })
    }
  }, [loading, channels.length, filtered.length, pagedChannels.length, error])

  if (urls.length === 0) {
    const openLiveTvSettings = () => {
      // Deep-link into the app settings panel at this plugin's section. The
      // host listens for this event (lib/settings-navigation.ts) — plugins
      // only get the SDK surface, so the window event is the contract.
      window.dispatchEvent(new CustomEvent('lumio-open-settings', { detail: { section: 'plugin:m3u' } }))
    }
    const features = [
      {
        key: 'lists',
        title: t('liveTvFeatureListsTitle'),
        description: t('liveTvFeatureListsDesc'),
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M12 10v10" />
          </svg>
        ),
      },
      {
        key: 'epg',
        title: t('liveTvFeatureEpgTitle'),
        description: t('liveTvFeatureEpgDesc'),
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
        ),
      },
      {
        key: 'mpv',
        title: t('liveTvFeatureMpvTitle'),
        description: t('liveTvFeatureMpvDesc'),
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="2" /><path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
          </svg>
        ),
      },
      {
        key: 'local',
        title: t('liveTvFeatureLocalTitle'),
        description: t('liveTvFeatureLocalDesc'),
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3 4.5 6v5c0 4.5 3 8.6 7.5 10 4.5-1.4 7.5-5.5 7.5-10V6L12 3Z" /><path d="m9.5 12 2 2 3.5-4" />
          </svg>
        ),
      },
    ]
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{t('liveTvEmptyEyebrow')}</p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{t('liveTvEmptyTitle')}</h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">{t('liveTvEmptyBody')}</p>
        <button
          type="button"
          onClick={openLiveTvSettings}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          {t('liveTvEmptyCta')}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-8 border-t border-white/10 pt-10 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.key} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center text-slate-500">{feature.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{feature.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-800" />
        <div className="live-tv-channel-grid grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: CHANNELS_PER_PAGE }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-800" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <p className="py-8 text-center text-red-400">{error}</p>
  }

  return (
    <>
      <div
        className="space-y-4"
        // Dra upp innehållet över värdens tomma hero-yta i TV-läget.
        // Inline-stil i stället för Tailwind-klass: negativa marginaler av
        // den här storleken finns inte säkert med i värdens byggda CSS.
        style={isTv && tvCompactTop ? { marginTop: -96 } : undefined}
      >
        {/* Search + group filter. TV: hela raden bor i sidomenyn — kvar i vyn
            är bara en rund menyknapp uppe till höger (vyns data-init: den är
            vyns enda kontroll, kanalkorten är innehåll). */}
        {isTv ? (
          // relative z-10: raden dras med -96 px upp i värdens hero-yta, och
          // heron ligger i en POSITIONERAD wrapper (div.relative pt-20) som
          // träfftestas före vårt statiska innehåll — utan egen positionering
          // och z-nivå går musklick på knappen till heron i stället.
          <div className="relative z-10 flex items-center justify-end gap-3">
            {refreshing && visibleChannels.length > 0 ? (
              <span className="text-sm text-slate-500">{t('liveTvRefreshing')}</span>
            ) : null}
            <button
              type="button"
              ref={tvMenuButtonRef}
              {...tvStation}
              {...{ 'data-init': '' }}
              onClick={() => {
                setTvMenuView('root')
                setTvMenuOpen(true)
              }}
              className={`${tvRoundControlClass} !h-[52px] !w-[52px]`}
              aria-label={t('mdpShowMenu')}
              title={t('mdpShowMenu')}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
          </div>
        ) : (
        <div className="flex flex-wrap items-center gap-3">
          {TvKeyboardPanel ? (
            <button
              type="button"
              {...tvStation}
              // Sökfältet är vyns ingång: kliver man in i innehållet ska man
              // landa här, inte på en knapp längst till höger.
              {...(isTv ? { 'data-init': '' } : {})}
              data-live-tv-search=""
              onClick={() => setSearchKeyboardOpen(true)}
              className={`${tvControlClass} w-[340px] text-left ${searchInput ? 'text-white' : 'text-white/60'} outline-none`}
            >
              {searchInput || t('m3uSearch')}
            </button>
          ) : (
            <input
              type="search"
              {...tvStation}
              {...(isTv ? { 'data-init': '' } : {})}
              data-live-tv-search=""
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('m3uSearch')}
              className={isTv
                ? `${tvControlClass} w-[340px] text-white placeholder:text-white/60 outline-none`
                : 'h-9 w-56 rounded-full border border-white/[0.14] bg-white/[0.04] px-4 text-[12px] text-white placeholder:text-white/70 outline-none transition hover:border-white/[0.18] hover:bg-white/[0.05] focus:border-white/[0.18] focus:bg-white/[0.05]'}
            />
          )}
          {searchInput ? (
            /* Rensa: nollställer söket och lämnar tillbaka fokus till
               sökfältet — snabb återgång dit man var. */
            <button
              type="button"
              {...tvStation}
              onClick={() => {
                setSearchNow('')
                window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-live-tv-search]')?.focus())
              }}
              title={t('cancel')}
              aria-label={t('cancel')}
              className={isTv ? `${tvRoundControlClass} !h-[52px] !w-[52px]` : 'flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white'}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          ) : null}
          <div ref={groupDropdownRef} className={isTv ? 'relative w-[280px]' : 'relative w-56'}>
            <button
              type="button"
              {...tvStation}
              onClick={() => {
                if (categories.length === 0) return
                setGroupDropdownOpen((open) => !open)
              }}
              disabled={categories.length === 0}
              className={isTv
                ? `flex w-full items-center justify-between ${tvControlClass} ${groupDropdownOpen ? '!border-accent-400/50 !bg-accent-400/10 !text-accent-300' : ''} disabled:cursor-default disabled:opacity-60`
                : `flex h-9 w-full items-center justify-between rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                    groupDropdownOpen ? activePillClass : neutralPillClass
                  } disabled:cursor-default disabled:opacity-60`}
            >
              <span className="truncate text-left">
                {activeGroup ?? t('allCategories')}
              </span>
              <svg
                className={`h-3 w-3 flex-none transition-transform ${groupDropdownOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {groupDropdownOpen ? (
              // Spellistor har fler grupper än en skärm rymmer — Free-TV har
              // 97. Utan höjdtak växte luckan rakt ut ur telefonen i stående
              // läge och de nedersta länderna gick inte att nå alls
              // (overflow-hidden klippte dem, och sidan bakom rullade inte
              // med luckan). Samma tak och egen rullning som hubbens meny.
              // data-scroll: TV-fokusmotorn rullar in raden man står på.
              <div
                {...(isTv ? { 'data-scroll': '' } : {})}
                className="absolute left-0 top-full z-50 mt-2 max-h-[min(60vh,360px)] min-w-full overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#080c1a] py-2 shadow-2xl"
              >
                <button
                  type="button"
                  {...tvStation}
                  {...(isTv ? { 'data-entry': '' } : {})}
                  onClick={() => {
                    setActiveGroup(null)
                    setGroupDropdownOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 text-left transition-all hover:bg-white/6 ${
                    isTv ? 'min-h-[52px] text-[15px]' : 'py-2.5 text-sm'
                  } ${activeGroup === null ? 'text-accent-300' : 'text-slate-200'}`}
                >
                  <span>{t('allCategories')}</span>
                  {activeGroup === null ? (
                    <svg className="h-3.5 w-3.5 flex-shrink-0 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
                {categories.map((cat) => {
                  const isActive = activeGroup === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      {...tvStation}
                      onClick={() => {
                        setActiveGroup(cat)
                        setGroupDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 text-left transition-all hover:bg-white/6 ${
                        isTv ? 'min-h-[52px] text-[15px]' : 'py-2.5 text-sm'
                      } ${isActive ? 'text-accent-300' : 'text-slate-200'}`}
                    >
                      <span>{cat}</span>
                      {isActive ? (
                        <svg className="h-3.5 w-3.5 flex-shrink-0 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          {/* Skapa lista och Uppdatera döljs på TV: det är administration man
              gör en gång, vid en dator. På tio fots avstånd är de två
              stationer man kliver förbi varje gång utan att vilja dit —
              samma skäl som Nedladdning och Soundtrack på detaljsidan. */}
          {isTv ? null : <button
            type="button"
            {...tvStation}
            onClick={handleOpenCreateListModal}
            className={`flex h-9 items-center px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] ${neutralPillClass}`}
          >
            {t('liveTvCreateList')}
          </button>}
          <div className="ml-auto flex items-center gap-3">
            {isTv ? null : <span className="text-xs text-white">{filtered.length} / {visibleChannels.length} {t('m3uChannels')}</span>}
            {refreshing && visibleChannels.length > 0 ? <span className="text-xs text-slate-500">{t('liveTvRefreshing')}</span> : null}
            {importError ? <span className="max-w-[18rem] truncate text-xs text-red-400" title={importError}>{importError}</span> : null}
            {/* Appen saknar v2-endpointerna: migreringen hoppades över med
                flit, och utan den här raden ser rutnätet bara tomt ut. */}
            {model.appTooOld ? <span data-testid="live-tv-app-too-old" className="max-w-[22rem] truncate text-xs text-amber-400">{h('appTooOld')}</span> : null}
            {listFull ? <span data-testid="live-tv-list-full" className="max-w-[22rem] truncate text-xs text-amber-400">{h('listFull')}</span> : null}
            <button
              type="button"
              {...tvStation}
              onClick={() => setGuideOpen(true)}
              className={isTv
                ? `inline-flex items-center gap-2 ${tvControlClass}`
                : `inline-flex h-9 items-center gap-2 px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] ${neutralPillClass}`}
              aria-label={t('liveTvOpenGuide')}
              title={t('liveTvGuideTitle')}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <path d="M3 10h18" />
                <path d="M7 14h4" />
                <path d="M7 18h10" />
              </svg>
              {t('liveTvGuide')}
            </button>
            {isTv ? null : <button
              type="button"
              {...tvStation}
              onClick={() => { void handleRefreshChannels() }}
              disabled={refreshing || lists.length === 0}
              className={`inline-flex h-9 w-9 items-center justify-center ${neutralPillClass} disabled:cursor-default disabled:opacity-50`}
              aria-label={t('refreshStatus')}
              title={t('refreshStatus')}
            >
              <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>}
          </div>
        </div>
        )}

        {/* Listflikarna följer med in i sidomenyn på TV. */}
        {isTv ? null : <div className="space-y-3">
          {lists.length === 0 ? (
            null
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                {...tvStation}
                onClick={() => setActiveListId(null)}
                className={`h-9 rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] whitespace-nowrap transition ${
                  activeListId === null
                    ? activePillClass
                    : neutralPillClass
                }`}
              >
                {t('all')}
              </button>
              {pinnedChannels.length > 0 ? (
                <button
                  type="button"
                  {...tvStation}
                  onClick={() => setActiveListId(FAVORITES_LIST_ID)}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] whitespace-nowrap transition ${
                    activeListId === FAVORITES_LIST_ID
                      ? 'border-amber-400/50 bg-amber-400/10 text-amber-200'
                      : neutralPillClass
                  }`}
                >
                  <span>{t('liveTvFavorites')}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] tracking-[0.08em] ${
                    activeListId === FAVORITES_LIST_ID
                      ? 'bg-amber-400/15 text-amber-100'
                      : 'bg-white/5 text-slate-400'
                  }`}>
                    {pinnedChannels.length}
                  </span>
                </button>
              ) : null}
              {lists.map((list) => {
                const importable = list.kind === 'm3u' || list.kind === 'xtream'
                return (
                <div key={list.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveListId(list.id)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[0.6rem] font-normal uppercase tracking-[0.2em] whitespace-nowrap transition ${
                      importable ? 'pr-16' : 'pr-10'
                    } ${
                      activeListId === list.id
                        ? activePillClass
                        : neutralPillClass
                    }`}
                  >
                    <span>{list.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] tracking-[0.08em] ${
                      activeListId === list.id
                        ? 'bg-accent-400/15 text-accent-200'
                        : 'bg-white/5 text-slate-400'
                    }`}>
                      {list.kind === 'custom' ? (list.channels ?? []).length : list.channelCount ?? 0}
                    </span>
                  </button>
                  {/* Uppdatera DEN HÄR listan, utan att först klicka fliken —
                      toppens knapp kör redan alla (eller den aktiva, om en
                      flik råkar vara vald); den här kompletterar med "per
                      lista" oavsett vald flik (spec 4.4 punkt 4). Manuella
                      (`custom`) listor har inget att hämta och får ingen knapp. */}
                  {importable ? (
                    <button
                      type="button"
                      data-testid={`list-refresh-${list.id}`}
                      onClick={() => void handleRefreshList(list)}
                      disabled={refreshing}
                      className="absolute right-8 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:border-accent-400/40 hover:bg-accent-400/10 hover:text-accent-300 disabled:cursor-default disabled:opacity-50"
                      title={h('listRefetch')}
                    >
                      <svg className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                        <path d="M21 3v6h-6" />
                      </svg>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeListId === list.id) setActiveListId(null)
                      deleteLiveTvList(list.id)
                    }}
                    className="absolute right-1.5 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:border-accent-400/40 hover:bg-accent-400/10 hover:text-accent-300"
                    title={t('liveTvDeleteList')}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
                )
              })}
            </div>
          )}
        </div>}

        {/* Channel grid */}
        {filtered.length === 0 ? (
          // Samma tomma läge som appens övriga vyer: ikon, rubrik, en
          // förklarande mening. En ensam grå rad mitt på sidan såg ut som ett
          // fel snarare än ett svar — särskilt när man aldrig lagt till en
          // kanallista och alltså inte gjort något galet.
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <div className="text-4xl text-slate-600">((•))</div>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {urls.length === 0 ? t('liveTvNoLists') : t('m3uNoResults')}
            </h3>
            <p className="max-w-md text-sm text-slate-500">
              {urls.length === 0 ? t('liveTvNoListsHint') : t('liveTvNoMatchHint')}
            </p>
          </div>
        ) : (
          // 60/40 (Jerry 2026-09-03): kanalerna till vänster, dagens tablå för
          // kanalen under pekaren till höger, så bredbilden fylls i stället för
          // att korten står i en rad med tomrum bredvid. Under xl: bara korten.
          <div className="xl:flex xl:items-start xl:gap-6">
          <div className="space-y-4 xl:w-[60%]">
            <div className="live-tv-channel-grid grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
              {pagedChannels.map((channel, i) => {
                const logoSrc = loadedLogoUrls[channel.url] ?? null
                const channelListKey = `${channel.name}::${channel.url}`
                const isListPickerOpen = listPickerChannelKey === channelListKey
                const isInAnyList = customLists.some((list) => isChannelInLiveTvList(list.id, channel))
                const isPinned = pinnedSet.has(channelKey(channel))
                const epgRequestedForCard = Boolean(tvEpgRequested[channel.url])
                // Kortets logotyp/namn delas mellan lägena. TV: kortkroppen är
                // ingen station — spela-knappen i radens slut äger aktiveringen,
                // annars dubbleras varje kanal i fokusflödet.
                const cardBody = (
                  <>
                    <div className={`flex w-full items-center justify-center overflow-hidden rounded-xl bg-slate-800 ${isTauriEnv ? 'h-28' : 'h-28'}`}>
                      {logoSrc ? (
                        <LiveTvLogoImage
                          src={logoSrc}
                          alt={channel.name}
                          className="h-full w-full object-contain p-2"
                          onError={() => {}}
                        />
                      ) : null}
                      <svg className={`${isTauriEnv ? 'h-7 w-7' : 'h-6 w-6'} text-slate-600 ${logoSrc ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
                      </svg>
                    </div>
                    <p className={`w-full text-center text-slate-300 ${isTauriEnv ? 'line-clamp-3 text-[14px] leading-5' : 'line-clamp-3 text-[13px] leading-5 group-hover:text-white'}`}>
                      {channel.name}
                    </p>
                    {isTauriEnv && channel.group ? (
                      <p className="w-full truncate text-center text-[11px] text-slate-500">{channel.group}</p>
                    ) : null}
                  </>
                )
                return (
                  <div
                    key={`${channel.url}-${i}-${pinVersion}`}
                    onMouseEnter={() => setPreviewChannel(channel)}
                    onFocus={() => setPreviewChannel(channel)}
                    // TV: HELA kortet är stationen (ett steg per kanal i
                    // rutnätet). OK kliver in i kortet och markerar Spela;
                    // OK igen startar strömmen. Kortets ring ritas av värdens
                    // focus-card-ring (saknas klassen i en äldre värd blir
                    // det bara ringlöst, aldrig trasigt).
                    {...(isTv ? { 'data-f': '', tabIndex: 0 } : {})}
                    onKeyDown={isTv ? (event) => {
                      if (event.currentTarget !== event.target) return
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      event.stopPropagation()
                      event.currentTarget.querySelector<HTMLElement>('[data-card-play]')?.focus()
                    } : undefined}
                    className={`${isTv ? 'focus-card-ring ' : ''}group relative flex min-h-[10.5rem] flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 p-4 ${isTauriEnv ? '' : 'transition hover:-translate-y-0.5 hover:border-accent-400/30 hover:bg-slate-800'}`}
                  >
                    {/* De absoluta hörnknapparna (nåla, plus) är skrivbordets.
                        TV får i stället en rad av tre runda stationer nedanför
                        — plus-knappen (lägg i lista) är administration och
                        utgår helt på TV, som Skapa lista. */}
                    {isTv ? null : <button
                      type="button"
                      title={isPinned ? t('unpinChannel') : t('pinChannel')}
                      onClick={(event) => {
                        event.stopPropagation()
                        togglePinnedLiveTvChannel(channel)
                        setPinVersion((value) => value + 1)
                      }}
                    className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition ${
                        isPinned
                          ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
                          : 'border-white/10 bg-black/40 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 17v5" strokeLinecap="round" />
                        <path d="M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6Z" strokeLinejoin="round" />
                      </svg>
                    </button>}
                    {isTv ? null : <button
                      type="button"
                      title={t('liveTvAddToList')}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleOpenListPicker(channel)
                      }}
                      className={`absolute left-2 top-2 z-10 flex h-8 min-w-8 items-center justify-center rounded-full border px-1.5 transition ${
                        isInAnyList
                          ? 'border-accent-400/40 bg-accent-400/15 text-accent-300'
                          : 'border-white/10 bg-black/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </button>}
                    {!isTv && isListPickerOpen ? (
                      <div data-testid="list-picker" className="absolute left-2 top-11 z-20 min-w-44 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
                        <div className="flex flex-col gap-1">
                          {customLists.map((list) => {
                            const isInList = isChannelInLiveTvList(list.id, channel)
                            return (
                              <button
                                key={list.id}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  if (isInList) removeChannelFromLiveTvList(list.id, channel)
                                  else setListFull(addChannelToLiveTvList(list.id, channel) === 'full')
                                  setListPickerChannelKey(null)
                                }}
                                className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                                  isInList ? 'bg-accent-400/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{list.name}</span>
                                {isInList ? (
                                  <svg className="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="m20 6-11 11-5-5" />
                                  </svg>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    {isTv ? (
                      <div className="flex w-full flex-1 flex-col items-center gap-3">
                        {cardBody}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveChannel(channel)}
                        className="flex w-full flex-1 flex-col items-center gap-3"
                      >
                        {cardBody}
                      </button>
                    )}
                    <NowBadge
                      channel={channel}
                      listId={globalEpgListId}
                      urls={globalEpgUrls}
                      {...(isTv ? { showTrigger: false, forceRequested: epgRequestedForCard } : {})}
                    />
                    {isTv ? (
                      // TV: kortets tre stationer — EPG, nåla, spela. Alla kort
                      // har samma rad, så pilflödet i rutnätet håller geometrin
                      // både vågrätt och lodrätt. EPG-knappen står kvar efter
                      // aktivering (annars tappas fokus när stationen försvinner).
                      <div
                        className="mt-1 flex items-center justify-center gap-3"
                        // Inne i kortet: vänster/höger vandrar mellan knapparna,
                        // Bakåt/Escape lämnar tillbaka fokus till kortet. Upp/ner
                        // släpps till motorn, som utgår från kortet (stationen).
                        onKeyDown={(event) => {
                          const target = event.target as HTMLElement
                          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>('button')]
                            const index = buttons.indexOf(target)
                            const next = buttons[index + (event.key === 'ArrowRight' ? 1 : -1)]
                            if (next) { event.preventDefault(); event.stopPropagation(); next.focus() }
                            return
                          }
                          if (event.key === 'Escape' || event.key === 'Backspace') {
                            event.preventDefault()
                            event.stopPropagation()
                            event.currentTarget.closest<HTMLElement>('[data-f]')?.focus()
                          }
                        }}
                      >
                        <button
                          type="button"
                          data-card-play=""
                          tabIndex={-1}
                          title={t('play')}
                          onClick={() => setActiveChannel(channel)}
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-transparent bg-accent-500 text-white transition hover:bg-accent-400"
                        >
                          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          tabIndex={-1}
                          title={t('liveTvFetchEpgForChannel')}
                          onClick={() => setTvEpgRequested((current) => ({ ...current, [channel.url]: true }))}
                          className={`${tvRoundControlClass} ${epgRequestedForCard ? '!border-emerald-300/40 !bg-emerald-400/10 !text-emerald-200' : ''}`}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">EPG</span>
                        </button>
                        <button
                          type="button"
                          tabIndex={-1}
                          title={isPinned ? t('unpinChannel') : t('pinChannel')}
                          onClick={() => {
                            togglePinnedLiveTvChannel(channel)
                            setPinVersion((value) => value + 1)
                          }}
                          className={`${tvRoundControlClass} ${isPinned ? '!border-amber-400/40 !bg-amber-400/15 !text-amber-300' : ''}`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M12 17v5" strokeLinecap="round" />
                            <path d="M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6Z" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <ResultsPagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
          <aside className="hidden xl:block xl:sticky xl:top-4 xl:w-[40%]">
            <ChannelSidePanel
              channel={previewChannel ?? pagedChannels[0] ?? null}
              model={model}
              h={h}
              onPlay={(channel) => setActiveChannel(channel)}
            />
          </aside>
          </div>
        )}
      </div>

      {activeChannel && LiveTvPlayerComponent ? (
        <LiveTvPlayerComponent
          channel={activeChannel}
          onClose={() => setActiveChannel(null)}
          listId={globalEpgListId}
          epgUrls={globalEpgUrls}
          onSwitchChannel={setActiveChannel}
        />
      ) : null}

      {guideOpen && LiveTvGuideComponent ? (
        <LiveTvGuideComponent
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          onPlayChannel={(channel) => {
            setGuideOpen(false)
            setActiveChannel(channel)
          }}
        />
      ) : null}

      {isTv && tvMenuOpen ? (
        // TV: sidomenyn. Panelrot = fokusfälla medan luckan är öppen; raderna
        // är stationer och listan får data-scroll eftersom många kanallistor
        // eller kategorier kan spränga skärmhöjden.
        // top: -64 av samma skäl som guidens: fixed positioneras här mot en
        // förfaders innehållsblock som börjar 64 px ned (värdens topplist) —
        // med inset-0 lämnades ett 64 px band ovanför luckan. Panelens
        // paddingTop lägger tillbaka innehållet nedanför listen.
        <div {...{ 'data-panel-root': '' }} className="fixed inset-x-0 bottom-0 z-[110]" style={{ top: -64 }}>
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => closeTvMenu()}
          />
          <div
            className="absolute inset-y-0 right-0 flex w-[420px] max-w-[90vw] flex-col border-l border-white/10 bg-[#080c1a]/[0.97] shadow-[0_0_80px_rgba(0,0,0,0.6)]"
            style={{ paddingTop: 64 }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/5 px-6 py-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Live TV</p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  {/* Ingen ren "Meny"-nyckel finns i värdens strängtabell —
                      ordet är kort och stabilt nog att bära lokalt. */}
                  {tvMenuView === 'categories' ? t('ipMetricCategories') : lang === 'sv' ? 'Meny' : 'Menu'}
                </h3>
              </div>
              {/* Stängningsstation överst: UPP från första raden landar här
                  (enda stationen ovanför i panelroten) och OK stänger — samma
                  återfokus på menyknappen som Escape. */}
              <button
                type="button"
                {...tvStation}
                onClick={() => closeTvMenu()}
                className={`${tvRoundControlClass} flex-none`}
                aria-label={t('mdpCloseMenu')}
                title={t('mdpCloseMenu')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div {...{ 'data-scroll': '' }} className="flex-1 space-y-2 overflow-y-auto px-5 py-5">
              {tvMenuView === 'root' ? (
                <>
                  <button
                    type="button"
                    {...tvStation}
                    {...{ 'data-init': '' }}
                    onClick={() => {
                      // Skärmknappsatsen tar över som panel — lämna fokus åt
                      // den i stället för att flytta tillbaka till menyknappen.
                      closeTvMenu(false)
                      setSearchKeyboardOpen(true)
                    }}
                    className={tvMenuItemClass}
                  >
                    <span>{t('m3uSearch')}</span>
                    {search ? <span className="max-w-[45%] truncate text-accent-300">{search}</span> : null}
                  </button>
                  <button
                    type="button"
                    {...tvStation}
                    onClick={() => {
                      if (categories.length === 0) return
                      setTvMenuView('categories')
                    }}
                    disabled={categories.length === 0}
                    className={`${tvMenuItemClass} disabled:cursor-default disabled:opacity-60`}
                  >
                    <span>{t('ipMetricCategories')}</span>
                    <span className="flex min-w-0 items-center gap-2 text-slate-400">
                      <span className="max-w-[160px] truncate">{activeGroup ?? t('allCategories')}</span>
                      <svg className="h-3.5 w-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </button>
                  <button
                    type="button"
                    {...tvStation}
                    onClick={() => {
                      closeTvMenu(false)
                      setGuideOpen(true)
                    }}
                    className={tvMenuItemClass}
                  >
                    <span>{t('liveTvGuide')}</span>
                    <svg className="h-4 w-4 flex-none text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M8 2v4" />
                      <path d="M16 2v4" />
                      <path d="M3 10h18" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    {...tvStation}
                    onClick={() => {
                      void handleRefreshChannels()
                      closeTvMenu()
                    }}
                    disabled={refreshing || lists.length === 0}
                    className={`${tvMenuItemClass} disabled:cursor-default disabled:opacity-50`}
                  >
                    <span>{t('refreshStatus')}</span>
                    <svg className={`h-4 w-4 flex-none text-slate-400 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <path d="M21 3v6h-6" />
                    </svg>
                  </button>
                  {lists.length > 0 || pinnedChannels.length > 0 ? (
                    <>
                      <p className="px-1 pb-1 pt-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        {t('liveTvLists')}
                      </p>
                      <button
                        type="button"
                        {...tvStation}
                        onClick={() => {
                          setActiveListId(null)
                          closeTvMenu()
                        }}
                        className={`${tvMenuItemClass} ${activeListId === null ? '!border-accent-400/50 !bg-accent-400/10 !text-accent-300' : ''}`}
                      >
                        <span>{t('all')}</span>
                      </button>
                      {pinnedChannels.length > 0 ? (
                        <button
                          type="button"
                          {...tvStation}
                          onClick={() => {
                            setActiveListId(FAVORITES_LIST_ID)
                            closeTvMenu()
                          }}
                          className={`${tvMenuItemClass} ${activeListId === FAVORITES_LIST_ID ? '!border-amber-400/50 !bg-amber-400/10 !text-amber-200' : ''}`}
                        >
                          <span>{t('liveTvFavorites')}</span>
                          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[12px] text-slate-400">{pinnedChannels.length}</span>
                        </button>
                      ) : null}
                      {lists.map((list) => (
                        <button
                          key={list.id}
                          type="button"
                          {...tvStation}
                          onClick={() => {
                            setActiveListId(list.id)
                            closeTvMenu()
                          }}
                          className={`${tvMenuItemClass} ${activeListId === list.id ? '!border-accent-400/50 !bg-accent-400/10 !text-accent-300' : ''}`}
                        >
                          <span className="truncate">{list.name}</span>
                          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[12px] text-slate-400">{list.kind === 'custom' ? (list.channels ?? []).length : list.channelCount ?? 0}</span>
                        </button>
                      ))}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    {...tvStation}
                    {...{ 'data-init': '' }}
                    onClick={() => {
                      setActiveGroup(null)
                      closeTvMenu()
                    }}
                    className={`${tvMenuItemClass} ${activeGroup === null ? '!border-accent-400/50 !bg-accent-400/10 !text-accent-300' : ''}`}
                  >
                    <span>{t('allCategories')}</span>
                    {activeGroup === null ? (
                      <svg className="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </button>
                  {categories.map((cat) => {
                    const isActive = activeGroup === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        {...tvStation}
                        onClick={() => {
                          setActiveGroup(cat)
                          closeTvMenu()
                        }}
                        className={`${tvMenuItemClass} ${isActive ? '!border-accent-400/50 !bg-accent-400/10 !text-accent-300' : ''}`}
                      >
                        <span className="truncate">{cat}</span>
                        {isActive ? (
                          <svg className="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        ) : null}
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {createListOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md"
          onClick={() => {
            setCreateListOpen(false)
            setCreateListName('')
            setPendingChannelForNewList(null)
          }}
        >
          <div
            className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{t('liveTvCreateList')}</p>
              <h3 className="text-2xl font-semibold text-white">{t('liveTvListName')}</h3>
              <p className="text-sm text-slate-400">{t('liveTvCreateListDesc')}</p>
            </div>
            <input
              type="text"
              value={createListName}
              onChange={(event) => setCreateListName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSubmitCreateList()
                }
                if (event.key === 'Escape') {
                  setCreateListOpen(false)
                  setCreateListName('')
                  setPendingChannelForNewList(null)
                }
              }}
              placeholder={t('liveTvListName')}
              autoFocus
              className="w-full rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-accent-400/50 focus:bg-white/[0.06]"
            />
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCreateListOpen(false)
                  setCreateListName('')
                  setPendingChannelForNewList(null)
                }}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmitCreateList}
                disabled={!createListName.trim()}
                className="rounded-full border border-accent-400/40 bg-accent-400/15 px-5 py-2.5 text-sm text-white transition hover:border-accent-400/60 hover:bg-accent-400/20 disabled:cursor-default disabled:opacity-50"
              >
                {t('liveTvCreateList')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {TvKeyboardPanel && searchKeyboardOpen ? (
        <TvKeyboardPanel
          title={t('m3uSearch')}
          placeholder={t('m3uSearch')}
          initial={searchInput}
          onDone={(value) => {
            setSearchNow(value)
            setSearchKeyboardOpen(false)
          }}
          onClose={() => setSearchKeyboardOpen(false)}
        />
      ) : null}
    </>
  )
}

/**
 * Dagens tablå för en kanal — högerkolumnen i rutnätets 60/40-layout. Ren
 * information: klick på korten spelar som förut, panelens Spela-knapp är en
 * genväg. Nu-programmet markeras och rullas in i bild.
 */
function ChannelSidePanel({
  channel,
  model,
  h,
  onPlay,
}: {
  channel: M3uChannel | null
  model: LiveTvModel
  h: ReturnType<typeof useHubText>['h']
  onPlay: (channel: M3uChannel) => void
}) {
  const { lang } = useLang()
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB'
  const nowRef = useRef<HTMLDivElement | null>(null)
  const { nowMs } = model
  // Tablån hämtas per fönster från appen (spec 4.2) i stället för ur en
  // EPG-cache i webviewn.
  const scheduleChannels = useMemo(() => (channel ? [channel] : []), [channel])
  const { schedules, loading: scheduleLoading } = useSchedules(scheduleChannels, startOfLocalDay(nowMs), startOfLocalDay(nowMs, 1))
  const schedule = channel ? schedules[channelKey(channel)] ?? [] : []
  const info = channel ? model.nowFor(channel) : { now: null, next: null, later: null }
  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: 'center' })
  }, [channel?.url, schedule.length])
  if (!channel) return null
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LT.line}`, borderRadius: LT.radiusLg, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'calc(100vh - 140px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ChannelBadge channel={channel} size={48} radius={LT.radiusMd} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="truncate" style={{ fontSize: 16, fontWeight: 600 }}>{channel.name}</div>
          <div className="truncate" style={{ fontSize: 12, color: LT.dim }}>{channel.group || '—'}</div>
        </div>
        <Btn variant="primary" small onClick={() => onPlay(channel)}>{h('hubWatchNow')}</Btn>
      </div>
      {info.now ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveTag label={h('hubLive')} />
            <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{info.now.title}</div>
          </div>
          <div style={{ marginTop: 6 }}><ProgressBar value={progressOf(info.now.start, info.now.stop, nowMs)} height={3} /></div>
        </div>
      ) : null}
      <Kicker>{h('hubGuideKicker')}</Kicker>
      {schedule.length === 0 ? (
        // Tablån hämtas från appen: tomt betyder "hämtar" tills svaret kommit.
        <p style={{ margin: 0, fontSize: 13, color: LT.muted }}>{scheduleLoading ? h('hubLoadingEpg') : h('hubNoProgramme')}</p>
      ) : (
        <div style={{ overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {schedule.map((programme) => {
            const isNow = programme.start <= nowMs && programme.stop > nowMs
            const past = programme.stop <= nowMs
            return (
              <div
                key={programme.start}
                ref={isNow ? nowRef : undefined}
                style={{ display: 'flex', gap: 10, padding: '7px 10px', borderRadius: LT.radiusSm, background: isNow ? LT.accentDeep : 'transparent', opacity: past ? 0.5 : 1 }}
              >
                <span style={{ width: 44, flexShrink: 0, fontSize: 12, color: isNow ? LT.text : LT.dim, fontVariantNumeric: 'tabular-nums' }}>{formatClock(programme.start, locale)}</span>
                <span className="truncate" style={{ fontSize: 13, fontWeight: isNow ? 600 : 400 }}>{programme.title}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
