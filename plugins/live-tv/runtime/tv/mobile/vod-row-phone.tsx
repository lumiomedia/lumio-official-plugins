'use client'

import { useMemo } from 'react'
import { useVodCategories, useVodPage } from '../../hooks/useVodLibrary'
import { type VodMode } from '../../vod-data'
import type { VodItem } from '../../vod-client'
import type { TvNav } from '../tv-shell'
import { station } from '../tv-ui'
import { useTvText } from '../tv-strings'
import { MT, ellipsis } from './mobile-tokens'

/**
 * Hubbens film- och serieavsnitt på TELEFON.
 *
 * Egen komponent och inte `TvVodHubSection`: den räknar i TV-scenens
 * designpixlar, som på en 360 px-skärm blir absurt stora. Måtten här är
 * handoffens riktiga CSS-px — 163 px breda kort, 10 px mellanrum, 20 px
 * sidmarginal.
 */

/** Handoffens mått för telefonens rad. */
const CARD_W = 163
const ROW_MAX = 20

export function VodRowPhone({ mode, source, playlistName, nav }: {
  mode: VodMode
  source: string | null
  playlistName: string
  nav: TvNav
}) {
  const { tt } = useTvText()
  const enabled = mode !== 'off'
  const cats = useVodCategories(enabled ? source : null)
  const page = useVodPage({
    source,
    sort: 'new',
    // Hänvisningsraden behöver bara ANTALET, och det kommer ur kategorisvaret.
    enabled: enabled && mode === 'rows',
    limit: ROW_MAX,
  })

  // Film först, serier sist — samma ordning som på TV.
  const ordered = useMemo(() => {
    const movies = page.items.filter((item) => item.kind === 'movie')
    const series = page.items.filter((item) => item.kind === 'series')
    return [...movies, ...series].slice(0, ROW_MAX)
  }, [page.items])

  if (mode === 'off') return null
  // Ingen rad förrän vi VET att panelen har VOD: "0 titlar" är värre än tyst.
  if (cats.total === 0) return null

  if (mode === 'link') {
    return (
      <div
        data-testid="hub-vod-link-phone"
        {...station(() => nav.go('settings', { tab: 'content' }))}
        style={{
          flexShrink: 0,
          padding: '12px 14px',
          borderRadius: 14,
          background: MT.s06,
          border: `1px solid ${MT.line10}`,
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600 }}>{tt('vodLinkTitle')}</div>
        <div style={{ fontSize: 13, color: MT.muted, marginTop: 2 }}>
          {tt('vodLinkBody', { count: cats.total, playlist: playlistName })}
        </div>
      </div>
    )
  }

  if (ordered.length === 0) return null

  return (
    <section data-testid="hub-vod-row-phone" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{tt('vodRowTitle')}</span>
        <span style={{ fontSize: 13, color: MT.dim, ...ellipsis }}>
          {tt('vodRowSub', { playlist: playlistName, count: cats.total })}
        </span>
      </div>
      <div
        data-row=""
        style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x proximity', paddingBottom: 2 }}
      >
        {ordered.map((item) => (
          <VodCardPhone key={item.key} item={item} onOpen={() => nav.go('title', { key: item.key })} />
        ))}
      </div>
    </section>
  )
}

function VodCardPhone({ item, onOpen }: { item: VodItem; onOpen: () => void }) {
  const { tt } = useTvText()
  return (
    <div
      data-testid="hub-vod-card-phone"
      {...station(onOpen)}
      style={{
        width: CARD_W,
        // Samma skäl som spotlightkortet: raden ligger i en kolumn-flexbox och
        // korten har overflow hidden, så utan detta krymps de till ingenting.
        flexShrink: 0,
        scrollSnapAlign: 'start',
        borderRadius: 14,
        background: MT.s07,
        border: `1px solid ${MT.line08}`,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '2 / 3', background: MT.s07 }}>
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
            left: 8,
            bottom: 8,
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          {item.kind === 'series' ? tt('libraryKindSeries') : tt('libraryKindMovie')}
        </span>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{item.title}</div>
        <div style={{ fontSize: 13, color: MT.dim }}>{item.year ?? ''}</div>
      </div>
    </div>
  )
}
