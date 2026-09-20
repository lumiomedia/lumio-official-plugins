'use client'

import { useEffect, useMemo, useState } from 'react'
import { isMovieWatched, isWatching, onWatchedMoviesChanged, onWatchlistChanged, toggleMovieWatched, toggleWatchlist, useTvMode } from '@/lib/plugin-sdk'
import { fetchVodEpisodes, lookupVod, type VodEpisode, type VodItem } from '../vod-client'
import { findXtreamLoginByPseudoUrl, getLiveTvLists, getXtreamLogins } from '../live-tv-data'
import { fetchTitleLogo, fetchVodTitleInfo, formatRuntime, type VodTitleInfo } from '../vod-title'
import { useNarrowSurface } from '../hooks/useNarrowSurface'
import type { TvViewProps } from './tv-shell'
import { Icons, TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'

/**
 * Bibliotekets detaljvy — appens detaljsida, men inne i Live TV.
 *
 * Formen är tagen ur appens egen sida (Jerrys skärmdump 2026-09-19):
 * bakgrunden fyller HELA ytan bredvid ikonraden på 70 % opacitet, och
 * informationsblocket ligger nere till vänster — titellogotyp, metarad,
 * handling, och ett accentfärgat Play-piller följt av runda ikonknappar.
 *
 * Det som medvetet INTE följer med från appens sida: rekommendationer,
 * kommentarer och strömväljaren. Källan är alltid panelen här, och Jerry bad
 * uttryckligen att slippa resten.
 */

/**
 * Knapphöjden efter Play. TV får en grövre rad av samma skäl som rutnätet
 * (tv-library.tsx): samma designpixlar, tre meters tittavstånd.
 */
const ICON_SIZE = 44
const ICON_SIZE_TV = 60

export function TvLibraryTitle({ model, nav, params }: TvViewProps) {
  const { tt } = useTvText()
  const isTv = useTvMode()
  /* Telefonen är en SMAL yta, och måtten här är skrivna för en tv-duk.
     `dp()` är identitet, så 48 px sidpadding och en 46 px titel gällde
     ordagrant på en 393 px bred skärm — informationsblocket blev högre än
     vyn och handlingen försvann bakom flikraden (Jerry 2026-09-20: "hero
     när jag väljer en VOD-film är för stor, går utanför viewporten"). */
  const narrow = useNarrowSurface()
  const iconSize = isTv ? ICON_SIZE_TV : ICON_SIZE
  const itemKey = params.key ?? ''
  const source = model.activeSource

  const [item, setItem] = useState<VodItem | null>(null)
  const [info, setInfo] = useState<VodTitleInfo | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [episodes, setEpisodes] = useState<VodEpisode[] | null>(null)
  const [season, setSeason] = useState<number | null>(null)

  // Titeln slås upp på nyckeln i stället för att skickas som parametrar: en
  // URL med titel, affisch och ström-URL i frågesträngen hade burit hela
  // panelens adress i navigeringshistoriken.
  useEffect(() => {
    if (!itemKey) return
    let cancelled = false
    void lookupVod(source, [itemKey])
      .then((hits) => { if (!cancelled) setItem(hits[0] ?? null) })
      .catch(() => { if (!cancelled) setItem(null) })
    return () => { cancelled = true }
  }, [itemKey, source])

  const mediaType = item?.kind === 'series' ? 'tv' : 'movie'

  useEffect(() => {
    setInfo(null)
    setLogoUrl(null)
    if (!item?.tmdbId) return
    const controller = new AbortController()
    void fetchVodTitleInfo(item.tmdbId, mediaType, controller.signal).then((next) => {
      if (!controller.signal.aborted) setInfo(next)
    })
    // Logotypen är egen hämtning: den saknas för många titlar, och vyn ska
    // inte vänta på den för att rita rubriken.
    void fetchTitleLogo(item.tmdbId, mediaType, controller.signal).then((url) => {
      if (!controller.signal.aborted) setLogoUrl(url)
    })
    return () => controller.abort()
  }, [item?.tmdbId, mediaType])

  // Avsnitten hämtas bara för serier, och bara när vyn öppnas — ett anrop per
  // serie man faktiskt tittar på (värden cachar det en halvtimme).
  useEffect(() => {
    setEpisodes(null)
    setSeason(null)
    if (item?.kind !== 'series' || !item.seriesId) return
    const login = firstXtreamSource()
    if (!login) return
    let cancelled = false
    void fetchVodEpisodes(login.source, item.seriesId, login.xtream)
      .then((list) => {
        if (cancelled) return
        setEpisodes(list)
        setSeason(list[0]?.season ?? null)
      })
      .catch(() => { if (!cancelled) setEpisodes([]) })
    return () => { cancelled = true }
  }, [item?.key, item?.kind, item?.seriesId])

  const watchKey = item?.tmdbId ? String(item.tmdbId) : null
  const [inList, setInList] = useState(false)
  const [watched, setWatched] = useState(false)
  useEffect(() => {
    if (!watchKey) return
    const read = () => {
      setInList(isWatching(watchKey))
      setWatched(isMovieWatched({ tmdbId: watchKey }))
    }
    read()
    const offList = onWatchlistChanged(read)
    const offWatched = onWatchedMoviesChanged(read)
    return () => { offList(); offWatched() }
  }, [watchKey])

  const seasons = useMemo(
    () => [...new Set((episodes ?? []).map((entry) => entry.season))].sort((a, b) => a - b),
    [episodes],
  )
  const seasonEpisodes = useMemo(
    () => (episodes ?? []).filter((entry) => entry.season === season),
    [episodes, season],
  )

  if (!item) {
    return (
      <div data-testid="tv-library-title" style={{ flex: 1, padding: dp(48), fontSize: dp(20), color: TV.dim }}>
        {tt('libraryLoading')}
      </div>
    )
  }

  const title = info?.title || item.title
  const year = info?.year ?? item.year ?? null
  const runtime = formatRuntime(info?.runtime ?? null)
  const seasonCount = info?.numberOfSeasons ?? (seasons.length || null)
  const firstEpisode = seasonEpisodes[0] ?? episodes?.[0] ?? null

  /** Metaraden, i appens ordning: genrer / år / längd / betyg. */
  const meta = [
    info?.genres.length ? info.genres.join(' / ') : null,
    year ? String(year) : null,
    item.kind === 'series'
      ? seasonCount
        ? seasonCount === 1 ? tt('librarySeason') : tt('librarySeasons', { count: seasonCount })
        : null
      : runtime,
    info?.voteAverage ? info.voteAverage.toFixed(1) : item.rating ? item.rating.toFixed(1) : null,
  ].filter((part): part is string => Boolean(part))

  const playLabel = item.kind === 'series' && firstEpisode
    ? tt('playEpisode', { season: firstEpisode.season, episode: String(firstEpisode.episode).padStart(2, '0') })
    : tt('menuPlay')

  const playUrl = item.url ?? firstEpisode?.url ?? null
  const canPlay = Boolean(playUrl)

  const openPlayer = (url: string, episode?: VodEpisode) => {
    nav.playStream({
      url,
      title,
      tmdbId: item.tmdbId ? String(item.tmdbId) : null,
      mediaType,
      posterUrl: info?.posterUrl ?? item.posterUrl ?? null,
      backdropUrl: info?.backdropUrl ?? null,
      year,
      ...(episode ? { season: episode.season, episode: episode.episode } : {}),
    })
  }

  const actions: { key: string; label: string; icon: React.ReactNode; active?: boolean; run: () => void }[] = [
    ...(item.tmdbId
      ? [{
          key: 'cast',
          label: tt('fullCast'),
          icon: <Icons.Users />,
          run: () => nav.go('cast', { key: item.key, tmdbId: String(item.tmdbId), type: mediaType }),
        }]
      : []),
    ...(watchKey
      ? [{
          key: 'list',
          label: inList ? tt('inMyList') : tt('addToMyList'),
          icon: <Icons.Bookmark filled={inList} />,
          active: inList,
          run: () => {
            toggleWatchlist({
              tmdbId: watchKey,
              imdbId: info?.imdbId ?? item.imdbId ?? null,
              title,
              posterUrl: info?.posterUrl ?? item.posterUrl ?? null,
            })
            setInList(isWatching(watchKey))
          },
        }]
      : []),
    ...(watchKey && item.kind === 'movie'
      ? [{
          key: 'watched',
          label: watched ? tt('watched') : tt('markWatched'),
          icon: <Icons.Eye filled={watched} />,
          active: watched,
          run: () => {
            toggleMovieWatched({ tmdbId: watchKey, imdbId: info?.imdbId ?? null, title, year })
            setWatched(isMovieWatched({ tmdbId: watchKey }))
          },
        }]
      : []),
  ]

  return (
    <div
      data-testid="tv-library-title"
      data-scroll=""
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      {/* Bakgrunden fyller HELA ytan bredvid ikonraden, på 70 % som appens
          sida. Fast position i flödet: den ska inte rulla med innehållet. */}
      {info?.backdropUrl ? (
        <div
          aria-hidden="true"
          data-testid="title-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${info.backdropUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.7,
          }}
        />
      ) : null}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(0deg, ${TV.bg} 4%, rgba(0,0,0,0.75) 32%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.35) 100%)`,
        }}
      />

      {/* Informationsblocket nere till vänster — `marginTop:auto` trycker ned
          det oavsett hur hög ytan är. */}
      <div style={{ position: 'relative', marginTop: 'auto', padding: narrow ? '24px 16px 28px' : `${dp(40)}px ${dp(48)}px ${dp(36)}px`, maxWidth: dp(1000) }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={title}
            data-testid="title-logo"
            style={{ maxWidth: narrow ? '68%' : dp(isTv ? 520 : 420), maxHeight: narrow ? 84 : dp(isTv ? 150 : 120), objectFit: 'contain', display: 'block', marginBottom: dp(12) }}
          />
        ) : (
          <div style={{ fontSize: narrow ? 30 : dp(isTv ? 58 : 46), fontWeight: 700, lineHeight: 1.1, marginBottom: dp(8) }}>{title}</div>
        )}

        {meta.length > 0 ? (
          <div style={{ fontSize: narrow ? 14 : dp(isTv ? 21 : 17), color: 'rgba(243,244,248,0.85)' }}>{meta.join('  |  ')}</div>
        ) : null}
        {info?.tagline ? (
          <div style={{ fontSize: narrow ? 14 : dp(isTv ? 20 : 17), color: TV.dim, marginTop: dp(6), fontStyle: 'italic' }}>{info.tagline}</div>
        ) : null}
        {info?.overview ? (
          <p
            style={{
              fontSize: narrow ? 14 : dp(isTv ? 22 : 18),
              lineHeight: 1.45,
              color: 'rgba(243,244,248,0.9)',
              marginTop: dp(12),
              maxWidth: dp(700),
              display: '-webkit-box',
              WebkitLineClamp: narrow ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {info.overview}
          </p>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: dp(10), marginTop: dp(20) }}>
          {canPlay ? (
            <div
              data-testid="title-play"
              {...station(() => openPlayer(playUrl as string, item.kind === 'series' ? firstEpisode ?? undefined : undefined), undefined, { 'data-init': '' })}
              style={{
                height: dp(iconSize),
                padding: `0 ${dp(isTv ? 34 : 24)}px`,
                borderRadius: 999,
                background: TV.acc,
                color: '#fff',
                fontSize: dp(isTv ? 22 : 18),
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: dp(8),
                cursor: 'pointer',
              }}
            >
              <Icons.Play size={dp(isTv ? 22 : 18)} />
              {playLabel}
            </div>
          ) : null}
          {actions.map((action, index) => (
            <div
              key={action.key}
              data-testid={`title-action-${action.key}`}
              // Appens kontrakt för utfällbara namn: markeringen gör att BÅDE
              // hovring (pluginets egen regel) och inställningen "visa namn
              // alltid" (appens regel på <html>) träffar de här knapparna.
              data-hero-icon-action=""
              data-active={action.active ? '' : undefined}
              title={action.label}
              aria-label={action.label}
              {...station(action.run, undefined, !canPlay && index === 0 ? { 'data-init': '' } : undefined)}
              style={{
                height: dp(iconSize),
                minWidth: dp(iconSize),
                borderRadius: 999,
                background: action.active ? TV.accMix(18) : TV.s10,
                border: `1px solid ${action.active ? TV.acc : 'transparent'}`,
                color: TV.text,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  width: dp(iconSize),
                  height: dp(iconSize),
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {action.icon}
              </span>
              <span data-hero-icon-label="" style={{ fontSize: dp(isTv ? 20 : 16), fontWeight: 500 }}>
                {action.label}
              </span>
            </div>
          ))}
        </div>

        {item.kind === 'series' ? (
          <SeasonPicker
            seasons={seasons}
            season={season}
            onSeason={setSeason}
            episodes={seasonEpisodes}
            loading={episodes === null}
            emptyLabel={tt('libraryNoEpisodes')}
            seasonLabel={(n) => tt('librarySeasonNumber', { count: n })}
            onPlay={(entry) => openPlayer(entry.url, entry)}
          />
        ) : null}
      </div>
    </div>
  )
}

function SeasonPicker({
  seasons,
  season,
  onSeason,
  episodes,
  loading,
  emptyLabel,
  seasonLabel,
  onPlay,
}: {
  seasons: number[]
  season: number | null
  onSeason: (season: number) => void
  episodes: VodEpisode[]
  loading: boolean
  emptyLabel: string
  seasonLabel: (n: number) => string
  onPlay: (entry: VodEpisode) => void
}) {
  if (loading) return null
  if (seasons.length === 0) {
    return <div style={{ marginTop: dp(20), fontSize: dp(17), color: TV.dim }}>{emptyLabel}</div>
  }
  return (
    <section style={{ marginTop: dp(24) }} data-testid="title-seasons">
      <div data-row="" style={{ display: 'flex', gap: dp(10), overflowX: 'auto', marginBottom: dp(12) }}>
        {seasons.map((number) => (
          <div
            key={number}
            data-testid={`season-${number}`}
            data-active={number === season ? '' : undefined}
            {...station(() => onSeason(number))}
            style={{
              height: dp(40),
              padding: `0 ${dp(18)}px`,
              borderRadius: 999,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: dp(16),
              cursor: 'pointer',
              background: number === season ? TV.s16 : TV.s06,
              color: number === season ? '#fff' : 'rgba(243,244,248,0.6)',
            }}
          >
            {seasonLabel(number)}
          </div>
        ))}
      </div>
      <div data-row="" style={{ display: 'flex', gap: dp(10), overflowX: 'auto', paddingBottom: dp(4) }}>
        {episodes.map((entry) => (
          <div
            key={`${entry.season}:${entry.episode}`}
            data-testid="title-episode"
            {...station(() => onPlay(entry))}
            style={{
              width: dp(260),
              flexShrink: 0,
              borderRadius: dp(12),
              padding: `${dp(10)}px ${dp(14)}px`,
              background: TV.s06,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.5)' }}>{`E${entry.episode}`}</div>
            <div style={{ fontSize: dp(17), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entry.title || `Episode ${entry.episode}`}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Första Xtream-källan med en giltig inloggning.
 *
 * Titeln bär inte sin källa (indexet svarar med titlar, inte med var de låg),
 * och avsnittshämtningen behöver en inloggning för att bygga spelbara URL:er.
 * Med flera paneler tas den första som har ett konto kvar.
 */
function firstXtreamSource(): { source: string; xtream: { base: string; username: string; password: string; format: string } } | null {
  const logins = getXtreamLogins()
  for (const list of getLiveTvLists()) {
    if (list.kind !== 'xtream' || !list.source) continue
    const login = logins.find((entry) => entry.id === list.xtreamLoginId) ?? findXtreamLoginByPseudoUrl(list.source)
    if (!login) continue
    return {
      source: list.source,
      xtream: { base: login.base, username: login.username, password: login.password, format: login.format },
    }
  }
  return null
}
