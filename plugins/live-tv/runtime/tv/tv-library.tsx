'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTvMode } from '@/lib/plugin-sdk'
import { useNarrowSurface } from '../hooks/useNarrowSurface'
import { useVodCategories, useVodPage } from '../hooks/useVodLibrary'
import { canOpenDetails, getVodCategory, getVodSort, openVodItem, setVodCategory, setVodSort } from '../vod-data'
import type { VodCategory, VodItem, VodSort } from '../vod-client'
import type { TvViewProps } from './tv-shell'
import { TV, dp, station } from './tv-ui'
import { MT } from './mobile/mobile-tokens'
import { useTvText } from './tv-strings'

/**
 * Biblioteket: spellistans film och serier i ett affischrutnät.
 *
 * Kategorilistan till vänster kommer ur panelens EGNA kategorinamn, ordagrant
 * (`MOVIE: Swedish`) — användaren känner igen dem från sitt konto, och att
 * strippa prefixet hade gjort två olika kategorier omöjliga att skilja åt.
 * Grupperingen i FILM/SERIER görs på `kind`, aldrig på textprefixet: en panel
 * som döper sina seriekategorier till `TV: …` hade annars hamnat under Film.
 *
 * Måtten är handoffens designpixlar rakt av — `dp()` är identitet och scenen
 * skalas som helhet (se `tv-ui.tsx`).
 */

/**
 * TV SITTER TRE METER BORT.
 *
 * Handoffen ritade 1920×1080 och 7 kolumner, men den ritade en bild — inte ett
 * tittavstånd. Samma designpixlar skalas NER på skrivbordet (scenlådan pressar
 * in 1080 i innehållsytan) och visas i full storlek på TV, där man läser dem
 * från soffan. Därför två uppsättningar: skrivbordet behåller handoffens mått,
 * TV får färre kolumner och grövre text.
 */
const LEFT_W = 380
const LEFT_W_TV = 440
const GRID_COLUMNS = 7
const GRID_COLUMNS_TV = 5
/**
 * Telefonen får TVÅ kolumner, inte tre.
 *
 * Handoffens uttryckliga val: affischerna ska vara läsbara. På 390 px ger tre
 * kolumner 110 px breda affischer, och titeln under dem blir en ellips.
 */
const GRID_COLUMNS_NARROW = 2
const SORTS: VodSort[] = ['new', 'az', 'rating']

/** Affischens platshållare tills bilden är laddad — eller för alltid, när panelen inte har någon. */
function PosterFallback({ title }: { title: string }) {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: TV.s07,
        color: TV.faint,
        fontSize: dp(28),
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      {initials}
    </div>
  )
}

function Poster({ item, radius }: { item: VodItem; radius: number }) {
  // Bilden läggs ÖVER platshållaren i stället för att ersätta den: en panel
  // svarar 404 på var tionde affisch, och `onError` lämnar då initialerna
  // kvar utan att kortet någonsin blinkar tomt.
  const [failed, setFailed] = useState(false)
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '2 / 3',
        borderRadius: dp(radius),
        border: `1px solid ${TV.lineCard}`,
        overflow: 'hidden',
      }}
    >
      <PosterFallback title={item.title} />
      {item.posterUrl && !failed ? (
        <img
          src={item.posterUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}
    </div>
  )
}

function KindTag({ kind, label }: { kind: VodItem['kind']; label: string }) {
  return (
    <span
      style={{
        position: 'absolute',
        top: dp(8),
        right: dp(8),
        fontSize: dp(12),
        letterSpacing: '0.06em',
        padding: `${dp(3)}px ${dp(8)}px`,
        borderRadius: dp(6),
        background: 'rgba(0,0,0,0.55)',
        color: 'rgba(255,255,255,0.75)',
      }}
      data-vod-kind={kind}
    >
      {label}
    </span>
  )
}

export function TvLibrary({ model, nav }: TvViewProps) {
  const { tt } = useTvText()
  /**
   * Smal yta = telefon. Kategorikolumnen blir en rad med chips, rutnätet två
   * kolumner och marginalerna mindre. Skrivbordet behöver ingen egen gren:
   * scenlådan skalar TV-layouten till innehållsytan.
   */
  const narrow = useNarrowSurface()
  const isTv = useTvMode()
  const columns = isTv ? GRID_COLUMNS_TV : GRID_COLUMNS
  const source = model.activeSource
  const playlistId = model.activePlaylistId
  // Utan aktiv spellista (allt utom TV-läge) spänner Biblioteket hela indexet.
  const playlistName = model.activePlaylistName ?? tt('allPlaylists')

  const cats = useVodCategories(source)
  const [sort, setSortState] = useState<VodSort>(() => getVodSort())
  const [selected, setSelected] = useState<string | null>(() => getVodCategory(playlistId))

  // Vald kategori följer spellistan. Den som bytt panel har ett kategori-id
  // som inte finns i den nya, och rutnätet hade öppnat sig tomt — faller
  // tillbaka på den första kategorin panelen faktiskt har.
  const validSelected = useMemo(() => {
    if (cats.categories.length === 0) return null
    if (selected && cats.categories.some((c) => c.id === selected)) return selected
    return cats.categories[0]?.id ?? null
  }, [cats.categories, selected])

  useEffect(() => {
    setSelected(getVodCategory(playlistId))
  }, [playlistId])

  const active = cats.categories.find((c) => c.id === validSelected) ?? null
  const page = useVodPage({
    source,
    categoryId: validSelected,
    sort,
    // Utan kategori finns inget att hämta ännu — vänta in listan i stället
    // för att be om hela biblioteket osorterat. Källan får däremot vara null:
    // det betyder alla spellistor.
    enabled: Boolean(validSelected),
  })

  const chooseCategory = (id: string) => {
    setSelected(id)
    if (playlistId) setVodCategory(playlistId, id)
  }
  const chooseSort = (next: VodSort) => {
    setSortState(next)
    setVodSort(next)
  }

  /**
   * OK öppnar bibliotekets EGNA detaljvy, inne i Live TV — inte appens sida.
   *
   * Jerrys krav 2026-09-19: ikonraden ska vara kvar och filmen spelas
   * härifrån. `openVodItem` (appens detaljsida) finns kvar i håll-OK-menyn
   * som "Mer info" för den som vill ha hela sidan med rekommendationer.
   */
  const openItem = (item: VodItem) => {
    nav.go('title', { key: item.key })
  }

  const holdMenu = (item: VodItem, element: HTMLElement) => {
    const actions = [
      ...(item.url
        ? [{
            key: 'play',
            label: tt('menuPlay'),
            run: () => nav.play({
              channel: { name: item.title, logo: item.posterUrl ?? null, group: '', url: item.url as string, tvgId: null },
              url: item.url,
              label: item.title,
            }),
          }]
        : []),
      // "Mer info" går till APPENS sida, för den som vill ha allt den bär.
      ...(canOpenDetails(item)
        ? [{ key: 'info', label: tt('menuMoreInfo'), run: () => { if (!openVodItem(item)) nav.toast(tt('libraryNoDetails')) } }]
        : []),
    ]
    if (actions.length === 0) return
    nav.openMenu({ title: item.title, element, actions })
  }

  const sortLabel = (key: VodSort) =>
    key === 'az' ? tt('librarySortAz') : key === 'rating' ? tt('librarySortRating') : tt('librarySortNew')

  const grouped = useMemo(() => groupByKind(cats.categories), [cats.categories])
  // `data-init` sätts på FÖRSTA kortet i rutnätet när det finns något att
  // fokusera där, annars på den valda kategorin. Ett tomt rutnät utan
  // startpunkt lämnar fjärren utan fokus alls.
  const initInGrid = page.items.length > 0

  const card = (item: VodItem, index: number) => (
    <div
      key={item.key}
      data-testid="library-card"
      {...station(
        () => openItem(item),
        (element) => holdMenu(item, element),
        index === 0 && initInGrid ? { 'data-init': '' } : undefined,
      )}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ position: 'relative' }}>
        <Poster item={item} radius={12} />
        <KindTag kind={item.kind} label={item.kind === 'series' ? tt('libraryKindSeries') : tt('libraryKindMovie')} />
      </div>
      <div
        style={{
          fontSize: dp(narrow ? 15 : isTv ? 20 : 17),
          fontWeight: 600,
          marginTop: dp(8),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.title}
      </div>
      <div style={{ fontSize: dp(narrow ? 13 : isTv ? 17 : 15), color: 'rgba(243,244,248,0.55)' }}>{metaLine(item)}</div>
    </div>
  )

  const status = (
    <LibraryStatus
      cats={cats}
      page={page}
      onLoadMore={page.loadMore}
      text={{
        loading: tt('libraryLoading'),
        emptyCategory: tt('libraryEmptyCategory'),
        emptySource: tt('libraryEmptySource'),
      }}
    />
  )

  /**
   * TELEFONEN: en kolumn, kategorierna som en sidoscrollande chipsrad.
   *
   * Sektionsrubrikerna FILM/SERIER faller bort här — de kostar en rad var i
   * en vy där höjden är dyrast — men ORDNINGEN behålls, film först, så
   * chipsraden fortfarande läses som två grupper.
   */
  if (narrow) {
    return (
      <div data-scroll="" data-testid="tv-library" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: dp(24) }}>
        {/*
          SYSTEMRADEN MÅSTE RÄKNAS IN. Den smala grenen började på 20 px rakt
          av, och på en telefon med kamerahål la sig rubriken UNDER klockan och
          statusikonerna (Jerry 2026-09-20: "Library sidan på live TV går för
          högt upp och överlappar menyn"). Samma vakt som telefonens sidhuvud
          använder — MT.SAFE_TOP_GUARD — så måttet bor på ett ställe.
        */}
        <div style={{ padding: `calc(${MT.SAFE_TOP_GUARD} + ${dp(20)}px) ${dp(20)}px 0` }}>
          <div style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('library')}</div>
          <div style={{ fontSize: dp(13), color: 'rgba(243,244,248,0.5)' }}>
            {tt('librarySub', { playlist: playlistName, count: cats.total })}
          </div>
        </div>
        <div
          data-row=""
          style={{ display: 'flex', gap: dp(8), overflowX: 'auto', padding: `${dp(14)}px ${dp(20)}px` }}
        >
          {cats.categories.map((category) => {
            const isActive = category.id === validSelected
            return (
              <div
                key={`${category.kind}:${category.id}`}
                data-testid="library-category"
                data-active={isActive ? '' : undefined}
                {...station(
                  () => chooseCategory(category.id),
                  undefined,
                  isActive && !initInGrid ? { 'data-init': '' } : undefined,
                )}
                style={{
                  height: dp(36),
                  padding: `0 ${dp(16)}px`,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: dp(8),
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  fontSize: dp(14),
                  cursor: 'pointer',
                  background: isActive ? TV.accMix(18) : TV.s06,
                  color: isActive ? TV.text : 'rgba(243,244,248,0.65)',
                }}
              >
                {category.name}
                <span style={{ color: 'rgba(243,244,248,0.4)' }}>{category.count}</span>
              </div>
            )
          })}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLUMNS_NARROW}, minmax(0, 1fr))`,
            gap: dp(12),
            padding: `0 ${dp(20)}px`,
            alignContent: 'start',
          }}
        >
          {page.items.map(card)}
          {status}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }} data-testid="tv-library">
      <div
        data-scroll=""
        style={{
          width: dp(isTv ? LEFT_W_TV : LEFT_W),
          flexShrink: 0,
          borderRight: `1px solid ${TV.line}`,
          padding: `${dp(30)}px ${dp(14)}px 0 ${dp(24)}px`,
          overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: dp(isTv ? 36 : 30), fontWeight: 600 }}>{tt('library')}</div>
        <div style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)', marginBottom: dp(16) }}>
          {tt('librarySub', { playlist: playlistName, count: cats.total })}
        </div>
        {grouped.map((group) => (
          <div key={group.kind}>
            <div
              style={{
                fontSize: dp(isTv ? 17 : 14),
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(243,244,248,0.4)',
                margin: `${dp(14)}px 0 ${dp(6)}px`,
              }}
            >
              {group.kind === 'series' ? tt('librarySectionSeries') : tt('librarySectionMovies')}
            </div>
            {group.categories.map((category) => {
              const isActive = category.id === validSelected
              return (
                <div
                  key={`${category.kind}:${category.id}`}
                  data-testid="library-category"
                  data-active={isActive ? '' : undefined}
                  {...station(
                    () => chooseCategory(category.id),
                    undefined,
                    isActive && !initInGrid ? { 'data-init': '' } : undefined,
                  )}
                  style={{
                    minHeight: dp(isTv ? 62 : 52),
                    padding: `${dp(8)}px ${dp(14)}px`,
                    borderRadius: dp(10),
                    display: 'flex',
                    alignItems: 'center',
                    gap: dp(10),
                    cursor: 'pointer',
                    background: isActive ? TV.accMix(18) : 'transparent',
                    color: isActive ? TV.text : 'rgba(243,244,248,0.65)',
                  }}
                >
                  <span style={{ fontSize: dp(isTv ? 22 : 18), flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {category.name}
                  </span>
                  <span style={{ fontSize: dp(isTv ? 17 : 14), color: 'rgba(243,244,248,0.4)' }}>{category.count}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: dp(14), padding: `${dp(30)}px ${dp(48)}px ${dp(16)}px` }}>
          <span style={{ fontSize: dp(isTv ? 34 : 28), fontWeight: 600 }}>{active?.name ?? tt('library')}</span>
          <span style={{ fontSize: dp(isTv ? 20 : 17), color: 'rgba(243,244,248,0.5)' }}>
            {tt('libraryTitlesCount', { count: page.total })}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: dp(10) }}>
            {SORTS.map((key) => (
              <div
                key={key}
                data-testid={`library-sort-${key}`}
                data-active={key === sort ? '' : undefined}
                {...station(() => chooseSort(key))}
                style={{
                  height: dp(isTv ? 54 : 44),
                  padding: `0 ${dp(isTv ? 26 : 20)}px`,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: dp(isTv ? 20 : 17),
                  cursor: 'pointer',
                  background: key === sort ? TV.s16 : TV.s06,
                  color: key === sort ? '#fff' : 'rgba(243,244,248,0.6)',
                }}
              >
                {sortLabel(key)}
              </div>
            ))}
            <div
              data-testid="library-search"
              {...station(() => nav.go('search', { scope: 'vod' }))}
              style={{
                height: dp(isTv ? 54 : 44),
                padding: `0 ${dp(isTv ? 26 : 20)}px`,
                borderRadius: 999,
                border: `1px solid ${TV.s12}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: dp(8),
                fontSize: dp(isTv ? 20 : 17),
                cursor: 'pointer',
              }}
            >
              {tt('librarySearch')}
            </div>
          </div>
        </div>

        <div
          data-scroll=""
          style={{
            flex: 1,
            overflowY: 'auto',
            // Toppadding, inte noll: fokusringen är 2 px med 3 px offset och
            // en glöd utanför det. Utan utrymme klippte scroll-containern
            // ringen på ÖVERSTA raden — den såg ut att sakna överkant.
            padding: `${dp(12)}px ${dp(48)}px ${dp(40)}px`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: dp(isTv ? 22 : 18),
            alignContent: 'start',
          }}
        >
          {page.items.map(card)}
          {status}
        </div>
      </div>
    </div>
  )
}

/**
 * Metaraden under titeln: `2024` för film, `2017` för en serie.
 *
 * Handoffen ritar `2024 · 2 h 46` och `4 säsonger`, men speltid och
 * säsongsantal finns INTE i panelens listsvar — de ligger bakom `get_vod_info`
 * respektive `get_series_info`, ett anrop per titel. Att hämta dem för ett
 * rutnät vore 120 anrop per skärm. Raden visar det panelen faktiskt skickade;
 * resten står i detaljvyn, som hämtar sitt från TMDB.
 */
function metaLine(item: VodItem): string {
  const parts: string[] = []
  if (item.year) parts.push(String(item.year))
  if (item.rating) parts.push(item.rating.toFixed(1))
  return parts.join(' · ')
}

function groupByKind(categories: VodCategory[]): { kind: VodItem['kind']; categories: VodCategory[] }[] {
  const movies = categories.filter((c) => c.kind === 'movie')
  const series = categories.filter((c) => c.kind === 'series')
  return [
    ...(movies.length > 0 ? [{ kind: 'movie' as const, categories: movies }] : []),
    ...(series.length > 0 ? [{ kind: 'series' as const, categories: series }] : []),
  ]
}

/**
 * Rutnätets tillstånd när det inte är fullt av affischer, plus sentinelen som
 * hämtar nästa sida.
 *
 * Tre lägen som ser likadana ut om man slarvar och bara tittar på antalet
 * titlar: hämtningen pågår, panelen har ingen VOD alls, och den här kategorin
 * är tom. Bara den mittersta är ett slutgiltigt svar.
 */
function LibraryStatus({
  cats,
  page,
  onLoadMore,
  text,
}: {
  cats: ReturnType<typeof useVodCategories>
  page: ReturnType<typeof useVodPage>
  onLoadMore: () => void
  text: { loading: string; emptyCategory: string; emptySource: string }
}) {
  const sentinel = useRef<HTMLDivElement | null>(null)
  const hasMore = page.hasMore

  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasMore) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  const busy = cats.loading || cats.importing || page.loading
  const message = busy
    ? text.loading
    : cats.categories.length === 0
      ? text.emptySource
      : page.items.length === 0
        ? text.emptyCategory
        : null

  return (
    <>
      {message ? (
        <div
          data-testid="library-status"
          style={{ gridColumn: '1 / -1', fontSize: dp(20), color: 'rgba(243,244,248,0.55)', padding: `${dp(24)}px 0` }}
        >
          {message}
        </div>
      ) : null}
      {hasMore ? <div ref={sentinel} data-testid="library-sentinel" style={{ gridColumn: '1 / -1', height: dp(1) }} /> : null}
    </>
  )
}
