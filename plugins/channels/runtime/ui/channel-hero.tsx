'use client'

/**
 * Kanaler-sidans hero: vad som sänds nu på den valda kanalen. Läser bara
 * tablån (ren uträkning) — inga strömuppslag; spelaren gör dem först när
 * man trycker Titta live.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react'
import { requestBrowseBack } from '@/lib/plugin-sdk'
import type { ChannelDef } from '../model/channel'
import { programmeAt, type ProgrammeSlot } from '../model/schedule'
import type { PoolItem } from '../data/pool'
import type { PlayMode } from '../play/player-logic'
import { formatClock } from './guide-layout'
import { renderedSlideIds } from './hero-carousel-logic'
import { belowMenuPill, C, FONT, glass, RADIUS, fontSize } from './tokens'
import type { useText } from './use-text'

type T = ReturnType<typeof useText>

export interface ChannelHeroProps {
  channel: ChannelDef
  rundown: PoolItem[]
  loading: boolean
  /** Tablån visas men fler källor/metadata är på väg. */
  partial?: boolean
  now: number
  isTv: boolean
  isMobile: boolean
  /** Värden kan spela kanaler (app ≥ 0.1.625). */
  canPlay: boolean
  t: T
  onPlay(mode: PlayMode): void
  onEdit(): void
  onNewChannel(): void
  /** KANALER-pillret: öppnar Hantera kanaler. */
  onManage(): void
  /** Karusellens bilder (sändande kanaler + vald), i nummerordning; vald = `channel`. */
  slides?: Array<{ channel: ChannelDef; rundown: PoolItem[] }>
  /** Byt bild: väljer den kanalen (tablåns markering följer). */
  onSlide?(id: string): void
  onStep?(dir: -1 | 1): void
}

/** Bakgrundsbilden sticker ut under heron så tablån ligger på den uttonade bilden. */
const FADE_EXTRA = { desktop: 170, mobile: 110 } as const
const SWIPE_PX = 50
const HERO_CSS = '@keyframes chh-fade { from { opacity: 0 } to { opacity: 1 } }'

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
 * programmets bakgrundsbild; annars dess affisch (uppförstorad och suddig);
 * annars närmaste program i tablån som har en bakgrundsbild. Vilar kanalen
 * räknas programmet som börjar härnäst.
 */
export function heroImage(rundown: PoolItem[], channel: ChannelDef, now: number): { url: string; blur: boolean } | null {
  if (rundown.length === 0) return null
  let slot = programmeAt(rundown, channel.airWindow, now)
  if (slot.kind === 'rest') slot = programmeAt(rundown, channel.airWindow, slot.nextAir)
  if (slot.kind !== 'programme') return null
  if (slot.item.backdropUrl) return { url: slot.item.backdropUrl, blur: false }
  if (slot.item.posterUrl) return { url: slot.item.posterUrl, blur: true }
  const n = rundown.length
  for (let d = 1; d < n; d += 1) {
    for (const i of [slot.index + d, slot.index - d]) {
      const url = rundown[((i % n) + n) % n]!.backdropUrl
      if (url) return { url, blur: false }
    }
  }
  return null
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

export function ChannelHero({ channel, rundown, loading, partial, now, isTv, isMobile, canPlay, t, onPlay, onEdit, onNewChannel, onManage, slides, onSlide, onStep }: ChannelHeroProps) {
  const fs = (px: number) => fontSize(px, isTv)
  const slot = rundown.length > 0 ? programmeAt(rundown, channel.airWindow, now) : null
  const programme = slot?.kind === 'programme' ? slot : null
  const rest = slot?.kind === 'rest' ? slot : null
  const after = programme ? nextProgramme(rundown, channel, programme.stop) : rest ? nextProgramme(rundown, channel, rest.nextAir) : null

  const slideList = slides && slides.length > 0 ? slides : [{ channel, rundown }]
  const rendered = renderedSlideIds(slideList.map((s) => s.channel), channel.id)
  const many = slideList.length > 1 && onSlide != null
  const heroRef = useRef<HTMLElement | null>(null)
  const hostPlayer = useHostPlayerActive()
  const layerRef = useRef<HTMLDivElement | null>(null)
  const extra = isMobile ? FADE_EXTRA.mobile : FADE_EXTRA.desktop
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
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => { const p = e.touches[0]; touch.current = p ? { x: p.clientX, y: p.clientY } : null }
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current
    const p = e.changedTouches[0]
    touch.current = null
    if (!start || !p || !many) return
    const dx = p.clientX - start.x
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(p.clientY - start.y)) onStep?.(dx < 0 ? 1 : -1)
  }
  // TV: ◀ på första knappen / ▶ på sista bläddrar; däremellan flyttar fokus som vanligt.
  const onActionsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isTv || !many || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')]
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    if ((e.key === 'ArrowLeft' && at === 0) || (e.key === 'ArrowRight' && at === buttons.length - 1)) {
      e.preventDefault()
      e.stopPropagation()
      onStep?.(e.key === 'ArrowLeft' ? -1 : 1)
    }
  }

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
    meta = t('heroRestMeta', { dur: duration(rest.nextAir - now, t) })
  } else {
    title = channel.name
    meta = loading ? t('heroLoading') : t('playerEmpty')
  }
  const pct = programme ? Math.min(1, Math.max(0, (now - programme.start) / Math.max(1, programme.stop - programme.start))) : 0

  return (
    <section
      ref={heroRef}
      data-channels-hero=""
      data-hero-slides={slideList.length}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'relative', minHeight: 330,
        padding: `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 24px' : isTv ? '2.5rem 2rem' : '32px 28px'}`,
        color: C.text, fontFamily: FONT.ui, display: 'flex', flexDirection: 'column',
      }}
    >
      <style>{HERO_CSS}</style>
      {/*
        Bakgrunden: programmets bild från sidans överkant, uttonad mot sidans
        svarta under nedersta ~40 % — och förbi herons kant, så tablån ligger
        på den uttonade bilden. Värdena är appens herokarusells: bilden på 70 %
        opacitet, sido- och toppvinjett för läsbarheten, mask mot transparent
        (den enda gradienten utöver zappens brus). Aktiv bild och grannarna
        ritas (grannarna osynliga = förladdade); byte tonar över 300 ms.

        Kant i kant: ett fast lager över hela fönstrets bredd från överkanten
        (se measureHeroLayer) — samma resultat som appens egen hero, utan att
        bero på kolumnens indrag. z −1 i kolumnens staplingskontext: under
        appens krom (menyknapp, klocka) och sidans innehåll, över appens grund.
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
        {slideList.map(({ channel: c, rundown: r }) => {
          if (!rendered.has(c.id)) return null
          const image = heroImage(r, c, now)
          if (!image) return null
          const url = image.url
          return (
            <span
              key={c.id}
              data-hero-image={c.id}
              style={{
                // Full höjd, förankrad i lagrets nederkant: bilden följer herons
                // nederkant när sidan rullar i stället för att skalas om.
                position: 'absolute', left: 0, right: 0, bottom: 0, height: geom ? geom.full : '100%',
                background: `url("${url}") center ${image.blur ? 'center' : 'top'} / cover no-repeat`,
                // Affisch som reserv: uppförstorad och suddig, så den fyller bredden utan att se pixlig ut.
                ...(image.blur ? { filter: 'blur(28px)', transform: 'scale(1.15)' } : {}),
                opacity: c.id === channel.id ? 0.7 : 0, transition: 'opacity 300ms ease',
              }}
            />
          )
        })}
        <span style={{
          // Appens sidovinjett för textens läsbarhet; ingen toppvinjett — den
          // läste som ett svart band överst.
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgb(var(--base-950, 5 5 7) / 0.62) 0%, rgb(var(--base-950, 5 5 7) / 0) 45%)',
        }}
        />
      </div>
      )}


      {/* Under appens menypill, vänsterställt; högra hörnet är appens (klocka, hälsning). */}
      <div data-channels-topbar="" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Pill isTv={isTv} onClick={() => requestBrowseBack()}>{t('pageHome')}</Pill>
        <Pill isTv={isTv} active onClick={onManage}>{t('pageChannels')}</Pill>
        <Pill isTv={isTv} onClick={onNewChannel}>{t('pageNewChannel')}</Pill>
      </div>

      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: isMobile ? 32 : 48 }}>
        <div key={channel.id} data-hero-copy="" style={{ animation: 'chh-fade 300ms ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {programme ? (
            <span data-hero-badge="live" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: RADIUS.pill,
              background: C.accent, color: C.onAccent, fontSize: fs(10.5), fontWeight: 700, letterSpacing: '0.16em',
            }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.onAccent }} />
              {t('heroLive')}
            </span>
          ) : rest ? (
            // Vila: neutral bricka, inte LIVE (kanalen sänder inte nu).
            <span data-hero-badge="rest" style={{
              display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: RADIUS.pill,
              ...glass(isTv, { fill: C.glassDenseSoft, blur: 0 }), color: C.textSoft, fontSize: fs(10.5), fontWeight: 700, letterSpacing: '0.16em',
            }}
            >
              {t('heroOffAir')}
            </span>
          ) : null}
          <span style={{ fontSize: fs(11), letterSpacing: '0.22em', textTransform: 'uppercase', color: C.textSoft }}>
            {t('zapChannelLine', { n: channel.number, name: channel.name })}
          </span>
        </div>
        <h1 style={{
          margin: '10px 0 0', fontFamily: FONT.title, fontWeight: 400, fontSize: fs(isMobile ? 30 : 44), lineHeight: 1.05,
          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}
        >
          {title}
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: fs(14), color: C.textSoft }}>{meta}</p>
        {partial ? (
          <p data-channels-partial="" role="status" style={{ margin: '6px 0 0', fontSize: fs(12), color: C.textDim }}>{t('heroPartial')}</p>
        ) : null}
        {rest ? (
          <p style={{ margin: '10px 0 0', fontSize: fs(13), color: C.accentLight }}>{t('playerRest', { time: formatClock(rest.nextAir) })}</p>
        ) : (
          <div style={{ marginTop: 12, height: 3, maxWidth: 360, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: C.accent }} />
          </div>
        )}
        </div>
        <div data-hero-actions="" onKeyDown={onActionsKey} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          <HeroButton isTv={isTv} primary disabled={!canPlay} onClick={() => onPlay('live')}>{t('heroWatchLive')}</HeroButton>
          <HeroButton isTv={isTv} disabled={!canPlay || !programme} onClick={() => onPlay('start')}>{t('heroFromStart')}</HeroButton>
          <HeroButton isTv={isTv} onClick={onEdit}>{t('heroEdit')}</HeroButton>
        </div>
        {after ? (
          <p style={{ margin: '14px 0 0', fontSize: fs(13), color: C.textDim }}>
            {t('heroNext', { time: formatClock(after.start), title: after.item.kind === 'episode' && after.item.seriesTitle ? after.item.seriesTitle : after.item.title })}
          </p>
        ) : null}
        {many ? (
          <div data-hero-dots="" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
            {slideList.map(({ channel: c }) => {
              const active = c.id === channel.id
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-label={t('zapChannelLine', { n: c.number, name: c.name })}
                  aria-current={active ? 'true' : undefined}
                  data-hero-dot={c.id}
                  tabIndex={isTv ? -1 : 0}
                  onClick={() => onSlide?.(c.id)}
                  style={{
                    width: active ? 16 : 4, height: 4, padding: 0, border: 'none', borderRadius: 999, cursor: 'pointer',
                    background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)', transition: 'width 200ms ease, background 200ms ease',
                  }}
                />
              )
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}


function Pill({ children, onClick, active, isTv }: { children: ReactNode; onClick?: () => void; active?: boolean; isTv: boolean }) {
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', minHeight: isTv ? '2.25rem' : 30, padding: isTv ? '0 1rem' : '0 14px',
    ...glass(isTv, { fill: C.glassDenseSoft, blur: 20 }),
    borderRadius: RADIUS.pill, border: `1px solid ${active ? 'rgba(244,132,95,0.55)' : C.pillBorder}`,
    color: active ? C.accentLight : C.text,
    fontFamily: FONT.ui, fontSize: fontSize(10.5, isTv), fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
    whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default',
  }
  if (!onClick) return <span style={style}>{children}</span>
  return <button type="button" data-f="" onClick={onClick} style={style}>{children}</button>
}

function HeroButton({ children, onClick, primary, disabled, isTv }: { children: ReactNode; onClick(): void; primary?: boolean; disabled?: boolean; isTv: boolean }) {
  return (
    <button
      type="button"
      data-f=""
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: isTv ? '0.625rem 1.375rem' : '10px 22px', borderRadius: RADIUS.pill,
        ...(primary ? { background: C.accent, border: `1px solid ${C.accent}` } : glass(isTv, { fill: C.glassDenseSoft, blur: 20 })),
        color: primary ? C.onAccent : C.text,
        fontFamily: FONT.ui, fontSize: fontSize(14, isTv), fontWeight: 600, whiteSpace: 'nowrap',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}
