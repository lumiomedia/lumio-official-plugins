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
import { createWheelSwipe, renderedSlideIds } from './hero-carousel-logic'
import { belowMenuPill, C, FONT, glass, RADIUS, fontSize } from './tokens'
import { dim, dimS, TV_CONTENT_LEFT, TV_CONTENT_RIGHT, TV_HERO_TITLE, tvHeroButton, tvu } from './tv'
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

/** Bakgrundsbilden sticker ut under heron så tablån ligger på den uttonade bilden (TV: 170 × 1,54 designpx). */
const FADE_EXTRA = { desktop: 170, mobile: 110, tv: 262 } as const
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
  // Styrplattans tvåfingersvep i sidled (skrivbord). Inbyggd lyssnare med
  // passive:false: ett vågrätt svep får inte också rulla sidan eller trigga
  // webbvyns bakåtgest; lodrätt rullning lämnas helt orörd.
  const stepRef = useRef(onStep)
  stepRef.current = many ? onStep : undefined
  useEffect(() => {
    const hero = heroRef.current
    if (!hero || isTv) return
    const swipe = createWheelSwipe()
    const onWheel = (e: WheelEvent) => {
      if (!stepRef.current) return
      const { step, horizontal } = swipe.feed(e.deltaX, e.deltaY, e.timeStamp || Date.now())
      if (horizontal) e.preventDefault()
      if (step !== 0) stepRef.current(step)
    }
    hero.addEventListener('wheel', onWheel, { passive: false })
    return () => hero.removeEventListener('wheel', onWheel)
  }, [isTv])
  // Tangentbord på skrivbordet: prickarna nås med Tab, ◀▶ bläddrar och fokus följer aktiv prick.
  const dotsRef = useRef<HTMLDivElement | null>(null)
  const dotsFocused = useRef(false)
  useEffect(() => {
    if (!dotsFocused.current) return
    dotsRef.current?.querySelector<HTMLButtonElement>(`[aria-current="true"]`)?.focus()
  }, [channel.id])
  const onDotsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isTv || !many || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    e.stopPropagation()
    dotsFocused.current = true
    onStep?.(e.key === 'ArrowLeft' ? -1 : 1)
  }
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
        position: 'relative', minHeight: dim(330, isTv),
        // TV: appens innehållslinje (100 enheter) för pillren, texten och knapparna.
        padding: isTv
          ? `${belowMenuPill(true, false)} ${tvu(TV_CONTENT_RIGHT)} ${tvu(28)} ${tvu(TV_CONTENT_LEFT)}`
          : `${belowMenuPill(isTv, isMobile)} ${isMobile ? '16px 24px' : '32px 28px'}`,
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
          const full = geom ? geom.full : null
          const poster = image.kind === 'poster'
          return (
            <span
              key={c.id}
              data-hero-image={c.id}
              data-hero-image-kind={image.kind}
              style={{
                // Full höjd, förankrad i lagrets nederkant: bilden följer herons
                // nederkant när sidan rullar i stället för att skalas om.
                position: 'absolute', right: 0, bottom: 0, height: full ?? '100%',
                ...(poster
                  // Affisch som reserv: skarp, i sitt eget format till höger, tonad mot vänster
                  // in i sidans svarta (som en affischhero), aldrig uppförstorad och suddig.
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
          // Appens sidovinjett för textens läsbarhet; ingen toppvinjett — den
          // läste som ett svart band överst.
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgb(var(--base-950, 5 5 7) / 0.62) 0%, rgb(var(--base-950, 5 5 7) / 0) 45%)',
        }}
        />
      </div>
      )}


      {/* Under appens menypill, vänsterställt; högra hörnet är appens (klocka, hälsning). */}
      <div data-channels-topbar="" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: dim(8, isTv), flexWrap: 'wrap' }}>
        <Pill isTv={isTv} onClick={() => requestBrowseBack()}>{t('pageHome')}</Pill>
        <Pill isTv={isTv} active onClick={onManage}>{t('pageChannels')}</Pill>
        <Pill isTv={isTv} onClick={onNewChannel}>{t('pageNewChannel')}</Pill>
      </div>

      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: isMobile ? 32 : dim(48, isTv) }}>
        {/* Eget attribut: appens TV-regel för [data-hero-copy] drog in texten 100 enheter förbi pillren. */}
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
            // Vila: neutral bricka, inte LIVE (kanalen sänder inte nu).
            <span data-hero-badge="rest" style={{
              display: 'inline-flex', alignItems: 'center', padding: `${dimS(3, isTv)} ${dimS(9, isTv)}`, borderRadius: RADIUS.pill,
              ...glass(isTv, { fill: C.glassDenseSoft, blur: 0 }), color: C.textSoft, fontSize: fs(10.5), fontWeight: 700, letterSpacing: '0.16em', lineHeight: 1.3,
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
          margin: `${dimS(10, isTv)} 0 0`, fontFamily: FONT.title, fontWeight: 400, fontSize: isTv ? TV_HERO_TITLE : fs(isMobile ? 30 : 44), lineHeight: 1.1,
          maxWidth: isTv ? tvu(1100) : undefined,
          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}
        >
          {title}
        </h1>
        <p style={{ margin: `${dimS(10, isTv)} 0 0`, fontSize: fs(14), lineHeight: 1.4, color: C.textSoft }}>{meta}</p>
        {partial ? (
          <p data-channels-partial="" role="status" style={{ margin: `${dimS(6, isTv)} 0 0`, fontSize: fs(12), color: C.textDim }}>{t('heroPartial')}</p>
        ) : null}
        {rest ? (
          <p style={{ margin: `${dimS(10, isTv)} 0 0`, fontSize: fs(13), color: C.accentLight }}>{t('playerRest', { time: formatClock(rest.nextAir) })}</p>
        ) : (
          <div style={{ marginTop: dim(12, isTv), height: dim(3, isTv), maxWidth: dim(360, isTv), borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: C.accent }} />
          </div>
        )}
        </div>
                {/* TV: startfokus på Titta live (Redigera om värden inte kan spela). */}
        <div data-hero-actions="" style={{ display: 'flex', flexWrap: 'wrap', gap: dim(10, isTv), marginTop: dim(20, isTv) }}>
          <HeroButton isTv={isTv} primary init={canPlay} disabled={!canPlay} onClick={() => onPlay('live')}>{t('heroWatchLive')}</HeroButton>
          <HeroButton isTv={isTv} disabled={!canPlay || !programme} onClick={() => onPlay('start')}>{t('heroFromStart')}</HeroButton>
          <HeroButton isTv={isTv} init={!canPlay} onClick={onEdit}>{t('heroEdit')}</HeroButton>
        </div>
        {after ? (
          <p style={{ margin: `${dimS(14, isTv)} 0 0`, fontSize: fs(13), color: C.textDim }}>
            {t('heroNext', { time: formatClock(after.start), title: after.item.kind === 'episode' && after.item.seriesTitle ? after.item.seriesTitle : after.item.title })}
          </p>
        ) : null}
        {many ? (
          <div
            ref={dotsRef}
            data-hero-dots=""
            // TV: appens bläddrare (tv-hero.tsx) — prickarna är stationer och pricken
            // med fokus ÄR vald kanal; ringen ritas på pillret (index.css .tv-hero-pager).
            className={isTv ? 'tv-hero-pager' : undefined}
            onKeyDown={onDotsKey}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) dotsFocused.current = false }}
            style={isTv
              ? { display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: tvu(7), height: tvu(22), padding: `0 ${tvu(10)}`, marginTop: tvu(16), borderRadius: 999 }
              : { display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}
          >
            {slideList.map(({ channel: c }, i) => {
              const active = c.id === channel.id
              const first = slideList[0]!.channel.id
              const last = slideList[slideList.length - 1]!.channel.id
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-label={t('zapChannelLine', { n: c.number, name: c.name })}
                  aria-current={active ? 'true' : undefined}
                  data-hero-dot={c.id}
                  tabIndex={0}
                  {...(isTv
                    ? {
                        'data-f': '',
                        // Zonhopp landar på vald prick, inte på den första.
                        'data-current': active ? '' : undefined,
                        // Fokus stannar i bläddraren: ändarna går runt (som appens hero).
                        'data-f-left': i === 0 ? `[data-hero-dot="${last}"]` : undefined,
                        'data-f-right': i === slideList.length - 1 ? `[data-hero-dot="${first}"]` : undefined,
                        'data-f-up': '[data-hero-actions] button:not([disabled])',
                        'data-f-down': '[data-channel-row][aria-pressed="true"]',
                        // Indikator, inte en knapp: appens minsta knapphöjd gäller inte.
                        'data-tv-nosize': '',
                      }
                    : {})}
                  onFocus={isTv ? () => { if (!active) onSlide?.(c.id) } : undefined}
                  onClick={() => {
                    // TV: fokus har redan valt kanalen; OK spelar den (som appens bläddrare).
                    if (isTv && canPlay) { onSlide?.(c.id); onPlay('live'); return }
                    onSlide?.(c.id)
                  }}
                  style={isTv
                    ? {
                        width: tvu(active ? 20 : 6), height: tvu(4), minHeight: 0, padding: 0, border: 0, borderRadius: 999, cursor: 'pointer',
                        background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)', transition: 'width 300ms ease, background 200ms ease',
                      }
                    : {
                        // Träffytan större än prickens 4 px: klick och fokusring utan att ändra utseendet.
                        width: active ? 16 : 4, height: 4, padding: 0, borderLeft: 0, borderRight: 0, borderRadius: 999, cursor: 'pointer',
                        boxSizing: 'content-box', backgroundClip: 'content-box', borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
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
    display: 'inline-flex', alignItems: 'center', minHeight: dim(30, isTv, 40), padding: isTv ? `0 ${tvu(18)}` : '0 14px', boxSizing: 'border-box',
    ...glass(isTv, { fill: C.glassDenseSoft, blur: 20 }),
    borderRadius: RADIUS.pill, border: `1px solid ${active ? 'rgba(244,132,95,0.55)' : C.pillBorder}`,
    color: active ? C.accentLight : C.text,
    fontFamily: FONT.ui, fontSize: fontSize(10.5, isTv), fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
    whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default',
  }
  if (!onClick) return <span style={style}>{children}</span>
  return <button type="button" data-f="" onClick={onClick} style={style}>{children}</button>
}

function HeroButton({ children, onClick, primary, disabled, init, isTv }: { children: ReactNode; onClick(): void; primary?: boolean; disabled?: boolean; init?: boolean; isTv: boolean }) {
  return (
    <button
      type="button"
      data-f=""
      data-init={isTv && init && !disabled ? '' : undefined}
      // ▼ till bläddrarens valda prick: geometrin valde annars tablåraden (bred,
      // rakt under) och prickarna gick inte att nå från knapparna. Ingen prick
      // (en kanal) → motorns geometri som vanligt.
      data-f-down={isTv ? '[data-hero-dot][data-current]' : undefined}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: dim(6, isTv), padding: '10px 22px', borderRadius: RADIUS.pill, boxSizing: 'border-box',
        ...(primary ? { background: C.accent, border: `1px solid ${C.accent}` } : glass(isTv, { fill: C.glassDenseSoft, blur: 20 })),
        color: primary ? C.onAccent : C.text,
        fontFamily: FONT.ui, fontSize: fontSize(14, isTv), fontWeight: 600, whiteSpace: 'nowrap',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        // TV: appens heroknappars mått och knappstorlek.
        ...(isTv ? tvHeroButton() : {}),
      }}
    >
      {children}
    </button>
  )
}
