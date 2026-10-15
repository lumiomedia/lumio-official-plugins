'use client'

/**
 * Kanaler-sidans hero: en STILLASTÅENDE, kompakt hero direkt under appens
 * meny som visar kanalen och programmet som tablån pekar på (TV: raden med
 * fokus; skrivbord: raden under pekaren, annars vald rad; mobil: tryckt
 * rad). Ingen karusell — tablån styr. Läser bara tablån (ren uträkning),
 * inga strömuppslag; spelaren gör dem först när man tittar.
 *
 * TV: inga knappar i heron — OK på en rad tittar live, håll OK ger
 * glasmenyn (Från början, Redigera kanal, Zappa). Skrivbord/mobil: Titta
 * live och Från början för vald kanal.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { ChannelDef } from '../model/channel'
import { programmeAt, type ProgrammeSlot } from '../model/schedule'
import type { PoolItem } from '../data/pool'
import type { PlayMode } from '../play/player-logic'
import { formatClock } from './guide-layout'
import { belowMenuPill, C, FONT, glass, RADIUS, fontSize } from './tokens'
import { dim, dimS, TV_CONTENT_LEFT, TV_CONTENT_RIGHT, TV_HERO_TITLE, tvu } from './tv'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

export interface ChannelHeroProps {
  /** Kanalen heron visar (fokus/pekare/val i tablån). */
  channel: ChannelDef
  rundown: PoolItem[]
  loading: boolean
  now: number
  isTv: boolean
  isMobile: boolean
  /** Värden kan spela kanaler (app ≥ 0.1.625). */
  canPlay: boolean
  t: T
  /** Skrivbord/mobil: herons två knappar (TV har inga). */
  onPlay(mode: PlayMode): void
  /**
   * Bilderna som ritas i bakgrundslagret (visad kanal + grannar i tablån,
   * förladdade och osynliga); byte tonar över 300 ms.
   */
  images?: Array<{ channel: ChannelDef; rundown: PoolItem[] }>
}

/** Bakgrundsbilden sticker ut under heron så tablån ligger på den uttonade bilden (TV: 170 × 1,54 designpx). */
const FADE_EXTRA = { desktop: 170, mobile: 110, tv: 262 } as const
const HERO_CSS = '@keyframes chh-fade { from { opacity: 0 } to { opacity: 1 } }'
/** En rad, kortad med ellips — herons rader får aldrig bryta och ändra höjden. */
const oneLine = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' } as const

/**
 * Bakgrundslagrets geometri. Lagret är `position: fixed` med vänster/höger 0:
 * det fyller fönstret (TV: scenen) kant i kant oavsett appkolumnens indrag,
 * tak och rullbehållare — en fast låda klipps inte av overflow-förfäder och
 * påverkar inte sidledsrullningen. Bara höjden följer heron: lagret slutar
 * `extra` px under herons nederkant (där uttoningen landar på tablån) och
 * krymper när sidan rullas, medan bilden inuti behåller sin höjd och följer
 * herons nederkant uppåt. `dx/dy` kompenserar om en förfader med transform
 * gör lådan relativ till sig själv i stället för fönstret (mäts på lagret).
 */
/**
 * Värdens nativa spelare (mpv) ritar UNDER webbvyn och syns bara där sidan är
 * genomskinlig; värden markerar det med `html.mpv-playing`. Medan den klassen
 * står ritas herons bakgrundslager inte alls (avmonteras, inte bara osynligt).
 */
export function useHostPlayerActive(): boolean {
  const read = () => typeof document !== 'undefined' && document.documentElement.classList.contains('mpv-playing')
  const [active, setActive] = useState(read)
  useEffect(() => {
    const update = () => setActive(read())
    update()
    if (typeof MutationObserver === 'undefined') return
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return active
}

export interface HeroLayerGeom { dx: number; dy: number; height: number; full: number }

export function measureHeroLayer(hero: HTMLElement, layer: HTMLElement, prev: HeroLayerGeom | null, extra: number): HeroLayerGeom {
  const h = hero.getBoundingClientRect()
  const k = h.width > 0 && hero.offsetWidth > 0 ? h.width / hero.offsetWidth : 1
  const l = layer.getBoundingClientRect()
  // Lådans ursprung i skärmpx = lagrets läge minus förskjutningen det redan har.
  const originX = l.left - (prev?.dx ?? 0) * k
  const originY = l.top - (prev?.dy ?? 0) * k
  const height = Math.max(0, Math.round((h.bottom - originY) / k + extra))
  return { dx: Math.round(-originX / k), dy: Math.round(-originY / k), height, full: Math.max(height, prev?.full ?? 0) }
}

/** Programmets bild just nu på en kanal (för karusellens bakgrundslager). */
/**
 * Herons bild för en kanal just nu — aldrig svart om kanalen har någon bild:
 * programmets bakgrundsbild; annars dess affisch (skarp, till höger, som en
 * affischhero); annars närmaste program i tablån med bakgrundsbild, sist
 * närmaste med affisch. Vilar kanalen räknas programmet som börjar härnäst.
 */
export function heroImage(rundown: PoolItem[], channel: ChannelDef, now: number): { url: string; kind: 'backdrop' | 'poster' } | null {
  if (rundown.length === 0) return null
  let slot = programmeAt(rundown, channel.airWindow, now)
  if (slot.kind === 'rest') slot = programmeAt(rundown, channel.airWindow, slot.nextAir)
  if (slot.kind !== 'programme') return null
  if (slot.item.backdropUrl) return { url: slot.item.backdropUrl, kind: 'backdrop' }
  if (slot.item.posterUrl) return { url: slot.item.posterUrl, kind: 'poster' }
  const n = rundown.length
  const nearest = (field: 'backdropUrl' | 'posterUrl'): string | null => {
    for (let d = 1; d < n; d += 1) {
      for (const i of [slot.index + d, slot.index - d]) {
        const url = rundown[((i % n) + n) % n]![field]
        if (url) return url
      }
    }
    return null
  }
  const backdrop = nearest('backdropUrl')
  if (backdrop) return { url: backdrop, kind: 'backdrop' }
  const poster = nearest('posterUrl')
  return poster ? { url: poster, kind: 'poster' } : null
}

/** Nästa program efter `t`, förbi en eventuell vila. */
export function nextProgramme(rundown: PoolItem[], channel: ChannelDef, t: number): ProgrammeSlot<PoolItem> | null {
  let slot = programmeAt(rundown, channel.airWindow, t)
  if (slot.kind === 'rest') slot = programmeAt(rundown, channel.airWindow, slot.nextAir)
  return slot.kind === 'programme' ? slot : null
}

function duration(ms: number, t: T): string {
  const total = Math.max(1, Math.round(ms / 60_000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? t('durHm', { h, m }) : t('durM', { m })
}

export function ChannelHero({ channel, rundown, loading, now, isTv, isMobile, canPlay, t, onPlay, images }: ChannelHeroProps) {
  const fs = (px: number) => fontSize(px, isTv)
  const slot = rundown.length > 0 ? programmeAt(rundown, channel.airWindow, now) : null
  const programme = slot?.kind === 'programme' ? slot : null
  const rest = slot?.kind === 'rest' ? slot : null
  const after = programme ? nextProgramme(rundown, channel, programme.stop) : rest ? nextProgramme(rundown, channel, rest.nextAir) : null

  const imageList = images && images.some((s) => s.channel.id === channel.id) ? images : [{ channel, rundown }, ...(images ?? [])]
  const heroRef = useRef<HTMLElement | null>(null)
  const hostPlayer = useHostPlayerActive()
  const layerRef = useRef<HTMLDivElement | null>(null)
  const extra = isMobile ? FADE_EXTRA.mobile : isTv ? FADE_EXTRA.tv : FADE_EXTRA.desktop
  const [geom, setGeom] = useState<HeroLayerGeom | null>(null)
  const geomRef = useRef<HeroLayerGeom | null>(null)
  useLayoutEffect(() => {
    const hero = heroRef.current
    const layer = layerRef.current
    if (!hero || !layer) return
    let raf = 0
    const measure = (resetFull = false) => {
      raf = 0
      const base = geomRef.current && resetFull ? { ...geomRef.current, full: 0 } : geomRef.current
      const next = measureHeroLayer(hero, layer, base, extra)
      const prev = geomRef.current
      if (prev && prev.dx === next.dx && prev.dy === next.dy && prev.height === next.height && prev.full === next.full) return
      geomRef.current = next
      setGeom(next)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => measure()) }
    const onResize = () => measure(true)
    measure(true)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
    ro?.observe(hero)
    // Fångstfas: TV-läget rullar i en egen behållare, inte i fönstret.
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [extra, hostPlayer])

  let title: string
  let meta: string
  if (programme) {
    const item = programme.item
    title = item.kind === 'episode' && item.seriesTitle ? item.seriesTitle : item.title
    const parts: string[] = [item.kind === 'episode' ? t('heroEpisode') : t('heroMovie')]
    if (item.kind === 'episode' && item.season != null && item.episode != null) parts.push(`S${item.season}E${item.episode}`)
    if (item.kind === 'episode' && item.seriesTitle && item.title !== item.seriesTitle) parts.push(item.title)
    if (item.year != null) parts.push(String(item.year))
    parts.push(`${formatClock(programme.start)}–${formatClock(programme.stop)}`)
    parts.push(t('playerMinsLeft', { n: Math.max(1, Math.ceil((programme.stop - now) / 60_000)) }))
    meta = parts.join(' · ')
  } else if (rest) {
    title = t('heroRestTitle')
    meta = t('heroRestMeta', { time: formatClock(rest.nextAir), dur: duration(rest.nextAir - now, t) })
  } else {
    title = channel.name
    meta = loading ? t('heroLoading') : t('playerEmpty')
  }
  const pct = programme ? Math.min(1, Math.max(0, (now - programme.start) / Math.max(1, programme.stop - programme.start))) : 0
  // Stillastående och kompakt: ≈ en tredjedel av höjden på TV/skrivbord, mindre på mobil.
  const minHeight = isTv ? 'calc(var(--tv-vp-h, 100vh) * 0.36)' : isMobile ? 'calc(var(--lumio-vh, 100vh) * 0.3)' : 'calc(var(--lumio-vh, 100vh) * 0.36)'

  return (
    <section
      ref={heroRef}
      data-channels-hero=""
      data-hero-channel={channel.id}
      style={{
        position: 'relative', flexShrink: 0, minHeight, boxSizing: 'border-box',
        padding: isTv
          ? `${belowMenuPill(true, false)} ${tvu(TV_CONTENT_RIGHT)} ${tvu(18)} ${tvu(TV_CONTENT_LEFT)}`
          // Samma vänsterkant som tablåns kanalnamn (sektionens 12 + ringmarginalens 10 + etikettens 8; mobil 16).
          : `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 12px 16px' : '32px 16px 30px'}`,
        color: C.text, fontFamily: FONT.ui, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <style>{HERO_CSS}</style>
      {/*
        Bakgrunden: programmets bild från sidans överkant, uttonad mot sidans
        svarta — och förbi herons kant, så tablån ligger på den uttonade
        bilden. Värdena är appens herokarusells: bilden på 70 % opacitet,
        sidovinjett för läsbarheten, mask mot transparent. Visad kanal och
        grannarna ritas (grannarna osynliga = förladdade); byte tonar 300 ms.

        Kant i kant: ett fast lager över hela fönstrets bredd från överkanten
        (se measureHeroLayer). z −1 i kolumnens staplingskontext: under
        appens krom och sidans innehåll, över appens grund.
      */}
      {hostPlayer ? null : (
      <div
        ref={layerRef}
        aria-hidden="true"
        data-hero-backdrop=""
        data-hero-layer={geom ? `${geom.dx},${geom.dy},${geom.height}` : undefined}
        style={{
          position: 'fixed', zIndex: -1, pointerEvents: 'none', overflow: 'hidden',
          left: 0, right: 0, top: 0,
          ...(geom && (geom.dx !== 0 || geom.dy !== 0) ? { transform: `translate(${geom.dx}px, ${geom.dy}px)` } : {}),
          height: geom ? geom.height : `calc(100% + ${extra}px)`,
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
        }}
      >
        {imageList.map(({ channel: c, rundown: r }) => {
          const image = heroImage(r, c, now)
          if (!image) return null
          const url = image.url
          const full = geom ? geom.full : null
          const poster = image.kind === 'poster'
          return (
            <span
              key={c.id}
              data-hero-image={c.id}
              data-hero-image-kind={image.kind}
              style={{
                // Full höjd, förankrad i lagrets nederkant.
                position: 'absolute', right: 0, bottom: 0, height: full ?? '100%',
                ...(poster
                  // Affisch som reserv: skarp, i sitt eget format till höger, tonad mot vänster.
                  ? {
                      width: full != null ? Math.round(full * (2 / 3)) : '40%', maxWidth: '60%',
                      background: `url("${url}") right top / cover no-repeat`,
                      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 45%)',
                      maskImage: 'linear-gradient(to right, transparent 0%, black 45%)',
                    }
                  : { left: 0, background: `url("${url}") center top / cover no-repeat` }),
                opacity: c.id === channel.id ? (poster ? 0.85 : 0.7) : 0, transition: 'opacity 300ms ease',
              }}
            />
          )
        })}
        <span style={{
          // Appens sidovinjett för textens läsbarhet.
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgb(var(--base-950, 5 5 7) / 0.62) 0%, rgb(var(--base-950, 5 5 7) / 0) 45%)',
        }}
        />
      </div>
      )}

      <div style={{ position: 'relative' }}>
        {/* Eget attribut: appens TV-regel för [data-hero-copy] drog in texten. */}
        <div key={channel.id} data-channels-hero-copy="" style={{ animation: 'chh-fade 300ms ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: dim(10, isTv), flexWrap: 'wrap' }}>
            {programme ? (
              <span data-hero-badge="live" style={{
                display: 'inline-flex', alignItems: 'center', gap: dim(6, isTv), padding: `${dimS(3, isTv)} ${dimS(9, isTv)}`, borderRadius: RADIUS.pill,
                background: C.accent, color: C.onAccent, fontSize: fs(10.5), fontWeight: 700, letterSpacing: '0.16em', lineHeight: 1.3,
              }}
              >
                <span style={{ width: dim(6, isTv), height: dim(6, isTv), borderRadius: 999, background: C.onAccent }} />
                {t('heroLive')}
              </span>
            ) : rest ? (
              // Vila: neutral bricka, inte LIVE.
              <span data-hero-badge="rest" style={{
                display: 'inline-flex', alignItems: 'center', gap: dim(6, isTv), padding: `${dimS(3, isTv)} ${dimS(9, isTv)}`, borderRadius: RADIUS.pill,
                ...glass(isTv, { fill: C.glassDenseSoft, blur: 0 }), color: C.textSoft, fontSize: fs(10.5), fontWeight: 700, letterSpacing: '0.16em', lineHeight: 1.3,
              }}
              >
                {/* Samma form som LIVE-brickan (prick + text): heron byter aldrig höjd. */}
                <span style={{ width: dim(6, isTv), height: dim(6, isTv), borderRadius: 999, border: `1px solid ${C.textSoft}`, boxSizing: 'border-box' }} />
                {t('heroOffAir')}
              </span>
            ) : null}
            <span style={{ fontSize: fs(11), letterSpacing: '0.22em', textTransform: 'uppercase', color: C.textSoft }}>
              {t('zapChannelLine', { n: channel.number, name: channel.name })}
            </span>
          </div>
          <h1 style={{
            margin: `${dimS(8, isTv)} 0 0`, fontFamily: FONT.title, fontWeight: 400, fontSize: isTv ? TV_HERO_TITLE : fs(isMobile ? 26 : 38), lineHeight: 1.15,
            maxWidth: isTv ? tvu(1100) : 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
          >
            {title}
          </h1>
          {/* Fasta rader (aldrig villkorade): heron byter aldrig höjd, långa texter kortas. */}
          <p data-hero-meta="" style={{ ...oneLine, margin: `${dimS(8, isTv)} 0 0`, fontSize: fs(14), lineHeight: 1.4, color: C.textSoft }}>{meta}</p>
          <div data-hero-status="" style={{ marginTop: dim(8, isTv), height: dim(20, isTv), display: 'flex', alignItems: 'center' }}>
            {/* Samma element i vila (tomt spår): återkomsttiden står i metaraden, inget skjuter innehållet. */}
            <div style={{ width: '100%', height: dim(3, isTv), maxWidth: dim(360, isTv), borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <div style={{ width: `${rest ? 0 : pct * 100}%`, height: '100%', background: C.accent }} />
            </div>
          </div>
          <p data-hero-next="" style={{ ...oneLine, margin: `${dimS(6, isTv)} 0 0`, fontSize: fs(13), lineHeight: 1.4, color: C.textDim }}>
            {after
              ? t('heroNext', { time: formatClock(after.start), title: after.item.kind === 'episode' && after.item.seriesTitle ? after.item.seriesTitle : after.item.title })
              : '\u00a0'}
          </p>
        </div>
        {/* TV: inga knappar — OK på en rad tittar, håll OK ger glasmenyn. */}
        {isTv ? null : (
          <div data-hero-actions="" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: isMobile ? 14 : 18 }}>
            <HeroButton primary disabled={!canPlay} onClick={() => onPlay('live')}>{t('heroWatchLive')}</HeroButton>
            <HeroButton disabled={!canPlay || !programme} onClick={() => onPlay('start')}>{t('heroFromStart')}</HeroButton>
          </div>
        )}
      </div>
    </section>
  )
}

function HeroButton({ children, onClick, primary, disabled }: { children: ReactNode; onClick(): void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: RADIUS.pill, boxSizing: 'border-box',
        ...(primary ? { background: C.accent, border: `1px solid ${C.accent}` } : glass(false, { fill: C.glassDenseSoft, blur: 20 })),
        color: primary ? C.onAccent : C.text,
        fontFamily: FONT.ui, fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}
