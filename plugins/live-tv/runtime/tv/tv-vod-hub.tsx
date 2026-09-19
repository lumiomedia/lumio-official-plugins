'use client'

import { useMemo } from 'react'
import { useVodCategories, useVodPage } from '../hooks/useVodLibrary'
import { openVodItem, type VodMode } from '../vod-data'
import type { VodItem } from '../vod-client'
import type { TvNav } from './tv-shell'
import { TV, dp, station } from './tv-ui'
import { useTvText } from './tv-strings'

/**
 * Hubbens VOD-avsnitt: antingen en rullande rad med film och serier, eller en
 * hänvisningsrad till Biblioteket — styrt av `vodMode` per spellista.
 *
 * Placeras UNDER "Fortsätt titta" och ÖVER "Alla kanaler": spotlight,
 * Favoriter och Fortsätt titta är live-innehåll och ska aldrig trängas undan
 * av film (handoffen §4).
 */

/** Handoffens tak för raden. Fler kort än så rullar ingen igenom med en fjärr. */
const ROW_MAX = 20

export function TvVodHubSection({ mode, source, playlistName, nav }: {
  mode: VodMode
  source: string | null
  playlistName: string
  nav: TvNav
}) {
  const { tt } = useTvText()
  // Källan är null utanför TV-läget och betyder då alla spellistor — samma
  // regel som Biblioteket och kanallistan.
  const enabled = mode !== 'off'
  const cats = useVodCategories(enabled ? source : null)
  const page = useVodPage({
    source,
    sort: 'new',
    // Raden behöver aldrig mer än sitt tak, och hänvisningsraden behöver bara
    // ANTALET — det kommer ur kategorisvaret, så då hämtas inga titlar alls.
    enabled: enabled && mode === 'rows',
    limit: ROW_MAX,
  })

  /**
   * Film först, serier sist.
   *
   * Handoffen vill dessutom vikta på osedda, påbörjade och mest besökta
   * kategori. Pluginet har inget sett-tillstånd för VOD — det bor i appens
   * profil och nås inte härifrån — så urvalet är "senast tillagda", ordnat
   * per typ. Det är ordnat och begripligt; viktningen hör till samma omgång
   * som fortsätt-titta för VOD.
   */
  const ordered = useMemo(() => {
    const movies = page.items.filter((item) => item.kind === 'movie')
    const series = page.items.filter((item) => item.kind === 'series')
    return [...movies, ...series].slice(0, ROW_MAX)
  }, [page.items])

  if (mode === 'off') return null
  // Inget att visa förrän vi VET att panelen har VOD: en hänvisningsrad som
  // säger "0 titlar" är värre än ingen rad alls.
  if (cats.total === 0) return null

  if (mode === 'link') {
    return (
      <section data-testid="hub-vod-link">
        <div
          {...station(() => nav.go('settings', { tab: 'content' }))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: dp(20),
            padding: `${dp(18)}px ${dp(22)}px`,
            borderRadius: dp(14),
            background: TV.s06,
            border: `1px solid ${TV.lineCard}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: dp(20), fontWeight: 600 }}>{tt('vodLinkTitle')}</div>
            <div style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.6)' }}>
              {tt('vodLinkBody', { count: cats.total, playlist: playlistName })}
            </div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              fontSize: dp(18),
              fontWeight: 600,
              padding: `${dp(10)}px ${dp(20)}px`,
              borderRadius: 999,
              background: TV.acc,
              // Vit text på accentfylld knapp — handoffens uttryckliga regel.
              color: '#fff',
            }}
          >
            {tt('vodLinkAction')}
          </span>
        </div>
      </section>
    )
  }

  if (ordered.length === 0) return null

  return (
    <section data-testid="hub-vod-row" style={{ display: 'flex', flexDirection: 'column', gap: dp(14) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: dp(14) }}>
        <span style={{ fontSize: dp(26), fontWeight: 600 }}>{tt('vodRowTitle')}</span>
        <span style={{ fontSize: dp(17), color: 'rgba(243,244,248,0.5)' }}>
          {tt('vodRowSub', { playlist: playlistName, count: cats.total })}
        </span>
      </div>
      <div data-row="" style={{ display: 'flex', gap: dp(16), overflowX: 'auto', padding: dp(4) }}>
        {ordered.map((item) => (
          <VodRowCard key={item.key} item={item} nav={nav} />
        ))}
      </div>
    </section>
  )
}

function VodRowCard({ item, nav }: { item: VodItem; nav: TvNav }) {
  const { tt } = useTvText()
  /**
   * OK går till bibliotekets EGNA detaljvy, inne i Live TV — samma väg som
   * korten i Biblioteket. Raden härifrån gick tidigare till appens detaljsida
   * och slängde ut användaren ur Live TV, fast kortet bredvid i Biblioteket
   * stannade kvar. Två vägar in till samma titel ska landa på samma ställe.
   */
  const open = () => nav.go('title', { key: item.key })
  const hold = (element: HTMLElement) => {
    const actions = [
      ...(item.url
        ? [{
            key: 'play',
            label: tt('menuPlay'),
            run: () => nav.playStream({
              url: item.url as string,
              title: item.title,
              tmdbId: item.tmdbId ? String(item.tmdbId) : null,
              mediaType: item.kind === 'series' ? 'tv' as const : 'movie' as const,
              posterUrl: item.posterUrl ?? null,
              year: item.year ?? null,
            }),
          }]
        : []),
      { key: 'details', label: tt('menuMoreInfo'), run: () => { if (!openVodItem(item)) nav.toast(tt('libraryNoDetails')) } },
    ]
    nav.openMenu({ title: item.title, element, actions })
  }
  return (
    <div
      data-testid="hub-vod-card"
      {...station(open, hold)}
      style={{
        width: dp(190),
        flexShrink: 0,
        borderRadius: dp(14),
        background: TV.s07,
        border: `1px solid ${TV.lineCard}`,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '2 / 3', background: TV.s07 }}>
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt=""
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
        <span
          data-vod-kind={item.kind}
          style={{
            position: 'absolute',
            left: dp(10),
            bottom: dp(10),
            fontSize: dp(13),
            padding: `${dp(4)}px ${dp(10)}px`,
            borderRadius: dp(6),
            background: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          {item.kind === 'series' ? tt('libraryKindSeries') : tt('libraryKindMovie')}
        </span>
      </div>
      <div style={{ padding: `${dp(10)}px ${dp(12)}px` }}>
        <div style={{ fontSize: dp(17), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title}
        </div>
        <div style={{ fontSize: dp(15), color: 'rgba(243,244,248,0.55)' }}>{item.year ?? ''}</div>
      </div>
    </div>
  )
}
