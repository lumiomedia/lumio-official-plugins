'use client'

import { useEffect, useMemo, useState } from 'react'
import { isWatching, onWatchlistChanged, toggleWatchlist } from '@/lib/plugin-sdk'
import { fetchVodEpisodes, lookupVod, type VodEpisode, type VodItem } from '../vod-client'
import { findXtreamLoginByPseudoUrl, getLiveTvLists, getXtreamLogins } from '../live-tv-data'
import { fetchVodTitleInfo, formatRuntime, type VodTitleInfo } from '../vod-title'
import type { TvViewProps } from './tv-shell'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'

/**
 * Bibliotekets egen detaljvy — INNE i Live TV, med ikonraden kvar.
 *
 * Jerrys krav 2026-09-19: bakgrundsbild, spelknapp, Min lista, skådespelare,
 * och uppspelning härifrån. Uttryckligen INTE rekommendationer eller
 * kommentarer. Appens detaljsida (`media-details-panel`, 6 000 rader) bär allt
 * det och kan inte ritas i en Live TV-vy ändå — den äger sin egen sida. Här
 * hämtas bara DATAN ur samma endpoint appens sida använder (`/api/wiki`) och
 * ritas i TV-lägets egna primitiver.
 *
 * Panelens egna uppgifter (affisch, titel, år) ritas direkt; TMDB-svaret fyller
 * på när det kommer. En titel utan TMDB-id visas alltså också — den blir bara
 * mager.
 */

export function TvLibraryTitle({ model, nav, params }: TvViewProps) {
  const { tt } = useTvText()
  const itemKey = params.key ?? ''
  const source = model.activeSource

  const [item, setItem] = useState<VodItem | null>(null)
  const [info, setInfo] = useState<VodTitleInfo | null>(null)
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

  useEffect(() => {
    setInfo(null)
    if (!item?.tmdbId) return
    const controller = new AbortController()
    void fetchVodTitleInfo(item.tmdbId, item.kind === 'series' ? 'tv' : 'movie', controller.signal).then((next) => {
      if (!controller.signal.aborted) setInfo(next)
    })
    return () => controller.abort()
  }, [item?.tmdbId, item?.kind])

  // Avsnitten hämtas bara för serier, och bara när vyn öppnas — ett anrop per
  // serie man faktiskt tittar på (värden cachar det en halvtimme).
  useEffect(() => {
    setEpisodes(null)
    setSeason(null)
    if (item?.kind !== 'series' || !item.seriesId) return
    const login = sourceLoginFor(item)
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
  useEffect(() => {
    if (!watchKey) return
    setInList(isWatching(watchKey))
    return onWatchlistChanged(() => setInList(isWatching(watchKey)))
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
  const meta = [
    year ? String(year) : null,
    item.kind === 'series'
      ? seasonCount
        ? seasonCount === 1 ? tt('librarySeason') : tt('librarySeasons', { count: seasonCount })
        : null
      : runtime,
    info?.genres.slice(0, 3).join(' · ') || null,
    info?.voteAverage ? info.voteAverage.toFixed(1) : item.rating ? item.rating.toFixed(1) : null,
  ].filter((part): part is string => Boolean(part))

  const play = (url: string, label: string) => {
    // Filmen spelas i Live TV:s egen spelare genom att ge den en kanal-form.
    // Spelaren bryr sig bara om namn och URL; `group`/`tvgId` är tomma för att
    // ingen EPG-matchning ska försöka sig på en film.
    nav.play({ channel: { name: label, logo: item.posterUrl ?? null, group: '', url, tvgId: null }, url, label })
  }

  const onPlay = () => {
    if (item.url) return play(item.url, title)
    const first = seasonEpisodes[0] ?? episodes?.[0]
    if (first) play(first.url, `${title} · S${first.season}E${first.episode}`)
  }

  const canPlay = Boolean(item.url) || Boolean(episodes && episodes.length > 0)

  return (
    <div data-testid="tv-library-title" data-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>
      {info?.backdropUrl ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            height: dp(620),
            backgroundImage: `url(${info.backdropUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
          }}
        />
      ) : null}
      {/* Skärmen som gör texten läsbar oavsett bild. Alltid ritad, även utan
          bakgrund, så layouten inte hoppar när bilden landar. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          height: dp(620),
          background: `linear-gradient(90deg, ${TV.bg} 18%, rgba(0,0,0,0.55) 58%, rgba(0,0,0,0.15) 100%),
                       linear-gradient(0deg, ${TV.bg} 2%, rgba(0,0,0,0) 60%)`,
        }}
      />

      <div style={{ position: 'relative', padding: `${dp(56)}px ${dp(48)}px ${dp(40)}px`, maxWidth: dp(1100) }}>
        <div style={{ fontSize: dp(46), fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        {meta.length > 0 ? (
          <div style={{ fontSize: dp(18), color: 'rgba(243,244,248,0.7)', marginTop: dp(10) }}>{meta.join(' · ')}</div>
        ) : null}
        {info?.tagline ? (
          <div style={{ fontSize: dp(19), color: TV.dim, marginTop: dp(10), fontStyle: 'italic' }}>{info.tagline}</div>
        ) : null}
        {info?.overview ? (
          <p style={{ fontSize: dp(19), lineHeight: 1.5, color: 'rgba(243,244,248,0.85)', marginTop: dp(16), maxWidth: dp(760) }}>
            {info.overview}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: dp(12), marginTop: dp(26), flexWrap: 'wrap' }}>
          {canPlay ? (
            <div
              data-testid="title-play"
              {...station(onPlay, undefined, { 'data-init': '' })}
              style={{
                height: dp(56),
                padding: `0 ${dp(30)}px`,
                borderRadius: 999,
                background: TV.acc,
                color: '#fff',
                fontSize: dp(20),
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              {tt('menuPlay')}
            </div>
          ) : null}
          {watchKey ? (
            <div
              data-testid="title-watchlist"
              data-active={inList ? '' : undefined}
              {...station(
                () => {
                  toggleWatchlist({
                    tmdbId: watchKey,
                    imdbId: info?.imdbId ?? item.imdbId ?? null,
                    title,
                    posterUrl: info?.posterUrl ?? item.posterUrl ?? null,
                  })
                  setInList(isWatching(watchKey))
                },
                undefined,
                canPlay ? undefined : { 'data-init': '' },
              )}
              style={{
                height: dp(56),
                padding: `0 ${dp(26)}px`,
                borderRadius: 999,
                border: `1px solid ${inList ? TV.acc : TV.lineStrong}`,
                background: inList ? TV.accMix(18) : TV.s08,
                fontSize: dp(20),
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              {inList ? tt('inMyList') : tt('addToMyList')}
            </div>
          ) : null}
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
            onPlay={(entry) => play(entry.url, `${title} · S${entry.season}E${entry.episode}`)}
          />
        ) : null}

        {info && info.cast.length > 0 ? (
          <section style={{ marginTop: dp(36) }} data-testid="title-cast">
            <div style={{ fontSize: dp(24), fontWeight: 600, marginBottom: dp(14) }}>{tt('cast')}</div>
            <div data-row="" style={{ display: 'flex', gap: dp(14), overflowX: 'auto', paddingBottom: dp(6) }}>
              {info.cast.map((person) => (
                <div key={person.id} style={{ width: dp(130), flexShrink: 0 }}>
                  <div
                    style={{
                      aspectRatio: '2 / 3',
                      borderRadius: dp(10),
                      background: TV.s07,
                      border: `1px solid ${TV.lineCard}`,
                      backgroundImage: person.profileUrl ? `url(${person.profileUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div style={{ fontSize: dp(16), fontWeight: 600, marginTop: dp(6), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {person.name}
                  </div>
                  <div style={{ fontSize: dp(14), color: 'rgba(243,244,248,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {person.character}
                  </div>
                </div>
              ))}
            </div>
          </section>
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
    return <div style={{ marginTop: dp(28), fontSize: dp(18), color: TV.dim }}>{emptyLabel}</div>
  }
  return (
    <section style={{ marginTop: dp(32) }} data-testid="title-seasons">
      <div data-row="" style={{ display: 'flex', gap: dp(10), overflowX: 'auto', marginBottom: dp(14) }}>
        {seasons.map((number) => (
          <div
            key={number}
            data-testid={`season-${number}`}
            data-active={number === season ? '' : undefined}
            {...station(() => onSeason(number))}
            style={{
              height: dp(44),
              padding: `0 ${dp(20)}px`,
              borderRadius: 999,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: dp(17),
              cursor: 'pointer',
              background: number === season ? TV.s16 : TV.s06,
              color: number === season ? '#fff' : 'rgba(243,244,248,0.6)',
            }}
          >
            {seasonLabel(number)}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: dp(6) }}>
        {episodes.map((entry) => (
          <div
            key={`${entry.season}:${entry.episode}`}
            data-testid="title-episode"
            {...station(() => onPlay(entry))}
            style={{
              minHeight: dp(60),
              borderRadius: dp(12),
              padding: `${dp(10)}px ${dp(16)}px`,
              background: TV.s06,
              display: 'flex',
              alignItems: 'center',
              gap: dp(16),
              cursor: 'pointer',
            }}
          >
            <span style={{ width: dp(64), fontSize: dp(18), color: 'rgba(243,244,248,0.5)', fontVariantNumeric: 'tabular-nums' }}>
              {`E${entry.episode}`}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: dp(19), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entry.title || `Episode ${entry.episode}`}
            </span>
            {entry.runtimeMin ? (
              <span style={{ fontSize: dp(16), color: 'rgba(243,244,248,0.5)' }}>{`${entry.runtimeMin} min`}</span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Källan och inloggningen som titeln kom ur.
 *
 * Titeln bär inte sin källa (indexet svarar med titlar, inte med var de låg),
 * så den letas upp bland Xtream-listorna. Med EN panel är det första träffen;
 * med flera väljs den vars konto finns kvar — avsnittshämtningen behöver just
 * DEN inloggningen för att bygga spelbara URL:er.
 */
function sourceLoginFor(item: VodItem): { source: string; xtream: { base: string; username: string; password: string; format: string } } | null {
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
  void item
  return null
}
